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
