/**
 * Photos des produits Master Print — règles PURES de correspondance avec le
 * catalogue fournisseur (aucun appel réseau). Tests : src/__tests__/supplierPhotos.test.ts.
 *
 * Un textile Master Print porte la marque et la référence du FABRICANT
 * (« B&C », « TM057 »). Le format des références chez le fournisseur n'est pas
 * documenté : la correspondance est tolérante et dit sa confiance.
 *   - sûre     : marque compatible ET référence identique, ou précédée d'un court
 *                préfixe de marque (« BCTM057 »), ou référence de variante qui
 *                commence par elle (« TM057-BLK-S ») ;
 *   - probable : marque compatible ET référence (ou code du nom, ex. « E150 »)
 *                présente comme mot dans le titre ou les mots-clés ;
 *   - à choisir : plusieurs candidats ; introuvable : aucun.
 * Les produits non textile n'ont pas de photo de fabricant.
 */
import type {
  ImbretexImage,
  ImbretexProduct,
  ImbretexVariant,
} from '@/@types/imbretex';
import type {
  MatchResult,
  PhotoPlan,
  PhotoProduct,
  SupplierColor,
  SupplierEntry,
} from '@/@types/supplierPhotos';

const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** « tu01t », « TU 01T », « tu-01t » → « TU01T ». */
export const normRef = (v: unknown): string =>
  typeof v === 'string' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

/** Mots d'un texte, en capitales sans accents (« T-shirt #E150 » → T, SHIRT, E150). */
export const tokensOf = (v: unknown): string[] =>
  typeof v === 'string'
    ? stripAccents(v)
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .filter((w) => w.length >= 2)
    : [];

const BRAND_NOISE =
  /\b(COLLECTION|CLOTHING|APPAREL|TEXTILES?|WEAR|ORIGINALS?|BRAND|LTD|SAS|SA)\b/g;

/** « B&C Collection », « B&C », « BC » → « BC » ; « Stanley/Stella » → « STANLEYSTELLA ». */
export const brandKey = (v: unknown): string =>
  typeof v === 'string'
    ? stripAccents(v)
        .toUpperCase()
        .replace(BRAND_NOISE, ' ')
        .replace(/[^A-Z0-9]/g, '')
    : '';

/**
 * Famille de la marque : son premier mot (« B&C Outerwear » → BC, « Kariban
 * Premium » → KARIBAN). Master Print écrit souvent la gamme (« B&C Outerwear »)
 * là où le fournisseur écrit la marque (« B&C ») : la famille les rapproche.
 */
export const brandFamily = (v: unknown): string => {
  if (typeof v !== 'string') return '';
  const first = stripAccents(v)
    .toUpperCase()
    .replace(BRAND_NOISE, ' ')
    .trim()
    .split(/\s+/)[0];
  return brandKey(first || '');
};

/** Même marque, à une déclinaison près (« KARIBAN » / « KARIBANPREMIUM »). */
export function brandsCompatible(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && long.startsWith(short);
}

const PREFIX_RE = /^[A-Z]{1,4}$/;

/** Référence fournisseur = référence fabricant, éventuellement précédée d'un préfixe de marque. */
const sameRef = (supplier: string, sku: string) =>
  !!sku &&
  (supplier === sku ||
    (supplier.length > sku.length &&
      supplier.endsWith(sku) &&
      PREFIX_RE.test(supplier.slice(0, supplier.length - sku.length))));

/**
 * Référence de variante qui commence par la référence fabricant :
 * « TM057-BLK-S », « BC-TM057-S », « TM057BLKS » (frontière nette : la référence
 * finit par un chiffre et la suite commence par une lettre).
 */
export function variantStartsWith(raw: string, sku: string): boolean {
  if (!sku || !raw) return false;
  const parts = raw
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (!parts.length) return false;
  if (sameRef(parts[0], sku)) return true;
  if (parts.length > 1 && PREFIX_RE.test(parts[0]) && parts[1] === sku)
    return true;
  const n = normRef(raw);
  if (!n.startsWith(sku)) return false;
  const rest = n.slice(sku.length);
  return !rest || (/\d$/.test(sku) && /^[A-Z]/.test(rest));
}

