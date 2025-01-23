import { Customer } from './customer';
import { FormAnswer } from './formAnswer';
import { Product, SizeAndColorSelection } from './product';
import { Project } from './project';

export type OrderItem = {
  documentId: string;
  product: Product;
  sizeAndColorSelections: SizeAndColorSelection[];
  formAnswer: FormAnswer | null;
  price: number;
  state: string;
  customer: Customer;
  project: Project;
}