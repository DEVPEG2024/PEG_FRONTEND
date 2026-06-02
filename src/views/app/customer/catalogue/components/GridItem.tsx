import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
import { TbArrowRight } from 'react-icons/tb';
import { pickCategoryIcon, pickCategoryTagline } from '@/utils/categoryIcon';

// Palette dorée
const GOLD = '#d4af37';
const GOLD_TITLE = '#ecd9a8';
const GOLD_MUTED = 'rgba(212,175,55,0.75)';

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
      cardRef.current.style.borderColor = 'rgba(212,175,55,0.5)';
    }
    if (imgRef.current) imgRef.current.style.transform = 'scale(1.06)';
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.borderColor = 'rgba(255,255,255,0.08)';
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
        borderRadius: '14px',
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '3 / 4',
        background: '#0c0d10',
        border: '1px solid rgba(255,255,255,0.08)',
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
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transition: 'transform 0.5s ease',
          }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 30%, #1c2433 0%, #0c0d10 75%)',
        }} />
      )}

      {/* Dégradé sombre pour la lisibilité */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.85) 22%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.1) 78%, rgba(0,0,0,0.25) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Contenu en bas */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '0 22px 22px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>
        {/* Icône dorée */}
        <Icon size={30} color={GOLD} strokeWidth={1.6} style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }} />

        {/* Titre */}
        <p style={{
          color: GOLD_TITLE,
          fontWeight: 700,
          fontSize: '17px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          margin: 0,
          lineHeight: 1.2,
          textShadow: '0 1px 6px rgba(0,0,0,0.6)',
        }}>
          {name}
        </p>

        {/* Slogan */}
        {tagline && (
          <p style={{
            color: GOLD_MUTED,
            fontSize: '12.5px',
            fontWeight: 400,
            margin: 0,
            lineHeight: 1.35,
          }}>
            {tagline}
          </p>
        )}

        {/* Bouton flèche doré */}
        <div style={{
          marginTop: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '36px', height: '36px',
          borderRadius: '50%',
          border: `1.5px solid ${GOLD}`,
          background: 'rgba(212,175,55,0.08)',
        }}>
          <TbArrowRight size={18} color={GOLD} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};

export default GridItem;
