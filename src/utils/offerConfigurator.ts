/**
 * Offres configurables — règles PURES du formulaire client (aucun appel réseau).
 * Le serveur reste la source de vérité (prix, contrôle de la configuration,
 * visuels attendus) : ces règles ne servent qu'à guider la saisie et à éviter
 * des appels inutiles. Tests : src/__tests__/offerConfigurator.test.ts.
 */
import type {
  OfferClientConfig,
  OfferClientMarking,
  OfferSpec,
} from '@/@types/masterPrint';
import type { SizeAndColorSelection } from '@/@types/product';

type MarkingSpec = NonNullable<OfferSpec['markings']>;

/** Formats de marquage qui tiennent à un emplacement. */
export const formatsForPosition = (
  spec: OfferSpec,
  position: string
): MarkingSpec['formats'] => {
  const m = spec.markings;
  if (!m) return [];
  const allowed = m.positions.find((p) => p.code === position)?.formats ?? [];
  return m.formats.filter((f) => allowed.includes(f.code));
};

/** Marquage proposé quand le client coche un emplacement : la plus grande taille qui y tient. */
export function markingAt(
  spec: OfferSpec,
  position: string
): OfferClientMarking {
  const formats = formatsForPosition(spec, position);
  const biggest = [...formats].sort(
    (a, b) =>
      (b.widthMm || 0) * (b.heightMm || 0) -
      (a.widthMm || 0) * (a.heightMm || 0)
  )[0];
  const technique =
    spec.markings?.techniques.length === 1
      ? spec.markings.techniques[0].code
      : undefined;
  if (biggest)
    return {
      position,
      format: biggest.code,
      ...(technique ? { technique } : {}),
    };
  const pos = spec.markings?.positions.find((p) => p.code === position);
  return {
    position,
    width_mm: Math.min(100, pos?.maxWidthMm || 100),
    ...(technique ? { technique } : {}),
  };
}

/** Configuration de départ : premier coloris, minimum de commande, valeurs par défaut. */
export function initialConfig(spec: OfferSpec): OfferClientConfig {
  const config: OfferClientConfig = {};
  if (spec.kind === 'textile') {
    config.color = spec.colors[0]?.code;
    config.sizes = {};
    if (!spec.sizes.length) config.quantity = spec.quantity.min;
  } else if (spec.kind === 'unit') {
    config.quantity = spec.quantity.min;
  } else {
    config.pieces = [{ width_mm: 100, height_mm: 100, quantity: 1 }];
  }
  if (spec.markings?.mode === 'client') {
    const first = spec.markings.positions.find(
      (p) => p.formats.length || spec.markings!.customSize
    );
    config.markings =
      spec.markings.min > 0 && first ? [markingAt(spec, first.code)] : [];
  }
  const options: Record<string, string | string[]> = {};
  for (const o of spec.options) {
    if (o.type === 'multi_select')
      options[o.code] = o.values.filter((v) => v.default).map((v) => v.code);
    else {
      const d =
        o.values.find((v) => v.default) ||
        (o.required ? o.values[0] : undefined);
      if (d) options[o.code] = d.code;
    }
  }
  config.options = options;
  if (spec.format?.mode === 'client') {
    const first =
      spec.format.formats.find((f) => f.printed) || spec.format.formats[0];
    if (first) config.format = first.code;
    else if (spec.format.free) {
      config.width_mm = Math.max(spec.format.free.width.min || 100, 100);
      config.height_mm = Math.max(spec.format.free.height.min || 100, 100);
    }
  }
  return config;
}

/** Quantité totale commandée (pièces). */
export const totalPieces = (
  spec: OfferSpec,
  config: OfferClientConfig
): number => {
  if (spec.kind === 'textile' && spec.sizes.length) {
    return Object.values(config.sizes || {}).reduce(
      (a, b) => a + (Number(b) > 0 ? Math.floor(Number(b)) : 0),
      0
    );
  }
  if (spec.kind === 'length')
    return (config.pieces || []).reduce((a, p) => a + (p.quantity || 0), 0);
  return Math.max(0, Math.floor(Number(config.quantity) || 0));
};

/** Une option est-elle sans objet avec le format choisi (ex. média d'un roll-up « structure seule ») ? */
export const optionHidden = (
  o: OfferSpec['options'][number],
  config: OfferClientConfig
) => !!config.format && o.notWithFormats.includes(config.format);

/**
 * Ce qui manque avant de demander un prix (message court pour le client), ou
 * null si la configuration peut partir au serveur.
 */
export function configBlocker(
  spec: OfferSpec,
  config: OfferClientConfig
): string | null {
  if (!spec.ready) return 'Cette offre n’est pas disponible pour le moment.';
  if (spec.kind === 'textile' && !config.color) return 'Choisissez un coloris.';
  const qty = totalPieces(spec, config);
  if (spec.kind === 'length') {
    if (!config.pieces?.length) return 'Ajoutez au moins un visuel.';
    if (
      config.pieces.some(
        (p) => !(p.width_mm > 0) || !(p.height_mm > 0) || !(p.quantity > 0)
      )
    )
      return 'Indiquez les dimensions et la quantité de chaque visuel.';
  } else {
    if (!qty)
      return spec.kind === 'textile' && spec.sizes.length
        ? 'Indiquez vos quantités par taille.'
        : 'Indiquez une quantité.';
    if (qty < spec.quantity.min)
      return `Minimum de commande : ${spec.quantity.min} pièce${spec.quantity.min > 1 ? 's' : ''}.`;
  }
  const m = spec.markings;
  if (m?.mode === 'client') {
    const n = config.markings?.length || 0;
    if (n < m.min)
      return m.min === 1
        ? 'Choisissez l’emplacement de votre marquage.'
        : `Choisissez au moins ${m.min} emplacements de marquage.`;
    if (n > m.max) return `${m.max} marquage${m.max > 1 ? 's' : ''} au plus.`;
  }
  if (
    spec.format?.mode === 'client' &&
    !config.format &&
    !(config.width_mm && config.height_mm)
  )
    return 'Choisissez un format.';
  return null;
}

