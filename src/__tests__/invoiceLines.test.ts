// Lignes de facture (utils/invoiceLines.ts, miroir de peg_strapi
// services/invoice-lines.ts) : désignation et quantité toujours présentes,
// tableau qui retombe sur le total HT, reconstitution des anciennes factures,
// et repli quand le serveur ne connaît pas encore `lines` (InvoicesServices.ts).
import {
  draftLinesForProject,
  isInvoicePaid,
  lineFromOrderItem,
  reconcileLines,
  resolveInvoiceLines,
  sumLines,
  totalsFromLines,
  validateInvoiceLines,
  appliedVatRate,
} from '@/utils/invoiceLines';

const S = (name: string) => ({ name, value: name.toLowerCase() });
const DEFAULT = { name: 'Défaut', value: 'DEFAULT' };

const orderItem = {
  price: 12450,
  product: { name: 'Sweat capuche brodé' },
  sizeAndColorSelections: [
    { size: S('M'), color: S('Rouge'), quantity: 120 },
    { size: S('L'), color: S('Rouge'), quantity: 180 },
  ],
};

describe('le constat du 23/11 : nom de la prestation et quantité', () => {
  test('facture générée depuis un projet SANS ligne → produit + quantité de sa commande', () => {
    const { lines, source } = resolveInvoiceLines({
      amount: 12450,
      orderItems: [],
      project: { name: 'Sweats équipe', orderItem },
    });
    expect(source).toBe('derived');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ label: 'Sweat capuche brodé', quantity: 300, unitPrice: 41.5, total: 12450 });
    expect(lines[0].details).toBe('Rouge — M × 120, L × 180');
  });

  test('projet sans commande → nom du projet (plus de « Prestation PEG » anonyme)', () => {
    const { lines } = resolveInvoiceLines({ amount: 900, project: { name: 'Enseigne boutique' } });
    expect(lines.map((l) => [l.label, l.quantity, l.total])).toEqual([['Enseigne boutique', 1, 900]]);
  });

  test('P.U. = total ÷ quantité (l’ancien PDF affichait le total dans « P.U. »)', () => {
    const line = lineFromOrderItem({ price: 150, product: { name: 'Casquette' }, sizeAndColorSelections: [{ size: DEFAULT, color: DEFAULT, quantity: 10 }] });
    expect([line.quantity, line.unitPrice, line.total]).toEqual([10, 15, 150]);
  });

  test('ancienne facture catalogue : la livraison apparaît, le tableau retombe sur le total HT', () => {
    const { lines } = resolveInvoiceLines({
      amount: 159.9,
      orderItems: [{ price: 150, product: { name: 'Casquette' }, sizeAndColorSelections: [{ size: DEFAULT, color: S('Noir'), quantity: 10 }] }],
    });
    expect(lines.map((l) => [l.label, l.total])).toEqual([['Casquette', 150], ['Livraison', 9.9]]);
    expect(sumLines(lines)).toBe(159.9);
  });

  test('lignes enregistrées : utilisées telles quelles', () => {
    const stored = [{ label: 'Kakémonos', quantity: 12, unitPrice: 200, total: 2400, kind: 'service' }];
    expect(resolveInvoiceLines({ amount: 2400, lines: stored, orderItems: [orderItem] })).toEqual({
      lines: stored,
      source: 'stored',
    });
  });

  test('facture vide de tout → une ligne « Prestation » au montant, jamais un tableau vide', () => {
    expect(resolveInvoiceLines({ amount: 500 }).lines).toEqual([
      { label: 'Prestation', quantity: 1, unitPrice: 500, total: 500, kind: 'service' },
    ]);
  });
});

describe('brouillon de la facture d’un projet', () => {
  test('commande du projet → produit et tailles, ajustement si le prix du projet a bougé', () => {
    const lines = draftLinesForProject({ name: 'Sweats', price: 13000, orderItem });
    expect(lines.map((l) => [l.label, l.total])).toEqual([['Sweat capuche brodé', 12450], ['Ajustement', 550]]);
  });

  test('projet issu d’un devis → titre et quantité du devis', () => {
    const lines = draftLinesForProject({ name: 'Projet — Textile', price: 1250 }, { title: 'Sweats club', projectType: 'Textile', quantity: '50 pièces' });
    expect(lines[0]).toMatchObject({ label: 'Sweats club', quantity: 50, unitPrice: 25, total: 1250 });
  });

  test('sinon → nom du projet', () => {
    expect(draftLinesForProject({ name: 'Vitrophanie', price: 320 })[0]).toMatchObject({ label: 'Vitrophanie', quantity: 1, total: 320 });
  });
});

