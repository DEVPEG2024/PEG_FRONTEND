import { ICategoryCustomer } from "@/services/CustomerServices";
import { IUser } from "./user";

export interface IBanner {
  _id: string;
  title: string;
  customer: IUser;
  customerCategory: ICategoryCustomer;
  image: string;
  link: string;
  status: string;
  createdAt: Date;
}
