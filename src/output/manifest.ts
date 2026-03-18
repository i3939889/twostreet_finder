import type { AppConfig } from "../models/config";

export type RunManifest = {
  runId: string;
  config: {
    mainCategory: string;
    subCategories: string[];
    storeNames: string[];
    headless: boolean;
    browser: string;
    timeZone: string;
    outputDir: string;
  };
};

export function createManifest(runId: string, config: AppConfig): RunManifest {
  return {
    runId,
    config: {
      mainCategory: config.mainCategory,
      subCategories: config.subCategories,
      storeNames: config.storeNames,
      headless: config.headless,
      browser: config.browser,
      timeZone: config.timeZone,
      outputDir: config.outputDir,
    },
  };
}