/** Configuration envoyée au serveur : quantités nulles et options sans objet retirées. */
export function configForServer(
  spec: OfferSpec,
  config: OfferClientConfig
): OfferClientConfig {
  const out: OfferClientConfig = {};
  if (config.color) out.color = config.color;
  if (config.sizes) {
    const sizes = Object.fromEntries(
      Object.entries(config.sizes)
        .filter(([, n]) => Number(n) > 0)
        .map(([k, n]) => [k, Math.floor(Number(n))])
    );
    if (Object.keys(sizes).length) out.sizes = sizes;
  }
  if (config.quantity && !(spec.kind === 'textile' && spec.sizes.length))
    out.quantity = Math.floor(config.quantity);
  if (config.markings?.length) out.markings = config.markings;
  const options = Object.fromEntries(
    Object.entries(config.options || {}).filter(([code, v]) => {
      const o = spec.options.find((x) => x.code === code);
      return o && !optionHidden(o, config) && (Array.isArray(v) ? v.length : v);
    })
  );
  if (Object.keys(options).length) out.options = options;
  if (config.format) out.format = config.format;
  else if (config.width_mm && config.height_mm) {
    out.width_mm = Math.round(config.width_mm);
    out.height_mm = Math.round(config.height_mm);
  }
  if (spec.kind === 'length' && config.pieces)
    out.pieces = config.pieces.map((p) => ({
      width_mm: Math.round(p.width_mm),
      height_mm: Math.round(p.height_mm),
      quantity: Math.floor(p.quantity),
    }));
  return out;
}

const PLACEHOLDER = {
  documentId: 'DEFAULT',
  name: 'Default',
  value: 'DEFAULT',
  description: 'Default',
};

/** Sélections du panier (affichage et quantités, comme les autres articles) — le serveur refait les siennes. */
export function selectionsFromConfig(
  spec: OfferSpec,
  config: OfferClientConfig
): SizeAndColorSelection[] {
  if (spec.kind === 'textile' && spec.sizes.length && config.color) {
    const c = spec.colors.find((x) => x.code === config.color);
    const color = {
      documentId: `mp-${config.color}`,
      name: c?.label || config.color,
      value: config.color,
      description: '',
    };
    return Object.entries(config.sizes || {})
      .filter(([, n]) => Number(n) > 0)
      .map(([k, n]) => ({
        size: { documentId: `mp-${k}`, name: k, value: k, description: '' },
        color,
        quantity: Math.floor(Number(n)),
      }));
  }
  const quantity =
    spec.kind === 'length'
      ? 1
      : Math.max(1, Math.floor(Number(config.quantity) || 1));
  return [{ size: { ...PLACEHOLDER }, color: { ...PLACEHOLDER }, quantity }];
}

/** Date d'expédition estimée, en clair : « jeudi 3 décembre ». */
export function shipDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** Millimètres ↔ centimètres pour la saisie (le client pense en cm). */
export const mmToCm = (mm: number | undefined | null) =>
  mm ? Math.round(mm) / 10 : '';
export const cmToMm = (cm: string | number) => {
  const n = Number(String(cm).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) : 0;
};

/** Dimensions d'un format en clair : « 40 × 60 cm ». */
export const formatDims = (f: {
  widthMm: number | null;
  heightMm: number | null;
}) =>
  f.widthMm && f.heightMm
    ? `${mmToCm(f.widthMm)} × ${mmToCm(f.heightMm)} cm`
    : '';

/** Extension d'un nom de fichier, en minuscules (« Logo.PNG » → « png »). */
export const fileExtension = (name: string): string | null =>
  name.match(/\.([A-Za-z0-9]{1,5})$/)?.[1]?.toLowerCase() ?? null;

/** Le fichier a-t-il un format accepté pour ce visuel ? */
export const fileMatches = (name: string, formats: string[]): boolean => {
  const ext = fileExtension(name);
  return !!ext && formats.includes(ext);
};

/** Formats en clair : « PDF », « PDF, PNG, JPG ou SVG ». */
export function formatsLabel(formats: string[]): string {
  const names = [
    ...new Set(formats.map((f) => (f === 'jpeg' ? 'jpg' : f).toUpperCase())),
  ];
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}`
    : names[0] || '';
}

/** Attribut `accept` du champ de fichier : « .pdf,.png ». */
export const acceptAttr = (formats: string[]) =>
  formats.map((f) => `.${f}`).join(',');

/**
 * Images de la fiche quand un coloris est choisi : sa photo (fichier PEG posé
 * depuis « Photos des produits ») d'abord, puis la galerie sans doublon ; sans
 * photo de coloris, la galerie normale.
 */
export function imagesForColor<I extends { url: string }>(
  images: I[],
  color: { imageUrl?: string | null; label?: string } | null | undefined
): Array<I | { url: string; name?: string }> {
  const url = color?.imageUrl;
  if (!url) return images;
  return [{ url, name: color?.label }, ...images.filter((i) => i.url !== url)];
}
