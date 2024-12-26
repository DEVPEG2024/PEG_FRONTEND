import { Customer } from './customer';
import { FormAnswer } from './formAnswer';
import { Product, SizeSelection } from './product';

export type OrderItem = {
  documentId: string;
  product: Product;
  sizeSelections: SizeSelection[];
  formAnswer: FormAnswer | null;
  price: number;
  state: string;
  customer: Customer;
}