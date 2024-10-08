import { IFormAnswer } from "./formAnswer";
import { IProduct, SizeSelection } from "./product";

export type CartItem = {
    product: IProduct
    formAnswer: IFormAnswer
    sizes: SizeSelection[]
}
