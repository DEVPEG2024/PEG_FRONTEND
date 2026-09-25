import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HiChevronLeft, HiChevronRight, HiX } from 'react-icons/hi';
import type { CampaignImage, CampaignTag } from '@/@types/campaign';
import { TAG_META, parseMessage } from '@/utils/campaignFormat';

/**
 * Contenu d'une campagne : photos (couverture + miniatures, agrandissables),
 * type, titre, message, bouton d'action. Même rendu dans la pop-up client, la
 * page Actualités et l'aperçu de l'éditeur admin.
 */

export type CampaignContentData = {
  title: string;
  message: string;
  tag: CampaignTag;
  images: CampaignImage[];
  ctaLabel: string;
  ctaUrl: string;
};

export const CampaignMessage = ({ text, fontSize = 14 }: { text: string; fontSize?: number }) => (
  <div style={{ color: 'rgba(226,232,240,0.88)', fontSize: `${fontSize}px`, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
    {parseMessage(text).map((tokens, i) => (
      <p key={i} style={{ margin: '0 0 10px', whiteSpace: 'pre-line' }}>
        {tokens.map((t, j) =>
          t.type === 'bold' ? (
            <strong key={j} style={{ color: '#fff' }}>{t.value}</strong>
          ) : t.type === 'link' ? (
            <a key={j} href={t.value} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', textDecoration: 'underline' }}>
              {t.value}
            </a>
          ) : (
            <span key={j}>{t.value}</span>
          ),
        )}
      </p>
    ))}
  </div>
);

export const TagChip = ({ tag }: { tag: CampaignTag }) => {
  const meta = TAG_META[tag] || TAG_META.info;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color,
        borderRadius: '100px', padding: '2px 10px', fontSize: '11px', fontWeight: 700,
        letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden>{meta.emoji}</span> {meta.label}
    </span>
  );
};

/** Visionneuse plein écran (Échap / flèches du clavier). */
const Lightbox = ({ images, index, onClose, onIndex }: { images: CampaignImage[]; index: number; onClose: () => void; onIndex: (i: number) => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onIndex]);

  const arrow = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute', top: '50%', ...(side === 'left' ? { left: '12px' } : { right: '12px' }), transform: 'translateY(-50%)',
    width: '44px', height: '44px', borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo agrandie"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10060, background: 'rgba(3,7,18,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 16px',
      }}
    >
      <img
        src={images[index].url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
      />
      <button type="button" aria-label="Fermer" onClick={onClose} style={{ ...arrow('right'), top: 'calc(env(safe-area-inset-top, 0px) + 32px)', transform: 'none' }}>
        <HiX size={22} />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" aria-label="Photo précédente" style={arrow('left')} onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + images.length) % images.length); }}>
            <HiChevronLeft size={24} />
          </button>
          <button type="button" aria-label="Photo suivante" style={arrow('right')} onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % images.length); }}>
            <HiChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
};

type Props = {
  campaign: CampaignContentData;
  dateLabel?: string;
  onCta?: () => void;
  /** Hauteur maximale de la photo principale. */
  coverMaxHeight?: number;
  titleSize?: number;
  /**
   * Entrée animée (pop-up) : la photo se pose, puis type, titre, texte et bouton
   * arrivent l'un après l'autre à partir de ce délai (s). Absent = rendu statique.
   */
  entranceDelay?: number | null;
};

// Apparition d'un élément du contenu, décalée de `i` crans.
const rise = (base: number | null | undefined, i: number) =>
  base == null
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: base + 0.1 + i * 0.08, duration: 0.38, ease: [0.16, 1, 0.3, 1] as const },
      };

const CampaignContent = ({ campaign, dateLabel, onCta, coverMaxHeight = 320, titleSize = 20, entranceDelay = null }: Props) => {
  const animated = entranceDelay != null;
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const images = campaign.images || [];
  const meta = TAG_META[campaign.tag] || TAG_META.info;
  const current = images[Math.min(active, images.length - 1)];

  useEffect(() => { setActive(0); }, [images.length]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {current && (
        <button
          type="button"
          onClick={() => setZoom(Math.min(active, images.length - 1))}
          aria-label="Agrandir la photo"
          style={{
            display: 'block', width: '100%', padding: 0, border: 'none', cursor: 'zoom-in',
            // Photo entière (jamais rognée : logos, textes imprimés) sur fond flouté.
            position: 'relative', overflow: 'hidden', background: '#0b1422',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: '-20px', backgroundImage: `url("${current.url}")`,
              backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(18px) brightness(0.55)',
            }}
          />
          <motion.img
            src={current.url}
            alt=""
            {...(animated
              ? { initial: { scale: 1.12, opacity: 0.35 }, animate: { scale: 1, opacity: 1 }, transition: { delay: entranceDelay as number, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }
              : {})}
            style={{ position: 'relative', display: 'block', width: '100%', maxHeight: `${coverMaxHeight}px`, objectFit: 'contain' }}
          />
        </button>
      )}

      {images.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', padding: '8px 16px 0', overflowX: 'auto' }}>
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Photo ${i + 1}`}
              style={{
                flex: '0 0 auto', width: '56px', height: '42px', padding: 0, borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                border: `2px solid ${i === active ? meta.color : 'transparent'}`, background: '#0b1422',
              }}
            >
              <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '16px 18px 18px' }}>
        <motion.div {...rise(entranceDelay, 0)} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <TagChip tag={campaign.tag} />
          {dateLabel && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{dateLabel}</span>}
        </motion.div>
        <motion.h2 {...rise(entranceDelay, 1)} style={{ color: '#fff', fontSize: `${titleSize}px`, fontWeight: 700, lineHeight: 1.3, margin: '0 0 10px', overflowWrap: 'anywhere' }}>
          {campaign.title || 'Titre de la campagne'}
        </motion.h2>
        {campaign.message ? (
          <motion.div {...rise(entranceDelay, 2)}>
            <CampaignMessage text={campaign.message} />
          </motion.div>
        ) : null}
        {campaign.ctaLabel && campaign.ctaUrl && (
          <motion.button
            type="button"
            onClick={onCta}
            {...(animated
              ? {
                  // Arrive en dernier, puis une légère pulsation attire l'œil.
                  initial: { opacity: 0, y: 12, scale: 1 },
                  animate: { opacity: 1, y: 0, scale: [1, 1.045, 1] },
                  transition: {
                    opacity: { delay: (entranceDelay as number) + 0.34, duration: 0.35 },
                    y: { delay: (entranceDelay as number) + 0.34, duration: 0.38, ease: [0.16, 1, 0.3, 1] },
                    scale: { delay: (entranceDelay as number) + 0.95, duration: 0.6, ease: 'easeInOut' },
                  },
                }
              : {})}
            style={{
              marginTop: '6px', width: '100%', border: 'none', borderRadius: '10px', padding: '12px 16px',
              background: meta.color, color: '#0b1220', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {campaign.ctaLabel}
          </motion.button>
        )}
      </div>

      {zoom !== null && images[zoom] && <Lightbox images={images} index={zoom} onClose={() => setZoom(null)} onIndex={setZoom} />}
    </div>
  );
};

export default CampaignContent;
