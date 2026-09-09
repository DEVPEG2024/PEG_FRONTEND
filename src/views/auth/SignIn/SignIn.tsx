import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
   • EN DESSOUS : `PhoneAtelier`, le diptyque « L'Atelier ». La vitrine PEG,
     puis on tire l'écran vers la gauche comme un tiroir d'établi pour amener
     le formulaire.

   Le choix se fait en JS (matchMedia) et non en CSS : au-dessus du seuil le
   DOM est LITTÉRALEMENT celui d'avant, aucune règle mobile n'existe pour le
   contrarier. C'est la garantie la plus forte que le bureau est intact.

   Le discours (pastille, accroche, sous-titre, les six catégories, les trois
   gages, les deux cartes de compte) est repris MOT POUR MOT : il est verrouillé
   par les tests de terminologie. Seuls les libellés de l'interaction elle-même
   sont neufs.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Outils de courbe ────────────────────────────────────────────────────── */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
/** smoothstep sur une fenêtre [e0, e1] : démarrage et arrivée en douceur. */
const smooth = (e0: number, e1: number, v: number) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const smoothstep = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};
const withAlpha = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
};

/* ═══════════ LES SIX ENCRES ═══════════
   Une encre par famille. Elles servent DEUX fois : l'accent de l'échantillon
   de matière, et un segment de la jauge de tête. Six teintes réellement
   distinctes (violet / ambre / bleu / magenta / sarcelle / brique) — deux
   segments d'un même violet, comme dans le prototype d'origine, ne se lisent
   pas comme deux encres. L'ambre est celle de la haute visibilité. */
const INK = {
  violet: '#6d5dfc',
  ambre: '#f0a531',
  bleu: '#2f6fed',
  magenta: '#e0338c',
  sarcelle: '#0ea5a3',
  brique: '#db6b67',
} as const;

/* ── Échantillons de matière ──────────────────────────────────────────────
   Les six catégories ne sont pas des emoji mais des bandeaux de matière :
   on doit reconnaître le produit en un dixième de seconde. Les identifiants
   de <pattern> sont uniques car chaque échantillon n'est rendu qu'une fois
   (les deux arbres, bureau et téléphone, ne coexistent jamais). */

const SampleTextile = () => (
  <svg className="pa-band" viewBox="0 0 170 42" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <defs>
      {/* sergé : côtes en diagonale, l'armure réelle d'un textile */}
      <pattern id="pa-twill" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill="#151b2e" />
        <rect width="7" height="3" fill="#212a45" />
        <rect y="2.6" width="7" height=".8" fill="rgba(255,255,255,.055)" />
      </pattern>
    </defs>
    <rect width="170" height="42" fill="url(#pa-twill)" />
    <path
      d="M18 30 C46 8, 78 36, 106 16 S150 22, 158 12"
      fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="5" strokeLinecap="round"
      strokeDasharray="5 4.5" transform="translate(0,1.6)" opacity=".5"
    />
    {/* la couture, dans l'encre de la famille */}
    <path
      d="M18 30 C46 8, 78 36, 106 16 S150 22, 158 12"
      fill="none" stroke="#8b7dff" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="5 4.5"
    />
  </svg>
);

const SampleHiVis = () => (
  <svg className="pa-band" viewBox="0 0 170 42" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <defs>
      <linearGradient id="pa-refl" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7d8798" /><stop offset=".42" stopColor="#eef2f8" />
        <stop offset=".58" stopColor="#d3dae3" /><stop offset="1" stopColor="#6f7a89" />
      </linearGradient>
      <linearGradient id="pa-fluo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#b4c322" /><stop offset="1" stopColor="#8d9a1a" />
      </linearGradient>
    </defs>
    {/* Fond sombre comme ses voisines : le fluo est RENTRÉ dans une bande
        rétroréfléchissante étroite (12 des 42px) et sa valeur descendue, au
        lieu de l'aplat lime pleine largeur qui aspirait tout le regard de la
        grille — le jaune de sécurité reste la vérité du produit, il ne fait
        simplement plus de l'ombre à ses cinq voisines. */}
    <rect width="170" height="42" fill="#151b2e" />
    <rect y="15" width="170" height="12" fill="url(#pa-fluo)" />
    <rect y="15" width="170" height="12" fill="#0b0f1c" opacity=".1" />
    <g transform="skewX(-16)">
      <rect x="30" y="13" width="11" height="16" fill="url(#pa-refl)" />
      <rect x="45" y="13" width="4" height="16" fill="url(#pa-refl)" opacity=".7" />
      <rect x="116" y="13" width="11" height="16" fill="url(#pa-refl)" />
      <rect x="131" y="13" width="4" height="16" fill="url(#pa-refl)" opacity=".7" />
    </g>
    <rect y="14" width="170" height="1" fill="rgba(0,0,0,.4)" />
    <rect y="27" width="170" height="1" fill="rgba(0,0,0,.4)" />
  </svg>
);

const SampleCaps = () => (
  <svg className="pa-band" viewBox="0 0 170 42" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <defs>
      <pattern id="pa-knit" width="12" height="11" patternUnits="userSpaceOnUse">
        <rect width="12" height="11" fill="#141a2c" />
        <path d="M0 11 L6 3.5 L12 11" fill="none" stroke="#2e3859" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M0 5.5 L6 -2 L12 5.5" fill="none" stroke="#242c47" strokeWidth="1.5" strokeLinecap="round" />
      </pattern>
    </defs>
    <rect width="170" height="42" fill="url(#pa-knit)" />
    {/* Une CASQUETTE de profil : calotte + visière qui dépasse + bouton.
        (La trame chevron seule, dans le prototype, ne se lisait pas.) */}
    <g>
      <path d="M22 33 A 24 21 0 0 1 70 33 Z" fill="#dbe2ee" />
      <path d="M22 33 A 24 21 0 0 1 70 33 Z" fill="#0b0f1c" opacity=".08" />
      <path d="M68 32.4 C 84 32 96 34.4 100 37 C 95 38.9 84 39.4 66 38.4 Z" fill="#b9c3d6" />
      <circle cx="46" cy="12.6" r="2.2" fill="#b9c3d6" />
      <path d="M24 31.5 H 68" stroke="#0b0f1c" strokeWidth="1" opacity=".22" />
      {/* la broderie, dans l'encre de la famille */}
      <path d="M36 24 h 14 M36 27.6 h 9" stroke={INK.bleu} strokeWidth="2.4" strokeLinecap="round" />
    </g>
    {/* Un BONNET à pompon : « bonnets, accessoires hiver » */}
    <g>
      <circle cx="137" cy="9.5" r="4.2" fill="#b9c3d6" />
      <path d="M120 31 A 17 16 0 0 1 154 31 Z" fill="#c9d2e2" />
      <rect x="117" y="30" width="40" height="8" rx="3" fill="#e3e9f3" />
      <rect x="117" y="30" width="40" height="2.4" fill="#0b0f1c" opacity=".12" />
    </g>
  </svg>
);

