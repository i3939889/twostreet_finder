import type { Product } from "../models/product";
import type { RunSummary } from "../models/run-result";
import type { OutputPaths } from "../infra/fs";
import { writeJson } from "../infra/fs";

export async function writeProducts(products: Product[], outputPaths: OutputPaths): Promise<void> {
  await Promise.all([
    writeJson(outputPaths.productsDataFile, products),
    writeJson(outputPaths.latestDataFile, products),
  ]);
}

export async function writeSummary(summary: RunSummary, outputPaths: OutputPaths): Promise<void> {
  await writeJson(outputPaths.summaryFile, summary);
}

