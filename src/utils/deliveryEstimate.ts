/**
 * Date d'expédition prévue d'un produit relié à l'imprimeur partenaire —
 * formatage PUR (testé : src/__tests__/deliveryEstimate.test.ts).
 *
 * Le serveur calcule la date (`GET /configurator/:productDocumentId/delivery` :
 * délais, jours fériés, heure limite, fuseau de Paris) ; ici on l'écrit en
 * français : « Commandez avant 10 h : expédition prévue le mardi 24 novembre ».
 * Quand le formulaire a un prix, la date rendue avec ce prix prime.
 * Aucun nom d'imprimeur : ces textes sont lus par les clients.
 */

export type DeliveryEstimate = {
  /** AAAA-MM-JJ ; null = délai confirmé à la commande (rien n'est affiché). */
  shipDate: string | null;
  workingDays: number | null;
  /** « HH:MM » ; null = pas d'heure limite pour ce produit. */
  orderBefore: string | null;
  /** Jour de l'heure limite (AAAA-MM-JJ). */
  orderBeforeDate: string | null;
  /** Heure limite en instant ISO : une fois passée, l'estimation est relue. */
  orderBeforeAt: string | null;
  /** Date du jour (Paris) au moment du calcul. */
  today: string;
};

const TIME_ZONE = 'Europe/Paris';
const DAYS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})/;

const parseIso = (iso: string | null | undefined) => {
  const m = ISO_RE.exec(iso || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDays = (iso: string, n: number): string | null => {
  const d = parseIso(iso);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** « mardi 24 novembre », « mardi 1er décembre ». */
export function dayLabel(iso: string | null | undefined): string | null {
  const d = parseIso(iso);
  if (!d) return null;
  const day = d.getUTCDate();
  return `${DAYS[d.getUTCDay()]} ${day === 1 ? '1er' : day} ${MONTHS[d.getUTCMonth()]}`;
}

/** « 10:00 » → « 10 h » ; « 12:30 » → « 12 h 30 ». */
export function hourLabel(hhmm: string | null | undefined): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return min ? `${h} h ${String(min).padStart(2, '0')}` : `${h} h`;
}

/** Date du jour à Paris (le navigateur peut être ailleurs). */
export function parisToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Heure limite passée : l'estimation doit être relue. */
export function isStale(
  est: DeliveryEstimate | null,
  now: Date = new Date()
): boolean {
  if (!est?.orderBeforeAt) return false;
  const t = Date.parse(est.orderBeforeAt);
  return Number.isFinite(t) && now.getTime() >= t;
}

/**
 * Délai avant de relire l'estimation (heure limite atteinte) ; null = pas avant 12 h.
 * Déjà passée (horloge du navigateur en avance sur le serveur) : une minute, jamais en rafale.
 */
export function refreshDelayMs(
  est: DeliveryEstimate | null,
  now: Date = new Date()
): number | null {
  if (!est?.orderBeforeAt) return null;
  const t = Date.parse(est.orderBeforeAt);
  if (!Number.isFinite(t)) return null;
  const ms = t - now.getTime();
  if (ms > 12 * 3600 * 1000) return null;
  return ms <= 0 ? 60_000 : ms + 1000;
}

/**
 * La date rendue avec le prix du formulaire vaut-elle encore ? Non si une heure limite
 * est passée depuis son calcul : celle d'une estimation périmée (pas encore relue), ou
 * `passedCutoffAt`, la dernière franchie pendant la visite. Sans heure de calcul connue,
 * elle ne vaut que si aucune heure limite n'est passée.
 */
export function formDateValid(
  est: DeliveryEstimate | null,
  opts: {
    formPricedAt?: number | null;
    passedCutoffAt?: number | null;
    now?: Date;
  } = {}
): boolean {
  const now = opts.now ?? new Date();
  const limits: number[] = [];
  if (opts.passedCutoffAt != null && Number.isFinite(opts.passedCutoffAt))
    limits.push(opts.passedCutoffAt);
  if (est?.orderBeforeAt && isStale(est, now))
    limits.push(Date.parse(est.orderBeforeAt));
  if (!limits.length) return true;
  const at = opts.formPricedAt;
  return (
    typeof at === 'number' && Number.isFinite(at) && at >= Math.max(...limits)
  );
}

const shipPhrase = (shipDate: string, today: string): string | null => {
  const label = dayLabel(shipDate);
  if (!label) return null;
  if (shipDate === today) return 'expédition aujourd’hui';
  if (shipDate === addDays(today, 1))
    return `expédition prévue demain, ${label}`;
  return `expédition prévue le ${label}`;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Ligne affichée sur la fiche produit (null = rien à afficher).
 *  - « Commandez avant 10 h : expédition prévue le mardi 24 novembre »
 *  - heure limite passée : « Commandez avant demain 10 h : … » / « avant lundi 10 h : … »
 *  - sans heure limite : « Expédition prévue le mardi 1er décembre »
 * `formShipDate` (date rendue avec le prix du formulaire) prime : si elle diffère de
 * l'estimation, elle seule est affichée, sans heure limite. Calculée avant une heure
 * limite passée depuis (`formDateValid`), elle est périmée : jamais affichée.
 */
export function deliveryLine(
  est: DeliveryEstimate | null,
  opts: {
    formShipDate?: string | null;
    /** Instant (ms) du calcul de ce prix. */
    formPricedAt?: number | null;
    /** Dernière heure limite franchie pendant la visite (ms). */
    passedCutoffAt?: number | null;
    now?: Date;
  } = {}
): string | null {
  const now = opts.now ?? new Date();
  const today = parisToday(now);
  const form =
    parseIso(opts.formShipDate) && formDateValid(est, { ...opts, now })
      ? (opts.formShipDate as string).slice(0, 10)
      : null;
  const usable = est?.shipDate && !isStale(est, now) ? est : null;
  if (form && (!usable || usable.shipDate !== form)) {
    const p = shipPhrase(form, today);
    return p ? capitalize(p) : null;
  }
  if (!usable?.shipDate) return null;
  const ship = shipPhrase(usable.shipDate, today);
  if (!ship) return null;
  const hour = hourLabel(usable.orderBefore);
  if (!hour || !usable.orderBeforeDate) return capitalize(ship);
  const when =
    usable.orderBeforeDate === today
      ? ''
      : usable.orderBeforeDate === addDays(today, 1)
        ? 'demain '
        : `${(dayLabel(usable.orderBeforeDate) || '').split(' ')[0]} `;
  return `Commandez avant ${when}${hour} : ${ship}`;
}

/** Panne passagère du service (503 « indisponible ») : message calme, nouvel essai au prochain changement. */
export const UNAVAILABLE_MESSAGE =
  'Ce produit est momentanément indisponible. Réessayez dans quelques minutes.';

export function isServiceUnavailable(e: unknown): boolean {
  const r = (
    e as { response?: { status?: number; data?: { unavailable?: unknown } } }
  )?.response;
  return r?.status === 503 && r.data?.unavailable === true;
}
