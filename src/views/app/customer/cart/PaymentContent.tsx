import { CartItem } from '@/@types/cart';
import {
  getProductPriceForSizeAndColors,
  getTotalPriceForCartItem,
} from '@/utils/productHelpers';
import { Checkout, ShippingAddress } from '@/@types/checkout';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { env } from '@/configs/env.config';
import { API_BASE_URL } from '@/configs/api.config';
import { useAppDispatch, useAppSelector } from '@/store';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { FormAnswer } from '@/@types/formAnswer';
import { apiCreateFormAnswer } from '@/services/FormAnswerService';
import { unwrapData } from '@/utils/serviceHelper';
import { TVA_RATE } from '@/utils/priceHelpers';
import { apiCreateOrderItem } from '@/services/OrderItemServices';
import { OrderItem } from '@/@types/orderItem';
import { User } from '@/@types/user';
import {
  editOrderItemDocumentIdCartItem,
  removeFromCartItemOfOrderItem,
} from '@/store/slices/base/cartSlice';
import { useNavigate } from 'react-router-dom';
import { HiShieldCheck } from 'react-icons/hi';

function PaymentContent({ cart, shipping }: { cart: CartItem[]; shipping: ShippingAddress }) {
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const { token } = useAppSelector((state) => state.auth.session);
  const stripePromise = loadStripe(env?.STRIPE_PUBLIC_KEY as string);
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const SHIPPING_HT = 9.90;

  const subtotalHT: number = cart.reduce((total: number, item: CartItem) => {
    return total + getTotalPriceForCartItem(item.product, item.sizeAndColors);
  }, 0);

  const totalPrice: number = Math.round((subtotalHT + SHIPPING_HT) * 100) / 100;
  const totalPriceWithVAT: number = Math.round(totalPrice * (1 + TVA_RATE) * 100) / 100;
  const tva = Math.round((totalPriceWithVAT - totalPrice) * 100) / 100;

  const createFormAnswer = async (
    item: CartItem
  ): Promise<FormAnswer | null> => {
    if (item.product.form) {
      const { createFormAnswer }: { createFormAnswer: FormAnswer } =
        await unwrapData(apiCreateFormAnswer(item.formAnswer));

      return createFormAnswer;
    }
    return null;
  };

  const createOrderItem = async (
    item: CartItem
  ): Promise<OrderItem | undefined> => {
    try {
      const formAnswer: FormAnswer | null = await createFormAnswer(item),
        orderItem: Omit<OrderItem, 'documentId'> = {
          product: item.product,
          sizeAndColorSelections: item.sizeAndColors,
          formAnswer,
          price: getTotalPriceForCartItem(item.product, item.sizeAndColors),
          state: 'pending',
          customer: user.customer!,
        },
        { createOrderItem: orderItemCreated }: { createOrderItem: OrderItem } =
          await unwrapData(apiCreateOrderItem(orderItem));

      return orderItemCreated;
    } catch (error) {}
  };

  const createOrdersAndUpdateCartItems = async (): Promise<OrderItem[]> => {
    const promises = await Promise.allSettled(
      cart.map(async (item) => {
        const orderItemCreated: OrderItem | undefined =
          await createOrderItem(item);

        if (orderItemCreated) {
          dispatch(
            editOrderItemDocumentIdCartItem({
              cartItemId: item.id,
              orderItemDocumentId: orderItemCreated.documentId,
            })
          );
        }

        return orderItemCreated;
      })
    );

    return promises
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<OrderItem>).value);
  };

  const validateCart = async () => {
    setSubmitting(true);
    const orderItems: OrderItem[] = await createOrdersAndUpdateCartItems();
    await validatePayment(orderItems);
    setSubmitting(false);
  };

  const createCheckout = (orderItems: OrderItem[]): Checkout => {
    return {
      orderItemsCheckout: orderItems.map((orderItem: OrderItem) => ({
        documentId: orderItem.documentId,
        productName: orderItem.product.name,
        productPrice: Math.trunc(getProductPriceForSizeAndColors(orderItem.product, orderItem.sizeAndColorSelections) * 100 * (1 + TVA_RATE)),
        productQuantity: orderItem.sizeAndColorSelections.reduce(
          (total, sizeAndColor) => total + sizeAndColor.quantity,
          0
        ),
        totalPrice: orderItem.price,
      })),
      totalPrice,
      totalPriceWithVAT,
      customerDocumentId: user.customer!.documentId,
      userFirstName: user.firstName,
      userLastName: user.lastName,
      userEmail: user.email,
      shippingAddress: shipping,
    };
  };

  const validatePayment = async (orderItems: OrderItem[]): Promise<void> => {
    if (user.customer!.deferredPayment) {
      await createProjectAndDeferredInvoice(orderItems);
    } else {
      await redirectToStripeCheckout(orderItems);
    }
  };

  const createProjectAndDeferredInvoice = async (
    orderItems: OrderItem[]
  ): Promise<void> => {
    await fetch(API_BASE_URL + '/checkout/deferred', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${TOKEN_TYPE}${token}`,
      },
      body: JSON.stringify(createCheckout(orderItems)),
    });

    orderItems.map((orderItem: OrderItem) =>
      dispatch(removeFromCartItemOfOrderItem(orderItem.documentId))
    );
    navigate('/common/projects');
  };

  const redirectToStripeCheckout = async (
    orderItems: OrderItem[]
  ): Promise<void> => {
    const response = await fetch(API_BASE_URL + '/checkout/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${TOKEN_TYPE}${token}`,
        },
        body: JSON.stringify(createCheckout(orderItems)),
      }),
      { id }: { id: string } = await response.json(),
      stripe = await stripePromise;

    if (stripe) {
      await stripe.redirectToCheckout({ sessionId: id });
    }
  };

  const itemCount = cart.reduce((sum, item) =>
    sum + item.sizeAndColors.reduce((s, sc) => s + sc.quantity, 0), 0
  );

  return (
    <div style={{
      background: 'linear-gradient(160deg, rgba(22,38,61,0.98) 0%, rgba(15,28,46,0.98) 100%)',
      border: '1.5px solid rgba(255,255,255,0.06)',
      borderRadius: '20px', padding: '24px',
      fontFamily: 'Inter, sans-serif',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <h4 style={{ color: '#fff', fontWeight: 800, fontSize: '16px', margin: 0, letterSpacing: '-0.02em' }}>
          Recapitulatif
        </h4>
        <span style={{
          background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.15)',
          borderRadius: '8px', padding: '3px 10px',
          color: 'rgba(107,158,255,0.7)', fontSize: '11px', fontWeight: 600,
        }}>
          {itemCount} art.
        </span>
      </div>

      {/* Line items summary */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.04)',
        padding: '14px', marginBottom: '18px',
      }}>
        {cart.map((item, i) => {
          const total = getTotalPriceForCartItem(item.product, item.sizeAndColors);
          const qty = item.sizeAndColors.reduce((s, sc) => s + sc.quantity, 0);
          return (
            <div key={item.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < cart.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'block',
                }}>
                  {item.product.name}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                  x{qty}
                </span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, flexShrink: 0, marginLeft: '8px' }}>
                {total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500 }}>Sous-total HT</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '13px' }}>
            {subtotalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500 }}>Livraison HT</span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '13px' }}>
            {SHIPPING_HT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 500 }}>TVA (20%)</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500 }}>
            {tva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: '1px', margin: '18px 0',
        background: 'linear-gradient(90deg, transparent, rgba(47,111,237,0.2), transparent)',
      }} />

      {/* Total TTC */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px',
        background: 'rgba(47,111,237,0.06)', borderRadius: '12px',
        padding: '14px 16px',
        border: '1px solid rgba(47,111,237,0.1)',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Total TTC</span>
        <span style={{
          color: '#6b9eff', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.02em',
        }}>
          {totalPriceWithVAT.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span style={{ fontSize: '14px', fontWeight: 600, marginLeft: '2px' }}>€</span>
        </span>
      </div>

      {/* Payment button */}
      <button
        disabled={!user.customer || isSubmitting}
        onClick={validateCart}
        style={{
          width: '100%', padding: '14px',
          background: !user.customer || isSubmitting
            ? 'rgba(47,111,237,0.2)'
            : 'linear-gradient(135deg, #2f6fed 0%, #1f4bb6 50%, #2f6fed 100%)',
          border: 'none', borderRadius: '14px',
          color: '#fff', fontSize: '14px', fontWeight: 700,
          cursor: !user.customer || isSubmitting ? 'not-allowed' : 'pointer',
          boxShadow: isSubmitting ? 'none' : '0 4px 20px rgba(47,111,237,0.35)',
          fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          transition: 'all 0.2s ease',
          letterSpacing: '0.01em',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (user.customer && !isSubmitting) {
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(47,111,237,0.5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (user.customer && !isSubmitting) {
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(47,111,237,0.35)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        <HiShieldCheck size={16} />
        {isSubmitting ? 'Traitement en cours...' : 'Valider la commande'}
      </button>

      {/* Security badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        marginTop: '14px',
      }}>
        <div style={{
          width: '4px', height: '4px', borderRadius: '50%',
          background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.4)',
        }} />
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center', margin: 0, fontWeight: 500 }}>
          Paiement securise par Stripe
        </p>
      </div>
    </div>
  );
}

export default PaymentContent;