describe('totaux et règles', () => {
  test('totaux depuis les lignes', () => {
    const lines = [
      { label: 'A', quantity: 3, unitPrice: 33.33, total: 100 },
      { label: 'Remise', quantity: 1, unitPrice: -10, total: -10 },
    ];
    expect(totalsFromLines(lines, 0.2)).toEqual({ amount: 90, vatAmount: 18, totalAmount: 108 });
    expect(totalsFromLines(lines, 0)).toEqual({ amount: 90, vatAmount: 0, totalAmount: 90 });
  });

  test('ajustement recalculé, jamais cumulé', () => {
    const once = reconcileLines([{ label: 'X', quantity: 1, unitPrice: 100, total: 100 }], 110);
    expect(reconcileLines(once, 125).map((l) => [l.label, l.total])).toEqual([['X', 100], ['Ajustement', 25]]);
  });

  test('saisie refusée avec un message lisible', () => {
    expect(validateInvoiceLines([{ label: ' ', quantity: 1, unitPrice: 5 }]).error).toBe('Ligne 1 : la désignation est obligatoire.');
    expect(validateInvoiceLines([{ label: 'A', quantity: NaN, unitPrice: 5 }]).error).toBe('Ligne 1 : la quantité doit être un nombre positif.');
  });

  test('facture encaissée (CB ou virement reçu) → montants figés', () => {
    expect(isInvoicePaid({ paymentState: 'fulfilled' })).toBe(true);
    expect(isInvoicePaid({ paymentState: 'transfer_received' })).toBe(true);
    expect(isInvoicePaid({ paymentState: 'pending_transfer' })).toBe(false);
  });

  test('taux de TVA appliqué déduit des montants', () => {
    expect(appliedVatRate({ amount: 100, vatAmount: 20 })).toBe(0.2);
    expect(appliedVatRate({ amount: 0, vatAmount: 0 })).toBe(0);
  });
});

describe('InvoicesServices — serveur sans le champ `lines`', () => {
  const load = () => {
    const fetchData = jest.fn();
    let services!: typeof import('@/services/InvoicesServices');
    jest.isolateModules(() => {
      jest.doMock('@/services/ApiService', () => ({ __esModule: true, default: { fetchData } }));
      services = require('@/services/InvoicesServices');
    });
    return { fetchData, services };
  };

  test('lecture : champ inconnu → rejoue sans `lines`, puis ne le redemande plus', async () => {
    const { fetchData, services } = load();
    fetchData
      .mockRejectedValueOnce({ response: { status: 400, data: { errors: [{ message: 'Cannot query field "lines" on type "Invoice".' }] } } })
      .mockResolvedValue({ data: { data: { invoice: { documentId: 'i1', amount: 10 } } } });

    await services.apiGetInvoiceDocument('i1');
    expect(fetchData).toHaveBeenCalledTimes(2);
    expect(fetchData.mock.calls[0][0].data.query).toMatch(/\blines\b/);
    expect(fetchData.mock.calls[1][0].data.query).not.toMatch(/\blines\b/);
    expect(services.isInvoiceLinesSupported()).toBe(false);

    await services.apiGetInvoiceDocument('i1');
    expect(fetchData).toHaveBeenCalledTimes(3);
    expect(fetchData.mock.calls[2][0].data.query).not.toMatch(/\blines\b/);
  });

  test('création : `lines` retiré des données, numéro jamais envoyé, projet relié', async () => {
    const { fetchData, services } = load();
    fetchData
      .mockRejectedValueOnce({ response: { data: { errors: [{ message: 'Field "lines" is not defined by type "InvoiceInput".' }] } } })
      .mockResolvedValue({ data: { data: { createInvoice: { documentId: 'i2', name: 'FAC-0002' } } } });

    await services.apiCreateInvoice({
      customer: { documentId: 'c1' } as never,
      orderItems: [],
      project: 'p1',
      amount: 100, vatAmount: 20, totalAmount: 120,
      lines: [{ label: 'A', quantity: 1, unitPrice: 100, total: 100 }],
    } as never);
    const first = fetchData.mock.calls[0][0].data.variables.data;
    const retried = fetchData.mock.calls[1][0].data.variables.data;
    expect(first.lines).toHaveLength(1);
    expect(first.project).toBe('p1');
    expect(first).not.toHaveProperty('name');
    expect(retried).not.toHaveProperty('lines');
    expect(retried.customer).toBe('c1');
  });

  test('refus du serveur sur les lignes (montant incohérent) : propagé, pas pris pour un champ inconnu', async () => {
    const { fetchData, services } = load();
    fetchData.mockResolvedValueOnce({
      data: { data: null, errors: [{ message: 'Le total des lignes (90,00 € HT) ne correspond pas au montant HT de la facture (100,00 €).' }] },
    });
    const res = await services.apiUpdateInvoice({ documentId: 'i1', amount: 100, lines: [] } as never);
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect((res.data as { errors?: unknown[] }).errors).toHaveLength(1);
    expect(services.isInvoiceLinesSupported()).toBe(true);
  });
});
