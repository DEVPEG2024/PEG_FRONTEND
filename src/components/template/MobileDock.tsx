import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { HiOutlineMenu } from 'react-icons/hi';
import Drawer from '@/components/ui/Drawer';
import CustomVerticalMenu from '@/components/template/CustomVerticalMenu';
import PullToRefresh from '@/components/template/PullToRefresh';
import { PremiumCard, QuoteCard } from '@/components/template/SideNav';
import navigationConfig from '@/configs/navigation.config';
import navigationIcon from '@/configs/navigation-icon.config';
import {
  NAV_MODE_THEMED,
  NAV_MODE_TRANSPARENT,
  DIR_RTL,
} from '@/constants/theme.constant';
import { useAppSelector } from '@/store';
import useResponsive from '@/utils/hooks/useResponsive';
import useNavActivity from '@/utils/hooks/useNavActivity';
import useNavCounters from '@/utils/hooks/useNavCounters';
import usePageFade from '@/utils/hooks/usePageFade';
import {
  filterNavForCatalogAccess,
  getNavBadge,
  getVisibleNavItems,
} from '@/utils/navMenu';
import type { NavigationTree } from '@/@types/navigation';

/*
 * Barre d'onglets du téléphone (< md) : la navigation d'une application native.
 * Onglets = les premières entrées du menu de l'utilisateur, dans SON ordre, avec
 * les mêmes règles de visibilité et les mêmes pastilles que la barre latérale
 * (utils/navMenu.ts). « Menu » ouvre le menu complet, identique à celui du bureau.
 * Styles : section « BARRE D'ONGLETS » de _mobile.css.
 */

const TAB_COUNT = 4;
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

const isActivePath = (pathname: string, path: string) =>
  !!path && pathname.startsWith(path);

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

  const [menuOpen, setMenuOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

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
    [navTree, userAuthority.join(','), isAdmin, isCustomerPremium]
  );
  // Un onglet mène à une page : les groupes (sous-menus) restent dans « Menu »
  const tabs = useMemo(
    () => items.filter((i) => i.path && !i.subMenu?.length).slice(0, TAB_COUNT),
    [items]
  );
  // « Menu » n'apparaît que s'il mène à autre chose que les onglets
  const hasMoreThanTabs = items.length > tabs.length;

  const badgeFor = (nav: NavigationTree) =>
    getNavBadge(nav.path, getActivityCount(nav.path), counters);
  // Pastille sur « Menu » quand une entrée hors onglets a du nouveau
  const menuHasNews = items
    .filter((i) => !tabs.includes(i))
    .flatMap((i) => [
      i,
      ...(i.subMenu ?? []),
      ...(i.subMenu ?? []).flatMap((s) => s.subMenu ?? []),
    ])
    .some((i) => i.path && badgeFor(i));

  const activeTab = tabs.find((t) => isActivePath(location.pathname, t.path));

  // Toute navigation referme le menu (y compris vers la page déjà ouverte)
  useEffect(() => {
    setMenuOpen(false);
  }, [location.key]);

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

  const onTabClick = (nav: NavigationTree) => {
    markActivitySeen(nav.path);
    // Toucher l'onglet de la page affichée la fait remonter, comme dans une app
    if (location.pathname === nav.path) {
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
        className={classNames('peg-dock', keyboardOpen && 'peg-dock--hidden')}
        aria-label="Navigation principale"
      >
        {tabs.map((tab) => {
          const active = tab === activeTab;
          const badge = badgeFor(tab);
          return (
            <Link
              key={tab.key}
              to={tab.path}
              className={classNames('peg-dock-item', active && 'is-active')}
              aria-current={active ? 'page' : undefined}
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
              </span>
              <span className="peg-dock-label">{tab.title}</span>
            </Link>
          );
        })}
        {hasMoreThanTabs && (
          <button
            type="button"
            className={classNames(
              'peg-dock-item',
              (menuOpen || !activeTab) && 'is-active'
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
        )}
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
          </div>
        )}
      </Drawer>

      <PullToRefresh disabled={menuOpen || keyboardOpen} />
    </>
  );
};

const MobileDock = () => {
  const { smaller } = useResponsive();
  return smaller.md ? <Dock /> : null;
};

export default MobileDock;
