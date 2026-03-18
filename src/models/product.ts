export type RawProduct = {
  title: string;
  url: string;
  price?: string;
  imageUrl?: string;
  productId?: string;
};

export type Product = RawProduct & {
  storeName: string;
  mainCategory: string;
  subCategory: string;
  scrapedAt: string;
};

