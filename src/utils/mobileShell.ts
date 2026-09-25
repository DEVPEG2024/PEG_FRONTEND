/*
 * Fond « app » du téléphone : le noir et le halo de couleur des tableaux de
 * bord (DashboardAdminMobile, DashboardCustomerMobile) posés sur TOUT PEG
 * sous md (demande Nova du 25/09/2026). La couleur est celle choisie sur le
 * tableau de bord (bouton palette), mémorisée sur l'appareil sous la même clé.
 * Posé par MobileDock ; styles : « FOND APP » de _mobile.css.
 */

export const SHELL_DARK = '#070a08';
export const ACCENT_STORAGE_KEY = 'peg:dashboardAccent';
export const DEFAULT_ACCENT = '#c6f432';

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

/** Couleur choisie sur le tableau de bord, sinon le citron d'origine. */
export function readAccent(): string {
  try {
    const v = localStorage.getItem(ACCENT_STORAGE_KEY);
    return v && isHex(v) ? v.toLowerCase() : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

export const rgbOf = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Texte posé SUR la couleur : sombre sur une teinte claire, blanc sur une
// teinte foncée (même règle que les tableaux de bord).
export const onAccentOf = (hex: string) => {
  const [r, g, b] = rgbOf(hex).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#10140a' : '#ffffff';
};

/** Variables CSS lues par les tableaux de bord et par le fond « app ». */
export const accentVars = (hex: string): Record<string, string> => ({
  '--pdm-accent': hex,
  '--pdm-accent-rgb': rgbOf(hex).join(', '),
  '--pdm-on-accent': onAccentOf(hex),
});
