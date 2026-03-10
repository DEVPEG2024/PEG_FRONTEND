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
import { apiCreateOrderItem } from '@/services/OrderItemServices';
import { OrderItem } from '@/@types/orderItem';
import { User } from '@/@types/user';
import {
  editOrderItemDocumentIdCartItem,
  removeFromCartItemOfOrderItem,
} from '@/store/slices/base/cartSlice';
import { useNavigate } from 'react-router-dom';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { MdLocationOn } from 'react-icons/md';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#fff',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '11px',
  fontWeight: 600,
  marginBottom: '5px',
};

function PaymentContent({ cart }: { cart: CartItem[] }) {
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const { token } = useAppSelector((state) => state.auth.session);
  const stripePromise = loadStripe(env?.STRIPE_PUBLIC_KEY as string);
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [shippingOpen, setShippingOpen] = useState(false);
  const [shipping, setShipping] = useState<ShippingAddress>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    company: '',
    address: '',
    addressLine2: '',
    zipCode: '',
    city: '',
    country: 'France',
    phone: '',
  });

  const set = (key: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setShipping((p) => ({ ...p, [key]: e.target.value }));

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
        productPrice: Math.trunc(getProductPriceForSizeAndColors(orderItem.product, orderItem.sizeAndColorSelections) * 100 * 1.2),
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

  const SHIPPING_HT = 9.90;

  const subtotalHT: number = cart.reduce((total: number, item: CartItem) => {
    return total + getTotalPriceForCartItem(item.product, item.sizeAndColors);
  }, 0);

  const totalPrice: number = subtotalHT + SHIPPING_HT;
  const totalPriceWithVAT: number = totalPrice * 1.2;
  const tva = totalPriceWithVAT - totalPrice;

  const hasAddress = shipping.address && shipping.city && shipping.zipCode;

  return (
    <div style={{
      background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
      border: '1.5px solid rgba(255,255,255,0.07)',
      borderRadius: '16px', padding: '20px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <h4 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: '0 0 20px 0' }}>
        Récapitulatif
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Sous-total HT</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{subtotalHT.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Livraison HT</span>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{SHIPPING_HT.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>TVA (20%)</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{tva.toFixed(2)} €</span>
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Total TTC</span>
        <span style={{ color: '#6b9eff', fontWeight: 800, fontSize: '18px' }}>
          {totalPriceWithVAT.toFixed(2)} €
        </span>
      </div>

      {/* Shipping address toggle */}
      <button
        type="button"
        onClick={() => setShippingOpen((o) => !o)}
        style={{
          width: '100%', marginBottom: '10px',
          background: hasAddress ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasAddress ? 'rgba(47,111,237,0.35)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '10px', padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '7px', color: hasAddress ? '#6b9eff' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600 }}>
          <MdLocationOn size={15} />
          {hasAddress ? `${shipping.address}, ${shipping.zipCode} ${shipping.city}` : 'Adresse de livraison'}
        </span>
        {shippingOpen ? <HiChevronUp size={14} color="rgba(255,255,255,0.4)" /> : <HiChevronDown size={14} color="rgba(255,255,255,0.4)" />}
      </button>

      {shippingOpen && (
        <div style={{
          background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px', padding: '14px', marginBottom: '10px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input style={inputStyle} placeholder="Jean" value={shipping.firstName} onChange={set('firstName')} />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input style={inputStyle} placeholder="Dupont" value={shipping.lastName} onChange={set('lastName')} />
            </div>
            <div>
              <label style={labelStyle}>Entreprise</label>
              <input style={inputStyle} placeholder="Société (optionnel)" value={shipping.company ?? ''} onChange={set('company')} />
            </div>
            <div>
              <label style={labelStyle}>Téléphone</label>
              <input style={inputStyle} placeholder="+33 6 00 00 00 00" value={shipping.phone ?? ''} onChange={set('phone')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Adresse</label>
            <input style={inputStyle} placeholder="12 rue de la Paix" value={shipping.address} onChange={set('address')} />
          </div>
          <div>
            <label style={labelStyle}>Complément</label>
            <input style={inputStyle} placeholder="Bâtiment, étage… (optionnel)" value={shipping.addressLine2 ?? ''} onChange={set('addressLine2')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Code postal</label>
              <input style={inputStyle} placeholder="75001" value={shipping.zipCode} onChange={set('zipCode')} />
            </div>
            <div>
              <label style={labelStyle}>Ville</label>
              <input style={inputStyle} placeholder="Paris" value={shipping.city} onChange={set('city')} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Pays</label>
            <input style={inputStyle} placeholder="France" value={shipping.country} onChange={set('country')} />
          </div>
        </div>
      )}

      <button
        disabled={!user.customer || isSubmitting}
        onClick={validateCart}
        style={{
          width: '100%', padding: '12px',
          background: !user.customer || isSubmitting ? 'rgba(47,111,237,0.3)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
          border: 'none', borderRadius: '10px',
          color: '#fff', fontSize: '14px', fontWeight: 700,
          cursor: !user.customer || isSubmitting ? 'not-allowed' : 'pointer',
          boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(47,111,237,0.4)',
          fontFamily: 'Inter, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        🔒 {isSubmitting ? 'Traitement…' : 'Valider la commande'}
      </button>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
        Paiement sécurisé
      </p>
    </div>
  );
}

export default PaymentContent;
