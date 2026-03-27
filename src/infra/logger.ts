import pino, { type Logger } from "pino";
import path from "node:path";
import type { LogLevel } from "../models/config";

export function createLogger(
  level: LogLevel,
  runId: string,
  appLogFile: string,
  runLogFile: string,
): Logger {
  return pino(
    {
      level,
      base: {
        runId,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.multistream([
      {
        stream: pino.destination({
          dest: path.resolve(appLogFile),
          mkdir: true,
          sync: true,
        }),
      },
      {
        stream: pino.destination({
          dest: path.resolve(runLogFile),
          mkdir: true,
          sync: true,
        }),
      },
    ]),
  );
}
