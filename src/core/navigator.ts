import type { Page } from "playwright";
import { NavigationError } from "../models/error";

const BASE_URL = "https://store.2ndstreet.com.tw/";
const COOKIE_ACCEPT_TEXT = "我知道了";

export class SiteNavigator {
  constructor(private readonly page: Page) {}

  async openHomePage(): Promise<void> {
    await this.page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
    });

    const acceptCookiesLink = this.page.getByRole("link", { name: COOKIE_ACCEPT_TEXT });
    if (await acceptCookiesLink.isVisible().catch(() => false)) {
      await acceptCookiesLink.click();
    }
  }

  async openMainCategory(mainCategory: string): Promise<void> {
    const categoryLink = this.page.getByRole("link", {
      name: mainCategory,
      exact: true,
    });

    if (!(await categoryLink.first().isVisible().catch(() => false))) {
      throw new NavigationError(`Main category not found: ${mainCategory}`);
    }

    await categoryLink.first().click();
    await this.page.waitForLoadState("domcontentloaded");
  }

  async openSubCategory(subCategory: string): Promise<void> {
    const html = await this.page.content();
    const targetUrl = extractSubCategoryUrl(html, subCategory);

    if (!targetUrl) {
      throw new NavigationError(`Subcategory not found: ${subCategory}`);
    }

    await this.page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
    });
  }
}

export function extractSubCategoryUrl(html: string, subCategory: string): string | null {
  const escapedSubCategory = escapeForRegExp(subCategory);
  const patterns = [
    new RegExp(`\\"text\\":\\"${escapedSubCategory}\\".*?\\"linkUrl\\":\\"([^\\"]+)\\"`, "i"),
    new RegExp(`\\"linkUrl\\":\\"([^\\"]+)\\".*?\\"text\\":\\"${escapedSubCategory}\\"`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeEmbeddedUrl(match[1]);
    }
  }

  return null;
}

function escapeForRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEmbeddedUrl(input: string): string {
  const decoded = input.replace(/\\u002F/g, "/").replace(/\\/g, "");
  return new URL(decoded, BASE_URL).toString();
}
