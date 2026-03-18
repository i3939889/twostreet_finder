import dotenv from "dotenv";
import { ConfigError } from "../models/error";
import type { AppConfig, RawEnvConfig } from "../models/config";
import { envSchema } from "./schema";

export function loadConfig(): AppConfig {
  dotenv.config();

  const parsed = envSchema.safeParse(process.env as RawEnvConfig);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");

    throw new ConfigError(`Invalid environment configuration: ${message}`);
  }

  return parsed.data;
}

