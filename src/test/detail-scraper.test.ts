import test from "node:test";
import assert from "node:assert/strict";
import { parseProductDetailText } from "../core/detail-scraper";

test("parseProductDetailText extracts item number and parses chinese labels", () => {
  const text = `
    付款與運送方式
    商品特色
    商品編號
    11614652
    商品特色
    ■商品貨號■2344620790834
    ■商品陳述■
    補充說明：
    ■商品尺寸■
    SIZE： S
    顏色： 綠色
    花色： 素色
    材質： 其他
    型號：
    實際尺寸：肩寬:40cm/衣長:71cm
    -
    銷售重點
    原始價格
  `;

  const result = parseProductDetailText(text);

  assert.equal(result.itemNumber, "11614652");
  assert.equal(result.fields["商品貨號"], "2344620790834");
  assert.equal(result.fields["商品陳述"], "");
  assert.equal(result.fields["補充說明"], "");
  assert.equal(result.fields["商品尺寸"], "");
  assert.equal(result.fields["SIZE"], "S");
  assert.equal(result.fields["顏色"], "綠色");
  assert.equal(result.fields["花色"], "素色");
  assert.equal(result.fields["材質"], "其他");
  assert.equal(result.fields["型號"], "");
  assert.equal(result.fields["實際尺寸"], "肩寬:40cm/衣長:71cm");
  assert.deepEqual(result.unparsedLines, ["-"]);
});
