import type { NavigationTree } from '@/@types/navigation';
import type { Customer } from '@/@types/customer';

// Règles UNIQUES du menu, partagées par la barre latérale (bureau), le menu du
// téléphone et la barre d'onglets du téléphone : mêmes entrées, même ordre,
// mêmes pastilles partout. Une règle ajoutée ici vaut pour les trois.

const NAV_ORDER_STORAGE_KEY = 'peg_nav_order_v2';

export function hasNavAuthority(
  authority: string[],
  userAuthority: string[]
): boolean {
  if (!authority || authority.length === 0) return true;
  return authority.some((a) => userAuthority.includes(a));
}

/** Ordre choisi par l'utilisateur (glisser-déposer dans la barre latérale). */
export function getStoredNavOrder(items: NavigationTree[]): NavigationTree[] {
  try {
    const stored = localStorage.getItem(NAV_ORDER_STORAGE_KEY);
    if (!stored) return items;
    const order: string[] = JSON.parse(stored);
    const itemMap: Record<string, NavigationTree> = {};
    items.forEach((item) => {
      itemMap[item.key] = item;
    });
    const reordered = order.filter((k) => itemMap[k]).map((k) => itemMap[k]);
    items.forEach((item) => {
      if (!order.includes(item.key)) reordered.push(item);
    });
    return reordered;
  } catch {
    return items;
  }
}

export function saveNavOrder(items: NavigationTree[]) {
  localStorage.setItem(
    NAV_ORDER_STORAGE_KEY,
    JSON.stringify(items.map((i) => i.key))
  );
}

/** Client sans accès catalogue : ni « Catalogue » ni « Mes offres ». */
export function filterNavForCatalogAccess(
  tree: NavigationTree[],
  customer?: Pick<Customer, 'catalogAccess'> | null
): NavigationTree[] {
  if (customer && customer.catalogAccess === false) {
    return tree.filter(
      (item) =>
        item.key !== 'customer.catalogue' && item.key !== 'customer.products'
    );
  }
  return tree;
}

/** Entrées de premier niveau visibles, dans l'ordre du menu de l'utilisateur. */
export function getVisibleNavItems(
  tree: NavigationTree[],
  {
    userAuthority,
    isAdmin,
    isCustomerPremium,
  }: { userAuthority: string[]; isAdmin: boolean; isCustomerPremium: boolean }
): NavigationTree[] {
  const filtered = tree.filter((item) => {
    if (!hasNavAuthority(item.authority, userAuthority)) return false;
    // "Mes offres" (offres personnalisées) est réservé aux clients Premium (abonnement).
    // Les clients Standard (inscription autonome) ne le voient pas.
    if (item.key === 'customer.products' && !isAdmin && !isCustomerPremium)
      return false;
    return true;
  });
  return getStoredNavOrder(filtered);
}

/**
 * Entrée de la barre d'onglets du téléphone : une page, ou une catégorie du
 * menu (« Clients », « Finance »…) qui mène à sa première page.
 */
export type DockEntry = {
  key: string;
  path: string;
  title: string;
  icon: string;
  /** Sous-page : la catégorie du menu qui la contient */
  group?: string;
  /** Catégorie : ses pages (l'onglet est actif sur chacune d'elles) */
  pages?: NavigationTree[];
};

// Même lecture des catégories que la barre latérale (CustomVerticalMenu.renderGroup)
function readNavGroup(nav: NavigationTree, userAuthority: string[]) {
  const head = nav.subMenu.length === 1 ? nav.subMenu[0] : nav;
  const items =
    nav.subMenu.length === 1 && nav.subMenu[0].subMenu.length > 0
      ? nav.subMenu[0].subMenu
      : nav.subMenu;
  const pages = items.filter(
    (p) => p.path && hasNavAuthority(p.authority, userAuthority)
  );
  return { title: head.title, icon: head.icon, pages };
}

/**
 * Tout ce qui peut aller dans la barre d'onglets, dans l'ordre du menu :
 * chaque entrée du premier niveau (page ou catégorie), suivie des pages de
 * la catégorie. `items` = entrées visibles (getVisibleNavItems).
 */
