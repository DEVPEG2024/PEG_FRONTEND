/**
 * Master Print — règles de l'onglet « Master Print » du projet (fonctions pures,
 * testées : src/__tests__/masterPrint.test.ts). Le serveur revérifie tout à
 * l'envoi (peg_strapi `master-print-text.ts`) ; ici on construit et on contrôle
 * ce que l'admin voit avant de cliquer.
 */
import type {
  MpDraftLine,
  MpLineConfig,
  MpMarking,
  MpProductMapping,
  MpProductView,
  MpSimulateEvent,
} from '@/@types/masterPrint';

export type BuiltLine = { key: string; config: MpLineConfig; issues: string[] };

/**
 * Lignes Master Print d'un projet issu d'une commande PEG : quantités de la
 * commande (jamais modifiées ici), coloris et tailles traduits par la
 * correspondance, mêmes marquages sur toutes les lignes, options communes.
 * Une ligne au m² garde ses dimensions.
 */
export function linesFromMapping(
  draft: MpDraftLine[],
  mapping: MpProductMapping | null,
  extraOptions: Record<string, unknown> = {}
): BuiltLine[] {
  return draft.map((d) => {
    const issues: string[] = [];
    if (!mapping?.productId) issues.push('Choisissez le produit Master Print');
    if (d.key.startsWith('dim-')) {
      return {
        key: d.key,
        config: {
          ...d.config,
          product_id: mapping?.productId || '',
          options: { ...extraOptions },
        },
        issues,
      };
    }
    const colorDoc = d.pegColor?.documentId || null;
    const color = colorDoc && mapping ? mapping.colors[colorDoc] : undefined;
    if (mapping && colorDoc && !color)
      issues.push(`Coloris « ${d.pegColor?.name || '?'} » à associer`);
    const sizes: Record<string, number> = {};
    for (const s of d.pegSizes) {
      const code =
        s.documentId && mapping ? mapping.sizes[s.documentId] : undefined;
      if (code) sizes[code] = (sizes[code] || 0) + s.quantity;
      else if (mapping && s.documentId)
        issues.push(`Taille « ${s.name} » à associer`);
    }
    const quantity = d.pegSizes.reduce((a, s) => a + s.quantity, 0);
    const markings = (mapping?.markings || []).map((m) => ({ ...m }));
    return {
      key: d.key,
      config: {
        product_id: mapping?.productId || '',
        quantity,
        options: {
          ...extraOptions,
          ...(color ? { color } : {}),
          ...(Object.keys(sizes).length ? { sizes } : {}),
          ...(markings.length ? { markings } : {}),
        },
        production_time: 'standard',
      },
      issues: [...new Set(issues)],
    };
  });
}

/** Problèmes d'une ligne saisie à la main (projet sans commande, ex. issu d'un devis). */
export function manualLineIssues(
  config: MpLineConfig,
  view: MpProductView | null | undefined
): string[] {
  const issues: string[] = [];
  if (!config.product_id || !view)
    return ['Choisissez le produit Master Print'];
  const sizes = config.options.sizes || {};
  const sizeTotal = Object.values(sizes).reduce(
    (a, n) => a + (Number(n) || 0),
    0
  );
  if (view.colors.length && !config.options.color)
    issues.push('Choisissez un coloris');
  if (view.sizes.length) {
    if (!sizeTotal) issues.push('Indiquez au moins une quantité par taille');
  } else if (view.dimensions?.perLength) {
    if (!config.length_mm) issues.push('Indiquez la longueur');
  } else if (!config.quantity) {
    issues.push('Indiquez la quantité');
  }
  if (view.dimensions && !view.dimensions.perLength) {
    const hasFormat = !!config.format;
    const hasFree = !!config.width_mm && !!config.height_mm;
    if (!hasFormat && !hasFree)
      issues.push(
        view.dimensions.freeFormat
          ? 'Choisissez un format ou des dimensions'
          : 'Choisissez un format'
      );
  }
  for (const o of view.otherOptions) {
    const v = config.options[o.code];
    if (
      o.required &&
      (v == null || v === '' || (Array.isArray(v) && !v.length))
    )
      issues.push(`Option « ${o.label} » à choisir`);
  }
  return issues;
}

