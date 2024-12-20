import { Customer } from './customer';
import { IOrder, OrderItem } from './orderItem';
import { IUser, User } from './user';
import { Producer } from './producer';
import { Invoice } from './invoice';
import { Image } from './product';

export interface IComment {
  _id: string;
  comment: string;
  user: string;
  file: string;
  fileType: string;
  createdAt: string;
}

export interface IFile extends Document {
  _id: string;
  file: string;
  fileType: string;
  createdAt: Date;
}

export interface ITask {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface IProject {
  _id: string;
  title: string;
  ref: string;
  description: string;
  fullDescription: string;
  startDate: Date;
  endDate: Date;
  status: string;
  customer: IUser;
  priority: string;
  producer: IUser;
  amount: number;
  amountProducers: number;
  amountPaid: number;
  amountRemaining: number;
  progress: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentDate: string;
  comments: IComment[];
  files: IFile[];
  tasks: ITask[];
  order: IOrder;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deleted: boolean;
}

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
  remainingPrice: number;
  progress: number;
  paymentMethod: string;
  paymentState: string;
  paymentDate: Date;
  comments: Comment[];
  images: Image[];
  tasks: Task[];
  orderItem?: OrderItem;
  //deleted: boolean;
  invoices: Invoice[];
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
