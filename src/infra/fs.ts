import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type OutputPaths = {
  baseDir: string;
  dataDir: string;
  logsDir: string;
  artifactsDir: string;
  runsDir: string;
  runArtifactsDir: string;
  latestDataFile: string;
  stagedDataFile: string;
  productsDataFile: string;
  runLogFile: string;
  appLogFile: string;
  summaryFile: string;
};

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function ensureOutputPaths(outputDir: string, runId: string): Promise<OutputPaths> {
  const baseDir = path.resolve(outputDir);
  const dataDir = path.join(baseDir, "data");
  const logsDir = path.join(baseDir, "logs");
  const artifactsDir = path.join(baseDir, "artifacts");
  const runsDir = path.join(baseDir, "runs");
  const runArtifactsDir = path.join(artifactsDir, runId);

  await Promise.all([
    ensureDir(baseDir),
    ensureDir(dataDir),
    ensureDir(logsDir),
    ensureDir(artifactsDir),
    ensureDir(runsDir),
    ensureDir(runArtifactsDir),
  ]);

  return {
    baseDir,
    dataDir,
    logsDir,
    artifactsDir,
    runsDir,
    runArtifactsDir,
    latestDataFile: path.join(dataDir, "latest.json"),
    stagedDataFile: path.join(dataDir, `matched-${runId}.json`),
    productsDataFile: path.join(dataDir, `products-${runId}.json`),
    runLogFile: path.join(logsDir, `run-${runId}.jsonl`),
    appLogFile: path.join(logsDir, "app.log"),
    summaryFile: path.join(runsDir, `${runId}-summary.json`),
  };
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export async function writeText(filePath: string, value: string): Promise<void> {
  await writeFile(filePath, value, "utf8");
}
