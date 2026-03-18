import type { Page } from "playwright";

export class SiteNavigator {
  constructor(private readonly page: Page) {}

  async openHomePage(): Promise<void> {
    await this.page.goto("https://store.2ndstreet.com.tw/", {
      waitUntil: "domcontentloaded",
    });
  }

  async openMainCategory(_mainCategory: string): Promise<void> {
    // TODO: implement category menu navigation based on actual site structure.
  }

  async openSubCategory(_subCategory: string): Promise<void> {
    // TODO: implement subcategory navigation based on actual site structure.
  }
}

