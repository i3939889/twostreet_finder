import type { Product } from "../models/product";

function getKey(product: Product): string {
  if (product.url) {
    return product.url;
  }

  return `${product.title}::${product.price ?? ""}`;
}

export function dedupeProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  const deduped: Product[] = [];

  for (const product of products) {
    const key = getKey(product);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(product);
  }

  return deduped;
}

