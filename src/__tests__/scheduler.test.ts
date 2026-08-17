/**
 * Tests unitaires — planificateur (utils/planning/scheduler.ts).
 *
 * Socle du planning admin : un bug de comptage de jours ouvrés ou de calcul
 * de risque fausse les marges, l'urgence et les deadlines affichées. Fonctions
 * pures → dates construites en local (new Date(y, m, d)) pour éviter les
 * décalages de fuseau.
 */

import {
  businessDaysBetween,
  nextBusinessDays,
  analyzeProjects,
  countRisks,
  riskScore,
  isoWeekNumber,
  currentWeekDays,
  addBusinessDays,
  buildTimeline,
  buildForecastFromTimeline,
  capacityBlocksOn,
  timelineRowStats,
  timelineStats,
  deadlineSeries,
  recommendActions,
  unplannableProjects,
  UNASSIGNED_ID,
} from '@/utils/planning/scheduler';
import { Project } from '@/@types/project';

// 2024-01-01 est un lundi ; 01-05 vendredi ; 01-06 samedi ; 01-08 lundi.
const d = (y: number, m: number, day: number) => new Date(y, m, day);

describe('businessDaysBetween', () => {
  test('lundi → vendredi = 4 jours ouvrés', () => {
    expect(businessDaysBetween(d(2024, 0, 1), d(2024, 0, 5))).toBe(4);
  });

  test('vendredi → lundi = 1 (week-end sauté)', () => {
    expect(businessDaysBetween(d(2024, 0, 5), d(2024, 0, 8))).toBe(1);
  });

  test('même jour = 0', () => {
    expect(businessDaysBetween(d(2024, 0, 3), d(2024, 0, 3))).toBe(0);
  });

  test('deadline dépassée → valeur négative', () => {
    expect(businessDaysBetween(d(2024, 0, 5), d(2024, 0, 1))).toBe(-4);
  });
});

describe('nextBusinessDays', () => {
  test('depuis un samedi → démarre le lundi suivant, que des jours ouvrés', () => {
    const days = nextBusinessDays(3, d(2024, 0, 6)); // samedi
    expect(days).toHaveLength(3);
    expect(days.every((dd) => dd.getDay() >= 1 && dd.getDay() <= 5)).toBe(true);
    expect(days[0].getDate()).toBe(8); // lundi 8 janvier
    expect(days[0].getMonth()).toBe(0);
  });
});

describe('analyzeProjects — priorisation par urgence', () => {
  const today = d(2024, 0, 15); // lundi
  const mk = (over: Partial<Project>): Project =>
    ({ documentId: 'x', state: 'pending', price: 100, priority: 'medium', ...over } as unknown as Project);

  const projects: Project[] = [
    mk({ documentId: 'p1', endDate: d(2024, 0, 10), priority: 'high', price: 1000 }), // en retard
    mk({ documentId: 'p2', endDate: d(2024, 1, 15), priority: 'low', price: 100 }), // confortable
    mk({ documentId: 'p3', state: 'fulfilled', endDate: d(2024, 0, 20) }), // exclu (statut)
    mk({ documentId: 'p4', endDate: undefined }), // exclu (pas de deadline)
  ];

  const result = analyzeProjects(projects, today, { p1: 1, p2: 1 });

  test('ignore les projets hors statut actif ou sans deadline', () => {
    expect(result.map((r) => r.project.documentId).sort()).toEqual(['p1', 'p2']);
  });

  test('le projet en retard est classé "late" et en tête', () => {
    expect(result[0].project.documentId).toBe('p1');
    expect(result[0].risk).toBe('late');
  });

  test('le projet confortable est "ok"', () => {
    const p2 = result.find((r) => r.project.documentId === 'p2');
    expect(p2?.risk).toBe('ok');
  });
});

describe('countRisks', () => {
  test('agrège les niveaux de risque', () => {
    const scheduled = [
      { risk: 'late' }, { risk: 'tight' }, { risk: 'ok' }, { risk: 'late' },
    ] as any;
    expect(countRisks(scheduled)).toEqual({ late: 2, tight: 1, ok: 1, total: 4 });
  });
});

describe('riskScore — borné [2, 98]', () => {
  test('marge nulle → 50', () => {
    expect(riskScore({ margin: 0 } as any)).toBe(50);
  });
  test('grosse marge positive → plafonné à 98', () => {
    expect(riskScore({ margin: 20 } as any)).toBe(98);
  });
  test('grosse marge négative → plancher à 2', () => {
    expect(riskScore({ margin: -20 } as any)).toBe(2);
  });
});

