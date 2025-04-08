import { FormAnswer } from './formAnswer';
import { Product, SizeAndColorSelection } from './product';

export type CartItem = {
  id: string;
  product: Product;
  formAnswer: FormAnswer;
  sizeAndColors: SizeAndColorSelection[];
  orderItemDocumentId?: string;
};
