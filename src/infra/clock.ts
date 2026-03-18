export function nowIso(): string {
  return new Date().toISOString();
}

export function createRunId(timeZone: string, date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const year = valueByType.get("year");
  const month = valueByType.get("month");
  const day = valueByType.get("day");
  const hour = valueByType.get("hour");
  const minute = valueByType.get("minute");
  const second = valueByType.get("second");

  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error(`Unable to format run id for time zone: ${timeZone}`);
  }

  const short = Math.random().toString(36).slice(2, 5);
  return `${year}${month}${day}-${hour}${minute}${second}-${short}`;
}
