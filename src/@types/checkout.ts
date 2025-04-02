export type ProductCheckout = {
  name: string;
  price: number;
  quantity: number;
}

export type Checkout = {
  products: ProductCheckout[]
}