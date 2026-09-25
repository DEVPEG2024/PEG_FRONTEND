import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  accentVars,
  onAccentOf,
  readAccent,
} from '@/utils/mobileShell';

// Fond « app » du téléphone : il suit la couleur choisie sur le tableau de bord.

const memory: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => (k in memory ? memory[k] : null),
    setItem: (k: string, v: string) => {
      memory[k] = v;
    },
  },
  configurable: true,
});

beforeEach(() => {
  Object.keys(memory).forEach((k) => delete memory[k]);
});

describe('couleur du fond « app »', () => {
  it('même clé que le sélecteur de couleur des tableaux de bord', () => {
    expect(ACCENT_STORAGE_KEY).toBe('peg:dashboardAccent');
  });

  it('suit la couleur choisie', () => {
    memory[ACCENT_STORAGE_KEY] = '#A78BFA';
    expect(readAccent()).toBe('#a78bfa');
  });

  it('citron par défaut, et si la valeur est illisible', () => {
    expect(readAccent()).toBe(DEFAULT_ACCENT);
    memory[ACCENT_STORAGE_KEY] = 'violet';
    expect(readAccent()).toBe(DEFAULT_ACCENT);
  });

  it('variables lues par le CSS', () => {
    expect(accentVars('#c6f432')).toEqual({
      '--pdm-accent': '#c6f432',
      '--pdm-accent-rgb': '198, 244, 50',
      '--pdm-on-accent': '#10140a',
    });
  });

  it('texte lisible sur la couleur : sombre sur clair, blanc sur foncé', () => {
    expect(onAccentOf('#c6f432')).toBe('#10140a');
    expect(onAccentOf('#1e3a8a')).toBe('#ffffff');
  });
});
