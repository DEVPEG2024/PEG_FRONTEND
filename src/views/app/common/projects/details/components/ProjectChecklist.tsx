import Container from '@/components/shared/Container';
import { ChecklistItem, Checklist } from '@/@types/checklist';
import { RootState } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, PRODUCER } from '@/constants/roles.constant';
import { useAppSelector, setChecklistPercent, updateCurrentProject } from '../store';
import { useAppDispatch } from '@/store';
import { MdChecklist, MdDragIndicator, MdSave } from 'react-icons/md';
import { HiCheck, HiChevronDown, HiTrash, HiPlus, HiPencil } from 'react-icons/hi';
import DetailsRight from './DetailsRight';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetChecklists, apiCreateChecklist } from '@/services/ChecklistServices';
import { apiGetProjectChecklistItems, apiUpdateProjectChecklistItems, apiGetProductChecklist, apiUpdateProject } from '@/services/ProjectServices';
import { unwrapData } from '@/utils/serviceHelper';
import { toast } from 'react-toastify';

const ProjectChecklist = () => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const dispatch = useAppDispatch();

  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const isProducer = hasRole(user, [PRODUCER]);
  // Producteur peut cocher seulement s'il est assigné au projet
  const isAssignedProducer = isProducer && project?.producer?.documentId && user?.producer?.documentId === project.producer.documentId;
  const canToggle = isAdmin || isAssignedProducer; // peut cocher les tâches
  const canEdit = isAdmin; // peut ajouter, supprimer, réordonner, templates

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // D&D: dedicated ref that always holds the latest order during a drag
  const dragFromIdx = useRef<number | null>(null);
  const dragCurrentItems = useRef<ChecklistItem[]>([]);
  const isDragging = useRef(false);

  // Load checklistItems + templates, then auto-apply if empty
  useEffect(() => {
    if (!project?.documentId) return;
    setLoading(true);

    const fetchItems = apiGetProjectChecklistItems(project.documentId)
      .then((res: any) => res?.data?.data?.project?.checklistItems ?? [])
      .catch(() => { setUnavailable(true); return null; });

    const fetchTemplates = canEdit
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
        if (loadedItems === null) return;
        setChecklists(loadedTemplates);
        setUnavailable(false);

        if (loadedItems.length === 0) {
          if (productChecklist) {
            const newItems: ChecklistItem[] = (productChecklist.items ?? []).map((label: string) => ({
              label,
              done: false,
            }));
            if (canEdit) {
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

  useEffect(() => {
    if (editingIdx !== null && editInputRef.current) editInputRef.current.focus();
  }, [editingIdx]);

  useEffect(() => {
    if (saveTemplateOpen && templateInputRef.current) templateInputRef.current.focus();
  }, [saveTemplateOpen]);

  // Persist to API — the single source of truth for saving
  const persistItems = useCallback(async (newItems: ChecklistItem[]) => {
    if (!project?.documentId) return;
    setSaving(true);
    try {
      await apiUpdateProjectChecklistItems(project.documentId, newItems);

      // Auto-toggle project state based on checklist completion
      const allDone = newItems.length > 0 && newItems.every((i) => i.done);
      if (allDone && project.state !== 'fulfilled') {
        await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'fulfilled' }));
        toast.success('Checklist terminée — projet passé en "Terminé"');
      } else if (!allDone && project.state === 'fulfilled') {
        await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'pending' }));
        toast.info('Checklist incomplète — projet repassé en "En cours"');
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [project?.documentId, project?.state, dispatch]);

  // Update items + persist in one go
  const saveItems = useCallback((newItems: ChecklistItem[]) => {
    setItems(newItems);
    persistItems(newItems);
  }, [persistItems]);

  const removeChecklist = () => saveItems([]);

  const applyTemplate = (checklist: Checklist) => {
    const newItems: ChecklistItem[] = (checklist.items ?? []).map((label: string) => ({
      label,
      done: false,
    }));
    saveItems(newItems);
    setAppliedTemplateId(checklist.documentId);
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
    saveItems([...items, { label, done: false }]);
    setNewTaskLabel('');
    setShowAddInput(false);
    toast.success('Tâche ajoutée');
  };

  const removeItem = (index: number) => {
    saveItems(items.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIdx(index);
    setEditingLabel(items[index].label);
  };

  const confirmEdit = () => {
    if (editingIdx === null) return;
    const label = editingLabel.trim();
    if (!label) { cancelEdit(); return; }
    const updated = items.map((item, i) =>
      i === editingIdx ? { ...item, label } : item
    );
    saveItems(updated);
    setEditingIdx(null);
    setEditingLabel('');
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditingLabel('');
  };

  const saveAsTemplate = async () => {
    if (items.length === 0) return;
    const name = templateName.trim();
    if (!name) return;
    const labels = items.map((i) => i.label);
    setSavingTemplate(true);
    try {
      const res = await apiCreateChecklist({ name, items: labels });
      const created = (res as any)?.data?.data?.createChecklist;
      if (created) {
        setChecklists((prev) => [...prev, created]);
        setAppliedTemplateId(created.documentId);
      }
      toast.success(`Modèle "${name}" créé`);
      setSaveTemplateOpen(false);
      setTemplateName('');
    } catch {
      toast.error('Erreur lors de la création du modèle');
    } finally {
      setSavingTemplate(false);
    }
  };

  // ─── Drag & Drop (HTML5, reliable save) ────────────────────────
  const handleDragStart = (e: React.DragEvent, index: number) => {
    isDragging.current = true;
    dragFromIdx.current = index;
    dragCurrentItems.current = [...items]; // snapshot
    setDraggingIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragFromIdx.current === null || dragFromIdx.current === overIndex) return;

    // Reorder in the dedicated ref
    const next = [...dragCurrentItems.current];
    const [moved] = next.splice(dragFromIdx.current, 1);
    next.splice(overIndex, 0, moved);
    dragCurrentItems.current = next;
    dragFromIdx.current = overIndex;

    // Update visual immediately
    setItems(next);
    setDraggingIdx(overIndex);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (isDragging.current) {
      // Save the final order from our dedicated ref — always correct
      const finalItems = [...dragCurrentItems.current];
      setItems(finalItems);
      persistItems(finalItems);
    }
    isDragging.current = false;
    dragFromIdx.current = null;
    dragCurrentItems.current = [];
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
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Checklist du projet
              </p>
              {items.length > 0 && (
                <span style={{ color: saving ? '#fbbf24' : 'rgba(255,255,255,0.6)', fontSize: '12px', transition: 'color 0.2s' }}>
                  {saving ? '● Sauvegarde...' : `${doneCount} / ${items.length} effectuée${doneCount > 1 ? 's' : ''}`}
                </span>
              )}
            </div>

            {/* Actions admin/producer */}
            {canEdit && !unavailable && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

                {items.length > 0 && (
                  !saveTemplateOpen ? (
                    <button
                      onClick={() => setSaveTemplateOpen(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '8px',
                        background: 'rgba(168,85,247,0.12)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        color: '#c084fc', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <MdSave size={13} />
                      Créer nouveau modèle
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        ref={templateInputRef}
                        type="text"
                        placeholder="Nom du modèle…"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveAsTemplate(); if (e.key === 'Escape') { setSaveTemplateOpen(false); setTemplateName(''); } }}
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(168,85,247,0.3)',
                          borderRadius: '8px',
                          color: 'rgba(255,255,255,0.85)',
                          fontSize: '12px',
                          padding: '6px 10px',
                          outline: 'none',
                          fontFamily: 'inherit',
                          width: '160px',
                        }}
                      />
                      <button
                        onClick={saveAsTemplate}
                        disabled={!templateName.trim() || savingTemplate}
                        style={{
                          padding: '6px 12px', borderRadius: '8px',
                          background: templateName.trim() ? 'linear-gradient(90deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.05)',
                          border: 'none',
                          color: '#fff', fontSize: '12px', fontWeight: 700,
                          cursor: templateName.trim() ? 'pointer' : 'not-allowed',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {savingTemplate ? '...' : 'Créer'}
                      </button>
                      <button
                        onClick={() => { setSaveTemplateOpen(false); setTemplateName(''); }}
                        style={{
                          padding: '6px 8px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.6)', fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}

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
                            <span style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '2px' }}>
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
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>Chargement...</p>
            </div>
          ) : unavailable ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
              <MdChecklist size={60} style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>Fonctionnalité non disponible sur cet environnement</p>
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
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>Aucune checklist associée à ce projet</p>
                  {canEdit && (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                      Utilisez "Ajouter une tâche" ou "Modèle" ci-dessus
                    </p>
                  )}
                </div>
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {items.map((item, index) => (
                    <div
                      key={`item-${index}`}
                      draggable={canEdit && !saving}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '11px 14px', borderRadius: '10px',
                        background: draggingIdx === index
                          ? 'rgba(47,111,237,0.12)'
                          : item.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${
                          draggingIdx === index
                            ? 'rgba(47,111,237,0.4)'
                            : item.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'
                        }`,
                        cursor: canEdit ? 'grab' : 'default',
                        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                        opacity: saving && draggingIdx === null ? 0.6 : 1,
                        transform: draggingIdx === index ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: draggingIdx === index ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
                        userSelect: 'none',
                      }}
                    >
                      {/* Drag handle */}
                      {canEdit && (
                        <MdDragIndicator
                          size={16}
                          style={{
                            color: draggingIdx === index ? 'rgba(47,111,237,0.6)' : 'rgba(255,255,255,0.15)',
                            flexShrink: 0,
                            cursor: 'grab',
                          }}
                        />
                      )}

                      {/* Checkbox */}
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleItem(index); }}
                        style={{
                          width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                          background: item.done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${item.done ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                          cursor: canToggle ? 'pointer' : 'default',
                        }}
                      >
                        {item.done && <HiCheck size={12} style={{ color: '#4ade80' }} />}
                      </div>

                      {/* Label */}
                      {editingIdx === index && canEdit ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          onBlur={confirmEdit}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            flex: 1,
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(47,111,237,0.4)',
                            borderRadius: '6px',
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: '13px',
                            fontWeight: 500,
                            padding: '4px 8px',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                      ) : (
                        <span
                          onDoubleClick={() => { if (canEdit) startEdit(index); }}
                          style={{
                            flex: 1,
                            color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)',
                            fontSize: '13px',
                            fontWeight: 500,
                            textDecoration: item.done ? 'line-through' : 'none',
                            transition: 'color 0.15s',
                            cursor: canEdit ? 'text' : 'default',
                          }}>
                          {item.label}
                        </span>
                      )}

                      {/* Status for customers */}
                      {!canToggle && (
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          color: item.done ? '#4ade80' : 'rgba(255,255,255,0.25)',
                        }}>
                          {item.done ? 'Effectuée' : 'En attente'}
                        </span>
                      )}

                      {/* Edit button for admins */}
                      {canEdit && editingIdx !== index && (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(index); }}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                            background: 'transparent', border: 'none',
                            color: 'rgba(255,255,255,0.15)', cursor: 'pointer',
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#6fa3f5')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}
                          title="Modifier"
                        >
                          <HiPencil size={13} />
                        </button>
                      )}

                      {/* Delete button for admins */}
                      {canEdit && (
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
              {showAddInput && canEdit && (
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
