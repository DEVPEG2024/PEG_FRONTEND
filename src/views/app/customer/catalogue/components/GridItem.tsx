import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name, image, products } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-6px) scale(1.02)';
      cardRef.current.style.boxShadow = '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)';
      cardRef.current.style.background = 'rgba(255,255,255,0.1)';
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1.08)';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0) scale(1)';
      cardRef.current.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08)';
      cardRef.current.style.background = 'rgba(255,255,255,0.06)';
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
    }
  };

  const count = products?.length ?? 0;

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/customer/catalogue/categories/${data.documentId}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        height: '230px',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease',
        fontFamily: 'Inter, sans-serif',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image zone */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 20px 10px',
      }}>
        {image?.url ? (
          <img
            ref={imgRef}
            src={image.url}
            alt={name}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              transition: 'transform 0.4s ease',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
            }}
          />
        ) : (
          <span style={{
            fontSize: '64px',
            fontWeight: 800,
            color: 'rgba(47,111,237,0.25)',
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}>
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Top-right glass badge */}
      {count > 0 && (
        <div style={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '100px',
          padding: '4px 12px',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}>
          {count} produit{count > 1 ? 's' : ''}
        </div>
      )}

      {/* Bottom text */}
      <div style={{
        padding: '0 18px 16px',
      }}>
        <p style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '15px',
          letterSpacing: '-0.01em',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {name}
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '12px',
          margin: '4px 0 0',
          fontWeight: 500,
        }}>
          Voir les produits →
        </p>
      </div>
    </div>
  );
};

export default GridItem;
