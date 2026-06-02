import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
import { TbArrowRight } from 'react-icons/tb';
import { pickCategoryIcon, pickCategoryColor } from '@/utils/categoryIcon';

// Convertit un hex (#rrggbb) en rgba avec alpha
const rgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const Icon = pickCategoryIcon(name);
  const color = pickCategoryColor(name);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-4px)';
      cardRef.current.style.borderColor = rgba(color, 0.5);
    }
    if (glowRef.current) {
      glowRef.current.style.opacity = '1';
      glowRef.current.style.boxShadow = `0 0 24px 3px ${rgba(color, 0.8)}`;
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.borderColor = 'rgba(255,255,255,0.07)';
    }
    if (glowRef.current) {
      glowRef.current.style.opacity = '0.85';
      glowRef.current.style.boxShadow = `0 0 14px 1px ${rgba(color, 0.6)}`;
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '18px',
        padding: '38px 20px 30px',
        minHeight: '230px',
        borderRadius: '18px',
        cursor: 'pointer',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #131c2b 0%, #0c1320 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
        transition: 'transform 0.25s ease, border-color 0.25s ease',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Halo coloré diffus en haut */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '140px',
        height: '120px',
        background: `radial-gradient(circle, ${rgba(color, 0.18)} 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Icône néon */}
      <Icon
        size={56}
        color={color}
        strokeWidth={1.6}
        style={{ filter: `drop-shadow(0 0 8px ${rgba(color, 0.55)})`, zIndex: 1 }}
      />

      {/* Nom */}
      <p style={{
        color: '#eaf0f7',
        fontWeight: 600,
        fontSize: '16px',
        letterSpacing: '-0.01em',
        margin: 0,
        lineHeight: 1.3,
        zIndex: 1,
      }}>
        {name}
      </p>

      {/* Bouton flèche */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '46px',
        height: '30px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 1,
      }}>
        <TbArrowRight size={18} color="#eaf0f7" strokeWidth={2} />
      </div>

      {/* Liseré lumineux en bas (couleur de la catégorie) */}
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          bottom: '0',
          left: '18%',
          right: '18%',
          height: '2px',
          borderRadius: '999px',
          background: color,
          opacity: 0.85,
          boxShadow: `0 0 14px 1px ${rgba(color, 0.6)}`,
          transition: 'opacity 0.25s ease, box-shadow 0.25s ease',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default GridItem;
