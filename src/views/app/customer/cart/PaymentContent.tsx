import { CartItem } from '@/@types/cart';
import { Checkout } from '@/@types/checkout';
import { AdaptableCard } from '@/components/shared';
import { Button } from '@/components/ui';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { env } from "@/configs/env.config";
import { API_BASE_URL } from '@/configs/api.config';
import { useAppSelector } from '@/store';
import { TOKEN_TYPE } from '@/constants/api.constant';

function PaymentContent({
  cart
}: {
  cart: CartItem[]
}) {
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const { token } = useAppSelector((state) => state.auth.session)
  const stripePromise = loadStripe(env?.STRIPE_PUBLIC_KEY as string);

  const validateCart = async () => {
    setSubmitting(true);
    await validatePayment();
    setSubmitting(false);
  };

  const createCheckout = (cart: CartItem[]): Checkout => {
    return {
      products: cart.map((cartItem: CartItem) => ({
        name: cartItem.product.name,
        price: Math.trunc(cartItem.product.price * 100 * 1.2),
        quantity: cartItem.sizeAndColors.reduce((total, sizeAndColor) => total + sizeAndColor.quantity, 0),
      }))
    };
  };

  const validatePayment = async () : Promise<void> => {
    const response = await fetch(API_BASE_URL + '/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `${TOKEN_TYPE}${token}`
      },
      body: JSON.stringify(createCheckout(cart)),
    }),
      { id } = await response.json(),
      stripe = await stripePromise;

    if (stripe) {
      await stripe.redirectToCheckout({ sessionId: id });
    }
  };

  const totalPrice: number = cart.reduce((total: number, item: CartItem) => {
    const itemPrice: number = item.sizeAndColors.reduce(
      (amount, sizeAndColor) => amount + sizeAndColor.quantity * Math.trunc(item.product.price * 100) / 100,
      0
    );
    return total + itemPrice;
  }, 0);

  const totalPriceWithVAT: number = cart.reduce((total: number, item: CartItem) => {
    const itemPrice: number = item.sizeAndColors.reduce(
      (amount, sizeAndColor) => amount + sizeAndColor.quantity * Math.trunc(item.product.price * 100 * 1.2) / 100,
      0
    );
    return total + itemPrice;
  }, 0);
  return (
    <div>
      <AdaptableCard bodyClass="p-5">
        <h4 className="mb-6">Détails</h4>
        <div className="flex flex-col gap-2">
          <span className="font-semibold">
            Total HT : {totalPrice.toFixed(2)} €
          </span>
          <span className="font-semibold">
            Tva : {(totalPriceWithVAT - totalPrice).toFixed(2)} €
          </span>
          <span className="font-semibold">
            Total TTC : {totalPriceWithVAT.toFixed(2)} €
          </span>
        </div>
        <hr className="my-6" />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            <Button
              variant="solid"
              className="w-full"
              onClick={validateCart}
              loading={isSubmitting}
            >
              Valider le panier
            </Button>
          </div>
        </div>
      </AdaptableCard>
    </div>
  );
}

export default PaymentContent;
