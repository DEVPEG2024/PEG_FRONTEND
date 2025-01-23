import { CartItem } from '@/@types/cart';
import { AdaptableCard } from '@/components/shared';
import { Button } from '@/components/ui';
import { PaymentInformations } from '@/services/OrderItemServices';
import { useState } from 'react';

function PaymentContent({
  cart,
  createOrderAndClearCart,
}: {
  cart: CartItem[];
  createOrderAndClearCart: (
    paymentInformations: PaymentInformations
  ) => Promise<void>;
}) {
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const validateCart = async () => {
    setSubmitting(true);
    const {
      paymentValidated,
      paymentInformations,
    }: { paymentValidated: boolean; paymentInformations: PaymentInformations } =
      await validatePayment();
    if (paymentValidated) {
      await createOrderAndClearCart(paymentInformations);
    }
    setSubmitting(false);
  };

  const validatePayment = async (): Promise<{
    paymentValidated: boolean;
    paymentInformations: PaymentInformations;
  }> => {
    return {
      paymentValidated: true,
      paymentInformations: {
        paymentMethod: 'card',
        paymentDate: new Date(0),
        paymentState: 'pending',
      },
    };
  };

  const totalPrice: number = cart.reduce((total: number, item: CartItem) => {
    const itemPrice: number = item.sizeAndColors.reduce(
      (amount, size) => amount + size.quantity * item.product.price,
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
            Tva : {(totalPrice * 0.2).toFixed(2)} €
          </span>
          <span className="font-semibold">
            Total TTC : {(totalPrice * 1.2).toFixed(2)} €
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
