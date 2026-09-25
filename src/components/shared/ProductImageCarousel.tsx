import { useCallback, useRef, useState } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import type { EmblaCarouselType } from 'embla-carousel';
import Carousel from '@/components/shared/Carousel';

type CarouselImage = { url: string; name?: string };

type ProductImageCarouselProps = {
  images: CarouselImage[];
  alt?: string;
  /** Hauteur max de l'image principale (px) */
  maxImageHeight?: number;
  /** Effet loupe au survol de l'image principale */
  zoomOnHover?: boolean;
  /** Facteur de grossissement de la loupe */
  zoomFactor?: number;
  /** Diamètre de la loupe (px) */
  lensSize?: number;
};

type LensState = { url: string; x: number; y: number; imgW: number; imgH: number; offsetX: number; offsetY: number };

/**
 * Carrousel d'images produit : glisser au doigt (l'image suit le doigt), flèches,
 * vignettes, clavier, loupe au survol (souris). La piste est le composant
 * partagé `Carousel` ; le glisser n'est actif qu'au doigt pour que la souris
 * garde la loupe. Le champ `images` est déjà un tableau côté Strapi.
 */
const ProductImageCarousel = ({
  images,
  alt = '',
  maxImageHeight = 220,
  zoomOnHover = true,
  zoomFactor = 2.5,
  lensSize = 150,
}: ProductImageCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [lens, setLens] = useState<LensState | null>(null);
  const [api, setApi] = useState<EmblaCarouselType>();
  const isTouch = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const count = images?.length ?? 0;
  // Nouvelle liste d'images (autre produit) → la piste repart de la première
  const imagesKey = (images ?? []).map((img) => img.url).join('|');

  const onSelect = useCallback((i: number) => {
    setIndex(i);
    setLens(null);
  }, []);

  if (count === 0) {
    return <div style={{ fontSize: '48px', opacity: 0.15 }}>📦</div>;
  }

  const go = (dir: 1 | -1) => {
    setLens(null);
    if (!api) return;
    if (dir === 1) {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    } else if (api.canScrollPrev()) api.scrollPrev();
    else api.scrollTo(count - 1);
  };

  // Loupe : position du curseur dans l'image + décalage de l'image dans le cadre
  const onImageMove = (e: React.MouseEvent<HTMLImageElement>, url: string) => {
    if (!zoomOnHover || isTouch.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    const imgRect = e.currentTarget.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    setLens({
      url,
      x: e.clientX - imgRect.left,
      y: e.clientY - imgRect.top,
      imgW: imgRect.width,
      imgH: imgRect.height,
      offsetX: imgRect.left - stageRect.left,
      offsetY: imgRect.top - stageRect.top,
    });
  };

  const current = images[Math.min(index, count - 1)];

  return (
    <div
      style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
    >
      {/* Image principale + flèches (la loupe déborde du cadre : hors de la piste) */}
      <div
        ref={stageRef}
        style={{ position: 'relative', width: '100%' }}
        onTouchStart={() => {
          isTouch.current = true;
          setLens(null);
        }}
      >
        <Carousel
          key={imagesKey}
          label={alt ? `Photos — ${alt}` : 'Photos du produit'}
          loop={count > 1}
          gap={0}
          touchOnlyDrag
          slideStyle={{ width: '100%' }}
          onSelect={onSelect}
          setApi={setApi}
        >
          {images.map((img, i) => (
            <div
              key={img.url + i}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: `${maxImageHeight}px` }}
            >
              <img
                src={img.url}
                alt={img.name || alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onMouseMove={(e) => onImageMove(e, img.url)}
                onMouseLeave={() => setLens(null)}
                draggable={false}
                style={{
                  maxWidth: '100%',
                  maxHeight: `${maxImageHeight}px`,
                  objectFit: 'contain',
                  borderRadius: '6px',
                  cursor: zoomOnHover ? 'zoom-in' : 'default',
                }}
              />
            </div>
          ))}
        </Carousel>

        {/* Loupe */}
        {lens && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 5,
              left: `${lens.offsetX + lens.x - lensSize / 2}px`,
              top: `${lens.offsetY + lens.y - lensSize / 2}px`,
              width: `${lensSize}px`,
              height: `${lensSize}px`,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.28)',
              background: `#fff url("${lens.url}") no-repeat`,
              backgroundSize: `${lens.imgW * zoomFactor}px ${lens.imgH * zoomFactor}px`,
              backgroundPosition: `${lensSize / 2 - lens.x * zoomFactor}px ${lensSize / 2 - lens.y * zoomFactor}px`,
            }}
          />
        )}

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
            <div
              aria-live="polite"
              aria-label={current?.name ? `Image ${index + 1} sur ${count} : ${current.name}` : undefined}
              style={{ position: 'absolute', bottom: '6px', right: '8px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '10px' }}
            >
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
              onClick={() => {
                setLens(null);
                api?.scrollTo(i);
              }}
              aria-label={`Voir image ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
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
    </div>
  );
};

const arrowStyle = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute',
  [side]: '4px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
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
