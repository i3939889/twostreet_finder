export type RawProduct = {
  title: string;
  url: string;
  price?: string;
  imageUrl?: string;
  productId?: string;
};

export type ProductDetailFields = Partial<Record<string, string>>;

export type ProductDetail = {
  itemNumber?: string;
  rawSectionLines: string[];
  featureLines: string[];
  fields: ProductDetailFields;
  unparsedLines: string[];
  fetchedAt: string;
};

export type Product = RawProduct & {
  storeName: string;
  mainCategory: string;
  subCategory: string;
  scrapedAt: string;
  detail?: ProductDetail;
};
