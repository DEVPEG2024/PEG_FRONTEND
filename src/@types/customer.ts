import { IBanner } from "./banner";
import { IOrder } from "./order";
import { Product } from "./product";

export type CustomerCategory = {
    documentId: string;
    name: string;
    banner: IBanner;
    products: Product[]
  }

export type Customer = {
  documentId: string;
  name: string;
  customerCategory: CustomerCategory;
  banner: IBanner;
  orders: IOrder[];
}