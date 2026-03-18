import { chromium, type Browser, type Page } from "playwright";
import type { AppConfig } from "../models/config";

export async function launchBrowser(config: AppConfig): Promise<Browser> {
  return chromium.launch({
    headless: config.headless,
    slowMo: config.slowMoMs,
  });
}

export async function createPage(browser: Browser, config: AppConfig): Promise<Page> {
  const page = await browser.newPage();
  page.setDefaultTimeout(config.actionTimeoutMs);
  page.setDefaultNavigationTimeout(config.navigationTimeoutMs);
  return page;
}

