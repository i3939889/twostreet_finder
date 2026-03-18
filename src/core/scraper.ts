import type { Page } from "playwright";
import type { RawProduct } from "../models/product";

export class ProductScraper {
  constructor(private readonly page: Page) {}

  async collectVisibleProducts(): Promise<RawProduct[]> {
    void this.page;
    // TODO: replace with actual DOM extraction logic once selectors are verified.
    return [];
  }
}

