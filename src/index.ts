import { loadConfig } from "./config/env";
import { createRunId } from "./infra/clock";
import { ensureOutputPaths } from "./infra/fs";
import { createLogger } from "./infra/logger";
import { createManifest } from "./output/manifest";
import { writeProducts, writeSummary } from "./output/writer";
import { runCrawler } from "./core/crawler";
import { applyCliOverrides } from "./cli";

async function main(): Promise<void> {
  const config = applyCliOverrides(loadConfig());
  const runId = createRunId();
  const outputPaths = await ensureOutputPaths(config.outputDir, runId);
  const logger = createLogger(config.logLevel, runId, outputPaths.appLogFile);

  logger.info(
    {
      module: "bootstrap",
      mainCategory: config.mainCategory,
      subCategories: config.subCategories,
      storeNames: config.storeNames,
    },
    "Configuration loaded",
  );

  const manifest = createManifest(runId, config);
  logger.info({ module: "bootstrap", manifest }, "Run manifest created");

  const result = await runCrawler(config, runId, outputPaths, logger);
  await writeProducts(result.products, outputPaths);
  await writeSummary(result.summary, outputPaths);

  logger.info(
    {
      module: "bootstrap",
      totalProducts: result.products.length,
      summaryFile: outputPaths.summaryFile,
      dataFile: outputPaths.productsDataFile,
    },
    "Run completed",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
