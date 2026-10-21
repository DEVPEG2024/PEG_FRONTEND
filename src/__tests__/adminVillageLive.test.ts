// Village PEG — ce qui vit : bâtiments en alerte, tournée du jour, activité en
// direct (notifications de la cloche) et ambiance (heure et saison réelles).
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  buildVillageData,
  staleTickets,
  ticketWaitingSince,
  type RawVillage,
} from '@/views/app/admin/home/village/villageData';
import { matchesFilter } from '@/views/app/admin/home/village/villageModel';
import {
  markSeen,
  readSeen,
  resumeIndex,
  tourSteps,
} from '@/views/app/admin/home/village/villageTour';
import {
  activityBubbles,
  activitySection,
  liveNotifications,
  maxNotificationId,
} from '@/views/app/admin/home/village/villageActivity';
import {
  ambianceAt,
  phaseAt,
  seasonAt,
  seasonParticles,
} from '@/views/app/admin/home/village/villageAmbiance';

dayjs.locale('fr');
const NOW = new Date('2026-10-21T10:00:00');

const raw: RawVillage = {
  projects: {
    pending: 3,
    pendingPaid: 1,
    waiting: 0,
    sav: 0,
    late: 0,
    next: null,
  },
  quotes: { proposed: 1, requested: 2, requestedStale: 0 },
  tickets: { open: 2, stale: 0 },
  invoices: {
    total: 2,
    unpaid: [
      {
        documentId: 'i1',
        name: 'FAC-0142',
        totalAmount: 486,
        dueDate: '2026-10-15T00:00:00',
      },
    ],
  },
};

describe('village — bâtiments en alerte', () => {
  it('rien d’anormal : aucun drapeau, le filtre « Urgent » éteint tout', () => {
    const d = buildVillageData(raw, NOW, false);
    (['projets', 'devis', 'tickets', 'finance'] as const).forEach((id) => {
      expect(d.sections[id].alert).toBeNull();
      expect(matchesFilter(d.sections[id], 'urgent')).toBe(false);
    });
    // Une facture en retard de 6 jours demande une action, sans être une alerte.
    expect(d.sections.finance.attention).toBe(true);
  });

  it('projet en retard, devis et ticket sans réponse, facture à plus de 30 jours', () => {
    const d = buildVillageData(
      {
        ...raw,
        projects: { ...raw.projects!, late: 2 },
        quotes: { proposed: 1, requested: 2, requestedStale: 1 },
        tickets: { open: 4, stale: 3 },
        invoices: {
          total: 2,
          unpaid: [
            ...raw.invoices!.unpaid,
            {
              documentId: 'i2',
              name: 'FAC-0101',
              totalAmount: 900,
              dueDate: '2026-09-10T00:00:00',
            },
          ],
        },
      },
      NOW,
      false
    );
    expect(d.sections.projets.alert).toBe(
      '2 projets ont dépassé leur date de livraison.'
    );
    expect(d.sections.devis.alert).toBe(
      '1 demande de devis sans réponse depuis 48 h.'
    );
    expect(d.sections.tickets.alert).toBe(
      '3 tickets sans réponse depuis 48 h.'
    );
    expect(d.sections.finance.alert).toBe(
      '1 facture impayée depuis plus de 30 jours.'
    );
    (['projets', 'devis', 'tickets', 'finance'] as const).forEach((id) =>
      expect(matchesFilter(d.sections[id], 'urgent')).toBe(true)
    );
    expect(matchesFilter(d.sections.clients, 'urgent')).toBe(false);
  });

  it('un compte « sans réponse » illisible ne lève jamais de faux drapeau', () => {
    const d = buildVillageData(
      {
        ...raw,
        quotes: { proposed: 1, requested: 2, requestedStale: null },
        tickets: { open: 2, stale: null },
      },
      NOW,
      false
    );
    expect(d.sections.devis.alert).toBeNull();
    expect(d.sections.tickets.alert).toBeNull();
  });
});

