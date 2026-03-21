import Container from '@/components/shared/Container';
import { ChecklistItem, Checklist } from '@/@types/checklist';
import { RootState } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, PRODUCER } from '@/constants/roles.constant';
import { useAppSelector, setChecklistPercent, updateCurrentProject } from '../store';
import { useAppDispatch } from '@/store';
import { MdChecklist, MdDragIndicator } from 'react-icons/md';
import { HiCheck, HiChevronDown, HiTrash, HiPlus } from 'react-icons/hi';
import DetailsRight from './DetailsRight';
import { useEffect, useRef, useState } from 'react';
import { apiGetChecklists } from '@/services/ChecklistServices';
import { apiGetProjectChecklistItems, apiUpdateProjectChecklistItems, apiGetProductChecklist, apiUpdateProject } from '@/services/ProjectServices';
import { unwrapData } from '@/utils/serviceHelper';
import { toast } from 'react-toastify';

const ProjectChecklist = () => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const dispatch = useAppDispatch();

  const canToggle = hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]);

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Load checklistItems + templates, then auto-apply if empty
  useEffect(() => {
    if (!project?.documentId) return;
    setLoading(true);

    const fetchItems = apiGetProjectChecklistItems(project.documentId)
      .then((res: any) => res?.data?.data?.project?.checklistItems ?? [])
      .catch(() => { setUnavailable(true); return null; });

    const fetchTemplates = canToggle
      ? unwrapData(apiGetChecklists())
          .then((data: { checklists_connection: { nodes: Checklist[] } }) =>
            data.checklists_connection?.nodes ?? []
          )
          .catch(() => [] as Checklist[])
      : Promise.resolve([] as Checklist[]);

    const productDocumentId = project.orderItem?.product?.documentId;
    const fetchProductChecklist = productDocumentId
      ? apiGetProductChecklist(productDocumentId)
          .then((res: any) => res?.data?.data?.product?.checklist ?? null)
          .catch(() => null)
      : Promise.resolve(null);

    Promise.all([fetchItems, fetchTemplates, fetchProductChecklist])
      .then(([loadedItems, loadedTemplates, productChecklist]) => {
        if (loadedItems === null) return; // unavailable
        setChecklists(loadedTemplates);
        setUnavailable(false);

        if (loadedItems.length === 0) {
          if (productChecklist) {
            const newItems: ChecklistItem[] = (productChecklist.items ?? []).map((label: string) => ({
              label,
              done: false,
            }));
            if (canToggle) {
              apiUpdateProjectChecklistItems(project.documentId, newItems)
                .then(() => setItems(newItems))
                .catch(() => setItems(newItems));
            } else {
              setItems(newItems);
            }
          }
        } else {
          setItems(loadedItems);
        }
      })
      .finally(() => setLoading(false));
  }, [project?.documentId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showAddInput && addInputRef.current) addInputRef.current.focus();
  }, [showAddInput]);

  const saveItems = async (newItems: ChecklistItem[]) => {
    if (!project?.documentId) return;
    setSaving(true);
    try {
      await apiUpdateProjectChecklistItems(project.documentId, newItems);
      setItems(newItems);

      // Auto-toggle project state based on checklist completion
      const allDone = newItems.length > 0 && newItems.every((i) => i.done);
      if (allDone && project.state !== 'fulfilled') {
        await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'fulfilled' }));
        toast.success('Checklist terminée — projet passé en "Terminé"');
      } else if (!allDone && project.state === 'fulfilled') {
        await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'pending' }));
        toast.info('Checklist incomplète — projet repassé en "En cours"');
      }
    } finally {
      setSaving(false);
    }
  };

  const removeChecklist = () => {
    saveItems([]);
  };

  const applyTemplate = (checklist: Checklist) => {
    const newItems: ChecklistItem[] = (checklist.items ?? []).map((label: string) => ({
      label,
      done: false,
    }));
    saveItems(newItems);
    setDropdownOpen(false);
  };

  const toggleItem = (index: number) => {
    if (!canToggle) return;
    const updated = items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    saveItems(updated);
  };

  const addTask = () => {
    const label = newTaskLabel.trim();
    if (!label) return;
    const updated = [...items, { label, done: false }];
    saveItems(updated);
    setNewTaskLabel('');
    setShowAddInput(false);
    toast.success('Tâche ajoutée');
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    saveItems(updated);
  };

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    dragIdx.current = index;
    setDraggingIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === index) return;
    if (dragOverIdx.current === index) return;
    dragOverIdx.current = index;

    const next = [...items];
    const [removed] = next.splice(dragIdx.current, 1);
    next.splice(index, 0, removed);
    dragIdx.current = index;
    setItems(next);
  };

  const handleDragEnd = () => {
    if (dragIdx.current !== null) {
      // Save new order
      saveItems([...items]);
    }
    dragIdx.current = null;
    dragOverIdx.current = null;
    setDraggingIdx(null);
  };

  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  useEffect(() => {
    dispatch(setChecklistPercent(items.length > 0 ? percent : null));
  }, [percent, items.length]);

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Checklist du projet
              </p>
              {items.length > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  {saving ? 'Sauvegarde...' : `${doneCount} / ${items.length} effectuée${doneCount > 1 ? 's' : ''}`}
                </span>
              )}
            </div>

            {/* Actions admin/producer */}
            {canToggle && !unavailable && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                {/* Add task button */}
                <button
                  onClick={() => setShowAddInput(true)}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '8px',
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#4ade80', fontSize: '12px', fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  <HiPlus size={13} />
                  Ajouter une tâche
                </button>

                {/* Remove checklist button */}
                {items.length > 0 && (
                  <button
                    onClick={removeChecklist}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#f87171', fontSize: '12px', fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    <HiTrash size={13} />
                    Retirer
                  </button>
                )}

                {/* Apply template dropdown */}
                {checklists.length > 0 && (
                  <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button
                      onClick={() => setDropdownOpen((v) => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '8px',
                        background: 'rgba(47,111,237,0.15)',
                        border: '1px solid rgba(47,111,237,0.3)',
                        color: '#6fa3f5', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <MdChecklist size={14} />
                      Modèle
                      <HiChevronDown size={12} style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                    </button>

                    {dropdownOpen && (
                      <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                        background: '#1a2d47', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 100, minWidth: '200px',
                      }}>
                        {checklists.map((cl) => (
                          <button
                            key={cl.documentId}
                            onClick={() => applyTemplate(cl)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '10px 14px',
                              background: 'transparent',
                              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                              color: 'rgba(255,255,255,0.75)', fontSize: '13px',
                              cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {cl.name}
                            <span style={{ display: 'block', color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>
                              {(cl.items ?? []).length} étape{(cl.items ?? []).length > 1 ? 's' : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Loading state */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Chargement...</p>
            </div>
          ) : unavailable ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
              <MdChecklist size={60} style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Fonctionnalité non disponible sur cet environnement</p>
            </div>
          ) : (
            <>
              {/* Progress bar */}
              {items.length > 0 && (
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', marginBottom: '20px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${percent}%`,
                    background: percent === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                    borderRadius: '100px',
                    transition: 'width 0.4s ease',
                    boxShadow: percent === 100 ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(47,111,237,0.5)',
                  }} />
                </div>
              )}

              {items.length === 0 && !showAddInput ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
                  <MdChecklist size={60} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Aucune checklist associée à ce projet</p>
                  {canToggle && (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                      Utilisez "Ajouter une tâche" ou "Modèle" ci-dessus
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {items.map((item, index) => (
                    <div
                      key={`${index}-${item.label}`}
                      draggable={canToggle}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleItem(index)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '11px 14px', borderRadius: '10px',
                        background: item.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${item.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
                        cursor: canToggle ? 'grab' : 'default',
                        transition: 'all 0.15s ease',
                        opacity: draggingIdx === index ? 0.4 : saving ? 0.6 : 1,
                      }}
                    >
                      {/* Drag handle */}
                      {canToggle && (
                        <MdDragIndicator
                          size={16}
                          style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0, cursor: 'grab' }}
                        />
                      )}

                      {/* Checkbox */}
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                        background: item.done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${item.done ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}>
                        {item.done && <HiCheck size={12} style={{ color: '#4ade80' }} />}
                      </div>

                      {/* Label */}
                      <span style={{
                        flex: 1,
                        color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)',
                        fontSize: '13px',
                        fontWeight: 500,
                        textDecoration: item.done ? 'line-through' : 'none',
                        transition: 'color 0.15s',
                      }}>
                        {item.label}
                      </span>

                      {/* Status for customers */}
                      {!canToggle && (
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          color: item.done ? '#4ade80' : 'rgba(255,255,255,0.25)',
                        }}>
                          {item.done ? 'Effectuée' : 'En attente'}
                        </span>
                      )}

                      {/* Delete button for admins */}
                      {canToggle && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                            background: 'transparent', border: 'none',
                            color: 'rgba(255,255,255,0.15)', cursor: 'pointer',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
                          title="Supprimer"
                        >
                          <HiTrash size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add task inline input */}
              {showAddInput && canToggle && (
                <div style={{
                  display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center',
                }}>
                  <input
                    ref={addInputRef}
                    type="text"
                    placeholder="Nom de la tâche…"
                    value={newTaskLabel}
                    onChange={(e) => setNewTaskLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setShowAddInput(false); setNewTaskLabel(''); } }}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(34,197,94,0.3)',
                      borderRadius: '8px',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '13px',
                      padding: '10px 12px',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={addTask}
                    disabled={!newTaskLabel.trim()}
                    style={{
                      padding: '10px 16px', borderRadius: '8px',
                      background: newTaskLabel.trim() ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      color: '#fff', fontSize: '12px', fontWeight: 700,
                      cursor: newTaskLabel.trim() ? 'pointer' : 'not-allowed',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => { setShowAddInput(false); setNewTaskLabel(''); }}
                    style={{
                      padding: '10px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              )}

              {!canToggle && items.length > 0 && (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center', marginTop: '16px' }}>
                  Seuls les administrateurs et producteurs peuvent modifier la checklist
                </p>
              )}
            </>
          )}
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default ProjectChecklist;