describe('addBusinessDays', () => {
  test('vendredi + 1 jour ouvré = lundi', () => {
    const r = addBusinessDays(d(2024, 0, 5), 1);
    expect(r.getDate()).toBe(8);
  });
  test('lundi + 5 jours ouvrés = lundi suivant', () => {
    const r = addBusinessDays(d(2024, 0, 1), 5);
    expect(r.getDate()).toBe(8);
  });
  test('+0 renvoie le jour même', () => {
    expect(addBusinessDays(d(2024, 0, 3), 0).getDate()).toBe(3);
  });
});

describe('unplannableProjects', () => {
  test('remonte les projets actifs sans échéance (ignorés par le moteur)', () => {
    const projects = [
      { documentId: 'a', state: 'pending', endDate: d(2024, 0, 20) },
      { documentId: 'b', state: 'pending' },
      { documentId: 'c', state: 'fulfilled' },
    ] as unknown as Project[];
    expect(unplannableProjects(projects).map((p) => p.documentId)).toEqual(['b']);
  });
});

// ---------------------------------------------------------------------------
// Étalement temporel : le board, les KPI et le prévisionnel doivent tous
// dériver de la MÊME timeline — c'est l'invariant central de l'outil.
// ---------------------------------------------------------------------------

describe('buildTimeline', () => {
  const monday = d(2024, 0, 15); // lundi
  const withProducer = (over: Partial<Project>): Project =>
    ({
      documentId: 'p',
      state: 'pending',
      price: 0,
      priority: 'medium',
      producer: { documentId: 'prod1', name: 'Alice' },
      ...over,
    } as unknown as Project);

  test('étale l’effort sur les jours ouvrés jusqu’à l’échéance', () => {
    const projects = [withProducer({ documentId: 'p1', endDate: d(2024, 0, 19) })]; // vendredi
    const scheduled = analyzeProjects(projects, monday, { p1: 2 }); // 2 j = 16 blocs
    const [row] = buildTimeline(scheduled, {}, monday);
    const total = Object.values(row.byDay).reduce((s, x) => s + x.blocks, 0);
    expect(total).toBe(16);
    // 5 jours ouvrés lun→ven, aucun ne dépasse la capacité quotidienne (8 blocs)
    expect(Object.keys(row.byDay)).toHaveLength(5);
    expect(Math.max(...Object.values(row.byDay).map((x) => x.blocks))).toBeLessThanOrEqual(8);
  });

  test('projet en retard → rattrapage au rythme de la capacité, PAS un pic sur un seul jour', () => {
    const projects = [withProducer({ documentId: 'p2', endDate: d(2024, 0, 10) })]; // échéance passée
    const scheduled = analyzeProjects(projects, monday, { p2: 3 }); // 3 j = 24 blocs
    const [row] = buildTimeline(scheduled, {}, monday);
    expect(row.byDay['2024-01-15'].blocks).toBe(8);
    expect(row.byDay['2024-01-16'].blocks).toBe(8);
    expect(row.byDay['2024-01-17'].blocks).toBe(8);
    expect(Object.keys(row.byDay)).toHaveLength(3);
  });

  test('les congés et jours off ne comptent pas comme capacité disponible', () => {
    const projects = [withProducer({ documentId: 'p3', endDate: d(2024, 0, 19) })];
    const scheduled = analyzeProjects(projects, monday, { p3: 1 });
    const capacities = {
      prod1: { dailyCapacityDays: 1, weeklyOffDays: [5], unavailableDates: ['2024-01-16'] },
    };
    const [row] = buildTimeline(scheduled, capacities, monday);

    expect(capacityBlocksOn(row, d(2024, 0, 16))).toBe(0); // congé
    expect(capacityBlocksOn(row, d(2024, 0, 19))).toBe(0); // vendredi off
    expect(capacityBlocksOn(row, d(2024, 0, 15))).toBe(8);

    // lun→ven : seuls lundi, mercredi et jeudi sont réellement disponibles
    const week = [15, 16, 17, 18, 19].map((n) => d(2024, 0, n));
    expect(timelineRowStats(row, week).capacityBlocks).toBe(24);
  });

  test('la ligne « Non assigné » est exclue des agrégats de capacité', () => {
    const projects = [
      withProducer({ documentId: 'p4', endDate: d(2024, 0, 19) }),
      { documentId: 'p5', state: 'pending', priority: 'medium', price: 0, endDate: d(2024, 0, 19) } as unknown as Project,
    ];
    const scheduled = analyzeProjects(projects, monday, { p4: 1, p5: 1 });
    const rows = buildTimeline(scheduled, {}, monday);
    expect(rows.some((r) => r.producerId === UNASSIGNED_ID)).toBe(true);

    const week = [15, 16, 17, 18, 19].map((n) => d(2024, 0, n));
    const stats = timelineStats(rows, week);
    expect(stats.producerCount).toBe(1); // seul Alice a une capacité réelle
    expect(stats.capacityBlocks).toBe(40); // 5 j × 8 blocs
    expect(stats.usedBlocks).toBe(8); // l’effort non assigné n’est pas compté
  });
});

