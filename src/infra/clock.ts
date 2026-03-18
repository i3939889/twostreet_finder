export function nowIso(): string {
  return new Date().toISOString();
}

export function createRunId(date = new Date()): string {
  const iso = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const short = Math.random().toString(36).slice(2, 8);
  return `${iso}-${short}`;
}

