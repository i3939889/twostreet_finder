import type { Page } from "playwright";

export type ScrollOptions = {
  maxIdleRounds: number;
  maxRounds: number;
};

type ScrollSnapshot = {
  height: number;
  productCount: number;
};

const PRODUCT_LINK_SELECTOR = 'a[href*="/SalePage/Index/"]';

export class PageScroller {
  constructor(private readonly page: Page) {}

  async scrollUntilSettled(options: ScrollOptions): Promise<void> {
    let idleRounds = 0;
    let rounds = 0;
    let previousSnapshot = await this.captureSnapshot();

    while (idleRounds < options.maxIdleRounds && rounds < options.maxRounds) {
      rounds += 1;

      if (this.page.isClosed()) {
        return;
      }

      await this.page.evaluate(() => {
        window.scrollBy(0, Math.max(window.innerHeight, 1200));
      });
      await this.page.waitForTimeout(800);

      const currentSnapshot = await this.captureSnapshot();

      if (hasNewProducts(previousSnapshot, currentSnapshot)) {
        idleRounds = 0;
      } else if (currentSnapshot.height > previousSnapshot.height) {
        idleRounds += 1;
      } else {
        idleRounds += 1;
      }

      previousSnapshot = currentSnapshot;
    }
  }

  private async captureSnapshot(): Promise<ScrollSnapshot> {
    const [height, productCount] = await Promise.all([
      this.page.evaluate(() => document.body.scrollHeight),
      this.page.locator(PRODUCT_LINK_SELECTOR).count(),
    ]);

    return {
      height,
      productCount,
    };
  }
}

export function hasNewProducts(
  previousSnapshot: ScrollSnapshot,
  currentSnapshot: ScrollSnapshot,
): boolean {
  return currentSnapshot.productCount > previousSnapshot.productCount;
}
