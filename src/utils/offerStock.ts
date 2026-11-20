/**
 * Stock du textile d'une offre configurable — règles PURES du formulaire client
 * (aucun appel réseau). Tests : src/__tests__/offerStock.test.ts.
 *
 * Le serveur reste la source de vérité : il refuse lui-même une quantité au-delà
 * du commandable (routes de prix et de ligne de commande). Ces règles guident la
 * saisie : taille épuisée désactivée, « Plus que N », quantité excessive signalée
 * sous la taille et ajout au panier bloqué, coloris épuisé grisé.
 * Stock inconnu (`null` ou `tracked: false`) : le formulaire se comporte comme avant.
 */
import type { OfferClientConfig, OfferSpec } from '@/@types/masterPrint';
import type { OfferStock, OfferStockColor } from '@/@types/offerStock';

export type SizeState =
  /** Pas de limite connue. */
  | { kind: 'free' }
  | { kind: 'ok'; left: number }
  /** Au plus le seuil « Plus que N ». */
  | { kind: 'low'; left: number }
  | { kind: 'soldOut' };

/** Stock connu d'un coloris (null = inconnu). */
export const stockColor = (
  stock: OfferStock | null | undefined,
  code: string | undefined
): OfferStockColor | null =>
  stock?.tracked && code
    ? (stock.colors.find((c) => c.code === code) ?? null)
    : null;

/**
 * État d'une taille dans un coloris. Une taille connue du stock mais absente du
 * formulaire (fiche relue il y a peu) est traitée comme épuisée : le serveur la
 * refuserait.
 */
export function sizeState(
  spec: OfferSpec,
  stock: OfferStock | null | undefined,
  colorCode: string | undefined,
  size: string
): SizeState {
  const sc = stockColor(stock, colorCode);
  if (!sc || !(size in sc.sizes)) return { kind: 'free' };
  const specColor = spec.colors.find((c) => c.code === colorCode);
  if (!specColor || !specColor.sizes.includes(size)) return { kind: 'soldOut' };
  const left = sc.sizes[size];
  if (left === null) return { kind: 'free' };
  if (left <= 0) return { kind: 'soldOut' };
  return left <= (stock?.lowThreshold ?? 20)
    ? { kind: 'low', left }
    : { kind: 'ok', left };
}

/** Tailles affichées pour un coloris : celles du formulaire, plus les tailles épuisées connues du stock. */
export function displayedSizes(
  spec: OfferSpec,
  stock: OfferStock | null | undefined,
  colorCode: string | undefined
): string[] {
  const specColor = spec.colors.find((c) => c.code === colorCode);
  const sc = stockColor(stock, colorCode);
  if (!specColor && !sc) return spec.sizes;
  const shown = new Set([
    ...(specColor?.sizes ?? []),
    ...(sc ? Object.keys(sc.sizes) : []),
  ]);
  return spec.sizes.filter((s) => shown.has(s));
}

/** Toutes les tailles du coloris sont-elles épuisées ? */
export function colorSoldOut(
  spec: OfferSpec,
  stock: OfferStock | null | undefined,
  colorCode: string
): boolean {
  const sc = stockColor(stock, colorCode);
  if (!sc) return false;
  if (sc.soldOut) return true;
  const sizes = displayedSizes(spec, stock, colorCode);
  return (
    sizes.length > 0 &&
    sizes.every((s) => sizeState(spec, stock, colorCode, s).kind === 'soldOut')
  );
}

export type ColorChoice = {
  code: string;
  label: string;
  hex: string | null;
  /** Tailles du formulaire pour ce coloris (vide pour un coloris épuisé hors formulaire). */
  sizes: string[];
  soldOut: boolean;
};