export function getDockEntries(
  items: NavigationTree[],
  userAuthority: string[]
): DockEntry[] {
  return items.flatMap((nav): DockEntry[] => {
    if (!nav.subMenu?.length) {
      return nav.path
        ? [{ key: nav.key, path: nav.path, title: nav.title, icon: nav.icon }]
        : [];
    }
    const { title, icon, pages } = readNavGroup(nav, userAuthority);
    if (!pages.length) return [];
    return [
      { key: nav.key, path: pages[0].path, title, icon, pages },
      ...pages.map((p) => ({
        key: p.key,
        path: p.path,
        title: p.title,
        icon: p.icon,
        group: title,
      })),
    ];
  });
}

const DOCK_TABS_STORAGE_KEY = 'peg_dock_tabs_v1';

/** Profil de l'utilisateur : un admin et un client qui partagent le même
 *  téléphone gardent chacun leur barre. */
export const dockScope = (userAuthority: string[]) =>
  [...userAuthority].sort().join(',') || 'guest';

function readDockStore(): Record<string, unknown> {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(DOCK_TABS_STORAGE_KEY) || '{}'
    );
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Onglets choisis sur cet appareil, null = barre par défaut. */
export function getStoredDockKeys(scope: string): string[] | null {
  const keys = readDockStore()[scope];
  return Array.isArray(keys) && keys.every((k) => typeof k === 'string')
    ? keys
    : null;
}

/** null rétablit la barre par défaut. */
export function saveDockKeys(scope: string, keys: string[] | null) {
  const store = readDockStore();
  if (keys) store[scope] = keys;
  else delete store[scope];
  try {
    localStorage.setItem(DOCK_TABS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour la session
  }
}

/**
 * Onglets affichés : le choix de l'utilisateur, limité aux entrées qu'il voit
 * encore ; sinon le premier niveau du menu, dans l'ordre de sa barre latérale.
 */
export function resolveDockTabs(
  entries: DockEntry[],
  stored: string[] | null
): DockEntry[] {
  if (stored) {
    const byKey = new Map(entries.map((e) => [e.key, e]));
    const tabs = stored.flatMap((k) => byKey.get(k) ?? []);
    if (tabs.length) return tabs;
  }
  return entries.filter((e) => !e.group);
}

/**
 * Onglet de la page affichée : le chemin le plus précis l'emporte (« Tailles »
 * plutôt que « Liste des produits »), puis une page plutôt que sa catégorie.
 */
export function findActiveDockTab(
  tabs: DockEntry[],
  pathname: string
): DockEntry | undefined {
  let best: DockEntry | undefined;
  let bestScore = 0;
  for (const tab of tabs) {
    const paths = tab.pages ? tab.pages.map((p) => p.path) : [tab.path];
    for (const path of paths) {
      if (!path || !pathname.startsWith(path)) continue;
      const score = path.length * 2 + (tab.pages ? 0 : 1);
      if (score > bestScore) {
        best = tab;
        bestScore = score;
      }
    }
  }
  return best;
}

export type NavCounters = {
  quoteCount: number;
  premiumCount: number;
  payoutRequestCount: number;
};

export type NavBadge = {
  count: number;
  color: string;
  glow: string;
};

/**
 * Pastille d'une entrée : devis en attente (violet), clients Premium à traiter
 * (jaune), retraits à verser (orange — la couleur « en attente » des wallets),
 * sinon nouveautés lues dans les notifications (rouge). null si rien.
 */
export function getNavBadge(
  path: string,
  activityCount: number,
  { quoteCount, premiumCount, payoutRequestCount }: NavCounters
): NavBadge | null {
  if (path === '/common/quotes') {
    return quoteCount > 0
      ? { count: quoteCount, color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' }
      : null;
  }
  if (path === '/admin/premium') {
    return premiumCount > 0
      ? { count: premiumCount, color: '#eab308', glow: 'rgba(234,179,8,0.6)' }
      : null;
  }
  if (path === '/admin/generators') {
    return payoutRequestCount > 0
      ? {
          count: payoutRequestCount,
          color: '#fb923c',
          glow: 'rgba(251,146,60,0.6)',
        }
      : null;
  }
  return activityCount > 0
    ? { count: activityCount, color: '#ef4444', glow: 'rgba(239,68,68,0.6)' }
    : null;
}
