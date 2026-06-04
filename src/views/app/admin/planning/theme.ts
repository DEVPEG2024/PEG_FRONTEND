import { RiskLevel } from '@/utils/planning/scheduler';

/** Couleurs par niveau de risque (cohérentes avec les statuts projet). */
export const RISK_COLOR: Record<RiskLevel, string> = {
  late: '#ef4444',
  tight: '#f59e0b',
  ok: '#22c55e',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  late: 'En retard',
  tight: 'Serré',
  ok: 'OK',
};

/** Accent de la page Planning (bleu indigo). */
export const PLANNING_ACCENT = '#6366f1';

/** Palette de couleurs distinctes par projet (pour suivre un projet d'un jour à l'autre). */
const PROJECT_PALETTE = [
  '#6366f1', '#22d3ee', '#f59e0b', '#ec4899', '#10b981', '#a78bfa',
  '#f472b6', '#34d399', '#60a5fa', '#fbbf24', '#fb7185', '#4ade80',
  '#818cf8', '#2dd4bf', '#facc15', '#c084fc',
];

/** Couleur stable d'un projet à partir de son documentId. */
export function projectColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PROJECT_PALETTE[h % PROJECT_PALETTE.length];
}

/** Statut "ludique" d'un producteur selon son % de charge. */
export function loadStatus(pct: number): { emoji: string; label: string; color: string } {
  if (pct <= 0) return { emoji: '🌱', label: 'libre', color: '#34d399' };
  if (pct < 70) return { emoji: '😌', label: 'tranquille', color: RISK_COLOR.ok };
  if (pct <= 100) return { emoji: '⚡', label: 'chargé', color: RISK_COLOR.tight };
  return { emoji: '🔥', label: 'surchargé', color: RISK_COLOR.late };
}

export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function formatDayShort(d: Date): { dow: string; dom: string } {
  return {
    dow: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
    dom: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
  };
}

export function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}
