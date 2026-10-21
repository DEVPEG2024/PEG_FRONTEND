/**
 * Accueil client — rendu TÉLÉPHONE uniquement (< md), même langage que le
 * tableau de bord admin sur téléphone (DashboardAdminMobile, demande Nova du
 * 25/09/2026) : fond noir, tuiles vitrées, raccourcis ronds, listes façon
 * transactions, couleur d'accent au choix. En tête, pas de montant : un accueil
 * qui crée du lien (« créer du lien et faire beau », Nova) — salutation, la
 * relation avec PEG, ses réalisations en photos, et son équipe en bas de page.
 * Depuis le 21/10/2026 (maquette validée), ses offres personnalisées passent
 * juste sous la salutation, en grandes cartes à glisser (prix, autocollant
 * d'économie, escalier des paliers) ; un client Standard y voit Premium.
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
  HiOutlineShoppingCart,
} from 'react-icons/hi';
import type { DashboardPhoto } from '@/utils/hooks/useDashboardPhoto';
import Carousel from '@/components/shared/Carousel';
import type { OfferShowcaseItem } from './offerShowcase';
import { OFFER_CSS, OFFER_ON_YELLOW, OFFER_YELLOW, OfferBadge, OfferSteps, OfferVisual, SavingsSticker } from './components/OfferVisuals';
import PremiumTeaser from './components/PremiumTeaser';
import DeliveryCountdown from './components/DeliveryCountdown';

export const PCM_DARK = '#070a08';

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

/** Une réalisation : photo d'un projet du client (`contain` : photo du produit, jamais rognée) */
export type PcmWork = { key: string; image: string; contain?: boolean; title: string; caption: string; onClick: () => void };

/** Une offre personnalisée, prête à afficher (offerShowcase.ts) */
export type PcmOffer = OfferShowcaseItem & { onClick: () => void };

/** Un projet en cours : statut, livraison, avancement (%) et jours avant livraison */
export type PcmProject = {
  key: string;
  title: string;
  image?: string | null;
  pill: { label: string; color: string };
  sub?: string;
  progress: number;
  days: number | null;
  onClick: () => void;
};

type Props = {
  /** Photo de fond de l'accueil, téléversée par le client */
  photo: DashboardPhoto;
  hero: {
    /** « jeudi 25 septembre » */
    date: string;
    /** « Bonjour » / « Bonsoir » */
    hello: string;
    name: string;
    /** Phrase sous la salutation (« Vos prix réservés vous attendent. ») */
    tagline?: string;
    /** Pastilles de relation (« Ensemble depuis… », « 12 projets réalisés ») */
    facts: string[];
    premium: boolean;
  };
  onRefresh: () => void;
  refreshing: boolean;
  offers: PcmOffer[];
  /** Nombre total d'offres (offers n'en porte que la première page) */
  offersTotal: number;
  onSeeOffers: () => void;
  /** Client Standard : ses offres sont réservées au Premium → carte Premium */
  onDiscoverPremium?: () => void;
  shortcuts: PcmShortcut[];
  todos: PcmRow[];
  projects: PcmProject[];
  onSeeAllProjects: () => void;
  onOrder: () => void;
  works: PcmWork[];
  /** Projets livrés */
  worksCount: number;
  onSeeAllWorks: () => void;
  suggestions: PcmProduct[];
  onSeeCatalogue?: () => void;
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

/* Pistes : composant Carousel (fenêtre plein écran, cartes calées à 16px) */
.pcm-offers, .pcm-works, .pcm-products { margin: 0 -16px; padding: 2px 16px 6px; }
.pcm-hero-tagline { margin: 10px 0 0; font-size: 15px; color: rgba(255, 255, 255, 0.72); }

/* Offres personnalisées : grandes cartes à glisser */
.pcm-offer-slide { width: 84%; max-width: 320px; }
.pcm-offer-slide:only-child { width: 100%; max-width: none; }
.pcm-offer {
  width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;
  padding: 0; border-radius: 26px; border: 1px solid rgba(255, 255, 255, 0.09); background: #141a2e;
  color: #fff; font: inherit; text-align: left; cursor: pointer;
}
.pcm-offer:active { transform: scale(0.985); }
.pcm-offer-body { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 16px; }
.pcm-offer-cat { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255, 255, 255, 0.6); }
.pcm-offer-name { font-size: 17px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.2; overflow-wrap: anywhere; }
.pcm-offer-price { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; }
.pcm-offer-price strong { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
.pcm-offer-unit { font-size: 12.5px; color: rgba(255, 255, 255, 0.66); }
.pcm-offer-was { font-size: 12.5px; color: rgba(255, 255, 255, 0.55); }
.pcm-offer-note { border-radius: 14px; background: rgba(255, 255, 255, 0.05); padding: 12px; font-size: 12.5px; line-height: 1.45; color: rgba(255, 255, 255, 0.74); }
.pcm-offer-cta {
  margin-top: auto; min-height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--pdm-accent); color: var(--pdm-on-accent); font-size: 14.5px; font-weight: 700;
}

