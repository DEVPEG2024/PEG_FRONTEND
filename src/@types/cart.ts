import { IFormAnswer } from "./formAnswer";
import { IProduct, SizeSelection } from "./product";

export type CartItem = {
    id: string
    product: IProduct
    formAnswer: IFormAnswer
    sizes: SizeSelection[]
}
