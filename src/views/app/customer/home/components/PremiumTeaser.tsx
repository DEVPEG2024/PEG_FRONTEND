/**
 * Accueil client Standard — à la place de ses offres (réservées au Premium,
 * décision du 24/09/2026) : ce que Premium lui ouvrirait. Mêmes avantages et
 * même tarif que la page Premium (PREMIUM_ADVANTAGES, PREMIUM_PRICE_HT).
 */
import { HiOutlineCheck, HiOutlineGift, HiOutlineLockClosed, HiOutlineStar, HiOutlineTag } from 'react-icons/hi';
import { PREMIUM_ADVANTAGES, PREMIUM_PRICE_HT } from '@/services/PremiumServices';
import { OFFER_ON_YELLOW, OFFER_YELLOW } from './OfferVisuals';

const card = (background: string, transform: string, compact: boolean) => ({
  position: 'absolute' as const,
  width: compact ? '104px' : '170px',
  height: compact ? '128px' : '210px',
  borderRadius: compact ? '18px' : '22px',
  background,
  transform,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(20,26,46,0.35)',
});

const PremiumTeaser = ({ onDiscover, compact = false }: { onDiscover: () => void; compact?: boolean }) => (
  <article
    aria-labelledby="pco-premium-title"
    style={{
      flex: '2 1 560px', minWidth: 0, display: 'flex', flexWrap: 'wrap', overflow: 'hidden',
      background: '#141a2e', border: '1px solid rgba(255,210,63,0.35)', borderRadius: compact ? '26px' : '28px',
    }}
  >
    <div aria-hidden="true" style={{ flex: '1 1 300px', minHeight: compact ? '170px' : '360px', position: 'relative', background: '#1b2240', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={card('#ffe9dc', compact ? 'translate(-62px, 8px) rotate(-12deg)' : 'translate(-72px, 14px) rotate(-12deg)', compact)}>
        <HiOutlineGift size={compact ? 34 : 52} />
      </span>
      <span style={card('#fff3cc', compact ? 'translate(62px, 8px) rotate(12deg)' : 'translate(72px, 14px) rotate(12deg)', compact)}>
        <HiOutlineStar size={compact ? 34 : 52} />
      </span>
      <span style={{ ...card('#ecebff', 'none', compact), position: 'relative', boxShadow: '0 16px 36px rgba(0,0,0,0.35)' }}>
        <HiOutlineTag size={compact ? 36 : 56} />
        <span style={{ position: 'absolute', width: compact ? '46px' : '58px', height: compact ? '46px' : '58px', borderRadius: '50%', background: OFFER_YELLOW, color: OFFER_ON_YELLOW, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HiOutlineLockClosed size={compact ? 20 : 24} />
        </span>
      </span>
    </div>
    <div style={{ flex: '1 1 300px', minWidth: 0, boxSizing: 'border-box', padding: compact ? '20px 18px' : '32px 30px 28px', display: 'flex', flexDirection: 'column', gap: compact ? '12px' : '16px' }}>
      <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '7px', padding: '7px 13px', borderRadius: '999px', background: OFFER_YELLOW, color: OFFER_ON_YELLOW, fontSize: '12.5px', fontWeight: 800 }}>
        <HiOutlineStar size={15} aria-hidden="true" /> PEG Premium
      </span>
      <h2 id="pco-premium-title" style={{ margin: 0, color: '#fff', fontSize: compact ? '23px' : '30px', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12 }}>
        Des prix rien que pour vous
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {PREMIUM_ADVANTAGES.map((a) => (
          <li key={a.title} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
            <span aria-hidden="true" style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: '50%', background: 'rgba(74,222,128,0.16)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineCheck size={14} />
            </span>
            {a.title}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: compact ? '10px' : '16px' }}>
        <button
          type="button"
          onClick={onDiscover}
          style={{ flex: compact ? '1 1 100%' : '0 0 auto', height: '48px', padding: '0 22px', border: 0, borderRadius: '14px', background: OFFER_YELLOW, color: OFFER_ON_YELLOW, fontSize: '14.5px', fontWeight: 800, cursor: 'pointer' }}
        >
          Découvrir Premium
        </button>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.66)' }}>{PREMIUM_PRICE_HT} € HT / mois</span>
      </div>
    </div>
  </article>
);

export default PremiumTeaser;
