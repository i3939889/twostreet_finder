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
    await this.page.waitForLoadState("networkidle").catch(() => undefined);
    await this.dismissCookieBanner();
  }

  async openMainCategory(mainCategory: string): Promise<void> {
    const html = await this.page.content();
    const targetUrl = extractMainCategoryUrl(html, mainCategory);

    if (!targetUrl) {
      throw new NavigationError(`Main category not found: ${mainCategory}`);
    }

    await this.page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
    });
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

  private async dismissCookieBanner(): Promise<void> {
    const acceptCookiesLink = this.page.getByRole("link", { name: COOKIE_ACCEPT_TEXT });
    if (await acceptCookiesLink.isVisible().catch(() => false)) {
      await acceptCookiesLink.click();
    }
  }
}

export function extractMainCategoryUrl(html: string, mainCategory: string): string | null {
  const escapedMainCategory = escapeForRegExp(mainCategory);
  const patterns = [
    new RegExp(
      `<a[^>]*href="([^"]+)"[^>]*>\\s*(?:<img[^>]*alt="${escapedMainCategory}"[^>]*>|${escapedMainCategory})`,
      "i",
    ),
    new RegExp(
      `<a[^>]*href="([^"]+)"[^>]*>.*?<img[^>]*alt="${escapedMainCategory}"[^>]*>.*?<\\/a>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return new URL(decodeEmbeddedUrl(match[1]), BASE_URL).toString();
    }
  }

  return null;
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
  return input.replace(/\\u002F/g, "/").replace(/\\/g, "");
}
