import test from "node:test";
import assert from "node:assert/strict";
import { matchStoreName, stripSoldOutPrefix, toMatchedProduct } from "../core/filter";

test("matchStoreName handles wrapped store names", () => {
  const result = matchStoreName("【環球板橋車站店】POLO GOLF/polo衫/L/", [
    "環球板橋車站店",
    "誠品生活板橋店",
  ]);

  assert.equal(result, "環球板橋車站店");
});

test("matchStoreName ignores sold-out prefix", () => {
  const result = matchStoreName("已售完 【誠品生活板橋店】BEAMS/polo衫/S/", [
    "環球板橋車站店",
    "誠品生活板橋店",
  ]);

  assert.equal(result, "誠品生活板橋店");
});

test("stripSoldOutPrefix removes sold-out label", () => {
  assert.equal(
    stripSoldOutPrefix("已售完 【誠品生活板橋店】BEAMS/polo衫/S/"),
    "【誠品生活板橋店】BEAMS/polo衫/S/",
  );
});

test("toMatchedProduct returns null for unmatched store", () => {
  const result = toMatchedProduct(
    {
      title: "【台中中友百貨店】POLO RALPH LAUREN/polo衫/S/",
      url: "https://store.2ndstreet.com.tw/SalePage/Index/123",
    },
    "男裝",
    "POLO衫",
    ["環球板橋車站店", "誠品生活板橋店"],
    "2026-03-18T08:00:00.000Z",
  );

  assert.equal(result, null);
});
