import { Customer } from './customer';
import { FormAnswer, IFormAnswer } from './formAnswer';
import { Product, SizeSelection } from './product';
import { IUser } from './user';

export interface IOrder {
  _id: string;
  customer: IUser;
  product: Product;
  formAnswer: IFormAnswer;
  sizes: [
    {
      value: string;
      quantity: number;
    },
  ];
  orderNumber: string;
  paymentStatus: string;
  status: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  canceled: boolean;
}

export type OrderItem = {
  documentId: string;
  product: Product;
  sizeSelections: SizeSelection[];
  formAnswer: FormAnswer | null;
  price: number;
  state: string;
  customer: Customer;
}