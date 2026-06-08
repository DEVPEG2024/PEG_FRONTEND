import { useEffect, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

type CarouselImage = { url: string; name?: string };

type ProductImageCarouselProps = {
  images: CarouselImage[];
  alt?: string;
  /** Hauteur max de l'image principale (px) */
  maxImageHeight?: number;
};

/**
 * Carrousel d'images produit : flèches, vignettes cliquables, swipe tactile, clavier.
 * Dépendances : aucune (React + react-icons). Le champ `images` est déjà un tableau côté Strapi.
 */
const ProductImageCarousel = ({ images, alt = '', maxImageHeight = 220 }: ProductImageCarouselProps) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const count = images?.length ?? 0;

  // Reste dans les bornes si la liste d'images change
  useEffect(() => {
    if (index > count - 1) setIndex(0);
  }, [count, index]);

  if (count === 0) {
    return <div style={{ fontSize: '48px', opacity: 0.15 }}>📦</div>;
  }

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const current = images[index];

  return (
    <div
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
    >
      {/* Image principale + flèches */}
      <div
        style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: `${maxImageHeight}px` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={current.url}
          src={current.url}
          alt={current.name || alt}
          style={{ maxWidth: '100%', maxHeight: `${maxImageHeight}px`, objectFit: 'contain', borderRadius: '6px', animation: 'pegCarouselFade 0.25s ease-out' }}
        />

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Image précédente"
              onClick={() => go(-1)}
              style={arrowStyle('left')}
            >
              <HiChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Image suivante"
              onClick={() => go(1)}
              style={arrowStyle('right')}
            >
              <HiChevronRight size={20} />
            </button>

            {/* Compteur */}
            <div style={{ position: 'absolute', bottom: '6px', right: '8px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px' }}>
              {index + 1}/{count}
            </div>
          </>
        )}
      </div>

      {/* Vignettes */}
      {count > 1 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {images.map((img, i) => (
            <button
              type="button"
              key={img.url + i}
              onClick={() => setIndex(i)}
              aria-label={`Voir image ${i + 1}`}
              style={{
                width: '44px', height: '44px', padding: '2px', cursor: 'pointer',
                borderRadius: '6px', background: '#fff',
                border: i === index ? '2px solid #2f6fed' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: i === index ? '0 0 0 2px rgba(47,111,237,0.2)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes pegCarouselFade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
};

const arrowStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute',
  [side]: '4px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.9)',
  color: '#1f4bb6',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
});

export default ProductImageCarousel;
