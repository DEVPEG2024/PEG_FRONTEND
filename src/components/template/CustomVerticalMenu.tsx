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
import {
  HiChevronDown,
  HiChevronRight,
} from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';

const STORAGE_KEY = 'peg_nav_order_v2';

function getStoredOrder(items: NavigationTree[]): NavigationTree[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return items;
    const order: string[] = JSON.parse(stored);
    const itemMap: Record<string, NavigationTree> = {};
    items.forEach((item) => { itemMap[item.key] = item; });
    const reordered = order.filter((k) => itemMap[k]).map((k) => itemMap[k]);
    items.forEach((item) => { if (!order.includes(item.key)) reordered.push(item); });
    return reordered;
  } catch {
    return items;
  }
}

function saveOrder(items: NavigationTree[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((i) => i.key)));
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

const CustomVerticalMenu = ({ navigationTree, userAuthority, collapsed }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<NavigationTree[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    const filtered = navigationTree.filter((item) =>
      hasAuthority(item.authority, userAuthority)
    );
    setItems(getStoredOrder(filtered));
  }, [navigationTree, userAuthority]);

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
    return <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>{ic}</span>;
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
        onClick={() => nav.path && navigate(nav.path)}
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
        <span style={{ color: active ? '#6b9eff' : 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
          {renderIcon(nav.icon)}
        </span>

        {/* Label */}
        {!collapsed && (
          <span style={{
            color: active ? '#fff' : 'rgba(255,255,255,0.55)',
            fontSize: '13px',
            fontWeight: active ? 700 : 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
          }}>
            {nav.title}
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

    const groupLabel = nav.subMenu.length === 1 ? nav.subMenu[0].title : nav.title;
    const groupIcon = nav.subMenu.length === 1 ? nav.subMenu[0].icon : nav.icon;
    const groupPath = nav.subMenu.length === 1 ? nav.subMenu[0].path : nav.path;

    const active = isGroupActive(nav);
    const isOpen = expanded[nav.key] ?? active;
    const isHovered = hoveredKey === nav.key;

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
            background: active && !isOpen
              ? 'linear-gradient(90deg, rgba(47,111,237,0.18), rgba(47,111,237,0.08))'
              : isHovered
              ? 'rgba(255,255,255,0.04)'
              : 'transparent',
            borderLeft: active ? '2px solid rgba(107,158,255,0.7)' : '2px solid transparent',
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
          <span style={{ color: active ? '#6b9eff' : 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
            {renderIcon(groupIcon)}
          </span>

          {/* Label */}
          {!collapsed && (
            <>
              <span style={{
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                flex: 1,
                whiteSpace: 'nowrap',
              }}>
                {groupLabel}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                {isOpen ? <HiChevronDown size={13} /> : <HiChevronRight size={13} />}
              </span>
            </>
          )}
        </div>

        {/* Sub-items */}
        {isOpen && !collapsed && (
          <div style={{
            marginLeft: '14px',
            paddingLeft: '12px',
            borderLeft: '1px solid rgba(255,255,255,0.07)',
            marginTop: '2px',
            marginBottom: '4px',
          }}>
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
                        background: snapshot.isDragging ? 'rgba(47,111,237,0.08)' : 'transparent',
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
