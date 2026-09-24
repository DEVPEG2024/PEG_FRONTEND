import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  animate,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'framer-motion';
import SignInForm from './SignInForm';
import SignUpModal, { type AccountType } from './SignUpModal';
import Logo from '@/components/template/Logo';
import { APP_NAME } from '@/constants/app.constant';
import { getPersistedAuthToken } from '@/store/tabSessionStorage';
import {
  HiLockClosed,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineCash,
  HiArrowNarrowRight,
} from 'react-icons/hi';

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE DE CONNEXION — deux rendus, un seul seuil : 920px

   • AU-DESSUS DE 920px : `DesktopSignIn`, l'arbre historique (.si-card /
     .si-left / .si-form) rendu tel quel. Rien n'y a bougé.
   • EN DESSOUS : `PhoneAtelier`, « La Plaque de verre ». Un univers
     bleu-noir presque vide — le logo PEG au centre et cinq objets du métier
     en suspension — et une grande plaque de verre ivoire qui entre par la
     droite en perspective quand on tire « Se connecter » : l'univers recule,
     les objets filent à trois vitesses, un liseré mauve suit la tranche, le
     verre trouble le logo au passage, puis le formulaire se construit.

   Le choix se fait en JS (matchMedia) et non en CSS : au-dessus du seuil le
   DOM est LITTÉRALEMENT celui d'avant, aucune règle mobile n'existe pour le
   contrarier. C'est la garantie la plus forte que le bureau est intact.

   Le discours (pastille, accroche, les deux cartes de compte) est repris MOT
   POUR MOT : il est verrouillé par les tests de terminologie. Sur téléphone,
   le premier écran n'en garde que le logo (l'accroche reste le titre de la page
   pour les lecteurs d'écran) ; sous-titre, catégories et gages restent sur le
   bureau.
   Seuls les libellés de l'interaction elle-même sont neufs.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Outils de courbe ────────────────────────────────────────────────────── */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** smoothstep sur une fenêtre [e0, e1] : démarrage et arrivée en douceur. */
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ── Vitrine de l'offre PEG : tuiles produits/services (bureau uniquement) ──
   `emoji`, `label` et `sub` sont inchangés. Le téléphone ne montre plus ces
   six catégories sur son premier écran (il les montre par des objets). */
const OFFER_TILES: {
  emoji: string;
  label: string;
  sub: string;
}[] = [
  { emoji: '👕', label: 'Textile personnalisé', sub: 'T-shirts, polos, vestes à votre image' },
  { emoji: '🦺', label: 'Haute visibilité & EPI', sub: 'Vêtements de travail, chaussures de sécurité' },
  { emoji: '🧢', label: 'Casquettes & accessoires', sub: 'Bonnets, accessoires hiver…' },
  { emoji: '🖨️', label: 'Print & supports', sub: 'Affiches, flyers, signalétique' },
  { emoji: '🎁', label: 'Objets publicitaires', sub: 'Goodies et cadeaux d’entreprise' },
  { emoji: '🎨', label: 'Création & BAT', sub: 'Maquettes validées avant production' },
];

