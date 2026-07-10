import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import type { NavigationTree } from '@/@types/navigation';
import navigationIcon from '@/configs/navigation-icon.config';
import { HiChevronDown, HiChevronRight } from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import { useAppSelector } from '@/store';
import type { NotificationItem } from '@/store/slices/base/notificationSlice';
import { apiGetQuotes, apiGetCustomerQuotes } from '@/services/QuoteServices';
import { apiGetPremiumCustomers } from '@/services/PremiumServices';
import { unwrapData } from '@/utils/serviceHelper';

const STORAGE_KEY = 'peg_nav_order_v2';
// Renommage supprimé — les labels sont figés (cf. GLOSSARY.md)

// Pastilles « du nouveau » : chaque section du menu écoute les notifications
// (state.base.notification, alimenté par le polling de la cloche) selon ses
// types d'événements. La pastille disparaît à la visite de la section
// (timestamp « vu » par chemin, stocké en localStorage).
const NAV_ACTIVITY_EVENTS: Record<string, string[]> = {
  '/support': ['new_ticket'],
  '/common/projects': [
    'project_status_change',
    'new_comment',
    'new_file',
    'new_task',
    'task_status_change',
  ],
  '/admin/invoices': ['new_invoice', 'payment_received'],
  '/customer/invoices': ['new_invoice', 'payment_received'],
  '/admin/store/orders': ['new_order'],
};
const ACTIVITY_SEEN_KEY = 'peg_nav_activity_seen';
// Référence stable pour le sélecteur Redux (évite un re-rendu à chaque poll)
const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

function getStoredActivitySeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_SEEN_KEY) || '{}');
  } catch {
    return {};
  }
}

function getStoredOrder(items: NavigationTree[]): NavigationTree[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return items;
    const order: string[] = JSON.parse(stored);
    const itemMap: Record<string, NavigationTree> = {};
    items.forEach((item) => {
      itemMap[item.key] = item;
    });
    const reordered = order.filter((k) => itemMap[k]).map((k) => itemMap[k]);
    items.forEach((item) => {
      if (!order.includes(item.key)) reordered.push(item);
    });
    return reordered;
  } catch {
    return items;
  }
}

function saveOrder(items: NavigationTree[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((i) => i.key)));
}

// Labels custom supprimés — nettoyage localStorage au mount
function clearLegacyLabels() {
  try {
    localStorage.removeItem('peg_nav_labels');
  } catch {}
}

function hasAuthority(authority: string[], userAuthority: string[]): boolean {
  if (!authority || authority.length === 0) return true;
  return authority.some((a) => userAuthority.includes(a));
}

type Props = {
  navigationTree: NavigationTree[];
  userAuthority: string[];
  collapsed?: boolean;
};

