import { FormAnswer } from './formAnswer';
import { Product, SizeSelection } from './product';

export type CartItem = {
  id: string;
  product: Product;
  formAnswer: FormAnswer;
  sizes: SizeSelection[];
};
