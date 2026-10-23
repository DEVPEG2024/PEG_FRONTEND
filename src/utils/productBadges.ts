/**
 * Badges des produits (« Nouveau », « Promo »… ou personnalisés) posés par l'admin
 * sur une fiche — 23/10/2026. Stockés dans le champ JSON `product.badges` (Strapi),
 * affichés sur les cartes (catalogue, « Mes offres », accueil, admin) et sur la fiche.
 *
 * Tout ce qui vient du serveur est relu ici (`parseBadges`) : le champ est un JSON
 * libre, un badge mal formé est ignoré, jamais affiché tel quel.
 */

export type BadgePreset = 'new' | 'promo' | 'bestseller' | 'limited' | 'exclusive' | 'eco';
export type BadgeKind = BadgePreset | 'custom';

/** Forme enregistrée. Préréglage : `kind` seul ; personnalisé : `label` + `color`. */
export type ProductBadge = {
  kind: BadgeKind;
  label?: string;
  color?: string;
  /** Dernier jour d'affichage (AAAA-MM-JJ, inclus), ou absent = sans fin. */
  until?: string;
};

/** Forme affichée : libellé et couleurs résolus. */
export type ShownBadge = { key: string; kind: BadgeKind; label: string; color: string; text: string };

// Teintes foncées : texte blanc lisible (contraste ≥ 4,5:1) ; l'ambre porte un texte foncé.
export const BADGE_PRESETS: Record<BadgePreset, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: '#15803d' },
  promo: { label: 'Promo', color: '#dc2626' },
  bestseller: { label: 'Meilleure vente', color: '#f59e0b' },
  limited: { label: 'Stock limité', color: '#c2410c' },
  exclusive: { label: 'Exclusif', color: '#7e22ce' },
  eco: { label: 'Éco-responsable', color: '#0f766e' },
};
export const PRESET_KINDS = Object.keys(BADGE_PRESETS) as BadgePreset[];

/** Couleurs proposées pour un badge personnalisé. */
export const BADGE_PALETTE = ['#2f6fed', '#22c55e', '#ef4444', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#0b0e1a'];

export const MAX_BADGES = 3;
export const BADGE_LABEL_MAX = 20;
const DEFAULT_CUSTOM_COLOR = BADGE_PALETTE[0];

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const isPreset = (k: unknown): k is BadgePreset => typeof k === 'string' && k in BADGE_PRESETS;

const normalizeHex = (hex: string): string =>
  hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase() : hex.toLowerCase();

/** Libellé personnalisé propre : espaces réduits, 20 caractères au plus. */
export const cleanBadgeLabel = (raw: unknown): string =>
  typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, BADGE_LABEL_MAX) : '';

/**
 * Valeur du champ `badges` (JSON, éventuellement en chaîne) → badges valides, sans
 * doublon (même préréglage, ou même libellé personnalisé), au plus MAX_BADGES.
 */
export const parseBadges = (raw: unknown): ProductBadge[] => {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(value)) return [];
  const out: ProductBadge[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const until = typeof b.until === 'string' && DAY_RE.test(b.until) ? b.until : undefined;
    let badge: ProductBadge | null = null;
    if (isPreset(b.kind)) badge = { kind: b.kind, ...(until ? { until } : {}) };
    else if (b.kind === 'custom') {
      const label = cleanBadgeLabel(b.label);
      if (label) {
        const color = typeof b.color === 'string' && HEX_RE.test(b.color) ? normalizeHex(b.color) : DEFAULT_CUSTOM_COLOR;
        badge = { kind: 'custom', label, color, ...(until ? { until } : {}) };
      }
    }
    if (!badge) continue;
    const id = badgeId(badge);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(badge);
    if (out.length >= MAX_BADGES) break;
  }
  return out;
};

/** Identité d'un badge (préréglage, ou libellé personnalisé sans casse). */
export const badgeId = (b: ProductBadge): string =>
  b.kind === 'custom' ? `custom:${(b.label ?? '').toLowerCase()}` : b.kind;

/** Jour courant à Paris (AAAA-MM-JJ) : un badge « jusqu'au 31/10 » s'affiche tout le 31. */
export const parisDay = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);

export const isBadgeExpired = (b: ProductBadge, today: string = parisDay()): boolean => !!b.until && b.until < today;

const INK = '#141a2e';

/** Luminance relative WCAG d'une couleur hex. */
const luminance = (hex: string): number => {
  const h = normalizeHex(HEX_RE.test(hex) ? hex : DEFAULT_CUSTOM_COLOR).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Texte le plus lisible sur la couleur du badge : blanc ou encre (meilleur contraste WCAG). */
export const badgeTextColor = (hex: string): string => {
  const bg = luminance(hex);
  const onWhite = 1.05 / (bg + 0.05);
  const onInk = (bg + 0.05) / (luminance(INK) + 0.05);
  return onWhite >= onInk ? '#ffffff' : INK;
};

/** Badges à afficher aujourd'hui, libellés et couleurs résolus. */
export const shownBadges = (raw: unknown, today: string = parisDay()): ShownBadge[] =>
  parseBadges(raw)
    .filter((b) => !isBadgeExpired(b, today))
    .map((b) => {
      const preset = isPreset(b.kind) ? BADGE_PRESETS[b.kind] : null;
      const label = preset ? preset.label : b.label ?? '';
      const color = preset ? preset.color : b.color ?? DEFAULT_CUSTOM_COLOR;
      return { key: badgeId(b), kind: b.kind, label, color, text: badgeTextColor(color) };
    });

/** Le produit porte-t-il un badge « Nouveau » posé à la main (et encore valable) ? */
export const hasNewBadge = (raw: unknown, today: string = parisDay()): boolean =>
  shownBadges(raw, today).some((b) => b.kind === 'new');

/** Badges personnalisés distincts (bibliothèque proposée dans l'éditeur admin). */
export const customBadgeLibrary = (lists: unknown[]): ProductBadge[] => {
  const seen = new Map<string, ProductBadge>();
  for (const raw of lists) {
    for (const b of parseBadges(raw)) {
      if (b.kind !== 'custom') continue;
      const id = badgeId(b);
      if (!seen.has(id)) seen.set(id, { kind: 'custom', label: b.label, color: b.color });
    }
  }
  return [...seen.values()].sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '', 'fr'));
};

// ── Éditeur admin ────────────────────────────────────────────────────────────

/** Ajoute un badge (validé) s'il n'y est pas déjà et qu'il reste de la place. */
export const addBadge = (list: ProductBadge[], badge: ProductBadge): ProductBadge[] => {
  const [clean] = parseBadges([badge]);
  if (!clean || list.length >= MAX_BADGES || list.some((b) => badgeId(b) === badgeId(clean))) return list;
  return [...list, clean];
};

export const removeBadge = (list: ProductBadge[], id: string): ProductBadge[] => list.filter((b) => badgeId(b) !== id);

/** Date de fin (AAAA-MM-JJ) d'un badge ; vide = sans fin. */
export const setBadgeUntil = (list: ProductBadge[], id: string, until: string): ProductBadge[] =>
  list.map((b) => {
    if (badgeId(b) !== id) return b;
    const { until: _old, ...rest } = b;
    return DAY_RE.test(until) ? { ...rest, until } : rest;
  });
