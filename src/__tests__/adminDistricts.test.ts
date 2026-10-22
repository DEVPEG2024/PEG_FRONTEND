// « PEG DISTRICTS » (accueil admin) : la ville est une image, les repères sont
// posés dessus. Chaque quartier a sa carte, les sites de production sont des
// rubriques de la Production, tout reste dans l'image ; le cadrage remplit
// toujours le cadre et le zoom garde le point visé.
import {
  CITY_IMAGE,
  CONVEYOR,
  CONVEYOR_SHORT,
  DISTRICT_SPOTS,
  DISTRICT_ZOOM_MAX,
  PRODUCTION_SITES,
  cityCamera,
  districtLine,
  focusOfCamera,
  keepInside,
  readCount,
  toFrame,
  toImage,
} from '@/views/app/admin/home/village/districtsScene';
import {
  DISTRICTS,
  membersOf,
} from '@/views/app/admin/home/village/villageScene';
import type { VillageData } from '@/views/app/admin/home/village/villageModel';

const inImage = ([x, y]: [number, number]) =>
  x >= 0 && x <= CITY_IMAGE.w && y >= 0 && y <= CITY_IMAGE.h;

describe('PEG DISTRICTS — les repères sur la ville', () => {
  it('une carte par quartier, posée sur l’image', () => {
    expect(DISTRICT_SPOTS.map((s) => s.id).sort()).toEqual(
      DISTRICTS.map((d) => d.id).sort()
    );
    for (const s of DISTRICT_SPOTS) {
      expect({ id: s.id, card: inImage(s.card) }).toEqual({
        id: s.id,
        card: true,
      });
      expect({ id: s.id, glow: inImage(s.glow) }).toEqual({
        id: s.id,
        glow: true,
      });
      expect(s.radius).toBeGreaterThan(0);
    }
  });

  it('les trois sites numérotés sont les rubriques de la Production', () => {
    expect(PRODUCTION_SITES.map((s) => s.n)).toEqual([1, 2, 3]);
    expect(PRODUCTION_SITES.map((s) => s.id).sort()).toEqual(
      [...membersOf('production')].sort()
    );
    for (const s of PRODUCTION_SITES) expect(inImage(s.at)).toBe(true);
  });

  it('la ligne de production reste dans l’image', () => {
    for (const p of [...CONVEYOR, ...CONVEYOR_SHORT])
      expect(inImage(p)).toBe(true);
    expect(CONVEYOR.length).toBeGreaterThan(2);
  });
});

describe('PEG DISTRICTS — cadrage', () => {
  const frames: [number, number][] = [
    [1258, 705],
    [1092, 612],
    [720, 440],
    [1600, 520],
  ];

  it('l’image remplit toujours le cadre, quels que soient le zoom et le point visé', () => {
    for (const [w, h] of frames)
      for (const zoom of [0.5, 1, 1.4, 2.2, 5])
        for (const focus of [
          undefined,
          [0, 0] as [number, number],
          [CITY_IMAGE.w, CITY_IMAGE.h] as [number, number],
          [400, 900] as [number, number],
        ]) {
          const c = cityCamera(w, h, zoom, focus);
          expect(c.tx).toBeLessThanOrEqual(1e-9);
          expect(c.ty).toBeLessThanOrEqual(1e-9);
          expect(c.tx + CITY_IMAGE.w * c.k).toBeGreaterThanOrEqual(w - 1e-6);
          expect(c.ty + CITY_IMAGE.h * c.k).toBeGreaterThanOrEqual(h - 1e-6);
        }
  });

  it('le zoom reste entre 1 et son maximum', () => {
    const base = cityCamera(1092, 612, 1).k;
    expect(cityCamera(1092, 612, 0.2).k).toBeCloseTo(base, 9);
    expect(cityCamera(1092, 612, 9).k).toBeCloseTo(base * DISTRICT_ZOOM_MAX, 9);
  });

  it('toFrame et toImage sont inverses ; le point visé est au centre quand c’est possible', () => {
    const c = cityCamera(1092, 612, 2, [800, 450]);
    for (const p of [
      [0, 0],
      [800, 450],
      [1500, 900],
    ] as [number, number][]) {
      const back = toImage(c, toFrame(c, p));
      expect(back[0]).toBeCloseTo(p[0], 9);
      expect(back[1]).toBeCloseTo(p[1], 9);
    }
    const [fx, fy] = focusOfCamera(c, 1092, 612);
    expect(fx).toBeCloseTo(800, 6);
    expect(fy).toBeCloseTo(450, 6);
  });

  it('une carte reste entière dans le cadre', () => {
    for (const p of [
      [-50, -50],
      [2000, 30],
      [600, 400],
      [10, 900],
    ] as [number, number][]) {
      const [x, y] = keepInside(p, 238, 60, 1092, 612);
      expect(x - 119).toBeGreaterThanOrEqual(12);
      expect(x + 119).toBeLessThanOrEqual(1092 - 12);
      expect(y - 30).toBeGreaterThanOrEqual(12);
      expect(y + 30).toBeLessThanOrEqual(612 - 12);
    }
    // Déjà à l'intérieur : elle ne bouge pas.
    expect(keepInside([600, 400], 238, 60, 1092, 612)).toEqual([600, 400]);
  });
});

describe('PEG DISTRICTS — les chiffres des cartes', () => {
  const data = {
    kpis: { projectsInProgress: 38 },
    sections: {
      clients: { stats: [{ label: 'Clients', value: '64' }] },
      boutique: { stats: [{ label: 'Produits actifs', value: '1 214' }] },
      producteurs: { stats: [{ label: 'Producteurs', value: '1' }] },
      finance: { stats: [{ label: 'Factures à régler', value: '—' }] },
      tickets: { stats: [{ label: 'Ouverts', value: '0' }] },
    },
  } as unknown as VillageData;

  it('un vrai chiffre par quartier, au singulier comme au pluriel', () => {
    expect(districtLine('clients', data, false)).toBe('64 clients');
    expect(districtLine('projets', data, false)).toBe('38 projets en cours');
    expect(districtLine('boutique', data, false)).toBe('1214 produits actifs');
    expect(districtLine('production', data, false)).toBe('1 producteur');
    expect(districtLine('assistance', data, false)).toBe('0 ticket ouvert');
  });

  it('un chiffre illisible ne devient jamais un faux 0', () => {
    expect(readCount('—')).toBeNull();
    expect(readCount(undefined)).toBeNull();
    expect(readCount(Number.NaN)).toBeNull();
    expect(readCount('1 234')).toBe(1234);
    expect(districtLine('finance', data, false)).toBe('Chiffres indisponibles');
    expect(districtLine('clients', null, true)).toBe('Chargement…');
    expect(districtLine('clients', null, false)).toBe('Chiffres indisponibles');
  });
});