/** Codes distinctifs d'un nom (lettres ET chiffres, ≥ 3 signes) : « B&C #E150 T-Shirt » → E150. */
export const nameCodes = (name: string): string[] =>
  tokensOf(name).filter(
    (w) => w.length >= 3 && /\d/.test(w) && /[A-Z]/.test(w)
  );

// ── Index du catalogue fournisseur ───────────────────────────────────────────

const asImages = (v: ImbretexImage | ImbretexImage[] | undefined | null) =>
  (Array.isArray(v) ? v : v ? [v] : []).filter(
    (i) => i && typeof i.url === 'string' && i.url
  );

/** Préprod : images en 404 sur l'admin, servies par www.imbretex.fr. */
export const fixSupplierImageUrl = (url: string) =>
  url.replace('admin.preprod.imbretex-upgrade.hegyd.net', 'www.imbretex.fr');

/** Première photo d'une liste (plus petit `type` = vue principale). */
export function firstImage(
  v: ImbretexImage | ImbretexImage[] | undefined | null
): string | null {
  const list = asImages(v).sort(
    (a, b) => (Number(a.type) || 0) - (Number(b.type) || 0)
  );
  return list[0] ? fixSupplierImageUrl(list[0].url) : null;
}

const colorAttr = (v: ImbretexVariant) =>
  v.attributes?.find((a) => a?.type === 'color') || null;

const hexOrNull = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^#?([0-9a-f]{6})$/i);
  return m ? `#${m[1].toLowerCase()}` : null;
};

/** Fiche compacte d'un produit fournisseur : référence, marque, mots, coloris et leur photo. */
export function indexSupplierProduct(p: ImbretexProduct): SupplierEntry {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const v0 = variants[0];
  const texts = [
    v0?.title?.fr,
    v0?.title?.en,
    v0?.longTitle?.fr,
    v0?.longTitle?.en,
    ...(v0?.keywords || []).flatMap((k) => [
      ...(k?.fr || []),
      ...(k?.en || []),
    ]),
  ].filter((t): t is string => typeof t === 'string');
  const colors: SupplierColor[] = [];
  const byName = new Map<string, SupplierColor>();
  for (const v of variants) {
    const a = colorAttr(v);
    const name = typeof a?.value === 'string' ? a.value.trim() : '';
    if (!name) continue;
    const key = name.toLowerCase();
    let c = byName.get(key);
    if (!c) {
      c = { name, hex: hexOrNull(a?.hex), imageUrl: null };
      byName.set(key, c);
      colors.push(c);
    }
    if (!c.imageUrl) c.imageUrl = firstImage(v.images);
    if (!c.hex) c.hex = hexOrNull(a?.hex);
  }
  const variantRefs = [
    ...new Set(
      variants
        .map((v) => v.variantReference)
        .filter((r): r is string => typeof r === 'string' && !!r)
    ),
  ].slice(0, 300);
  return {
    reference: String(p.reference || ''),
    ref: normRef(p.reference),
    brand: String(p.brands?.name || ''),
    brandKey: brandKey(p.brands?.name),
    brandFamily: brandFamily(p.brands?.name),
    title: String(v0?.title?.fr || v0?.title?.en || p.reference || ''),
    tokens: [...new Set(texts.flatMap(tokensOf))],
    variantRefs,
    colors,
    mainImage:
      firstImage(p.images) || colors.find((c) => c.imageUrl)?.imageUrl || null,
  };
}

// ── Correspondance d'un produit Master Print ─────────────────────────────────

type MpLike = Pick<PhotoProduct, 'brand' | 'sku' | 'name' | 'kind'>;