const SamplePrint = () => (
  <svg className="pa-band" viewBox="0 0 170 42" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <rect width="170" height="42" fill="#101627" />
    <g transform="rotate(-3 85 21)">
      <rect x="14" y="2" width="142" height="42" rx="2" fill="#efe9dd" />
      <rect x="14" y="2" width="142" height="42" rx="2" fill="#0b0f1c" opacity=".06" />
      <rect x="24" y="10" width="62" height="3" rx="1.5" fill="#b9b0a0" />
      <rect x="24" y="17" width="44" height="3" rx="1.5" fill="#cdc5b6" />
      <rect x="24" y="24" width="54" height="3" rx="1.5" fill="#cdc5b6" />
      {/* la gamme CMJN d'une épreuve d'imprimeur */}
      <rect x="100" y="9" width="12" height="19" fill="#00b3d6" />
      <rect x="112" y="9" width="12" height="19" fill={INK.magenta} />
      <rect x="124" y="9" width="12" height="19" fill="#f2d024" />
      <rect x="136" y="9" width="12" height="19" fill="#1b1b21" />
    </g>
  </svg>
);

const SampleGoodies = () => (
  <svg className="pa-band" viewBox="0 0 170 42" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <defs>
      <linearGradient id="pa-obj" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#3d4767" /><stop offset=".45" stopColor="#5b6688" />
        <stop offset="1" stopColor="#333c59" />
      </linearGradient>
    </defs>
    <rect width="170" height="42" fill="#0f1424" />
    {/* MUG : corps + anse — les trois blocs abstraits du prototype ne
        laissaient reconnaître aucun objet. */}
    <path d="M46 16 a 7.5 7.5 0 0 1 0 14" fill="none" stroke="#7d88a3" strokeWidth="3.4" />
    <rect x="14" y="8" width="30" height="28" rx="3.5" fill="url(#pa-obj)" />
    <rect x="14" y="18" width="30" height="7" fill={INK.sarcelle} />
    <rect x="14" y="8" width="30" height="3" rx="1.5" fill="#8792ad" opacity=".8" />
    {/* STYLO en diagonale, avec sa pointe et son clip */}
    <g transform="rotate(24 88 22)">
      <rect x="80" y="6" width="9" height="26" rx="2" fill="url(#pa-obj)" />
      <rect x="80" y="6" width="9" height="5" rx="2" fill={INK.sarcelle} />
      <path d="M80 32 h9 l-4.5 6 Z" fill="#8792ad" />
      <rect x="88.4" y="9" width="2" height="10" rx="1" fill="#8792ad" />
    </g>
    {/* TOTE BAG avec ses anses et sa marque */}
    <path d="M124 17 C124 7, 146 7, 146 17" fill="none" stroke="#7d88a3" strokeWidth="2.2" />
    <rect x="118" y="16" width="34" height="22" rx="2.5" fill="url(#pa-obj)" />
    <rect x="127" y="23" width="16" height="8" rx="1.5" fill={INK.sarcelle} opacity=".9" />
  </svg>
);

