import type { Logger } from "pino";
import type { Browser, Page } from "playwright";
import type { AppConfig } from "../models/config";
import type { Product } from "../models/product";
import type { CrawlResult, RunError, RunSummary } from "../models/run-result";
import { nowIso } from "../infra/clock";
import type { OutputPaths } from "../infra/fs";
import { writeJson, writeText } from "../infra/fs";
import { createPage, launchBrowser } from "../infra/playwright";
import { SiteNavigator } from "./navigator";
import { ProductScraper } from "./scraper";
import { PageScroller } from "./scroller";
import { toMatchedProduct } from "./filter";
import { dedupeProducts } from "./dedupe";
import { ProductDetailScraper } from "./detail-scraper";

export async function runCrawler(
  config: AppConfig,
  runId: string,
  outputPaths: OutputPaths,
  logger: Logger,
): Promise<CrawlResult> {
  const startedAt = nowIso();
  const errors: RunError[] = [];
  let totalCollected = 0;
  let totalMatched = 0;
  let totalDetailed = 0;

  const stagedProducts = await collectMatchedProductsBySubCategory(
    config,
    outputPaths,
    logger,
    errors,
    (rawCount, matchedCount) => {
      totalCollected += rawCount;
      totalMatched += matchedCount;
    },
  );

  const dedupedProducts = dedupeProducts(stagedProducts);
  await writeJson(outputPaths.stagedDataFile, dedupedProducts);
  logger.info(
    {
      module: "crawler",
      stagedFile: outputPaths.stagedDataFile,
      stagedCount: dedupedProducts.length,
    },
    "Stage 1 completed",
  );

  const detailedProducts = await enrichProductsWithDetails(
    dedupedProducts,
    config,
    logger,
    errors,
    (count) => {
      totalDetailed += count;
    },
  );

  const finishedAt = nowIso();
  const summary: RunSummary = {
    runId,
    startedAt,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
    mainCategory: config.mainCategory,
    subCategories: config.subCategories,
    storeNames: config.storeNames,
    totalCollected,
    totalMatched,
    totalDeduped: dedupedProducts.length,
    totalDetailed,
    stagedFile: outputPaths.stagedDataFile,
    outputFile: outputPaths.productsDataFile,
    logFile: outputPaths.runLogFile,
    errors,
  };

  return {
    products: detailedProducts,
    summary,
  };
}

async function collectMatchedProductsBySubCategory(
  config: AppConfig,
  outputPaths: OutputPaths,
  logger: Logger,
  errors: RunError[],
  onSubCategoryFinished: (rawCount: number, matchedCount: number) => void,
): Promise<Product[]> {
  const products: Product[] = [];
  const browser = await launchBrowser(config);

  try {
    logger.info({ module: "crawler", stage: "list" }, "Stage 1 browser launched");

    for (const subCategory of config.subCategories) {
      const page = await createPage(browser, config);

      try {
        const matched = await withTimeout(
          collectMatchedProductsForSubCategory(config, page, subCategory, logger),
          config.subCategoryTimeoutMs,
        );

        const rawCount = matched.rawCount;
        const matchedProducts = matched.products;

        onSubCategoryFinished(rawCount, matchedProducts.length);
        products.push(...matchedProducts);

        logger.info(
          {
            module: "crawler",
            stage: "list",
            subCategory,
            rawCount,
            matchedCount: matchedProducts.length,
          },
          "Subcategory list collection finished",
        );
      } catch (error) {
        errors.push(
          await toRunError(error, {
            subCategory,
            page,
            outputPaths,
          }),
        );
        logger.error(
          { module: "crawler", stage: "list", subCategory, err: error },
          "Subcategory list collection failed",
        );
      } finally {
        await closePageSafely(page, logger, "page");
      }
    }
  } finally {
    await closeBrowserSafely(browser, logger, "list");
  }

  return products;
}

async function collectMatchedProductsForSubCategory(
  config: AppConfig,
  page: Page,
  subCategory: string,
  logger: Logger,
): Promise<{ rawCount: number; products: Product[] }> {
  const navigator = new SiteNavigator(page);
  const scroller = new PageScroller(page);
  const scraper = new ProductScraper(page);

  logger.info({ module: "navigator", stage: "list", subCategory }, "Processing subcategory");
  await navigator.openHomePage();
  await navigator.openMainCategory(config.mainCategory);
  await navigator.openSubCategory(subCategory);
  await scroller.scrollUntilSettled({
    maxIdleRounds: config.maxScrollIdleRounds,
    maxRounds: config.maxScrollRounds,
  });

  const rawProducts = await scraper.collectVisibleProducts();
  const matchedProducts = rawProducts
    .map((rawProduct) =>
      toMatchedProduct(
        rawProduct,
        config.mainCategory,
        subCategory,
        config.storeNames,
        nowIso(),
      ),
    )
    .filter((product): product is Product => product !== null);

  return {
    rawCount: rawProducts.length,
    products: matchedProducts,
  };
}

