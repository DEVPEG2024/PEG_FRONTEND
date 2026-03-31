import { CartItem } from '@/@types/cart';
import { Product } from '@/@types/product';
import { Container } from '@/components/shared';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { editItem, removeFromCart } from '@/store/slices/base/cartSlice';
import { apiGetProducts } from '@/services/ProductServices';
import { getTotalPriceForCartItem, getProductPriceForSizeAndColors } from '@/utils/productHelpers';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdShoppingCart, MdOutlineShoppingBag, MdLocationOn } from 'react-icons/md';
import { HiOutlinePencil, HiOutlineTrash, HiPlus, HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { ShippingAddress } from '@/@types/checkout';
import { User } from '@/@types/user';
import PaymentContent from './PaymentContent';
import useUserCart from '@/utils/hooks/useUserCart';

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
  color: 'rgba(255,255,255,0.6)',
  fontSize: '11px',
  fontWeight: 600,
  marginBottom: '5px',
};

function Cart() {
  const { documentId } = useAppSelector((state: RootState) => state.auth.user.user);
  const { user }: { user: User } = useAppSelector((state: RootState) => state.auth.user);
  const cart = useUserCart(documentId);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

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
  const setField = (key: keyof ShippingAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setShipping((p) => ({ ...p, [key]: e.target.value }));
  const hasAddress = !!(shipping.address && shipping.city && shipping.zipCode);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await apiGetProducts({ pagination: { page: 1, pageSize: 100 }, searchTerm: '' });
        const all: Product[] = (res.data?.data?.products_connection?.nodes ?? []).filter(
          (p: Product) => p.active && p.inCatalogue
        );
        const cartIds = new Set(cart.map((c) => c.product.documentId));
        setSuggestions(all.filter((p) => !cartIds.has(p.documentId)));
      } catch {}
    };
    fetchSuggestions();
  }, [cart.length]);

  // Continuous auto-scroll carousel
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || suggestions.length === 0) return;

    const step = () => {
      if (!isPausedRef.current && el) {
        el.scrollLeft += 0.6;
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [suggestions.length]);

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
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
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
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', margin: 0 }}>
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
              color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiPlus size={15} /> Ajouter un produit
          </button>

          {/* Shipping address */}
          <div style={{ marginTop: '16px' }}>
            <p style={{
              color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px',
            }}>
              Adresse de livraison
            </p>
            <button
              type="button"
              onClick={() => setShippingOpen((o) => !o)}
              style={{
                width: '100%',
                background: hasAddress
                  ? 'linear-gradient(135deg, rgba(47,111,237,0.18) 0%, rgba(31,75,182,0.12) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                border: `2px solid ${hasAddress ? 'rgba(47,111,237,0.5)' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '16px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: hasAddress ? '0 0 0 4px rgba(47,111,237,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px', color: hasAddress ? '#6b9eff' : 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600 }}>
                <MdLocationOn size={24} style={{ flexShrink: 0, color: hasAddress ? '#6b9eff' : 'rgba(255,255,255,0.35)' }} />
                {hasAddress ? `${shipping.address}, ${shipping.zipCode} ${shipping.city}` : 'Cliquez pour renseigner votre adresse'}
              </span>
              {shippingOpen ? <HiChevronUp size={16} color="rgba(255,255,255,0.5)" /> : <HiChevronDown size={16} color="rgba(255,255,255,0.5)" />}
            </button>

            {shippingOpen && (
              <div style={{
                marginTop: '8px',
                background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                border: '1.5px solid rgba(255,255,255,0.07)',
                borderRadius: '16px', padding: '18px',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Prénom</label>
                    <input style={inputStyle} placeholder="Jean" value={shipping.firstName} onChange={setField('firstName')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nom</label>
                    <input style={inputStyle} placeholder="Dupont" value={shipping.lastName} onChange={setField('lastName')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Entreprise</label>
                    <input style={inputStyle} placeholder="Société (optionnel)" value={shipping.company ?? ''} onChange={setField('company')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Téléphone</label>
                    <input style={inputStyle} placeholder="+33 6 00 00 00 00" value={shipping.phone ?? ''} onChange={setField('phone')} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Adresse</label>
                  <input style={inputStyle} placeholder="12 rue de la Paix" value={shipping.address} onChange={setField('address')} />
                </div>
                <div>
                  <label style={labelStyle}>Complément</label>
                  <input style={inputStyle} placeholder="Bâtiment, étage… (optionnel)" value={shipping.addressLine2 ?? ''} onChange={setField('addressLine2')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Code postal</label>
                    <input style={inputStyle} placeholder="75001" value={shipping.zipCode} onChange={setField('zipCode')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ville</label>
                    <input style={inputStyle} placeholder="Paris" value={shipping.city} onChange={setField('city')} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Pays</label>
                  <input style={inputStyle} placeholder="France" value={shipping.country} onChange={setField('country')} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment sidebar */}
        <div style={{ position: 'sticky', top: '20px' }}>
          <PaymentContent cart={cart} shipping={shipping} />
        </div>
      </div>

      {/* Suggestions carousel */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: '40px', paddingBottom: '48px' }}>
          {/* Separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))' }} />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Vous aimerez aussi
            </span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.01), rgba(255,255,255,0.08))' }} />
          </div>
          <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 20px 0' }}>
            Produits complémentaires
          </h3>

          {/* Infinite scroll track */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Fade edges */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(90deg, var(--color-gray-900, #0f172a), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px', background: 'linear-gradient(270deg, var(--color-gray-900, #0f172a), transparent)', zIndex: 2, pointerEvents: 'none' }} />

            <div
              ref={scrollRef}
              onMouseEnter={() => { isPausedRef.current = true; }}
              onMouseLeave={() => { isPausedRef.current = false; }}
              style={{
                display: 'flex', gap: '14px',
                overflowX: 'hidden', scrollbarWidth: 'none',
              }}
            >
              {/* Duplicate items for seamless loop */}
              {[...suggestions, ...suggestions].map((product, idx) => (
                <div
                  key={`${product.documentId}-${idx}`}
                  onClick={() => navigate('/customer/product/' + product.documentId)}
                  style={{
                    flexShrink: 0, width: '220px',
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
        </div>
      )}
    </Container>
  );
}

export default Cart;
