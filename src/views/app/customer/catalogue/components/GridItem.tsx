import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name, image, products } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-6px) scale(1.02)';
      cardRef.current.style.boxShadow = '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1.1)';
    }
    if (glassRef.current) {
      glassRef.current.style.background = 'rgba(255,255,255,0.12)';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0) scale(1)';
      cardRef.current.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)';
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
    }
    if (glassRef.current) {
      glassRef.current.style.background = 'rgba(255,255,255,0.06)';
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
        background: 'rgba(255,255,255,0.04)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        fontFamily: 'Inter, sans-serif',
        flexShrink: 0,
      }}
    >
      {/* Background image */}
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
          background: 'radial-gradient(ellipse at 50% 30%, rgba(47,111,237,0.15) 0%, transparent 70%)',
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

      {/* Glass overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(10,20,40,0.85) 0%, rgba(10,20,40,0.2) 55%, transparent 100%)',
        pointerEvents: 'none',
      }} />

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

      {/* Bottom glass panel */}
      <div
        ref={glassRef}
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '14px 16px',
          transition: 'background 0.3s ease',
        }}
      >
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
          color: 'rgba(255,255,255,0.5)',
          fontSize: '12px',
          margin: '5px 0 0',
          fontWeight: 500,
          letterSpacing: '0.01em',
        }}>
          Voir les produits →
        </p>
      </div>
    </div>
  );
};

export default GridItem;