describe('village — tickets sans réponse', () => {
  const at = (iso: string) => `2026-10-${iso}`;

  it('attend depuis l’ouverture tant que l’équipe n’a pas répondu', () => {
    expect(
      ticketWaitingSince({
        createdAt: at('15T09:00:00'),
        messages: [{ createdByRole: 'customer', createdAt: at('15T09:00:00') }],
      })
    ).toBe(at('15T09:00:00'));
  });

  it('dernier mot à l’équipe : le ticket n’attend pas', () => {
    expect(
      ticketWaitingSince({
        createdAt: at('10T09:00:00'),
        messages: [
          { createdByRole: 'customer', createdAt: at('10T09:00:00') },
          { createdByRole: 'admin', createdAt: at('11T09:00:00') },
        ],
      })
    ).toBeNull();
  });

  it('le client relance : on compte depuis sa relance, pas depuis l’ouverture', () => {
    const t = {
      createdAt: at('01T09:00:00'),
      messages: JSON.stringify([
        { createdByRole: 'customer', createdAt: at('01T09:00:00') },
        { createdByRole: 'admin', createdAt: at('02T09:00:00') },
        { createdByRole: 'customer', createdAt: at('20T18:00:00') },
        { createdByRole: 'customer', createdAt: at('21T08:00:00') },
      ]),
    };
    expect(ticketWaitingSince(t)).toBe(at('20T18:00:00'));
    // Relance d'hier soir : moins de 48 h, pas en retard.
    expect(staleTickets([t], NOW)).toBe(0);
    expect(
      staleTickets(
        [
          t,
          { createdAt: at('17T09:00:00'), messages: [] },
          { createdAt: at('19T11:00:00'), messages: null },
        ],
        NOW
      )
    ).toBe(1);
  });
});

describe('village — ma tournée du jour', () => {
  const store = new Map<string, string>();
  beforeAll(() => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
  });
  afterAll(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('les urgences d’abord, puis ce qui demande une action, dans l’ordre du menu', () => {
    const d = buildVillageData(
      { ...raw, tickets: { open: 2, stale: 1 } },
      NOW,
      false
    );
    // Projets sans retard ni BAT : rien à y faire, pas d'étape.
    expect(tourSteps(d.sections)).toEqual(['tickets', 'devis', 'finance']);
    const late = buildVillageData(
      {
        ...raw,
        projects: { ...raw.projects!, late: 1 },
        tickets: { open: 2, stale: 1 },
      },
      NOW,
      false
    );
    expect(tourSteps(late.sections)).toEqual([
      'projets',
      'tickets',
      'devis',
      'finance',
    ]);
  });

  it('reprend là où on l’a laissée, et repart de zéro le lendemain', () => {
    const steps = ['tickets', 'projets', 'devis'] as const;
    expect(resumeIndex([...steps], readSeen(NOW))).toBe(0);
    markSeen('tickets', NOW);
    markSeen('projets', NOW);
    markSeen('projets', NOW);
    expect(readSeen(NOW)).toEqual(['tickets', 'projets']);
    expect(resumeIndex([...steps], readSeen(NOW))).toBe(2);
    const tomorrow = new Date('2026-10-22T08:00:00');
    expect(readSeen(tomorrow)).toEqual([]);
    // Tout vu : la tournée recommence au début.
    markSeen('devis', NOW);
    expect(resumeIndex([...steps], readSeen(NOW))).toBe(0);
  });
});

