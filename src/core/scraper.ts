import type { Page } from "playwright";
import type { RawProduct } from "../models/product";

type ProductDomSnapshot = {
  href: string | null;
  imageAlt?: string;
  imageSrc?: string;
  texts: string[];
};

export class ProductScraper {
  constructor(private readonly page: Page) {}

  async collectVisibleProducts(): Promise<RawProduct[]> {
    if (this.page.isClosed()) {
      return [];
    }

    const snapshots = await this.page.locator('a[href*="/SalePage/Index/"]').evaluateAll((links) =>
      links.map((link) => {
        const anchor = link as HTMLAnchorElement;
        const image = anchor.querySelector("img");
        const textNodes = Array.from(anchor.querySelectorAll("div, span, p"))
          .map((node) => node.textContent?.trim() ?? "")
          .filter(Boolean);

        return {
          href: anchor.getAttribute("href"),
          imageAlt: image?.getAttribute("alt")?.trim() ?? undefined,
          imageSrc: image?.getAttribute("src") ?? undefined,
          texts: textNodes,
        };
      }),
    );

    return snapshots
      .map((snapshot) => toRawProduct(snapshot, this.page.url()))
      .filter((product): product is RawProduct => product !== null);
  }
}

export function toRawProduct(snapshot: ProductDomSnapshot, baseUrl: string): RawProduct | null {
  if (!snapshot.href) {
    return null;
  }

  const title = extractTitle(snapshot);

  if (!title) {
    return null;
  }

  return {
    title,
    url: new URL(snapshot.href, baseUrl).toString(),
    price: extractPrice(snapshot.texts),
    imageUrl: normalizeImageUrl(snapshot.imageSrc),
    productId: snapshot.href.split("/").pop() ?? undefined,
  };
}

function extractTitle(snapshot: ProductDomSnapshot): string | undefined {
  const candidates = [
    ...snapshot.texts.map((text) => text.trim()),
    snapshot.imageAlt?.trim() ?? "",
  ].filter(Boolean);

  const nonPriceCandidates = candidates.filter((text) => !/^NT\$\s?[\d,]+$/.test(text));
  const withSlash = nonPriceCandidates.find((text) => text.includes("/"));

  if (withSlash) {
    return withSlash;
  }

  return nonPriceCandidates[0];
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

function normalizeImageUrl(src: string | null | undefined): string | undefined {
  if (!src) {
    return undefined;
  }

  if (src.startsWith("//")) {
    return `https:${src}`;
  }

  return src;
}