describe('buildForecastFromTimeline', () => {
  test('le prévisionnel reflète l’étalement réel, pas la semaine de l’échéance', () => {
    const monday = d(2024, 0, 15);
    const project = {
      documentId: 'p1',
      state: 'pending',
      priority: 'medium',
      price: 0,
      endDate: d(2024, 0, 19),
      producer: { documentId: 'prod1', name: 'Alice' },
    } as unknown as Project;

    const scheduled = analyzeProjects([project], monday, { p1: 3 }); // 24 blocs
    const rows = buildTimeline(scheduled, {}, monday);
    const forecast = buildForecastFromTimeline(rows, 2, monday);

    expect(forecast).toHaveLength(2);
    expect(forecast[0].usedBlocks).toBe(24);
    expect(forecast[0].capacityBlocks).toBe(40); // 5 jours ouvrés × 8 blocs
    expect(forecast[0].loadPct).toBe(60);
    expect(forecast[1].usedBlocks).toBe(0); // rien ne déborde sur la semaine suivante
  });
});

describe('deadlineSeries', () => {
  test('compte les échéances du niveau de risque demandé, semaine par semaine', () => {
    const monday = d(2024, 0, 15);
    const scheduled = [
      { risk: 'late', project: { endDate: d(2024, 0, 17) } },
      { risk: 'late', project: { endDate: d(2024, 0, 24) } },
      { risk: 'ok', project: { endDate: d(2024, 0, 17) } },
    ] as any;
    expect(deadlineSeries(scheduled, 'late', 3, monday)).toEqual([1, 1, 0]);
    expect(deadlineSeries(scheduled, 'ok', 3, monday)).toEqual([1, 0, 0]);
  });
});

describe('recommendActions', () => {
  const monday = d(2024, 0, 15);

  test('un projet sans producteur donne une action « assigner »', () => {
    const project = { documentId: 'p1', state: 'pending', priority: 'medium', price: 0, endDate: d(2024, 0, 26) } as unknown as Project;
    const scheduled = analyzeProjects([project], monday, { p1: 1 });
    const actions = recommendActions(scheduled, [], monday);
    expect(actions[0].icon).toBe('assign');
    expect(actions[0].projectDocumentId).toBe('p1');
  });

  test('un projet en retard propose une échéance tenable, applicable en simulation', () => {
    const project = {
      documentId: 'p2', state: 'pending', priority: 'medium', price: 0,
      endDate: d(2024, 0, 10),
      producer: { documentId: 'prod1', name: 'Alice' },
    } as unknown as Project;
    const scheduled = analyzeProjects([project], monday, { p2: 2 });
    const actions = recommendActions(scheduled, [], monday);

    const shift = actions.find((a) => a.icon === 'shift');
    expect(shift).toBeDefined();
    // lundi 15 + 2 jours ouvrés = mercredi 17
    expect(shift?.sim?.newEndDate).toBe('2024-01-17');
    expect(shift?.sim?.projectDocumentId).toBe('p2');
  });
});

describe('isoWeekNumber / currentWeekDays', () => {
  test('le 4 janvier est toujours en semaine ISO 1', () => {
    expect(isoWeekNumber(d(2024, 0, 4))).toBe(1);
  });

  test('currentWeekDays renvoie 7 jours démarrant un lundi', () => {
    const week = currentWeekDays(d(2024, 0, 3)); // mercredi
    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(1); // lundi
    expect(week[0].getDate()).toBe(1); // lundi 1er janvier
  });
});
