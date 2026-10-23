import { useState } from 'react';
import { HiOutlinePlus, HiX } from 'react-icons/hi';
import { Input } from '@/components/ui';
import ProductBadges from '@/components/shared/ProductBadges';
import {
  BADGE_LABEL_MAX,
  BADGE_PALETTE,
  BADGE_PRESETS,
  MAX_BADGES,
  PRESET_KINDS,
  addBadge,
  badgeId,
  cleanBadgeLabel,
  isBadgeExpired,
  parisDay,
  removeBadge,
  setBadgeUntil,
  type ProductBadge,
} from '@/utils/productBadges';

type Props = {
  value: ProductBadge[];
  onChange: (badges: ProductBadge[]) => void;
  /** Badges personnalisés déjà utilisés sur d'autres produits (un clic les reprend). */
  library?: ProductBadge[];
};

// Mêmes styles que les autres cartes du formulaire (ProductFields).
const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1.5px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '20px 22px',
  marginBottom: '16px',
  fontFamily: 'Inter, sans-serif',
};
const sectionTitle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0,
};
const fieldLabel: React.CSSProperties = {
  display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '7px',
};
const chip = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '32px', padding: '5px 11px', borderRadius: '999px',
  border: '1px dashed rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.85)',
  fontSize: '12px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, fontFamily: 'Inter, sans-serif',
});
const dot = (color: string): React.CSSProperties => ({
  width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.35)',
});

/**
 * « Badges » de la fiche produit : préréglages (Nouveau, Promo…), badges
 * personnalisés (texte + couleur), date de fin facultative, 3 au plus.
 */
const ProductBadgesEditor = ({ value, onChange, library = [] }: Props) => {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(BADGE_PALETTE[0]);
  const full = value.length >= MAX_BADGES;
  const today = parisDay();
  const taken = new Set(value.map(badgeId));
  const reusable = library.filter((b) => !taken.has(badgeId(b)));
  const customLabel = cleanBadgeLabel(label);
  const customTaken = taken.has(badgeId({ kind: 'custom', label: customLabel }));

  const addCustom = () => {
    if (!customLabel || full || customTaken) return;
    onChange(addBadge(value, { kind: 'custom', label: customLabel, color }));
    setLabel('');
  };

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
        <p style={sectionTitle}>Badges</p>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{value.length} / {MAX_BADGES}</span>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.5, margin: '0 0 14px' }}>
        Petites étiquettes affichées sur les cartes et sur la fiche du produit, côté client.
      </p>

      {/* Badges du produit */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {value.map((b) => {
            const id = badgeId(b);
            const expired = isBadgeExpired(b, today);
            const name = b.kind === 'custom' ? b.label : BADGE_PRESETS[b.kind].label;
            return (
              <div
                key={id}
                style={{
                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '8px 10px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ flex: '1 1 140px', minWidth: 0, opacity: expired ? 0.5 : 1 }}>
                  <ProductBadges badges={[{ ...b, until: undefined }]} layout="row" size="md" />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.55)', fontSize: '11.5px' }}>
                  Jusqu&apos;au
                  <input
                    type="date"
                    value={b.until ?? ''}
                    onChange={(e) => onChange(setBadgeUntil(value, id, e.target.value))}
                    aria-label={`Dernier jour d'affichage du badge « ${name} »`}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                      color: '#fff', padding: '5px 8px', fontSize: '12px', colorScheme: 'dark',
                    }}
                  />
                </label>
                {expired && <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 600 }}>Terminé — n&apos;est plus affiché</span>}
                <button
                  type="button"
                  onClick={() => onChange(removeBadge(value, id))}
                  aria-label={`Retirer le badge « ${name} »`}
                  title="Retirer"
                  style={{ marginLeft: 'auto', display: 'flex', padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
                >
                  <HiX size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Préréglages */}
      <label style={fieldLabel}>Ajouter</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {PRESET_KINDS.filter((k) => !taken.has(k)).map((k) => (
          <button key={k} type="button" disabled={full} onClick={() => onChange(addBadge(value, { kind: k }))} style={chip(full)}>
            <span aria-hidden="true" style={dot(BADGE_PRESETS[k].color)} />
            {BADGE_PRESETS[k].label}
          </button>
        ))}
        {reusable.map((b) => (
          <button key={badgeId(b)} type="button" disabled={full} onClick={() => onChange(addBadge(value, b))} style={chip(full)} title="Badge personnalisé déjà utilisé">
            <span aria-hidden="true" style={dot(b.color ?? BADGE_PALETTE[0])} />
            {b.label}
          </button>
        ))}
      </div>

      {/* Badge personnalisé */}
      <label style={fieldLabel}>Badge personnalisé</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <Input
            type="text"
            value={label}
            maxLength={BADGE_LABEL_MAX}
            placeholder="Ex. Made in France"
            disabled={full}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          />
        </div>
        <div role="radiogroup" aria-label="Couleur du badge" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {BADGE_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={`Couleur ${c}`}
              onClick={() => setColor(c)}
              style={{
                width: '26px', height: '26px', borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
                border: color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                boxShadow: color === c ? '0 0 0 2px rgba(111,163,245,0.7)' : 'none',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addCustom}
          disabled={full || !customLabel || customTaken}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: 'none',
            background: full || !customLabel || customTaken ? 'rgba(255,255,255,0.06)' : 'linear-gradient(90deg, #2f6fed, #4f7cff)',
            color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: full || !customLabel || customTaken ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <HiOutlinePlus size={14} /> Ajouter
        </button>
      </div>
      {customLabel && !full && !customTaken && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '11.5px' }}>
          Aperçu : <ProductBadges badges={[{ kind: 'custom', label: customLabel, color }]} layout="row" size="md" />
        </div>
      )}
      {full && (
        <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '11.5px' }}>
          {MAX_BADGES} badges au plus : retirez-en un pour en ajouter un autre.
        </p>
      )}
    </div>
  );
};

export default ProductBadgesEditor;