/** Problèmes d'une liste de marquages (avant chiffrage : Master Print revérifie les limites). */
export function markingIssues(
  markings: MpMarking[] | undefined,
  view: MpProductView | null | undefined
): string[] {
  const list = markings || [];
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const m of list) {
    if (!m.position) {
      issues.push('Emplacement de marquage à choisir');
      continue;
    }
    if (seen.has(m.position)) issues.push('Deux marquages au même emplacement');
    seen.add(m.position);
    if (!m.format && !(Number(m.width_mm) > 0))
      issues.push('Choisissez un format ou une largeur pour chaque marquage');
    const pos = view?.markings?.positions.find((p) => p.code === m.position);
    if (pos?.maxWidthMm && Number(m.width_mm) > pos.maxWidthMm)
      issues.push(`${pos.label} : ${pos.maxWidthMm} mm de large au plus`);
  }
  if (view?.markings?.required && !list.length)
    issues.push('Ce produit demande au moins un marquage');
  return [...new Set(issues)];
}

/** Emplacements de fichier que la commande attendra : un par marquage, sinon le fichier principal. */
export function fileSlots(lines: MpLineConfig[]): string[] {
  const slots = new Set<string>();
  for (const l of lines) {
    const marks = l.options.markings || [];
    const textile = !!(l.options.sizes || l.options.color);
    if (marks.length)
      marks.forEach((m) => m.position && slots.add(`marking:${m.position}`));
    else if (!textile) slots.add('main');
  }
  return [...slots];
}

/** Libellé d'un emplacement de fichier (« marking:back » → « Marquage — Dos »). */
export function slotLabel(slot: string, view?: MpProductView | null): string {
  if (slot === 'main') return 'Fichier d’impression';
  if (slot === 'verso') return 'Verso';
  if (slot === 'delivery_note') return 'Bon de livraison du fournisseur';
  const [kind, code] = slot.split(':');
  if (kind === 'marking') {
    const pos = view?.markings?.positions.find((p) => p.code === code);
    return `Marquage — ${pos?.label || code}`;
  }
  if (kind === 'piece') return `Visuel n° ${code}`;
  return slot;
}

/** Tailles réellement vendues dans ce coloris (toutes si le catalogue ne le précise pas). */
export function sizesForColor(view: MpProductView, color?: string): string[] {
  const sold = color ? view.sizesByColor[color] : undefined;
  if (!sold || !sold.length) return view.sizes;
  return view.sizes.filter((s) => sold.includes(s));
}

/** Correspondance à mémoriser : seulement les associations remplies. */
export function mappingToSave(mapping: MpProductMapping): MpProductMapping {
  const keep = (o: Record<string, string>) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => !!v));
  return {
    productId: mapping.productId,
    productName: mapping.productName,
    colors: keep(mapping.colors),
    sizes: keep(mapping.sizes),
    markings: mapping.markings.filter(
      (m) => m.position && (m.format || Number(m.width_mm) > 0)
    ),
  };
}

// ── Commandes ───────────────────────────────────────────────────────────────

const FINAL = ['delivered', 'cancelled'];

/** Annulation proposée tant que la commande n'est ni expédiée, ni prête, ni terminée (Master Print tranche). */
export const canCancel = (status: string) =>
  !['shipped', 'delivered', 'cancelled', 'ready_for_pickup'].includes(status);

export const isFinal = (status: string) => FINAL.includes(status);

/** Étape suivante proposée en bac à sable (« Simuler »). */
export function nextSimulateEvents(status: string): MpSimulateEvent[] {
  switch (status) {
    case 'awaiting_payment':
      return ['payment_received'];
    case 'in_production':
      return ['shipped'];
    case 'shipped':
      return ['delivered'];
    default:
      return [];
  }
}

export const SIMULATE_LABELS: Record<MpSimulateEvent, string> = {
  payment_received: 'Paiement reçu',
  production_started: 'Production lancée',
  shipped: 'Expédier',
  delivered: 'Livrer',
};

export type Tone = { color: string; background: string; border: string };

