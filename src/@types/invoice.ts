import { Customer } from './customer';
import { OrderItem } from './orderItem';

export type Invoice = {
  documentId: string;
  customer: Customer;
  orderItems: OrderItem[];
  amount: number;
  vatAmount: number;
  totalAmount: number;
  name: string;
  date: Date;
  dueDate: Date;
  paymentDate: Date;
  paymentMethod: string;
  paymentState: string;
  paymentReference: string;
  paymentAmount: number;
  state: string;
}