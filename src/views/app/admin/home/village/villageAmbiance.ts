// Ambiance du village selon l'heure et la saison réelles (Haute-Savoie) :
// nuit, aube, crépuscule, et feuilles mortes, neige ou pétales qui tombent.
// Fonctions pures, testées ; l'admin peut couper l'ambiance (choix par appareil).

export type Phase = 'day' | 'dawn' | 'dusk' | 'night';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

/**
 * Lever et coucher du soleil à Annecy au milieu de chaque mois, en heures
 * locales (heure d'été comprise). Précision de l'ordre du quart d'heure :
 * largement assez pour allumer les lampadaires.
 */
const SUN: [number, number][] = [
  [8.15, 17.25], // janvier
  [7.75, 17.9],
  [7.05, 18.55],
  [6.95, 20.25], // avril (heure d'été)
  [6.15, 20.9],
  [5.75, 21.4],
  [6.0, 21.35],
  [6.6, 20.75],
  [7.25, 19.75],
  [7.9, 18.75], // octobre
  [7.55, 17.1],
  [8.15, 16.9],
];

export const phaseAt = (date: Date): Phase => {
  const [rise, set] = SUN[date.getMonth()];
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < rise - 0.5 || h >= set + 0.5) return 'night';
  if (h < rise + 0.75) return 'dawn';
  if (h >= set - 0.75) return 'dusk';
  return 'day';
};

/** Saisons astronomiques (dates arrondies). */
export const seasonAt = (date: Date): Season => {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  if (md >= 1221 || md < 320) return 'winter';
  if (md < 621) return 'spring';
  if (md < 922) return 'summer';
  return 'autumn';
};

export interface Particle {
  /** Position de départ, en % de la largeur de la carte. */
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  color: string;
  rotate: number;
}

const COLORS: Record<Season, string[]> = {
  autumn: ['#e07a2f', '#c2410c', '#d9a13b', '#b45309', '#e8b04a'],
  winter: ['#ffffff'],
  spring: ['#f9a8d4', '#fbcfe8', '#ffffff', '#f472b6'],
  summer: [],
};
const COUNT: Record<Season, number> = {
  autumn: 16,
  winter: 42,
  spring: 16,
  summer: 0,
};

/**
 * Particules de la saison (feuilles, flocons, pétales). Déterministes : le
 * même rendu à chaque affichage, pas de hasard qui fasse « sauter » la scène.
 */
export const seasonParticles = (season: Season): Particle[] => {
  const palette = COLORS[season];
  return Array.from({ length: COUNT[season] }, (_, i) => {
    const r = (k: number) =>
      (((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1) + 1) % 1;
    const snow = season === 'winter';
    return {
      left: Math.round(r(1) * 1000) / 10,
      size: snow ? 3 + Math.round(r(2) * 4) : 9 + Math.round(r(2) * 6),
      duration: Math.round((snow ? 9 : 11) + r(3) * 9),
      delay: -Math.round(r(4) * 20 * 10) / 10,
      drift: Math.round((r(5) - 0.5) * 120),
      color: palette[Math.floor(r(6) * palette.length)],
      rotate: Math.round(r(7) * 360),
    };
  });
};

export interface Ambiance {
  phase: Phase;
  season: Season;
  /** Voile posé sur la carte (couleur + opacité), null de jour. */
  veil: { color: string; opacity: number } | null;
  /** Fond de la carte autour de l'îlot. */
  sky: string;
  /** Lampadaires et fenêtres allumés. */
  lights: number;
  /** Neige posée sur le sol (0 à 1). */
  snow: number;
  /** Teinte du titre, lisible sur le ciel. */
  ink: string;
  muted: string;
}

export const ambianceAt = (date: Date): Ambiance => {
  const phase = phaseAt(date);
  const season = seasonAt(date);
  const winterSnow = season === 'winter' ? 0.38 : 0;
  switch (phase) {
    case 'night':
      return {
        phase,
        season,
        veil: { color: '#1b2350', opacity: 0.5 },
        sky: 'linear-gradient(180deg, #141a38 0%, #27315e 100%)',
        lights: 1,
        snow: winterSnow,
        ink: '#ffffff',
        muted: 'rgba(255,255,255,0.72)',
      };
    case 'dusk':
    case 'dawn':
      return {
        phase,
        season,
        veil: {
          color: phase === 'dusk' ? '#f08a4b' : '#f4b9a0',
          opacity: phase === 'dusk' ? 0.13 : 0.11,
        },
        sky:
          phase === 'dusk'
            ? 'linear-gradient(180deg, #f7d9c4 0%, #f6f3ed 70%)'
            : 'linear-gradient(180deg, #f3e3ee 0%, #f6f3ed 70%)',
        lights: phase === 'dusk' ? 0.6 : 0.3,
        snow: winterSnow,
        ink: '#111827',
        muted: '#6b7280',
      };
    default:
      return {
        phase,
        season,
        veil: null,
        sky: '#f6f3ed',
        lights: 0,
        snow: winterSnow,
        ink: '#111827',
        muted: '#6b7280',
      };
  }
};

/** Ambiance neutre (jour, sans particules) quand l'admin l'a coupée. */
export const NEUTRAL: Ambiance = {
  phase: 'day',
  season: 'summer',
  veil: null,
  sky: '#f6f3ed',
  lights: 0,
  snow: 0,
  ink: '#111827',
  muted: '#6b7280',
};

const KEY = 'peg:villageAmbiance';

export const readAmbianceOn = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

export const writeAmbianceOn = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // stockage indisponible : le choix vaut pour la session
  }
};