const uniqueByRef = (list: SupplierEntry[]) => {
  const seen = new Set<string>();
  return list.filter((e) => {
    const k = e.ref || e.reference || e.title;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export function matchProduct(
  product: MpLike,
  index: SupplierEntry[]
): MatchResult {
  if (product.kind !== 'textile')
    return { level: 'noSupplierPhoto', entry: null, candidates: [] };
  const sku = normRef(product.sku);
  const brand = brandKey(product.brand);
  const family = brandFamily(product.brand);
  const codes = [
    ...new Set([...(sku ? [sku] : []), ...nameCodes(product.name)]),
  ];
  const sure: SupplierEntry[] = [];
  const probable: SupplierEntry[] = [];
  for (const e of index) {
    const brandOk = brand
      ? brandsCompatible(brand, e.brandKey) ||
        (family.length >= 2 && family === e.brandFamily)
      : true;
    if (!brandOk) continue;
    const refOk =
      !!sku &&
      (sameRef(e.ref, sku) ||
        e.variantRefs.some((r) => variantStartsWith(r, sku)));
    if (refOk && brand) sure.push(e);
    else if (refOk || codes.some((c) => e.tokens.includes(c))) probable.push(e);
  }
  const s = uniqueByRef(sure);
  if (s.length === 1) return { level: 'sure', entry: s[0], candidates: s };
  if (s.length > 1)
    return { level: 'choose', entry: null, candidates: s.slice(0, 8) };
  const p = uniqueByRef(probable);
  if (p.length === 1) return { level: 'probable', entry: p[0], candidates: p };
  if (p.length > 1)
    return { level: 'choose', entry: null, candidates: p.slice(0, 8) };
  return { level: 'notFound', entry: null, candidates: [] };
}

// ── Coloris ──────────────────────────────────────────────────────────────────

/** Anglais → français, comme le dictionnaire du serveur (master-print-text.ts). */
const EN_FR: Record<string, string> = {
  black: 'noir',
  'black pure': 'noir pur',
  white: 'blanc',
  navy: 'bleu marine',
  'navy blue': 'bleu marine',
  'french navy': 'bleu marine',
  'royal blue': 'bleu roi',
  royal: 'bleu roi',
  'sky blue': 'bleu ciel',
  'light blue': 'bleu ciel',
  blue: 'bleu',
  red: 'rouge',
  'fire red': 'rouge feu',
  burgundy: 'bordeaux',
  wine: 'bordeaux',
  'heather grey': 'gris chine',
  'sport grey': 'gris chine',
  grey: 'gris',
  gray: 'gris',
  'dark grey': 'gris fonce',
  anthracite: 'anthracite',
  charcoal: 'anthracite',
  green: 'vert',
  'kelly green': 'vert',
  'bottle green': 'vert bouteille',
  khaki: 'kaki',
  yellow: 'jaune',
  orange: 'orange',
  pink: 'rose',
  'light pink': 'rose clair',
  fuchsia: 'fuchsia',
  purple: 'violet',
  sand: 'sable',
  natural: 'naturel',
  turquoise: 'turquoise',
  'real turquoise': 'turquoise',
  brown: 'marron',
  chocolate: 'chocolat',
  'steel grey': 'gris acier',
  'steel gray': 'gris acier',
  ash: 'gris cendre',
  'light grey': 'gris clair',
  'heather light grey': 'gris chine clair',
  'heather navy': 'bleu marine chine',
  'light navy': 'bleu marine clair',
  'cobalt blue': 'bleu cobalt',
  'electric blue': 'bleu electrique',
  azure: 'bleu azur',
  'deep red': 'rouge fonce',
  'used black': 'noir delave',
};

/** Clé commune d'un nom de coloris, anglais ou français (« Black Pure », « Noir pur » → « noir pur »). */
export function colorKey(v: unknown): string {
  const k = stripAccents(String(v ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return EN_FR[k] ?? k;
}

const rgb = (hex: string | null) => {
  const h = hexOrNull(hex);
  return h ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : null;
};

const distance = (a: number[], b: number[]) =>
  Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

const MAX_TINT_DISTANCE = 60;

/**
 * Coloris Master Print → coloris fournisseur qui a une photo : même nom
 * (anglais ou français), sinon la teinte la plus proche (signalée « approx »).
 */
export function matchColors(
  mpColors: Array<{ code: string; label: string; hex: string | null }>,
  supplier: SupplierColor[]
): Record<string, { color: SupplierColor; approx: boolean }> {
  const withPhoto = supplier.filter((c) => c.imageUrl);
  const out: Record<string, { color: SupplierColor; approx: boolean }> = {};
  const used = new Set<SupplierColor>();
  for (const c of mpColors) {
    const keys = new Set([colorKey(c.label), colorKey(c.code)]);
    const hit = withPhoto.find((s) => keys.has(colorKey(s.name)));
    if (hit) {
      out[c.code] = { color: hit, approx: false };
      used.add(hit);
    }
  }
  for (const c of mpColors) {
    if (out[c.code]) continue;
    const mine = rgb(c.hex);
    if (!mine) continue;
    let best: SupplierColor | null = null;
    let bestD = Infinity;
    for (const s of withPhoto) {
      if (used.has(s)) continue;
      const theirs = rgb(s.hex);
      if (!theirs) continue;
      const d = distance(mine, theirs);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best && bestD <= MAX_TINT_DISTANCE) {
      out[c.code] = { color: best, approx: true };
      used.add(best);
    }
  }
  return out;
}

const MAX_GALLERY = 8;

/**
 * Photos à copier : une par coloris retrouvé ; galerie = coloris par défaut de
 * l'offre d'abord (sinon le premier coloris), puis les autres ; à défaut de
 * coloris, la photo principale du produit fournisseur.
 */
export function photoPlan(
  product: Pick<PhotoProduct, 'colors' | 'offerColors'>,
  entry: SupplierEntry
): PhotoPlan {
  const colors = product.offerColors.length
    ? product.colors.filter((c) => product.offerColors.includes(c.code))
    : product.colors;
  const matched = matchColors(colors, entry.colors);
  const byColor: Record<string, string> = {};
  const approx: string[] = [];
  for (const c of colors) {
    const m = matched[c.code];
    if (!m?.color.imageUrl) continue;
    byColor[c.code] = m.color.imageUrl;
    if (m.approx) approx.push(c.code);
  }
  const ordered = colors.map((c) => byColor[c.code]).filter(Boolean);
  const gallery = [...new Set(ordered)].slice(0, MAX_GALLERY);
  if (!gallery.length && entry.mainImage) gallery.push(entry.mainImage);
  return {
    byColor,
    gallery,
    covered: Object.keys(byColor).length,
    total: colors.length,
    approx,
  };
}

/** Résumé en tête du panneau : « 3 sur 5 produits textile trouvés ». */
export function coverageLine(levels: Array<MatchResult['level']>): string {
  const textile = levels.filter((l) => l !== 'noSupplierPhoto').length;
  const found = levels.filter((l) => l === 'sure' || l === 'probable').length;
  const choose = levels.filter((l) => l === 'choose').length;
  const other = levels.length - textile;
  const parts = [
    textile
      ? `${found} sur ${textile} produit${textile > 1 ? 's' : ''} textile trouvé${found > 1 ? 's' : ''}`
      : 'Aucun produit textile relié',
  ];
  if (choose) parts.push(`${choose} à choisir`);
  if (other)
    parts.push(
      `${other} sans photo de fabricant (grand format, adhésifs, film, PLV)`
    );
  return parts.join(' · ');
}

export const MATCH_LABELS: Record<MatchResult['level'], string> = {
  sure: 'Sûre',
  probable: 'Probable',
  choose: 'À choisir',
  notFound: 'Introuvable',
  noSupplierPhoto: 'Pas de photo fabricant',
};
