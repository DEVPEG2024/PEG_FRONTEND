import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';
import { pickCategoryIcon } from '@/utils/categoryIcon';

const SubCategoryCard = ({ data }: { data: ProductCategory }) => {
  const { name, image } = data;
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const Icon = pickCategoryIcon(name);
  const count = data.products?.length ?? 0;

  const onEnter = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(-4px)';
      cardRef.current.style.borderColor = 'rgba(124,107,255,0.55)';
      cardRef.current.style.boxShadow = '0 18px 44px rgba(79,63,209,0.30)';
    }
    if (imgRef.current) imgRef.current.style.transform = 'scale(1.06)';
  };
  const onLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'translateY(0)';
      cardRef.current.style.borderColor = 'rgba(255,255,255,0.08)';
      cardRef.current.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
    }
    if (imgRef.current) imgRef.current.style.transform = 'scale(1)';
  };

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/customer/catalogue/categories/${data.documentId}`)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        flex: '0 0 auto', width: '230px', scrollSnapAlign: 'start',
        position: 'relative', borderRadius: '18px', overflow: 'hidden', cursor: 'pointer',
        background: 'linear-gradient(165deg, #161a2e 0%, #0e1120 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Zone image */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image?.url ? (
          <img
            ref={imgRef}
            src={image.url}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 35%, #20243f 0%, #0e1120 75%)' }} />
        )}
        {/* léger voile bas pour fondre avec le pied de carte */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(14,17,32,0.85) 100%)', pointerEvents: 'none' }} />

        {/* Pastille icône */}
        <div style={{
          position: 'absolute', top: '14px', left: '14px',
          width: '40px', height: '40px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #6d5dfc, #4f3fd1)',
          boxShadow: '0 6px 16px rgba(79,63,209,0.45)',
        }}>
          <Icon size={20} color="#fff" strokeWidth={1.8} />
        </div>
      </div>

      {/* Pied : nom + compteur */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '14px 16px 16px' }}>
        <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </span>
        <span style={{
          flexShrink: 0, minWidth: '30px', textAlign: 'center',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', padding: '3px 9px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 700,
        }}>
          {count}
        </span>
      </div>
    </div>
  );
};

export default SubCategoryCard;
