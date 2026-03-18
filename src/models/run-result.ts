import type { Product } from "./product";

export type RunError = {
  subCategory?: string;
  message: string;
  stack?: string;
  screenshotFile?: string;
  htmlFile?: string;
};

export type RunSummary = {
  runId: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  mainCategory: string;
  subCategories: string[];
  storeNames: string[];
  totalCollected: number;
  totalMatched: number;
  totalDeduped: number;
  outputFile: string;
  logFile: string;
  errors: RunError[];
};

export type CrawlResult = {
  products: Product[];
  summary: RunSummary;
};
