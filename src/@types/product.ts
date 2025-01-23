import { Customer, CustomerCategory } from './customer';
import { Form } from './form';
import { Image } from './image';

export type Product = {
  active: boolean;
  description: string;
  documentId: string;
  images: Image[];
  name: string;
  price: number;
  sizes: Size[];
  colors: Color[];
  form: Form;
  productCategory: ProductCategory;
  customerCategories: CustomerCategory[];
  customers: Customer[];
};

export type Size = {
  documentId: string;
  name: string;
  value: string;
  description: string;
  productCategory: ProductCategory;
}

export type Color = {
  documentId: string;
  name: string;
  value: string;
  description: string;
  productCategory: ProductCategory;
}

export type SizeAndColorSelection = {
  size: Size;
  color: Color;
  quantity: number;
};

export type ProductCategory = {
  documentId: string;
  name: string;
  image?: Image;
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
