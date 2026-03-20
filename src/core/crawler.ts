import type { Logger } from "pino";
import type { AppConfig } from "../models/config";
import type { Product } from "../models/product";
import type { CrawlResult, RunError, RunSummary } from "../models/run-result";
import { nowIso } from "../infra/clock";
import type { OutputPaths } from "../infra/fs";
import { writeText } from "../infra/fs";
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
  const allProducts: Product[] = [];
  let totalCollected = 0;
  let totalMatched = 0;
  let browserClosed = false;

  const browser = await launchBrowser(config);

  try {
    const page = await createPage(browser, config);
    const detailPage = await createPage(browser, config);
    const navigator = new SiteNavigator(page);
    const scraper = new ProductScraper(page);
    const detailScraper = new ProductDetailScraper(detailPage);
    const scroller = new PageScroller(page);

    logger.info({ module: "crawler" }, "Browser launched");
    await navigator.openHomePage();
    logger.info({ module: "navigator" }, "Homepage opened");

    await navigator.openMainCategory(config.mainCategory);
    logger.info({ module: "navigator", mainCategory: config.mainCategory }, "Main category prepared");

    for (const subCategory of config.subCategories) {
      try {
        logger.info({ module: "navigator", subCategory }, "Processing subcategory");
        await navigator.openSubCategory(subCategory);
        await scroller.scrollUntilSettled({
          maxIdleRounds: config.maxScrollIdleRounds,
          maxRounds: config.maxScrollRounds,
        });

        const rawProducts = await scraper.collectVisibleProducts();
        totalCollected += rawProducts.length;

        const matched = rawProducts
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

        for (const product of matched) {
          product.detail = await detailScraper.fetchProductDetail(product.url);
        }

        totalMatched += matched.length;
        allProducts.push(...matched);
        logger.info(
          {
            module: "scraper",
            subCategory,
            rawCount: rawProducts.length,
            matchedCount: matched.length,
            detailFetchedCount: matched.length,
          },
          "Subcategory collection finished",
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        const artifactBaseName = `error-${sanitizeFileName(subCategory)}`;
        const screenshotFile = `${outputPaths.runArtifactsDir}\\${artifactBaseName}.png`;
        const htmlFile = `${outputPaths.runArtifactsDir}\\${artifactBaseName}.html`;

        await page.screenshot({ path: screenshotFile, fullPage: true }).catch(() => undefined);
        const html = await page.content().catch(() => "");
        if (html) {
          await writeText(htmlFile, html).catch(() => undefined);
        }

        errors.push({
          subCategory,
          message,
          stack,
          screenshotFile,
          htmlFile: html ? htmlFile : undefined,
        });
        logger.error({ module: "crawler", subCategory, err: error }, "Subcategory failed");
      }
    }
  } finally {
    await browser.close();
    browserClosed = true;
    logger.info({ module: "crawler", browserClosed }, "Browser closed");
  }

  const dedupedProducts = dedupeProducts(allProducts);
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
    outputFile: outputPaths.productsDataFile,
    logFile: outputPaths.runLogFile,
    errors,
  };

  return {
    products: dedupedProducts,
    summary,
  };
}

function sanitizeFileName(input: string): string {
  return input.replace(/[<>:"/\\|?*]+/g, "_").trim() || "unknown";
}
