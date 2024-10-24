import { IFormAnswer } from "./formAnswer";
import { IProduct } from "./product";
import { IUser } from "./user";

export interface IOrder {
    _id: string;
    customer: IUser;
    product: IProduct;
    formAnswer: IFormAnswer;
    sizes: [
      {
        value: string,
        quantity: number
      }
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
