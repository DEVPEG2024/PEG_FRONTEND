/**
 * Design « hub » commun — calculs des petits graphiques
 * (src/components/shared/hub/HubWidgets.tsx).
 *   npx jest src/__tests__/hubWidgets.test.ts
 */
import { niceScale, sparkline, tint } from '@/components/shared/hub/HubWidgets';

describe('graduations', () => {
  it('rondes, de 0 au-dessus du maximum', () => {
    expect(niceScale(0)).toEqual([0]);
    expect(niceScale(430)).toEqual([0, 200, 400, 600]);
    expect(niceScale(1000)).toEqual([0, 500, 1000]);
    expect(niceScale(87)).toEqual([0, 50, 100]);
  });
});

describe('courbe', () => {
  it('de gauche à droite, le plus haut en haut, à plat si tout est nul', () => {
    const p = sparkline([0, 10, 5], 84, 30);
    expect(p[0][0]).toBe(4);
    expect(p[2][0]).toBe(80);
    expect(p[1][1]).toBe(4);
    expect(p[0][1]).toBe(26);
    expect(sparkline([0, 0], 84, 30).every(([, y]) => y === 15)).toBe(true);
    expect(sparkline([], 84, 30)).toEqual([]);
  });
});

describe('teinte', () => {
  it('couleur avec transparence', () => {
    expect(tint('#7c6cf0', 0.5)).toBe('rgba(124,108,240,0.5)');
  });
});
