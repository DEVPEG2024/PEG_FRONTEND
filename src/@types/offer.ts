import { IFormList } from "./forms";
import { IUser } from "./user";

export interface IOffer {
    _id: string;
  ref: string;
  title: string;
  customer: IUser;
  form: IFormList;
  images: string[];
  description: string;
  isAccepted: boolean;
  isRejected: boolean;
  price: number;
  isAvailable: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}