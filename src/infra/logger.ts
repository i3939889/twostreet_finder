import pino, { type Logger } from "pino";
import path from "node:path";
import type { LogLevel } from "../models/config";

export function createLogger(level: LogLevel, runId: string, appLogFile: string): Logger {
  return pino(
    {
      level,
      base: {
        runId,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.destination({
      dest: path.resolve(appLogFile),
      mkdir: true,
      sync: false,
    }),
  );
}

