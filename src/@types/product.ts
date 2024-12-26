import { Customer, CustomerCategory } from './customer';
import { Form } from './form';

export type Product = {
  active: boolean;
  description: string;
  documentId: string;
  images: Image[];
  name: string;
  price: number;
  sizes: Size[];
  form: Form;
  productCategory: ProductCategory;
  customerCategories: CustomerCategory[];
  customers: Customer[];
};

export type Size = {
  documentId: string;
  name: string,
  value: string,
  description: string
}

export type SizeSelection = {
  size: Size;
  quantity: number;
};

// TODO: A deplacer dans fichier à part
export type Image = {
  documentId: string;
  id: string;
  url: string;
  name: string;
  file: File;
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