const CustomVerticalMenu = ({
  navigationTree,
  userAuthority,
  collapsed,
}: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<NavigationTree[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const isAdmin =
    userAuthority.includes('admin') || userAuthority.includes('super_admin');
  const user = useAppSelector((state) => state.auth.user.user);
  const customerDocumentId = user?.customer?.documentId;
  const [quoteCount, setQuoteCount] = useState(0);
  const [premiumCount, setPremiumCount] = useState(0);
  const notifications = useAppSelector(
    (state) => state.base?.notification?.notifications ?? EMPTY_NOTIFICATIONS
  );
  const [activitySeen, setActivitySeen] = useState<Record<string, string>>(
    getStoredActivitySeen
  );

  const getActivityCount = (path: string): number => {
    const events = NAV_ACTIVITY_EVENTS[path];
    if (!events || notifications.length === 0) return 0;
    const lastSeen = activitySeen[path];
    return notifications.filter(
      (n) =>
        !n.read &&
        events.includes(n.eventType) &&
        (!lastSeen || n.createdAt > lastSeen)
    ).length;
  };

  const markActivitySeen = (path: string) => {
    if (!NAV_ACTIVITY_EVENTS[path]) return;
    const next = { ...activitySeen, [path]: new Date().toISOString() };
    setActivitySeen(next);
    try {
      localStorage.setItem(ACTIVITY_SEEN_KEY, JSON.stringify(next));
    } catch {}
  };

  // La section actuellement visitée est toujours considérée « vue »
  useEffect(() => {
    const path = Object.keys(NAV_ACTIVITY_EVENTS).find((p) =>
      location.pathname.startsWith(p)
    );
    if (path && getActivityCount(path) > 0) {
      markActivitySeen(path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, notifications]);

  // Nettoyer les anciens labels custom au mount
  useEffect(() => {
    clearLegacyLabels();
  }, []);

  // Compteur de devis en attente (admin : demandes reçues ; client : propositions à valider)
  useEffect(() => {
    let stopped = false;
    const fetchCount = async () => {
      try {
        const res = isAdmin
          ? await unwrapData(
              apiGetQuotes({
                pagination: { page: 1, pageSize: 1000 },
                searchTerm: '',
              })
            )
          : customerDocumentId
            ? await unwrapData(apiGetCustomerQuotes(customerDocumentId))
            : null;
        if (!res || stopped) return;
        const nodes = (res as any).quotes_connection?.nodes || [];
        const pending = nodes.filter((q: any) =>
          isAdmin ? q.status === 'requested' : q.status === 'proposed'
        ).length;
        if (!stopped) setQuoteCount(pending);
      } catch {
        // silencieux (collection devis pas encore déployée / permissions)
      }
    };
    fetchCount();
    const id = setInterval(fetchCount, 60000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [isAdmin, customerDocumentId]);

  // Compteur de clients Premium non traités (admin) → badge sur l'onglet "Premium"
  useEffect(() => {
    if (!isAdmin) return;
    let stopped = false;
    const fetchPremium = async () => {
      try {
        const list = await apiGetPremiumCustomers();
        if (stopped) return;
        setPremiumCount(list.filter((c) => !c.premiumProcessed).length);
      } catch {
        // silencieux
      }
    };
    fetchPremium();
    const id = setInterval(fetchPremium, 60000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [isAdmin]);

  // "Mes offres" (offres personnalisées) est réservé aux clients Premium (abonnement).
  // Les clients Standard (inscription autonome) ne le voient pas.
  const isCustomerPremium = !!user?.customer?.premium;

  useEffect(() => {
    const filtered = navigationTree.filter((item) => {
      if (!hasAuthority(item.authority, userAuthority)) return false;
      if (item.key === 'customer.products' && !isAdmin && !isCustomerPremium)
        return false;
      return true;
    });
    setItems(getStoredOrder(filtered));
  }, [navigationTree, userAuthority, isAdmin, isCustomerPremium]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const next = [...items];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    setItems(next);
    saveOrder(next);
  };

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname.startsWith(path) || location.pathname === path;
  };

  const isGroupActive = (item: NavigationTree): boolean => {
    if (isActive(item.path)) return true;
    for (const sub of item.subMenu) {
      if (isActive(sub.path)) return true;
      for (const sub2 of sub.subMenu) {
        if (isActive(sub2.path)) return true;
      }
    }
    return false;
  };

  const renderIcon = (icon: string) => {
    const ic = navigationIcon[icon];
    if (!ic) return null;
    return (
      <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>
        {ic}
      </span>
    );
  };

  // Render a leaf link (no children)
  const renderLeaf = (
    nav: NavigationTree,
    depth = 0,
    dragHandleProps?: any
  ) => {
    if (!hasAuthority(nav.authority, userAuthority)) return null;
    const active = isActive(nav.path);
    const isHovered = hoveredKey === nav.key;
    const isPremiumNav = nav.path === '/admin/premium';
    const activityCount = getActivityCount(nav.path);
    const isActivityBadge =
      nav.path !== '/common/quotes' && !isPremiumNav && activityCount > 0;
    const badgeCount =
      nav.path === '/common/quotes'
        ? quoteCount
        : isPremiumNav
          ? premiumCount
          : activityCount;
    const showBadge = badgeCount > 0;
    const badgeColor = isPremiumNav ? '#eab308' : isActivityBadge ? '#ef4444' : '#8b5cf6';
    const badgeGlow = isPremiumNav
      ? 'rgba(234,179,8,0.6)'
      : isActivityBadge
        ? 'rgba(239,68,68,0.6)'
        : 'rgba(139,92,246,0.6)';

    return (
      <div
        key={nav.key}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: depth === 0 ? '10px' : '8px',
          padding: depth === 0 ? '8px 10px' : '6px 10px 6px 16px',
          borderRadius: '10px',
          cursor: 'pointer',
          marginBottom: '2px',
          background: active
            ? 'linear-gradient(90deg, rgba(47,111,237,0.18), rgba(47,111,237,0.08))'
            : isHovered
              ? 'rgba(255,255,255,0.04)'
              : 'transparent',
          borderLeft: active
            ? '2px solid rgba(107,158,255,0.7)'
            : '2px solid transparent',
          transition: 'all 0.12s',
          position: 'relative',
        }}
        onClick={() => {
          if (!nav.path) return;
          markActivitySeen(nav.path);
          navigate(nav.path);
        }}
        onMouseEnter={() => setHoveredKey(nav.key)}
        onMouseLeave={() => setHoveredKey(null)}
      >
        {/* Drag handle — only top-level */}
        {depth === 0 && !collapsed && (
          <span
            {...dragHandleProps}
            style={{
              color: 'rgba(255,255,255,0.1)',
              cursor: 'grab',
              display: 'flex',
              flexShrink: 0,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 0.15s',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MdDragIndicator size={14} />
          </span>
        )}

        {/* Icon */}
        <span
          style={{
            color: active ? '#6b9eff' : 'rgba(255,255,255,0.65)',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {renderIcon(nav.icon)}
          {collapsed && showBadge && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                minWidth: '15px',
                height: '15px',
                padding: '0 3px',
                borderRadius: '8px',
                background: badgeColor,
                color: '#fff',
                fontSize: '9px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>

        {/* Label */}
        {!collapsed && (
          <span
            style={{
              color: active ? '#fff' : 'rgba(255,255,255,0.82)',
              fontSize: '14.5px',
              fontWeight: active ? 700 : 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {nav.title}
          </span>
        )}

        {/* Badge compteur (déplié) */}
        {!collapsed && showBadge && (
          <span
            style={{
              flexShrink: 0,
              minWidth: '20px',
              height: '20px',
              padding: '0 6px',
              borderRadius: '10px',
              background: badgeColor,
              color: '#fff',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 10px ${badgeGlow}`,
            }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
    );
  };

  // Render a collapsible group (NAV_ITEM_TYPE_TITLE or has subMenu)
  const renderGroup = (
    nav: NavigationTree,
    index: number,
    dragHandleProps?: any
  ) => {
    if (!hasAuthority(nav.authority, userAuthority)) return null;

    // The sub-items to render are usually inside nav.subMenu[0].subMenu (legacy nested structure)
    const groupItems: NavigationTree[] =
      nav.subMenu.length === 1 && nav.subMenu[0].subMenu.length > 0
        ? nav.subMenu[0].subMenu
        : nav.subMenu;

    const groupLabel =
      nav.subMenu.length === 1 ? nav.subMenu[0].title : nav.title;
    const groupIcon = nav.subMenu.length === 1 ? nav.subMenu[0].icon : nav.icon;
    const groupPath = nav.subMenu.length === 1 ? nav.subMenu[0].path : nav.path;

    const active = isGroupActive(nav);
    const isOpen = expanded[nav.key] ?? active;
    const isHovered = hoveredKey === nav.key;
    // Pastille sur l'en-tête si un sous-item a de l'activité (masquée si déplié :
    // la pastille du sous-item est alors visible)
    const groupActivityCount = groupItems.reduce(
      (sum, sub) => sum + getActivityCount(sub.path),
      0
    );
    const showGroupDot = groupActivityCount > 0 && (!isOpen || collapsed);

    return (
      <div key={nav.key} style={{ marginBottom: '2px' }}>
        {/* Group header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '10px',
            cursor: 'pointer',
            background:
              active && !isOpen
                ? 'linear-gradient(90deg, rgba(47,111,237,0.18), rgba(47,111,237,0.08))'
                : isHovered
                  ? 'rgba(255,255,255,0.04)'
                  : 'transparent',
            borderLeft: active
              ? '2px solid rgba(107,158,255,0.7)'
              : '2px solid transparent',
            transition: 'all 0.12s',
          }}
          onClick={() => toggleExpand(nav.key)}
          onMouseEnter={() => setHoveredKey(nav.key)}
          onMouseLeave={() => setHoveredKey(null)}
        >
          {/* Drag handle */}
          {!collapsed && (
            <span
              {...dragHandleProps}
              style={{
                color: 'rgba(255,255,255,0.1)',
                cursor: 'grab',
                display: 'flex',
                flexShrink: 0,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.15s',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <MdDragIndicator size={14} />
            </span>
          )}

          {/* Icon */}
          <span
            style={{
              color: active ? '#6b9eff' : 'rgba(255,255,255,0.65)',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {renderIcon(groupIcon)}
            {collapsed && showGroupDot && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-4px',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                }}
              />
            )}
          </span>

          {/* Label */}
          {!collapsed && (
            <>
              <span
                style={{
                  color: active ? '#fff' : 'rgba(255,255,255,0.82)',
                  fontSize: '14.5px',
                  fontWeight: active ? 700 : 500,
                  flex: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {groupLabel}
              </span>
              {showGroupDot && (
                <span
                  style={{
                    flexShrink: 0,
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                  }}
                />
              )}
              <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                {isOpen ? (
                  <HiChevronDown size={13} />
                ) : (
                  <HiChevronRight size={13} />
                )}
              </span>
            </>
          )}
        </div>

        {/* Sub-items */}
        {isOpen && !collapsed && (
          <div
            style={{
              marginLeft: '14px',
              paddingLeft: '12px',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              marginTop: '2px',
              marginBottom: '4px',
            }}
          >
            {groupItems
              .filter((sub) => hasAuthority(sub.authority, userAuthority))
              .map((sub) => renderLeaf(sub, 1))}
          </div>
        )}
      </div>
    );
  };

  const hasChildren = (nav: NavigationTree) =>
    nav.subMenu && nav.subMenu.length > 0;

  return (
    <div style={{ padding: '8px 10px', fontFamily: 'Inter, sans-serif' }}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sidebar-nav">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((nav, index) => (
                <Draggable key={nav.key} draggableId={nav.key} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        ...provided.draggableProps.style,
                        opacity: snapshot.isDragging ? 0.85 : 1,
                        background: snapshot.isDragging
                          ? 'rgba(47,111,237,0.08)'
                          : 'transparent',
                        borderRadius: '10px',
                      }}
                    >
                      {hasChildren(nav)
                        ? renderGroup(nav, index, provided.dragHandleProps)
                        : renderLeaf(nav, 0, provided.dragHandleProps)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default CustomVerticalMenu;
