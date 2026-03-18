import type { RawProduct, Product } from "../models/product";

export function matchStoreName(title: string, storeNames: string[]): string | null {
  const normalizedTitle = title.trim();

  for (const storeName of storeNames) {
    if (normalizedTitle.startsWith(storeName)) {
      return storeName;
    }
  }

  return null;
}

export function toMatchedProduct(
  rawProduct: RawProduct,
  mainCategory: string,
  subCategory: string,
  storeNames: string[],
  scrapedAt: string,
): Product | null {
  const storeName = matchStoreName(rawProduct.title, storeNames);

  if (!storeName) {
    return null;
  }

  return {
    ...rawProduct,
    title: rawProduct.title.trim(),
    storeName,
    mainCategory,
    subCategory,
    scrapedAt,
  };
}

