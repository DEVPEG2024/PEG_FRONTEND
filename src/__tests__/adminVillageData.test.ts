// Village PEG : traduction des données réelles en pastilles, phrases et
// projets mis en avant. Une lecture manquante ne doit jamais devenir un faux 0.
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  batAwaitingClient,
  buildVillageData,
  occursOn,
  rankProjects,
  type RawProject,
  type RawVillage,
} from '@/views/app/admin/home/village/villageData';

dayjs.locale('fr');
const NOW = new Date('2026-10-21T10:00:00');

const project = (over: Partial<RawProject> = {}): RawProject => ({
  documentId: 'p',
  name: 'Projet',
  state: 'pending',
  endDate: '2026-11-06T00:00:00',
  createdAt: '2026-10-08T09:00:00',
  customer: { name: 'Maison Brévent' },
  ...over,
});

const batProject = (id: string, over: Partial<RawProject> = {}) =>
  project({
    documentId: id,
    orderItem: {
      batStatus: null,
      sizeAndColorSelections: [{ quantity: 30 }, { quantity: 20 }],
      product: {
        name: 'T-shirt brodé',
        requiresBat: true,
        batFile: { url: '/bat.pdf' },
      },
    },
    ...over,
  });

const full: RawVillage = {
  projects: {
    pending: 30,
    pendingPaid: 8,
    waiting: 4,
    sav: 1,
    late: 2,
    next: project({ endDate: '2026-10-24T00:00:00' }),
  },
  samples: [
    project({
      documentId: 'late',
      name: 'Roll-up salon',
      endDate: '2026-10-19T00:00:00',
    }),
    project({
      documentId: 'soon',
      name: 'Tabliers',
      endDate: '2026-10-28T00:00:00',
    }),
  ],
  batCandidates: [
    batProject('bat1', { name: 'Séminaire d’automne' }),
    batProject('nofile', {
      orderItem: {
        batStatus: null,
        product: { requiresBat: true, batFile: null },
      },
    }),
  ],
  quotes: { proposed: 3, requested: 1 },
  tickets: { open: 5 },
  customers: { total: 64, newMonth: 3, subscribers: 18, toProcess: 2 },
  producers: { total: 12 },
  shop: {
    ordersToday: 4,
    ordersPending: 6,
    productsActive: 214,
    promoUsable: 3,
  },
  attributes: { sizes: 18, colors: 42, forms: 9, checklists: 6 },
  banners: { active: 9 },
  users: { total: 92, unconfirmed: 2 },
  invoices: {
    total: 3,
    unpaid: [
      {
        documentId: 'i1',
        name: 'FAC-0142',
        totalAmount: 486,
        dueDate: '2026-10-15T00:00:00',
        customer: { name: 'Maison Brévent' },
      },
      {
        documentId: 'i2',
        name: 'FAC-0150',
        totalAmount: 1000,
        dueDate: '2026-11-15T00:00:00',
      },
      {
        documentId: 'i3',
        name: 'FAC-0151',
        totalAmount: 200,
        date: '2026-10-01T00:00:00',
        paymentState: 'pending_transfer',
      },
    ],
  },
  calendar: [
    { title: 'Réunion', startDate: '2026-10-21T14:00:00', category: 'reunion' },
    {
      title: 'Point hebdo',
      startDate: '2026-10-07T09:00:00',
      recurrence: 'weekly',
    },
    {
      title: 'Livraison tabliers',
      startDate: '2026-10-24T16:30:00',
      category: 'livraison',
    },
  ],
  planning: {
    overloaded: [{ name: 'SignaPro', totalDays: 12, capacityDays: 10 }],
    loads: [
      { name: 'SignaPro', totalDays: 12, capacityDays: 10, projectCount: 3 },
    ],
    late: 1,
    tight: 2,
  },
  leads: { toCall: 4, newMonth: 11 },
  generators: {
    pendingCount: 2,
    pendingAmount: 240,
    payoutRequests: 1,
    autoValidate: false,
  },
  campaigns: {
    scheduled: [{ title: 'Nouveautés de Noël', sendAt: '2026-10-22T09:00:00' }],
    sentLast30Days: 2,
  },
  ia: { conversationsToday: 38, relecteurEnabled: false, proposed: 0 },
  imbretex: { productCount: 86, variantCount: 900 },
  todos: [
    { text: 'Rappeler l’imprimeur', done: false },
    { text: 'BAT casquettes', done: true },
  ],
};

describe('village — chiffres clés', () => {
  const d = buildVillageData(full, NOW, false);

  it('projets en cours = En cours + En cours (payé)', () => {
    expect(d.kpis.projectsInProgress).toBe(38);
    expect(d.sections.projets.badge).toBe('38');
  });

  it('BAT à valider : seulement les BAT déposés en attente du client', () => {
    expect(d.kpis.batToValidate).toBe(1);
    expect(batAwaitingClient(full.batCandidates![1])).toBe(false);
  });

  it('prochaine livraison en toutes lettres', () => {
    expect(d.kpis.nextDelivery).toBe('24 octobre');
  });

  it('factures en retard : échéance (ou date) passée, non réglées', () => {
    expect(d.kpis.overdueInvoices).toBe(2);
    expect(d.sections.finance.badge).toBe('2');
    expect(
      d.sections.finance.stats.find((s) => s.label === 'Virements à confirmer')
        ?.value
    ).toBe('1');
    expect(d.sections.finance.lead).toMatch(
      /1\s686\s€ TTC restent à encaisser\./
    );
  });
});