/** Pastilles de coloris : ceux du formulaire, plus les coloris épuisés (grisés, non sélectionnables). */
export function colorChoices(
  spec: OfferSpec,
  stock: OfferStock | null | undefined
): ColorChoice[] {
  const fromSpec = (c: OfferSpec['colors'][number]): ColorChoice => ({
    code: c.code,
    label: c.label,
    hex: c.hex,
    sizes: c.sizes,
    soldOut: colorSoldOut(spec, stock, c.code),
  });
  if (!stock?.tracked) return spec.colors.map(fromSpec);
  const out: ColorChoice[] = [];
  const seen = new Set<string>();
  for (const sc of stock.colors) {
    const c = spec.colors.find((x) => x.code === sc.code);
    if (c) out.push(fromSpec(c));
    else if (sc.soldOut)
      out.push({
        code: sc.code,
        label: sc.label,
        hex: sc.hex,
        sizes: [],
        soldOut: true,
      });
    seen.add(sc.code);
  }
  for (const c of spec.colors) if (!seen.has(c.code)) out.push(fromSpec(c));
  return out;
}

const pieces = (n: number) =>
  n === 1 ? 'une pièce' : `${n.toLocaleString('fr-FR')} pièces`;

/**
 * Quantités saisies au-delà du stock → message (mêmes mots que le serveur), ou
 * null. Sert à bloquer le calcul du prix et l'ajout au panier.
 */
export function stockBlocker(
  spec: OfferSpec,
  stock: OfferStock | null | undefined,
  config: OfferClientConfig
): string | null {
  if (spec.kind !== 'textile' || !config.color) return null;
  const sc = stockColor(stock, config.color);
  if (!sc) return null;
  const label =
    spec.colors.find((c) => c.code === config.color)?.label || sc.label;
  if (colorSoldOut(spec, stock, config.color))
    return `Le coloris ${label} est épuisé : choisissez-en un autre.`;
  const messages: string[] = [];
  for (const [size, raw] of Object.entries(config.sizes || {})) {
    const qty = Math.floor(Number(raw) || 0);
    if (qty <= 0) continue;
    const st = sizeState(spec, stock, config.color, size);
    if (st.kind === 'soldOut')
      messages.push(`La taille ${size} (${label}) est épuisée.`);
    else if ((st.kind === 'ok' || st.kind === 'low') && qty > st.left)
      messages.push(
        st.left === 1
          ? `Il ne reste qu’une pièce en ${size} (${label}).`
          : `Il ne reste que ${pieces(st.left)} en ${size} (${label}).`
      );
  }
  return messages.length ? messages.join(' ') : null;
}

export type SizeNote = { tone: 'error' | 'warn' | 'info'; text: string };

/** Note sous une taille : quantité excessive, épuisée, stock faible, délai plus long. */
export function sizeNote(
  stock: OfferStock | null | undefined,
  colorCode: string | undefined,
  size: string,
  state: SizeState,
  qty: number
): SizeNote | null {
  if (state.kind === 'soldOut')
    return qty > 0 ? { tone: 'error', text: 'Épuisée : retirez-la' } : null;
  if (state.kind === 'free') return null;
  if (qty > state.left)
    return {
      tone: 'error',
      text:
        state.left === 1
          ? 'Il n’en reste qu’une'
          : `Il n’en reste que ${state.left.toLocaleString('fr-FR')}`,
    };
  const now = stockColor(stock, colorCode)?.immediate[size];
  if (now != null && qty > now)
    return {
      tone: 'info',
      text: `Au-delà de ${now}, délai d’environ une semaine de plus`,
    };
  if (state.kind === 'low')
    return {
      tone: 'warn',
      text: `Plus que ${state.left.toLocaleString('fr-FR')}`,
    };
  return null;
}

/**
 * Coloris de départ épuisé et rien encore saisi : premier coloris disponible
 * (null = ne rien changer).
 */
export function firstAvailableColor(
  spec: OfferSpec,
  stock: OfferStock | null | undefined,
  config: OfferClientConfig
): string | null {
  if (!stock?.tracked || !config.color) return null;
  if (!colorSoldOut(spec, stock, config.color)) return null;
  if (Object.values(config.sizes || {}).some((n) => Number(n) > 0)) return null;
  return (
    spec.colors.find(
      (c) => c.code !== config.color && !colorSoldOut(spec, stock, c.code)
    )?.code ?? null
  );
}
