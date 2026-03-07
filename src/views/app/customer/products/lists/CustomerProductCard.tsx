import { useRef } from 'react';
import { getProductBasePrice } from '@/utils/productHelpers';
import { useNavigate } from 'react-router-dom';
import { Product } from '@/@types/product';
import { HiArrowRight } from 'react-icons/hi';

const getShortSentence = (desc: string): string => {
  const text = desc.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const match = text.match(/^.{10,}?[.!?]/);
  const sentence = match ? match[0].trim() : text;
  if (sentence.length <= 80) return sentence;
  return sentence.slice(0, 80).replace(/\s+\S*$/, '') + '…';
};

const CustomerProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const imageUrl = product.images[0]?.url;
  const shortDesc = product.description ? getShortSentence(product.description) : null;
  const price = getProductBasePrice(product).toFixed(2);
  const initial = product.name.charAt(0).toUpperCase();

  const handleMouseEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-6px)';
      cardRef.current.style.boxShadow = '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(47,111,237,0.25)';
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1.07)';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)';
    }
    if (imgRef.current) {
      imgRef.current.style.transform = 'scale(1)';
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/customer/product/${product.documentId}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '18px',
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Image full-bleed */}
      <div style={{ position: 'relative', height: '200px', flexShrink: 0, overflow: 'hidden', background: '#0a1525' }}>
        {imageUrl ? (
          <img
            ref={imgRef}
            src={imageUrl}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.35s ease',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 30%, rgba(47,111,237,0.18) 0%, transparent 70%)',
          }}>
            <span style={{
              fontSize: '56px',
              fontWeight: 800,
              color: 'rgba(47,111,237,0.35)',
              letterSpacing: '-0.04em',
              userSelect: 'none',
            }}>
              {initial}
            </span>
          </div>
        )}

        {/* Bottom gradient fade */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(to top, rgba(11,21,38,0.92) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Category badge */}
        {product.productCategory?.name && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '100px',
            padding: '3px 10px',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {product.productCategory.name}
          </div>
        )}

        {/* Ref badge */}
        {product.refVisibleToCustomer && product.productRef && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(47,111,237,0.85)',
            backdropFilter: 'blur(8px)',
            borderRadius: '100px',
            padding: '3px 10px',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}>
            {product.productRef}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {/* Name */}
        <p style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '-0.01em',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: 0,
        }}>
          {product.name}
        </p>

        {/* Short description */}
        {shortDesc && (
          <p style={{
            color: 'rgba(255,255,255,0.38)',
            fontSize: '11px',
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            margin: 0,
          }}>
            {shortDesc}
          </p>
        )}

        {/* Sizes */}
        {product.sizes?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {product.sizes.slice(0, 5).map((s) => (
              <span key={s.documentId} style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                padding: '2px 7px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '10px',
                fontWeight: 600,
              }}>
                {s.value || s.name}
              </span>
            ))}
            {product.sizes.length > 5 && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', alignSelf: 'center' }}>
                +{product.sizes.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Colors */}
        {product.colors?.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {product.colors.slice(0, 8).map((c) => (
              <div
                key={c.documentId}
                title={c.name}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: c.value || '#aaa',
                  border: '1.5px solid rgba(255,255,255,0.2)',
                  flexShrink: 0,
                }}
              />
            ))}
            {product.colors.length > 8 && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', alignSelf: 'center' }}>
                +{product.colors.length - 8}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Price + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: '20px',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            {price} <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>€</span>
          </span>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            borderRadius: '10px',
            padding: '7px 13px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
          }}>
            Commander
            <HiArrowRight size={13} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProductCard;
