/**
 * Accueil client — rendu TÉLÉPHONE uniquement (< md), même langage que le
 * tableau de bord admin sur téléphone (DashboardAdminMobile, demande Nova du
 * 25/09/2026) : fond noir, tuiles vitrées, raccourcis ronds, listes façon
 * transactions, couleur d'accent au choix. En tête, pas de montant : un accueil
 * qui crée du lien (« créer du lien et faire beau », Nova) — salutation, la
 * relation avec PEG, ses réalisations en photos, et son équipe en bas de page.
 *
 * Composant d'AFFICHAGE : DashboardCustomer calcule tout (mêmes valeurs et
 * mêmes libellés que l'ordinateur) et passe des données prêtes à afficher.
 * Pas de bannière (demande Nova du 25/09/2026) : comme sur le tableau de bord
 * admin, une photo que le client téléverse lui-même passe en fond, estompée,
 * derrière la salutation (useDashboardPhoto, rattachée à son compte).
 *
 * Mêmes variables `--pdm-*` et même classe `peg-dash-dark` sur le body que
 * l'admin : en-tête et barre d'onglets se fondent dans le même noir.
 */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  HiOutlineChatAlt2,
  HiOutlineChevronRight,
  HiOutlineColorSwatch,
  HiOutlineCube,
  HiOutlinePhone,
  HiOutlinePhotograph,
  HiOutlineRefresh,
} from 'react-icons/hi';
import type { DashboardPhoto } from '@/utils/hooks/useDashboardPhoto';

export const PCM_DARK = '#070a08';

export type PcmTile = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'accent' | 'amber' | 'sky' | 'mint';
  onClick: () => void;
};

export type PcmShortcut = { key: string; label: string; icon: ReactNode; onClick: () => void };

export type PcmRow = {
  key: string;
  title: string;
  sub?: string;
  /** Pastille d'état avant le sous-titre (ex. « En cours ») */
  pill?: { label: string; color: string };
  icon?: ReactNode;
  image?: string;
  /** Couleur de la pastille d'icône (et du bouton d'action) */
  color?: string;
  /** Montant à droite, et sa précision en dessous */
  right?: string;
  rightSub?: string;
  /** Bouton d'action à droite (« Valider », « Régler »…) */
  cta?: string;
  onClick?: () => void;
};

export type PcmProduct = { key: string; name: string; price: string; image?: string; onClick: () => void };

/** Une réalisation : photo d'un projet du client */
export type PcmWork = { key: string; image: string; title: string; caption: string; onClick: () => void };

type Props = {
  /** Photo de fond de l'accueil, téléversée par le client */
  photo: DashboardPhoto;
  hero: {
    /** « jeudi 25 septembre » */
    date: string;
    /** « Bonjour » / « Bonsoir » */
    hello: string;
    name: string;
    /** Pastilles de relation (« Ensemble depuis… », « 12 projets réalisés ») */
    facts: string[];
    premium: boolean;
  };
  onRefresh: () => void;
  refreshing: boolean;
  works: PcmWork[];
  onSeeAllWorks: () => void;
  todos: PcmRow[];
  tiles: PcmTile[];
  shortcuts: PcmShortcut[];
  orders: PcmRow[];
  onSeeAllOrders: () => void;
  onOrder: () => void;
  activity: PcmRow[];
  suggestions: PcmProduct[];
  onSeeCatalogue?: () => void;
  offers: PcmProduct[];
  onSeeOffers?: () => void;
  team: { phone?: string; onWrite: () => void };
};

