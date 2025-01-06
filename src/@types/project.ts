import { Customer } from './customer';
import { OrderItem } from './orderItem';
import { User } from './user';
import { Producer } from './producer';
import { Invoice } from './invoice';
import { Image } from './image';

export type Project = {
  documentId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  state: string;
  customer?: Customer;
  priority: string;
  producer?: Producer;
  price: number;
  producerPrice: number;
  paidPrice: number;
  producerPaidPrice: number;
  comments: Comment[];
  images: Image[];
  tasks: Task[];
  orderItem?: OrderItem;
  //deleted: boolean;
  invoices: Invoice[];
  poolable: boolean;
}

export type Task = {
  documentId: string;
  name: string;
  description: string;
  state: string;
  priority: string;
  startDate: Date;
  endDate: Date;
}

export type Comment = {
  documentId: string;
  content: string;
  user: User;
  createdAt: Date;
  images: Image[];
  /*file: string;
  fileType: string;*/
}
