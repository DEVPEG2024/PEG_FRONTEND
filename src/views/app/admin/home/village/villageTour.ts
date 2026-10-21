// « Ma tournée du jour » : les bâtiments qui demandent une action, les urgences
// d'abord puis dans l'ordre du menu. Les étapes déjà vues aujourd'hui sont
// retenues sur l'appareil (on reprend la tournée là où on l'a laissée).
import { MENU_ORDER, type SectionId } from './villageScene';
import type { SectionData } from './villageModel';

export const tourSteps = (
  sections: Partial<Record<SectionId, SectionData>>
): SectionId[] => {
  const todo = MENU_ORDER.filter((id) => {
    const s = sections[id];
    return !!s && (s.attention || !!s.alert);
  });
  return [
    ...todo.filter((id) => sections[id]?.alert),
    ...todo.filter((id) => !sections[id]?.alert),
  ];
};

const KEY = 'peg:villageTour';

const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Étapes vues aujourd'hui (la liste repart de zéro chaque jour). */
export const readSeen = (now = new Date()): SectionId[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && v.date === today(now) && Array.isArray(v.seen) ? v.seen : [];
  } catch {
    return [];
  }
};

export const markSeen = (id: SectionId, now = new Date()): SectionId[] => {
  const seen = readSeen(now);
  const next = seen.includes(id) ? seen : [...seen, id];
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today(now), seen: next }));
  } catch {
    // stockage indisponible : la tournée ne reprend pas, rien d'autre
  }
  return next;
};

/** Première étape pas encore vue (sinon la première). */
export const resumeIndex = (steps: SectionId[], seen: SectionId[]) => {
  const i = steps.findIndex((id) => !seen.includes(id));
  return i < 0 ? 0 : i;
};
