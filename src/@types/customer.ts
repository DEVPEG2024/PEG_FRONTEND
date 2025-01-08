import { Banner } from "./banner";
import { Product } from "./product";

export type CustomerCategory = {
  documentId: string;
  name: string;
  banner?: Banner;
  products: Product[],
  customers: Customer[];
}

export type CompanyInformations = {
  email: string;
  phoneNumber: string;
  vatNumber: string;
  siretNumber: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  website: string;
}

export type Customer = {
  documentId: string;
  name: string;
  companyInformations: CompanyInformations;
  customerCategory: CustomerCategory;
  banner: Banner;
}