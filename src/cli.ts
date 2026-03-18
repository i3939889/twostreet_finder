import type { AppConfig } from "./models/config";

export function applyCliOverrides(config: AppConfig): AppConfig {
  // TODO: allow command-line overrides after the base crawler flow is stable.
  return config;
}

