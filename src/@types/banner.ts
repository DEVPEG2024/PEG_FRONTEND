import { Customer, CustomerCategory } from './customer';
import { PegFile } from './pegFile';

export type Banner = {
  documentId: string;
  name: string;
  customer: Customer;
  customerCategory: CustomerCategory;
  image: PegFile;
  active: boolean;
}