const OfferShowcase = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', maxWidth: '460px' }}>
    {OFFER_TILES.map((tile) => (
      <div
        key={tile.label}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: '11px',
          background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '13px 14px',
        }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{tile.emoji}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{tile.label}</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11.5px', margin: '3px 0 0', lineHeight: 1.4 }}>{tile.sub}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ── Cartes d'inscription : les deux natures de compte, mises au même niveau ── */
const AccountCta = ({
  variant, icon, title, subtitle, onClick,
}: {
  variant: 'client' | 'generator';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => {
  const accent = variant === 'client'
    ? { tile: '#efedff', icon: '#6d5dfc' }
    : { tile: '#e6f7ef', icon: '#0d9f6e' };

  return (
    <button type="button" onClick={onClick} className={`si-acct si-acct--${variant}`}>
      <span className="si-acct__tile" style={{ background: accent.tile, color: accent.icon }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', color: '#1e1b4b', fontSize: '13.5px', fontWeight: 700 }}>
          {title}
        </span>
        <span style={{ display: 'block', color: '#64748b', fontSize: '11.5px', lineHeight: 1.45, marginTop: '2px' }}>
          {subtitle}
        </span>
      </span>
      <HiArrowNarrowRight className="si-acct__arrow" size={16} color="#94a3b8" />
    </button>
  );
};

const LeftBadge = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', textAlign: 'center', maxWidth: '100px' }}>
    <span style={{ color: '#8b7dff', display: 'flex' }}>{icon}</span>
    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   LA PLAQUE DE VERRE — l'accueil téléphone
   Un univers bleu-noir presque vide : le logo PEG au centre, et cinq objets du
   métier en suspension — hoodie, casquette, roll-up, mug, écran web. Ils ne
   sont pas là comme une publicité : ils fabriquent la PROFONDEUR du geste.
   On tire « Se connecter » : l'univers recule, les objets filent à trois
   vitesses, et une grande plaque de verre ivoire entre par la droite en
   perspective, un liseré mauve sur la tranche. Quand elle passe devant le
   logo, le verre le trouble un instant — on traverse l'identité PEG pour
   entrer dans son espace. Le formulaire se construit ensuite, bloc par bloc.
   TOUT est fonction d'une seule progression p (0 → 1), pilotée au doigt.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Le logo PEG « historique » (P, E, G et le point rond), viewBox 1130×467 —
   c'est celui que PEG conserve. Le P a un contre-poinçon : evenodd. */
const MARK_VB = '0 0 1130 467';
const MARK_RATIO = 1130 / 467;
const MARK_PATHS = [
  'M20.2,50h133c83.1,0,151,28,151,115.7s-69.1,122.8-148.7,122.8h-44.7v118.4H20.2V50ZM150.3,221.1c44.7,0,65.6-19.7,65.6-55.4s-23.8-48.2-68-48.2h-37.2v103.6h39.5Z',
  'M336.5,50h239.3v71.3h-148.7v66.9h127.2v71.3h-127.2v76.2h154.5v71.3h-245.1V50Z',
  'M587.9,230.9c0-119,84.8-187.5,185.9-187.5s104.2,30.5,130.4,56.3l-51.8,44.3c-18.6-15.9-43.8-27.1-75.7-27.1-55.8,0-96.4,41.7-96.4,110.7s34.3,112.4,104.5,112.4,27.9-3.3,36-9.3v-57.6h-60.4v-35.5l40.2-34.1h100.3v166.7c-26.1,24.1-72.6,43.3-126,43.3-104.5,0-187-61.9-187-182.5Z',
];
const MARK_DOT = { cx: 1027.8, cy: 331.5, r: 82 } as const;
/** Couleur du point du logo — celle du fichier d'origine. */
const MARK_DOT_COLOR = '#db6b67';
/** Le mauve du verre : liseré de la plaque, poignée, halo. */
const VIOLET = '#8b5cf6';

/** Le logo à plat. `x / y / width` permettent de l'imbriquer dans un autre SVG. */
const MarkSvg = ({
  fill, dot = MARK_DOT_COLOR, x, y, width,
}: {
  fill: string;
  dot?: string;
  x?: number;
  y?: number;
  width?: number;
}) => (
  <svg
    viewBox={MARK_VB}
    x={x}
    y={y}
    width={width}
    height={width ? width / MARK_RATIO : undefined}
    aria-hidden
    focusable="false"
  >
    <g fill={fill} fillRule="evenodd">
      {MARK_PATHS.map((d) => <path key={d.slice(0, 12)} d={d} />)}
    </g>
    <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill={dot} />
  </svg>
);

/* Le logo du centre, en volume : huit copies décalées vers le bas-droite font
   la tranche (du fond vers la face), la face est un blanc qui tire vers le
   lavande. Pas de néon : une ombre violette douce et c'est tout. */
const HERO_DEPTH = 8;
const HeroMark = () => (
  <svg viewBox={MARK_VB} className="pa-hero__svg" aria-hidden focusable="false">
    <defs>
      <linearGradient id="pa-hero-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#ddd8f6" />
      </linearGradient>
      <linearGradient id="pa-hero-side" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6c5ad8" />
        <stop offset="1" stopColor="#1e1745" />
      </linearGradient>
      <radialGradient id="pa-hero-dot" cx="0.36" cy="0.3" r="0.78">
        <stop offset="0" stopColor="#f2a9a6" />
        <stop offset="0.5" stopColor={MARK_DOT_COLOR} />
        <stop offset="1" stopColor="#9c3f3b" />
      </radialGradient>
    </defs>
    {Array.from({ length: HERO_DEPTH }, (_, i) => HERO_DEPTH - i).map((n) => (
      <g key={n} transform={`translate(${n * 2.4} ${n * 3.2})`} fill="url(#pa-hero-side)" fillRule="evenodd">
        {MARK_PATHS.map((d) => <path key={d.slice(0, 12)} d={d} />)}
        <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} />
      </g>
    ))}
    <g fill="url(#pa-hero-face)" fillRule="evenodd">
      {MARK_PATHS.map((d) => <path key={d.slice(0, 12)} d={d} />)}
    </g>
    <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill="url(#pa-hero-dot)" />
  </svg>
);

/* ── Les cinq objets du métier ──────────────────────────────────────────────
   Très stylisés, même éclairage pour tous : lumière haute à gauche, liseré
   lavande à contre-jour. Chacun porte le logo, petit. */
const ObjHoodie = () => (
  <svg viewBox="0 0 200 190" aria-hidden focusable="false">
    <defs>
      <linearGradient id="pa-h-body" x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" stopColor="#30344c" />
        <stop offset="0.55" stopColor="#181b2a" />
        <stop offset="1" stopColor="#0e1019" />
      </linearGradient>
      <linearGradient id="pa-h-rim" x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c4b5ff" stopOpacity="0.6" />
        <stop offset="0.5" stopColor={VIOLET} stopOpacity="0.14" />
        <stop offset="1" stopColor={VIOLET} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M76 46C72 26 86 14 100 14s28 12 24 32c-8 8-40 8-48 0Z" fill="url(#pa-h-body)" />
    <path
      d="M78 44C68 46 57 50 48 58 35 70 27 100 21 146l19 8c6-30 12-50 20-64l2 86c26 5 50 5 76 0l2-86c8 14 14 34 20 64l19-8c-6-46-14-76-27-88-9-8-20-12-30-14-6 8-38 8-44 0Z"
      fill="url(#pa-h-body)"
    />
    <path
      d="M78 44C68 46 57 50 48 58 35 70 27 100 21 146l19 8c6-30 12-50 20-64l2 86c26 5 50 5 76 0l2-86c8 14 14 34 20 64l19-8c-6-46-14-76-27-88-9-8-20-12-30-14-6 8-38 8-44 0Z"
      fill="none"
      stroke="url(#pa-h-rim)"
      strokeWidth="1.3"
    />
    <path d="M48 58C35 70 27 100 21 146l8 3c5-40 12-66 22-84Z" fill="#fff" opacity="0.07" />
    <path d="M86 44c2-12 26-12 28 0-6 7-22 7-28 0Z" fill="#07080e" />
    <path d="M94 50l-2 26M106 50l2 26" stroke="#d6cff4" strokeWidth="1.7" strokeLinecap="round" opacity="0.8" />
    <path d="M73 128h54l6 30H67Z" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="1.2" />
    <path d="M22 142l19 8M160 150l19-8M62 170c26 5 50 5 76 0" stroke="#000" strokeOpacity="0.45" strokeWidth="1.4" fill="none" />
    <MarkSvg fill="#fff" x={83} y={80} width={34} />
  </svg>
);

const ObjCap = () => (
  <svg viewBox="0 0 200 140" aria-hidden focusable="false">
    <defs>
      <linearGradient id="pa-c-crown" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#e4e1ef" />
        <stop offset="1" stopColor="#aaa4c1" />
      </linearGradient>
      <linearGradient id="pa-c-brim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dad6e8" />
        <stop offset="1" stopColor="#8a84a4" />
      </linearGradient>
    </defs>
    <path d="M72 96C52 95 24 99 12 107c-6 5 1 12 20 12 34 0 70-7 88-19Z" fill="url(#pa-c-brim)" />
    <path d="M62 98C58 56 86 26 124 26c36 0 60 26 58 70-38 8-82 9-120 2Z" fill="url(#pa-c-crown)" />
    <path d="M124 27c-10 20-18 44-22 71M124 27c10 22 16 46 18 71" stroke="#8f89a8" strokeOpacity="0.5" strokeWidth="1.1" fill="none" />
    <path d="M62 98c38 7 82 6 120-2" stroke="#6d6788" strokeOpacity="0.55" strokeWidth="1.4" fill="none" />
    <circle cx="124" cy="27" r="3.4" fill="#cfcae0" />
    <MarkSvg fill="#12142b" x={76} y={58} width={36} />
  </svg>
);

const ObjMug = () => (
  <svg viewBox="0 0 160 170" aria-hidden focusable="false">
    <defs>
      <linearGradient id="pa-m-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#0b0c14" />
        <stop offset="0.22" stopColor="#373c58" />
        <stop offset="0.45" stopColor="#161927" />
        <stop offset="1" stopColor="#07080d" />
      </linearGradient>
    </defs>
    <path d="M108 56c40-2 40 66 0 64v-15c20 1 20-36 0-35Z" fill="#131521" stroke={VIOLET} strokeOpacity="0.4" strokeWidth="1.2" />
    <path d="M28 34v104c0 13 82 13 82 0V34Z" fill="url(#pa-m-body)" />
    <path d="M110 40v98c0 6-10 9-22 11" stroke="#c4b5ff" strokeOpacity="0.4" strokeWidth="1.2" fill="none" />
    <ellipse cx="69" cy="34" rx="41" ry="9" fill="#2c3047" />
    <ellipse cx="69" cy="34.6" rx="36.5" ry="6.8" fill="#050609" />
    <rect x="40" y="46" width="5" height="84" rx="2.5" fill="#fff" opacity="0.17" />
    <MarkSvg fill="#fff" x={47} y={80} width={46} />
  </svg>
);

const ObjRollup = () => (
  <svg viewBox="0 0 110 256" aria-hidden focusable="false">
    <defs>
      <linearGradient id="pa-r-ban" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#24283d" />
        <stop offset="1" stopColor="#0c0e17" />
      </linearGradient>
      <linearGradient id="pa-r-base" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d7d9e5" />
        <stop offset="1" stopColor="#737790" />
      </linearGradient>
    </defs>
    <rect x="12" y="8" width="86" height="6" rx="3" fill="#aeb2c4" />
    <rect x="17" y="12" width="76" height="214" rx="2" fill="url(#pa-r-ban)" stroke={VIOLET} strokeOpacity="0.3" />
    <MarkSvg fill="#fff" x={27} y={36} width={56} />
    <path
      d="M17 148c20-8 38 6 76-6M17 166c24-8 40 8 76-4M17 184c22-6 42 6 76-6M17 202c20-6 44 8 76-4"
      stroke="#b3a6ff"
      strokeOpacity="0.2"
      fill="none"
    />
    <rect x="6" y="224" width="98" height="14" rx="6" fill="url(#pa-r-base)" />
    <path d="M14 238l-4 8M96 238l4 8" stroke="#737790" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const ObjLaptop = () => (
  <svg viewBox="0 0 240 150" aria-hidden focusable="false">
    <defs>
      <linearGradient id="pa-l-alu" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e6e8f1" />
        <stop offset="1" stopColor="#868aa0" />
      </linearGradient>
      <linearGradient id="pa-l-scr" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#171a2a" />
        <stop offset="1" stopColor="#090a12" />
      </linearGradient>
    </defs>
    <rect x="30" y="6" width="180" height="120" rx="9" fill="#1a1d2b" stroke="#c4bde2" strokeOpacity="0.4" />
    <rect x="37" y="13" width="166" height="106" rx="3" fill="url(#pa-l-scr)" />
    <MarkSvg fill="#fff" x={44} y={20} width={26} />
    <rect x="44" y="38" width="28" height="3" rx="1.5" fill="#fff" opacity="0.2" />
    <rect x="44" y="46" width="22" height="3" rx="1.5" fill="#fff" opacity="0.14" />
    <rect x="44" y="54" width="26" height="3" rx="1.5" fill="#fff" opacity="0.14" />
    <rect x="44" y="62" width="18" height="3" rx="1.5" fill="#fff" opacity="0.14" />
    <rect x="82" y="34" width="66" height="78" rx="5" fill="#20243a" />
    <path d="M104 56c4-6 20-6 24 0l10 8-4 10-5-2v28h-26V72l-5 2-4-10Z" fill="#ebe7f7" />
    <rect x="156" y="34" width="40" height="6" rx="3" fill={VIOLET} />
    <rect x="156" y="46" width="34" height="3" rx="1.5" fill="#fff" opacity="0.16" />
    <rect x="156" y="54" width="28" height="3" rx="1.5" fill="#fff" opacity="0.16" />
    <rect x="156" y="62" width="32" height="3" rx="1.5" fill="#fff" opacity="0.16" />
    <rect x="156" y="98" width="40" height="12" rx="6" fill="#7c5cff" />
    <path d="M8 126h224l6 12c1 4-2 7-6 7H8c-4 0-7-3-6-7Z" fill="url(#pa-l-alu)" />
    <rect x="100" y="126" width="40" height="4" rx="2" fill="#6f7388" opacity="0.6" />
  </svg>
);

/* Un bloc du formulaire : il se construit sur sa fenêtre de p, [a ; a + d]
   (voir .pa-st). */
const st = (a: number, d: number) => ({ ['--a' as string]: a, ['--d' as string]: d } as React.CSSProperties);

/* ── Qui saute la vitrine ? UNE seule raison ──────────────────────────────
   La vitrine EST la demande du propriétaire : elle se rejoue à chaque
   ouverture de la page, rechargement compris. Le seul cas où on l'escamote
   est celui où la montrer serait absurde : le navigateur porte DÉJÀ une
   session PEG (jeton persisté par `peg_auth`, lu sans toucher au store) —
   typiquement un utilisateur connecté qui retombe sur /sign-in.
   ⚠ NE PAS réintroduire de drapeau « déjà vu » (sessionStorage au montage,
   localStorage au submit) : les deux effaçaient précisément la scène
   demandée. ?form=1 ouvre la plaque d'emblée, ?vitrine=1 force la scène. */
const readReturningVisitor = (): boolean => {
  try {
    return !!getPersistedAuthToken();
  } catch {
    /* stockage inaccessible (Safari privé strict) : on montre la vitrine */
    return false;
  }
};

/** `inert` n'existe pas avant Safari 15.5 : on saura alors retirer les cibles
    de tabulation à la main (aria-hidden seul n'empêche pas le focus clavier). */
const INERT_SUPPORTED = typeof HTMLElement !== 'undefined' && 'inert' in HTMLElement.prototype;

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]';

/**
 * Masque un panneau aux technologies d'assistance et au clavier.
 * @param useInert `false` pour la plaque fermée : on veut qu'un gestionnaire de
 * mots de passe puisse toujours viser le champ e-mail (`focus()` programmatique
 * reste permis avec `tabindex="-1"`, il est bloqué par `inert`) — c'est ce
 * focus qui ouvre la plaque toute seule.
 */
const setPanelHidden = (el: HTMLElement | null, hidden: boolean, useInert: boolean) => {
  if (!el) return;
  el.setAttribute('aria-hidden', String(hidden));
  if (useInert && INERT_SUPPORTED) {
    el.toggleAttribute('inert', hidden);
    return;
  }
  el.querySelectorAll<HTMLElement>(FOCUSABLE).forEach((node) => {
    if (hidden) {
      if (!node.hasAttribute('data-pa-tab')) node.setAttribute('data-pa-tab', node.getAttribute('tabindex') ?? '');
      node.setAttribute('tabindex', '-1');
    } else {
      const prev = node.getAttribute('data-pa-tab');
      if (prev === null) return;
      if (prev === '') node.removeAttribute('tabindex');
      else node.setAttribute('tabindex', prev);
      node.removeAttribute('data-pa-tab');
    }
  });
};

const isTypingTarget = (node: EventTarget | null) => {
  if (!(node instanceof HTMLElement)) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
};

/* ── Tic haptique au franchissement du point de validation (35 %) ──
   Android : navigator.vibrate. iOS n'a pas d'API de vibration dans Safari ;
   depuis iOS 18, basculer une case `<input type="checkbox" switch>` produit
   le tic natif du système — on en garde une, invisible, hors écran. Confort
   pur : toute erreur est ignorée, jamais bloquante. */
const useHaptic = () => {
  const labelRef = useRef<HTMLLabelElement | null>(null);
  useEffect(() => () => {
    labelRef.current?.remove();
    labelRef.current = null;
  }, []);
  return useCallback(() => {
    try {
      if (typeof navigator.vibrate === 'function') {
        navigator.vibrate(8);
        return;
      }
      let label = labelRef.current;
      if (!label) {
        label = document.createElement('label');
        label.setAttribute('aria-hidden', 'true');
        label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('switch', '');
        input.tabIndex = -1;
        label.appendChild(input);
        document.body.appendChild(label);
        labelRef.current = label;
      }
      label.click();
    } catch {
      /* confort : jamais bloquant */
    }
  }, []);
};

/* ═══════════════════════════════════════════════════════════════════════════
   LE DIPTYQUE — téléphone uniquement
   ═══════════════════════════════════════════════════════════════════════════ */

/** Géométrie mesurée (offsetLeft/Width, jamais getBoundingClientRect) : le
    logo du centre (pour savoir quand le verre passe devant), le rail et sa
    poignée. */
type PaGeo = { hx: number; hw: number; railL: number; railW: number; knobL: number; knobW: number };

/* Arrivées : au doigt, un ressort sans oscillation qui repart à la vitesse du
   geste (ζ ≈ 1) ; au bouton, au clavier et au « Retour », la courbe du cahier
   des charges, 750 ms — la cascade du formulaire a le temps de se lire. */
const SPRING = { type: 'spring' as const, stiffness: 300, damping: 35, mass: 1 };
const GLIDE = { duration: 0.75, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };
/** Point de validation : relâché avant, on revient à l'accueil ; après, on ouvre. */
const THRESHOLD = 0.35;

const PhoneAtelier = ({
  openSignUp, signUpOpen, year,
}: {
  openSignUp: (type: AccountType) => void;
  signUpOpen: boolean;
  year: number;
}) => {
  const reduced = useReducedMotion() === true;
  const haptic = useHaptic();

  const startOpen = useMemo(() => {
    let forced: string | null = null;
    let vitrine: string | null = null;
    try {
      const q = new URLSearchParams(window.location.search);
      forced = q.get('form');
      vitrine = q.get('vitrine');
    } catch {
      /* URL illisible : comportement par défaut */
    }
    if (vitrine === '1') return false;
    if (forced === '1') return true;
    return readReturningVisitor();
  }, []);

  const W = useRef(typeof window === 'undefined' ? 390 : window.innerWidth);
  /* x : 0 = accueil, -W = plaque posée. TOUT le reste en est fonction —
     aucune minuterie — c'est pourquoi la transition suit le doigt. */
  const x = useMotionValue(startOpen ? -W.current : 0);
  const [opened, setOpened] = useState(startOpen);
  const openRef = useRef(startOpen);
  const targetOpenRef = useRef(startOpen);
  const runningRef = useRef<{ stop: () => void } | null>(null);
  /** L'animation d'arrivée est-elle en cours ? (filet de sécurité d'`onPointerUp`) */
  const settlingRef = useRef(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const signUpRef = useRef(signUpOpen);
  signUpRef.current = signUpOpen;

  const geo = useRef<PaGeo>({ hx: 0, hw: 0, railL: 0, railW: 0, knobL: 0, knobW: 0 });
  const geoTick = useMotionValue(0);

  /* ── Progression 0 → 1 ── */
  const p = useTransform(x, (v) => clamp(-v / W.current, 0, 1));
  const k = reduced ? 0 : 1;
  /** Bord gauche de la plaque, à l'écran. Elle part de 105 % ; au-delà de
      l'ouverture (élastique), elle suit simplement le doigt. */
  const edgeOf = (xv: number) => {
    const w = W.current;
    return xv >= -w ? 1.05 * (w + xv) : w + xv;
  };

  /* 1. L'univers sombre recule : échelle 1 → 0,96, −40px, lumière qui baisse. */
  const worldX = useTransform(p, (v) => -40 * v * k);
  const worldS = useTransform(p, (v) => 1 - 0.04 * v * k);
  const veilO = useTransform(p, (v) => 0.45 * v);

  /* 2. Parallaxe : premier plan −120px, second −70px, fond −25px, et une
     rotation de 2 à 5° propre à chaque objet. */
  const backX = useTransform(p, (v) => -25 * v * k);
  const midX = useTransform(p, (v) => -70 * v * k);
  const foreX = useTransform(p, (v) => -120 * v * k);
  const rotRollup = useTransform(p, (v) => -2 * v * k);
  const rotHoodie = useTransform(p, (v) => -3 * v * k);
  const rotCap = useTransform(p, (v) => 4 * v * k);
  const rotMug = useTransform(p, (v) => 5 * v * k);
  const rotLaptop = useTransform(p, (v) => -3 * v * k);

  /* 3-4. La plaque : translateX(105 %) · rotateY(−6°) · scale(0,97) → neutre.
     Pivot sur son bord gauche : c'est la tranche qui mène. Posée, on rend
     `none` — une transformation 3D résiduelle garderait le texte dans un
     calque et l'adoucirait. */
  const plateT = useTransform(x, (xv) => {
    const w = W.current;
    const v = clamp(-xv / w, 0, 1);
    const tx = edgeOf(xv);
    if (Math.abs(tx) < 0.01) return 'none';
    if (reduced) return `translate3d(${tx.toFixed(2)}px,0,0)`;
    const ry = -6 * (1 - v);
    const s = 0.97 + 0.03 * v;
    return `perspective(1400px) translate3d(${tx.toFixed(2)}px,0,0) rotateY(${ry.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  });

  /* Verre pendant le passage, ivoire franc une fois posée : une couche ivoire
     monte en opacité sur la fin (opacité seule : rien à repeindre). */
  const fillO = useTransform(p, (v) => (reduced ? 1 : 0.85 * smooth(0.55, 1, v)));

  /* 5. Le liseré mauve de la tranche : visible pendant le passage seulement. */
  const glowO = useTransform(p, (v) => (reduced ? 0 : smooth(0.004, 0.05, v) * (1 - smooth(0.8, 1, v))));

  /* 6. Le verre trouble le logo quand sa tranche passe sur son MILIEU : 0 → 1
     → 0 sur ±17 % de sa largeur, soit un quart de la course : un passage, pas
     un état. (Le logo est si large que, mesuré sur toute sa largeur, il restait
     flou pendant presque toute la transition.) */
  const lens = useTransform([x, geoTick] as MotionValue<number>[], ([xv]: number[]) => {
    const g = geo.current;
    if (reduced || !g.hw) return 0;
    const w = W.current;
    const v = clamp(-xv / w, 0, 1);
    const s = 1 - 0.04 * v;
    const cx = w / 2 + (g.hx - w / 2) * s - 40 * v;
    const u = (edgeOf(xv) - cx) / (g.hw * s * 0.17);
    return u <= -1 || u >= 1 ? 0 : Math.pow(1 - u * u, 1.5);
  });
  const heroFilter = useTransform(lens, (d) => (d > 0.01 ? `blur(${(5 * d).toFixed(2)}px)` : 'none'));
  const heroShift = useTransform(lens, (d) => -4 * d);
  /* aberration chromatique : rouge et bleu séparés de 1,8px au plus */
  const abR = useTransform(lens, (d) => -1.8 * d);
  const abB = useTransform(lens, (d) => 1.8 * d);
  const abO = useTransform(lens, (d) => 0.85 * d);

  /* Le rail : ses libellés s'effacent, la poignée est poussée par la tranche
     (6px devant elle) jusqu'à buter à gauche du rail. */
  const labelO = useTransform(p, (v) => 1 - smooth(0, 0.28, v));
  const knobX = useTransform([x, geoTick] as MotionValue<number>[], ([xv]: number[]) => {
    const g = geo.current;
    if (!g.railW) return 0;
    const inset = g.knobL > 0 ? g.railW - g.knobL - g.knobW : 8;
    const restL = g.railL + g.knobL;
    return Math.max(g.railL + inset, Math.min(restL, edgeOf(xv) - 6 - g.knobW)) - restL;
  });

  const settle = useCallback(() => {
    settlingRef.current = false;
    const isOpen = x.get() <= -W.current + 1;
    openRef.current = isOpen;
    setOpened(isOpen);
    if (!isOpen && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [x]);

  /** `velocity` : celle du doigt (ressort) ; `null` : courbe du cahier des charges. */
  const glideTo = useCallback(
    (target: number, velocity: number | null) => {
      runningRef.current?.stop();
      targetOpenRef.current = target !== 0;
      if (reduced) {
        x.set(target);
        settle();
        return;
      }
      settlingRef.current = true;
      runningRef.current = velocity === null
        ? animate(x, target, { ...GLIDE, onComplete: settle })
        : animate(x, target, { ...SPRING, velocity, onComplete: settle });
    },
    [reduced, settle, x],
  );

  /* Le focus est posé APRÈS l'arrivée, jamais sur une minuterie : tant que le
     panneau d'arrivée n'a pas récupéré ses cibles de tabulation (inert /
     tabindex retirés à la fin), un focus() serait ignoré. */
  const focusWish = useRef<'email' | 'rail' | null>(null);

  const openDrawer = useCallback(
    (focusField: boolean) => {
      if (targetOpenRef.current && openRef.current) return;
      if (focusField) focusWish.current = 'email';
      glideTo(-W.current, null);
    },
    [glideTo],
  );

  const closeDrawer = useCallback(
    (focusRail: boolean) => {
      if (focusRail) focusWish.current = 'rail';
      glideTo(0, null);
    },
    [glideTo],
  );

  /* ── LE GESTE ──────────────────────────────────────────────────────────── */
  const drag = useRef({
    active: false, startX: 0, startY: 0, base: 0, axis: '' as '' | 'x' | 'y',
    vel: 0, lastX: 0, lastT: 0, moved: false, above: false,
  });

  /* ⚠ On ne touche PAS à l'animation ici : un simple appui pendant une arrivée
     la figeait à mi-course. Elle n'est interrompue qu'une fois l'axe
     horizontal décidé, dans `onPointerMove`. */
  const onPointerDown = (e: React.PointerEvent) => {
    if (signUpRef.current) return; // la modale d'inscription est au-dessus
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isTypingTarget(e.target)) return;
    const d = drag.current;
    d.active = true; d.moved = false; d.axis = '';
    d.startX = e.clientX; d.startY = e.clientY; d.base = x.get();
    d.lastX = e.clientX; d.lastT = performance.now(); d.vel = 0;
    d.above = clamp(-x.get() / W.current, 0, 1) > THRESHOLD;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.axis === '') {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      // Verrouillage d'axe : franchement horizontal → on le prend ; sinon on
      // le rend au défilement vertical.
      d.axis = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y';
      if (d.axis === 'y') { d.active = false; return; }
      /* Le doigt reprend la main ICI, sur la position COURANTE de x : pas de
         saut à la prise en main si une arrivée était en cours. */
      runningRef.current?.stop();
      settlingRef.current = false;
      focusWish.current = null; // plus de focus différé : le geste décide
      d.base = x.get() - dx;
      /* La capture n'est prise qu'une fois l'axe horizontal décidé : prise dès
         le pointerdown, elle retargetait le `click` de compatibilité et le
         rail ne s'ouvrait plus à l'appui simple. */
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* la capture est un confort : le glissement doit marcher sans elle */
      }
    }
    d.moved = true;
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) {
      d.vel = 0.78 * d.vel + 0.22 * ((e.clientX - d.lastX) / dt) * 1000;
      d.lastT = now; d.lastX = e.clientX;
    }
    let raw = d.base + dx;
    // Élastique aux DEUX butées : |brut|^0,82 × 0,34.
    if (raw > 0) raw = Math.pow(raw, 0.82) * 0.34;
    else if (raw < -W.current) raw = -W.current - Math.pow(-(raw + W.current), 0.82) * 0.34;
    x.set(raw);
    // Le tic haptique marque le franchissement du point de validation.
    const above = clamp(-raw / W.current, 0, 1) > THRESHOLD;
    if (above !== d.above) {
      d.above = above;
      haptic();
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (!d.moved) {
      /* Simple appui : c'est le bouton qui décide. Filet de sécurité — si la
         plaque se retrouvait arrêtée à mi-course sans animation en cours, on
         la repose sur sa cible. */
      const cur = x.get();
      if (!settlingRef.current && cur < -0.5 && cur > -W.current + 0.5) {
        glideTo(targetOpenRef.current ? -W.current : 0, null);
      }
      return;
    }
    const prog = clamp(-x.get() / W.current, 0, 1);
    let target: number;
    if (d.vel < -520) target = -W.current;          // lancé vers la gauche → ouvre
    else if (d.vel > 520) target = 0;               // lancé vers la droite → referme
    else target = prog > THRESHOLD ? -W.current : 0; // sinon, point de validation
    glideTo(target, d.vel);                          // repart à la vitesse du doigt
  };

  /* ── Mesure + recalage à la rotation / au clavier virtuel iOS ── */
  useLayoutEffect(() => {
    /* Position d'un élément DANS un ancêtre donné, en remontant la chaîne des
       offsetParent (les transformations n'y entrent pas : c'est la position
       de repos qu'on veut). */
    const offsetIn = (el: HTMLElement, root: HTMLElement | null) => {
      let left = 0;
      let node: HTMLElement | null = el;
      while (node && node !== root) {
        left += node.offsetLeft;
        node = node.offsetParent as HTMLElement | null;
      }
      return left;
    };
    const measure = () => {
      const g = geo.current;
      const stage = stageRef.current;
      const h = heroRef.current;
      const rl = railRef.current;
      const kn = knobRef.current;
      if (h) { g.hw = h.offsetWidth; g.hx = offsetIn(h, stage) + g.hw / 2; }
      if (rl) { g.railL = offsetIn(rl, stage); g.railW = rl.offsetWidth; }
      if (kn) { g.knobL = offsetIn(kn, rl); g.knobW = kn.offsetWidth; }
      geoTick.set(geoTick.get() + 1);
    };
    measure();
    const onResize = () => {
      W.current = window.innerWidth;
      measure();
      x.set(openRef.current ? -W.current : 0);
    };
    window.addEventListener('resize', onResize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      [heroRef.current, railRef.current].forEach((el) => { if (el) ro?.observe(el); });
    }
    let alive = true;
    document.fonts?.ready?.then(() => { if (alive) measure(); }).catch(() => {});
    return () => {
      alive = false;
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [x, geoTick]);

  /* ── La construction du formulaire lit p en CSS (--pp) : chaque bloc a sa
     fenêtre (voir .pa-st). Au retour, p décroît : ils partent dans l'ordre
     inverse, sans code de plus. ── */
  useLayoutEffect(() => {
    const el = drawerRef.current;
    const apply = (v: number) => el?.style.setProperty('--pp', v.toFixed(4));
    apply(p.get());
    return p.on('change', apply);
  }, [p]);

  /* ── L'invitation au repos (la poignée qui fait signe) s'arrête dès que la
     plaque bouge. ── */
  useEffect(() => p.on('change', (v) => {
    rootRef.current?.classList.toggle('pa-moving', v > 0.002);
  }), [p]);

  /* ── Graisse 800 d'Inter, chargée d'ici SEULEMENT (jamais dans app.css : le
     bureau demande 800 et changerait de rendu), retirée au démontage. ── */
  useEffect(() => {
    const id = 'pa-inter-800';
    if (document.getElementById(id)) return undefined;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@800&display=swap';
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  /* ── Arrêt de toute animation en cours au démontage ── */
  useEffect(() => () => runningRef.current?.stop(), []);

  /* ── Clavier ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (signUpRef.current) return;
      // Dans un champ de saisie, les flèches déplacent le curseur : on ignore.
      if (isTypingTarget(document.activeElement)) return;
      if (e.key === 'Escape' && openRef.current) closeDrawer(true);
      else if (e.key === 'ArrowLeft' && !openRef.current) openDrawer(true);
      else if (e.key === 'ArrowRight' && openRef.current) closeDrawer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDrawer, openDrawer]);

  /* ── inert / aria-hidden posés À LA FIN de l'arrivée, puis le focus ── */
  useEffect(() => {
    setPanelHidden(stageRef.current, opened, true);
    setPanelHidden(drawerRef.current, !opened, false);
    const wish = focusWish.current;
    focusWish.current = null;
    if (wish === 'email' && opened) document.getElementById('signin-email')?.focus({ preventScroll: true });
    else if (wish === 'rail' && !opened) railRef.current?.focus({ preventScroll: true });
  }, [opened]);

  /* Un gestionnaire de mots de passe (ou une tabulation) qui vise le champ
     e-mail alors que la plaque est fermée l'ouvre. */
  const onDrawerFocus = () => {
    if (!targetOpenRef.current) openDrawer(false);
  };

  return (
    <div ref={rootRef} className={`pa-root${reduced || startOpen ? '' : ' pa-anim'}${opened ? ' pa-opened' : ''}`}>
      <style>{PHONE_CSS}</style>

      {/* ═════════ L'ACCUEIL — l'univers sombre ═════════ */}
      <section className="pa-stage" ref={stageRef} aria-label="Découvrir PEG">
        <h1 className="pa-sr">Votre image, sur tous vos supports</h1>
        <div
          className="pa-wrap"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <motion.div className="pa-world" style={{ x: worldX, scale: worldS }}>
            <div className="pa-scene" aria-hidden>
              {/* Origine = centre du logo ; tout se place en unités --u. Trois
                  enveloppes par objet : la parallaxe (framer-motion), l'entrée
                  (CSS, fill-mode backwards) et le flottement (CSS) — chacune
                  garde seule la main sur SON transform. */}
              <div className="pa-orbit">
                <span className="pa-halo" />
                <motion.div className="pa-obj pa-obj--rollup pa-obj--back" style={{ x: backX, rotate: rotRollup }}>
                  <div className="pa-in pa-in--o1">
                    <div className="pa-float" style={{ ['--dur' as string]: '8.4s', ['--sway' as string]: '-1deg' } as React.CSSProperties}>
                      <ObjRollup />
                    </div>
                  </div>
                </motion.div>
                <motion.div className="pa-obj pa-obj--hoodie pa-obj--mid" style={{ x: midX, rotate: rotHoodie }}>
                  <div className="pa-in pa-in--o2">
                    <div className="pa-float" style={{ ['--dur' as string]: '7.2s', ['--del' as string]: '-2s' } as React.CSSProperties}>
                      <ObjHoodie />
                    </div>
                  </div>
                </motion.div>
                <motion.div className="pa-obj pa-obj--cap pa-obj--mid" style={{ x: midX, rotate: rotCap }}>
                  <div className="pa-in pa-in--o3">
                    <div className="pa-float" style={{ ['--dur' as string]: '6.6s', ['--del' as string]: '-4s', ['--sway' as string]: '-1.5deg' } as React.CSSProperties}>
                      <ObjCap />
                    </div>
                  </div>
                </motion.div>

                <motion.div className="pa-hero" ref={heroRef} style={{ x: heroShift, filter: heroFilter }}>
                  <div className="pa-in pa-in--hero">
                    <motion.div className="pa-ab" style={{ x: abR, opacity: abO }}>
                      <MarkSvg fill="#ff2d55" dot="#ff2d55" />
                    </motion.div>
                    <motion.div className="pa-ab" style={{ x: abB, opacity: abO }}>
                      <MarkSvg fill="#2d6bff" dot="#2d6bff" />
                    </motion.div>
                    <HeroMark />
                  </div>
                </motion.div>

                <motion.div className="pa-obj pa-obj--mug pa-obj--fore" style={{ x: foreX, rotate: rotMug }}>
                  <div className="pa-in pa-in--o4">
                    <div className="pa-float" style={{ ['--dur' as string]: '6.2s', ['--del' as string]: '-1s', ['--sway' as string]: '1.5deg' } as React.CSSProperties}>
                      <ObjMug />
                    </div>
                  </div>
                </motion.div>
                <motion.div className="pa-obj pa-obj--laptop pa-obj--fore" style={{ x: foreX, rotate: rotLaptop }}>
                  <div className="pa-in pa-in--o5">
                    <div className="pa-float" style={{ ['--dur' as string]: '7.8s', ['--del' as string]: '-3s', ['--sway' as string]: '-.8deg' } as React.CSSProperties}>
                      <ObjLaptop />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Le rail : le chemin explicite, dans la zone du pouce — et un
              curseur qu'on peut glisser. */}
          <div className="pa-railwrap pa-in pa-in--rail">
            <button
              type="button"
              className="pa-rail"
              ref={railRef}
              onClick={() => { if (!drag.current.moved) openDrawer(true); }}
              aria-label="Se connecter : appuyez, ou glissez vers la gauche"
            >
              <motion.span className="pa-rail__labels" style={{ opacity: labelO }}>
                <span className="pa-rail__kicker">Se connecter</span>
                <span className="pa-rail__sub">Appuyez, ou glissez vers la gauche</span>
              </motion.span>
              <motion.span className="pa-knob" ref={knobRef} style={{ x: knobX }} aria-hidden>
                <span className="pa-knob__in">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                    <path d="M14.5 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </motion.span>
            </button>
          </div>
        </div>
        <motion.span className="pa-veil" style={{ opacity: veilO }} />
      </section>

      {/* ═════════ LA PLAQUE DE VERRE — la connexion ═════════ */}
      <motion.section
        className="pa-plate"
        ref={drawerRef}
        style={{ transform: plateT }}
        aria-label="Connexion"
        onFocus={onDrawerFocus}
      >
        <motion.span className="pa-fill" style={{ opacity: fillO }} aria-hidden />
        <span className="pa-sheen" aria-hidden />
        <motion.span className="pa-glow" style={{ opacity: glowO }} aria-hidden />
        <div
          className="pa-grip"
          aria-hidden
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        <div className="pa-body" ref={bodyRef}>
          <div className="pa-st pa-dhead" style={st(0.62, 0.1)}>
            <button type="button" className="pa-back" onClick={() => closeDrawer(true)}>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                <path d="M12 4l-5 6 5 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Retour
            </button>
          </div>

          <div className="pa-st pa-flogo" style={st(0.65, 0.1)} role="img" aria-label={APP_NAME}>
            <MarkSvg fill="#12142b" />
          </div>

          {/* Les champs se construisent un par un (.pa-formwrap form > div > *). */}
          <div className="pa-formwrap">
            <SignInForm disableSubmit={false} />
          </div>

          <div className="pa-st pa-accts" style={st(0.972, 0.026)}>
            <div className="pa-sep">
              <span /><span className="pa-sep__t">Pas encore de compte ?</span><span />
            </div>
            <button type="button" className="pa-acct" onClick={() => openSignUp('customer')}>
              <span className="pa-acct__key" style={{ background: '#6d5dfc' }} />
              <span className="pa-acct__txt">
                <b>Créer un compte client</b>
                <em>Commandez vos produits, suivez vos projets et validez vos BAT</em>
              </span>
              <HiArrowNarrowRight size={16} color="#a3a79f" />
            </button>
            <button type="button" className="pa-acct pa-acct--gen" onClick={() => openSignUp('generator')}>
              <span className="pa-acct__key" style={{ background: '#0d9f6e' }} />
              <span className="pa-acct__txt">
                <b>Devenir Générateur</b>
                <em>Apportez des clients à PEG et percevez une commission sur leurs commandes</em>
              </span>
              <HiArrowNarrowRight size={16} color="#a3a79f" />
            </button>
          </div>

          <p className="pa-st pa-foot" style={st(0.978, 0.022)}>
            Connexion sécurisée<i />Hébergé en France<i />© {year} {APP_NAME}
          </p>
        </div>
      </motion.section>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   FEUILLE DU DIPTYQUE
   ⚠ PIÈGE : les animations CSS (entrée, flottement) sont portées par des
   ENVELOPPANTS, jamais par l'élément que framer-motion transforme, et
   l'entrée est en fill-mode BACKWARDS, jamais `both` : sinon leur état final
   écraserait en permanence les transformations pilotées par le doigt.
   ═══════════════════════════════════════════════════════════════════════════ */
const PHONE_CSS = `
.pa-root{
  --pa-safe-top: env(safe-area-inset-top, 0px);
  --pa-safe-bottom: env(safe-area-inset-bottom, 0px);
  --pa-pad: 22px;
  --pa-rail-h: 68px;
  --pa-knob: 52px;
  --pa-knob-in: 8px;
  /* Unité de la composition : suit la largeur, plafonnée sur tablette et
     rétrécie par un écran court (paysage). 402px de large → 4,02px. */
  --u: min(1vw, 4.6px, .46dvh);
  position: fixed; inset: 0; height: 100dvh;
  overflow: hidden; isolation: isolate;
  background: #070a12; color: #fff;
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}
.pa-root *{ -webkit-tap-highlight-color: transparent; }
/* un <button> n'hérite pas de la police */
.pa-root button{ font-family:inherit; font-size:inherit; color:inherit; }
.pa-sr{ position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden;
  clip:rect(0 0 0 0); white-space:nowrap; border:0; }

/* ── L'ACCUEIL : bleu-noir, un seul voile de lumière sous le logo ── */
.pa-stage{ position:absolute; inset:0; overflow:hidden;
  background:radial-gradient(120% 70% at 50% 56%, #0f1224 0%, #070a12 64%); }
.pa-veil{ position:absolute; inset:0; background:#010208; opacity:0; pointer-events:none; display:block; }
.pa-wrap{ position:absolute; inset:0; touch-action:none; -webkit-user-select:none; user-select:none; }
.pa-world{ position:absolute; inset:0; transform-origin:50% 50%; will-change:transform; }
.pa-scene{ position:absolute; left:0; right:0; top:var(--pa-safe-top); pointer-events:none;
  bottom:calc(var(--pa-safe-bottom) + var(--pa-rail-h) + 34px); }
/* origine de la composition = centre du logo, un peu sous le milieu */
.pa-orbit{ position:absolute; left:50%; top:56%; width:0; height:0; }
.pa-halo{ position:absolute; display:block;
  left:calc(var(--u) * -64); top:calc(var(--u) * -44); width:calc(var(--u) * 128); height:calc(var(--u) * 88);
  background:radial-gradient(closest-side, rgba(124,92,255,.24), rgba(124,92,255,0)); }

/* ── Les objets : carte en unités --u, depuis le centre du logo ── */
.pa-obj{ position:absolute; will-change:transform; }
.pa-obj svg{ display:block; width:100%; height:auto; overflow:visible; }
.pa-obj--hoodie{ left:calc(var(--u) * -48); top:calc(var(--u) * -72); width:calc(var(--u) * 40); z-index:2; }
.pa-obj--cap{ left:calc(var(--u) * 12); top:calc(var(--u) * -63); width:calc(var(--u) * 32); z-index:2; }
.pa-obj--cap .pa-float > svg{ transform:rotate(-8deg); }
.pa-obj--rollup{ left:calc(var(--u) * -50); top:calc(var(--u) * -30); width:calc(var(--u) * 16); z-index:1; }
.pa-obj--mug{ left:calc(var(--u) * 27); top:calc(var(--u) * -36); width:calc(var(--u) * 23); z-index:4; }
.pa-obj--laptop{ left:calc(var(--u) * -42); top:calc(var(--u) * 23); width:calc(var(--u) * 46); z-index:4; }
.pa-float{ animation:paFloat var(--dur, 7s) ease-in-out infinite var(--del, 0s);
  filter:drop-shadow(0 14px 20px rgba(0,0,0,.55)); }
/* profondeur : le fond est flou et plus sombre, le second plan un peu éteint */
.pa-obj--back .pa-float{ filter:blur(1.5px); opacity:.7; }
.pa-obj--mid .pa-float{ opacity:.93; }
@keyframes paFloat{
  0%,100%{ transform:translate3d(0,0,0) rotate(0deg) }
  50%{ transform:translate3d(0,-7px,0) rotate(var(--sway, 1deg)) }
}

/* ── Le logo du centre ── */
.pa-hero{ position:absolute; z-index:3; will-change:transform, filter;
  left:calc(var(--u) * -39); top:calc(var(--u) * -16.1); width:calc(var(--u) * 78); }
.pa-in--hero{ position:relative; }
.pa-hero svg{ display:block; width:100%; height:auto; overflow:visible; }
.pa-hero__svg{ position:relative; filter:drop-shadow(0 18px 30px rgba(76,52,190,.38)); }
.pa-ab{ position:absolute; inset:0; opacity:0; will-change:transform, opacity; }

/* ── Le rail : chemin explicite et curseur ── */
.pa-railwrap{ position:absolute; left:var(--pa-pad); right:var(--pa-pad);
  bottom:calc(var(--pa-safe-bottom) + 22px); }
.pa-rail{ position:relative; display:flex; align-items:center; width:100%; height:var(--pa-rail-h);
  padding:0 calc(var(--pa-knob) + var(--pa-knob-in) + 14px) 0 24px;
  border-radius:calc(var(--pa-rail-h) / 2); cursor:pointer; text-align:left; color:#fff;
  background:linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.04));
  border:1px solid rgba(255,255,255,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 18px 40px rgba(0,0,0,.35);
  -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); }
.pa-rail__labels{ display:flex; flex-direction:column; min-width:0; will-change:opacity; }
.pa-rail__kicker{ display:block; font-size:17px; font-weight:800; letter-spacing:-.015em; line-height:1.2; }
/* sous-libellé : blanc 66 % ≈ 8:1 sur le rail */
.pa-rail__sub{ display:block; margin-top:3px; font-size:13px; font-weight:500; line-height:1.3;
  color:rgba(255,255,255,.66); white-space:nowrap; }
.pa-knob{ position:absolute; right:var(--pa-knob-in); top:50%; width:var(--pa-knob); height:var(--pa-knob);
  margin-top:calc(var(--pa-knob) / -2); display:block; will-change:transform; }
.pa-knob__in{ display:flex; align-items:center; justify-content:center; width:100%; height:100%;
  border-radius:50%; color:#fff;
  background:radial-gradient(circle at 34% 28%, #c2a8ff 0%, #8b5cf6 46%, #6536dc 100%);
  box-shadow:0 8px 22px rgba(124,58,237,.45), inset 0 1px 0 rgba(255,255,255,.35); }
.pa-knob__in svg{ width:22px; height:22px; display:block; }

/* ── LA PLAQUE DE VERRE ── */
.pa-plate{ position:absolute; left:0; top:0; width:100%; height:100%; z-index:5;
  transform-origin:0% 50%; will-change:transform;
  border-radius:44px; color:#0f172a;
  background:rgba(247,244,239,.8);
  -webkit-backdrop-filter:blur(24px) saturate(1.35); backdrop-filter:blur(24px) saturate(1.35);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.85), -22px 0 60px rgba(0,0,0,.34), 0 40px 100px rgba(0,0,0,.3); }
/* l'ivoire franc de la plaque posée */
.pa-fill{ position:absolute; inset:0; border-radius:inherit; background:#f7f4ef; opacity:0;
  pointer-events:none; display:block; will-change:opacity; }
/* le reflet de la tranche : un filet de lumière, puis un dégradé qui s'éteint */
.pa-sheen{ position:absolute; inset:0; border-radius:inherit; pointer-events:none; display:block;
  background:
    linear-gradient(90deg, rgba(255,255,255,.95) 0, rgba(255,255,255,0) 1.5px),
    linear-gradient(90deg, rgba(255,255,255,.5) 0, rgba(255,255,255,0) 64px); }
/* la réfraction mauve : collée au bord, elle le suit exactement */
.pa-glow{ position:absolute; left:-1px; top:44px; bottom:44px; width:2px; border-radius:2px;
  display:block; opacity:0; pointer-events:none; z-index:2;
  background:linear-gradient(180deg, rgba(168,85,247,0), #a855f7 16%, #7257ff 50%, #a855f7 84%, rgba(168,85,247,0));
  box-shadow:0 0 12px 2px rgba(139,92,246,.8), 0 0 34px 10px rgba(114,87,255,.35); }
.pa-grip{ position:absolute; left:0; top:0; bottom:0; width:26px; z-index:5; touch-action:none; }
.pa-body{ position:absolute; inset:0; border-radius:inherit; overflow-x:hidden; overflow-y:hidden;
  overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
  padding:calc(var(--pa-safe-top) + 14px) var(--pa-pad) calc(var(--pa-safe-bottom) + 28px); }
/* le défilement n'est rendu qu'une fois la plaque posée */
.pa-opened .pa-body{ overflow-y:auto; }

/* ── La construction : chaque bloc se révèle (fondu + 10px) sur sa fenêtre
   [a ; a + d] de p. Les fenêtres sont calées sur la courbe d'arrivée au
   bouton (cubic-bezier(.22,1,.36,1), 750 ms) pour tomber sur le rythme du
   cahier des charges — logo à ~70 % de course, puis e-mail +60 ms, mot de
   passe +60, options +60, bouton +80, comptes +80 : cette courbe freine fort,
   d'où des fenêtres de plus en plus serrées près de 1. Au doigt, le même
   ordre se lit dans l'espace. « translate » et non « transform » : le bouton
   du formulaire écrit son propre transform au survol. ── */
.pa-st, .pa-formwrap form > div > *{
  --t: clamp(0, calc((var(--pp, 1) - var(--a, 0)) / var(--d, .1)), 1);
  opacity:var(--t); translate:0 calc((1 - var(--t)) * 10px); }
.pa-formwrap form > div > :nth-child(1){ --a:.79; --d:.1; }
.pa-formwrap form > div > :nth-child(2){ --a:.87; --d:.08; }
.pa-formwrap form > div > :nth-child(3){ --a:.92; --d:.06; }
.pa-formwrap form > div > :nth-child(4){ --a:.953; --d:.04; }
/* Le bouton de SignInForm porte en ligne « transition: all .15s » : elle
   retardait de 150 ms son fondu et son glissement — il arrivait en retard et
   partait en DERNIER au retour. On la borne à ce qu'elle servait (couleur,
   ombre, survol) ; !important est le seul moyen de primer sur un style en
   ligne, sans toucher au composant partagé. */
.pa-formwrap form > div > button{ transition:background .15s, box-shadow .15s, transform .15s !important; }

.pa-dhead{ height:44px; display:flex; align-items:center; }
.pa-back{ display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 12px 0 8px;
  margin-left:-8px; border-radius:12px; border:none; background:none; cursor:pointer;
  color:#555d70; font-size:14px; font-weight:600; }
.pa-flogo{ width:120px; margin:12px 0 28px; }
.pa-flogo svg{ display:block; width:100%; height:auto; }
.pa-formwrap input:not([type='checkbox']):not([type='radio']){ font-size:16px !important; }
.pa-sep{ display:flex; align-items:center; gap:12px; margin:30px 0 4px; }
.pa-sep > span:not(.pa-sep__t){ flex:1; height:1px; background:#e2ddd3; }
.pa-sep__t{ color:#6f7789; font-size:10.5px; font-weight:800; letter-spacing:.1em;
  text-transform:uppercase; white-space:nowrap; }
.pa-acct{ display:flex; align-items:center; gap:13px; width:100%; min-height:60px; text-align:left;
  background:none; border:0; border-bottom:1px solid #e2ddd3; padding:14px 2px; cursor:pointer; }
.pa-acct__key{ width:3px; align-self:stretch; border-radius:2px; flex:none; }
.pa-acct > svg{ flex:none; }
.pa-acct__txt{ flex:1; min-width:0; }
.pa-acct b{ display:block; font-size:14px; font-weight:700; color:#12142b; letter-spacing:-.01em; }
.pa-acct em{ display:block; font-style:normal; font-size:12px; line-height:1.45; color:#5b6273; margin-top:3px; }
.pa-acct--gen .pa-acct__key{ animation:paKey 2.1s ease-in-out infinite; }
@keyframes paKey{ 0%,100%{ opacity:.55 } 50%{ opacity:1 } }
.pa-foot{ margin:22px 0 0; display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px;
  font-size:11.5px; color:#5b6273; }
.pa-foot i{ display:block; width:3px; height:3px; border-radius:50%; background:#b6b1a4; }

/* ── Focus visible ── */
.pa-rail:focus-visible{ outline:2px solid #a99bff; outline-offset:4px; }
.pa-back:focus-visible, .pa-acct:focus-visible{ outline:2px solid #6d5dfc; outline-offset:3px; }

/* ── ENTRÉE (fill-mode BACKWARDS, voir l'avertissement plus haut) ── */
@keyframes paRise{ from{ opacity:0; transform:translate3d(0,16px,0) scale(.97) } to{ opacity:1; transform:none } }
.pa-anim .pa-in--hero{ animation:paRise 900ms cubic-bezier(.16,1,.3,1) backwards 80ms; }
.pa-anim .pa-in--o1{ animation:paRise 900ms cubic-bezier(.16,1,.3,1) backwards 240ms; }
.pa-anim .pa-in--o2{ animation:paRise 900ms cubic-bezier(.16,1,.3,1) backwards 320ms; }
.pa-anim .pa-in--o3{ animation:paRise 900ms cubic-bezier(.16,1,.3,1) backwards 400ms; }
.pa-anim .pa-in--o4{ animation:paRise 900ms cubic-bezier(.16,1,.3,1) backwards 480ms; }
.pa-anim .pa-in--o5{ animation:paRise 900ms cubic-bezier(.16,1,.3,1) backwards 560ms; }
.pa-anim .pa-in--rail{ animation:paRise 760ms cubic-bezier(.16,1,.3,1) backwards 640ms; }
/* L'invitation au repos : la poignée fait signe vers la gauche (élément
   INTERNE, pour ne pas écraser le x de framer-motion). */
@keyframes paNudge{ 0%,78%,100%{ transform:translateX(0) } 86%{ transform:translateX(-7px) } 93%{ transform:translateX(0) } }
.pa-knob__in{ animation:paNudge 3.6s cubic-bezier(.65,.02,.28,1) infinite 2.2s; }
.pa-moving .pa-knob__in, .pa-opened .pa-knob__in{ animation:none; }

/* ── ÉCRANS COURTS (iPhone SE, barre d'URL déployée) ── */
@media (max-height: 700px){
  .pa-root{ --pa-rail-h: 62px; --pa-knob: 46px; }
  .pa-railwrap{ bottom:calc(var(--pa-safe-bottom) + 16px); }
  .pa-flogo{ margin:8px 0 20px; }
}

/* ── TÉLÉPHONES ÉTROITS (≤ 360px) : le sous-libellé du rail tient sur une ligne ── */
@media (max-width: 360px){
  .pa-root{ --pa-pad: 16px; }
  .pa-rail{ padding-left:20px; padding-right:calc(var(--pa-knob) + var(--pa-knob-in) + 10px); }
  .pa-rail__kicker{ font-size:16px; }
  .pa-rail__sub{ font-size:11.5px; }
}

/* ── TABLETTE EN PORTRAIT (≥ 560px sous le seuil des 920px) : une colonne de
   460px ; la composition est déjà plafonnée par --u. ── */
@media (min-width: 560px){
  .pa-root{ --pa-pad: max(22px, calc((100vw - 460px) / 2)); }
}

/* ── TÉLÉPHONE EN PAYSAGE (≥ 560px de large, ≤ 480px de haut) ── */
@media (min-width: 560px) and (max-height: 480px){
  .pa-root{ --pa-rail-h: 56px; --pa-knob: 42px; --pa-knob-in: 7px; }
  .pa-railwrap{ bottom:calc(var(--pa-safe-bottom) + 12px); }
  .pa-rail__kicker{ font-size:15px; }
  .pa-rail__sub{ font-size:12px; margin-top:1px; }
  .pa-dhead{ height:36px; }
  .pa-flogo{ width:96px; margin:6px 0 16px; }
}

/* ── Transparence réduite : une plaque pleine, sans flou ── */
@media (prefers-reduced-transparency: reduce){
  .pa-plate{ background:#f7f4ef; -webkit-backdrop-filter:none; backdrop-filter:none; }
  .pa-rail{ background:#151827; -webkit-backdrop-filter:none; backdrop-filter:none; }
}

@media (prefers-reduced-motion: reduce){
  .pa-root *{ animation:none !important; }
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   AU-DESSUS DE 920px — la page telle qu'elle était. Rien n'a bougé ici.
   ═══════════════════════════════════════════════════════════════════════════ */
const DesktopSignIn = ({
  openSignUp, year,
}: {
  openSignUp: (type: AccountType) => void;
  year: number;
}) => (
  <div style={{
    minHeight: '100dvh', background: '#06080f', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'var(--peg-pad-24)', fontFamily: 'Inter, sans-serif',
  }}>
    <style>{`
      .si-acct{
        display:flex; align-items:center; gap:13px; width:100%;
        text-align:left; cursor:pointer; background:#fff;
        border:1px solid #e8e5f7; border-radius:14px; padding:13px 15px;
        font-family:Inter, sans-serif;
        transition:border-color .15s, box-shadow .15s, transform .15s;
      }
      .si-acct:hover{ transform:translateY(-1px); box-shadow:0 8px 22px rgba(17,24,39,0.07); }
      .si-acct:focus-visible{ outline:2px solid #6d5dfc; outline-offset:2px; }
      .si-acct--client:hover{ border-color:#c7bfff; }
      .si-acct--generator:hover{ border-color:#9fdcc1; }
      .si-acct__tile{
        display:flex; align-items:center; justify-content:center; flex-shrink:0;
        width:38px; height:38px; border-radius:11px;
      }
      .si-acct__arrow{ flex-shrink:0; transition:transform .15s; }
      .si-acct:hover .si-acct__arrow{ transform:translateX(3px); }

      /* Le parcours Générateur est le moins connu des visiteurs : il pulse
         pour se signaler, et s'arrête dès qu'on le survole (l'attention est
         captée, l'animation n'a plus lieu d'être). */
      @keyframes siGenPulse{
        0%, 100%{
          border-color:rgba(13,159,110,0.45);
          box-shadow:0 0 0 0 rgba(13,159,110,0.35);
          background:#fff;
        }
        50%{
          border-color:rgba(13,159,110,0.95);
          box-shadow:0 0 20px 3px rgba(13,159,110,0.28), 0 0 0 4px rgba(13,159,110,0.10);
          background:#f2fdf8;
        }
      }
      @keyframes siGenTilePulse{
        0%, 100%{ transform:scale(1); }
        50%{ transform:scale(1.12); }
      }
      .si-acct--generator{
        border-color:rgba(13,159,110,0.45);
        animation:siGenPulse 1.9s ease-in-out infinite;
      }
      .si-acct--generator .si-acct__tile{
        animation:siGenTilePulse 1.9s ease-in-out infinite;
      }
      /* animation:none plutôt que animation-play-state:paused — une animation
         en pause continue d'imposer ses valeurs et écraserait l'ombre du survol. */
      .si-acct--generator:hover,
      .si-acct--generator:hover .si-acct__tile{ animation:none; }

      @media (prefers-reduced-motion: reduce){
        .si-acct--generator,
        .si-acct--generator .si-acct__tile{ animation:none; }
      }
    `}</style>

    <div className="si-card" style={{
      width: '100%', maxWidth: '1180px', minHeight: 'min(880px, 92dvh)',
      display: 'flex', borderRadius: '28px', overflow: 'hidden',
      boxShadow: '0 40px 120px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.06)',
    }}>

      {/* ───────── PANNEAU GAUCHE (branding) ───────── */}
      <div className="si-left" style={{
        flex: '1 1 50%', position: 'relative', overflow: 'hidden',
        background: '#070c1a',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        padding: '52px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        {/* glows */}
        <div style={{ position: 'absolute', top: '-130px', right: '-90px', width: '460px', height: '460px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,93,252,0.22) 0%, transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-150px', left: '-110px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,111,237,0.14) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* haut : logo + texte */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Logo mode="light" logoWidth="auto" imgStyle={{ maxWidth: '128px', display: 'block' }} />

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(124,107,255,0.12)', border: '1px solid rgba(124,107,255,0.28)',
            borderRadius: '100px', padding: '5px 14px', margin: '40px 0 22px',
          }}>
            <HiLockClosed size={12} color="#a99bff" />
            <span style={{ color: '#a99bff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Plateforme professionnelle</span>
          </div>

          <h1 style={{ color: '#fff', fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 14px' }}>
            Votre image, sur tous vos supports
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.6, margin: 0, maxWidth: '400px' }}>
            Textile personnalisé, haute visibilité, objets publicitaires, print…
            Commandez vos produits, suivez vos projets et validez vos BAT dans un seul espace.
          </p>
        </div>

        {/* milieu : vitrine de l'offre */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
          <OfferShowcase />
        </div>

        {/* bas : badges de confiance */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', gap: '16px' }}>
          <LeftBadge icon={<HiOutlineShieldCheck size={22} />} label="Connexion sécurisée" />
          <LeftBadge icon={<HiOutlineLightningBolt size={22} />} label="Accès instantané" />
          <LeftBadge icon={<HiOutlineUsers size={22} />} label="Données en France" />
        </div>
      </div>

      {/* ───────── PANNEAU DROIT (formulaire) ───────── */}
      <div className="si-form" style={{
        flex: '1 1 50%', background: '#fff', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '48px 40px',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <SignInForm disableSubmit={false} />

          {/* Création de compte — les deux natures, chacune sa carte */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '26px 0 14px' }}>
            <span style={{ flex: 1, height: '1px', background: '#eef0f5' }} />
            <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Pas encore de compte ?
            </span>
            <span style={{ flex: 1, height: '1px', background: '#eef0f5' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <AccountCta
              variant="client"
              icon={<HiOutlineOfficeBuilding size={19} />}
              title="Créer un compte client"
              subtitle="Commandez vos produits, suivez vos projets et validez vos BAT"
              onClick={() => openSignUp('customer')}
            />
            <AccountCta
              variant="generator"
              icon={<HiOutlineCash size={19} />}
              title="Devenir Générateur"
              subtitle="Apportez des clients à PEG et percevez une commission sur leurs commandes"
              onClick={() => openSignUp('generator')}
            />
          </div>

          {/* Carte sécurité SSL */}
          <div style={{
            marginTop: '22px', background: '#f8f7ff', border: '1px solid #eceaff',
            borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <HiLockClosed size={15} color="#6d5dfc" />
                <span style={{ color: '#312e81', fontSize: '13.5px', fontWeight: 700 }}>Vos données sont protégées</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '12.5px', lineHeight: 1.5, margin: 0 }}>
                Nous utilisons un chiffrement SSL 256-bit pour garantir la sécurité de vos informations.
              </p>
            </div>
            <svg width="58" height="58" viewBox="0 0 58 58" fill="none" style={{ flexShrink: 0 }} aria-hidden>
              <path d="M29 6 l18 6 v13 q0 17 -18 27 q-18 -10 -18 -27 V12 Z" fill="#e9e6ff" stroke="#c7bfff" strokeWidth="1.5" />
              <rect x="22" y="27" width="14" height="11" rx="2.5" fill="#6d5dfc" />
              <path d="M24 27 v-3 a5 5 0 0 1 10 0 v3" fill="none" stroke="#6d5dfc" strokeWidth="2.2" />
              <circle cx="44" cy="40" r="9" fill="#7c6bff" />
              <path d="M40 40 l3 3 l5 -6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '22px' }}>
            <p style={{ color: '#475569', fontSize: '12.5px', fontWeight: 500, margin: '0 0 6px' }}>
              🇫🇷 Hébergé en France
            </p>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
              © {year} {APP_NAME}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Le seuil, en JS : au-dessus de 920px on rend l'arbre historique, en
   dessous le diptyque. Un seul `SignInForm` est monté à la fois — il est
   enveloppé, jamais dupliqué. ── */
const PHONE_QUERY = '(max-width: 920px)';

const usePhoneViewport = () => {
  const [isPhone, setIsPhone] = useState(() => {
    try {
      return window.matchMedia(PHONE_QUERY).matches;
    } catch {
      return false; // sans matchMedia, on sert le bureau
    }
  });
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(PHONE_QUERY);
    } catch {
      return undefined;
    }
    const onChange = (e: MediaQueryListEvent) => setIsPhone(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
    setIsPhone(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return isPhone;
};

const SignIn = () => {
  // Lien de parrainage Générateur : /sign-in?ref=CODE → on ouvre directement
  // l'inscription avec le code pré-rempli.
  const referralFromUrl = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('ref') || '';
    } catch {
      return '';
    }
  }, []);
  const [isSignUpOpen, setIsSignUpOpen] = useState(!!referralFromUrl);
  // Nature de compte proposée à l'ouverture — modifiable dans la modale
  const [signUpType, setSignUpType] = useState<AccountType>('customer');
  const year = new Date().getFullYear();
  const isPhone = usePhoneViewport();

  const openSignUp = (type: AccountType) => {
    setSignUpType(type);
    setIsSignUpOpen(true);
  };

  return (
    <>
      {isPhone ? (
        <PhoneAtelier openSignUp={openSignUp} signUpOpen={isSignUpOpen} year={year} />
      ) : (
        <DesktopSignIn openSignUp={openSignUp} year={year} />
      )}

      {/* La modale est un frère du diptyque, en position fixed z-index 1000 :
          elle passe au-dessus, et le geste dessous est neutralisé tant qu'elle
          est ouverte (garde dans onPointerDown / keydown). */}
      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        initialReferralCode={referralFromUrl}
        initialAccountType={signUpType}
      />
    </>
  );
};

export default SignIn;