const CSS = `
.pcm {
  --pdm-text: #f3f7ec;
  --pdm-muted: rgba(232, 242, 220, 0.55);
  --pdm-faint: rgba(232, 242, 220, 0.32);
  --pdm-card: rgba(255, 255, 255, 0.045);
  --pdm-line: rgba(255, 255, 255, 0.08);
  position: relative;
  min-height: calc(100dvh - 64px);
  color: var(--pdm-text);
  font-family: Inter, sans-serif;
  background:
    radial-gradient(130% 50% at 100% 12%, rgba(var(--pdm-accent-rgb), 0.24) 0%, rgba(var(--pdm-accent-rgb), 0.08) 40%, transparent 70%),
    radial-gradient(90% 40% at 0% 45%, rgba(var(--pdm-accent-rgb), 0.06) 0%, transparent 60%),
    ${PCM_DARK};
  overflow: hidden;
}
.pcm-body { position: relative; padding: 16px 16px 28px; }
/* En-tête de l'accueil : la photo du client en fond, estompée et fondue en
   haut comme en bas — même traitement que la bannière du tableau de bord admin */
.pcm-hero { position: relative; margin: -16px -16px 0; padding: 16px 16px 8px; overflow: hidden; }
.pcm-hero > *:not(.pcm-hero-bg) { position: relative; }
.pcm-hero-bg {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  opacity: 0.22; filter: saturate(0.8);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 30%, #000 60%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 30%, #000 60%, transparent 100%);
  pointer-events: none;
}
.pcm-photo-actions { display: flex; gap: 8px; }
.pcm-photo-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 42px; padding: 0 16px; border-radius: 100px; cursor: pointer;
  border: 1px solid var(--pdm-line); background: rgba(255, 255, 255, 0.06);
  color: var(--pdm-text); font: inherit; font-size: 13px; font-weight: 600;
}
.pcm-photo-btn.is-main { flex: 1; border-color: transparent; background: var(--pdm-accent); color: var(--pdm-on-accent); font-weight: 700; }
.pcm-photo-btn:disabled { opacity: 0.6; cursor: default; }
.pcm-photo-hint { margin: 10px 2px 0; font-size: 11.5px; color: var(--pdm-faint); }
.pcm-photo-error { margin: 10px 0 0; font-size: 12.5px; color: #fca5a5; }
.pcm-pulse-icon { animation: pcm-pulse 1.1s ease-in-out infinite; }
.pcm-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pcm-icons { display: flex; gap: 6px; flex-shrink: 0; }
.pcm-icon-btn {
  width: 38px; height: 38px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.06); border: 1px solid var(--pdm-line);
  color: var(--pdm-text); font-size: 18px; cursor: pointer;
}
.pcm-icon-btn.is-on { color: var(--pdm-on-accent); background: var(--pdm-accent); border-color: transparent; }
.pcm-icon-btn:active { transform: scale(0.94); }
.pcm-spin { animation: pcm-spin 0.9s linear infinite; }
@keyframes pcm-spin { to { transform: rotate(360deg); } }

.pcm-date { font-size: 11.5px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pdm-muted); }
.pcm-hero-title {
  margin: 14px 0 0; font-size: 38px; line-height: 1.04; font-weight: 800;
  letter-spacing: -0.035em; color: #fff; overflow-wrap: anywhere;
}
.pcm-hero-name {
  background: linear-gradient(100deg, var(--pdm-accent) 0%, #ffffff 140%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.pcm-facts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.pcm-fact {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 100px;
  font-size: 11.5px; font-weight: 600; color: var(--pdm-text);
  background: rgba(255, 255, 255, 0.06); border: 1px solid var(--pdm-line);
}
.pcm-fact.is-accent { color: var(--pdm-accent); background: rgba(var(--pdm-accent-rgb), 0.10); border-color: rgba(var(--pdm-accent-rgb), 0.28); }
/* Entrée douce, en cascade */
.pcm-rise { animation: pcm-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
.pcm-rise-2 { animation-delay: 0.08s; }
.pcm-rise-3 { animation-delay: 0.16s; }
.pcm-rise-4 { animation-delay: 0.24s; }
@keyframes pcm-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

.pcm-works {
  display: flex; gap: 12px; overflow-x: auto; margin: 0 -16px; padding: 2px 16px 6px;
  scroll-snap-type: x mandatory; scroll-padding-inline: 16px; scrollbar-width: none; -webkit-overflow-scrolling: touch;
}
.pcm-works::-webkit-scrollbar { display: none; }
.pcm-work {
  position: relative; flex: 0 0 64%; max-width: 260px; aspect-ratio: 4 / 5; scroll-snap-align: start;
  border-radius: 24px; overflow: hidden; padding: 0; border: 1px solid var(--pdm-line);
  background: rgba(255, 255, 255, 0.04); cursor: pointer; font: inherit; color: inherit; text-align: left;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
}
.pcm-work:only-child { flex-basis: 100%; max-width: none; aspect-ratio: 16 / 10; }
.pcm-work:active { transform: scale(0.98); }
.pcm-work img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pcm-work::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgba(0, 0, 0, 0.78) 100%);
}
.pcm-work-text { position: absolute; left: 14px; right: 14px; bottom: 13px; z-index: 1; }
.pcm-work-title { display: block; font-size: 14.5px; font-weight: 700; color: #fff; line-height: 1.25; overflow-wrap: anywhere; }
.pcm-work-caption { display: block; margin-top: 4px; font-size: 11.5px; color: rgba(255, 255, 255, 0.72); }
.pcm-cta {
  margin-top: 16px; display: inline-flex; align-items: center; gap: 6px;
  border: 0; border-radius: 100px; padding: 11px 20px; cursor: pointer;
  background: var(--pdm-accent); color: var(--pdm-on-accent);
  font: inherit; font-size: 13.5px; font-weight: 700;
  box-shadow: 0 8px 24px rgba(var(--pdm-accent-rgb), 0.25);
}
.pcm-cta:active { transform: scale(0.97); }

.pcm-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 26px 0 12px; }
.pcm-section-head h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--pdm-text); letter-spacing: -0.01em; }
.pcm-link { background: none; border: 0; padding: 4px 0; font: inherit; font-size: 12px; font-weight: 600; color: var(--pdm-accent); cursor: pointer; }
.pcm-count {
  min-width: 22px; height: 22px; padding: 0 7px; border-radius: 100px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--pdm-accent); color: var(--pdm-on-accent); font-size: 11.5px; font-weight: 800;
}

.pcm-shortcuts {
  display: flex; gap: 14px; overflow-x: auto; margin: 0 -16px; padding: 2px 16px 4px;
  scrollbar-width: none; -webkit-overflow-scrolling: touch;
}
.pcm-shortcuts::-webkit-scrollbar { display: none; }
.pcm-shortcut {
  flex: 1 0 70px; display: flex; flex-direction: column; align-items: center; gap: 7px;
  background: none; border: 0; padding: 0; color: var(--pdm-text); font: inherit; cursor: pointer; text-align: center;
}
.pcm-shortcut-ring {
  width: 58px; height: 58px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 23px; color: var(--pdm-accent);
  background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03) 70%);
  border: 1.5px solid rgba(var(--pdm-accent-rgb), 0.35);
  box-shadow: 0 0 18px rgba(var(--pdm-accent-rgb), 0.10);
}
.pcm-shortcut:active .pcm-shortcut-ring { transform: scale(0.94); }
.pcm-shortcut-label { font-size: 11px; line-height: 1.2; color: var(--pdm-muted); }

.pcm-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.pcm-tile {
  position: relative; text-align: left; border-radius: 22px; padding: 14px 14px 15px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.075) 0%, rgba(255, 255, 255, 0.025) 100%);
  border: 1px solid var(--pdm-line); color: var(--pdm-text);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: flex; flex-direction: column; gap: 10px; min-width: 0;
  cursor: pointer; font: inherit;
}
.pcm-tile:active { transform: scale(0.98); }
/* Nombre impair de tuiles (client Standard : pas d'offres) : la dernière prend la rangée */
.pcm-tile:last-child:nth-child(odd) { grid-column: 1 / -1; }
.pcm-tile-icon {
  width: 36px; height: 36px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 18px; color: var(--pdm-accent); background: rgba(var(--pdm-accent-rgb), 0.10);
  border: 1px solid rgba(var(--pdm-accent-rgb), 0.22);
}
.pcm-tile[data-tone="amber"] .pcm-tile-icon { color: #fbbf24; background: rgba(251, 191, 36, 0.10); border-color: rgba(251, 191, 36, 0.25); }
.pcm-tile[data-tone="mint"] .pcm-tile-icon { color: #5eead4; background: rgba(94, 234, 212, 0.10); border-color: rgba(94, 234, 212, 0.25); }
.pcm-tile[data-tone="sky"] .pcm-tile-icon { color: #7dd3fc; background: rgba(125, 211, 252, 0.10); border-color: rgba(125, 211, 252, 0.25); }
.pcm-tile-label { font-size: 12px; color: var(--pdm-muted); line-height: 1.25; }
.pcm-tile-value { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #fff; font-variant-numeric: tabular-nums; }
.pcm-tile-go { position: absolute; top: 16px; right: 12px; color: var(--pdm-faint); font-size: 16px; }

.pcm-list { border-radius: 22px; background: var(--pdm-card); border: 1px solid var(--pdm-line); padding: 4px 14px; }
.pcm-row {
  width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 0;
  border: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: none;
  color: inherit; font: inherit; text-align: left;
}
.pcm-row:last-child { border-bottom: 0; }
button.pcm-row { cursor: pointer; }
.pcm-row-icon {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; overflow: hidden;
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  background: rgba(var(--pdm-accent-rgb), 0.10); color: var(--pdm-accent);
}
.pcm-row-icon img { width: 100%; height: 100%; object-fit: cover; }
.pcm-row-main { flex: 1; min-width: 0; }
.pcm-row-title { font-size: 13.5px; font-weight: 600; color: var(--pdm-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcm-row-sub { font-size: 11.5px; color: var(--pdm-faint); margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pcm-row-right { flex-shrink: 0; font-size: 13px; font-weight: 700; color: #fff; text-align: right; max-width: 42%; font-variant-numeric: tabular-nums; }
.pcm-row-right-sub { display: block; margin-top: 2px; font-size: 10.5px; font-weight: 600; color: var(--pdm-faint); }
.pcm-pill { display: inline-flex; align-items: center; border-radius: 100px; padding: 2px 8px; font-size: 10.5px; font-weight: 700; }
.pcm-go {
  display: inline-flex; align-items: center; gap: 3px; border-radius: 100px; padding: 6px 11px;
  font-size: 12px; font-weight: 700; white-space: nowrap;
}
.pcm-empty { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 0; font-size: 12.5px; color: var(--pdm-faint); }

.pcm-products {
  display: flex; gap: 12px; overflow-x: auto; margin: 0 -16px; padding: 2px 16px 6px;
  scroll-snap-type: x mandatory; scroll-padding-inline: 16px; scrollbar-width: none; -webkit-overflow-scrolling: touch;
}
.pcm-products::-webkit-scrollbar { display: none; }
.pcm-product {
  flex: 0 0 150px; scroll-snap-align: start; text-align: left; overflow: hidden;
  border-radius: 20px; border: 1px solid var(--pdm-line); padding: 0; cursor: pointer; font: inherit; color: inherit;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%);
}
.pcm-product-img {
  height: 120px; display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.04); color: var(--pdm-faint); font-size: 26px;
}
.pcm-product-img img { width: 100%; height: 100%; object-fit: cover; }
.pcm-product-name { padding: 10px 12px 0; font-size: 12.5px; font-weight: 600; color: var(--pdm-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcm-product-price { padding: 4px 12px 12px; font-size: 13px; font-weight: 800; color: var(--pdm-accent); }

.pcm-team {
  position: relative; margin-top: 30px; border-radius: 26px; padding: 22px 18px 18px; overflow: hidden;
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(var(--pdm-accent-rgb), 0.20) 0%, transparent 60%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(var(--pdm-accent-rgb), 0.22);
}
.pcm-team-mark {
  width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 900; letter-spacing: -0.04em; color: var(--pdm-on-accent); background: var(--pdm-accent);
  box-shadow: 0 10px 28px rgba(var(--pdm-accent-rgb), 0.28);
}
.pcm-team h3 { margin: 14px 0 0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
.pcm-team p { margin: 5px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--pdm-muted); }
.pcm-team-actions { display: flex; gap: 8px; margin-top: 16px; }
.pcm-team-actions > * { flex: 1; justify-content: center; margin-top: 0; text-decoration: none; }
.pcm-ghost {
  display: inline-flex; align-items: center; gap: 6px; border-radius: 100px; padding: 11px 16px;
  background: rgba(255, 255, 255, 0.07); border: 1px solid var(--pdm-line); color: #fff;
  font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
}

.pcm-skel { border-radius: 16px; background: rgba(255, 255, 255, 0.05); animation: pcm-pulse 1.4s ease-in-out infinite; }
@keyframes pcm-pulse { 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .pcm-spin, .pcm-skel, .pcm-rise, .pcm-pulse-icon { animation: none; } }

.pcm-palette {
  margin-top: 14px; padding: 14px 12px; border-radius: 20px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid var(--pdm-line);
}
.pcm-palette-title { font-size: 12.5px; color: var(--pdm-muted); margin: 0 0 12px 2px; }
.pcm-swatches { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.pcm-swatch {
  position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: none; border: 0; padding: 0; color: var(--pdm-muted); font: inherit; font-size: 10.5px; cursor: pointer;
}
.pcm-swatch-dot { position: relative; width: 34px; height: 34px; border-radius: 50%; box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12); overflow: hidden; }
.pcm-swatch.is-on { color: #fff; font-weight: 600; }
.pcm-swatch.is-on .pcm-swatch-dot { box-shadow: 0 0 0 2px ${PCM_DARK}, 0 0 0 4px #fff; }
.pcm-swatch-custom .pcm-swatch-dot { background: conic-gradient(#f87171, #fbbf24, #a3e635, #22d3ee, #818cf8, #f472b6, #f87171); }
.pcm-swatch-custom input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; border: 0; padding: 0; }

body.peg-dash-dark .header { background: ${PCM_DARK}; border-color: rgba(255, 255, 255, 0.06); }
body.peg-dash-dark .peg-dock { background: rgba(10, 13, 11, 0.92); border-top-color: rgba(255, 255, 255, 0.06); }
body.peg-dash-dark .peg-dock-item.is-active .peg-dock-icon { background: rgba(var(--pdm-accent-rgb), 0.16); color: var(--pdm-accent); }
body.peg-dash-dark .peg-app-main { background: ${PCM_DARK}; }
/* Fond « app » actif (MobileDock, _mobile.css) : le halo animé est fixé
   derrière toute la page et la suit jusqu'en bas — ce fond s'efface devant lui. */
body.peg-mobile-dark .pcm,
body.peg-mobile-dark.peg-dash-dark .peg-app-main { background: transparent; }
`;

