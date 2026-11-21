/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { MpOrderView } from '@/@types/masterPrint';
import type {
  MpAdminOrder,
  MpOrdersPage,
  MpWebhooksOverview,
} from '@/@types/masterPrintOrders';

// Page « Commandes Master Print » et carte « Marge » du projet : rendu avec des
// réponses du serveur simulées (aucun réseau). Vérifie ce que l'admin voit :
// alertes, « hors PEG », marge rouge, facture seulement quand elle existe,
// abonnement du suivi automatique, filtre « À traiter » vide.
//   npx jest src/__tests__/masterPrintOrdersPage.test.tsx

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockOrders = jest.fn();
const mockWebhooks = jest.fn();
const mockSubscribe = jest.fn();
const mockInvoice = jest.fn();
jest.mock('@/services/MasterPrintOrdersServices', () => ({
  apiGetMasterPrintOrders: (p: unknown) => mockOrders(p),
  apiGetMasterPrintWebhooks: () => mockWebhooks(),
  apiSubscribeMasterPrintWebhook: () => mockSubscribe(),
  apiGetMasterPrintInvoice: (id: string) => mockInvoice(id),
}));

import MasterPrintOrders from '@/views/app/admin/masterPrint/MasterPrintOrders';
import MarginCard from '@/views/app/common/projects/details/components/masterPrint/MarginCard';

const order = (o: Partial<MpAdminOrder>): MpAdminOrder => ({
  key: 'sandbox|MP-ORD-2026-001315',
  orderId: 'MP-ORD-2026-001315',
  environment: 'sandbox',
  sameEnvironment: true,
  status: 'shipped',
  statusLabel: 'Expédiée',
  createdAt: '2026-11-20T14:50:32+01:00',
  updatedAt: null,
  reference: 'PEG · Commande T-shirt pour GROPPI',
  known: true,
  projectDocumentId: 'projet0000000001',
  project: {
    documentId: 'projet0000000001',
    name: 'T-shirts Groppi',
    price: 250,
    state: 'pending',
    customerName: 'GROPPI',
  },
  projectPurchase: { amount: 94.14, orders: 1, environment: 'sandbox' },
  files: { received: 2, expected: 2 },
  alerts: [],
  todo: false,
  purchaseExclTax: 94.14,
  shippingIncluded: false,
  tracking: { carrier: 'SANDBOX', number: 'SBX000001315', url: null },
  invoiceNumber: 'SANDBOX-F-001315',
  invoiceAvailable: true,
  detail: 'stored',
  ...o,
});

const page = (items: MpAdminOrder[], todo = 1): MpOrdersPage => ({
  configured: true,
  environment: 'sandbox',
  filter: 'todo',
  q: '',
  offset: 0,
  limit: 25,
  total: items.length,
  counts: { all: 11, todo },
  items,
  mpError: null,
  listComplete: true,
  listedAt: null,
});

const notSubscribed: MpWebhooksOverview = {
  configured: true,
  environment: 'sandbox',
  url: 'https://api.mypeg.fr/api/master-print/webhook',
  subscribed: false,
  subscriptions: [],
  others: [],
  stored: null,
  deliveries: [],
  deliveriesSummary: { total: 0, delivered: 0, failed: 0, pending: 0 },
  deliveriesError: null,
  received: { count: 0, last7Days: 0, lastAt: null, recent: [] },
  health: {
    level: 'danger',
    title: 'Ce serveur n’est pas abonné',
    detail: 'Master Print ne prévient pas PEG.',
  },
  mpError: null,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  jest.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  mockWebhooks.mockResolvedValue({ data: notSubscribed });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const flush = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};

const button = (text: string) =>
  [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(text)
  );