describe('village — activité en direct', () => {
  it('le lien de la notification désigne le bâtiment, sinon son type', () => {
    expect(
      activitySection({
        _id: 1,
        eventType: 'new_order',
        link: '/admin/invoices',
      })
    ).toBe('finance');
    expect(
      activitySection({
        _id: 2,
        eventType: 'payment_received',
        link: '/admin/generators',
      })
    ).toBe('generateurs');
    expect(activitySection({ _id: 3, eventType: 'new_ticket' })).toBe(
      'tickets'
    );
    expect(
      activitySection({
        _id: 4,
        eventType: 'new_comment',
        link: '/common/projects/details/abc',
      })
    ).toBe('projets');
    expect(activitySection({ _id: 5, eventType: 'inconnu' })).toBeNull();
  });

  it('seules les notifications arrivées pendant l’affichage comptent', () => {
    const opened = Date.parse('2026-10-21T10:00:00Z');
    const list = [
      { _id: 12, eventType: 'new_ticket', createdAt: '2026-10-21T10:00:40Z' },
      // reçue pendant l'absence (liste rechargée depuis l'appareil)
      { _id: 11, eventType: 'new_order', createdAt: '2026-10-21T07:00:00Z' },
      { _id: 9, eventType: 'new_task', createdAt: '2026-10-21T10:00:30Z' },
      { _id: 13, eventType: 'new_task', createdAt: 'pas une date' },
    ];
    expect(maxNotificationId(list)).toBe(13);
    expect(
      liveNotifications(list, 10, opened - 120_000).map((n) => n._id)
    ).toEqual([12]);
  });

  it('une bulle par bâtiment (la plus récente), quatre au plus', () => {
    const bubbles = activityBubbles(
      [
        { _id: '20', eventType: 'new_ticket', title: 'Nouveau ticket' },
        {
          _id: '21',
          eventType: 'new_ticket',
          title: 'Nouvelle réponse à un ticket',
        },
        { _id: '22', eventType: 'new_task', title: 'Nouvelle tâche' },
        { _id: '23', eventType: 'new_invoice' },
        { _id: '24', eventType: 'new_order', title: 'Nouvelle commande' },
        { _id: '25', eventType: 'campaign', title: 'Campagne' },
      ],
      4
    );
    expect(bubbles.map((b) => b.id)).toEqual([
      'campagnes',
      'boutique',
      'finance',
      'projets',
    ]);
    expect(bubbles[2].text).toBe('Nouvelle activité');
    const tickets = activityBubbles([
      { _id: 20, eventType: 'new_ticket', title: 'Nouveau ticket' },
      { _id: 21, eventType: 'new_ticket', title: '  Réponse  ' },
    ]);
    expect(tickets).toEqual([{ key: '21', id: 'tickets', text: 'Réponse' }]);
  });
});

describe('village — ambiance (heure et saison réelles)', () => {
  const at = (iso: string) => new Date(iso);

  it('jour, crépuscule, nuit et aube suivent le soleil d’Annecy', () => {
    expect(phaseAt(at('2026-10-21T12:00:00'))).toBe('day');
    expect(phaseAt(at('2026-10-21T18:30:00'))).toBe('dusk');
    expect(phaseAt(at('2026-10-21T22:00:00'))).toBe('night');
    expect(phaseAt(at('2026-10-21T05:00:00'))).toBe('night');
    expect(phaseAt(at('2026-10-21T07:45:00'))).toBe('dawn');
    // En juin, il fait encore jour à 20 h 30.
    expect(phaseAt(at('2026-06-15T20:30:00'))).toBe('day');
  });

  it('saisons', () => {
    expect(seasonAt(at('2026-10-21T12:00:00'))).toBe('autumn');
    expect(seasonAt(at('2026-12-25T12:00:00'))).toBe('winter');
    expect(seasonAt(at('2026-03-19T12:00:00'))).toBe('winter');
    expect(seasonAt(at('2026-03-20T12:00:00'))).toBe('spring');
    expect(seasonAt(at('2026-07-14T12:00:00'))).toBe('summer');
  });

  it('la nuit : voile, lumières allumées, titre en blanc ; neige au sol l’hiver', () => {
    const night = ambianceAt(at('2026-12-20T23:00:00'));
    expect(night.phase).toBe('night');
    expect(night.veil).not.toBeNull();
    expect(night.lights).toBe(1);
    expect(night.ink).toBe('#ffffff');
    expect(night.snow).toBe(0);
    expect(ambianceAt(at('2026-01-10T23:00:00')).snow).toBeGreaterThan(0);
    const noon = ambianceAt(at('2026-10-21T12:00:00'));
    expect(noon.veil).toBeNull();
    expect(noon.lights).toBe(0);
  });

  it('particules déterministes : feuilles l’automne, flocons l’hiver, rien l’été', () => {
    const a = seasonParticles('autumn');
    expect(a).toEqual(seasonParticles('autumn'));
    expect(a.length).toBeGreaterThan(0);
    a.forEach((p) => {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.left).toBeLessThanOrEqual(100);
      expect(p.color).toMatch(/^#/);
    });
    expect(seasonParticles('winter').length).toBeGreaterThan(a.length);
    expect(seasonParticles('summer')).toEqual([]);
  });
});