describe('village — rubriques', () => {
  const d = buildVillageData(full, NOW, false);

  it('les pastilles suivent celles du menu (Devis = demandes à préparer)', () => {
    expect(d.sections.devis.badge).toBe('1');
    expect(d.sections.devis.chip).toBe('1 devis à préparer');
    expect(d.sections.premium.badge).toBe('2');
    expect(d.sections.tickets.chip).toBe('5 tickets ouverts');
    expect(d.sections.clients.badge).toBe('+3');
    expect(d.sections.generateurs.badge).toBe('3');
  });

  it('les filtres « À traiter » reprennent ce qui demande une action', () => {
    const traiter = (
      Object.keys(d.sections) as (keyof typeof d.sections)[]
    ).filter((id) => d.sections[id].tags.includes('traiter'));
    expect(traiter).toEqual(
      expect.arrayContaining([
        'projets',
        'devis',
        'leads',
        'premium',
        'finance',
        'tickets',
        'utilisateurs',
        'accueil',
        'planning',
        'generateurs',
      ])
    );
    expect(traiter).not.toContain('clients');
  });

  it('calendrier : évènements du jour, récurrences comprises', () => {
    expect(d.sections.calendrier.badge).toBe('2');
    expect(d.sections.calendrier.items[0].title).toBe('09:00 · Point hebdo');
    expect(d.sections.calendrier.tags).toContain('livrer');
  });

  it('accords au singulier et au pluriel', () => {
    expect(d.sections.projets.lead).toBe(
      '2 projets ont dépassé leur date de livraison.'
    );
    const one = buildVillageData(
      { ...full, projects: { ...full.projects!, late: 1 } },
      NOW,
      false
    );
    expect(one.sections.projets.lead).toBe(
      '1 projet a dépassé sa date de livraison.'
    );
    expect(d.sections.premium.lead).toBe(
      '2 clients Premium attendent leurs offres personnalisées.'
    );
  });

  it('chiffres masqués : aucun montant affiché', () => {
    const h = buildVillageData(full, NOW, true);
    expect(h.sections.finance.lead).toBe('••••• TTC restent à encaisser.');
    expect(
      h.sections.generateurs.stats.find((s) => s.label === 'Montant')?.value
    ).toBe('•••••');
  });

  it('une lecture manquante = rubrique sans pastille, jamais un faux zéro', () => {
    const d2 = buildVillageData(
      { ...full, invoices: undefined, quotes: undefined },
      NOW,
      false
    );
    expect(d2.kpis.overdueInvoices).toBeNull();
    expect(d2.sections.finance.badge).toBeNull();
    expect(d2.sections.finance.chip).toBe('Données indisponibles');
    expect(d2.sections.devis.chip).toBe('Données indisponibles');
    const empty = buildVillageData({}, NOW, false);
    expect(empty.kpis).toEqual({
      projectsInProgress: null,
      batToValidate: null,
      nextDelivery: null,
      overdueInvoices: null,
    });
    expect(Object.keys(empty.sections)).toHaveLength(20);
  });
});

describe('village — projets mis en avant', () => {
  const d = buildVillageData(full, NOW, false);

  it('le plus urgent d’abord : en retard, puis BAT, puis date la plus proche', () => {
    expect(d.projects.map((p) => p.documentId)).toEqual([
      'late',
      'bat1',
      'soon',
    ]);
    const bat = new Set(['b']);
    const ranked = rankProjects(
      [
        project({ documentId: 'x', endDate: '2026-10-30T00:00:00' }),
        project({ documentId: 'b', endDate: '2026-11-30T00:00:00' }),
      ],
      bat,
      NOW
    );
    expect(ranked[0].documentId).toBe('b');
  });

  it('fiche projet : étapes, quantité, aucun « commande » pour un projet', () => {
    const p = d.projects.find((x) => x.documentId === 'bat1')!;
    expect(p.chip).toBe('BAT à valider');
    expect(p.detail).toBe('50 × T-shirt brodé');
    expect(p.steps.map((s) => s.title)).toEqual([
      'Projet créé',
      'Validation du BAT',
      'En production',
      'Livraison',
    ]);
    expect(p.steps[1].sub).toBe('En attente du client');
    expect(JSON.stringify(d.projects)).not.toMatch(/[Cc]ommande/);
    const late = d.projects[0];
    expect(late.chip).toBe('En retard');
    expect(late.dateLabel).toBe('Livraison dépassée');
  });
});

describe('village — récurrences du calendrier', () => {
  const day = new Date('2026-10-21T08:00:00');
  it.each([
    ['daily', '2026-10-01T09:00:00', null, true],
    ['weekly', '2026-10-14T09:00:00', null, true],
    ['weekly', '2026-10-15T09:00:00', null, false],
    ['monthly', '2026-09-21T09:00:00', null, true],
    ['yearly', '2025-10-21T09:00:00', null, true],
    ['weekly', '2026-10-14T09:00:00', '2026-10-20T00:00:00', false],
    [null, '2026-10-22T09:00:00', null, false],
  ])(
    '%s depuis %s (fin %s) → %s',
    (recurrence, startDate, recurrenceEnd, expected) => {
      expect(
        occursOn(
          {
            title: 'x',
            startDate: startDate as string,
            recurrence: recurrence as string | null,
            recurrenceEnd: recurrenceEnd as string | null,
          },
          day
        )
      ).toBe(expected);
    }
  );
});