async function enrichProductsWithDetails(
  products: Product[],
  config: AppConfig,
  logger: Logger,
  errors: RunError[],
  onDetailFetched: (count: number) => void,
): Promise<Product[]> {
  const browser = await launchBrowser(config);

  try {
    logger.info(
      { module: "crawler", stage: "detail", productCount: products.length },
      "Stage 2 browser launched",
    );

    for (const product of products) {
      const page = await createPage(browser, config);

      try {
        const detailScraper = new ProductDetailScraper(page);
        product.detail = await withTimeout(
          detailScraper.fetchProductDetail(product.url),
          config.actionTimeoutMs * 2,
        );
        onDetailFetched(1);
      } catch (error) {
        errors.push(
          await toRunError(error, {
            page,
            outputPaths: undefined,
            messagePrefix: `Detail fetch failed for ${product.url}`,
          }),
        );
        logger.warn(
          {
            module: "crawler",
            stage: "detail",
            url: product.url,
            err: error,
          },
          "Detail fetch failed",
        );
      } finally {
        await closePageSafely(page, logger, "detailPage");
      }
    }
  } finally {
    await closeBrowserSafely(browser, logger, "detail");
  }

  return products;
}

async function toRunError(
  error: unknown,
  options: {
    subCategory?: string;
    page?: Page;
    outputPaths?: OutputPaths;
    messagePrefix?: string;
  },
): Promise<RunError> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (!options.page || !options.outputPaths || isTargetClosedError(error)) {
    return {
      subCategory: options.subCategory,
      message: options.messagePrefix ? `${options.messagePrefix}: ${message}` : message,
      stack,
    };
  }

  const page = options.page;
  const artifactBaseName = `error-${sanitizeFileName(options.subCategory ?? "detail")}`;
  const screenshotFile = `${options.outputPaths.runArtifactsDir}\\${artifactBaseName}.png`;
  const htmlFile = `${options.outputPaths.runArtifactsDir}\\${artifactBaseName}.html`;
  const artifacts = await captureFailureArtifacts(page, screenshotFile, htmlFile);

  return {
    subCategory: options.subCategory,
    message: options.messagePrefix ? `${options.messagePrefix}: ${message}` : message,
    stack,
    screenshotFile: artifacts.screenshotFile,
    htmlFile: artifacts.htmlFile,
  };
}

function sanitizeFileName(input: string): string {
  return input.replace(/[<>:"/\\|?*]+/g, "_").trim() || "unknown";
}

async function captureFailureArtifacts(
  page: {
    isClosed(): boolean;
    screenshot(options: { path: string; fullPage: boolean }): Promise<unknown>;
    content(): Promise<string>;
  },
  screenshotFile: string,
  htmlFile: string,
): Promise<{
  screenshotFile?: string;
  htmlFile?: string;
}> {
  if (page.isClosed()) {
    return {};
  }

  const screenshotResult = await withTimeout(
    page.screenshot({ path: screenshotFile, fullPage: true }).then(() => screenshotFile),
    3000,
  ).catch(() => undefined);

  const html = await withTimeout(page.content(), 3000).catch(() => "");

  if (html) {
    await withTimeout(writeText(htmlFile, html), 3000).catch(() => undefined);
  }

  return {
    screenshotFile: screenshotResult,
    htmlFile: html ? htmlFile : undefined,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function isTargetClosedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Target page, context or browser has been closed");
}

async function closePageSafely(
  page: Page,
  logger: Logger,
  pageType: "page" | "detailPage",
): Promise<void> {
  if (page.isClosed()) {
    return;
  }

  await withTimeout(page.close(), 3000).catch((error) => {
    logger.warn(
      {
        module: "crawler",
        pageType,
        err: error,
      },
      "Page close timed out",
    );
  });
}

async function closeBrowserSafely(
  browser: Browser,
  logger: Logger,
  stage: "list" | "detail",
): Promise<void> {
  await withTimeout(browser.close(), 5000).catch((error) => {
    logger.warn(
      {
        module: "crawler",
        stage,
        err: error,
      },
      "Browser close timed out",
    );
  });

  logger.info({ module: "crawler", stage, browserClosed: true }, "Browser closed");
}
