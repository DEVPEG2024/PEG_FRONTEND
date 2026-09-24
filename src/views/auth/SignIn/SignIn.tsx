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
   • EN DESSOUS : `PhoneAtelier`, « Le Repérage ». Un seul objet à l'écran :
     le logo PEG en très grand, tiré en trois plaques cyan / magenta / jaune
     hors repérage ; on tire la feuille de papier vers la gauche, son bord
     coupe le logo (lumière à gauche, encre à droite) et le geste ramène les
     plaques en repérage pendant que le logo monte se poser en tête du
     formulaire. La page passe de l'écran à l'impression.

   Le choix se fait en JS (matchMedia) et non en CSS : au-dessus du seuil le
   DOM est LITTÉRALEMENT celui d'avant, aucune règle mobile n'existe pour le
   contrarier. C'est la garantie la plus forte que le bureau est intact.

   Le discours (pastille, accroche, les deux cartes de compte) est repris MOT
   POUR MOT : il est verrouillé par les tests de terminologie. Sur téléphone,
   le premier écran n'en garde que le strict nécessaire (surtitre, accroche) ;
   le sous-titre, les six catégories et les trois gages restent sur le bureau.
   Seuls les libellés de l'interaction elle-même sont neufs.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Outils de courbe ────────────────────────────────────────────────────── */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** smoothstep sur une fenêtre [e0, e1] : démarrage et arrivée en douceur. */
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ── Vitrine de l'offre PEG : tuiles produits/services (bureau uniquement) ──
   `emoji`, `label` et `sub` sont inchangés. Le téléphone ne montre plus ces
   six catégories sur son premier écran (direction « Le Repérage » : un seul
   objet à l'écran) ; les échantillons de matière et leurs encres, qui
   n'existaient que pour lui, ont été retirés avec la grille. */
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
   LE REPÉRAGE — le logo PEG tiré en plaques d'imprimeur
   ═══════════════════════════════════════════════════════════════════════════ */

/* Tracés du logo PEG (public/img/logo/peg-logo-*.svg, logo du 24/09/2026),
   viewBox 566,9×170,1. Le P a un contre-poinçon : remplissage evenodd. */
const PEG_VB = { w: 566.9, h: 170.1 } as const;
const PEG_PATHS = [
  'M16.5,5.9h120.2c32.3,0,49.9,18.8,49.9,46.9s-20.5,46.9-49.9,46.9H42.9v64.5h-26.4V5.9ZM42.9,37.5h85.6c15.2,0,24.6,6.2,24.6,15.2s-9.4,15.2-24.6,15.2H42.9v-30.5Z',
  'M209.4,5.9h152.5v30.5h-152.5V5.9ZM209.4,127.9h152.5v30.5h-152.5v-30.5Z',
  'M556.1,5.9h-105.6c-45.2,0-70.4,29.9-70.4,79.2s25.2,79.2,70.4,79.2h105.6v-75.1h-65.7v28.7h32.3v14.1h-70.4c-22.9,0-36.9-16.4-36.9-46.9s14.1-46.9,36.9-46.9h103.8V5.9Z',
];
/* La barre violette du E : couleur d'accompagnement, jamais une plaque. */
const PEG_BAR = { x: 216.7, y: 65.1, w: 137.8, h: 28.2, r: 2.1, fill: '#7c2bff' } as const;

/* Décalages des plaques AU REPOS, en unités du viewBox (566,9 de large ; mêmes
   décalages en pixels que sur l'ancien logo de 1130 u : ×0,5017).
   À 358px de logo, 1px ≈ 1,58u : cyan −4,4/−2,5px, magenta +3,8/+3,2,
   jaune +1,9/−4,1, noir (papier seulement) −1,3/+1,9. Directions volontairement
   non colinéaires : trois franges distinctes d'une épreuve mal calée, jamais
   un simple dédoublement horizontal. La barre violette n'est PAS une plaque :
   c'est une couleur d'accompagnement, toujours nette — c'est elle qui fixe l'œil. */
const PLATE_OFF = { c: [-7.02, -4.01], m: [6.02, 5.02], y: [3.01, -6.52], k: [-2.01, 3.01] } as const;
const PLATE_INK = { c: '#00a0e3', m: '#e6007e', y: '#ffe500', k: '#1b1d2e' } as const;
type PlateKey = keyof typeof PLATE_OFF;

/* Une plaque = un calque HTML qui porte un SVG monochrome. Son décalage est
   une TRANSLATION CSS en % de sa propre boîte (x en % de la largeur, y de la hauteur du viewBox) :
   le compositeur la déplace sans repeindre, et aucune mesure n'est nécessaire.
   (Un attribut `transform` SVG réécrit à chaque image forçait une repeinture.) */
const Plate = ({
  plate, r, blend,
}: {
  plate: PlateKey;
  r: MotionValue<number>;
  blend: 'screen' | 'multiply';
}) => {
  const x = useTransform(r, (v) => `${((PLATE_OFF[plate][0] * v * 100) / PEG_VB.w).toFixed(3)}%`);
  const y = useTransform(r, (v) => `${((PLATE_OFF[plate][1] * v * 100) / PEG_VB.h).toFixed(3)}%`);
  return (
    <motion.div className="pa-plate" style={{ x, y, mixBlendMode: blend }}>
      <svg viewBox={`0 0 ${PEG_VB.w} ${PEG_VB.h}`} aria-hidden>
        <g fill={PLATE_INK[plate]} fillRule="evenodd">
          {PEG_PATHS.map((d) => <path key={d.slice(0, 12)} d={d} />)}
        </g>
      </svg>
    </motion.div>
  );
};

/* Le logo en plaques, en deux exemplaires qui suivent le MÊME trajet :
   • `light` vit sur la vitrine (sous le papier) : C + M + J en `screen` —
     sur le noir, les encres s'additionnent en lumière et donnent un blanc
     chaud une fois calées ;
   • `ink` vit dans le corps du tiroir : C + M + J + N en `multiply` — sur le
     papier, elles se multiplient en noir quadri.
   `isolation:isolate` (dans .pa-plates) borne le mélange au groupe : les
   plaques se mélangent ENTRE ELLES, jamais avec le fond. */
const PlateWordmark = ({
  variant, r, x, y, scale, opacity, width,
}: {
  variant: 'light' | 'ink';
  r: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  opacity?: MotionValue<number>;
  width: number;
}) => {
  const plates: PlateKey[] = variant === 'ink' ? ['c', 'm', 'y', 'k'] : ['c', 'm', 'y'];
  const blend = variant === 'ink' ? 'multiply' : 'screen';
  return (
    <motion.div
      className={`pa-plates pa-plates--${variant}`}
      style={{ x, y, scale, opacity, width }}
      aria-hidden
    >
      {plates.map((k) => <Plate key={k} plate={k} r={r} blend={blend} />)}
      <div className="pa-plate">
        <svg viewBox={`0 0 ${PEG_VB.w} ${PEG_VB.h}`} aria-hidden>
          <rect x={PEG_BAR.x} y={PEG_BAR.y} width={PEG_BAR.w} height={PEG_BAR.h} rx={PEG_BAR.r} fill={PEG_BAR.fill} />
        </svg>
      </div>
    </motion.div>
  );
};

/* ── La poignée : une pastille de papier portant une croix de repérage ──
   Quatre tirages de la même croix, décalés par le MÊME r(p) que le logo : ils
   se calent ensemble. Le bras gauche de la croix porte une pointe de flèche —
   la croix seule ne disait ni « bouton » ni « vers la gauche ». */
const REG_OFF = { c: [-2.6, -1.6], m: [2.4, 1.9], y: [1.3, -2.6], k: [0, 0] } as const;
const REG_INK = { c: '#00a0e3', m: '#e6007e', y: '#ffd400', k: '#12142b' } as const;

const RegPlate = ({ plate, r }: { plate: PlateKey; r: MotionValue<number> }) => {
  const x = useTransform(r, (v) => REG_OFF[plate][0] * v);
  const y = useTransform(r, (v) => REG_OFF[plate][1] * v);
  return (
    <motion.g style={{ x, y, mixBlendMode: 'multiply' }} stroke={REG_INK[plate]}>
      <circle r="8.5" />
      <path d="M-15 0H15M0 -15V15M-10 -5L-15 0L-10 5" />
    </motion.g>
  );
};

const RegistrationMark = ({ r }: { r: MotionValue<number> }) => (
  <svg viewBox="-26 -26 52 52" aria-hidden>
    <circle r="26" fill="#fbf9f5" />
    <g fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {(['c', 'm', 'y', 'k'] as PlateKey[]).map((k) => <RegPlate key={k} plate={k} r={r} />)}
    </g>
  </svg>
);

/* Un bloc du tiroir : il ne se compose qu'APRÈS le passage du logo (p > 0,62),
   chacun sur sa propre fenêtre. À mi-geste le papier ne porte donc que
   l'impression du logo — c'est l'image du geste. */
const Reveal = ({
  index, p, still, className, children,
}: {
  index: number;
  p: MotionValue<number>;
  still: boolean;
  className?: string;
  children: React.ReactNode;
}) => {
  const t = useTransform(p, (v) => (still ? 1 : smooth(0.62 + index * 0.06, 0.94 + index * 0.02, v)));
  const x = useTransform(t, (v) => (1 - v) * 24);
  const y = useTransform(t, (v) => (1 - v) * 8);
  return (
    <motion.div className={className} style={{ opacity: t, x, y }}>
      {children}
    </motion.div>
  );
};

/* ── Qui saute la vitrine ? UNE seule raison ──────────────────────────────
   La vitrine EST la demande du propriétaire : elle se rejoue à chaque
   ouverture de la page, rechargement compris. Le seul cas où on l'escamote
   est celui où la montrer serait absurde : le navigateur porte DÉJÀ une
   session PEG (jeton persisté par `peg_auth`, lu sans toucher au store) —
   typiquement un utilisateur connecté qui retombe sur /sign-in.

   ⚠ Ce qui existait ici et qui a été RETIRÉ, volontairement :
   • un drapeau d'onglet posé DÈS LE MONTAGE (sessionStorage) — il survivait
     au rechargement, donc « j'ouvre la page, je recharge pour revoir
     l'animation » suffisait à la perdre définitivement ;
   • un drapeau durable (localStorage) posé au SUBMIT, même quand la connexion
     échouait — « vue une fois dans une vie ».
   Aucun des deux n'avait été demandé, et tous deux effaçaient précisément ce
   qu'on nous demandait de montrer. NE PAS LES RÉINTRODUIRE sans validation
   explicite du propriétaire.

   Les deux échappatoires d'URL restent : ?form=1 ouvre le tiroir d'emblée
   (client pressé, capture de vérification), ?vitrine=1 force la scène. */
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
 * @param useInert `false` pour le tiroir fermé : on veut qu'un gestionnaire de
 * mots de passe puisse toujours viser le champ e-mail (`focus()` programmatique
 * reste permis avec `tabindex="-1"`, il est bloqué par `inert`) — c'est ce
 * focus qui ouvre le tiroir tout seul.
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

/* ═══════════════════════════════════════════════════════════════════════════
   LE DIPTYQUE — téléphone uniquement
   ═══════════════════════════════════════════════════════════════════════════ */

/** Géométrie mesurée (offsetLeft/Top/Width, jamais getBoundingClientRect) :
    le fantôme du logo sur la vitrine (0), sa place d'arrivée dans le tiroir (1),
    le rail et sa poignée. */
type PaGeo = {
  x0: number; y0: number; w0: number;
  x1: number; y1: number; w1: number;
  railL: number; railW: number; knobL: number; knobW: number;
};

const PhoneAtelier = ({
  openSignUp, signUpOpen, year,
}: {
  openSignUp: (type: AccountType) => void;
  signUpOpen: boolean;
  year: number;
}) => {
  const reduced = useReducedMotion() === true;

  /* Départ : vitrine, sauf si le visiteur est connu ou si l'URL le demande.
     (?vitrine=1 force la scène, ?form=1 force le formulaire — utile aux
     captures de vérification.) */
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
  /* x : 0 = vitrine, -W = tiroir ouvert. TOUT le reste en est fonction —
     aucune minuterie — c'est pourquoi le tiroir se compose PENDANT le geste. */
  const x = useMotionValue(startOpen ? -W.current : 0);
  const [opened, setOpened] = useState(startOpen);
  const openRef = useRef(startOpen);
  const targetOpenRef = useRef(startOpen);
  const runningRef = useRef<{ stop: () => void } | null>(null);
  /** Le ressort est-il en train de courir ? (filet de sécurité d'`onPointerUp`) */
  const settlingRef = useRef(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLButtonElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<HTMLDivElement>(null);
  const signUpRef = useRef(signUpOpen);
  signUpRef.current = signUpOpen;

  /* Géométrie : rangée dans un ref ; `geoTick` est incrémenté à chaque mesure
     pour que les transformations qui en dépendent se recalculent (un
     `x.set(x.get())` ne notifie pas : la valeur n'a pas changé). */
  const geo = useRef<PaGeo>({ x0: 0, y0: 0, w0: 0, x1: 0, y1: 0, w1: 0, railL: 0, railW: 0, knobL: 0, knobW: 0 });
  const geoTick = useMotionValue(0);
  const [logoW, setLogoW] = useState(0);

  /* « entrée » : 0 → 1 une seule fois au chargement — les plaques arrivent de
     3,2 fois leur décalage de repos et se calent. Sautée pour le client qui
     revient (tiroir déjà posé) et en mouvement réduit. */
  const entry = useMotionValue(reduced || startOpen ? 1 : 0);

  /* ── Progression du geste, 0 → 1 ── */
  const p = useTransform(x, (v) => clamp(-v / W.current, 0, 1));
  const k = reduced ? 0 : 1;

  /* ── LE REPÉRAGE ─────────────────────────────────────────────────────────
     r = part du décalage de repos encore appliquée aux plaques.
     Le décalage tient jusqu'à p ≈ 0,3 puis se résorbe pendant que le bord du
     papier balaie le logo (≈ 77 % à mi-geste, 0 à l'ouverture) : le moment du
     calage se LIT, au lieu d'être déjà acquis quand le papier arrive.
     En mouvement réduit les plaques sont calées d'emblée : un logo décalé
     immobile se lirait comme un défaut d'affichage. */
  const r = useTransform([p, entry] as MotionValue<number>[], ([v, e]: number[]) =>
    reduced ? 0 : (1 - smooth(0.3, 0.94, v)) * lerp(3.2, 1, e),
  );
  const plateO = useTransform(entry, (e) => smooth(0, 0.55, e));

  /* ── TRAJET DU LOGO (identique pour les deux exemplaires) ──
     Le logo monte tôt (position sur [0,04 ; 0,86]) et garde sa taille plus
     longtemps (échelle sur [0,20 ; 1]) : à mi-geste il mesure encore ~280px
     et le bord du papier coupe le G. transform-origin 0 0. */
  const logoX = useTransform([p, geoTick] as MotionValue<number>[], ([v]: number[]) =>
    lerp(geo.current.x0, geo.current.x1, smooth(0.04, 0.86, v)),
  );
  const logoY = useTransform([p, geoTick] as MotionValue<number>[], ([v]: number[]) =>
    lerp(geo.current.y0, geo.current.y1, smooth(0.04, 0.86, v)),
  );
  const logoS = useTransform([p, geoTick] as MotionValue<number>[], ([v]: number[]) => {
    const g = geo.current;
    return g.w0 > 0 ? lerp(1, g.w1 / g.w0, smooth(0.2, 1, v)) : 1;
  });
  /* L'exemplaire ENCRE vit dans le corps du tiroir, dont l'origine est à
     l'écran en W + x : il est contre-translaté d'autant, donc il tombe au
     pixel sur l'exemplaire lumière et c'est le débord du papier qui le découpe
     exactement sur son bord. Aucun clip-path. Au-delà de l'ouverture
     (élastique), il suit le papier : il est imprimé dessus. */
  const inkX = useTransform([x, geoTick] as MotionValue<number>[], ([xv]: number[]) => {
    const v = clamp(-xv / W.current, 0, 1);
    return lerp(geo.current.x0, geo.current.x1, smooth(0.04, 0.86, v)) - (W.current + Math.max(xv, -W.current));
  });

  /* ── La vitrine recule : surtitre et accroche à 0,22 de la vitesse ── */
  const speechX = useTransform(x, (v) => v * 0.22 * k);
  const speechO = useTransform(p, (v) => (reduced ? (v > 0.5 ? 0 : 1) : 1 - smooth(0.04, 0.46, v)));
  const labelO = useTransform(p, (v) => 1 - smooth(0, 0.28, v));
  const veilO = useTransform(p, (v) => 0.55 * v);

  /* ── Ombre du bord du papier : UNE couche pré-rendue dont seule l'opacité
     varie (un box-shadow recalculé à chaque image faisait saccader le geste).
     Elle vit HORS du tiroir (`.pa-shadewrap`, translaté du même x) : posée
     dedans en `right:100%`, l'overflow du tiroir la découpait entièrement.
     Le logo lumière est peint AU-DESSUS d'elle : l'ombre creuse la vitrine
     sans délaver en gris les lettres blanches près du bord. */
  const shadeO = useTransform(p, (v) => (1 - 0.5 * v) * smooth(0, 0.05, v));

  /* ── La poignée est TIRÉE par le bord du papier : 6px devant lui dès
     p ≈ 0,055, et elle bute à gauche du rail vers p ≈ 0,8. */
  const knobX = useTransform([p, geoTick] as MotionValue<number>[], ([v]: number[]) => {
    const g = geo.current;
    if (!g.railW) return 0;
    const inset = g.knobL > 0 ? g.railW - g.knobL - g.knobW : 9;
    const restL = g.railL + g.knobL;
    return Math.max(g.railL + inset, Math.min(restL, W.current * (1 - v) - 6 - g.knobW)) - restL;
  });

  /* ── Aimantation ───────────────────────────────────────────────────────
     Ressort ζ = 0,975 : il POSE le tiroir sans rebond visible (~520 ms).
     Le tap et le lancer jouent la MÊME courbe — au clic on injecte la vitesse
     d'un glissement décidé (∓1050 px/s) — donc l'habitué apprend le geste en
     regardant son propre clic. */
  const SPRING = { type: 'spring' as const, stiffness: 380, damping: 38, mass: 1 };

  const settle = useCallback(() => {
    settlingRef.current = false;
    const isOpen = x.get() <= -W.current + 1;
    openRef.current = isOpen;
    setOpened(isOpen);
    if (!isOpen && bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [x]);

  const glideTo = useCallback(
    (target: number, velocity: number) => {
      runningRef.current?.stop();
      targetOpenRef.current = target !== 0;
      if (reduced) {
        x.set(target);
        settle();
        return;
      }
      settlingRef.current = true;
      runningRef.current = animate(x, target, { ...SPRING, velocity, onComplete: settle });
    },
    [reduced, settle, x],
  );

  /* Le focus est posé APRÈS l'aimantation, jamais sur une minuterie : tant que
     le panneau d'arrivée n'a pas récupéré ses cibles de tabulation (inert /
     tabindex retirés à la fin du ressort), un focus() serait purement et
     simplement ignoré et l'utilisateur clavier se retrouverait sur <body>. */
  const focusWish = useRef<'email' | 'rail' | null>(null);

  const openDrawer = useCallback(
    (focusField: boolean) => {
      if (targetOpenRef.current && openRef.current) return;
      if (focusField) focusWish.current = 'email';
      glideTo(-W.current, -1050);
    },
    [glideTo],
  );

  const closeDrawer = useCallback(
    (focusRail: boolean) => {
      if (focusRail) focusWish.current = 'rail';
      glideTo(0, 1050);
    },
    [glideTo],
  );

  /* ── LE GESTE ──────────────────────────────────────────────────────────── */
  const drag = useRef({ active: false, startX: 0, startY: 0, base: 0, axis: '' as '' | 'x' | 'y', vel: 0, lastX: 0, lastT: 0, moved: false });

  /* ⚠ On ne touche PAS au ressort ici. Le faire à l'appui figeait le tiroir à
     mi-course au moindre tapotement impatient pendant l'aimantation : le
     ressort était arrêté, `onPointerUp` sortait avant tout `glideTo` faute de
     déplacement, et plus rien ne le relançait — écran coupé en deux,
     formulaire à demi composé, défilement verrouillé (`.pa-opened` jamais
     posé). Le ressort n'est interrompu qu'une fois l'axe horizontal décidé,
     dans `onPointerMove` : un appui simple cesse d'interférer avec
     l'aimantation, ce qui est le comportement attendu. */
  const onPointerDown = (e: React.PointerEvent) => {
    if (signUpRef.current) return; // la modale d'inscription est au-dessus
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isTypingTarget(e.target)) return;
    const d = drag.current;
    d.active = true; d.moved = false; d.axis = '';
    d.startX = e.clientX; d.startY = e.clientY; d.base = x.get();
    d.lastX = e.clientX; d.lastT = performance.now(); d.vel = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.axis === '') {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      // Verrouillage d'axe : au-delà de 5px, si le geste est franchement
      // horizontal on le prend ; sinon on le rend au défilement vertical.
      d.axis = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y';
      if (d.axis === 'y') { d.active = false; return; }
      /* C'est ICI, et seulement ici, que le doigt reprend la main sur le
         ressort. On re-cale la base sur la position COURANTE de x (le ressort
         a pu courir entre l'appui et la décision d'axe) : `d.base + dx` reste
         alors continu, sans saut à la prise en main. */
      runningRef.current?.stop();
      settlingRef.current = false;
      focusWish.current = null; // plus de focus différé : le geste décide
      d.base = x.get() - dx;
      /* La capture n'est prise QU'ICI, une fois l'axe horizontal décidé.
         La prendre dès le pointerdown retargetait aussi les événements souris
         de compatibilité : le `click` partait vers la surface de geste et le
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
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (!d.moved) {
      /* Simple appui : c'est le bouton qui décide. Filet de sécurité — si le
         tiroir se retrouvait malgré tout arrêté à mi-course sans ressort en
         cours, on le repose sur sa cible plutôt que de laisser l'écran coupé
         en deux. */
      const cur = x.get();
      if (!settlingRef.current && cur < -0.5 && cur > -W.current + 0.5) {
        glideTo(targetOpenRef.current ? -W.current : 0, 0);
      }
      return;
    }
    const prog = clamp(-x.get() / W.current, 0, 1);
    let target: number;
    if (d.vel < -520) target = -W.current;        // lancé vers la gauche → ouvre
    else if (d.vel > 520) target = 0;             // lancé vers la droite → referme
    else target = prog > 0.35 ? -W.current : 0;   // sinon, seuil de course
    glideTo(target, d.vel);                        // le ressort repart à la vitesse du doigt
  };

  /* ── Mesure + recalage à la rotation / au clavier virtuel iOS ──
     On recale x sur la position d'équilibre, et on relit la géométrie du
     logo et du rail par offsetLeft/offsetTop/offsetWidth. Aucune hauteur
     figée, aucun getBoundingClientRect.
     En layout effect : la première mesure tombe AVANT la première peinture,
     le logo n'apparaît jamais en haut à gauche le temps d'une image. */
  useLayoutEffect(() => {
    /* Position d'un élément DANS un ancêtre donné, en remontant la chaîne des
       offsetParent. ⚠ Ne pas lire offsetLeft seul : pendant l'entrée, un
       enveloppant animé porte un transform et Chromium en fait l'offsetParent
       (le rail se mesurait alors à 0 au lieu de 22px, et la poignée passait
       SOUS le papier au lieu de rester 6px devant lui). */
    const offsetIn = (el: HTMLElement, root: HTMLElement | null) => {
      let left = 0;
      let top = 0;
      let node: HTMLElement | null = el;
      while (node && node !== root) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return { left, top };
    };
    const measure = () => {
      const g = geo.current;
      const gh = ghostRef.current;
      const ld = landRef.current;
      const rl = railRef.current;
      const kn = knobRef.current;
      /* repères : la vitrine (plein écran, non transformée) et le corps du tiroir */
      const stage = stageRef.current;
      const body = bodyRef.current;
      if (gh) { const o = offsetIn(gh, stage); g.x0 = o.left; g.y0 = o.top; g.w0 = gh.offsetWidth; }
      if (ld) { const o = offsetIn(ld, body); g.x1 = o.left; g.y1 = o.top; g.w1 = ld.offsetWidth; }
      if (rl) { g.railL = offsetIn(rl, stage).left; g.railW = rl.offsetWidth; }
      if (kn) { g.knobL = offsetIn(kn, rl).left; g.knobW = kn.offsetWidth; }
      setLogoW(g.w0);
      geoTick.set(geoTick.get() + 1);
    };
    measure();
    const onResize = () => {
      W.current = window.innerWidth;
      measure();
      x.set(openRef.current ? -W.current : 0);
    };
    window.addEventListener('resize', onResize);
    /* Le bloc logo + accroche est calé en BAS : la hauteur de l'accroche (donc
       l'arrivée de la police) déplace le fantôme. On remesure quand ce bloc,
       le rail ou le corps du tiroir changent de taille, et une fois les
       polices prêtes. */
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      [focusRef.current, railRef.current, bodyRef.current].forEach((el) => { if (el) ro?.observe(el); });
    }
    let alive = true;
    document.fonts?.ready?.then(() => { if (alive) measure(); }).catch(() => {});
    return () => {
      alive = false;
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [x, geoTick]);

  /* ── Entrée des plaques : une seule fois, 1 100 ms, easeOutCubic, 180 ms ── */
  useEffect(() => {
    if (entry.get() >= 1) return undefined;
    const ctl = animate(entry, 1, { duration: 1.1, delay: 0.18, ease: [0.33, 1, 0.68, 1] });
    return () => ctl.stop();
  }, [entry]);

  /* ── L'invitation au repos (la poignée qui fait signe) s'arrête dès que le
     papier bouge. Classe posée à la main : c'est de l'habillage, pas un état. */
  useEffect(() => p.on('change', (v) => {
    rootRef.current?.classList.toggle('pa-moving', v > 0.002);
  }), [p]);

  /* ── Graisse 800 d'Inter : l'impact vient de l'échelle et de la graisse.
     Chargée d'ici SEULEMENT (jamais dans app.css : le bureau demande 800 et
     changerait de rendu), et retirée au démontage. */
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

  /* ── Clavier ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (signUpRef.current) return;
      // Flèche droite pendant la saisie de l'e-mail refermait le tiroir ET
      // arrachait le focus : on ignore l'événement dans un champ de saisie.
      if (isTypingTarget(document.activeElement)) return;
      if (e.key === 'Escape' && openRef.current) closeDrawer(true);
      else if (e.key === 'ArrowLeft' && !openRef.current) openDrawer(true);
      else if (e.key === 'ArrowRight' && openRef.current) closeDrawer(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeDrawer, openDrawer]);

  /* ── inert / aria-hidden : posés À LA FIN de l'aimantation seulement ──
     et c'est seulement une fois le panneau d'arrivée redevenu focalisable
     qu'on y pose le focus. */
  useEffect(() => {
    setPanelHidden(stageRef.current, opened, true);
    setPanelHidden(drawerRef.current, !opened, false);
    const wish = focusWish.current;
    focusWish.current = null;
    if (wish === 'email' && opened) document.getElementById('signin-email')?.focus({ preventScroll: true });
    else if (wish === 'rail' && !opened) railRef.current?.focus({ preventScroll: true });
  }, [opened]);

  /* Un gestionnaire de mots de passe (ou une tabulation) qui vise le champ
     e-mail alors que le tiroir est fermé l'ouvre : c'est le cas d'usage le
     plus fréquent chez un client qui revient. */
  const onDrawerFocus = () => {
    if (!targetOpenRef.current) openDrawer(false);
  };

  return (
    <div ref={rootRef} className={`pa-root${reduced || startOpen ? '' : ' pa-anim'}${opened ? ' pa-opened' : ''}`}>
      <style>{PHONE_CSS}</style>

      {/* ═════════ PANNEAU 1 — LA VITRINE ═════════
          Quatre choses, pas une de plus : le surtitre, le logo (peint par la
          couche partagée plus bas), l'accroche, le rail. */}
      <section className="pa-stage" ref={stageRef} aria-label="Découvrir PEG">
        <motion.span className="pa-veil" style={{ opacity: veilO }} />

        <div
          className="pa-wrap"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* L'entrée CSS est portée par un enveloppant : framer-motion garde
              seul la main sur le transform de l'élément lui-même. */}
          <div className="pa-in pa-in--kicker">
            <motion.p className="pa-kicker" style={{ x: speechX, opacity: speechO }}>
              Plateforme professionnelle
            </motion.p>
          </div>

          <div className="pa-focus" ref={focusRef}>
            {/* Fantôme : il réserve la boîte du logo, que peint la couche
                partagée (PlateWordmark « light »). C'est lui qu'on mesure. */}
            <div className="pa-logo-ghost" ref={ghostRef} aria-hidden />
            <div className="pa-in pa-in--mark">
              <motion.h1 className="pa-mark" style={{ x: speechX, opacity: speechO }}>
                Votre image, sur <em>tous vos supports</em>
              </motion.h1>
            </div>
          </div>

          {/* Le rail : le chemin explicite, pleine largeur, dans la zone du
              pouce. La pastille de papier est la poignée du geste. */}
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
                  <RegistrationMark r={r} />
                </span>
              </motion.span>
            </button>
          </div>
        </div>
      </section>

      {/* ═════════ L'OMBRE PORTÉE DU BORD DU PAPIER ═════════
          Frère du tiroir, translaté du MÊME x : son bord droit tombe donc
          exactement sur le bord du papier, et rien ne la découpe. */}
      <motion.div className="pa-shadewrap" style={{ x }} aria-hidden>
        <motion.span className="pa-shade" style={{ opacity: shadeO }} />
      </motion.div>

      {/* ═════════ LE LOGO, EXEMPLAIRE LUMIÈRE ═════════
          Entre l'ombre et le tiroir : le papier le recouvre à droite de son
          bord, l'ombre ne le délave pas. */}
      <PlateWordmark variant="light" r={r} x={logoX} y={logoY} scale={logoS} opacity={plateO} width={logoW} />

      {/* ═════════ PANNEAU 2 — LE TIROIR DE PAPIER ═════════
          Il est posé à left:100% et translaté de x : il suit le doigt au 1:1
          sans qu'on ait à connaître la largeur de l'écran. */}
      <motion.section
        className="pa-drawer"
        ref={drawerRef}
        style={{ x }}
        aria-label="Connexion"
        onFocus={onDrawerFocus}
      >
        <div
          className="pa-grip"
          aria-hidden
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        <div className="pa-body" ref={bodyRef}>
          {/* Exemplaire ENCRE du logo : élément réel du corps du tiroir, il
              défile avec le formulaire une fois le tiroir posé. */}
          <PlateWordmark variant="ink" r={r} x={inkX} y={logoY} scale={logoS} width={logoW} />

          <Reveal index={0} p={p} still={reduced}>
            <div className="pa-dhead">
              <button type="button" className="pa-back" onClick={() => closeDrawer(true)}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M12 4l-5 6 5 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Retour
              </button>
            </div>
          </Reveal>

          {/* La place où le logo encre vient se poser, net et noir. */}
          <div className="pa-land" ref={landRef} role="img" aria-label={APP_NAME} />

          <Reveal index={1} p={p} still={reduced} className="pa-formwrap">
            <SignInForm disableSubmit={false} />
          </Reveal>

          <Reveal index={2} p={p} still={reduced}>
            <div className="pa-sep">
              <span /><span className="pa-sep__t">Pas encore de compte ?</span><span />
            </div>
            {/* Lignes filetées à réglette de couleur, plutôt que deux cartes
                flottantes. */}
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
            {/* Les gages fondus en une seule ligne pointée. */}
            <p className="pa-foot">
              Connexion sécurisée<i />Hébergé en France<i />© {year} {APP_NAME}
            </p>
          </Reveal>
        </div>
      </motion.section>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   FEUILLE DU DIPTYQUE
   ⚠ PIÈGE : les animations d'entrée sont en fill-mode BACKWARDS, jamais
   `both`, et portées par des ENVELOPPANTS (.pa-in) : l'élément animé par
   framer-motion garde seul la main sur son transform. En `both`, l'état final
   de l'animation écraserait en permanence les transformations inline.
   ═══════════════════════════════════════════════════════════════════════════ */
const PHONE_CSS = `
.pa-root{
  --pa-safe-top: env(safe-area-inset-top, 0px);
  --pa-safe-bottom: env(safe-area-inset-bottom, 0px);
  --pa-pad: 22px;
  /* Décalage vertical de la colonne : 0 sur téléphone, recentre la colonne
     sur une tablette en portrait. */
  --pa-vpad: 0px;
  --pa-rail-h: 72px;
  --pa-knob: 52px;
  --pa-knob-in: 9px;
  --pa-papier: #fbf9f5;
  position: fixed; inset: 0; height: 100dvh;
  overflow: hidden; isolation: isolate;
  background: #06080f; color: #fff;
  font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}
.pa-root *{ -webkit-tap-highlight-color: transparent; }
/* un <button> n'hérite pas de la police : sans ceci, rail, « Retour » et les
   deux lignes de compte repartiraient dans la police du navigateur */
.pa-root button{ font-family:inherit; font-size:inherit; color:inherit; }

/* ── PANNEAU 1 : un noir franc, rien d'autre (ni halo, ni trame, ni grain) ── */
.pa-stage{ position:absolute; inset:0; overflow:hidden; background:#070c1a; }
.pa-veil{ position:absolute; inset:0; background:#02040a; opacity:0; pointer-events:none; display:block; }

.pa-wrap{ position:absolute; inset:0; display:flex; flex-direction:column;
  padding: calc(var(--pa-safe-top) + 26px + var(--pa-vpad)) var(--pa-pad)
           calc(var(--pa-safe-bottom) + 22px + var(--pa-vpad));
  touch-action:none; -webkit-user-select:none; user-select:none; }

/* surtitre : 11px en capitales, blanc 64 % sur #070c1a ≈ 7,9:1 */
.pa-kicker{ margin:0; font-size:11px; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  line-height:1.3; color:rgba(255,255,255,.64); will-change:transform, opacity; }

/* Le bloc logo + accroche est calé en BAS, posé sur le rail comme une affiche,
   et non centré : le vide est au-dessus, assumé, et la masse tombe dans la
   zone du pouce. */
.pa-focus{ margin-top:auto; padding:2vh 0 clamp(24px, 6.5dvh, 64px); flex:none; }
.pa-logo-ghost{ width:min(100%, 440px); aspect-ratio:566.9/170.1; }
.pa-mark{ margin:clamp(20px, 3.8dvh, 34px) 0 0; font-size:clamp(28px, 8.4vw, 36px); line-height:1.06;
  font-weight:800; letter-spacing:-.038em; color:rgba(255,255,255,.58); max-width:13ch;
  will-change:transform, opacity; }
.pa-mark em{ font-style:normal; color:#fff; white-space:nowrap; }

/* ── Le logo en plaques ── */
.pa-plates{ position:absolute; left:0; top:0; aspect-ratio:566.9/170.1; transform-origin:0 0;
  isolation:isolate; pointer-events:none; will-change:transform; }
.pa-plate{ position:absolute; inset:0; will-change:transform; }
.pa-plate svg{ width:100%; height:100%; display:block; overflow:visible; }

/* ── Le rail : chemin explicite, dans la zone du pouce ── */
.pa-railwrap{ margin-top:12px; flex:none; }
.pa-rail{ position:relative; display:flex; align-items:center; width:100%; height:var(--pa-rail-h);
  padding:0 calc(var(--pa-knob) + var(--pa-knob-in) + 14px) 0 26px;
  border-radius:calc(var(--pa-rail-h) / 2); cursor:pointer; text-align:left;
  background:rgba(255,255,255,.055); border:1px solid rgba(255,255,255,.15); color:#fff; }
.pa-rail__labels{ display:flex; flex-direction:column; min-width:0; will-change:opacity; }
.pa-rail__kicker{ display:block; font-size:17px; font-weight:800; letter-spacing:-.015em; line-height:1.2; }
/* sous-libellé : blanc 66 % ≈ 8:1 sur le rail */
.pa-rail__sub{ display:block; margin-top:3px; font-size:13px; font-weight:500; line-height:1.3;
  color:rgba(255,255,255,.66); white-space:nowrap; }
.pa-knob{ position:absolute; right:var(--pa-knob-in); top:50%; width:var(--pa-knob); height:var(--pa-knob);
  margin-top:calc(var(--pa-knob) / -2); display:block; will-change:transform; }
.pa-knob__in{ display:block; width:100%; height:100%; border-radius:50%;
  box-shadow:0 6px 18px rgba(0,0,0,.38); }
.pa-knob svg{ width:100%; height:100%; display:block; isolation:isolate; }

/* ── L'ombre portée du bord du papier : une seule couche, 72px à .30 ── */
.pa-shadewrap{ position:absolute; top:0; bottom:0; left:0; width:100%;
  pointer-events:none; will-change:transform; }
.pa-shade{ position:absolute; top:0; bottom:0; right:0; width:72px; display:block; pointer-events:none;
  opacity:0; background:linear-gradient(to left, rgba(0,0,0,.30), rgba(0,0,0,0)); }

/* ── PANNEAU 2 — le tiroir de papier ── */
.pa-drawer{ position:absolute; top:0; left:100%; width:100%; height:100%;
  display:flex; overflow:hidden; will-change:transform; color:#0f172a;
  background:var(--pa-papier); box-shadow:inset 1px 0 0 #fff; }
.pa-grip{ position:absolute; left:0; top:0; bottom:0; width:26px; z-index:5; touch-action:none; }

.pa-body{ position:relative; flex:1; min-width:0;
  overflow-x:hidden; overflow-y:hidden; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
  padding: calc(var(--pa-safe-top) + 12px + var(--pa-vpad)) var(--pa-pad) calc(var(--pa-safe-bottom) + 28px); }
/* le défilement n'est rendu qu'une fois le tiroir posé : pendant le geste,
   le logo encre doit rester calé sur l'exemplaire lumière */
.pa-opened .pa-body{ overflow-y:auto; }
.pa-dhead{ height:44px; display:flex; align-items:center; }
.pa-back{ display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 12px 0 8px;
  margin-left:-8px; border-radius:12px; border:none; background:none; cursor:pointer;
  color:#555d70; font-size:14px; font-weight:600; }
/* la place d'arrivée du logo encre */
.pa-land{ width:132px; aspect-ratio:566.9/170.1; margin:14px 0 30px; }

.pa-formwrap input:not([type='checkbox']):not([type='radio']){ font-size:16px !important; }
.pa-sep{ display:flex; align-items:center; gap:12px; margin:30px 0 4px; }
.pa-sep > span:not(.pa-sep__t){ flex:1; height:1px; background:#e4dfd4; }
.pa-sep__t{ color:#6f7789; font-size:10.5px; font-weight:800; letter-spacing:.1em;
  text-transform:uppercase; white-space:nowrap; }
.pa-acct{ display:flex; align-items:center; gap:13px; width:100%; min-height:60px; text-align:left;
  background:none; border:0; border-bottom:1px solid #e4dfd4; padding:14px 2px; cursor:pointer; }
.pa-acct__key{ width:3px; align-self:stretch; border-radius:2px; flex:none; }
.pa-acct > svg{ flex:none; }
.pa-acct__txt{ flex:1; min-width:0; }
.pa-acct b{ display:block; font-size:14px; font-weight:700; color:#12142b; letter-spacing:-.01em; }
.pa-acct em{ display:block; font-style:normal; font-size:12px; line-height:1.45; color:#5b6273; margin-top:3px; }
/* Le parcours Générateur est le moins connu : sa réglette se signale, sans
   agiter toute la ligne. */
.pa-acct--gen .pa-acct__key{ animation:paKey 2.1s ease-in-out infinite; }
@keyframes paKey{ 0%,100%{ opacity:.55 } 50%{ opacity:1 } }
.pa-foot{ margin:22px 0 0; display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px;
  font-size:11.5px; color:#5b6273; }
.pa-foot i{ display:block; width:3px; height:3px; border-radius:50%; background:#b6b1a4; }

/* ── Focus visible ── */
.pa-rail:focus-visible{ outline:2px solid #a99bff; outline-offset:4px; }
.pa-back:focus-visible, .pa-acct:focus-visible{ outline:2px solid #6d5dfc; outline-offset:3px; }

/* ── ENTRÉE (fill-mode BACKWARDS, voir l'avertissement plus haut) ── */
@keyframes paRise{ from{ opacity:0; transform:translate3d(0,14px,0) } to{ opacity:1; transform:none } }
.pa-anim .pa-in--kicker{ animation:paRise 700ms cubic-bezier(.16,1,.3,1) backwards 120ms; }
.pa-anim .pa-in--mark{ animation:paRise 760ms cubic-bezier(.16,1,.3,1) backwards 520ms; }
.pa-anim .pa-in--rail{ animation:paRise 760ms cubic-bezier(.16,1,.3,1) backwards 700ms; }
/* L'invitation au repos : la poignée fait signe vers la gauche. Sur un
   élément INTERNE, pour ne pas écraser le x de framer-motion ; coupée dès que
   le papier bouge (.pa-moving) et tiroir ouvert. */
@keyframes paNudge{ 0%,78%,100%{ transform:translateX(0) } 86%{ transform:translateX(-7px) } 93%{ transform:translateX(0) } }
.pa-knob__in{ animation:paNudge 3.6s cubic-bezier(.65,.02,.28,1) infinite 2.2s; }
.pa-moving .pa-knob__in, .pa-opened .pa-knob__in{ animation:none; }

/* ── ÉCRANS COURTS (iPhone SE, barre d'URL déployée) ── */
@media (max-height: 700px){
  .pa-root{ --pa-rail-h: 64px; --pa-knob: 46px; }
  .pa-wrap{ padding-top: calc(var(--pa-safe-top) + 20px + var(--pa-vpad));
    padding-bottom: calc(var(--pa-safe-bottom) + 16px + var(--pa-vpad)); }
  .pa-land{ margin:8px 0 20px; }
}

/* ── TÉLÉPHONES ÉTROITS (≤ 360px) : le sous-libellé du rail tient sur une ligne ── */
@media (max-width: 360px){
  .pa-root{ --pa-pad: 16px; }
  .pa-rail{ padding-left:20px; padding-right:calc(var(--pa-knob) + var(--pa-knob-in) + 10px); }
  .pa-rail__kicker{ font-size:16px; }
  .pa-rail__sub{ font-size:11.5px; }
}

/* ── TABLETTE EN PORTRAIT (≥ 560px sous le seuil des 920px) ──
   Une colonne de 460px recentrée, horizontalement et verticalement. Le logo
   est borné à 440px par son fantôme. */
@media (min-width: 560px){
  .pa-root{
    --pa-pad: max(22px, calc((100vw - 460px) / 2));
    --pa-vpad: clamp(0px, calc((100dvh - 860px) / 2), 180px);
  }
}

/* ── TÉLÉPHONE EN PAYSAGE (≥ 560px de large, ≤ 480px de haut) ──
   Le logo se borne à la hauteur, l'accroche et le rail se resserrent. */
@media (min-width: 560px) and (max-height: 480px){
  .pa-root{ --pa-rail-h: 56px; --pa-knob: 42px; --pa-knob-in: 7px; }
  .pa-wrap{ padding-top: calc(var(--pa-safe-top) + 12px); padding-bottom: calc(var(--pa-safe-bottom) + 12px); }
  .pa-logo-ghost{ width:min(100%, 440px, 70dvh); }
  .pa-focus{ padding:0 0 14px; }
  .pa-mark{ margin-top:12px; font-size:clamp(20px, 6dvh, 26px); max-width:none; }
  .pa-rail__kicker{ font-size:15px; }
  .pa-rail__sub{ font-size:12px; margin-top:1px; }
  .pa-dhead{ height:36px; }
  .pa-land{ margin:6px 0 16px; }
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
          <Logo mode="dark" logoWidth="auto" imgStyle={{ maxWidth: '128px', display: 'block' }} />

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
