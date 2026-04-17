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
const LABELS_KEY = 'peg_nav_labels';

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

function getStoredLabels(): Record<string, string> {
  try {
    const stored = localStorage.getItem(LABELS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLabel(key: string, label: string) {
  const labels = getStoredLabels();
  if (label) {
    labels[key] = label;
  } else {
    delete labels[key];
  }
  localStorage.setItem(LABELS_KEY, JSON.stringify(labels));
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
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(getStoredLabels);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const isAdmin = userAuthority.includes('admin') || userAuthority.includes('super_admin');

  const getLabel = (nav: NavigationTree) => customLabels[nav.key] || nav.title;

  const startEditing = (key: string, currentLabel: string) => {
    if (!isAdmin) return;
    setEditingKey(key);
    setEditValue(currentLabel);
  };

  const commitEdit = (key: string, originalTitle: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== originalTitle) {
      saveLabel(key, trimmed);
      setCustomLabels((prev) => ({ ...prev, [key]: trimmed }));
    } else if (!trimmed || trimmed === originalTitle) {
      saveLabel(key, '');
      setCustomLabels((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    setEditingKey(null);
  };

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
        <span style={{ color: active ? '#6b9eff' : 'rgba(255,255,255,0.65)', flexShrink: 0 }}>
          {renderIcon(nav.icon)}
        </span>

        {/* Label */}
        {!collapsed && (
          editingKey === nav.key ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(nav.key, nav.title)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit(nav.key, nav.title);
                if (e.key === 'Escape') setEditingKey(null);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(107,158,255,0.5)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                padding: '2px 6px',
                outline: 'none',
                flex: 1,
                minWidth: 0,
              }}
            />
          ) : (
            <span
              style={{
                color: active ? '#fff' : 'rgba(255,255,255,0.82)',
                fontSize: '14.5px',
                fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                cursor: isAdmin ? 'text' : 'pointer',
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                startEditing(nav.key, getLabel(nav));
              }}
            >
              {getLabel(nav)}
            </span>
          )
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
          <span style={{ color: active ? '#6b9eff' : 'rgba(255,255,255,0.65)', flexShrink: 0 }}>
            {renderIcon(groupIcon)}
          </span>

          {/* Label */}
          {!collapsed && (
            <>
              {editingKey === nav.key ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(nav.key, groupLabel)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(nav.key, groupLabel);
                    if (e.key === 'Escape') setEditingKey(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(107,158,255,0.5)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '2px 6px',
                    outline: 'none',
                    flex: 1,
                    minWidth: 0,
                  }}
                />
              ) : (
                <span
                  style={{
                    color: active ? '#fff' : 'rgba(255,255,255,0.82)',
                    fontSize: '14.5px',
                    fontWeight: active ? 700 : 500,
                    flex: 1,
                    whiteSpace: 'nowrap',
                    cursor: isAdmin ? 'text' : 'pointer',
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditing(nav.key, customLabels[nav.key] || groupLabel);
                  }}
                >
                  {customLabels[nav.key] || groupLabel}
                </span>
              )}
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
