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
      cardRef.current.style.transform = 'translateY(-6px)';
      cardRef.current.style.boxShadow = '0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(47,111,237,0.3)';
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1.08)';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.boxShadow = '0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)';
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
        borderRadius: '18px',
        overflow: 'hidden',
        cursor: 'pointer',
        height: '220px',
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
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
            transition: 'transform 0.4s ease',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 30%, rgba(47,111,237,0.2) 0%, transparent 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: '64px',
            fontWeight: 800,
            color: 'rgba(47,111,237,0.3)',
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}>
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(5,15,30,0.92) 0%, rgba(5,15,30,0.3) 50%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Top-right product count badge */}
      {count > 0 && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '100px',
          padding: '3px 10px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '11px',
          fontWeight: 600,
        }}>
          {count} produit{count > 1 ? 's' : ''}
        </div>
      )}

      {/* Bottom content */}
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
          textShadow: '0 1px 6px rgba(0,0,0,0.6)',
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
