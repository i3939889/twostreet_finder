import type { Page } from "playwright";
import type { ProductDetail, ProductDetailFields } from "../models/product";
import { nowIso } from "../infra/clock";

const ITEM_NUMBER_LABEL = "\u5546\u54c1\u7de8\u865f";
const FEATURE_LABEL = "\u5546\u54c1\u7279\u8272";
const SECTION_END_MARKERS = [
  "\u92b7\u552e\u91cd\u9ede",
  "\u5546\u54c1\u76f8\u95dc\u5206\u985e",
  "\u5206\u4eab",
  "\u8a73\u7d30\u8aaa\u660e",
  "\u5546\u54c1\u898f\u683c",
];

export class ProductDetailScraper {
  constructor(private readonly page: Page) {}

  async fetchProductDetail(url: string): Promise<ProductDetail> {
    await this.page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    await this.page.waitForTimeout(1500);

    const bodyText = await this.page.locator("body").innerText();
    const parsed = parseProductDetailText(bodyText);

    return {
      ...parsed,
      fetchedAt: nowIso(),
    };
  }
}

export function parseProductDetailText(text: string): Omit<ProductDetail, "fetchedAt"> {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const itemNumberIndex = lines.findIndex((line) => line === ITEM_NUMBER_LABEL);
  const itemNumber = itemNumberIndex >= 0 ? findNextContentLine(lines, itemNumberIndex + 1) : undefined;

  const featureIndex = lines.findIndex(
    (line, index) => index > itemNumberIndex && line === FEATURE_LABEL,
  );

  const featureLines =
    featureIndex >= 0
      ? collectSectionLines(lines, featureIndex + 1, (line) =>
          SECTION_END_MARKERS.some((marker) => line.startsWith(marker)),
        )
      : [];

  const { fields, unparsedLines } = parseFeatureLines(featureLines);

  const rawSectionLines = [
    ...(itemNumber ? [ITEM_NUMBER_LABEL, itemNumber] : []),
    ...(featureLines.length > 0 ? [FEATURE_LABEL, ...featureLines] : []),
  ];

  return {
    itemNumber,
    rawSectionLines,
    featureLines,
    fields,
    unparsedLines,
  };
}

function parseFeatureLines(lines: string[]): {
  fields: ProductDetailFields;
  unparsedLines: string[];
} {
  const fields: ProductDetailFields = {};
  const unparsedLines: string[] = [];
  const blockLabelPattern = /^\u25A0(.+?)\u25A0\s*(.*)$/;
  const inlineLabelPattern = /^([^\uFF1A:]+)[\uFF1A:]\s*(.*)$/;

  for (const line of lines) {
    const blockLabelMatch = line.match(blockLabelPattern);

    if (blockLabelMatch) {
      const label = blockLabelMatch[1].trim();
      const value = blockLabelMatch[2]?.trim() ?? "";
      fields[label] = value;
      continue;
    }

    const inlineLabelMatch = line.match(inlineLabelPattern);

    if (inlineLabelMatch) {
      const label = inlineLabelMatch[1].trim();
      const value = inlineLabelMatch[2]?.trim() ?? "";
      fields[label] = value;
      continue;
    }

    unparsedLines.push(line);
  }

  return {
    fields,
    unparsedLines,
  };
}

function findNextContentLine(lines: string[], startIndex: number): string | undefined {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      line &&
      line !== FEATURE_LABEL &&
      !SECTION_END_MARKERS.some((marker) => line.startsWith(marker))
    ) {
      return line;
    }
  }

  return undefined;
}

function collectSectionLines(
  lines: string[],
  startIndex: number,
  shouldStop: (line: string) => boolean,
): string[] {
  const result: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (shouldStop(line)) {
      break;
    }

    result.push(line);
  }

  return result;
}
