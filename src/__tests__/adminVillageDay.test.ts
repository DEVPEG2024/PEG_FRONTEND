// Village PEG — bulles d'activité qui mènent à la notification, petites
// courbes des chiffres clés, livraisons du jour et fiche « Ma journée ».
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  activityBubbles,
  safeLink,
} from '@/views/app/admin/home/village/villageActivity';
import {
  bucketByDay,
  buildVillageData,
  deliverySeries,
  pastSeries,
  type RawProject,
  type RawVillage,
} from '@/views/app/admin/home/village/villageData';
import {
  buildJournee,
  newsKey,
  newsText,
} from '@/views/app/admin/home/village/villageJournee';
import {
  TONE,
  emptySection,
  type SectionData,
  type VillageData,
} from '@/views/app/admin/home/village/villageModel';
import {
  MENU_ORDER,
  previewPlacement,
  type SectionId,
} from '@/views/app/admin/home/village/villageScene';

dayjs.locale('fr');
const NOW = new Date('2026-10-21T10:00:00');
const TITLES = Object.fromEntries(
  MENU_ORDER.map((id) => [id, `Titre ${id}`])
) as Record<SectionId, string>;

const project = (over: Partial<RawProject> = {}): RawProject => ({
  documentId: 'p',
  name: 'Projet',
  state: 'pending',
  endDate: '2026-11-06T00:00:00',
  createdAt: '2026-10-08T09:00:00',
  customer: { name: 'Maison Brévent' },
  ...over,
});

describe('village — bulles d’activité', () => {
  it('lien de la notification : chemin interne seulement, tickets corrigés', () => {
    expect(safeLink('/common/projects/details/abc')).toBe(
      '/common/projects/details/abc'
    );
    expect(safeLink('/admin/tickets/12')).toBe('/support');
    expect(safeLink('https://exemple.com/x')).toBeNull();
    expect(safeLink('//exemple.com/x')).toBeNull();
    expect(safeLink('javascript:alert(1)')).toBeNull();
    expect(safeLink('')).toBeNull();
    expect(safeLink(undefined)).toBeNull();
  });

  it('la bulle garde l’identifiant brut (lu au clic) et le lien', () => {
    expect(
      activityBubbles([
        {
          _id: 21,
          eventType: 'new_ticket',
          title: 'Réponse',
          link: '/admin/tickets/21',
        },
        {
          _id: 22,
          eventType: 'new_order',
          title: 'Nouvelle commande',
          link: 'https://ailleurs.fr',
        },
      ])
    ).toEqual([
      {
        key: '22',
        rawId: 22,
        id: 'boutique',
        text: 'Nouvelle commande',
        link: null,
      },
      {
        key: '21',
        rawId: 21,
        id: 'tickets',
        text: 'Réponse',
        link: '/support',
      },
    ]);
  });
});

