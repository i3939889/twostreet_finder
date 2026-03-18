import type { Page } from "playwright";
import type { RawProduct } from "../models/product";

export class ProductScraper {
  constructor(private readonly page: Page) {}

  async collectVisibleProducts(): Promise<RawProduct[]> {
    const productLinks = await this.page.locator('a[href*="/SalePage/Index/"]').all();
    const products: RawProduct[] = [];

    for (const link of productLinks) {
      const url = await link.getAttribute("href");

      if (!url) {
        continue;
      }

      const texts = (await link.locator("div, span, p").allTextContents())
        .map((text) => text.trim())
        .filter(Boolean);

      const image = link.locator("img").first();
      const imageAlt = (await image.getAttribute("alt"))?.trim();
      const imageSrc = await image.getAttribute("src");

      const title = texts.find((text) => text.includes("【")) ?? imageAlt ?? "";
      const price = extractPrice(texts);

      if (!title) {
        continue;
      }

      products.push({
        title,
        url: new URL(url, this.page.url()).toString(),
        price,
        imageUrl: normalizeImageUrl(imageSrc),
        productId: url.split("/").pop() ?? undefined,
      });
    }

    return products;
  }
}

function extractPrice(texts: string[]): string | undefined {
  for (const text of texts) {
    const match = text.match(/NT\$\s?[\d,]+/);

    if (match) {
      return match[0];
    }
  }

  return undefined;
}

function normalizeImageUrl(src: string | null): string | undefined {
  if (!src) {
    return undefined;
  }

  if (src.startsWith("//")) {
    return `https:${src}`;
  }

  return src;
}
