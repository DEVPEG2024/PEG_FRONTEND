import { FileNameBackFront } from './file';
import { IForm } from './form';

export type Product = {
  active: boolean;
  description: string;
  documentId: string;
  id: number;
  images: ProductImage[];
  name: string;
  price: number;
  sizes: Size[]
  form
};

export type Size = {
  name: string,
  value: string,
  description: string
}

export type ProductImage = {
  url: string;
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
  customersCategories: string[];
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

export type SizeSelection = {
  value: string;
  quantity: number;
};
