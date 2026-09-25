import navigationConfig from '@/configs/navigation.config';
import {
  dockScope,
  findActiveDockTab,
  getDockEntries,
  getStoredDockKeys,
  getVisibleNavItems,
  resolveDockTabs,
  saveDockKeys,
} from '@/utils/navMenu';

// Barre d'onglets du téléphone (MobileDock) : ce qu'elle propose, ce qu'elle
// retient, quel onglet est allumé.

const memory: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => (k in memory ? memory[k] : null),
    setItem: (k: string, v: string) => {
      memory[k] = v;
    },
    removeItem: (k: string) => {
      delete memory[k];
    },
  },
  configurable: true,
});

const entriesFor = (authority: string[], isCustomerPremium = true) => {
  const isAdmin =
    authority.includes('admin') || authority.includes('super_admin');
  const items = getVisibleNavItems(navigationConfig, {
    userAuthority: authority,
    isAdmin,
    isCustomerPremium,
  });
  return getDockEntries(items, authority);
};

const ROLES = [
  ['admin'],
  ['super_admin'],
  ['customer'],
  ['producer'],
  ['generator'],
];

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k]);
});

describe('entrées de la barre', () => {
  it.each(ROLES)(
    'clés uniques pour le rôle %s (une clé = un onglet)',
    (role) => {
      const keys = entriesFor([role]).map((e) => e.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  );

  it('chaque entrée mène à une page', () => {
    for (const role of ROLES) {
      for (const entry of entriesFor(role)) {
        expect(entry.path).toMatch(/^\//);
      }
    }
  });

  it('admin : par défaut, un onglet par entrée du menu, catégories comprises', () => {
    const tabs = resolveDockTabs(entriesFor(['admin']), null);
    const titles = tabs.map((t) => t.title);
    expect(titles).toEqual(
      expect.arrayContaining(['Accueil', 'Clients', 'Finance', 'Tickets'])
    );
    expect(tabs.every((t) => !t.group)).toBe(true);
    const clients = tabs.find((t) => t.title === 'Clients')!;
    expect(clients.path).toBe('/admin/customers/list');
    expect(clients.pages?.map((p) => p.title)).toEqual([
      'Liste des clients',
      'Catégories',
    ]);
  });

  it('admin : les pages des catégories peuvent être épinglées', () => {
    const invoices = entriesFor(['admin']).find(
      (e) => e.key === 'admin.invoices'
    );
    expect(invoices).toMatchObject({ title: 'Factures', group: 'Finance' });
  });

  it('client : ses entrées de menu, sans catalogue fournisseur', () => {
    const entries = entriesFor(['customer']);
    expect(entries.map((e) => e.title)).toContain('Mes projets');
    expect(entries.some((e) => /imbretex/i.test(e.path + e.title))).toBe(false);
    expect(entries.every((e) => !e.pages)).toBe(true);
  });

  it('client Standard : pas de « Mes offres »', () => {
    const entries = entriesFor(['customer'], false);
    expect(entries.some((e) => e.key === 'customer.products')).toBe(false);
  });
});

describe('onglets retenus', () => {
  const entries = entriesFor(['admin']);

  it('garde le choix et son ordre, ignore les pages disparues', () => {
    const tabs = resolveDockTabs(entries, [
      'admin.invoices',
      'page.supprimee',
      'admin.home',
    ]);
    expect(tabs.map((t) => t.key)).toEqual(['admin.invoices', 'admin.home']);
  });

  it('un choix vide ou périmé rend la barre par défaut', () => {
    expect(resolveDockTabs(entries, [])).toEqual(
      resolveDockTabs(entries, null)
    );
    expect(resolveDockTabs(entries, ['x'])).toEqual(
      resolveDockTabs(entries, null)
    );
  });

  it('un choix par profil sur le même appareil', () => {
    const admin = dockScope(['super_admin', 'admin']);
    const client = dockScope(['customer']);
    saveDockKeys(admin, ['admin.invoices']);
    saveDockKeys(client, ['customer.projects']);
    expect(getStoredDockKeys(admin)).toEqual(['admin.invoices']);
    expect(getStoredDockKeys(client)).toEqual(['customer.projects']);
    expect(dockScope(['admin', 'super_admin'])).toBe(admin);
    saveDockKeys(admin, null);
    expect(getStoredDockKeys(admin)).toBeNull();
    expect(getStoredDockKeys(client)).toEqual(['customer.projects']);
  });

  it('stockage illisible : barre par défaut, sans erreur', () => {
    memory.peg_dock_tabs_v1 = '{pas du json';
    expect(getStoredDockKeys('admin')).toBeNull();
    memory.peg_dock_tabs_v1 = JSON.stringify({ admin: [1, 2] });
    expect(getStoredDockKeys('admin')).toBeNull();
  });
});

describe('onglet allumé', () => {
  const entries = entriesFor(['admin']);
  const byDefault = resolveDockTabs(entries, null);
  const active = (tabs: typeof entries, path: string) =>
    findActiveDockTab(tabs, path)?.key;

  it('la page précise l’emporte sur un préfixe', () => {
    // /admin/products (Boutique) est un préfixe de /admin/products/sizes (Attributs)
    expect(active(byDefault, '/admin/products/sizes')).toBe('admin.attributes');
    expect(active(byDefault, '/admin/products')).toBe('admin.store');
  });

  it('une page épinglée l’emporte sur sa catégorie', () => {
    const tabs = resolveDockTabs(entries, ['admin.finance', 'admin.invoices']);
    expect(active(tabs, '/admin/invoices')).toBe('admin.invoices');
    expect(active(tabs, '/admin/expenses')).toBe('admin.finance');
  });

  it('les sous-pages (détail) allument leur onglet', () => {
    expect(active(byDefault, '/common/projects/details/abc')).toBe(
      'admin.projects.list'
    );
  });

  it('page hors des onglets : aucun (c’est « Menu » qui s’allume)', () => {
    const tabs = resolveDockTabs(entries, ['admin.home']);
    expect(active(tabs, '/admin/invoices')).toBeUndefined();
  });
});