describe('village — petites courbes', () => {
  it('7 derniers jours : photos du serveur, aujourd’hui en direct, trous laissés vides', () => {
    const sr = pastSeries(
      [
        { day: '2026-10-14', values: { projectsInProgress: 30 } },
        { day: '2026-10-16', values: { projectsInProgress: 33 } },
        {
          day: '2026-10-20',
          values: { projectsInProgress: 36, ticketsOpen: 2 },
        },
      ],
      'projectsInProgress',
      38,
      NOW
    );
    expect(sr).toEqual([
      { day: '2026-10-15', value: null },
      { day: '2026-10-16', value: 33 },
      { day: '2026-10-17', value: null },
      { day: '2026-10-18', value: null },
      { day: '2026-10-19', value: null },
      { day: '2026-10-20', value: 36 },
      { day: '2026-10-21', value: 38 },
    ]);
  });

  it('pas de courbe avec un seul point (premier jour des photos)', () => {
    expect(pastSeries([], 'projectsInProgress', 38, NOW)).toBeNull();
    expect(pastSeries(undefined, 'batToValidate', undefined, NOW)).toBeNull();
    expect(
      pastSeries(
        [{ day: '2026-10-20', values: { batToValidate: 2 } }],
        'batToValidate',
        undefined,
        NOW
      )
    ).toBeNull();
  });

  it('livraisons rangées par jour, aujourd’hui en premier', () => {
    expect(
      bucketByDay(
        [
          '2026-10-21T15:00:00',
          '2026-10-21T08:00:00',
          '2026-10-22T09:00:00',
          '2026-10-27T23:00:00',
          '2026-10-28T00:00:00',
          '2026-10-20T10:00:00',
          null,
        ],
        NOW
      )
    ).toEqual([2, 1, 0, 0, 0, 0, 1]);
  });

  it('7 prochains jours : le plus grand des projets à livrer et du calendrier', () => {
    const sr = deliverySeries(
      [1, 0, 0, 2, 0, 0, 0],
      [
        {
          title: 'Livraison A',
          startDate: '2026-10-21T16:00:00',
          category: 'livraison',
        },
        {
          title: 'Livraison B',
          startDate: '2026-10-21T17:00:00',
          category: 'livraison',
        },
        {
          title: 'Réunion',
          startDate: '2026-10-22T10:00:00',
          category: 'reunion',
        },
        {
          title: 'Livraison C',
          startDate: '2026-10-24T09:00:00',
          category: 'livraison',
        },
      ],
      NOW
    );
    expect(sr?.map((p) => p.value)).toEqual([2, 0, 0, 2, 0, 0, 0]);
    expect(sr?.[0].day).toBe('2026-10-21');
    expect(sr?.[6].day).toBe('2026-10-27');
    expect(
      deliverySeries([0, 0, 0, 0, 0, 0, 0], [], NOW)?.map((p) => p.value)
    ).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('sans le compte des projets, pas de barres (le calendrier seul mentirait)', () => {
    expect(deliverySeries(undefined, undefined, NOW)).toBeNull();
    expect(
      deliverySeries(
        undefined,
        [
          {
            title: 'Livraison A',
            startDate: '2026-10-21T16:00:00',
            category: 'livraison',
          },
        ],
        NOW
      )
    ).toBeNull();
    expect(deliverySeries([1, 0], [], NOW)).toBeNull();
  });

  it('chiffres clés : courbes et livraisons du jour calculées avec le village', () => {
    const raw: RawVillage = {
      projects: {
        pending: 10,
        pendingPaid: 2,
        waiting: 1,
        sav: 0,
        late: 0,
        next: project({ endDate: '2026-10-21T00:00:00' }),
        dueToday: 1,
        dueNext7: [1, 0, 0, 0, 0, 0, 0],
      },
      samples: [
        project({
          documentId: 'today',
          name: 'Casquettes brodées',
          endDate: '2026-10-21T00:00:00',
          customer: { name: 'Groppi' },
        }),
        project({ documentId: 'later', endDate: '2026-10-30T00:00:00' }),
        project({
          documentId: 'done',
          state: 'fulfilled',
          endDate: '2026-10-21T00:00:00',
        }),
      ],
      history: [{ day: '2026-10-20', values: { projectsInProgress: 11 } }],
    };
    const d = buildVillageData(raw, NOW, false);
    expect(d.kpis.series.projectsInProgress?.slice(-2)).toEqual([
      { day: '2026-10-20', value: 11 },
      { day: '2026-10-21', value: 12 },
    ]);
    expect(d.kpis.series.batToValidate).toBeUndefined();
    expect(d.kpis.series.deliveries?.map((p) => p.value)).toEqual([
      1, 0, 0, 0, 0, 0, 0,
    ]);
    // Serveur plus ancien (pas de liste) : les projets mis en avant.
    expect(d.todayDeliveries).toEqual([
      { documentId: 'today', name: 'Casquettes brodées', customer: 'Groppi' },
    ]);
    expect(d.todayDeliveryCount).toBe(1);
  });

  it('livraisons du jour : la liste du serveur, et leur nombre complet', () => {
    const raw: RawVillage = {
      projects: {
        pending: 10,
        pendingPaid: 2,
        waiting: 1,
        sav: 0,
        late: 9,
        next: project({ endDate: '2026-10-21T00:00:00' }),
        dueToday: 8,
        // Les 6 premières seulement ; les projets mis en avant sont tous en retard.
        todayList: [1, 2, 3, 4, 5, 6].map((n) =>
          project({
            documentId: `t${n}`,
            name: `Livraison ${n}`,
            endDate: '2026-10-21T00:00:00',
            customer: n === 6 ? null : { name: 'Groppi' },
          })
        ),
      },
      samples: [
        project({ documentId: 'late', endDate: '2026-10-12T00:00:00' }),
      ],
    };
    const d = buildVillageData(raw, NOW, false);
    expect(d.todayDeliveries.map((p) => p.documentId)).toEqual([
      't1',
      't2',
      't3',
      't4',
      't5',
      't6',
    ]);
    expect(d.todayDeliveries[5].customer).toBe('Client non renseigné');
    expect(d.todayDeliveryCount).toBe(8);
  });
});

describe('village — nouveautés depuis hier', () => {
  const at = (hoursAgo: number) =>
    new Date(NOW.getTime() - hoursAgo * 3600_000).toISOString();

  it('les dernières 24 h, regroupées par famille', () => {
    const key = newsKey(
      [
        { eventType: 'new_order', createdAt: at(1) },
        { eventType: 'new_order', createdAt: at(5) },
        { eventType: 'new_ticket', createdAt: at(2) },
        { eventType: 'task_status_change', createdAt: at(3) },
        { eventType: 'new_task', createdAt: at(4) },
        { eventType: 'campaign', createdAt: at(4) },
        { eventType: 'new_order', createdAt: at(25) },
        { eventType: 'new_comment' },
      ],
      NOW.getTime()
    );
    expect(key).toBe('new_order:2|new_ticket:1|new_task:2');
    expect(newsText(key)).toBe('2 commandes · 1 ticket · 2 tâches');
  });

  it('compte incomplet quand la cloche n’a chargé que des notifications récentes', () => {
    const recent = [
      { eventType: 'new_order', createdAt: at(1) },
      { eventType: 'payment_received', createdAt: at(2) },
    ];
    const key = newsKey(recent, NOW.getTime(), true);
    expect(key).toBe('new_order:1|payment_received:1|+');
    expect(newsText(key)).toBe('1 commande · 1 paiement · et d’autres');
    expect(
      newsKey(
        [...recent, { eventType: 'new_order', createdAt: at(30) }],
        NOW.getTime(),
        true
      )
    ).toBe('new_order:1|payment_received:1');
    expect(newsKey(recent, NOW.getTime(), false)).toBe(
      'new_order:1|payment_received:1'
    );
  });

  it('rien de nouveau', () => {
    expect(newsKey([], NOW.getTime(), true)).toBe('');
    expect(newsText('')).toBeNull();
  });
});

describe('village — fiche « Ma journée »', () => {
  const sections = (
    over: Partial<Record<SectionId, Partial<SectionData>>>
  ): Record<SectionId, SectionData> =>
    Object.fromEntries(
      MENU_ORDER.map((id) => [
        id,
        { ...emptySection(`Rien pour ${id}`), ...(over[id] ?? {}) },
      ])
    ) as Record<SectionId, SectionData>;

  const village = (
    over: Partial<Record<SectionId, Partial<SectionData>>>,
    extra: Partial<VillageData> = {}
  ): VillageData =>
    ({
      kpis: {
        projectsInProgress: 12,
        batToValidate: 1,
        nextDelivery: '24 octobre',
        nextDeliveryIn: 'dans 3 jours',
        overdueInvoices: 2,
        trends: {},
        series: {},
      },
      sections: sections(over),
      projects: [],
      life: { vans: 0 },
      todayDeliveries: [],
      todayDeliveryCount: 0,
      ...extra,
    }) as VillageData;

  it('urgences d’abord, puis ce qui est à traiter ; le pense-bête à part', () => {
    const d = village({
      finance: {
        alert: '2 factures impayées depuis plus de 30 jours',
        attention: true,
        tone: TONE.orange,
      },
      tickets: { alert: '1 ticket sans réponse depuis 48 h' },
      devis: { attention: true, chip: '1 devis à préparer', tone: TONE.amber },
      leads: { attention: true, chip: '4 leads à rappeler' },
      accueil: {
        attention: true,
        badge: '2',
        chip: 'Pense-bête : 2 tâches en cours',
        items: [
          {
            title: 'Rappeler l’imprimeur',
            meta: 'Pense-bête',
            dot: TONE.violet,
          },
          {
            title: 'Commander les cartons',
            meta: 'Pense-bête',
            dot: TONE.violet,
          },
        ],
      },
    });
    const j = buildJournee(d, TITLES, '', 'Nova', NOW);
    expect(j.dateLabel).toBe('Mercredi 21 octobre');
    expect(j.greeting).toBe('Bonjour Nova');
    expect(j.urgent.map((r) => r.section)).toEqual(
      MENU_ORDER.filter((id) => id === 'finance' || id === 'tickets')
    );
    expect(j.urgent[0].dot).toBe(TONE.red);
    expect(j.todo.map((r) => r.section)).toEqual(
      MENU_ORDER.filter((id) => id === 'devis' || id === 'leads')
    );
    expect(j.todo.find((r) => r.section === 'devis')).toMatchObject({
      text: '1 devis à préparer',
      sub: 'Titre devis',
      dot: TONE.amber,
    });
    expect(j.memo).toEqual({
      items: ['Rappeler l’imprimeur', 'Commander les cartons'],
      count: 2,
    });
    // Le pense-bête compte parmi les choses à traiter.
    expect(j.lead).toBe('2 urgences, puis 3 choses à traiter.');
    expect(j.steps).toBe(5);
    expect(j.news).toBeNull();
  });

  it('livraisons et rendez-vous du jour, projet le plus urgent', () => {
    const top = {
      documentId: 'late',
      name: 'Roll-up salon',
      customer: 'Maison Brévent',
      chip: 'En retard',
      chipTone: 'late',
      detail: '',
      steps: [],
      dateLabel: 'Livraison prévue',
      date: '19 octobre',
      late: true,
      imageUrl: null,
    } as VillageData['projects'][number];
    const d = village(
      {
        calendrier: {
          badge: '4',
          items: [
            {
              title: '14:00 · Réunion',
              meta: 'Réunion',
              dot: TONE.sky,
              to: '/admin/calendar',
            },
            {
              title: '16:30 · Livraison tabliers',
              meta: 'Livraison',
              dot: TONE.green,
              to: '/admin/calendar',
            },
            {
              title: 'Salon',
              meta: 'Évènement',
              dot: TONE.sky,
              to: '/admin/calendar',
            },
          ],
        },
      },
      {
        projects: [top],
        todayDeliveries: [1, 2, 3, 4, 5].map((n) => ({
          documentId: `d${n}`,
          name: `Commande ${n}`,
          customer: 'Groppi',
        })),
        todayDeliveryCount: 5,
      }
    );
    const j = buildJournee(
      d,
      TITLES,
      'new_order:3|new_ticket:1',
      null,
      new Date('2026-10-21T19:30:00')
    );
    expect(j.greeting).toBe('Bonsoir');
    expect(j.topProject?.documentId).toBe('late');
    expect(j.today.map((r) => r.text)).toEqual([
      'Livraison : Commande 1',
      'Livraison : Commande 2',
      'Livraison : Commande 3',
      'Livraison : Commande 4',
      '1 autre livraison aujourd’hui',
      '14:00 · Réunion',
      '16:30 · Livraison tabliers',
      'Salon',
      '1 autre évènement aujourd’hui',
    ]);
    expect(j.today[0]).toMatchObject({ projectId: 'd1', sub: 'Groppi' });
    expect(j.today[4].section).toBe('projets');
    expect(j.today[5].to).toBe('/admin/calendar');
    expect(j.today[8].to).toBe('/admin/calendar');
    // Une livraison aujourd'hui : pas de « prochaine livraison ».
    expect(j.nextDelivery).toBeNull();
    expect(j.news).toBe('3 commandes · 1 ticket');
  });

  it('livraisons du jour que la liste ne nomme pas : comptées quand même', () => {
    const one = buildJournee(
      village(
        {},
        {
          todayDeliveries: [
            { documentId: 'a', name: 'Bâches', customer: 'Cimes & Co' },
          ],
          todayDeliveryCount: 3,
        }
      ),
      TITLES,
      '',
      'Nova',
      NOW
    );
    expect(one.today.map((r) => r.text)).toEqual([
      'Livraison : Bâches',
      '2 autres livraisons aujourd’hui',
    ]);
    const none = buildJournee(
      village({}, { todayDeliveryCount: 2 }),
      TITLES,
      '',
      'Nova',
      NOW
    );
    expect(none.today.map((r) => r.text)).toEqual([
      '2 livraisons prévues aujourd’hui',
    ]);
    expect(none.today[0].section).toBe('projets');
    // Il y a des livraisons aujourd'hui : pas de « prochaine livraison ».
    expect(none.nextDelivery).toBeNull();
  });

  it('journée calme : prochaine livraison annoncée', () => {
    const j = buildJournee(village({}), TITLES, '', 'Nova', NOW);
    expect(j.lead).toBe('Journée calme : rien d’urgent, rien en attente.');
    expect(j.urgent).toEqual([]);
    expect(j.todo).toEqual([]);
    expect(j.today).toEqual([]);
    expect(j.nextDelivery).toBe('24 octobre, dans 3 jours');
    expect(j.memo).toEqual({ items: [], count: 0 });
    expect(j.topProject).toBeNull();
    expect(j.steps).toBe(0);
  });

  it('rien d’urgent : le nombre de choses à traiter', () => {
    const j = buildJournee(
      village({ leads: { attention: true, chip: '4 leads à rappeler' } }),
      TITLES,
      '',
      'Nova',
      NOW
    );
    expect(j.lead).toBe('Rien d’urgent : 1 chose à traiter.');
    const k = buildJournee(
      village({ finance: { alert: '1 facture impayée' } }),
      TITLES,
      '',
      'Nova',
      NOW
    );
    expect(k.lead).toBe('1 urgence à traiter en priorité.');
  });
});

describe('village — aperçu au survol', () => {
  const base = {
    pillW: 100,
    pillH: 32,
    cardW: 248,
    cardH: 230,
    mapW: 760,
    mapH: 570,
  };

  it('au-dessus de l’étiquette quand il y tient, sans sortir de la carte', () => {
    expect(previewPlacement({ ...base, x: 380, y: 400 })).toEqual({
      left: 256,
      top: 130,
      side: 'above',
    });
    // Étiquette au bord gauche : la carte reste entière.
    expect(previewPlacement({ ...base, x: 40, y: 400 }).left).toBe(8);
  });

  it('pas la place au-dessus (la carte coupe) : à côté, le bâtiment reste visible', () => {
    const p = previewPlacement({ ...base, x: 380, y: 227 });
    expect(p.side).toBe('right');
    expect(p.left).toBe(380 + 50 + 12);
    expect(p.top).toBe(227 - 32 - 6);
    // Près du bord droit : de l'autre côté.
    expect(previewPlacement({ ...base, x: 600, y: 227 })).toMatchObject({
      side: 'left',
      left: 600 - 50 - 12 - 248,
    });
  });

  it('une bulle d’activité au-dessus : à côté ; jamais sous le bas de la carte', () => {
    expect(
      previewPlacement({ ...base, x: 380, y: 400, busyAbove: true })
    ).toMatchObject({ side: 'right' });
    expect(
      previewPlacement({ ...base, x: 380, y: 560, busyAbove: true }).top
    ).toBe(570 - 8 - 230);
  });
});
