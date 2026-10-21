// Écran mural : le village en plein écran sur une télévision (atelier,
// bureau). La caméra fait seule le tour des quartiers, les chiffres clés sont
// en grand, les derniers évènements défilent en bas. Fonctions pures, testées.
import dayjs from 'dayjs';
import {
  DISTRICTS,
  MAP_H,
  MAP_W,
  membersOf,
  type DistrictId,
  type SectionId,
} from './villageScene';
import type { SectionData } from './villageModel';
import { activitySection, type ActivityNotification } from './villageActivity';

export type WallStop =
  | { kind: 'overview' }
  | { kind: 'district'; id: DistrictId };

/** Durée d'une étape (ms) : vue d'ensemble, quartier, quartier en alerte. */
export const WALL_OVERVIEW_MS = 12_000;
export const WALL_DISTRICT_MS = 14_000;
export const WALL_ALERT_MS = 18_000;
/** Une notification arrive : la caméra va au bâtiment, puis reprend le tour. */
export const WALL_LIVE_MS = 12_000;
/** Zoom de la caméra : vue d'ensemble, quartier, bâtiment (notification). */
export const WALL_ZOOM = { overview: 1, district: 1.6, live: 1.9 };

/** Le tour : vue d'ensemble, puis chaque quartier dans l'ordre de la carte. */
export const wallStops = (): WallStop[] => [
  { kind: 'overview' },
  ...DISTRICTS.map((d) => ({ kind: 'district' as const, id: d.id })),
];

/** Un quartier qui a une alerte reste un peu plus longtemps à l'écran. */
export const stopDuration = (
  stop: WallStop,
  sections: Partial<Record<SectionId, SectionData>>
) =>
  stop.kind === 'overview'
    ? WALL_OVERVIEW_MS
    : membersOf(stop.id).some((id) => sections[id]?.alert)
      ? WALL_ALERT_MS
      : WALL_DISTRICT_MS;

export interface WallLine {
  id: SectionId;
  text: string;
  alert: boolean;
  badge: string | null;
}

/**
 * Légende d'un quartier : une ligne par bâtiment, les alertes d'abord, puis
 * ce qui demande une action, puis le reste (ordre du menu à égalité).
 * Jamais de montant : l'écran est vu de tous.
 */
export const districtLines = (
  id: DistrictId,
  sections: Partial<Record<SectionId, SectionData>>
): WallLine[] => {
  const rank = (s: SectionData | undefined) =>
    s?.alert ? 0 : s?.attention ? 1 : 2;
  return membersOf(id)
    .map((m, i) => ({ m, i, s: sections[m] }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map(({ m, s }) => ({
      id: m,
      text: s ? (s.alert ?? s.chip) : 'Données indisponibles',
      alert: !!s?.alert,
      badge: s?.badge ?? null,
    }));
};

export interface TickerItem {
  key: string;
  /** « 14:31 », « hier 14:31 », « lun. 20 oct. ». */
  time: string;
  text: string;
  /** Bâtiment concerné (icône) ; null si la notification ne le dit pas. */
  section: SectionId | null;
}

export const tickerTime = (iso: string, now: Date) => {
  const d = dayjs(iso);
  const today = dayjs(now);
  if (d.isSame(today, 'day')) return d.format('HH:mm');
  if (d.isSame(today.subtract(1, 'day'), 'day'))
    return `hier ${d.format('HH:mm')}`;
  return d.format('ddd D MMM');
};

/**
 * Fil des derniers évènements : les notifications de la cloche, la plus
 * récente d'abord. Seulement le titre (le message peut contenir un montant).
 */
export const tickerItems = (
  list: ActivityNotification[],
  now: Date,
  max = 12
): TickerItem[] =>
  list
    .filter((n) => n.createdAt && Number.isFinite(Date.parse(n.createdAt)))
    .sort((a, b) => Date.parse(b.createdAt!) - Date.parse(a.createdAt!))
    .slice(0, max)
    .map((n) => ({
      key: String(n._id),
      time: tickerTime(n.createdAt!, now),
      text: (n.title || 'Nouvelle activité').trim(),
      section: activitySection(n),
    }));

/** Échelle de l'écran : 1 = télévision 1920 × 1080 (4K à l'échelle 2 = 1). */
export const wallScale = (width: number, height: number) =>
  Math.max(0.6, Math.min(width / 1920, height / 1080));

/**
 * Taille de la carte dans son cadre, proportions gardées : elle le remplit
 * (pas de bandes vides sur les côtés quand la caméra zoome), quitte à rogner
 * un peu de ciel — jamais plus de 8 % ; au-delà, elle tient entière.
 */
export const fitMap = (boxW: number, boxH: number, maxCrop = 0.08) => {
  if (boxW <= 0 || boxH <= 0) return { w: 0, h: 0 };
  const ratio = MAP_W / MAP_H;
  const contain = Math.min(boxW, boxH * ratio);
  const cover = Math.max(boxW, boxH * ratio);
  const w = cover <= contain * (1 + maxCrop) ? cover : contain;
  return { w: Math.ceil(w), h: Math.ceil(w / ratio) };
};
