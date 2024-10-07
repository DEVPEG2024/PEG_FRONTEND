import { IFormAnswer } from "./formAnswer";
import { IProduct } from "./product";

export type CartItem = {
    product: IProduct
    formAnswer: IFormAnswer
    quantity: number
}
