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
