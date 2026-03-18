export type LogLevel = "debug" | "info" | "warn" | "error";

export type AppConfig = {
  mainCategory: string;
  subCategories: string[];
  storeNames: string[];
  headless: boolean;
  outputDir: string;
  logLevel: LogLevel;
  maxScrollIdleRounds: number;
  maxScrollRounds: number;
  navigationTimeoutMs: number;
  actionTimeoutMs: number;
  slowMoMs: number;
};

export type RawEnvConfig = {
  MAIN_CAT: string;
  SUB_CAT: string;
  STORE_NAME: string;
  HEADLESS?: string;
  OUTPUT_DIR?: string;
  LOG_LEVEL?: LogLevel;
  MAX_SCROLL_IDLE_ROUNDS?: string;
  MAX_SCROLL_ROUNDS?: string;
  NAVIGATION_TIMEOUT_MS?: string;
  ACTION_TIMEOUT_MS?: string;
  SLOW_MO_MS?: string;
};

