import { getProductBasePrice } from '@/utils/productHelpers';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/@types/product';
import { HiPhotograph } from 'react-icons/hi';

const getShortDescription = (desc: string): string => {
  const text = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= 110) return text;
  return text.slice(0, 110).replace(/\s+\S*$/, '') + '…';
};

const CustomerProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const imageUrl = product.images[0]?.url;
  const shortDesc = product.description ? getShortDescription(product.description) : null;
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
        padding: '20px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Image — rectangle vertical */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        overflow: 'hidden',
        height: '220px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '10px' }}
          />
        ) : (
          <HiPhotograph size={52} style={{ color: 'rgba(255,255,255,0.12)' }} />
        )}
      </div>

      {/* Titre */}
      <p style={{
        color: '#fff',
        fontWeight: 700,
        fontSize: '15px',
        letterSpacing: '-0.01em',
        lineHeight: 1.35,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {product.name}
      </p>

      {/* Description courte */}
      {shortDesc && (
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '12px',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginTop: '-6px',
        }}>
          {shortDesc}
        </p>
      )}

      {/* Séparateur */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 75%, transparent)',
      }} />

      {/* Badge prix */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
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
    </div>
  );
};

export default CustomerProductCard;
