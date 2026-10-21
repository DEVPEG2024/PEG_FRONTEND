// Titre, icône et page de chaque bâtiment : lus dans la navigation admin, pour
// que le village reprenne toujours les libellés exacts du menu.
import navigationAdmin from '@/configs/navigation.config/admin';
import type { NavigationTree } from '@/@types/navigation';
import type { SectionId } from './villageScene';

const NAV_KEY: Record<SectionId, string> = {
  accueil: 'admin.home',
  calendrier: 'admin.calendar',
  projets: 'admin.projects.list',
  planning: 'admin.planning',
  devis: 'admin.quotes',
  leads: 'admin.leads',
  clients: 'admin.customers',
  premium: 'admin.premium',
  generateurs: 'admin.generators',
  producteurs: 'admin.producers',
  boutique: 'admin.store',
  attributs: 'admin.attributes',
  fournisseurs: 'admin.suppliers',
  finance: 'admin.finance',
  bannieres: 'admin.banners',
  campagnes: 'admin.campaigns',
  ia: 'admin.ia',
  utilisateurs: 'admin.users',
  tickets: 'admin.support',
  parametres: 'admin.settings',
};

/** Phrase sous le titre de la fiche (sous-rubriques du menu, ou rôle de la rubrique). */
const SUB: Record<SectionId, string> = {
  accueil: 'Bannière, pense-bête et widgets du tableau de bord',
  calendrier: 'Rendez-vous et livraisons',
  projets: 'Projets en cours, BAT et échéances',
  planning: 'Charge des producteurs',
  devis: 'Devis envoyés et acceptés',
  leads: 'Prospects à recontacter',
  clients: '',
  premium: 'Abonnés Premium et leurs offres',
  generateurs: 'Apporteurs d’affaires et commissions',
  producteurs: '',
  boutique: '',
  attributs: '',
  fournisseurs: '',
  finance: '',
  bannieres: 'Bannières des espaces clients',
  campagnes: 'Notifications et e-mails aux clients',
  ia: '',
  utilisateurs: 'Comptes et rôles',
  tickets: 'Demandes d’assistance des clients',
  parametres: 'Profil, entreprise et paiements',
};

/** Page ouverte par le bouton de la fiche (sinon : celle du menu). */
const TARGET: Partial<Record<SectionId, { to: string; cta: string }>> = {
  boutique: { to: '/admin/store/orders', cta: 'Voir les commandes' },
  finance: { to: '/admin/invoices', cta: 'Voir les factures' },
};

const CTA: Record<SectionId, string> = {
  accueil: 'Ouvrir la vue classique',
  calendrier: 'Ouvrir le calendrier',
  projets: 'Ouvrir les projets',
  planning: 'Ouvrir le planning',
  devis: 'Ouvrir les devis',
  leads: 'Ouvrir les leads',
  clients: 'Ouvrir les clients',
  premium: 'Ouvrir Premium',
  generateurs: 'Ouvrir les générateurs',
  producteurs: 'Ouvrir les producteurs',
  boutique: 'Voir les commandes',
  attributs: 'Ouvrir les attributs',
  fournisseurs: 'Ouvrir le catalogue Imbretex',
  finance: 'Voir les factures',
  bannieres: 'Ouvrir les bannières',
  campagnes: 'Ouvrir les campagnes',
  ia: 'Ouvrir l’IA',
  utilisateurs: 'Ouvrir les utilisateurs',
  tickets: 'Ouvrir les tickets',
  parametres: 'Ouvrir les paramètres',
};

const findNav = (
  tree: NavigationTree[],
  key: string
): NavigationTree | undefined => {
  for (const n of tree) {
    // Les groupes sont emballés dans un titre vide portant la même clé : on
    // garde l'élément qui porte le libellé.
    if (n.key === key && n.title) return n;
    const inner = findNav(n.subMenu ?? [], key);
    if (inner) return inner;
  }
  return undefined;
};

export interface SectionInfo {
  title: string;
  icon: string;
  sub: string;
  to: string;
  cta: string;
}

export const SECTION_INFO = Object.fromEntries(
  (Object.keys(NAV_KEY) as SectionId[]).map((id) => {
    const nav = findNav(navigationAdmin, NAV_KEY[id]);
    const children = (nav?.subMenu ?? []).map((c) => c.title).filter(Boolean);
    return [
      id,
      {
        title: nav?.title ?? id,
        icon: nav?.icon ?? 'home',
        sub: SUB[id] || children.join(' · '),
        to: TARGET[id]?.to ?? nav?.path ?? '/home',
        cta: CTA[id],
      },
    ];
  })
) as Record<SectionId, SectionInfo>;