const SampleBat = () => (
  <svg className="pa-band" viewBox="0 0 170 42" preserveAspectRatio="xMidYMid slice" aria-hidden>
    <rect width="170" height="42" fill="#0f1526" />
    <g stroke="rgba(255,255,255,.09)" strokeWidth="1">
      <path d="M0 14h170M0 28h170M42 0v42M85 0v42M128 0v42" />
    </g>
    <g stroke="#a99bff" strokeWidth="1.4" fill="none">
      <path d="M20 10h-8M20 10v-8M150 32h8M150 32v8" />
    </g>
    <g transform="translate(56,21)">
      <circle r="11" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.3" />
      <path d="M-15 0h30M0 -15v30" stroke="rgba(255,255,255,.5)" strokeWidth="1.3" />
      <circle r="4" fill="none" stroke={INK.brique} strokeWidth="1.6" />
    </g>
    <g transform="translate(118,21)">
      <circle r="13" fill={withAlpha(INK.brique, 0.16)} stroke={INK.brique} strokeWidth="1.6" />
      <path d="M-5.5 .5 L-1.5 4.5 L5.5 -4" fill="none" stroke="#f0908c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

/* ── Vitrine de l'offre PEG : tuiles produits/services ──
   `emoji`, `label` et `sub` sont inchangés (l'emoji reste utilisé par le
   panneau bureau) ; `ink` et `sample` sont les deux champs ajoutés pour
   l'échantillon de matière et la jauge à six encres. */
const OFFER_TILES: {
  emoji: string;
  label: string;
  sub: string;
  ink: string;
  sample: () => JSX.Element;
}[] = [
  { emoji: '👕', label: 'Textile personnalisé', sub: 'T-shirts, polos, vestes à votre image', ink: INK.violet, sample: SampleTextile },
  { emoji: '🦺', label: 'Haute visibilité & EPI', sub: 'Vêtements de travail, chaussures de sécurité', ink: INK.ambre, sample: SampleHiVis },
  { emoji: '🧢', label: 'Casquettes & accessoires', sub: 'Bonnets, accessoires hiver…', ink: INK.bleu, sample: SampleCaps },
  { emoji: '🖨️', label: 'Print & supports', sub: 'Affiches, flyers, signalétique', ink: INK.magenta, sample: SamplePrint },
  { emoji: '🎁', label: 'Objets publicitaires', sub: 'Goodies et cadeaux d’entreprise', ink: INK.sarcelle, sample: SampleGoodies },
  { emoji: '🎨', label: 'Création & BAT', sub: 'Maquettes validées avant production', ink: INK.brique, sample: SampleBat },
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

/* ── Logo PEG vectoriel (tracés de public/img/logo/logo_svg.svg) ──
   Intégré plutôt que chargé en <img> pour pouvoir le teindre : blanc sur la
   vitrine, violet sur le papier du tiroir. Le point garde son #db6b67 —
   c'est LUI l'accent chaud de toute la direction. */
const PegWordmark = ({ fill, className }: { fill: string; className?: string }) => (
  <svg className={className} viewBox="0 0 1130 467" role="img" aria-label={APP_NAME}>
    <g fill={fill}>
      <path d="M20.2,50h133c83.1,0,151,28,151,115.7s-69.1,122.8-148.7,122.8h-44.7v118.4H20.2V50ZM150.3,221.1c44.7,0,65.6-19.7,65.6-55.4s-23.8-48.2-68-48.2h-37.2v103.6h39.5Z" />
      <path d="M336.5,50h239.3v71.3h-148.7v66.9h127.2v71.3h-127.2v76.2h154.5v71.3h-245.1V50Z" />
      <path d="M587.9,230.9c0-119,84.8-187.5,185.9-187.5s104.2,30.5,130.4,56.3l-51.8,44.3c-18.6-15.9-43.8-27.1-75.7-27.1-55.8,0-96.4,41.7-96.4,110.7s34.3,112.4,104.5,112.4,27.9-3.3,36-9.3v-57.6h-60.4v-35.5l40.2-34.1h100.3v166.7c-26.1,24.1-72.6,43.3-126,43.3-104.5,0-187-61.9-187-182.5Z" />
    </g>
    <circle cx="1027.8" cy="331.5" r="82" fill="#db6b67" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   PANNEAU 1 — un échantillon du nuancier
   Chaque tuile a sa PROPRE fenêtre de sortie, décalée de 4,5 % de course :
   les six ne partent jamais d'un bloc, et c'est ce décalage qui fabrique la
   profondeur pendant le geste.
   ═══════════════════════════════════════════════════════════════════════════ */
const Tile = ({
  index, tile, p, still,
}: {
  index: number;
  tile: (typeof OFFER_TILES)[number];
  p: MotionValue<number>;
  still: boolean;
}) => {
  const opacity = useTransform(p, (v) => (still ? 1 : 1 - smooth(0.1 + index * 0.045, 0.7 + index * 0.045, v)));
  const x = useTransform(p, (v) => (still ? 0 : -(8 + index * 9) * v));
  const Sample = tile.sample;
  return (
    <motion.article className="pa-tile" style={{ opacity, x }}>
      <Sample />
      <b>{tile.label}</b>
      <i>{tile.sub}</i>
    </motion.article>
  );
};

/* Un bloc du tiroir : il se compose PENDANT le geste, sur sa propre fenêtre
   décalée de 7 % de course. À mi-course l'en-tête est net, les champs à 40 %,
   les cartes de compte encore fantômes. */
const Reveal = ({
  index, p, still, className, children,
}: {
  index: number;
  p: MotionValue<number>;
  still: boolean;
  className?: string;
  children: React.ReactNode;
}) => {
  const t = useTransform(p, (v) => (still ? 1 : smooth(0.2 + index * 0.07, 0.74 + index * 0.07, v)));
  const x = useTransform(t, (v) => (1 - v) * 26);
  const y = useTransform(t, (v) => (1 - v) * 10);
  return (
    <motion.div className={className} style={{ opacity: t, x, y }}>
      {children}
    </motion.div>
  );
};

/* Un segment de la jauge à six encres : il se remplit sur son sixième de
   course. La jauge est le seul objet qui traverse la transition — repère de
   course sur la vitrine, bandeau de tête sur le papier du formulaire. */
const GaugeSegment = ({ index, ink, p }: { index: number; ink: string; p: MotionValue<number> }) => {
  const scaleX = useTransform(p, (v) => clamp((v - index / 6) * 6, 0, 1));
  return (
    <i style={{ background: withAlpha(ink, 0.16) }}>
      <motion.b style={{ scaleX, background: ink }} />
    </i>
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

  const stageRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLButtonElement>(null);
  /* Largeur RÉELLE du rail. Au-dessus de 560px la vitrine est bornée à une
     colonne de 460px : le bouton rond ne parcourt plus la largeur de l'écran
     mais celle de son rail, sinon il sort par la gauche et se fait rogner. */
  const railW = useRef(0);
  const signUpRef = useRef(signUpOpen);
  signUpRef.current = signUpOpen;

  /* ── Progression du geste, 0 → 1 ── */
  const p = useTransform(x, (v) => clamp(-v / W.current, 0, 1));

  /* ── PARALLAXE, cinq vitesses ──
     Chaque couche recule à sa propre fraction de W. Comme p·W = −x, la
     translation d'une couche vaut simplement x · vitesse : aucune mesure,
     aucune dépendance à la largeur. Le rail, lui, reste FIXE (vitesse 0) :
     le tiroir glisse PAR-DESSUS, et c'est ce qui donne la lecture « tiroir »
     plutôt que « page qui coulisse ». */
  const k = reduced ? 0 : 1;
  const inkX = useTransform(x, (v) => v * 0.06 * k);
  const screenX = useTransform(x, (v) => v * 0.15 * k);
  const screenScale = useTransform(p, (v) => 1 + 0.07 * v * k);
  const headerX = useTransform(x, (v) => v * 0.24 * k);
  const speechX = useTransform(x, (v) => v * 0.34 * k);
  const speechO = useTransform(p, (v) => (reduced ? 1 : 1 - smooth(0.14, 0.86, v)));
  const tilesX = useTransform(x, (v) => v * 0.46 * k);
  const tilesScale = useTransform(p, (v) => 1 - 0.06 * v * k);
  const badgesO = useTransform(p, (v) => (reduced ? 1 : 1 - smooth(0.24, 0.72, v)));
  const veilO = useTransform(p, (v) => 0.5 * v);

  /* ── Ombre du chant : DEUX couches pré-rendues dont seule l'opacité varie.
     Un box-shadow recalculé à chaque image (flou 24 → 72px sur un élément
     pleine hauteur) faisait saccader la mécanique la mieux notée du lot.

     ⚠ Elles vivent HORS du tiroir (`.pa-shadewrap`, frère de `.pa-drawer`,
     translaté du même x). Posées dans le tiroir en `right:100%`, elles
     tombaient intégralement à GAUCHE de sa boîte de rembourrage : son
     `overflow:hidden` les découpait entièrement et l'ombre — la profondeur
     revendiquée du moment fort — n'a jamais été peinte une seule fois.

     Le facteur `smooth(0, .06, v)` les allume dès que le geste commence : au
     repos le tiroir est hors écran, il n'a rien à ombrer, et la vitrine au
     repos reste exactement celle qui a été jugée. */
  const shadeNear = useTransform(p, (v) => (1 - 0.6 * v) * smooth(0, 0.06, v));
  const shadeFar = useTransform(p, (v) => v);

  /* ── Rail : remplissage en scaleX (jamais en % de width).
     transform-origin à DROITE et non à gauche : le remplissage est la trace
     laissée derrière le bouton rond, qui part de la droite vers la gauche. */
  const railFill = p;
  const knobX = useTransform(p, (v) => -v * Math.max(0, (railW.current || W.current - 40) - 98));
  const labelAO = useTransform(p, (v) => 1 - smooth(0.3, 0.55, v));
  const labelBO = useTransform(p, (v) => smooth(0.42, 0.68, v));
  const labelBX = useTransform(p, (v) => (1 - smooth(0.42, 0.68, v)) * 10);
  const chevronsO = useTransform(p, (v) => 1 - smooth(0, 0.25, v));

  /* ── L'ACCROCHE IMPRIMÉE PAR LA TRANCHE ──────────────────────────────────
     Deux exemplaires du MÊME texte, une seule transformation :
       • l'exemplaire blanc vit sur la vitrine, découpé à GAUCHE de la tranche ;
       • l'exemplaire encre vit DANS le corps du tiroir — c'est le débord du
         papier (overflow) qui le découpe à DROITE de la tranche, exactement
         sur le chant de bois.
     Les deux portent la même position d'écran V(t) : l'exemplaire encre est
     contre-translaté de −x, donc la coupe tombe au pixel près quelle que soit
     la largeur de l'écran. Aucun getBoundingClientRect.
     Et comme la copie encre est un élément RÉEL du corps du tiroir, elle
     défile ensuite avec le formulaire — le défaut non traité de la Signature.
     Les 11px sont l'épaisseur du chant : le texte passe de la marge de la
     vitrine (20px) à la colonne du papier (11 + 20). */
  const markT = useTransform(p, (v) => smoothstep(v));
  const markScale = useTransform(p, (v) => 1 - 0.3 * Math.pow(v, 1.45));
  const markWhiteX = useTransform(markT, (t) => 11 * t);
  const markInkX = useTransform(x, (v) => {
    const vc = clamp(v, -W.current, 0);
    const t = smoothstep(-vc / W.current);
    return -vc - 11 * (1 - t);
  });
  const markClip = useTransform(x, (v) => `inset(0 ${Math.max(0, -clamp(v, -W.current, 0)).toFixed(2)}px 0 0)`);

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

  /* ── Recalage à la rotation / au clavier virtuel iOS ──
     On ne mesure QUE la largeur, et on recale x sur la position d'équilibre.
     Aucune hauteur figée, aucun getBoundingClientRect. */
  useEffect(() => {
    const measureRail = () => { railW.current = railRef.current?.offsetWidth ?? 0; };
    measureRail();
    const onResize = () => {
      W.current = window.innerWidth;
      measureRail();
      x.set(openRef.current ? -W.current : 0);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [x]);

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
    <div className={`pa-root${reduced || startOpen ? '' : ' pa-anim'}${opened ? ' pa-opened' : ''}`}>
      <style>{PHONE_CSS}</style>

      {/* ═════════ PANNEAU 1 — LA VITRINE ═════════ */}
      <section className="pa-stage" ref={stageRef} aria-label="Découvrir PEG">
        {/* couche 0 — halos d'encre (la plus lointaine) */}
        <motion.div className="pa-lyr pa-lyr--wide" style={{ x: inkX }}>
          <span className="pa-glow pa-glow--a" />
          <span className="pa-glow pa-glow--b" />
          <span className="pa-glow pa-glow--c" />
        </motion.div>

        {/* couche 1 — similigravure : la matière imprimée, pas un aplat */}
        <motion.div className="pa-lyr pa-lyr--wide pa-screen" style={{ x: screenX, scale: screenScale }}>
          <svg viewBox="0 0 530 844" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <defs>
              <pattern id="pa-ht1" width="23" height="23" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
                <circle cx="11.5" cy="11.5" r="2.3" fill="#fff" />
              </pattern>
              <pattern id="pa-ht2" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
                <circle cx="4.5" cy="4.5" r="1" fill="#c8b8ff" />
              </pattern>
              <radialGradient id="pa-fd1" cx=".78" cy=".13" r=".95">
                <stop offset="0" stopColor="#fff" stopOpacity=".62" />
                <stop offset=".48" stopColor="#fff" stopOpacity=".16" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="pa-fd2" cx=".12" cy=".92" r=".8">
                <stop offset="0" stopColor="#fff" stopOpacity=".45" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <mask id="pa-mk1"><rect width="530" height="844" fill="url(#pa-fd1)" /></mask>
              <mask id="pa-mk2"><rect width="530" height="844" fill="url(#pa-fd2)" /></mask>
            </defs>
            <rect width="530" height="844" fill="url(#pa-ht1)" mask="url(#pa-mk1)" opacity=".26" />
            <rect width="530" height="844" fill="url(#pa-ht2)" mask="url(#pa-mk2)" opacity=".5" />
          </svg>
        </motion.div>

        {/* grain : il appartient au verre, pas à la scène — donc FIXE, hors
            des couches animées (sinon il « nage » pendant le geste). */}
        <svg className="pa-grain" aria-hidden>
          <filter id="pa-grain-f">
            <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#pa-grain-f)" />
        </svg>

        {/* l'établi : sans ce plan de travail, le tiers inférieur flotte */}
        <span className="pa-bench" />
        <motion.span className="pa-veil" style={{ opacity: veilO }} />

        <div
          className="pa-wrap"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <motion.div className="pa-header" style={{ x: headerX }}>
            <PegWordmark className="pa-logo" fill="#fff" />
            {/* folio : deux temps annoncés sans un mot de plus */}
            <p className="pa-folio"><span className="pa-folio__cur">01</span><span>—</span><span>02</span></p>
          </motion.div>

          <motion.div className="pa-speech" style={{ x: speechX, opacity: speechO }}>
            <div className="pa-pillrow">
              <span className="pa-pill">
                <HiLockClosed size={11} color="#b9aeff" />
                <span>Plateforme professionnelle</span>
              </span>
            </div>
            {/* Fantôme : il réserve exactement la boîte de l'accroche, qui est
                peinte par la couche partagée (voir .pa-mark). Même police,
                même largeur → même césure. */}
            <p className="pa-mark-ghost" aria-hidden>Votre image, sur <em>tous vos supports</em></p>
            <p className="pa-sub">
              Textile personnalisé, haute visibilité, objets publicitaires, print…
              Commandez vos produits, suivez vos projets et validez vos BAT dans un seul espace.
            </p>
          </motion.div>

          <motion.div className="pa-tiles" style={{ x: tilesX, scale: tilesScale }}>
            {OFFER_TILES.map((tile, i) => (
              <Tile key={tile.label} index={i} tile={tile} p={p} still={reduced} />
            ))}
          </motion.div>

          <motion.div className="pa-badges" style={{ opacity: badgesO }}>
            <span className="pa-gage"><HiOutlineShieldCheck size={15} /><span>Connexion sécurisée</span></span>
            <span className="pa-gage"><HiOutlineLightningBolt size={15} /><span>Accès instantané</span></span>
            <span className="pa-gage"><HiOutlineUsers size={15} /><span>Données en France</span></span>
          </motion.div>

          {/* Le rail est à la fois l'invitation au geste, son retour visuel ET
              le chemin explicite : plein écran en bas, dans la zone du pouce —
              le bouton d'avant était en haut à droite, le pire coin. Son
              libellé annonce les deux façons de faire. */}
          <div className="pa-railwrap">
            <button
              type="button"
              className="pa-rail"
              ref={railRef}
              onClick={() => { if (!drag.current.moved) openDrawer(true); }}
              aria-label="Se connecter : appuyez, ou glissez vers la gauche"
            >
              <motion.span className="pa-rail__fill" style={{ scaleX: railFill }} />
              <span className="pa-rail__kicker">Se connecter</span>
              <span className="pa-rail__labels">
                <motion.span style={{ opacity: labelAO }}>Glissez ou appuyez pour ouvrir</motion.span>
                <motion.span style={{ opacity: labelBO, x: labelBX }}>Relâchez pour ouvrir</motion.span>
              </span>
              <motion.span className="pa-chevs" style={{ opacity: chevronsO }} aria-hidden>
                <i /><i /><i />
              </motion.span>
              <motion.span className="pa-knob" style={{ x: knobX }} aria-hidden />
            </button>
          </div>
        </div>

        {/* Exemplaire BLANC de l'accroche. La découpe est portée par le
            conteneur (non transformé, donc calé sur le viewport) et non par le
            texte, qui lui est mis à l'échelle. */}
        <motion.div className="pa-mark-clip" style={{ clipPath: markClip }} aria-hidden={false}>
          <motion.h1 className="pa-mark pa-mark--white" style={{ x: markWhiteX, scale: markScale }}>
            Votre image, sur <em>tous vos supports</em>
          </motion.h1>
        </motion.div>
      </section>

      {/* ═════════ L'OMBRE PORTÉE DU CHANT ═════════
          Frère du tiroir, translaté du MÊME x : son bord droit tombe donc
          exactement sur le chant, et rien ne la découpe. Placée entre la
          vitrine et le tiroir dans le DOM, elle assombrit la première sans
          jamais passer par-dessus le second. */}
      <motion.div className="pa-shadewrap" style={{ x }} aria-hidden>
        <motion.span className="pa-shade pa-shade--far" style={{ opacity: shadeFar }} />
        <motion.span className="pa-shade pa-shade--near" style={{ opacity: shadeNear }} />
      </motion.div>

      {/* ═════════ PANNEAU 2 — LE TIROIR ═════════
          Il est posé à left:100% et translaté de x : il suit le doigt au 1:1
          sans qu'on ait à connaître la largeur de l'écran. */}
      <motion.section
        className="pa-drawer"
        ref={drawerRef}
        style={{ x }}
        aria-label="Connexion"
        onFocus={onDrawerFocus}
      >
        {/* le chant de bois clair raboté : c'est lui qui rend le geste crédible */}
        <div className="pa-edge" aria-hidden>
          <span className="pa-notches"><i /><i /><i /></span>
        </div>
        <div
          className="pa-grip"
          aria-hidden
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        <div className="pa-body" ref={bodyRef}>
          <Reveal index={0} p={p} still={reduced}>
            <div className="pa-dhead">
              <button type="button" className="pa-back" onClick={() => closeDrawer(true)}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M12 4l-5 6 5 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Retour
              </button>
              <PegWordmark className="pa-dlogo" fill="#5b4de0" />
            </div>
            <div className="pa-folio-row">
              <span className="pa-rule" />
              <p className="pa-folio pa-folio--ink"><span>01</span><span>—</span><span className="pa-folio__cur">02</span></p>
            </div>
          </Reveal>

          {/* réserve la place de l'accroche imprimée (voir .pa-mark--ink) */}
          <div className="pa-markbox" aria-hidden />

          <Reveal index={1} p={p} still={reduced} className="pa-formwrap">
            <SignInForm disableSubmit={false} />
          </Reveal>

          <Reveal index={2} p={p} still={reduced}>
            <div className="pa-sep">
              <span /><span className="pa-sep__t">Pas encore de compte ?</span><span />
            </div>
            {/* Lignes filetées à réglette de couleur : la retenue éditoriale
                de la Signature, au lieu de deux cartes flottantes. */}
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
          </Reveal>

          <Reveal index={3} p={p} still={reduced}>
            {/* Les gages fondus en une seule ligne pointée : la carte SSL, le
                drapeau et le copyright centré encombraient le panneau. */}
            <p className="pa-foot">
              Connexion sécurisée<i />Hébergé en France<i />© {year} {APP_NAME}
            </p>
          </Reveal>

          {/* Exemplaire ENCRE de l'accroche : élément réel du corps du tiroir,
              donc il défile avec le formulaire une fois le tiroir posé. */}
          <motion.p className="pa-mark pa-mark--ink" style={{ x: markInkX, scale: markScale }} aria-hidden>
            Votre image, sur <em>tous vos supports</em>
          </motion.p>
        </div>
      </motion.section>

      {/* La jauge à six encres : jauge de course du geste sur la vitrine, puis
          bandeau de tête du formulaire. Un seul objet traverse la transition —
          et il signe le métier d'imprimeur. */}
      <div className="pa-gauge" aria-hidden>
        {OFFER_TILES.map((tile, i) => (
          <GaugeSegment key={tile.label} index={i} ink={tile.ink} p={p} />
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   FEUILLE DU DIPTYQUE
   ⚠ PIÈGE : les animations d'entrée sont en fill-mode BACKWARDS, jamais
   `both`. En `both`, l'état final de l'animation écrase en permanence les
   transformations inline posées par framer-motion et la parallaxe ne bouge
   plus. En `backwards`, l'élément reprend son style propre dès la fin.
   ═══════════════════════════════════════════════════════════════════════════ */
const PHONE_CSS = `
.pa-root{
  --pa-safe-top: env(safe-area-inset-top, 0px);
  --pa-safe-bottom: env(safe-area-inset-bottom, 0px);
  --pa-pad: 20px;
  --pa-edge-w: 11px;
  --pa-band-h: clamp(32px, 5.2dvh, 48px);
  --pa-mark-fs: clamp(25px, 7.6vw, 31px);
  /* Décalage vertical de la colonne. 0 sur téléphone — la vitrine remplit son
     écran. Au-dessus de 560px de large ET sur un écran haut (tablette en
     portrait), il recentre la colonne au lieu de laisser un tiers de vide
     noir sous les carreaux. Il entre DANS --pa-mark-top : la coupe de
     l'accroche sur le chant reste exacte, c'est la condition non négociable. */
  --pa-vpad: 0px;
  /* Position de l'accroche, IDENTIQUE dans les deux panneaux : c'est ce qui
     rend la coupe exacte sans mesurer quoi que ce soit.
     18 (marge haute vitrine) + 44 (en-tête) + 26 (marge du discours)
     + 26 (pastille) + 14 (marge de l'accroche) = 128. */
  --pa-mark-top: calc(var(--pa-safe-top) + 128px + var(--pa-vpad));
  --pa-mark-h: 78px;
  --pa-papier: #fbf9f5;
  --pa-brique: #db6b67;
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

/* ── PANNEAU 1 ─────────────────────────────────────────────────────────── */
.pa-stage{ position:absolute; inset:0; overflow:hidden; background:#070c1a; }
.pa-lyr{ position:absolute; inset:0; pointer-events:none; will-change:transform; }
.pa-lyr--wide{ left:-18%; width:136%; }
.pa-screen svg{ width:100%; height:100%; display:block; }
.pa-glow{ position:absolute; border-radius:50%; display:block; }
.pa-glow--a{ top:-190px; right:-120px; width:430px; height:430px;
  background:radial-gradient(circle, rgba(109,93,252,.30) 0%, rgba(109,93,252,.07) 48%, transparent 68%); }
.pa-glow--b{ bottom:-40px; left:-160px; width:400px; height:400px;
  background:radial-gradient(circle, rgba(219,107,103,.20) 0%, rgba(219,107,103,.05) 46%, transparent 66%); }
.pa-glow--c{ top:300px; right:-180px; width:340px; height:340px;
  background:radial-gradient(circle, rgba(47,111,237,.16) 0%, transparent 62%); }
.pa-grain{ position:absolute; inset:0; width:100%; height:100%;
  opacity:.055; mix-blend-mode:overlay; pointer-events:none; }
.pa-bench{ position:absolute; left:0; right:0; bottom:0; height:162px; pointer-events:none; display:block;
  background:linear-gradient(180deg, transparent 0%, rgba(219,107,103,.045) 34%, rgba(4,6,13,.78) 100%); }
.pa-bench::before{ content:""; position:absolute; left:0; right:0; top:0; height:1px;
  background:linear-gradient(90deg, transparent, rgba(219,107,103,.42) 22%, rgba(169,155,255,.30) 62%, transparent); }
.pa-veil{ position:absolute; inset:0; background:#03050b; pointer-events:none; display:block; }

.pa-wrap{ position:absolute; inset:0; display:flex; flex-direction:column;
  padding: calc(var(--pa-safe-top) + 18px + var(--pa-vpad)) var(--pa-pad)
           calc(var(--pa-safe-bottom) + 20px + var(--pa-vpad));
  touch-action:none; -webkit-user-select:none; user-select:none; }

.pa-header{ height:44px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex:none; }
.pa-logo{ width:74px; height:auto; display:block; }
.pa-folio{ margin:0; display:flex; align-items:baseline; gap:7px;
  font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-variant-numeric:tabular-nums;
  font-size:11px; letter-spacing:.14em; color:#7b839a; }
.pa-folio__cur{ color:#b9aeff; font-weight:700; }
.pa-folio--ink{ color:#8b8577; }
.pa-folio--ink .pa-folio__cur{ color:#5b4de0; }

.pa-speech{ margin-top:26px; flex:none; }
.pa-pillrow{ display:flex; }
.pa-pill{ height:26px; display:inline-flex; align-items:center; gap:8px; padding:0 13px; border-radius:100px;
  background:rgba(124,107,255,.14); border:1px solid rgba(124,107,255,.34); }
.pa-pill > span{ color:#b9aeff; font-size:10px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
.pa-sub{ margin:11px 0 0; font-size:12.8px; line-height:1.58; color:rgba(255,255,255,.68); max-width:34ch; }

/* Les rangées partagent la hauteur disponible (minmax(0,1fr)) : sur un petit
   écran ce sont les bandeaux qui se resserrent, la grille n'est jamais
   tronquée. Surtout PAS d'overflow:hidden sur la grille — les tuiles doivent
   pouvoir filer vers la gauche pendant le geste ; c'est chaque tuile qui
   découpe son propre échantillon. */
.pa-tiles{ margin-top:22px; display:grid; grid-template-columns:1fr 1fr;
  grid-auto-rows:minmax(0, 1fr); gap:10px; flex:0 1 auto; min-height:0; }
.pa-tile{ display:flex; flex-direction:column; min-height:0;
  background:rgba(255,255,255,.038); border:1px solid rgba(255,255,255,.085);
  border-radius:14px; overflow:hidden; will-change:transform, opacity; }
.pa-band{ display:block; width:100%; flex:1 1 var(--pa-band-h); min-height:24px; }
.pa-tile b{ display:block; margin:9px 11px 0; font-size:11.6px; font-weight:700; line-height:1.25; letter-spacing:-.01em; flex:none; }
.pa-tile i{ display:block; margin:3px 11px 11px; font-size:10.2px; font-style:normal; line-height:1.35; color:rgba(255,255,255,.62); flex:none; }

.pa-badges{ margin-top:auto; padding-top:16px; display:flex; justify-content:space-between; align-items:center; gap:6px; flex:none; }
.pa-gage{ display:flex; align-items:center; gap:5px; min-width:0; color:#9d8fff; }
.pa-gage > span{ font-size:10px; font-weight:600; color:rgba(255,255,255,.72); letter-spacing:-.012em; white-space:nowrap; }

/* ── Le rail : geste, retour visuel ET chemin explicite ── */
.pa-railwrap{ margin-top:12px; flex:none; }
.pa-rail{ position:relative; display:flex; flex-direction:column; justify-content:center; align-items:flex-start;
  width:100%; min-height:62px; padding:9px 74px 10px 18px;
  border-radius:16px; cursor:pointer; text-align:left; overflow:hidden;
  background:rgba(255,255,255,.045); border:1px solid rgba(255,255,255,.13); color:#fff; }
.pa-rail__fill{ position:absolute; inset:0; transform-origin:right center; display:block;
  background:linear-gradient(270deg, rgba(219,107,103,.32), rgba(219,107,103,.03)); }
.pa-rail__kicker{ position:relative; display:block; font-size:11.5px; font-weight:800;
  letter-spacing:.17em; text-transform:uppercase; color:#fff; }
.pa-rail__labels{ position:relative; display:block; height:17px; margin-top:3px; }
.pa-rail__labels > span{ position:absolute; left:0; top:0; white-space:nowrap;
  font-size:12.2px; font-weight:500; color:rgba(255,255,255,.62); }
.pa-chevs{ position:absolute; right:64px; top:0; bottom:0; display:flex; align-items:center; gap:2px; }
.pa-chevs i{ display:block; width:8px; height:8px; border-left:2px solid #f0908c; border-bottom:2px solid #f0908c;
  transform:rotate(45deg); opacity:.25; animation:paChev 1.9s cubic-bezier(.65,.02,.28,1) infinite; }
.pa-chevs i:nth-child(2){ animation-delay:.13s; }
.pa-chevs i:nth-child(3){ animation-delay:.26s; }
@keyframes paChev{ 0%,60%,100%{ opacity:.22 } 30%{ opacity:1 } }
.pa-knob{ position:absolute; right:8px; top:50%; margin-top:-21px; width:42px; height:42px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  background:linear-gradient(152deg, #f0908c 0%, #d1615d 52%, #b74a46 100%);
  box-shadow:0 6px 18px rgba(183,74,70,.42), inset 0 1px 0 rgba(255,255,255,.35); }
.pa-knob::after{ content:""; width:8px; height:8px; border-left:2px solid #fff; border-bottom:2px solid #fff;
  transform:rotate(45deg) translate(1px,-1px); }

/* ── L'accroche partagée ── */
.pa-mark-clip{ position:absolute; inset:0; pointer-events:none; }
.pa-mark, .pa-mark-ghost{
  margin:0; font-size:var(--pa-mark-fs); line-height:1.1; font-weight:800; letter-spacing:-.032em;
}
.pa-mark{ position:absolute; top:var(--pa-mark-top); left:0; width:100%;
  max-width:calc(15ch + 2 * var(--pa-pad)); padding:0 var(--pa-pad);
  transform-origin:0 0; will-change:transform; }
.pa-mark--white{ color:#fff; }
.pa-mark--ink{ color:#12142b; left:-100vw; width:100vw; }
.pa-mark-ghost{ visibility:hidden; margin-top:14px; max-width:15ch; }
/* aplat d'encre brique sous le membre de phrase, posé DERRIÈRE le texte */
.pa-mark em, .pa-mark-ghost em{ font-style:normal; white-space:nowrap;
  background-image:linear-gradient(90deg, rgba(219,107,103,.85), rgba(219,107,103,.22));
  background-repeat:no-repeat; background-size:100% 7px; background-position:0 calc(100% - 3px); }

/* ── PANNEAU 2 — le tiroir ── */
.pa-drawer{ position:absolute; top:0; left:100%; width:100%; height:100%;
  display:flex; overflow:hidden; will-change:transform; color:#0f172a;
  background-color:var(--pa-papier);
  background-image:radial-gradient(rgba(28,22,14,.05) 1px, transparent 1px);
  background-size:22px 22px; }
/* ── L'ombre portée du chant ──
   Le conteneur fait la largeur de l'écran et porte le MÊME x que le tiroir :
   son bord droit coïncide donc en permanence avec le chant. Les deux couches
   sont collées à ce bord droit, à l'intérieur — c'est ce qui les sauve du
   « overflow:hidden » du tiroir, qui les découpait intégralement quand elles
   vivaient dedans en « right:100% » (elles n'ont jamais été peintes).
   Deux ombres PRÉ-RENDUES : seule leur opacité varie pendant le geste. */
.pa-shadewrap{ position:absolute; top:0; bottom:0; left:0; width:100%;
  pointer-events:none; will-change:transform; }
.pa-shade{ position:absolute; top:0; bottom:0; right:0; display:block; pointer-events:none; }
.pa-shade--near{ width:52px; background:linear-gradient(to left, rgba(0,0,0,.34), rgba(0,0,0,0)); }
/* .62 → .46 : l'ombre tombe aussi sur l'accroche blanche, dont les dernières
   lettres se raccordent AU PIXEL avec la copie encre de l'autre côté du
   chant. C'est le geste le mieux noté de la page ; l'ombre doit creuser la
   profondeur sans éteindre le raccord. */
.pa-shade--far{ width:120px; background:linear-gradient(to left, rgba(0,0,0,.46), rgba(0,0,0,0)); }
.pa-edge{ position:relative; flex:0 0 var(--pa-edge-w);
  background:linear-gradient(90deg, #a9a094 0%, #efe8dc 34%, #d9d0c1 62%, #b6ac9d 100%);
  box-shadow:inset -1px 0 0 rgba(0,0,0,.10); }
.pa-edge::before{ content:""; position:absolute; inset:0; opacity:.45;
  background:repeating-linear-gradient(180deg, rgba(0,0,0,.05) 0 1px, transparent 1px 5px); }
.pa-notches{ position:absolute; left:2px; right:2px; top:50%; transform:translateY(-50%);
  display:flex; flex-direction:column; gap:4px; }
.pa-notches i{ display:block; height:2px; border-radius:1px; background:rgba(0,0,0,.22);
  box-shadow:0 1px 0 rgba(255,255,255,.55); }
.pa-grip{ position:absolute; left:0; top:0; bottom:0; width:26px; z-index:5; touch-action:none; }

.pa-body{ position:relative; flex:1; min-width:0;
  overflow-x:hidden; overflow-y:hidden; overscroll-behavior:contain; -webkit-overflow-scrolling:touch;
  padding: calc(var(--pa-safe-top) + 14px + var(--pa-vpad)) var(--pa-pad) calc(var(--pa-safe-bottom) + 26px); }
/* le défilement n'est rendu qu'une fois le tiroir posé : pendant le geste,
   l'accroche encre doit rester calée sur la tranche */
.pa-opened .pa-body{ overflow-y:auto; }
.pa-dhead{ height:44px; display:flex; align-items:center; justify-content:space-between; }
.pa-back{ display:inline-flex; align-items:center; gap:6px; min-height:44px; padding:0 12px 0 8px;
  margin-left:-8px; border-radius:12px; border:none; background:none; cursor:pointer;
  color:#5b6478; font-size:13px; font-weight:600; }
.pa-dlogo{ width:62px; height:auto; display:block; }
.pa-folio-row{ height:30px; display:flex; align-items:center; gap:12px; }
.pa-rule{ flex:1; height:1px; background:#e7e2d8; }
/* réserve : marque haute + hauteur de l'accroche mise à l'échelle, moins le
   flux déjà consommé (14 de marge + 44 d'en-tête + 30 de folio).
   --pa-vpad est retranché parce qu'il est DÉJÀ dans la marge haute du corps :
   sur tablette la feuille descend en bloc — en-tête, folio et accroche —
   au lieu de laisser l'en-tête collé en haut et 400px de vide sous lui. */
.pa-markbox{ height:calc(var(--pa-mark-top) + var(--pa-mark-h) + 18px - var(--pa-safe-top) - var(--pa-vpad) - 88px); }

.pa-formwrap input:not([type='checkbox']):not([type='radio']){ font-size:16px !important; }
.pa-sep{ display:flex; align-items:center; gap:12px; margin:26px 0 4px; }
.pa-sep > span:not(.pa-sep__t){ flex:1; height:1px; background:#e7e2d8; }
.pa-sep__t{ color:#7d8698; font-size:10.5px; font-weight:800; letter-spacing:.09em;
  text-transform:uppercase; white-space:nowrap; }
.pa-acct{ display:flex; align-items:center; gap:13px; width:100%; min-height:58px; text-align:left;
  background:none; border:0; border-bottom:1px solid #e7e2d8; padding:15px 2px; cursor:pointer; }
.pa-acct__key{ width:3px; align-self:stretch; border-radius:2px; flex:none; }
.pa-acct > svg{ flex:none; }
.pa-acct__txt{ flex:1; min-width:0; }
.pa-acct b{ display:block; font-size:13.5px; font-weight:700; color:#12142b; letter-spacing:-.01em; }
.pa-acct em{ display:block; font-style:normal; font-size:11.5px; line-height:1.45; color:#5b6273; margin-top:3px; }
/* Le parcours Générateur est le moins connu : sa réglette se signale, sans
   agiter toute la ligne. */
.pa-acct--gen .pa-acct__key{ animation:paKey 2.1s ease-in-out infinite; }
@keyframes paKey{ 0%,100%{ opacity:.55 } 50%{ opacity:1 } }
.pa-foot{ margin:22px 0 0; display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:8px;
  font-size:11px; color:#5b6273; }
.pa-foot i{ display:block; width:3px; height:3px; border-radius:50%; background:#b6b1a4; }

/* ── La jauge à six encres, au-dessus des deux panneaux ── */
.pa-gauge{ position:absolute; top:var(--pa-safe-top); left:0; right:0; height:5px;
  display:flex; gap:2px; z-index:30; pointer-events:none; }
.pa-gauge i{ flex:1; position:relative; overflow:hidden; }
.pa-gauge b{ position:absolute; inset:0; transform-origin:left center; display:block; }

/* ── Focus visible ── */
.pa-rail:focus-visible, .pa-back:focus-visible, .pa-acct:focus-visible{
  outline:2px solid #a99bff; outline-offset:3px; }
.pa-acct:focus-visible{ outline-color:#6d5dfc; }

/* ── ENTRÉE (fill-mode BACKWARDS, voir l'avertissement plus haut) ── */
@keyframes paRise{ from{ opacity:0; transform:translate3d(0,18px,0) } to{ opacity:1; transform:none } }
@keyframes paRiseTile{ from{ opacity:0; transform:translate3d(0,22px,0) scale(.955) } to{ opacity:1; transform:none } }
@keyframes paScreenIn{ from{ opacity:0; transform:scale(1.08) } to{ opacity:1; transform:scale(1) } }
@keyframes paUnderline{ from{ background-size:0% 7px } to{ background-size:100% 7px } }
.pa-anim .pa-screen{ animation:paScreenIn 1100ms cubic-bezier(.16,1,.3,1) backwards; }
.pa-anim .pa-header{ animation:paRise 620ms cubic-bezier(.16,1,.3,1) backwards 60ms; }
.pa-anim .pa-pillrow{ animation:paRise 620ms cubic-bezier(.16,1,.3,1) backwards 150ms; }
.pa-anim .pa-mark--white{ animation:paRise 680ms cubic-bezier(.16,1,.3,1) backwards 215ms; }
.pa-anim .pa-mark--white em{ animation:paUnderline 620ms cubic-bezier(.65,.02,.28,1) backwards 700ms; }
.pa-anim .pa-sub{ animation:paRise 660ms cubic-bezier(.16,1,.3,1) backwards 285ms; }
.pa-anim .pa-tile{ animation:paRiseTile 640ms cubic-bezier(.16,1,.3,1) backwards; }
.pa-anim .pa-tile:nth-child(1){ animation-delay:360ms }
.pa-anim .pa-tile:nth-child(2){ animation-delay:415ms }
.pa-anim .pa-tile:nth-child(3){ animation-delay:470ms }
.pa-anim .pa-tile:nth-child(4){ animation-delay:525ms }
.pa-anim .pa-tile:nth-child(5){ animation-delay:580ms }
.pa-anim .pa-tile:nth-child(6){ animation-delay:635ms }
.pa-anim .pa-badges{ animation:paRise 620ms cubic-bezier(.16,1,.3,1) backwards 700ms; }
.pa-anim .pa-railwrap{ animation:paRise 700ms cubic-bezier(.16,1,.3,1) backwards 770ms; }

/* ── ÉCRANS COURTS (iPhone SE, 8, écrans avec barre d'URL déployée) ──
   La vitrine ne défile jamais : c'est le nuancier qui se resserre. On retire
   le sous-titre des tuiles, dont l'échantillon et le libellé disent déjà
   l'essentiel, plutôt que de laisser une ligne coupée en deux.
   ⚠ Rien ici ne touche à ce qui précède l'accroche (marge du wrap, hauteur de
   l'en-tête, marge du discours, hauteur de la pastille, marge de l'accroche) :
   ces cinq valeurs sont la définition de --pa-mark-top, donc de la coupe. */
@media (max-height: 745px){
  .pa-root{ --pa-band-h: clamp(26px, 4.6dvh, 40px); }
  .pa-sub{ font-size:12px; margin-top:9px; }
  .pa-tiles{ margin-top:14px; gap:8px; }
  .pa-tile i{ display:none; }
  .pa-tile b{ margin:8px 10px; font-size:11px; }
  .pa-badges{ padding-top:12px; }
  .pa-railwrap{ margin-top:10px; }
}

/* ── TÉLÉPHONES ÉTROITS (≤ 340px : iPhone SE 1re gén., 320×568) ──────────
   Sur un écran à la fois étroit ET court, la grille se faisait comprimer par
   le conteneur en colonne, et comme la tuile est en overflow:hidden (elle
   DOIT l'être, elle découpe son échantillon), c'est le libellé qui sautait :
   « Casquettes & accessoires » s'affichait « Casquettes & », deuxième ligne
   tranchée net. Or ces libellés sont de la terminologie verrouillée.
   On ne rogne donc pas le texte : on lui REND la place, en dessous de
   l'accroche uniquement (le sous-titre respire sur toute la largeur au lieu
   d'une mesure de 34ch, les interlignes et le rail se resserrent). Les cinq
   valeurs qui définissent --pa-mark-top restent intouchées : la coupe de
   l'accroche sur le chant ne bouge pas d'un pixel.
   ⚠ APRÈS le bloc max-height:745px : à spécificité égale, c'est l'ordre qui
   tranche, et ces valeurs-ci doivent gagner. */
@media (max-width: 340px){
  .pa-root{ --pa-pad:16px; }
  .pa-sub{ font-size:11px; line-height:1.4; margin-top:8px; max-width:none; }
  .pa-tiles{ margin-top:10px; gap:7px; }
  .pa-tile b{ margin:7px 8px; font-size:10.2px; line-height:1.2; }
  .pa-band{ min-height:16px; }
  .pa-badges{ padding-top:8px; }
  .pa-gage{ gap:4px; }
  .pa-gage > span{ font-size:9.2px; }
  .pa-railwrap{ margin-top:8px; }
  .pa-rail{ min-height:56px; padding:8px 62px 9px 14px; }
  .pa-rail__kicker{ font-size:10.8px; letter-spacing:.14em; }
  .pa-rail__labels > span{ font-size:11.4px; }
  .pa-knob{ width:38px; height:38px; margin-top:-19px; right:7px; }
  .pa-chevs{ right:54px; }
}

/* ── TABLETTE EN PORTRAIT (≥ 560px sous le seuil des 920px) ──────────────
   La vitrine est une composition de TÉLÉPHONE : étirée à 820px de large, ses
   carreaux devenaient des bandeaux de 400px de large sur 48 de haut et les
   échantillons — viewBox 170×42 en « slice » — étaient rognés de moitié (la
   casquette n'était plus qu'un dôme gris) ; et comme les gages sont poussés
   en bas par « margin-top:auto », un tiers de la hauteur restait en vide noir.
   Trois bornes suffisent, sans toucher à un seul nœud :
   • --pa-pad grandit jusqu'à recentrer une colonne de 460px ;
   • --pa-vpad recentre cette colonne verticalement et absorbe le vide ;
   • --pa-band-h rend au bandeau la hauteur que sa largeur réclame.
   Mesuré après coup : vide résiduel 0px et proportion d'échantillon 3,6:1 à
   820×1180, 4,05:1 à 768×1024 (le tracé natif vaut 4,05:1) — contre un vide
   de ~560px et une proportion de 8,4:1 avant.
   L'accroche suit automatiquement : elle est peinte avec le MÊME --pa-pad et
   le MÊME --pa-vpad que le fantôme qui lui réserve sa boîte. */
@media (min-width: 560px){
  .pa-root{
    --pa-pad: max(20px, calc((100vw - 460px) / 2));
    --pa-vpad: clamp(0px, calc((100dvh - 780px) / 2), 190px);
    /* Le carreau est deux fois plus large que sur téléphone : l'échantillon a
       besoin de hauteur pour ne pas être tranché. Cette règle passe APRÈS le
       bloc max-height:745px et le remplace au-dessus de 560px — le minimum de
       26px garde le téléphone en paysage tel qu'il était. */
    --pa-band-h: clamp(26px, 7dvh, 56px);
  }
}

/* ── TÉLÉPHONE EN PAYSAGE (≥ 560px de large, ≤ 480px de haut) ────────────
   Défaut PRÉEXISTANT, de la même famille que celui des écrans étroits : à
   390px de haut, la colonne demandait ~66px de plus que l'écran, la grille se
   faisait comprimer et les SIX libellés étaient tranchés (mesuré : 6/6 rognés,
   rail 4px sous le bord). On rend la place là où le paysage en a : la grille
   passe à TROIS colonnes sur deux rangs (−80px), le sous-titre reprend toute
   la largeur de la colonne au lieu d'une mesure de 34ch (−38px), l'accroche
   se met à la mesure de la hauteur.
   ⚠ --pa-mark-fs vaut pour les DEUX exemplaires de l'accroche (blanc et
   encre) : ils gardent la même taille, donc la même césure et la même coupe
   sur le chant. --pa-mark-top, lui, n'est pas touché. */
@media (min-width: 560px) and (max-height: 480px){
  .pa-root{
    --pa-mark-fs: clamp(20px, 3.6vh, 25px);
    --pa-mark-h: 52px;
    --pa-band-h: clamp(20px, 9dvh, 44px);
    /* La cinquième valeur du haut de page est recomposée EN ENTIER, et
       --pa-mark-top avec elle : 10 + 32 + 12 + 22 + 8 = 84. C'est la seule
       façon légitime de toucher à ces cinq valeurs — les changer ensemble.
       Le harnais vérifie Δ(accroche, fantôme) = (0,0) à cette taille. */
    --pa-mark-top: calc(var(--pa-safe-top) + 84px + var(--pa-vpad));
  }
  .pa-wrap{ padding-top: calc(var(--pa-safe-top) + 10px + var(--pa-vpad)); }
  .pa-header{ height:32px; }
  .pa-logo{ width:64px; }
  .pa-speech{ margin-top:12px; }
  .pa-pill{ height:22px; }
  .pa-mark-ghost{ margin-top:8px; }
  .pa-sub{ max-width:none; font-size:11.4px; line-height:1.4; margin-top:7px; }
  .pa-tiles{ margin-top:10px; grid-template-columns:repeat(3, 1fr); gap:8px; }
  .pa-tile b{ margin:6px 9px; font-size:11px; line-height:1.25; }
  /* Priorité au LIBELLÉ : s'il reste trop juste, c'est l'échantillon qui cède
     jusqu'à disparaître, jamais la terminologie qui se fait trancher. */
  .pa-band{ min-height:0; }
  .pa-badges{ padding-top:6px; }
  .pa-railwrap{ margin-top:8px; }
  .pa-rail{ min-height:50px; padding:7px 68px 8px 16px; }
  .pa-knob{ width:38px; height:38px; margin-top:-19px; }
  /* Le tiroir suit : sans cela l'accroche encre, remontée à 84px, passerait
     par-dessus l'en-tête et le folio du formulaire. */
  .pa-dhead{ height:34px; }
  .pa-folio-row{ height:22px; }
  .pa-markbox{ height:calc(var(--pa-mark-top) + var(--pa-mark-h) + 14px - var(--pa-safe-top) - var(--pa-vpad) - 70px); }
}
/* 320px de haut (iPhone SE 1re génération couché) : même à échantillon nul il
   manquait 34px. Le sous-titre cède — comme le sous-titre des carreaux cède
   déjà sous 745px — pour que les six libellés restent entiers. Le texte n'est
   ni réécrit ni supprimé du fichier, il n'est pas peint sur ce format. */
@media (min-width: 560px) and (max-height: 360px){
  .pa-sub{ display:none; }
  .pa-rail{ min-height:44px; }
  .pa-knob{ width:34px; height:34px; margin-top:-17px; }
}

@media (prefers-reduced-motion: reduce){
  .pa-root *{ animation:none !important; }
  .pa-chevs i{ opacity:.7; }
  .pa-mark em, .pa-mark-ghost em{ background-size:100% 7px; }
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
