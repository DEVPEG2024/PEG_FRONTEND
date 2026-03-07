import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  createChecklist,
  deleteChecklist,
  duplicateChecklist,
  getChecklists,
  setChecklist,
  setDialogOpen,
  updateChecklist,
  useAppSelector,
} from './store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Checklist } from '@/@types/checklist';
import {
  HiOutlineSearch,
  HiPlus,
  HiX,
  HiChevronDown,
  HiChevronUp,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineDuplicate,
} from 'react-icons/hi';
import { MdChecklist, MdDragIndicator } from 'react-icons/md';
import { toast } from 'react-toastify';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import { Dialog, Pagination, Select } from '@/components/ui';

injectReducer('checklists', reducer);

// ── Action button ─────────────────────────────────────────────────────────────
function Btn({
  onClick,
  title,
  activeColor,
  activeBg,
  children,
}: {
  onClick: () => void;
  title: string;
  activeColor: string;
  activeBg: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = activeColor;
        e.currentTarget.style.background = activeBg;
        e.currentTarget.style.borderColor = activeColor + '66';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
      }}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function ChecklistsListContent() {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { checklists, total, loading, checklist, dialogOpen } = useAppSelector(
    (state) => state.checklists.data
  );

  // Dialog form state
  const [formName, setFormName] = useState('');
  const [formItems, setFormItems] = useState<string[]>(['']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(
      getChecklists({
        pagination: { page: currentPage, pageSize },
        searchTerm: debouncedSearch,
      })
    );
  }, [currentPage, pageSize, debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

  // ── Sync dialog form with selected checklist ──────────────────────────────
  useEffect(() => {
    if (checklist) {
      setFormName(checklist.name);
      setFormItems(checklist.items.length > 0 ? [...checklist.items] : ['']);
    } else {
      setFormName('');
      setFormItems(['']);
    }
  }, [checklist]);

  // ── Dialog actions ────────────────────────────────────────────────────────
  const openNew = () => {
    dispatch(setChecklist(null));
    dispatch(setDialogOpen(true));
  };

  const openEdit = (c: Checklist) => {
    dispatch(setChecklist(c));
    dispatch(setDialogOpen(true));
  };

  const handleClose = () => {
    dispatch(setDialogOpen(false));
    dispatch(setChecklist(null));
  };

  const handleSave = async () => {
    const items = formItems.filter((i) => i.trim() !== '');
    if (!formName.trim()) {
      toast.error('Le nom du modèle est requis');
      return;
    }
    if (items.length === 0) {
      toast.error('Ajoutez au moins une tâche');
      return;
    }
    if (checklist?.documentId) {
      const result = await dispatch(
        updateChecklist({ documentId: checklist.documentId, name: formName, items })
      );
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Modèle mis à jour');
        handleClose();
        dispatch(getChecklists({ pagination: { page: currentPage, pageSize }, searchTerm: debouncedSearch }));
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } else {
      const result = await dispatch(createChecklist({ name: formName, items }));
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Modèle créé');
        handleClose();
        dispatch(getChecklists({ pagination: { page: currentPage, pageSize }, searchTerm: debouncedSearch }));
      } else {
        toast.error('Erreur lors de la création');
      }
    }
  };

  const handleDelete = (documentId: string) => {
    dispatch(deleteChecklist(documentId));
    toast.success('Modèle supprimé');
  };

  const handleDuplicate = (c: Checklist) => {
    dispatch(duplicateChecklist(c));
    toast.success('Modèle dupliqué');
  };

  // ── Item management ───────────────────────────────────────────────────────
  const addItem = (afterIndex?: number) => {
    const idx = afterIndex !== undefined ? afterIndex + 1 : formItems.length;
    const updated = [...formItems];
    updated.splice(idx, 0, '');
    setFormItems(updated);
    setTimeout(() => inputRefs.current[idx]?.focus(), 50);
  };

  const removeItem = (index: number) => {
    if (formItems.length === 1) return;
    const updated = formItems.filter((_, i) => i !== index);
    setFormItems(updated);
    setTimeout(() => inputRefs.current[Math.max(0, index - 1)]?.focus(), 50);
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...formItems];
    updated[index] = value;
    setFormItems(updated);
  };

  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(index);
    }
    if (e.key === 'Backspace' && formItems[index] === '' && formItems.length > 1) {
      e.preventDefault();
      removeItem(index);
    }
  };

  // ── DnD reorder ───────────────────────────────────────────────────────────
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = [...formItems];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setFormItems(items);
  };

  const pageSizeOptions = useMemo(
    () => [10, 25, 50].map((n) => ({ value: n, label: `${n} / page` })),
    []
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          paddingTop: '28px',
          paddingBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Administration
          </p>
          <h2
            style={{
              color: '#fff',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Modèles de checklist{' '}
            <span
              style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              ({total})
            </span>
          </h2>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <HiPlus size={16} /> Créer un modèle
        </button>
      </div>

      {/* Search */}
      <div
        style={{
          position: 'relative',
          marginBottom: '24px',
          maxWidth: '400px',
        }}
      >
        <HiOutlineSearch
          size={15}
          style={{
            position: 'absolute',
            left: '13px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Rechercher un modèle…"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '10px',
            padding: '10px 14px 10px 36px',
            color: '#fff',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = 'rgba(47,111,237,0.5)')
          }
          onBlur={(e) =>
            (e.target.style.borderColor = 'rgba(255,255,255,0.09)')
          }
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '14px',
                height: '72px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
      ) : checklists.length === 0 ? (
        <div
          style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            borderRadius: '16px',
            padding: '64px 24px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <MdChecklist
            size={48}
            style={{
              color: 'rgba(255,255,255,0.1)',
              margin: '0 auto 14px',
              display: 'block',
            }}
          />
          <p
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            {debouncedSearch
              ? 'Aucun résultat pour cette recherche'
              : 'Aucun modèle de checklist'}
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.18)',
              fontSize: '13px',
              marginTop: '6px',
            }}
          >
            Créez votre premier modèle pour commencer
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingBottom: '24px',
          }}
        >
          {checklists.map((c) => {
            const isExpanded = expandedId === c.documentId;
            const visibleItems = isExpanded ? c.items : c.items.slice(0, 4);
            const hiddenCount = c.items.length - 4;

            return (
              <div
                key={c.documentId}
                style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  border: '1.5px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')
                }
              >
                {/* Card header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'rgba(99,102,241,0.12)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MdChecklist size={24} style={{ color: '#818cf8' }} />
                  </div>

                  {/* Name + count */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '14px',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.name}
                    </span>
                    <span
                      style={{
                        color: 'rgba(255,255,255,0.35)',
                        fontSize: '12px',
                      }}
                    >
                      {c.items.length} tâche{c.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Item count badge */}
                  <span
                    style={{
                      background: 'rgba(99,102,241,0.1)',
                      border: '1px solid rgba(99,102,241,0.22)',
                      borderRadius: '100px',
                      padding: '2px 10px',
                      color: '#818cf8',
                      fontSize: '11px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {c.items.length} tâche{c.items.length !== 1 ? 's' : ''}
                  </span>

                  {/* Actions */}
                  <div
                    style={{ display: 'flex', gap: '5px', flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Btn
                      onClick={() => openEdit(c)}
                      title="Modifier"
                      activeColor="#6b9eff"
                      activeBg="rgba(47,111,237,0.12)"
                    >
                      <HiOutlinePencilAlt size={13} />
                    </Btn>
                    <Btn
                      onClick={() => handleDuplicate(c)}
                      title="Dupliquer"
                      activeColor="#c084fc"
                      activeBg="rgba(168,85,247,0.12)"
                    >
                      <HiOutlineDuplicate size={13} />
                    </Btn>
                    <Btn
                      onClick={() => handleDelete(c.documentId)}
                      title="Supprimer"
                      activeColor="#f87171"
                      activeBg="rgba(239,68,68,0.12)"
                    >
                      <HiOutlineTrash size={13} />
                    </Btn>
                  </div>

                  {/* Expand toggle */}
                  {c.items.length > 0 && (
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : c.documentId)
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: isExpanded
                          ? '#818cf8'
                          : 'rgba(255,255,255,0.3)',
                        display: 'flex',
                        padding: '4px',
                        borderRadius: '6px',
                        flexShrink: 0,
                        transition: 'color 0.15s',
                      }}
                    >
                      {isExpanded ? (
                        <HiChevronUp size={16} />
                      ) : (
                        <HiChevronDown size={16} />
                      )}
                    </button>
                  )}
                </div>

                {/* Items preview */}
                {c.items.length > 0 && (
                  <div
                    style={{
                      padding: '0 16px 14px 74px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                  >
                    {visibleItems.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '4px',
                            border: '1.5px solid rgba(99,102,241,0.4)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        />
                        <span
                          style={{
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: '12px',
                          }}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                    {!isExpanded && hiddenCount > 0 && (
                      <button
                        onClick={() => setExpandedId(c.documentId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'rgba(129,140,248,0.7)',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '2px 0',
                          textAlign: 'left',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        + {hiddenCount} tâche{hiddenCount > 1 ? 's' : ''} de plus
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '32px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <Pagination
            pageSize={pageSize}
            currentPage={currentPage}
            total={total}
            onChange={setCurrentPage}
          />
          <div style={{ minWidth: 130 }}>
            <Select
              size="sm"
              menuPlacement="top"
              isSearchable={false}
              value={pageSizeOptions.find((o) => o.value === pageSize)}
              options={pageSizeOptions}
              onChange={(o) => {
                setPageSize(Number(o?.value));
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* ── Dialog create / edit ── */}
      <Dialog isOpen={dialogOpen} onClose={handleClose} width={560}>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}
        >
          {/* Dialog header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div>
              <h3
                style={{
                  color: '#fff',
                  fontSize: '17px',
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                {checklist?.documentId
                  ? 'Modifier le modèle'
                  : 'Nouveau modèle de checklist'}
              </h3>
              <p
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: '12px',
                  marginTop: '3px',
                }}
              >
                {checklist?.documentId
                  ? 'Modifiez le nom et les tâches du modèle'
                  : 'Définissez un nom et les tâches du modèle'}
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HiX size={15} />
            </button>
          </div>

          {/* Form name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={dlgLabel}>Nom du modèle</label>
            <input
              type="text"
              placeholder="Ex : Checklist impression offset"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={dlgInput}
              onFocus={(e) =>
                (e.target.style.borderColor = 'rgba(47,111,237,0.5)')
              }
              onBlur={(e) =>
                (e.target.style.borderColor = 'rgba(255,255,255,0.1)')
              }
            />
          </div>

          {/* Tasks */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <label style={dlgLabel}>
                Tâches{' '}
                <span
                  style={{
                    color: 'rgba(129,140,248,0.7)',
                    fontWeight: 400,
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontSize: '11px',
                  }}
                >
                  — glisser pour réordonner · Entrée pour ajouter
                </span>
              </label>
              <span
                style={{
                  background: 'rgba(99,102,241,0.1)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '100px',
                  padding: '1px 8px',
                  color: '#818cf8',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {formItems.filter((i) => i.trim()).length}
              </span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="dialog-items">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      maxHeight: '320px',
                      overflowY: 'auto',
                      paddingRight: '2px',
                    }}
                  >
                    {formItems.map((item, index) => (
                      <Draggable
                        key={`item-${index}`}
                        draggableId={`item-${index}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: snapshot.isDragging
                                ? 'rgba(99,102,241,0.12)'
                                : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${
                                snapshot.isDragging
                                  ? 'rgba(99,102,241,0.4)'
                                  : 'rgba(255,255,255,0.08)'
                              }`,
                              borderRadius: '9px',
                              padding: '6px 8px',
                              boxShadow: snapshot.isDragging
                                ? '0 8px 24px rgba(0,0,0,0.4)'
                                : 'none',
                              ...provided.draggableProps.style,
                            }}
                          >
                            {/* Drag handle */}
                            <div
                              {...provided.dragHandleProps}
                              style={{
                                color: 'rgba(255,255,255,0.2)',
                                cursor: 'grab',
                                display: 'flex',
                                flexShrink: 0,
                                padding: '2px',
                              }}
                            >
                              <MdDragIndicator size={16} />
                            </div>

                            {/* Checkbox visual */}
                            <span
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '4px',
                                border: '1.5px solid rgba(99,102,241,0.4)',
                                flexShrink: 0,
                              }}
                            />

                            {/* Input */}
                            <input
                              ref={(el) => (inputRefs.current[index] = el)}
                              type="text"
                              placeholder={`Tâche ${index + 1}…`}
                              value={item}
                              onChange={(e) => updateItem(index, e.target.value)}
                              onKeyDown={(e) => handleItemKeyDown(e, index)}
                              style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: '13px',
                                fontFamily: 'Inter, sans-serif',
                                padding: '0',
                              }}
                            />

                            {/* Remove */}
                            {formItems.length > 1 && (
                              <button
                                onClick={() => removeItem(index)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'rgba(255,255,255,0.2)',
                                  display: 'flex',
                                  padding: '2px',
                                  flexShrink: 0,
                                  transition: 'color 0.12s',
                                }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.color = '#f87171')
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.color =
                                    'rgba(255,255,255,0.2)')
                                }
                              >
                                <HiX size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {/* Add task */}
            <button
              onClick={() => addItem()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '9px',
                padding: '8px 12px',
                color: '#818cf8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                marginTop: '8px',
                width: '100%',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.15)';
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
              }}
            >
              <HiPlus size={14} /> Ajouter une tâche
            </button>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              paddingTop: '4px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                padding: '9px 18px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '9px',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: '9px 22px',
                background: loading
                  ? 'rgba(47,111,237,0.4)'
                  : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                border: 'none',
                borderRadius: '9px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(47,111,237,0.35)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {loading
                ? 'Enregistrement…'
                : checklist?.documentId
                ? 'Modifier'
                : 'Créer le modèle'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ChecklistsListContent;

// ── Shared dialog styles ──────────────────────────────────────────────────────
const dlgInput: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '9px',
  padding: '10px 14px',
  color: '#fff',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const dlgLabel: React.CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
  marginBottom: '8px',
};
