/**
 * Date d'expédition prévue — formatage pur (src/utils/deliveryEstimate.ts).
 *   npx jest src/__tests__/deliveryEstimate.test.ts
 */
import {
  type DeliveryEstimate,
  UNAVAILABLE_MESSAGE,
  dayLabel,
  deliveryLine,
  hourLabel,
  isServiceUnavailable,
  isStale,
  parisToday,
  refreshDelayMs,
} from '@/utils/deliveryEstimate';

// Réponse réelle du serveur, samedi 21/11/2026 à 00 h 43 (Paris) : film au mètre.
const dtf: DeliveryEstimate = {
  shipDate: '2026-11-24',
  workingDays: 2,
  orderBefore: '10:00',
  orderBeforeDate: '2026-11-23',
  orderBeforeAt: '2026-11-23T09:00:00.000Z',
  today: '2026-11-21',
};
const saturday = new Date('2026-11-20T23:43:17Z');

describe('dayLabel / hourLabel', () => {
  it('écrit les dates à la française', () => {
    expect(dayLabel('2026-11-24')).toBe('mardi 24 novembre');
    expect(dayLabel('2026-12-01')).toBe('mardi 1er décembre');
    expect(dayLabel('2027-01-05')).toBe('mardi 5 janvier');
    expect(dayLabel('2026-08-03T00:00:00Z')).toBe('lundi 3 août');
    expect(dayLabel('demain')).toBeNull();
    expect(dayLabel(null)).toBeNull();
  });

  it('écrit les heures à la française', () => {
    expect(hourLabel('10:00')).toBe('10 h');
    expect(hourLabel('12:30')).toBe('12 h 30');
    expect(hourLabel('09:05')).toBe('9 h 05');
    expect(hourLabel('25:00')).toBeNull();
    expect(hourLabel(null)).toBeNull();
  });
});

describe('parisToday', () => {
  it('vendredi 23 h 43 UTC = samedi à Paris', () => {
    expect(parisToday(saturday)).toBe('2026-11-21');
  });
  it('heure d’été', () => {
    expect(parisToday(new Date('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
  });
});

describe('deliveryLine', () => {
  it('heure limite un autre jour (week-end)', () => {
    expect(deliveryLine(dtf, { now: saturday })).toBe(
      'Commandez avant lundi 10 h : expédition prévue le mardi 24 novembre'
    );
  });

  it('heure limite aujourd’hui', () => {
    const now = new Date('2026-12-02T08:00:00Z'); // mercredi 9 h à Paris
    const e: DeliveryEstimate = {
      ...dtf,
      shipDate: '2026-12-03',
      orderBeforeDate: '2026-12-02',
      orderBeforeAt: '2026-12-02T09:00:00.000Z',
      today: '2026-12-02',
    };
    expect(deliveryLine(e, { now })).toBe(
      'Commandez avant 10 h : expédition prévue demain, jeudi 3 décembre'
    );
  });

  it('heure limite passée : avant demain', () => {
    const now = new Date('2026-12-02T10:00:00Z'); // mercredi 11 h à Paris
    const e: DeliveryEstimate = {
      ...dtf,
      shipDate: '2026-12-04',
      orderBeforeDate: '2026-12-03',
      orderBeforeAt: '2026-12-03T09:00:00.000Z',
      today: '2026-12-02',
    };
    expect(deliveryLine(e, { now })).toBe(
      'Commandez avant demain 10 h : expédition prévue le vendredi 4 décembre'
    );
  });

  it('sans heure limite (textile)', () => {
    const textile: DeliveryEstimate = {
      shipDate: '2026-12-01',
      workingDays: 7,
      orderBefore: null,
      orderBeforeDate: null,
      orderBeforeAt: null,
      today: '2026-11-21',
    };
    expect(deliveryLine(textile, { now: saturday })).toBe(
      'Expédition prévue le mardi 1er décembre'
    );
  });

  it('délai confirmé à la commande : rien', () => {
    expect(
      deliveryLine(
        { ...dtf, shipDate: null, orderBefore: null, orderBeforeAt: null },
        { now: saturday }
      )
    ).toBeNull();
    expect(deliveryLine(null, { now: saturday })).toBeNull();
  });

  it('la date du formulaire prime', () => {
    // même date : la phrase complète (heure limite comprise) reste juste
    expect(
      deliveryLine(dtf, { now: saturday, formShipDate: '2026-11-24' })
    ).toBe(
      'Commandez avant lundi 10 h : expédition prévue le mardi 24 novembre'
    );
    // date différente (option express…) : celle du formulaire seule
    expect(
      deliveryLine(dtf, { now: saturday, formShipDate: '2026-11-23' })
    ).toBe('Expédition prévue le lundi 23 novembre');
    // sans estimation du serveur
    expect(
      deliveryLine(null, { now: saturday, formShipDate: '2026-12-01' })
    ).toBe('Expédition prévue le mardi 1er décembre');
  });

  it('expédition le jour même', () => {
    const now = new Date('2026-12-02T08:00:00Z');
    const e: DeliveryEstimate = {
      ...dtf,
      shipDate: '2026-12-02',
      orderBeforeDate: '2026-12-02',
      orderBeforeAt: '2026-12-02T09:00:00.000Z',
      today: '2026-12-02',
    };
    expect(deliveryLine(e, { now })).toBe(
      'Commandez avant 10 h : expédition aujourd’hui'
    );
  });

  it('estimation périmée (heure limite passée depuis) : ignorée', () => {
    const after = new Date('2026-11-23T09:00:01Z');
    expect(isStale(dtf, after)).toBe(true);
    expect(deliveryLine(dtf, { now: after })).toBeNull();
    expect(deliveryLine(dtf, { now: after, formShipDate: '2026-11-25' })).toBe(
      'Expédition prévue le mercredi 25 novembre'
    );
  });
});

describe('refreshDelayMs', () => {
  it('relit à l’heure limite si elle est proche', () => {
    const now = new Date('2026-11-23T08:59:00Z');
    expect(refreshDelayMs(dtf, now)).toBe(61_000);
    expect(refreshDelayMs(dtf, saturday)).toBeNull(); // plus de 12 h
    expect(refreshDelayMs({ ...dtf, orderBeforeAt: null }, now)).toBeNull();
    // déjà passée (horloge en avance) : une minute, pas de rafale
    expect(refreshDelayMs(dtf, new Date('2026-11-23T09:05:00Z'))).toBe(60_000);
  });
});

describe('isServiceUnavailable', () => {
  it('reconnaît le 503 « indisponible » du serveur', () => {
    expect(
      isServiceUnavailable({
        response: {
          status: 503,
          data: { error: UNAVAILABLE_MESSAGE, unavailable: true },
        },
      })
    ).toBe(true);
    expect(
      isServiceUnavailable({
        response: { status: 503, data: { error: 'x' } },
      })
    ).toBe(false);
    expect(
      isServiceUnavailable({
        response: { status: 404, data: { unavailable: true } },
      })
    ).toBe(false);
    expect(isServiceUnavailable(new Error('réseau'))).toBe(false);
  });

  it('message neutre (jamais le nom de l’imprimeur)', () => {
    expect(UNAVAILABLE_MESSAGE).toBe(
      'Ce produit est momentanément indisponible. Réessayez dans quelques minutes.'
    );
  });
});
