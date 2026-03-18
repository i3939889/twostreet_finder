import type { Page } from "playwright";

export type ScrollOptions = {
  maxIdleRounds: number;
  maxRounds: number;
};

export class PageScroller {
  constructor(private readonly page: Page) {}

  async scrollUntilSettled(options: ScrollOptions): Promise<void> {
    let idleRounds = 0;
    let rounds = 0;
    let previousHeight = await this.page.evaluate(() => document.body.scrollHeight);

    while (idleRounds < options.maxIdleRounds && rounds < options.maxRounds) {
      rounds += 1;
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.page.waitForTimeout(1000);

      const currentHeight = await this.page.evaluate(() => document.body.scrollHeight);

      if (currentHeight === previousHeight) {
        idleRounds += 1;
      } else {
        idleRounds = 0;
        previousHeight = currentHeight;
      }
    }
  }
}

