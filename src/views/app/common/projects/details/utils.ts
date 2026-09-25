import { env } from '@/configs/env.config';
import type { Project } from '@/@types/project';

export const labelList = [
  'Accueil',
  'Commentaires',
  'Fichiers',
  'Fichiers client',
  'Checklist',
  'BAT',
  'Devis',
  'Factures',
  'Dépenses',
  'Ventes add.',
  'SAV',
];


const resolveUrl = (url: string) => (url.startsWith('http') ? url : env.API_ENDPOINT_URL + url);

/**
 * Photo du projet : celle du produit commandé, sinon la première image du
 * projet (même règle que l'onglet Accueil depuis toujours).
 */
export function projectCoverUrl(project: Project): string | null {
  const url = project.orderItem?.product?.images?.[0]?.url || project.images?.[0]?.url;
  return url ? resolveUrl(url) : null;
}

/**
 * Avancement affiché partout pour un projet : la checklist (valeur à jour du
 * store une fois l'onglet ouvert, sinon ses cases), à défaut les tâches.
 * Même calcul que la carte de la liste des projets.
 */
export function projectProgress(
  project: Project,
  checklistPercent: number | null = null
): { percent: number; source: 'checklist' | 'tasks' } {
  if (checklistPercent !== null) return { percent: checklistPercent, source: 'checklist' };
  const items = project.checklistItems ?? [];
  if (items.length > 0) {
    return { percent: Math.round((items.filter((i) => i.done).length / items.length) * 100), source: 'checklist' };
  }
  const tasks = project.tasks ?? [];
  const done = tasks.filter((t) => t.state === 'fulfilled').length;
  return { percent: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0, source: 'tasks' };
}
