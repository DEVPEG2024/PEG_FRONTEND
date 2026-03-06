import { getProductBasePrice } from '@/utils/productHelpers';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/@types/product';
import { HiPhotograph } from 'react-icons/hi';

const getShortSentence = (desc: string): string => {
  const text = desc.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const match = text.match(/^.{10,}?[.!?]/);
  const sentence = match ? match[0].trim() : text;
  if (sentence.length <= 90) return sentence;
  return sentence.slice(0, 90).replace(/\s+\S*$/, '') + '…';
};

const CustomerProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const imageUrl = product.images[0]?.url;
  const shortDesc = product.description ? getShortSentence(product.description) : null;
  const price = getProductBasePrice(product).toFixed(2);

  return (
    <div
      onClick={() => navigate(`/customer/product/${product.documentId}`)}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 20px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(47,111,237,0.2)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 2px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)';
      }}
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '16px',
        padding: '16px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        boxShadow: '0 2px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Titre */}
      <p style={{
        color: '#fff',
        fontWeight: 600,
        fontSize: '13px',
        letterSpacing: '-0.01em',
        lineHeight: 1.35,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {product.name}
      </p>

      {/* Image */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        overflow: 'hidden',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
          />
        ) : (
          <HiPhotograph size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
        )}
      </div>

      {/* Description courte */}
      <p style={{
        color: 'rgba(255,255,255,0.38)',
        fontSize: '11px',
        lineHeight: 1.55,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        minHeight: '17px',
      }}>
        {shortDesc ?? ''}
      </p>

      {/* Prix */}
      <span style={{
        background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
        borderRadius: '100px',
        padding: '3px 10px',
        color: '#fff',
        fontWeight: 700,
        fontSize: '13px',
        letterSpacing: '-0.01em',
        boxShadow: '0 2px 8px rgba(47,111,237,0.35)',
        display: 'inline-block',
        alignSelf: 'flex-start',
      }}>
        {price} €
      </span>
    </div>
  );
};

export default CustomerProductCard;