// ── Couleur d'accent : même réglage (et même clé) que l'admin sur téléphone ──
const ACCENT_KEY = 'peg:dashboardAccent';
const DEFAULT_ACCENT = '#c6f432';
const ACCENTS = [
  { name: 'Citron', hex: '#c6f432' },
  { name: 'Menthe', hex: '#34d399' },
  { name: 'Cyan', hex: '#22d3ee' },
  { name: 'Violet', hex: '#a78bfa' },
  { name: 'Rose', hex: '#f472b6' },
  { name: 'Orange', hex: '#fb923c' },
];
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
const loadAccent = (): string => {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    return v && isHex(v) ? v.toLowerCase() : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
};
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
// Texte posé sur l'accent : sombre sur une teinte claire, blanc sur une foncée
const onAccentOf = (hex: string) => {
  const [r, g, b] = rgbOf(hex).map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? '#10140a' : '#ffffff';
};
const accentVars = (accent: string) => ({
  '--pdm-accent': accent,
  '--pdm-accent-rgb': rgbOf(accent).join(', '),
  '--pdm-on-accent': onAccentOf(accent),
});

// Page, en-tête, barre d'onglets et barre d'état du téléphone dans le même
// noir ; tout est rétabli en quittant l'accueil.
const useDarkShell = (accent: string) => {
  useEffect(() => {
    document.body.classList.add('peg-dash-dark');
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.content;
    if (meta) meta.content = PCM_DARK;
    return () => {
      document.body.classList.remove('peg-dash-dark');
      if (meta && previous) meta.content = previous;
    };
  }, []);
  useEffect(() => {
    const st = document.body.style;
    Object.entries(accentVars(accent)).forEach(([k, v]) => st.setProperty(k, v));
    return () => Object.keys(accentVars(accent)).forEach((k) => st.removeProperty(k));
  }, [accent]);
};

