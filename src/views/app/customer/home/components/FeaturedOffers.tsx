/**
 * Accueil client (ordinateur et tablette) — « Votre offre à la une » : les
 * offres personnalisées du client en grand, une à la fois, avec flèches et
 * points. Passe par le carrousel partagé (glissable au doigt sur iPad).
 */
import { useState } from 'react';
import type { EmblaCarouselType } from 'embla-carousel';
import { HiArrowRight, HiChevronLeft, HiChevronRight, HiOutlineShoppingCart } from 'react-icons/hi';
import Carousel from '@/components/shared/Carousel';
import type { OfferShowcaseItem } from '../offerShowcase';
import { OfferBadge, OfferSteps, OfferVisual, SavingsSticker } from './OfferVisuals';

const ACCENT = '#6d5dfc';

const arrowStyle: React.CSSProperties = {
  width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
  border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.04)', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

type Props = {
  offers: OfferShowcaseItem[];
  onOpen: (documentId: string) => void;
  onSeeAll: () => void;
};

const FeaturedOffers = ({ offers, onOpen, onSeeAll }: Props) => {
  const [api, setApi] = useState<EmblaCarouselType>();
  const many = offers.length > 1;

  return (
    <Carousel
      label="Vos offres personnalisées"
      loop={many}
      gap={20}
      slideStyle={{ width: '100%' }}
      style={{ borderRadius: '26px' }}
      setApi={setApi}
    >
      {offers.map((o, index) => (
        <article
          key={o.documentId}
          aria-label={`Offre ${index + 1} sur ${offers.length} : ${o.name}`}
          style={{
            height: '100%', display: 'flex', flexWrap: 'wrap', overflow: 'hidden',
            background: '#141a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '26px',
          }}
        >
          <button
            type="button"
            onClick={() => onOpen(o.documentId)}
            aria-label={`Voir la fiche : ${o.name}`}
            style={{ flex: '1 1 300px', minHeight: '380px', padding: 0, border: 0, cursor: 'pointer', display: 'flex' }}
          >
            <OfferVisual offer={o} sizes="(min-width: 1200px) 560px, 50vw" padding="12%" style={{ flex: 1 }}>
              {o.savings && <SavingsSticker percent={o.savings} size={96} style={{ top: '22px', left: '22px' }} />}
              <OfferBadge icon style={{ top: '24px', right: '22px', fontSize: '12px', padding: '8px 13px' }}>Prix réservé</OfferBadge>
              {o.isNew && <OfferBadge tone="light" style={{ bottom: '22px', left: '22px', fontWeight: 800 }}>Nouvelle offre</OfferBadge>}
            </OfferVisual>
          </button>

          <div style={{ flex: '1 1 300px', minWidth: 0, boxSizing: 'border-box', padding: '28px 30px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)' }}>
                {many ? `Votre offre · ${index + 1} / ${offers.length}` : 'Votre offre'}
              </span>
              {many && (
                <span style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" aria-label="Offre précédente" onClick={() => api?.scrollPrev()} style={arrowStyle}>
                    <HiChevronLeft size={18} />
                  </button>
                  <button type="button" aria-label="Offre suivante" onClick={() => api?.scrollNext()} style={arrowStyle}>
                    <HiChevronRight size={18} />
                  </button>
                </span>
              )}
            </div>

            <div>
              {o.category && (
                <span style={{ display: 'block', marginBottom: '6px', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a99bff' }}>
                  {o.category.name}
                </span>
              )}
              <h2 style={{ margin: 0, color: '#fff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12 }}>{o.name}</h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: '10px', rowGap: '4px' }}>
              <span style={{ color: '#fff', fontSize: '42px', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1 }}>{o.price}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.66)' }}>{o.unit}</span>
              {o.catalogue && (
                <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.6)' }}>
                  au lieu de <s>{o.catalogue}</s>
                </span>
              )}
            </div>

            {o.steps.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '14px 16px 12px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '12.5px', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>
                  Plus vous en prenez, moins c'est cher
                </p>
                <OfferSteps steps={o.steps} height={136} />
              </div>
            )}
            {o.steps.length === 0 && o.note && (
              <p style={{ margin: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '16px', fontSize: '13.5px', lineHeight: 1.5, color: 'rgba(255,255,255,0.75)' }}>
                {o.note}
              </p>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
              <span style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => onOpen(o.documentId)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', height: '48px', padding: '0 22px', border: 0, borderRadius: '14px', background: ACCENT, color: '#fff', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 26px rgba(79,63,209,0.35)' }}
                >
                  <HiOutlineShoppingCart size={18} /> Commander
                </button>
                <button
                  type="button"
                  onClick={onSeeAll}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '48px', padding: '0 18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#fff', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Toutes mes offres <HiArrowRight size={15} />
                </button>
              </span>
              {many && (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {offers.map((d, k) => (
                    <button
                      key={d.documentId}
                      type="button"
                      aria-label={`Afficher l'offre ${k + 1}`}
                      aria-current={k === index ? 'true' : undefined}
                      onClick={() => api?.scrollTo(k)}
                      style={{ height: '28px', padding: '0 3px', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <span style={{ display: 'block', width: k === index ? '26px' : '8px', height: '8px', borderRadius: '999px', background: k === index ? '#a99bff' : 'rgba(255,255,255,0.28)' }} />
                    </button>
                  ))}
                </span>
              )}
            </div>
          </div>
        </article>
      ))}
    </Carousel>
  );
};

export default FeaturedOffers;
