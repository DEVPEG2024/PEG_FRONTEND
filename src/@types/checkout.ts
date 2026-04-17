export type OrderItemCheckout = {
  documentId: string;
  productName: string;
  productPrice: number;
  productQuantity: number;
  totalPrice: number;
}

export type ShippingAddress = {
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  addressLine2?: string;
  zipCode: string;
  city: string;
  country: string;
  phone?: string;
}

export type Checkout = {
  orderItemsCheckout: OrderItemCheckout[],
  totalPrice: number;
  totalPriceWithVAT: number;
  customerDocumentId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  shippingAddress?: ShippingAddress;
  promoCode?: string;
}
