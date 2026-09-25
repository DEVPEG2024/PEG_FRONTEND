import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { HiOutlineMenu } from 'react-icons/hi';
import { TbLayoutBottombar } from 'react-icons/tb';
import Drawer from '@/components/ui/Drawer';
import CustomVerticalMenu from '@/components/template/CustomVerticalMenu';
import MobileDockEditor from '@/components/template/MobileDockEditor';
import PullToRefresh from '@/components/template/PullToRefresh';
import { PremiumCard, QuoteCard } from '@/components/template/SideNav';
import navigationConfig from '@/configs/navigation.config';
import navigationIcon from '@/configs/navigation-icon.config';
import {
  NAV_MODE_THEMED,
  NAV_MODE_TRANSPARENT,
  DIR_RTL,
  MODE_DARK,
} from '@/constants/theme.constant';
import { useAppSelector } from '@/store';
import useResponsive from '@/utils/hooks/useResponsive';
import useNavActivity from '@/utils/hooks/useNavActivity';
import useNavCounters from '@/utils/hooks/useNavCounters';
import usePageFade from '@/utils/hooks/usePageFade';
import {
  dockScope,
  filterNavForCatalogAccess,
  findActiveDockTab,
  getDockEntries,
  getNavBadge,
  getStoredDockKeys,
  getVisibleNavItems,
  resolveDockTabs,
  saveDockKeys,
} from '@/utils/navMenu';
import type { DockEntry } from '@/utils/navMenu';
import { accentVars, readAccent } from '@/utils/mobileShell';

/*
 * Barre d'onglets du téléphone (< md) : la navigation d'une application native.
 * Par défaut, un onglet par entrée du menu de l'utilisateur (page ou catégorie),
 * dans SON ordre, avec les mêmes règles de visibilité et les mêmes pastilles
 * que la barre latérale (utils/navMenu.ts). Ceux qui ne tiennent pas à l'écran
 * se font glisser sur le côté ; « Menu », épinglé à droite, ouvre le menu
 * complet. Onglets et ordre se personnalisent (MobileDockEditor.tsx), depuis
 * le menu ou par un appui long sur un onglet.
 * Styles : section « BARRE D'ONGLETS » de _mobile.css.
 */

const LONG_PRESS_MS = 480;
// Retrait de la capsule de verre dans son onglet (px, de chaque côté)
const GLASS_INSET = 3;
// Bord de tête rapide, bord de queue plus mou : la capsule s'étire vers
// l'onglet visé puis se rétracte en arrivant, comme une goutte
const GLASS_LEAD = { type: 'spring', stiffness: 560, damping: 38 } as const;
const GLASS_TAIL = { type: 'spring', stiffness: 230, damping: 26 } as const;
// Largeur du fondu aux bords de la barre (--peg-dock-fade-*, _mobile.css)
const EDGE_FADE_PX = 26;
// Petit va-et-vient de la barre, une seule fois par appareil : « ça défile »
const SCROLL_HINT_STORAGE_KEY = 'peg_dock_hint_v1';
// Couleur appliquée à la barre d'état (Android, Safari) : celle de l'en-tête
const THEME_COLOR_SELECTOR = 'meta[name="theme-color"]';

const NON_TEXT_INPUTS = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'file',
  'image',
  'hidden',
]);

// Un champ qui ouvre le clavier virtuel : la barre s'efface pour lui laisser la place
const opensKeyboard = (el: EventTarget | Element | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  return (
    el.tagName === 'INPUT' &&
    !NON_TEXT_INPUTS.has((el as HTMLInputElement).type)
  );
};

