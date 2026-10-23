/**
 * Accueil client (ordinateur et tablette) — « Vos offres personnalisées » en
 * cartes colorées, filtrables par catégorie quand il y en a plusieurs.
 */
import { useState } from 'react';
import { HiArrowRight } from 'react-icons/hi';
import { HOME_OFFERS, offerCategories, type OfferShowcaseItem } from '../offerShowcase';
import { OfferCornerBadges, OfferVisual, SavingsSticker } from './OfferVisuals';

type Props = {
  offers: OfferShowcaseItem[];
  /** Nombre total d'offres du client (offers n'en porte que la première page) */
  total: number;
  customerName: string;
  onOpen: (documentId: string) => void;
  onSeeAll: () => void;
};

const OffersGrid = ({ offers, total, customerName, onOpen, onSeeAll }: Props) => {
  const [category, setCategory] = useState<string>('all');
  const categories = offerCategories(offers);
  const active = categories.some((c) => c.id === category) ? category : 'all';
  const shown = (active === 'all' ? offers : offers.filter((o) => o.category?.id === active)).slice(0, HOME_OFFERS);
  const chips = categories.length > 0 ? [{ id: 'all', name: 'Tout', count: offers.length }, ...categories] : [];

  return (
    <section aria-labelledby="pco-offers-title" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '14px' }}>
        <div>
          <h2 id="pco-offers-title" style={{ margin: 0, color: '#fff', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Vos offres personnalisées
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.66)' }}>
            {total > 1 ? `${total} offres préparées pour ${customerName}` : `Une offre préparée pour ${customerName}`}
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          {chips.map((c) => {
            const on = c.id === active;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(c.id)}
                style={{
                  height: '40px', padding: '0 15px', borderRadius: '999px', cursor: 'pointer',
                  border: `1px solid ${on ? '#6d5dfc' : 'rgba(255,255,255,0.14)'}`,
                  background: on ? '#6d5dfc' : 'rgba(255,255,255,0.05)', color: '#fff',
                  fontSize: '13.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '7px',
                }}
              >
                {c.name}
                <span style={{ fontSize: '12px', fontWeight: 700, color: on ? '#fff' : 'rgba(255,255,255,0.6)' }}>{c.count}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onSeeAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 6px 0 10px', border: 0, background: 'transparent', color: '#a99bff', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }}
          >
            {total > shown.length ? `Voir les ${total} offres` : 'Ouvrir Mes offres'} <HiArrowRight size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: '18px' }}>
        {shown.map((o) => (
          <button
            key={o.documentId}
            type="button"
            className="pco-lift"
            onClick={() => onOpen(o.documentId)}
            style={{
              display: 'flex', flexDirection: 'column', padding: 0, textAlign: 'left', cursor: 'pointer', overflow: 'hidden',
              background: '#141a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '22px', color: '#fff',
            }}
          >
            <OfferVisual offer={o} sizes="280px" style={{ width: '100%', aspectRatio: '4 / 3' }}>
              {o.savings && <SavingsSticker percent={o.savings} size={62} caption={false} style={{ top: '12px', left: '12px' }} />}
              <OfferCornerBadges documentId={o.documentId} autoLabel={o.isNew ? 'Nouveau' : null} style={{ top: '14px', right: '14px' }} />
            </OfferVisual>
            <span style={{ flex: '1 1 auto', width: '100%', boxSizing: 'border-box', padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {o.category && (
                <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                  {o.category.name}
                </span>
              )}
              <span style={{ fontSize: '15.5px', fontWeight: 700, lineHeight: 1.3 }}>{o.name}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em' }}>{o.price}</span>
                <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.66)' }}>{o.unit}</span>
                {o.catalogue && <s style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)' }}>{o.catalogue}</s>}
              </span>
              <span style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 700, color: '#a99bff' }}>
                Commander <HiArrowRight size={16} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default OffersGrid;
