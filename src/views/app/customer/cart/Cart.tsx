import { CartItem } from '@/@types/cart';
import { Product } from '@/@types/product';
import { Container } from '@/components/shared';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { editItem, removeFromCart } from '@/store/slices/base/cartSlice';
import { apiGetProducts } from '@/services/ProductServices';
import { getTotalPriceForCartItem, getProductPriceForSizeAndColors, isProductPackPricing } from '@/utils/productHelpers';
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
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '11px 14px',
  color: '#fff',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, background 0.2s ease',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.5)',
  fontSize: '11px',
  fontWeight: 600,
  marginBottom: '6px',
  letterSpacing: '0.03em',
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
      } catch (err) { console.error('Failed to fetch suggestions:', err); }
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
          justifyContent: 'center', minHeight: '60vh', gap: '20px',
        }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(47,111,237,0.08), rgba(47,111,237,0.02))',
            border: '2px solid rgba(47,111,237,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MdShoppingCart size={40} style={{ color: 'rgba(107,158,255,0.3)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0' }}>
              Votre panier est vide
            </p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', margin: 0 }}>
              Parcourez notre catalogue pour trouver vos produits
            </p>
          </div>
          <button
            onClick={() => navigate('/customer/products')}
            style={{
              marginTop: '4px', background: 'linear-gradient(135deg, #2f6fed 0%, #1f4bb6 100%)',
              border: 'none', borderRadius: '12px', padding: '12px 28px',
              color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 20px rgba(47,111,237,0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(47,111,237,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(47,111,237,0.35)';
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
      <div style={{ paddingTop: '32px', paddingBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(47,111,237,0.15), rgba(47,111,237,0.05))',
            border: '1px solid rgba(47,111,237,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MdShoppingCart size={16} style={{ color: '#6b9eff' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            Votre commande
          </p>
        </div>
        <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.025em', margin: 0 }}>
          Panier{' '}
          <span style={{
            color: 'rgba(107,158,255,0.6)', fontSize: '16px', fontWeight: 500,
            background: 'rgba(47,111,237,0.08)', borderRadius: '100px',
            padding: '2px 10px', marginLeft: '4px',
          }}>
            {cart.length} article{cart.length > 1 ? 's' : ''}
          </span>
        </h2>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* Cart items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {cart.map((item, index) => {
            const unitPrice = getProductPriceForSizeAndColors(item.product, item.sizeAndColors);
            const totalItem = getTotalPriceForCartItem(item.product, item.sizeAndColors);
            const isPackPricing = isProductPackPricing(item.product);
            const totalQuantity = item.sizeAndColors.reduce((sum, s) => sum + s.quantity, 0);
            return (
              <div
                key={item.id}
                style={{
                  background: 'linear-gradient(160deg, rgba(22,38,61,0.95) 0%, rgba(15,28,46,0.95) 100%)',
                  border: '1.5px solid rgba(255,255,255,0.06)',
                  borderRadius: '18px', padding: '18px 20px',
                  display: 'flex', gap: '18px', alignItems: 'center',
                  backdropFilter: 'blur(10px)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(47,111,237,0.2)';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Item number badge */}
                <div style={{
                  position: 'absolute', top: '10px', left: '10px',
                  width: '20px', height: '20px', borderRadius: '6px',
                  background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, color: 'rgba(107,158,255,0.5)',
                }}>
                  {index + 1}
                </div>

                {/* Image */}
                <div style={{
                  width: '90px', height: '90px', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                  {item.product.images?.[0]?.url ? (
                    <img src={item.product.images[0].url} alt={item.product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
                  ) : (
                    <MdOutlineShoppingBag size={30} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    color: '#fff', fontWeight: 700, fontSize: '14px', margin: '0 0 4px 0',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    letterSpacing: '-0.01em',
                  }}>
                    {item.product.name}
                  </p>
                  <p style={{
                    color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: '0 0 10px 0',
                  }}>
                    {isPackPricing
                      ? `Pack de ${totalQuantity} unite${totalQuantity > 1 ? 's' : ''}`
                      : `${unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / unite`}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {item.sizeAndColors.map((s) => (
                      <span key={s.size.value + (s.color?.value ?? '')} style={{
                        background: 'linear-gradient(135deg, rgba(47,111,237,0.12), rgba(47,111,237,0.06))',
                        border: '1px solid rgba(47,111,237,0.2)',
                        borderRadius: '8px', padding: '3px 9px',
                        color: '#6b9eff', fontSize: '11px', fontWeight: 600,
                      }}>
                        {s.size.value !== 'DEFAULT' ? s.size.name : 'Qte'}
                        {s.color?.value && s.color.value !== 'DEFAULT' ? ` · ${s.color.name}` : ''} : {s.quantity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
                  <p style={{
                    color: '#fff', fontWeight: 800, fontSize: '16px', margin: '0 0 2px 0',
                    letterSpacing: '-0.02em',
                  }}>
                    {totalItem.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>€</span>
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: 0, fontWeight: 500 }}>
                    HT
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => handleEdit(item)} title="Modifier" style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: 'rgba(107,158,255,0.06)', border: '1px solid rgba(107,158,255,0.15)',
                    cursor: 'pointer', color: '#6b9eff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(107,158,255,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(107,158,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(107,158,255,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(107,158,255,0.15)';
                  }}
                  >
                    <HiOutlinePencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(item)} title="Supprimer" style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)',
                    cursor: 'pointer', color: '#f87171',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(248,113,113,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(248,113,113,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(248,113,113,0.15)';
                  }}
                  >
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
              background: 'rgba(255,255,255,0.01)', border: '2px dashed rgba(255,255,255,0.07)',
              borderRadius: '18px', padding: '16px',
              color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(47,111,237,0.25)';
              e.currentTarget.style.color = 'rgba(107,158,255,0.7)';
              e.currentTarget.style.background = 'rgba(47,111,237,0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
            }}
          >
            <HiPlus size={15} /> Ajouter un produit
          </button>

          {/* Shipping address */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <MdLocationOn size={16} style={{ color: 'rgba(107,158,255,0.5)' }} />
              <p style={{
                color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0,
              }}>
                Adresse de livraison
              </p>
              {hasAddress && (
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.5)',
                }} />
              )}
            </div>
            <button
              type="button"
              onClick={() => setShippingOpen((o) => !o)}
              style={{
                width: '100%',
                background: hasAddress
                  ? 'linear-gradient(135deg, rgba(47,111,237,0.12) 0%, rgba(31,75,182,0.06) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                border: `2px solid ${hasAddress ? 'rgba(47,111,237,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '16px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: hasAddress ? '0 0 0 4px rgba(47,111,237,0.06)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px', color: hasAddress ? '#6b9eff' : 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 600 }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: hasAddress ? 'rgba(47,111,237,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${hasAddress ? 'rgba(47,111,237,0.2)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <MdLocationOn size={18} style={{ color: hasAddress ? '#6b9eff' : 'rgba(255,255,255,0.25)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  {hasAddress ? (
                    <>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{shipping.address}</div>
                      <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{shipping.zipCode} {shipping.city}, {shipping.country}</div>
                    </>
                  ) : (
                    <div>Cliquez pour renseigner votre adresse</div>
                  )}
                </div>
              </span>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {shippingOpen ? <HiChevronUp size={14} color="rgba(255,255,255,0.4)" /> : <HiChevronDown size={14} color="rgba(255,255,255,0.4)" />}
              </div>
            </button>

            {shippingOpen && (
              <div style={{
                marginTop: '8px',
                background: 'linear-gradient(160deg, rgba(22,38,61,0.95) 0%, rgba(15,28,46,0.95) 100%)',
                border: '1.5px solid rgba(255,255,255,0.06)',
                borderRadius: '18px', padding: '22px',
                display: 'flex', flexDirection: 'column', gap: '14px',
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Prenom</label>
                    <input style={inputStyle} placeholder="Jean" value={shipping.firstName} onChange={setField('firstName')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nom</label>
                    <input style={inputStyle} placeholder="Dupont" value={shipping.lastName} onChange={setField('lastName')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Entreprise</label>
                    <input style={inputStyle} placeholder="Societe (optionnel)" value={shipping.company ?? ''} onChange={setField('company')} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telephone</label>
                    <input style={inputStyle} placeholder="+33 6 00 00 00 00" value={shipping.phone ?? ''} onChange={setField('phone')} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Adresse</label>
                  <input style={inputStyle} placeholder="12 rue de la Paix" value={shipping.address} onChange={setField('address')} />
                </div>
                <div>
                  <label style={labelStyle}>Complement</label>
                  <input style={inputStyle} placeholder="Batiment, etage... (optionnel)" value={shipping.addressLine2 ?? ''} onChange={setField('addressLine2')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
        <div style={{ marginTop: '48px', paddingBottom: '56px' }}>
          {/* Separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Vous aimerez aussi
            </span>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06))' }} />
          </div>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 22px 0' }}>
            Produits complementaires
          </h3>

          {/* Infinite scroll track */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Fade edges */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px', background: 'linear-gradient(90deg, var(--color-gray-900, #0f172a), transparent)', zIndex: 2, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px', background: 'linear-gradient(270deg, var(--color-gray-900, #0f172a), transparent)', zIndex: 2, pointerEvents: 'none' }} />

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
                    flexShrink: 0, width: '230px',
                    background: 'linear-gradient(160deg, rgba(22,38,61,0.95) 0%, rgba(15,28,46,0.95) 100%)',
                    border: '1.5px solid rgba(255,255,255,0.06)', borderRadius: '16px',
                    overflow: 'hidden', cursor: 'pointer',
                    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(47,111,237,0.3)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    height: '150px', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name}
                        style={{ maxWidth: '100%', maxHeight: '130px', objectFit: 'contain', padding: '10px' }} />
                    ) : (
                      <MdOutlineShoppingBag size={36} style={{ color: 'rgba(255,255,255,0.08)' }} />
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <p style={{
                      color: '#fff', fontWeight: 600, fontSize: '13px', margin: '0 0 12px 0',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {product.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, rgba(47,111,237,0.12), rgba(47,111,237,0.06))',
                        border: '1px solid rgba(47,111,237,0.2)',
                        borderRadius: '8px', padding: '4px 10px',
                        color: '#6b9eff', fontSize: '12px', fontWeight: 700,
                      }}>
                        {(product.price ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                      <span style={{ color: 'rgba(107,158,255,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em' }}>
                        Voir →
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
