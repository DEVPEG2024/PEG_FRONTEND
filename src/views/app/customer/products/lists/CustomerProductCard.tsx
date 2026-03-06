import { getProductBasePrice } from '@/utils/productHelpers';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/@types/product';
import { HiCheck, HiPhotograph } from 'react-icons/hi';

const getCharacteristics = (desc: string): string[] => {
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const items: string[] = [];
  let match;
  while ((match = liRegex.exec(desc)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text) items.push(text);
    if (items.length >= 4) break;
  }
  if (items.length > 0) return items;
  return desc
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 120)
    .slice(0, 3);
};

const CustomerProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const imageUrl = product.images[0]?.url;
  const characteristics = product.description ? getCharacteristics(product.description) : [];
  const price = getProductBasePrice(product).toFixed(2);

  return (
    <div
      onClick={() => navigate(`/customer/product/${product.documentId}`)}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-6px)';
        el.style.boxShadow = '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(47,111,237,0.25)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)';
      }}
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '18px',
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Titre */}
      <p style={{
        color: '#fff',
        fontWeight: 600,
        fontSize: '15px',
        textAlign: 'center',
        letterSpacing: '-0.01em',
        lineHeight: 1.35,
        marginBottom: '18px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {product.name}
      </p>

      {/* Séparateur dégradé */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 75%, transparent)',
        marginBottom: '20px',
      }} />

      {/* Image dans un frame */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '160px',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{ maxHeight: '132px', width: '100%', objectFit: 'contain' }}
          />
        ) : (
          <HiPhotograph size={44} style={{ color: 'rgba(255,255,255,0.15)' }} />
        )}
      </div>

      {/* Badge prix */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <span style={{
          background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
          borderRadius: '100px',
          padding: '7px 22px',
          color: '#fff',
          fontWeight: 700,
          fontSize: '18px',
          letterSpacing: '-0.02em',
          boxShadow: '0 4px 16px rgba(47,111,237,0.45)',
        }}>
          {price} €
        </span>
      </div>

      {/* Caractéristiques */}
      {characteristics.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '20px' }}>
          {characteristics.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'rgba(47,111,237,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '1px',
              }}>
                <HiCheck size={11} style={{ color: '#5b8ff9' }} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: 1.45 }}>{c}</span>
            </div>
          ))}
        </div>
      )}

      {/* Séparateur dégradé */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 75%, transparent)',
        marginBottom: '20px',
        marginTop: characteristics.length === 0 ? '0' : undefined,
      }} />

      {/* CTA */}
      <button
        onClick={(e) => { e.stopPropagation(); navigate(`/customer/product/${product.documentId}`); }}
        style={{
          background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
          borderRadius: '12px',
          width: '100%',
          padding: '13px',
          color: '#fff',
          fontWeight: 600,
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          boxShadow: '0 4px 20px rgba(47,111,237,0.4)',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      >
        Voir l'offre
      </button>
    </div>
  );
};

export default CustomerProductCard;