const Row = ({ row }: { row: PcmRow }) => {
  const inner = (
    <>
      <span
        className="pcm-row-icon"
        style={row.color ? { background: `${row.color}1f`, color: row.color } : undefined}
      >
        {row.image ? (
          <img
            src={row.image}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          row.icon ?? <HiOutlineCube />
        )}
      </span>
      <span className="pcm-row-main">
        <span className="pcm-row-title" style={{ display: 'block' }}>{row.title}</span>
        {(row.pill || row.sub) && (
          <span className="pcm-row-sub">
            {row.pill && (
              <span className="pcm-pill" style={{ color: row.pill.color, background: `${row.pill.color}22` }}>
                {row.pill.label}
              </span>
            )}
            {row.sub}
          </span>
        )}
      </span>
      {row.right && (
        <span className="pcm-row-right">
          {row.right}
          {row.rightSub && <span className="pcm-row-right-sub">{row.rightSub}</span>}
        </span>
      )}
      {row.cta && (
        <span className="pcm-go" style={{ color: row.color ?? 'var(--pdm-accent)', background: `${row.color ?? '#ffffff'}1f` }}>
          {row.cta} <HiOutlineChevronRight />
        </span>
      )}
    </>
  );
  return row.onClick ? (
    <button type="button" className="pcm-row" onClick={row.onClick}>{inner}</button>
  ) : (
    <div className="pcm-row">{inner}</div>
  );
};