describe('page Commandes Master Print', () => {
  it('affiche alertes, hors PEG, marge et facture seulement quand elle existe', async () => {
    mockOrders.mockResolvedValue({
      data: page([
        order({
          key: 'sandbox|MP-ORD-2026-001313',
          orderId: 'MP-ORD-2026-001313',
          status: 'awaiting_files',
          statusLabel: 'Fichiers attendus',
          files: { received: 0, expected: 1 },
          alerts: [
            {
              code: 'file_rejected',
              level: 'danger',
              label: 'Fichier refusé',
              detail: 'rollup.png : PDF attendu',
            },
            {
              code: 'files_late',
              level: 'danger',
              label: 'Fichiers attendus depuis 26 h',
            },
          ],
          todo: true,
          invoiceNumber: null,
          invoiceAvailable: false,
          tracking: null,
          projectPurchase: { amount: 300, orders: 1, environment: 'sandbox' },
        }),
        order({
          key: 'sandbox|MP-ORD-2026-001206',
          orderId: 'MP-ORD-2026-001206',
          known: false,
          project: null,
          projectDocumentId: null,
          projectPurchase: null,
          reference: 'PEG-TEST-1',
        }),
      ]),
    });
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MasterPrintOrders />
        </MemoryRouter>
      );
    });
    await flush();

    expect(mockOrders).toHaveBeenCalledWith(
      expect.objectContaining({ filter: 'todo', offset: 0 })
    );
    const text = container.textContent || '';
    expect(text).toContain('Commandes Master Print');
    expect(text).toContain('À traiter (1)');
    expect(text).toContain('Toutes (11)');
    expect(text).toContain('Fichier refusé');
    expect(text).toContain('rollup.png : PDF attendu');
    expect(text).toContain('Fichiers attendus depuis 26 h');
    expect(text).toContain('0/1');
    expect(text).toContain('Hors PEG · PEG-TEST-1');
    // Marge du projet négative (vendu 250, acheté 300) : en rouge
    expect(text).toMatch(/-50,00\s€ · -20 %/);
    // Une seule commande a une facture
    const invoices = [...container.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Facture d’achat (PDF)')
    );
    expect(invoices).toHaveLength(1);
    // Lien vers l'onglet Master Print du projet
    expect(
      container.querySelector(
        'a[href="/common/projects/details/projet0000000001?tab=Master%20Print"]'
      )
    ).not.toBeNull();
    // Suivi automatique : non abonné → bouton d'abonnement
    expect(text).toContain('Ce serveur n’est pas abonné');
    expect(text).toContain('Master Print ne prévient pas PEG.');
    expect(button('Abonner ce serveur')).toBeDefined();
  });

  it('abonne ce serveur puis relit l’état du suivi', async () => {
    mockOrders.mockResolvedValue({ data: page([], 0) });
    mockSubscribe.mockResolvedValue({
      data: { url: notSubscribed.url, created: true },
    });
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MasterPrintOrders />
        </MemoryRouter>
      );
    });
    await flush();
    const subscribe = button('Abonner ce serveur');
    expect(subscribe).toBeDefined();
    await act(async () => {
      subscribe!.click();
    });
    await flush();
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(mockWebhooks).toHaveBeenCalledTimes(2);
  });

  it('rien à traiter : propose toutes les commandes', async () => {
    mockOrders.mockResolvedValue({ data: page([], 0) });
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MasterPrintOrders />
        </MemoryRouter>
      );
    });
    await flush();
    expect(container.textContent).toContain(
      'Rien à traiter : aucune commande bloquée ni en attente.'
    );
    await act(async () => {
      button('Voir toutes les commandes')!.click();
    });
    await flush();
    expect(mockOrders).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: 'all' })
    );
  });
});

describe('carte Marge du projet', () => {
  const mpOrder = (o: Partial<MpOrderView>): MpOrderView => ({
    orderId: 'MP-ORD-2026-001315',
    environment: 'sandbox',
    status: 'shipped',
    statusLabel: 'Expédiée',
    createdAt: null,
    totalExclTax: 94.14,
    totalWithShippingExclTax: null,
    blindShipping: true,
    tracking: null,
    invoiceNumber: 'SANDBOX-F-001315',
    productionOrders: [],
    lines: [],
    history: [],
    missingFiles: 0,
    uploads: [],
    uploading: false,
    ...o,
  });

  it('achat, vente, marge et facture ; ouvre le PDF dans l’onglet préparé', async () => {
    const win = {
      closed: false,
      location: { href: '' },
      opener: {},
      close: jest.fn(),
      document: { title: '', body: { textContent: '' } },
    };
    const open = jest
      .spyOn(window, 'open')
      .mockReturnValue(win as unknown as Window);
    (URL as unknown as { createObjectURL: () => string }).createObjectURL =
      () => 'blob:facture';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () =>
      undefined;
    mockInvoice.mockResolvedValue({
      data: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
    });

    await act(async () => {
      root.render(
        <MarginCard price={250} orders={[mpOrder({})]} environment="sandbox" />
      );
    });
    const text = container.textContent || '';
    expect(text).toContain('Achat HT');
    expect(text).toMatch(/94,14\s€/);
    expect(text).toMatch(/250,00\s€/);
    expect(text).toMatch(/155,86\s€/);
    expect(text).toContain('62,3 % de la vente');
    expect(text).toContain('Bac à sable : montants simulés');

    await act(async () => {
      button('Facture d’achat (PDF)')!.click();
    });
    await flush();
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(mockInvoice).toHaveBeenCalledWith('MP-ORD-2026-001315');
    expect(win.location.href).toBe('blob:facture');
    open.mockRestore();
  });

  it('marge négative signalée ; rien sans commande', async () => {
    await act(async () => {
      root.render(
        <MarginCard
          price={80}
          orders={[mpOrder({ invoiceNumber: null })]}
          environment="sandbox"
        />
      );
    });
    expect(container.textContent).toContain('Marge négative');
    await act(async () => {
      root.render(<MarginCard price={80} orders={[]} environment="sandbox" />);
    });
    expect(container.textContent).toBe('');
  });
});
