import test from "node:test";
import assert from "node:assert/strict";
import { hasNewProducts } from "../core/scroller";

test("hasNewProducts returns true only when product count increases", () => {
  assert.equal(
    hasNewProducts(
      { height: 1000, productCount: 20 },
      { height: 1500, productCount: 24 },
    ),
    true,
  );

  assert.equal(
    hasNewProducts(
      { height: 1000, productCount: 20 },
      { height: 1800, productCount: 20 },
    ),
    false,
  );
});
