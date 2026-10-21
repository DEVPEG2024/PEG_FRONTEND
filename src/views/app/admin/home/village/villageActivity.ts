// Activité en direct : une notification reçue pendant que le village est
// affiché fait apparaître une bulle au-dessus du bâtiment concerné. Les
// notifications sont celles que la cloche tient déjà à jour (polling de
// 5 s en production) : aucun appel en plus. Fonctions pures, testées.
import type { SectionId } from './villageScene';

export interface ActivityNotification {
  /** Numérique à l'exécution (SERIAL côté peg-backend), typé string dans le store. */
  _id: string | number;
  eventType: string;
  title?: string;
  link?: string;
  createdAt?: string;
}

export interface VillageActivity {
  /** Identifiant de la notification : relance l'animation à chaque nouvelle. */
  key: string;
  /** Identifiant tel que le store le garde (nombre à l'exécution) : « lu » au clic. */
  rawId: string | number;
  id: SectionId;
  text: string;
  /** Page à ouvrir au clic (celle de la notification) ; null = la fiche du bâtiment. */
  link: string | null;
}

/**
 * Lien d'une notification utilisable dans l'application : chemin interne
 * seulement, et les liens connus pour ne mener nulle part corrigés
 * (Strapi envoie « /admin/tickets/<id> », la page des tickets est « /support »).
 */
export const safeLink = (link: string | null | undefined): string | null => {
  if (!link || typeof link !== 'string') return null;
  if (!link.startsWith('/') || link.startsWith('//')) return null;
  if (link.startsWith('/admin/tickets')) return '/support';
  return link;
};

/** Le lien de la notification désigne la rubrique (le plus précis d'abord). */
const BY_LINK: [string, SectionId][] = [
  ['/admin/invoices', 'finance'],
  ['/admin/expenses', 'finance'],
  ['/admin/generators', 'generateurs'],
  ['/admin/premium', 'premium'],
  ['/admin/store', 'boutique'],
  ['/admin/products', 'boutique'],
  ['/common/quotes', 'devis'],
  ['/admin/campaigns', 'campagnes'],
  ['/admin/customers', 'clients'],
  ['/admin/producers', 'producteurs'],
  ['/admin/leads', 'leads'],
  ['/admin/planning', 'planning'],
  ['/admin/calendar', 'calendrier'],
  ['/admin/tickets', 'tickets'],
  ['/support', 'tickets'],
  ['/common/projects', 'projets'],
];

/** Sinon, le type d'évènement (mêmes familles que les pastilles du menu). */
const BY_EVENT: Record<string, SectionId> = {
  new_ticket: 'tickets',
  new_invoice: 'finance',
  payment_received: 'finance',
  new_order: 'boutique',
  project_status_change: 'projets',
  new_comment: 'projets',
  new_file: 'projets',
  new_task: 'projets',
  task_status_change: 'projets',
  campaign: 'campagnes',
};

export const activitySection = (n: ActivityNotification): SectionId | null => {
  const link = n.link || '';
  const hit = BY_LINK.find(([prefix]) => link.startsWith(prefix));
  return hit ? hit[1] : (BY_EVENT[n.eventType] ?? null);
};

export const maxNotificationId = (list: ActivityNotification[]) =>
  list.reduce((m, n) => Math.max(m, Number(n._id) || 0), 0);

/**
 * Notifications arrivées depuis l'ouverture du village : identifiant plus
 * grand que le dernier vu, et créées après `since` (la liste du store est
 * rechargée depuis l'appareil au démarrage : ce qui est arrivé pendant
 * l'absence n'est pas « en direct »).
 */
export const liveNotifications = (
  list: ActivityNotification[],
  lastId: number,
  since: number
) =>
  list.filter((n) => {
    if ((Number(n._id) || 0) <= lastId) return false;
    const at = n.createdAt ? Date.parse(n.createdAt) : NaN;
    return Number.isFinite(at) && at >= since;
  });

/** Une bulle par bâtiment (la plus récente), au plus `max` à la fois. */
export const activityBubbles = (
  fresh: ActivityNotification[],
  max = 4
): VillageActivity[] => {
  const out: VillageActivity[] = [];
  [...fresh]
    .sort((a, b) => (Number(b._id) || 0) - (Number(a._id) || 0))
    .forEach((n) => {
      const id = activitySection(n);
      if (!id || out.some((b) => b.id === id) || out.length >= max) return;
      out.push({
        key: String(n._id),
        rawId: n._id,
        id,
        text: (n.title || 'Nouvelle activité').trim(),
        link: safeLink(n.link),
      });
    });
  return out;
};
