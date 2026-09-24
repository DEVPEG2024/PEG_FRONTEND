import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
import { pickCategoryIcon, pickCategoryTagline } from '@/utils/categoryIcon';

// Accent violet
const PURPLE = '#8b5cf6';

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name, image } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = pickCategoryIcon(name);
  const tagline = pickCategoryTagline(name);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-4px)';
      cardRef.current.style.borderColor = 'rgba(139,92,246,0.5)';
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.borderColor = 'rgba(255,255,255,0.07)';
    }
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
        display: 'flex',
        flexDirection: 'column',
        background: '#0c0d10',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        transition: 'transform 0.3s ease, border-color 0.3s ease',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Photo ENTIÈRE (contain, jamais rognée) au-dessus du texte. Cadre au
          format des visuels catégorie (portrait 4:5) ; si une photo a un autre
          format, les bords sont comblés par une copie floutée d'elle-même
          plutôt que par des bandes unies. */}
      <div style={{
        position: 'relative', aspectRatio: '4 / 5', overflow: 'hidden',
        background: 'radial-gradient(circle at 30% 30%, #1c1830 0%, #0c0d10 75%)',
      }}>
        {image?.url && (
          <img
            src={image.url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              filter: 'blur(22px) brightness(0.7)', transform: 'scale(1.2)',
            }}
          />
        )}
        {image?.url && (
          <img
            src={image.url}
            alt={name}
            loading="lazy"
            decoding="async"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'contain', display: 'block',
            }}
          />
        )}
      </div>

      {/* Pastille icône en haut à gauche */}
      <div style={{
        position: 'absolute', top: '10px', left: '10px',
        width: '34px', height: '34px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(12,13,16,0.55)',
        border: '1px solid rgba(139,92,246,0.45)',
        backdropFilter: 'blur(6px)',
      }}>
        <Icon size={17} color={PURPLE} strokeWidth={1.7} />
      </div>

      {/* Contenu sous la photo */}
      <div style={{
        padding: '12px 16px 16px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{
          color: '#fff', fontWeight: 700, fontSize: '15px',
          letterSpacing: '0.02em', textTransform: 'uppercase',
          margin: 0, lineHeight: 1.2,
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
      </div>
    </div>
  );
};

export default GridItem;
