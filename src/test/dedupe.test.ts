import test from "node:test";
import assert from "node:assert/strict";
import { dedupeProducts } from "../core/dedupe";
import type { Product } from "../models/product";

test("dedupeProducts removes duplicate urls", () => {
  const products: Product[] = [
    {
      title: "A",
      url: "https://store.2ndstreet.com.tw/SalePage/Index/1",
      storeName: "環球板橋車站店",
      mainCategory: "男裝",
      subCategory: "POLO衫",
      scrapedAt: "2026-03-18T08:00:00.000Z",
    },
    {
      title: "A duplicate",
      url: "https://store.2ndstreet.com.tw/SalePage/Index/1",
      storeName: "環球板橋車站店",
      mainCategory: "男裝",
      subCategory: "POLO衫",
      scrapedAt: "2026-03-18T08:00:01.000Z",
    },
  ];

  assert.equal(dedupeProducts(products).length, 1);
});