/* Projets en cours : cartes bleu nuit (couleurs des cartes projet, Nova) */
.pcm-projects { display: flex; flex-direction: column; gap: 10px; }
.pcm-project {
  width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08); background: #11162a; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.pcm-project:active { transform: scale(0.985); }
.pcm-project-img {
  width: 60px; height: 60px; border-radius: 15px; flex-shrink: 0; overflow: hidden; background: #eef0f5;
  display: flex; align-items: center; justify-content: center; color: rgba(20, 26, 46, 0.3); font-size: 22px;
}
.pcm-project-img img { width: 100%; height: 100%; object-fit: contain; padding: 5px; box-sizing: border-box; mix-blend-mode: multiply; }
.pcm-project-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.pcm-project-title { font-size: 14px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcm-project-meta { display: flex; align-items: center; gap: 7px; min-width: 0; font-size: 12px; color: rgba(255, 255, 255, 0.64); }
.pcm-project-meta > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcm-progress { display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700; color: rgba(255, 255, 255, 0.75); }
.pcm-progress-track { flex: 1; height: 7px; border-radius: 100px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
.pcm-progress-track > span { display: block; height: 100%; border-radius: 100px; background: var(--pdm-accent); }

/* Réalisations en polaroïds, légèrement penchés */
.pcm-pola-slide { width: 148px; padding: 6px 0 12px; }
.pcm-pola {
  display: block; width: 100%; padding: 8px 8px 11px; border: 0; border-radius: 6px; background: #f6f4ef;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4); text-align: left; font: inherit; cursor: pointer;
}
.pcm-pola-photo { display: flex; aspect-ratio: 1 / 1; border-radius: 3px; overflow: hidden; background: #eef0f5; }
.pcm-pola-photo img { width: 100%; height: 100%; object-fit: cover; }
.pcm-pola-photo img.is-contain { object-fit: contain; mix-blend-mode: multiply; }
.pcm-pola-title { display: block; margin-top: 8px; font-size: 12.5px; font-weight: 700; color: #1d2033; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pcm-pola-caption { display: block; margin-top: 2px; font-size: 11px; color: #4a4f63; }
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

.pcm-product-slide { width: 150px; }
.pcm-product {
  display: block; width: 100%; text-align: left; overflow: hidden;
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

// `autoPlay` : la piste avance seule, carte par carte (suggestions).
const Products = ({ items, label, autoPlay = false }: { items: PcmProduct[]; label: string; autoPlay?: boolean }) => (
  <Carousel
    label={label}
    className="pcm-products"
    slideClassName="pcm-product-slide"
    autoplay={autoPlay ? 'step' : 'none'}
    interval={3200}
  >
    {items.map((p) => (
      <button key={p.key} type="button" className="pcm-product" onClick={p.onClick}>
        <span className="pcm-product-img" style={{ display: 'flex' }}>
          {p.image ? (
            <img
              src={p.image}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
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
  </Carousel>
);

/** Une offre en grande carte : photo studio, autocollant, prix, paliers, « Commander » */
const OfferCard = ({ offer }: { offer: PcmOffer }) => (
  <button type="button" className="pcm-offer" onClick={offer.onClick}>
    <OfferVisual offer={offer} sizes="300px" padding="8%" style={{ height: '188px', flexShrink: 0 }}>
      {offer.savings && <SavingsSticker percent={offer.savings} size={68} style={{ top: '12px', left: '12px' }} />}
      {offer.isNew && <OfferBadge style={{ top: '14px', right: '14px' }}>Nouveau</OfferBadge>}
    </OfferVisual>
    <span className="pcm-offer-body">
      {offer.category && <span className="pcm-offer-cat">{offer.category.name}</span>}
      <span className="pcm-offer-name">{offer.name}</span>
      <span className="pcm-offer-price">
        <strong>{offer.price}</strong>
        <span className="pcm-offer-unit">{offer.unit}</span>
        {offer.catalogue && <s className="pcm-offer-was">{offer.catalogue}</s>}
      </span>
      {offer.steps.length > 0 && <OfferSteps steps={offer.steps} height={92} compact />}
      {offer.steps.length === 0 && offer.note && <span className="pcm-offer-note">{offer.note}</span>}
      <span className="pcm-offer-cta">
        <HiOutlineShoppingCart /> Commander
      </span>
    </span>
  </button>
);

const ProjectCard = ({ project }: { project: PcmProject }) => (
  <button type="button" className="pcm-project" onClick={project.onClick}>
    <span className="pcm-project-img">
      {project.image ? (
        <img
          src={project.image}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
      ) : (
        <HiOutlineCube />
      )}
    </span>
    <span className="pcm-project-main">
      <span className="pcm-project-title">{project.title}</span>
      <span className="pcm-project-meta">
        <span className="pcm-pill" style={{ color: project.pill.color, background: `${project.pill.color}26`, flexShrink: 0 }}>
          {project.pill.label}
        </span>
        {project.sub && <span>{project.sub}</span>}
      </span>
      <span className="pcm-progress">
        <span
          className="pcm-progress-track"
          role="progressbar"
          aria-label="Avancement"
          aria-valuenow={project.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${project.progress}%` }} />
        </span>
        {project.progress} %
      </span>
    </span>
    {project.days !== null && (
      <DeliveryCountdown
        days={project.days}
        size={54}
        accent="var(--pdm-accent)"
        soft="rgba(var(--pdm-accent-rgb), 0.14)"
        line="rgba(var(--pdm-accent-rgb), 0.4)"
      />
    )}
  </button>
);

const POLA_TILT = [-3, 2, -1.5, 2.5];

const DashboardCustomerMobile = ({
  photo,
  hero,
  onRefresh,
  refreshing,
  offers,
  offersTotal,
  onSeeOffers,
  onDiscoverPremium,
  shortcuts,
  todos,
  projects,
  onSeeAllProjects,
  onOrder,
  works,
  worksCount,
  onSeeAllWorks,
  suggestions,
  onSeeCatalogue,
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
      <style>{OFFER_CSS}</style>

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
        {hero.tagline && <p className="pcm-hero-tagline pcm-rise pcm-rise-2">{hero.tagline}</p>}
        <div className="pcm-facts pcm-rise pcm-rise-3">
          {hero.premium && <span className="pcm-fact is-accent">★ Client Premium</span>}
          {hero.facts.map((f) => <span key={f} className="pcm-fact">{f}</span>)}
        </div>
        </section>

        {/* Ses offres personnalisées, en grandes cartes à glisser */}
        {offers.length > 0 && (
          <div className="pcm-rise pcm-rise-4">
            <div className="pcm-section-head">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Vos offres personnalisées
                <span className="pcm-count" style={{ background: OFFER_YELLOW, color: OFFER_ON_YELLOW }}>{offersTotal}</span>
              </h2>
              <button type="button" className="pcm-link" onClick={onSeeOffers}>Tout voir</button>
            </div>
            <Carousel label="Vos offres personnalisées" className="pcm-offers" slideClassName="pcm-offer-slide">
              {offers.map((o) => <OfferCard key={o.documentId} offer={o} />)}
            </Carousel>
          </div>
        )}
        {onDiscoverPremium && (
          <div className="pcm-rise pcm-rise-4" style={{ marginTop: '22px', display: 'flex' }}>
            <PremiumTeaser compact onDiscover={onDiscoverPremium} />
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

        {/* Projets en cours : avancement et compte à rebours avant livraison */}
        <div className="pcm-section-head">
          <h2>Vos projets en cours</h2>
          {projects.length > 0 && (
            <button type="button" className="pcm-link" onClick={onSeeAllProjects}>Voir tout</button>
          )}
        </div>
        {projects.length > 0 ? (
          <div className="pcm-projects">
            {projects.map((p) => <ProjectCard key={p.key} project={p} />)}
          </div>
        ) : (
          <div className="pcm-list">
            <div className="pcm-empty">
              Aucun projet en cours.
              <button type="button" className="pcm-link" onClick={onOrder}>Commander →</button>
            </div>
          </div>
        )}

        {/* Ses réalisations, en polaroïds */}
        {works.length > 0 && (
          <>
            <div className="pcm-section-head">
              <h2>Vos réalisations</h2>
              <button type="button" className="pcm-link" onClick={onSeeAllWorks}>
                {worksCount > 0 ? `${worksCount} livré${worksCount > 1 ? 's' : ''}` : 'Tout voir'}
              </button>
            </div>
            <Carousel label="Vos réalisations" className="pcm-works" slideClassName="pcm-pola-slide" gap={14}>
              {works.map((w, i) => (
                <button
                  key={w.key}
                  type="button"
                  className="pcm-pola"
                  onClick={w.onClick}
                  style={{ transform: `rotate(${POLA_TILT[i % POLA_TILT.length]}deg)` }}
                >
                  <span className="pcm-pola-photo">
                    <img
                      src={w.image}
                      alt=""
                      className={w.contain ? 'is-contain' : undefined}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  </span>
                  <span className="pcm-pola-title">{w.title}</span>
                  <span className="pcm-pola-caption">{w.caption}</span>
                </button>
              ))}
            </Carousel>
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
            <Products items={suggestions} label="Suggestions pour vous" autoPlay />
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
