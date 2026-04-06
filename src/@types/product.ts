import { Customer, CustomerCategory } from './customer';
import { Form } from './form';
import { PegFile } from './pegFile';
import { Checklist } from './checklist';

export type PriceTier = {
  minQuantity: number;
  price: number;
};

export type Product = {
  active: boolean;
  description: string;
  documentId: string;
  images: PegFile[];
  name: string;
  /**
   * Legacy simple price stored in the backend.  Most of the codebase has
   * been migrated to use `priceTiers` instead.  The helper
   * `getProductBasePrice` (in `src/utils/productHelpers.ts`) provides a
   * single entry point for reading the current value.
   */
  price?: number;
  priceTiers: PriceTier[];
  sizes: Size[];
  colors: Color[];
  form: Form;
  checklist?: Checklist;
  productCategory: ProductCategory;
  customerCategories: CustomerCategory[];
  customers: Customer[];
  inCatalogue: boolean;
  productRef?: string;
  refVisibleToCustomer?: boolean;
  requiresBat?: boolean;
  batFile?: PegFile | null;
  catalogPrice?: number | null;
  pricingMode?: 'tiers' | 'packs';
};

export type Size = {
  documentId: string;
  name: string;
  value: string;
  description: string;
  productCategory: ProductCategory;
};

export type Color = {
  documentId: string;
  name: string;
  value: string;
  description: string;
  productCategory: ProductCategory;
};

export type SizeAndColorSelection = {
  size: Size;
  color: Color;
  quantity: number;
};

export type ProductCategory = {
  documentId: string;
  name: string;
  active: boolean;
  order?: number;
  image?: PegFile;
  products: Product[];
};

export type ProductForm = {
  label: string;
  value: string;
  status: boolean;
  options: OptionsFields[];
};

export type OptionsFields = {
  label: string;
  value: string;
  stock: number;
};
