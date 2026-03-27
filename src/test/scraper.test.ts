import test from "node:test";
import assert from "node:assert/strict";
import { toRawProduct } from "../core/scraper";

test("toRawProduct prefers slash-style title text and normalizes fields", () => {
  const result = toRawProduct(
    {
      href: "/SalePage/Index/123",
      imageAlt: "備用標題",
      imageSrc: "//img.example.com/p.jpg",
      texts: ["NT$1,000", "板橋店/LACOSTE/polo衫/S/NT$1,000"],
    },
    "https://store.2ndstreet.com.tw/v2/official/SalePageCategory/427305",
  );

  assert.deepEqual(result, {
    title: "板橋店/LACOSTE/polo衫/S/NT$1,000",
    url: "https://store.2ndstreet.com.tw/SalePage/Index/123",
    price: "NT$1,000",
    imageUrl: "https://img.example.com/p.jpg",
    productId: "123",
  });
});

test("toRawProduct falls back to image alt when text nodes are empty", () => {
  const result = toRawProduct(
    {
      href: "/SalePage/Index/456",
      imageAlt: "商品標題",
      texts: ["NT$2,000"],
    },
    "https://store.2ndstreet.com.tw/",
  );

  assert.equal(result?.title, "商品標題");
});
