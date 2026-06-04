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
