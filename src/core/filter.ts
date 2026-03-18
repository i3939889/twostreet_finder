import type { RawProduct, Product } from "../models/product";

const SOLD_OUT_PREFIX = "已售完";

export function matchStoreName(title: string, storeNames: string[]): string | null {
  const normalizedTitle = title.trim();
  const normalizedForMatch = normalizedTitle.replace(/^已售完\s*/, "");

  for (const storeName of storeNames) {
    const wrappedStoreName = `【${storeName}】`;

    if (
      normalizedForMatch.startsWith(storeName) ||
      normalizedForMatch.startsWith(wrappedStoreName)
    ) {
      return storeName;
    }
  }

  return null;
}

export function stripSoldOutPrefix(title: string): string {
  return title.trim().replace(new RegExp(`^${SOLD_OUT_PREFIX}\\s*`), "");
}

export function toMatchedProduct(
  rawProduct: RawProduct,
  mainCategory: string,
  subCategory: string,
  storeNames: string[],
  scrapedAt: string,
): Product | null {
  const cleanedTitle = stripSoldOutPrefix(rawProduct.title);
  const storeName = matchStoreName(cleanedTitle, storeNames);

  if (!storeName) {
    return null;
  }

  return {
    ...rawProduct,
    title: cleanedTitle,
    storeName,
    mainCategory,
    subCategory,
    scrapedAt,
  };
}
