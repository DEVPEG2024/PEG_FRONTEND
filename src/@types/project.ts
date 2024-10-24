import { IOrder } from "./order";
import { IUser } from "./user";

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
  ref : string;
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
