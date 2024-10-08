
export type IProduct = {
  _id: string;
  title: string,
  reference: string,
  description: string,
  amount: number,
  stock: number,
  category: string[],
  form: string,
  customersCategories: string[],
  customers: string[],
  images: string[],
  isActive: boolean,
  isDeleted: boolean,
  date: string,
  field_name : boolean,
  field_number : boolean,
  field_text : boolean,
  fields: ProductForm[],
  sizes: {
    status: boolean,
    options: OptionsFields[]
  }
}

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