const Products = ({ items }: { items: PcmProduct[] }) => (
  <div className="pcm-products">
    {items.map((p) => (
      <button key={p.key} type="button" className="pcm-product" onClick={p.onClick}>
        <span className="pcm-product-img" style={{ display: 'flex' }}>
          {p.image ? (
            <img
              src={p.image}
              alt=""
              loading="lazy"
              decoding="async"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          ) : (
            <HiOutlineCube />
          )}
        </span>
        <span className="pcm-product-name" style={{ display: 'block' }}>{p.name}</span>
        <span className="pcm-product-price" style={{ display: 'block' }}>{p.price}</span>
      </button>
    ))}
  </div>
);

const DashboardCustomerMobile = ({
  photo,
  hero,
  onRefresh,
  refreshing,
  works,
  onSeeAllWorks,
  todos,
  tiles,
  shortcuts,
  orders,
  onSeeAllOrders,
  onOrder,
  activity,
  suggestions,
  onSeeCatalogue,
  offers,
  onSeeOffers,
  team,
}: Props) => {
  const [accent, setAccent] = useState(loadAccent);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useDarkShell(accent);
  const chooseAccent = (hex: string) => {
    if (!isHex(hex)) return;
    const next = hex.toLowerCase();
    setAccent(next);
    try {
      localStorage.setItem(ACCENT_KEY, next);
    } catch {
      /* navigation privée : la couleur vaut pour la session */
    }
  };
  const isPreset = ACCENTS.some((a) => a.hex === accent);

  return (
    // Variables posées aussi ici : la page a sa couleur dès le premier rendu
    <div className="pcm" style={accentVars(accent) as React.CSSProperties}>
      <style>{CSS}</style>

      <div className="pcm-body">
        <section className="pcm-hero">
        {/* Photo du client en fond, estompée — comme la bannière admin */}
        {photo.url && (
          <img className="pcm-hero-bg" src={photo.url} alt="" aria-hidden="true" />
        )}
        <div className="pcm-top">
          <span className="pcm-date pcm-rise">{hero.date}</span>
          <div className="pcm-icons">
            <button
              type="button"
              className={`pcm-icon-btn${paletteOpen ? ' is-on' : ''}`}
              onClick={() => {
                setPaletteOpen((o) => !o);
                setPhotoOpen(false);
              }}
              aria-expanded={paletteOpen}
              aria-label="Couleur de l'accueil"
            >
              <HiOutlineColorSwatch />
            </button>
            {photo.available && (
              <button
                type="button"
                className={`pcm-icon-btn${photoOpen ? ' is-on' : ''}`}
                onClick={() => {
                  setPhotoOpen((o) => !o);
                  setPaletteOpen(false);
                }}
                aria-expanded={photoOpen}
                aria-label="Photo de fond de l'accueil"
              >
                <HiOutlinePhotograph className={photo.busy ? 'pcm-pulse-icon' : undefined} />
              </button>
            )}
            <button type="button" className="pcm-icon-btn" onClick={onRefresh} aria-label="Actualiser">
              <HiOutlineRefresh className={refreshing ? 'pcm-spin' : undefined} />
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // la même photo peut être choisie à nouveau
            if (file) photo.choose(file);
          }}
        />
        {photoOpen && (
          <div className="pcm-palette" role="group" aria-label="Photo de fond de l'accueil">
            <p className="pcm-palette-title">Photo de fond de l'accueil</p>
            <div className="pcm-photo-actions">
              <button
                type="button"
                className="pcm-photo-btn is-main"
                disabled={photo.busy}
                onClick={() => fileRef.current?.click()}
              >
                <HiOutlinePhotograph />
                {photo.busy ? 'Envoi en cours…' : photo.url ? 'Changer la photo' : 'Choisir une photo'}
              </button>
              {photo.url && (
                <button
                  type="button"
                  className="pcm-photo-btn"
                  disabled={photo.busy}
                  onClick={() => photo.remove()}
                >
                  Retirer
                </button>
              )}
            </div>
            <p className="pcm-photo-hint">Visible sur votre accueil, sur tous vos appareils.</p>
          </div>
        )}
        {photo.error && (
          <p className="pcm-photo-error" role="alert">
            {photo.error}
          </p>
        )}

        {paletteOpen && (
          <div className="pcm-palette" role="group" aria-label="Couleur de l'accueil">
            <p className="pcm-palette-title">Couleur de l'accueil</p>
            <div className="pcm-swatches">
              {ACCENTS.map((a) => (
                <button
                  key={a.hex}
                  type="button"
                  className={`pcm-swatch${accent === a.hex ? ' is-on' : ''}`}
                  aria-pressed={accent === a.hex}
                  onClick={() => chooseAccent(a.hex)}
                >
                  <span className="pcm-swatch-dot" style={{ background: a.hex }} />
                  {a.name}
                </button>
              ))}
              <label className={`pcm-swatch pcm-swatch-custom${isPreset ? '' : ' is-on'}`}>
                <span className="pcm-swatch-dot">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => chooseAccent(e.target.value)}
                    aria-label="Autre couleur"
                  />
                </span>
                Autre
              </label>
            </div>
          </div>
        )}

        {/* Accueil : salutation et relation avec PEG */}
        <h1 className="pcm-hero-title pcm-rise pcm-rise-2">
          {hero.hello},<br />
          <span className="pcm-hero-name">{hero.name}</span>
        </h1>
        <div className="pcm-facts pcm-rise pcm-rise-3">
          {hero.premium && <span className="pcm-fact is-accent">★ Client Premium</span>}
          {hero.facts.map((f) => <span key={f} className="pcm-fact">{f}</span>)}
        </div>
        </section>

        {/* Ses réalisations, en photos */}
        {works.length > 0 && (
          <div className="pcm-rise pcm-rise-4">
            <div className="pcm-section-head">
              <h2>Vos réalisations</h2>
              <button type="button" className="pcm-link" onClick={onSeeAllWorks}>Tout voir</button>
            </div>
            <div className="pcm-works">
              {works.map((w) => (
                <button key={w.key} type="button" className="pcm-work" onClick={w.onClick}>
                  <img
                    src={w.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                  />
                  <span className="pcm-work-text">
                    <span className="pcm-work-title">{w.title}</span>
                    <span className="pcm-work-caption">{w.caption}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Raccourcis ronds */}
        <div className="pcm-section-head">
          <h2>Raccourcis</h2>
        </div>
        <div className="pcm-shortcuts">
          {shortcuts.map((s) => (
            <button key={s.key} type="button" className="pcm-shortcut" onClick={s.onClick}>
              <span className="pcm-shortcut-ring">{s.icon}</span>
              <span className="pcm-shortcut-label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Ce qui attend le client */}
        {todos.length > 0 && (
          <>
            <div className="pcm-section-head">
              <h2>À faire</h2>
              <span className="pcm-count">{todos.length}</span>
            </div>
            <div className="pcm-list">
              {todos.map((r) => <Row key={r.key} row={r} />)}
            </div>
          </>
        )}

        {/* Chiffres clés */}
        <div className="pcm-section-head">
          <h2>Mon activité</h2>
        </div>
        <div className="pcm-tiles">
          {tiles.map((t) => (
            <button key={t.key} type="button" className="pcm-tile" data-tone={t.tone} onClick={t.onClick}>
              <span className="pcm-tile-icon">{t.icon}</span>
              <span className="pcm-tile-label">{t.label}</span>
              <span className="pcm-tile-value">{t.value}</span>
              <HiOutlineChevronRight className="pcm-tile-go" />
            </button>
          ))}
        </div>

        {/* Commandes en cours */}
        <div className="pcm-section-head">
          <h2>Mes commandes en cours</h2>
          {orders.length > 0 && (
            <button type="button" className="pcm-link" onClick={onSeeAllOrders}>Voir tout</button>
          )}
        </div>
        <div className="pcm-list">
          {orders.length > 0 ? (
            orders.map((r) => <Row key={r.key} row={r} />)
          ) : (
            <div className="pcm-empty">
              Aucune commande en cours.
              <button type="button" className="pcm-link" onClick={onOrder}>Commander →</button>
            </div>
          )}
        </div>

        {/* Activité récente, façon transactions */}
        {activity.length > 0 && (
          <>
            <div className="pcm-section-head">
              <h2>Activité récente</h2>
              <button type="button" className="pcm-link" onClick={onSeeAllOrders}>Voir tout</button>
            </div>
            <div className="pcm-list">
              {activity.map((r) => <Row key={r.key} row={r} />)}
            </div>
          </>
        )}

        {suggestions.length > 0 && (
          <>
            <div className="pcm-section-head">
              <h2>Suggestions pour vous</h2>
              {onSeeCatalogue && (
                <button type="button" className="pcm-link" onClick={onSeeCatalogue}>Le catalogue</button>
              )}
            </div>
            <Products items={suggestions} />
          </>
        )}

        {offers.length > 0 && (
          <>
            <div className="pcm-section-head">
              <h2>Vos offres personnalisées</h2>
              {onSeeOffers && (
                <button type="button" className="pcm-link" onClick={onSeeOffers}>Tout voir</button>
              )}
            </div>
            <Products items={offers} />
          </>
        )}

        {/* Son équipe PEG */}
        <section className="pcm-team">
          <div className="pcm-team-mark" aria-hidden="true">PEG</div>
          <h3>Votre équipe PEG</h3>
          <p>Une idée, une question, un projet à lancer ? Nous sommes là pour vous accompagner.</p>
          <div className="pcm-team-actions">
            {team.phone && (
              <a className="pcm-cta" href={`tel:${team.phone.replace(/\s/g, '')}`}>
                <HiOutlinePhone /> Appeler
              </a>
            )}
            <button type="button" className={team.phone ? 'pcm-ghost' : 'pcm-cta'} onClick={team.onWrite}>
              <HiOutlineChatAlt2 /> Écrire
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardCustomerMobile;
