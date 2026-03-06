import { getProductBasePrice } from '@/utils/productHelpers';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/@types/product';
import { HiCheck, HiPhotograph } from 'react-icons/hi';

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #16263d 0%, #0f1c2e 100%)',
  borderRadius: '16px',
  padding: '28px',
  fontFamily: 'Inter, sans-serif',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  gap: '0',
};

const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #2f6fed 0%, #1f4bb6 100%)',
  borderRadius: '12px',
  width: '100%',
  padding: '13px',
  color: '#fff',
  fontWeight: 600,
  fontSize: '15px',
  border: 'none',
  cursor: 'pointer',
  letterSpacing: '0.01em',
};

const badgeStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #2f6fed 0%, #1f4bb6 100%)',
  borderRadius: '24px',
  padding: '8px 28px',
  color: '#fff',
  fontWeight: 700,
  fontSize: '20px',
  display: 'inline-block',
};

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

  return (
    <div
      style={cardStyle}
      onClick={() => navigate(`/customer/product/${product.documentId}`)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Titre */}
      <h3 className="text-white font-semibold text-center leading-snug line-clamp-2 mb-4" style={{ fontSize: '16px' }}>
        {product.name}
      </h3>

      {/* Séparateur */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />

      {/* Image */}
      <div className="flex justify-center mb-5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{ height: '160px', width: '100%', objectFit: 'contain', borderRadius: '10px' }}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ height: '160px', width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }}
          >
            <HiPhotograph size={48} />
          </div>
        )}
      </div>

      {/* Badge prix */}
      <div className="flex justify-center mb-5">
        <span style={badgeStyle}>
          {getProductBasePrice(product).toFixed(2)} €
        </span>
      </div>

      {/* Caractéristiques */}
      {characteristics.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {characteristics.map((c, i) => (
            <div key={i} className="flex items-start gap-2">
              <HiCheck size={16} style={{ color: '#2f6fed', flexShrink: 0, marginTop: '2px' }} />
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.4' }}>{c}</span>
            </div>
          ))}
        </div>
      )}

      {/* Séparateur */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', marginBottom: '20px' }} />

      {/* CTA */}
      <button style={btnStyle} onClick={(e) => { e.stopPropagation(); navigate(`/customer/product/${product.documentId}`); }}>
        Voir l'offre
      </button>
    </div>
  );
};

export default CustomerProductCard;
