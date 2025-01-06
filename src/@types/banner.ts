import { Customer, CustomerCategory } from './customer';
import { Image } from './image';

export type Banner = {
  documentId: string;
  name: string;
  customer: Customer;
  customerCategory: CustomerCategory;
  image: Image;
  active: boolean;
}