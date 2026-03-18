import test from "node:test";
import assert from "node:assert/strict";
import { extractSubCategoryUrl } from "../core/navigator";

test("extractSubCategoryUrl parses embedded linkUrl payload", () => {
  const html =
    '<script>{"itemIndex":3,"text":"POLO衫","linkUrl":"https:\\u002F\\u002Fstore.2ndstreet.com.tw\\u002Fv2\\u002Fofficial\\u002FSalePageCategory\\u002F556675"}</script>';

  assert.equal(
    extractSubCategoryUrl(html, "POLO衫"),
    "https://store.2ndstreet.com.tw/v2/official/SalePageCategory/556675",
  );
});

test("extractSubCategoryUrl supports reversed field order", () => {
  const html =
    '<script>{"linkUrl":"https:\\u002F\\u002Fstore.2ndstreet.com.tw\\u002Fv2\\u002Fofficial\\u002FSalePageCategory\\u002F429106","text":"長褲"}</script>';

  assert.equal(
    extractSubCategoryUrl(html, "長褲"),
    "https://store.2ndstreet.com.tw/v2/official/SalePageCategory/429106",
  );
});
