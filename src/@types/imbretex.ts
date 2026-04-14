// ─── Imbretex API types ───

// --- Products API ---

export type ImbretexImage = {
  name: string;
  url: string;
  type: number;
};

export type ImbretexLink = {
  name: string;
  url: string;
  type: number;
};

export type ImbretexAttribute = {
  type: 'sizes' | 'color' | 'material';
  value: string | null;
  colorCode?: string;
  hex?: string;
  rgb?: string;
  cmyk?: string;
};

export type ImbretexMultilang = {
  fr: string;
  en: string;
  de: string;
  es?: string;
};

export type ImbretexCategory = {
  categories: ImbretexMultilang;
  families: ImbretexMultilang;
};

export type ImbretexPackaging = {
  lengthCarton: { unit: string; value: number };
  widthCarton: { unit: string; value: number };
  heightCarton: { unit: string; value: number };
  weightCarton: { unit: string; value: number };
  volumeCarton: { unit: string; value: number | null };
  numberProductByCarton: number;
  numberProductByPack: number;
};

export type ImbretexVariant = {
  variantReference: string;
  underConstruction: number;
  keywords: { fr: string[]; en: string[]; de: string[] }[];
  characteristics: { genders: string[] };
  certifications: { certifications: string[] };
  careInstructions: string[];
  tags: string[];
  title: ImbretexMultilang;
  longTitle: ImbretexMultilang;
  description: ImbretexMultilang;
  longDescription: ImbretexMultilang;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  attributes: ImbretexAttribute[];
  netWeight: { unit: string; value: number };
  countryOfOrigin: string[];
  grammage: { unit: string; value: number | null };
  averageWeight: { unit: string; value: number };
  packaging: ImbretexPackaging;
  customsCode: string;
  eanUpcCode: string;
  categories: ImbretexCategory[];
  images: ImbretexImage[];
};

export type ImbretexProduct = {
  reference: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  brands: {
    name: string;
    logo: { url: string } | null;
  };
  variants: ImbretexVariant[];
  images: ImbretexImage | ImbretexImage[];
  links: ImbretexLink[];
};

export type ImbretexProductsResponse = {
  success: boolean;
  productCount: number;
  variantCount: number;
  perPage: number;
  page: string;
  totalNumberPage: number;
  products: ImbretexProduct[];
};

// --- Price/Stock API ---

export type ImbretexPriceStock = {
  code: string;
  quantity_unit: string;
  quantity_box: string;
  price: string;
  price_box: string;
  stock: string;
  stock_supplier: string;
};

export type ImbretexPriceStockResponse = {
  success: boolean;
  products: Record<string, ImbretexPriceStock>;
  products_not_found?: string;
  limit_exceeded?: string;
};

// --- Stocks bulk API ---

export type ImbretexStockEntry = {
  variantReference: string;
  incommings: { date: string[]; stock: string | null };
  stock: string;
  supplierStock: string;
  updatedAt: string | null;
};

export type ImbretexStocksResponse = {
  success: boolean;
  stocksCount: number;
  perPage: number;
  page: string;
  totalNumberPage: number;
  stocks: ImbretexStockEntry[];
};

// --- Prices bulk API ---

export type ImbretexPriceEntry = {
  variantPrices: {
    minimumOfQuantity: number;
    variantReference: string;
    updatedAt: string;
    prices: {
      quantity: number;
      price: number | null;
      defaultPrice: number;
      publicPrice: number;
    }[];
  };
};

export type ImbretexPricesResponse = {
  success: boolean;
  pricesCount: number;
  perPage: number;
  page: string;
  totalNumberPage: number;
  prices: ImbretexPriceEntry[];
};

// --- Deleted products API ---

export type ImbretexDeletedProduct = {
  supplierReference: string;
  brands: string;
  variants: {
    variantReference: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
  }[];
};

export type ImbretexDeletedResponse = {
  success: boolean;
  productCount: number;
  variantCount: number;
  perPage: number;
  page: string;
  totalNumberPage: number;
  products: ImbretexDeletedProduct[];
};
