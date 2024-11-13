import { IFormAnswer } from './formAnswer';
import { IProduct, Product, SizeSelection } from './product';

export type CartItem = {
  id: string;
  product: Product;
  formAnswer: IFormAnswer;
  sizes: SizeSelection[];
};
