import { Customer, CustomerCategory } from './customer';
import { FileNameBackFront } from './file';
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
  image: Image;
  products: Product[];
};

// TODO: A supprimer
export type IProduct = {
  _id: string;
  title: string;
  reference: string;
  description: string;
  amount: number; //TODO: remplacer par 'price'
  stock: number;
  category: string[];
  form?: IForm;
  customerCategories: string[];
  customers: string[];
  images: FileNameBackFront[];
  isActive: boolean;
  isDeleted: boolean;
  date: string;
  field_name: boolean;
  field_number: boolean;
  field_text: boolean;
  fields: ProductForm[];
  sizes: {
    status: boolean;
    options: OptionsFields[];
  };
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
