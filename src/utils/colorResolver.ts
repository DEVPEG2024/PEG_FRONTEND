/**
 * Résout une couleur d'affichage (hex) à partir du nom et de la valeur stockée.
 *
 * Contexte : les couleurs importées (Imbretex) sont créées avec `value: '#000000'`
 * par défaut → pastilles toutes noires. Ce résolveur déduit une couleur lisible
 * depuis le NOM (FR/EN + repli déterministe) quand la valeur est absente ou noire.
 *
 * ⚠️ Affichage uniquement — ne pas persister : `value` sert aussi d'identifiant
 * de sélection côté client (onglets, commandes).
 */

const NAMED: Record<string, string> = {
  // Français
  blanc: '#ffffff',
  noir: '#111111',
  bleu: '#2563eb',
  rouge: '#e11d48',
  vert: '#16a34a',
  jaune: '#eab308',
  orange: '#ea580c',
  violet: '#7e22ce',
  rose: '#ec4899',
  gris: '#9ca3af',
  marron: '#5c3d1e',
  or: '#ca8a04',
  argent: '#c0c0c0',
  marine: '#1e3a8a',
  beige: '#e8dcc8',
  sable: '#c8a97e',
  turquoise: '#06b6d4',
  bordeaux: '#881337',
  anthracite: '#292524',
  lilas: '#c084fc',
  corail: '#fb7185',
  creme: '#fffdd0',
  ecru: '#f5f0e1',
  kaki: '#78866b',
  // Anglais
  white: '#ffffff',
  black: '#111111',
  blue: '#2563eb',
  red: '#e11d48',
  green: '#16a34a',
  yellow: '#eab308',
  purple: '#7e22ce',
  pink: '#ec4899',
  grey: '#9ca3af',
  gray: '#9ca3af',
  brown: '#5c3d1e',
  gold: '#ca8a04',
  silver: '#c0c0c0',
  navy: '#1e3a8a',
  coral: '#fb7185',
  maroon: '#800000',
  charcoal: '#36454f',
  lilac: '#c084fc',
  cream: '#fffdd0',
  ivory: '#fffff0',
  teal: '#0d9488',
  cyan: '#06b6d4',
  magenta: '#d946ef',
  lime: '#84cc16',
  olive: '#808000',
  khaki: '#bdb76b',
  tan: '#d2b48c',
  burgundy: '#800020',
  sand: '#c8a97e',
  royal: '#1d4ed8',
  sky: '#0ea5e9',
  mint: '#86efac',
  peach: '#ffdab9',
  salmon: '#fa8072',
  mustard: '#d4a017',
  aqua: '#06b6d4',
  indigo: '#4f46e5',
  heather: '#9ca3af',
  stone: '#a8a29e',
  forest: '#166534',
};

// Entrées multi-mots (priorité sur les tokens isolés)
const NAMED_PHRASES: Record<string, string> = {
  'baby pink': '#f9a8d4',
  'baby blue': '#bae6fd',
  'heather grey': '#9ca3af',
  'heather gray': '#9ca3af',
  'royal blue': '#1d4ed8',
  'sky blue': '#0ea5e9',
  'navy blue': '#1e3a8a',
  'bleu marine': '#1e3a8a',
  'bleu ciel': '#0ea5e9',
};

const FALLBACK = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#0ea5e9',
  '#78716c',
];

export const isHexColor = (v?: string): boolean =>
  !!v && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

const hashColor = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
};

export function resolveColorHex(name?: string, value?: string): string {
  const v = (value || '').trim().toLowerCase();
  // Valeur explicite réelle (et pas le noir par défaut de l'import) → on la respecte
  if (isHexColor(v) && v !== '#000000' && v !== '#000') return v;

  const n = (name || '').toLowerCase().trim();
  if (n) {
    for (const phrase of Object.keys(NAMED_PHRASES)) {
      if (n.includes(phrase)) return NAMED_PHRASES[phrase];
    }
    const tokens = n.split(/[^a-zàâçéèêëîïôûùüÿñæœ]+/i).filter(Boolean);
    for (const t of tokens) {
      if (NAMED[t]) return NAMED[t];
    }
  }
  // Valeur noire/absente + nom non reconnu → couleur déterministe lisible (≠ tout noir)
  return n ? hashColor(n) : isHexColor(v) ? v : '#9ca3af';
}