export function statusTone(status: string): Tone {
  switch (status) {
    case 'in_production':
    case 'files_received':
      return {
        color: '#93c5fd',
        background: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.35)',
      };
    case 'shipped':
    case 'ready_for_pickup':
      return {
        color: '#7dd3fc',
        background: 'rgba(56,189,248,0.10)',
        border: 'rgba(56,189,248,0.30)',
      };
    case 'delivered':
      return {
        color: '#86efac',
        background: 'rgba(34,197,94,0.12)',
        border: 'rgba(34,197,94,0.35)',
      };
    case 'cancelled':
      return {
        color: '#fca5a5',
        background: 'rgba(239,68,68,0.10)',
        border: 'rgba(239,68,68,0.30)',
      };
    default:
      return {
        color: '#fcd34d',
        background: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.35)',
      };
  }
}

/** Marge du projet face au coût Master Print (HT des deux côtés). */
export function margin(
  price: number | null | undefined,
  cost: number | null | undefined
) {
  const p = Number(price);
  const c = Number(cost);
  if (!Number.isFinite(p) || p <= 0 || !Number.isFinite(c) || c <= 0)
    return null;
  const amount = Math.round((p - c) * 100) / 100;
  return { amount, rate: Math.round((amount / p) * 1000) / 10 };
}

export const fmtEur = (n: number | null | undefined) =>
  n == null || !Number.isFinite(Number(n))
    ? '—'
    : `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// ── Formulaire d'envoi ──────────────────────────────────────────────────────

/** Adresse de livraison : mêmes exigences que le serveur (nom, rue, code postal, ville, pays à 2 lettres). */
export function addressIssues(a: {
  name?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  email?: string;
}): string[] {
  const issues: string[] = [];
  if (
    !a.name?.trim() ||
    !a.street?.trim() ||
    !a.postal_code?.trim() ||
    !a.city?.trim()
  ) {
    issues.push(
      'Adresse de livraison incomplète (nom, rue, code postal, ville)'
    );
  }
  if (!/^[A-Za-z]{2}$/.test((a.country || '').trim()))
    issues.push('Pays de livraison : code à 2 lettres (FR, CH, BE…)');
  if (a.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim()))
    issues.push('E-mail de livraison invalide');
  return issues;
}

/** Options du produit pré-remplies avec leur valeur par défaut (œillets, colle, découpe…). */
export function optionDefaults(
  view: MpProductView | null | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const o of view?.otherOptions || []) {
    const d = o.values.filter((v) => v.default).map((v) => v.code);
    if (d.length) out[o.code] = o.type === 'multi_select' ? d : d[0];
  }
  return out;
}

/** Options requises sans valeur. */
export function optionIssues(
  view: MpProductView | null | undefined,
  options: Record<string, unknown>
): string[] {
  return (view?.otherOptions || [])
    .filter((o) => o.required)
    .filter((o) => {
      const v = options[o.code];
      return v == null || v === '' || (Array.isArray(v) && !v.length);
    })
    .map((o) => `Option « ${o.label} » à choisir`);
}

/**
 * Clé d'envoi (Idempotency-Key) : la même tant que l'envoi peut avoir abouti
 * (pas de réponse, Master Print indisponible), pour qu'un nouvel essai rende la
 * commande d'origine au lieu d'en créer une seconde ; une nouvelle après un refus
 * net (configuration invalide), sinon Master Print répondrait « conflit ».
 */
export function nextIdempotencyKey(
  current: string,
  status: number | undefined
): string {
  if (status === undefined || status === 502 || status === 503 || status >= 500)
    return current;
  const c = globalThis.crypto as Crypto | undefined;
  return c?.randomUUID
    ? c.randomUUID()
    : `peg-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
}

// ── Erreurs du serveur ──────────────────────────────────────────────────────

/** Message d'erreur du serveur (sinon `fallback`). */
export const masterPrintError = (err: unknown, fallback: string): string => {
  const data = (
    err as { response?: { data?: { error?: unknown; message?: unknown } } }
  )?.response?.data;
  const msg = data?.error ?? data?.message;
  return typeof msg === 'string' && msg ? msg : fallback;
};

/**
 * Route absente (front déployé avant Strapi) : l'onglet affiche « Module
 * indisponible ». Un 404 du module lui-même (« Projet introuvable ») porte un
 * message texte dans `error` ; celui de Strapi, un objet.
 */
export const isMasterPrintMissing = (err: unknown): boolean => {
  const res = (
    err as { response?: { status?: number; data?: { error?: unknown } } }
  )?.response;
  return (
    (res?.status === 404 || res?.status === 405) &&
    typeof res?.data?.error !== 'string'
  );
};
