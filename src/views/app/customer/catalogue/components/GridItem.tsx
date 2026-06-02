import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
import { TbArrowRight } from 'react-icons/tb';
import { pickCategoryIcon, pickCategoryTagline } from '@/utils/categoryIcon';

// Accent violet
const PURPLE = '#8b5cf6';
const PURPLE_TEXT = '#a78bfa';

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name, image } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const Icon = pickCategoryIcon(name);
  const tagline = pickCategoryTagline(name);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-4px)';
      cardRef.current.style.borderColor = 'rgba(139,92,246,0.5)';
    }
    if (imgRef.current) imgRef.current.style.transform = 'scale(1.06)';
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.borderColor = 'rgba(255,255,255,0.07)';
    }
    if (imgRef.current) imgRef.current.style.transform = 'scale(1)';
  };

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/customer/catalogue/categories/${data.documentId}`)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '3 / 2',
        background: '#0c0d10',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        transition: 'transform 0.3s ease, border-color 0.3s ease',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Photo de fond (ou fond dégradé si absente) */}
      {image?.url ? (
        <img
          ref={imgRef}
          src={image.url}
          alt={name}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 30% 30%, #1c1830 0%, #0c0d10 75%)',
        }} />
      )}

      {/* Dégradé sombre pour la lisibilité */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.6) 38%, rgba(0,0,0,0.12) 72%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Pastille icône en haut à gauche */}
      <div style={{
        position: 'absolute', top: '16px', left: '16px',
        width: '44px', height: '44px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(139,92,246,0.16)',
        border: '1px solid rgba(139,92,246,0.35)',
        backdropFilter: 'blur(6px)',
      }}>
        <Icon size={22} color={PURPLE} strokeWidth={1.7} />
      </div>

      {/* Contenu en bas */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '0 22px 20px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <p style={{
          color: '#fff', fontWeight: 700, fontSize: '17px',
          letterSpacing: '0.02em', textTransform: 'uppercase',
          margin: 0, lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.6)',
        }}>
          {name}
        </p>

        {tagline && (
          <p style={{
            color: 'rgba(255,255,255,0.6)', fontSize: '12.5px',
            fontWeight: 400, margin: 0, lineHeight: 1.35,
          }}>
            {tagline}
          </p>
        )}

        {/* Lien "Voir les produits" */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '50%',
            border: `1.5px solid ${PURPLE}`, background: 'rgba(139,92,246,0.1)',
          }}>
            <TbArrowRight size={15} color={PURPLE_TEXT} strokeWidth={2} />
          </div>
          <span style={{ color: PURPLE_TEXT, fontSize: '13px', fontWeight: 600 }}>
            Voir les produits
          </span>
        </div>
      </div>
    </div>
  );
};

export default GridItem;
