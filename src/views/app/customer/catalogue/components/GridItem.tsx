import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
import { pickCategoryIcon, pickCategoryTagline } from '@/utils/categoryIcon';

// Accent violet
const PURPLE = '#8b5cf6';

// Format du cadre = format des visuels catégorie (portrait 4:5).
const FRAME_RATIO = 4 / 5;
// Une photo PRESQUE au format (Print, Conception graphique : 0,88 au lieu de
// 0,80) remplit le cadre : ~5 % rognés par côté, logo PEG intact, plus de
// bande. Au-delà (photo carrée…), elle reste entière sur fond flouté.
const COVER_TOLERANCE = 0.12;

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name, image } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = pickCategoryIcon(name);
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!w || !h) return;
    setFit(Math.abs(w / h / FRAME_RATIO - 1) <= COVER_TOLERANCE ? 'cover' : 'contain');
  };
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
      {/* Photo au-dessus du texte, cadre portrait 4:5. Au format (ou presque) :
          elle remplit le cadre. Format très différent : entière, bords comblés
          par une copie floutée d'elle-même plutôt que par des bandes unies. */}
      <div style={{
        position: 'relative', aspectRatio: '4 / 5', overflow: 'hidden',
        background: 'radial-gradient(circle at 30% 30%, #1c1830 0%, #0c0d10 75%)',
      }}>
        {image?.url && fit === 'contain' && (
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
            onLoad={handleImageLoad}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: fit, display: 'block',
            }}
          />
        )}
      </div>

      {/* Contenu sous la photo */}
      <div className="peg-cat-card-body" style={{
        padding: '12px 16px 16px',
        display: 'flex', flexDirection: 'column', gap: '6px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Icône à côté du nom, jamais sur la photo (elle masquait le logo) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="peg-cat-card-icon" style={{
            width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(139,92,246,0.16)',
            border: '1px solid rgba(139,92,246,0.35)',
          }}>
            <Icon size={16} color={PURPLE} strokeWidth={1.7} />
          </div>
          <p className="peg-cat-card-name" style={{
            color: '#fff', fontWeight: 700, fontSize: '15px',
            letterSpacing: '0.02em', textTransform: 'uppercase',
            margin: 0, lineHeight: 1.2,
          }}>
            {name}
          </p>
        </div>

        {tagline && (
          <p className="peg-cat-card-tagline" style={{
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
