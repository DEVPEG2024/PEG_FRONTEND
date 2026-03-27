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
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1.08)';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0) scale(1)';
      cardRef.current.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08)';
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
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        fontFamily: 'Inter, sans-serif',
        flexShrink: 0,
      }}
    >
      {/* Image plein cadre */}
      {image?.url ? (
        <img
          ref={imgRef}
          src={image.url}
          alt={name}
          style={{
            position: 'absolute',
            inset: '-1px',
            width: 'calc(100% + 2px)',
            height: 'calc(100% + 2px)',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.5s ease',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: '64px',
            fontWeight: 800,
            color: 'rgba(47,111,237,0.25)',
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}>
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Dégradé bleu en bas pour lisibilité du titre */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(8,18,38,0.95) 0%, rgba(8,18,38,0.6) 35%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Badge nombre de produits */}
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

      {/* Titre en bas */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 18px',
      }}>
        <p style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '15px',
          letterSpacing: '-0.01em',
          margin: 0,
          lineHeight: 1.3,
          textShadow: '0 1px 6px rgba(0,0,0,0.5)',
        }}>
          {name}
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
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
