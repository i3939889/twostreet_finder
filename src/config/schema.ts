import { z } from "zod";
import { splitCsv } from "../utils/text";

const positiveInt = z.coerce.number().int().positive();

export const envSchema = z
  .object({
    MAIN_CAT: z
      .string()
      .trim()
      .min(1, "MAIN_CAT is required")
      .refine((value) => !value.includes(","), "MAIN_CAT must be a single value"),
    SUB_CAT: z.string().trim().min(1, "SUB_CAT is required"),
    STORE_NAME: z.string().trim().min(1, "STORE_NAME is required"),
    HEADLESS: z.enum(["true", "false"]).default("true"),
    BROWSER: z.enum(["chromium", "firefox"]).default("chromium"),
    TIME_ZONE: z.string().trim().min(1).optional(),
    OUTPUT_DIR: z.string().trim().min(1).default("output"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    MAX_SCROLL_IDLE_ROUNDS: positiveInt.default(3),
    MAX_SCROLL_ROUNDS: positiveInt.default(200),
    SUB_CATEGORY_TIMEOUT_MS: positiveInt.default(180000),
    NAVIGATION_TIMEOUT_MS: positiveInt.default(30000),
    ACTION_TIMEOUT_MS: positiveInt.default(10000),
    SLOW_MO_MS: z.coerce.number().int().min(0).default(0),
  })
  .transform((raw) => ({
    mainCategory: raw.MAIN_CAT.trim(),
    subCategories: splitCsv(raw.SUB_CAT),
    storeNames: splitCsv(raw.STORE_NAME),
    headless: raw.HEADLESS === "true",
    browser: raw.BROWSER,
    timeZone: raw.TIME_ZONE?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone,
    outputDir: raw.OUTPUT_DIR.trim(),
    logLevel: raw.LOG_LEVEL,
    maxScrollIdleRounds: raw.MAX_SCROLL_IDLE_ROUNDS,
    maxScrollRounds: raw.MAX_SCROLL_ROUNDS,
    subCategoryTimeoutMs: raw.SUB_CATEGORY_TIMEOUT_MS,
    navigationTimeoutMs: raw.NAVIGATION_TIMEOUT_MS,
    actionTimeoutMs: raw.ACTION_TIMEOUT_MS,
    slowMoMs: raw.SLOW_MO_MS,
  }))
  .refine((value) => value.subCategories.length > 0, {
    error: "SUB_CAT must contain at least one value",
  })
  .refine((value) => value.storeNames.length > 0, {
    error: "STORE_NAME must contain at least one value",
  });
