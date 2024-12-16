import { Banner } from "./banner";
import { Product } from "./product";

export type CustomerCategory = {
  documentId: string;
  name: string;
  banner?: Banner;
  products: Product[],
  customers: Customer[];
}

export type Customer = {
  documentId: string;
  name: string;
  email: string;
  phoneNumber: string;
  vatNumber: string;
  siretNumber: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  customerCategory: CustomerCategory;
  banner: Banner;
  website: string;
}