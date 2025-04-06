export type OrderItemCheckout = {
  documentId: string;
  productName: string;
  productPrice: number;
  productQuantity: number;
  totalPrice: number;
}

export type Checkout = {
  orderItemsCheckout: OrderItemCheckout[],
  totalPrice: number;
  totalPriceWithVAT: number;
  customerDocumentId: string;
  userFirstName: string;
  userLastName: string;
}