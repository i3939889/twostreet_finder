import type { AppConfig } from "../models/config";

export type RunManifest = {
  runId: string;
  config: {
    mainCategory: string;
    subCategories: string[];
    storeNames: string[];
    headless: boolean;
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
      outputDir: config.outputDir,
    },
  };
}

