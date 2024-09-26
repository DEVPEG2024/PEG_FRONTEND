import { IMarket } from "./market";
import { IUser } from "./user";

export interface IOrder {
    _id: string;
    user: IUser;
    userData:  IUser;
    products: [
      {
        product: string,
        quantity: number,
        promoPrice: number,
        price: number,
        total: number,
        available: boolean,
        replaced: boolean,
        replacedProduct: string,
        _id: string,
      }
    ];
    orderNumber: string;
    storeId: IMarket;
    storeData: IMarket;
    subtotal: number;
    discount: number;
    promoPrice: number;
    vat: number;
    total: number;
    coupon: string;
    pickup: boolean;
    pickupDate: string;
    paymentMethod: string;
    paymentIntentId: string;
    qrCode: string;
    status: string;
    pickupOrderAt: string;
    pickupOrderTimeAt: string;
    substitution: boolean;
    inPark: boolean;
    bags: boolean;
    message: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
    canceled: boolean;
    refunded: boolean;
    amountRefunded: number;
  }
