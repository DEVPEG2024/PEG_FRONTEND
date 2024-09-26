import { IProduct } from "./product";

export type Category = {
  _id: string;
  title: string;
  description: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deleted: boolean;
};


export type CategoryProduct = {
  _id: string;
  title: string;
  image: string;
  totalProducts: number;
  products: IProduct[];
}