const Dock = () => {
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user.user);
  const userAuthority = (user?.authority ?? []) as string[];
  const customer = user?.customer;
  const isAdmin =
    userAuthority.includes('admin') || userAuthority.includes('super_admin');
  const isCustomerPremium = !!customer?.premium;

  const navMode = useAppSelector((state) => state.theme.navMode);
  const mode = useAppSelector((state) => state.theme.mode);
  const themeColor = useAppSelector((state) => state.theme.themeColor);
  const primaryColorLevel = useAppSelector(
    (state) => state.theme.primaryColorLevel
  );
  const direction = useAppSelector((state) => state.theme.direction);

  const counters = useNavCounters(isAdmin, customer?.documentId);
  usePageFade();
  const { getActivityCount, markActivitySeen } = useNavActivity();

  const reduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [editor, setEditor] = useState<{ focusKey?: string } | null>(null);

  const authorityKey = userAuthority.join(',');
  const scope = dockScope(userAuthority);
  const [storedKeys, setStoredKeys] = useState(() => getStoredDockKeys(scope));
  useEffect(() => {
    setStoredKeys(getStoredDockKeys(scope));
  }, [scope]);

  const navTree = useMemo(
    () => filterNavForCatalogAccess(navigationConfig, customer),
    [customer]
  );
  const items = useMemo(
    () =>
      getVisibleNavItems(navTree, {
        userAuthority,
        isAdmin,
        isCustomerPremium,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navTree, authorityKey, isAdmin, isCustomerPremium]
  );
  // `items` change déjà avec les droits de l'utilisateur
  const entries = useMemo(() => getDockEntries(items, userAuthority), [items]);
  const tabs = useMemo(
    () => resolveDockTabs(entries, storedKeys),
    [entries, storedKeys]
  );
  const activeTab = findActiveDockTab(tabs, location.pathname);
  // Onglet touché : il s'allume (et le verre part) dès le toucher, sans
  // attendre le chargement de la page ; la navigation faite, la page décide.
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  useEffect(() => {
    setPressedKey(null);
  }, [location.key]);
  const shownKey = pressedKey ?? activeTab?.key;

  const badgeFor = (path: string) =>
    getNavBadge(path, getActivityCount(path), counters);
  // Un onglet de catégorie signale le nouveau de ses pages par un point
  const tabNews = (tab: DockEntry) =>
    tab.pages
      ? { badge: null, dot: tab.pages.some((p) => badgeFor(p.path)) }
      : { badge: badgeFor(tab.path), dot: false };
  // Pastille sur « Menu » quand une page hors des onglets a du nouveau
  const reachable = new Set(
    tabs.flatMap((t) => (t.pages ? t.pages.map((p) => p.path) : [t.path]))
  );
  const menuHasNews = entries.some(
    (e) => !e.pages && !reachable.has(e.path) && badgeFor(e.path)
  );

  // Toute navigation referme le menu (y compris vers la page déjà ouverte)
  useEffect(() => {
    setMenuOpen(false);
  }, [location.key]);

  // Bords de la barre : fondu du côté où d'autres onglets attendent, et point
  // rouge si l'un d'eux, hors de l'écran, a du nouveau.
  const syncEdges = useCallback(() => {
    const nav = navRef.current;
    const track = trackRef.current;
    const items = track?.querySelectorAll<HTMLElement>('.peg-dock-item');
    if (!nav || !track || !items?.length) return;
    const box = track.getBoundingClientRect();
    const a = items[0].getBoundingClientRect();
    const b = items[items.length - 1].getBoundingClientRect();
    nav.classList.toggle(
      'is-clipped-left',
      Math.min(a.left, b.left) < box.left - 1
    );
    nav.classList.toggle(
      'is-clipped-right',
      Math.max(a.right, b.right) > box.right + 1
    );
    // Pastille dans le fondu du bord ou au-delà : elle ne se voit pas
    let newsLeft = false;
    let newsRight = false;
    track
      .querySelectorAll<HTMLElement>(
        '[data-news] .peg-dock-badge, [data-news] .peg-dock-dot'
      )
      .forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.left < box.left + EDGE_FADE_PX / 2) newsLeft = true;
        else if (r.right > box.right - EDGE_FADE_PX / 2) newsRight = true;
      });
    nav.classList.toggle('has-news-left', newsLeft);
    nav.classList.toggle('has-news-right', newsRight);
  }, []);

  // Après chaque rendu : onglets ou pastilles ont pu changer
  useLayoutEffect(syncEdges);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncEdges);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [syncEdges]);

  // Amène un onglet à l'écran, avec un bout de son voisin : on devine la suite
  const reveal = useCallback(
    (key: string, smooth: boolean) => {
      const track = trackRef.current;
      const el = track?.querySelector<HTMLElement>(
        `[data-key="${CSS.escape(key)}"]`
      );
      if (!track || !el) return;
      const box = track.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const peek = Math.min(r.width / 2, 36);
      let delta = 0;
      if (r.left < box.left + peek) delta = r.left - box.left - peek;
      else if (r.right > box.right - peek) delta = r.right - box.right + peek;
      if (delta)
        track.scrollBy({
          left: delta,
          behavior: smooth && !reduceMotion ? 'smooth' : 'auto',
        });
    },
    [reduceMotion]
  );

  // L'onglet de la page affichée est toujours visible (d'emblée à l'ouverture)
  const revealedOnce = useRef(false);
  const activeKey = activeTab?.key;
  useEffect(() => {
    if (!activeKey) return;
    reveal(activeKey, revealedOnce.current);
    revealedOnce.current = true;
  }, [activeKey, reveal]);

  // Capsule de verre sous l'onglet actif : d'un onglet à l'autre, ses deux
  // bords sont animés séparément (GLASS_LEAD / GLASS_TAIL) — elle coule,
  // s'amincit un peu en s'étirant, et un reflet la traverse selon sa vitesse.
  const glassLeft = useMotionValue(0);
  const glassRight = useMotionValue(0);
  const glassWidth = useTransform([glassLeft, glassRight], ([l, r]: number[]) =>
    Math.max(0, r - l)
  );
  const glassRest = useRef(0);
  const glassSquash = useTransform(glassWidth, (w) => {
    const rest = glassRest.current;
    return rest && w > rest ? Math.max(0.8, 1 - (w - rest) / (rest * 4)) : 1;
  });
  const glassSheen = useTransform(useVelocity(glassLeft), (v) =>
    Math.min(1, Math.abs(v) / 900)
  );
  const glassPlaced = useRef(false);
  const [glassShown, setGlassShown] = useState(false);

  const placeGlass = useCallback(
    (animated: boolean) => {
      const el = shownKey
        ? trackRef.current?.querySelector<HTMLElement>(
            `[data-key="${CSS.escape(shownKey)}"]`
          )
        : null;
      // Page hors des onglets : la capsule s'efface (« Menu » s'allume)
      if (!el) {
        setGlassShown(false);
        return;
      }
      const left = el.offsetLeft + GLASS_INSET;
      const right = el.offsetLeft + el.offsetWidth - GLASS_INSET;
      glassRest.current = right - left;
      setGlassShown(true);
      if (!animated || !glassPlaced.current || reduceMotion) {
        glassLeft.set(left);
        glassRight.set(right);
        glassPlaced.current = true;
        return;
      }
      const toRight = left > glassLeft.get();
      animate(glassLeft, left, toRight ? GLASS_TAIL : GLASS_LEAD);
      animate(glassRight, right, toRight ? GLASS_LEAD : GLASS_TAIL);
    },
    [shownKey, reduceMotion, glassLeft, glassRight]
  );

  // Nouvel onglet actif, ou onglets réordonnés : la capsule rejoint sa place
  useLayoutEffect(() => placeGlass(true), [placeGlass, tabs]);
  useEffect(() => {
    const onResize = () => placeGlass(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [placeGlass]);

  // Première fois sur cet appareil : la barre glisse un peu et revient. Elle
  // n'est notée « vue » qu'une fois jouée (ou touchée) : un montage annulé
  // (StrictMode, page quittée aussitôt) ne la consomme pas.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || reduceMotion) return;
    const markSeen = () => {
      try {
        localStorage.setItem(SCROLL_HINT_STORAGE_KEY, '1');
      } catch {
        // stockage indisponible : l'indice reviendra, sans gravité
      }
    };
    try {
      if (localStorage.getItem(SCROLL_HINT_STORAGE_KEY)) return;
    } catch {
      return;
    }
    let back: ReturnType<typeof setTimeout>;
    const out = setTimeout(() => {
      if (track.scrollWidth <= track.clientWidth + 4) return;
      markSeen();
      const start = track.scrollLeft;
      const way = direction === DIR_RTL ? -1 : 1;
      track.scrollTo({ left: start + way * 56, behavior: 'smooth' });
      back = setTimeout(
        () => track.scrollTo({ left: start, behavior: 'smooth' }),
        550
      );
    }, 1200);
    const stop = () => {
      clearTimeout(out);
      clearTimeout(back);
    };
    // Barre déjà touchée : le geste est connu, l'indice n'a plus lieu d'être
    const touched = () => {
      stop();
      markSeen();
    };
    track.addEventListener('pointerdown', touched, { once: true });
    return () => {
      stop();
      track.removeEventListener('pointerdown', touched);
    };
    // Une seule fois, au montage
  }, []);

  // Appui long sur un onglet : ouvre le réglage de la barre, sur cet onglet
  const press = useRef<{
    timer: ReturnType<typeof setTimeout>;
    x: number;
    y: number;
  } | null>(null);
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
  };
  // Le doigt qui se lève après l'appui long produit un clic là où il était :
  // ni l'onglet, ni la feuille qui vient de s'ouvrir ne doivent le recevoir.
  // Le geste suivant commence par un pointerdown : la garde s'arrête là.
  const swallowReleaseClick = () => {
    const swallow = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      release();
    };
    const release = () => {
      document.removeEventListener('click', swallow, true);
      document.removeEventListener('pointerdown', release, true);
    };
    document.addEventListener('click', swallow, true);
    document.addEventListener('pointerdown', release, true);
  };

  const openEditor = (focusKey?: string) => {
    setMenuOpen(false);
    setEditor({ focusKey });
  };

  const applyKeys = (keys: string[] | null, revealKey?: string) => {
    setStoredKeys(keys);
    saveDockKeys(scope, keys);
    if (revealKey) requestAnimationFrame(() => reveal(revealKey, true));
  };

  // Pendant le réglage, la barre passe au-dessus de la feuille comme aperçu :
  // visible, mais plus ni cliquable ni atteignable au clavier.
  const editing = !!editor;
  useEffect(() => {
    const nav = navRef.current;
    if (!editing || !nav) return;
    document.body.classList.add('peg-dock-editing');
    nav.setAttribute('inert', '');
    return () => {
      document.body.classList.remove('peg-dock-editing');
      nav.removeAttribute('inert');
    };
  }, [editing]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onFocusIn = (e: FocusEvent) => {
      if (!opensKeyboard(e.target)) return;
      clearTimeout(timer);
      setKeyboardOpen(true);
    };
    // Léger délai : passer d'un champ au suivant ne fait pas clignoter la barre
    const onFocusOut = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => setKeyboardOpen(opensKeyboard(document.activeElement)),
        120
      );
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Les éléments flottants (bulle d'aide, retour en haut, notifications…) se
  // placent au-dessus de la barre via --peg-dock-lift, posé par cette classe.
  useEffect(() => {
    if (keyboardOpen) return;
    document.body.classList.add('peg-has-dock');
    return () => document.body.classList.remove('peg-has-dock');
  }, [keyboardOpen]);

  // Fond « app » : tout PEG prend le noir et le halo de couleur des tableaux
  // de bord (utils/mobileShell.ts). Posé avant l'affichage, et avant la barre
  // d'état ci-dessous, qui lit la couleur de l'en-tête.
  const darkShell = mode === MODE_DARK;
  useLayoutEffect(() => {
    if (!darkShell) return;
    document.body.classList.add('peg-mobile-dark');
    return () => document.body.classList.remove('peg-mobile-dark');
  }, [darkShell]);
  // Couleur relue à chaque page : elle a pu changer sur le tableau de bord.
  // Posée sur <html> : les tableaux de bord posent les mêmes variables sur le
  // body et les retirent en partant, sans toucher à celles-ci.
  useLayoutEffect(() => {
    if (!darkShell) return;
    const root = document.documentElement.style;
    const vars = accentVars(readAccent());
    Object.entries(vars).forEach(([k, v]) => root.setProperty(k, v));
    return () => Object.keys(vars).forEach((k) => root.removeProperty(k));
  }, [darkShell, location.pathname]);

  // Barre d'état du téléphone à la couleur de l'en-tête : l'en-tête s'y prolonge
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(THEME_COLOR_SELECTOR);
    const header = document.querySelector('.header');
    if (!meta || !header) return;
    const previous = meta.content;
    const color = getComputedStyle(header).backgroundColor;
    if (color && color !== 'rgba(0, 0, 0, 0)') meta.content = color;
    return () => {
      meta.content = previous;
    };
  }, [mode]);

  const onTabClick = (tab: DockEntry) => {
    setPressedKey(tab.key);
    markActivitySeen(tab.path);
    // Toucher l'onglet de la page affichée la fait remonter, comme dans une app
    if (location.pathname === tab.path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const drawerBodyClass = () => {
    if (navMode === NAV_MODE_THEMED)
      return `bg-${themeColor}-${primaryColorLevel} side-nav-${navMode}`;
    if (navMode === NAV_MODE_TRANSPARENT) return `side-nav-${mode}`;
    return `side-nav-${navMode}`;
  };

  return (
    <>
      <nav
        ref={navRef}
        className={classNames('peg-dock', keyboardOpen && 'peg-dock--hidden')}
        aria-label="Navigation principale"
      >
        <div className="peg-dock-rail">
          <div
            ref={trackRef}
            className="peg-dock-track"
            onPointerDown={(e) => {
              const item = (e.target as HTMLElement).closest<HTMLElement>(
                '[data-key]'
              );
              cancelPress();
              press.current = null;
              if (!item || (e.pointerType === 'mouse' && e.button !== 0))
                return;
              const key = item.dataset.key!;
              press.current = {
                x: e.clientX,
                y: e.clientY,
                timer: setTimeout(() => {
                  swallowReleaseClick();
                  navigator.vibrate?.(10);
                  openEditor(key);
                }, LONG_PRESS_MS),
              };
            }}
            onPointerMove={(e) => {
              const p = press.current;
              if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8)
                clearTimeout(p.timer);
            }}
            onPointerUp={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(e) => e.preventDefault()}
          >
            <motion.span
              className="peg-dock-glass"
              aria-hidden="true"
              style={{
                x: glassLeft,
                width: glassWidth,
                scaleY: glassSquash,
                opacity: glassShown ? 1 : 0,
              }}
            >
              <motion.span
                className="peg-dock-glass-sheen"
                style={{ opacity: glassSheen }}
              />
            </motion.span>
            {tabs.map((tab) => {
              const active = tab.key === shownKey;
              const { badge, dot } = tabNews(tab);
              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  data-key={tab.key}
                  data-news={badge || dot ? '' : undefined}
                  draggable={false}
                  className={classNames('peg-dock-item', active && 'is-active')}
                  aria-current={tab === activeTab ? 'page' : undefined}
                  onClick={() => onTabClick(tab)}
                >
                  <span className="peg-dock-icon">
                    {navigationIcon[tab.icon]}
                    {badge && (
                      <span
                        className="peg-dock-badge"
                        style={{ background: badge.color }}
                      >
                        {badge.count > 99 ? '99+' : badge.count}
                      </span>
                    )}
                    {dot && (
                      <span className="peg-dock-dot" aria-hidden="true" />
                    )}
                  </span>
                  <span className="peg-dock-label">
                    {tab.title}
                    {tab.group && (
                      <span className="sr-only"> ({tab.group})</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
          <span
            className="peg-dock-news peg-dock-news--left"
            aria-hidden="true"
          />
          <span
            className="peg-dock-news peg-dock-news--right"
            aria-hidden="true"
          />
        </div>
        <button
          type="button"
          className={classNames(
            'peg-dock-item peg-dock-more',
            (menuOpen || !shownKey) && 'is-active'
          )}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-label={menuHasNews ? 'Menu (du nouveau)' : undefined}
          onClick={() => setMenuOpen(true)}
        >
          <span className="peg-dock-icon">
            <HiOutlineMenu />
            {menuHasNews && (
              <span className="peg-dock-dot" aria-hidden="true" />
            )}
          </span>
          <span className="peg-dock-label">Menu</span>
        </button>
      </nav>

      <Drawer
        title="Navigation"
        isOpen={menuOpen}
        bodyClass={classNames(drawerBodyClass(), 'p-0')}
        width={330}
        placement={direction === DIR_RTL ? 'right' : 'left'}
        onClose={() => setMenuOpen(false)}
        onRequestClose={() => setMenuOpen(false)}
      >
        {menuOpen && (
          <div className="peg-dock-menu">
            <CustomVerticalMenu
              navigationTree={navTree}
              userAuthority={userAuthority}
              onNavigate={() => setMenuOpen(false)}
            />
            {customer && !customer.premium && <PremiumCard />}
            {customer && <QuoteCard />}
            {/* En dernier, sous la carte devis : un réglage, pas une destination */}
            <button
              type="button"
              className="peg-dock-customize"
              onClick={() => openEditor()}
            >
              <TbLayoutBottombar aria-hidden="true" />
              Personnaliser la barre du bas
            </button>
          </div>
        )}
      </Drawer>

      <MobileDockEditor
        open={editing}
        entries={entries}
        tabs={tabs}
        isCustom={!!storedKeys}
        focusKey={editor?.focusKey}
        onChange={applyKeys}
        onReset={() => applyKeys(null)}
        onClose={() => setEditor(null)}
      />

      <PullToRefresh disabled={menuOpen || keyboardOpen || editing} />
    </>
  );
};

const MobileDock = () => {
  const { smaller } = useResponsive();
  return smaller.md ? <Dock /> : null;
};

export default MobileDock;
