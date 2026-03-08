import { CartItem } from '@/@types/cart';
import { Product } from '@/@types/product';
import { Container } from '@/components/shared';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { editItem, removeFromCart } from '@/store/slices/base/cartSlice';
import { apiGetCustomerProducts } from '@/services/ProductServices';
import { getTotalPriceForCartItem, getProductPriceForSizeAndColors } from '@/utils/productHelpers';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdShoppingCart, MdOutlineShoppingBag } from 'react-icons/md';
import { HiOutlinePencil, HiOutlineTrash, HiPlus } from 'react-icons/hi';
import { User } from '@/@types/user';
import PaymentContent from './PaymentContent';
import useUserCart from '@/utils/hooks/useUserCart';

function Cart() {
  const { documentId } = useAppSelector((state: RootState) => state.auth.user.user);
  const { user }: { user: User } = useAppSelector((state: RootState) => state.auth.user);
  const cart = useUserCart(documentId);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user.customer?.documentId) return;
      try {
        const res = await apiGetCustomerProducts(
          user.customer.documentId,
          user.customer.customerCategory?.documentId ?? '',
          { page: 1, pageSize: 30 },
          ''
        );
        const all: Product[] = res.data.data.products_connection.nodes;
        const cartIds = new Set(cart.map((c) => c.product.documentId));
        setSuggestions(all.filter((p) => !cartIds.has(p.documentId)));
      } catch {}
    };
    fetchSuggestions();
  }, [cart.length, user.customer?.documentId]);

  // Auto-rotate every 3 seconds
  useEffect(() => {
    if (suggestions.length <= 3) return;
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlideIndex((prev) => (prev + 3) % suggestions.length);
        setFading(false);
      }, 400);
    }, 3000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [suggestions.length]);

  const visibleSuggestions = suggestions.length > 0
    ? [0, 1, 2].map((i) => suggestions[(slideIndex + i) % suggestions.length]).filter(Boolean)
    : [];

  const handleEdit = (item: CartItem) => {
    dispatch(editItem(item));
    navigate('/customer/product/' + item.product.documentId + '/edit');
  };

  const handleDelete = (item: CartItem) => {
    dispatch(removeFromCart(item));
  };

  if (cart.length === 0) {
    return (
      <Container className="h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: '16px',
        }}>
          <MdShoppingCart size={64} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '16px', fontWeight: 600 }}>
            Votre panier est vide
          </p>
          <button
            onClick={() => navigate('/customer/products')}
            style={{
              marginTop: '8px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
              border: 'none', borderRadius: '10px', padding: '10px 22px',
              color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Voir le catalogue
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ paddingTop: '28px', paddingBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Commande
        </p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Panier{' '}
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>
            ({cart.length} article{cart.length > 1 ? 's' : ''})
          </span>
        </h2>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

        {/* Cart items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cart.map((item) => {
            const unitPrice = getProductPriceForSizeAndColors(item.product, item.sizeAndColors);
            const totalItem = getTotalPriceForCartItem(item.product, item.sizeAndColors);
            return (
              <div
                key={item.id}
                style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  border: '1.5px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px', padding: '16px',
                  display: 'flex', gap: '16px', alignItems: 'center',
                }}
              >
                {/* Image */}
                <div style={{
                  width: '80px', height: '80px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {item.product.images?.[0]?.url ? (
                    <img src={item.product.images[0].url} alt={item.product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <MdOutlineShoppingBag size={28} style={{ color: 'rgba(255,255,255,0.15)' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: '0 0 8px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.product.name}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {item.sizeAndColors.map((s) => (
                      <span key={s.size.value + (s.color?.value ?? '')} style={{
                        background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                        borderRadius: '100px', padding: '2px 8px',
                        color: '#6b9eff', fontSize: '11px', fontWeight: 600,
                      }}>
                        {s.size.value !== 'DEFAULT' ? s.size.name : 'Qté'}
                        {s.color?.value && s.color.value !== 'DEFAULT' ? ` · ${s.color.name}` : ''} : {s.quantity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: '0 0 2px 0' }}>
                    {totalItem.toFixed(2)} €
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', margin: 0 }}>
                    {unitPrice.toFixed(2)} € / u.
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => handleEdit(item)} title="Modifier" style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(107,158,255,0.08)', border: '1px solid rgba(107,158,255,0.2)',
                    cursor: 'pointer', color: '#6b9eff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <HiOutlinePencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(item)} title="Supprimer" style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                    cursor: 'pointer', color: '#f87171',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <HiOutlineTrash size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add more */}
          <button
            onClick={() => navigate('/customer/products')}
            style={{
              background: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.09)',
              borderRadius: '16px', padding: '14px',
              color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiPlus size={15} /> Ajouter un produit
          </button>
        </div>

        {/* Payment sidebar */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <PaymentContent cart={cart} />
        </div>
      </div>

      {/* Suggestions carousel */}
      {visibleSuggestions.length > 0 && (
        <div style={{ marginTop: '48px', paddingBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                Vous aimerez aussi
              </p>
              <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
                Produits complémentaires
              </h3>
            </div>
            {/* Dots */}
            <div style={{ display: 'flex', gap: '6px', paddingBottom: '4px' }}>
              {Array.from({ length: Math.ceil(suggestions.length / 3) }).map((_, i) => (
                <div key={i} style={{
                  width: i === Math.floor(slideIndex / 3) % Math.ceil(suggestions.length / 3) ? '18px' : '6px',
                  height: '6px', borderRadius: '100px',
                  background: i === Math.floor(slideIndex / 3) % Math.ceil(suggestions.length / 3)
                    ? '#6b9eff' : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px',
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}>
            {visibleSuggestions.map((product) => (
              <div
                key={product.documentId}
                onClick={() => navigate('/customer/product/' + product.documentId)}
                style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px',
                  overflow: 'hidden', cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'rgba(47,111,237,0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                }}
              >
                <div style={{
                  height: '140px', background: 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {product.images?.[0]?.url ? (
                    <img src={product.images[0].url} alt={product.name}
                      style={{ maxWidth: '100%', maxHeight: '125px', objectFit: 'contain' }} />
                  ) : (
                    <MdOutlineShoppingBag size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  )}
                </div>
                <div style={{ padding: '14px' }}>
                  <p style={{
                    color: '#fff', fontWeight: 600, fontSize: '13px', margin: '0 0 10px 0',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {product.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                      borderRadius: '100px', padding: '3px 10px',
                      color: '#6b9eff', fontSize: '12px', fontWeight: 600,
                    }}>
                      {(product.price ?? 0).toFixed(2)} €
                    </span>
                    <span style={{ color: 'rgba(107,158,255,0.75)', fontSize: '12px', fontWeight: 600 }}>
                      Commander →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Container>
  );
}

export default Cart;
