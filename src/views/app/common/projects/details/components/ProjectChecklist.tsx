import Container from '@/components/shared/Container';
import { ChecklistItem, Checklist } from '@/@types/checklist';
import { RootState } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, PRODUCER } from '@/constants/roles.constant';
import { updateCurrentProject, useAppDispatch, useAppSelector } from '../store';
import { MdChecklist } from 'react-icons/md';
import { HiCheck, HiChevronDown } from 'react-icons/hi';
import DetailsRight from './DetailsRight';
import { useEffect, useRef, useState } from 'react';
import { apiGetChecklists } from '@/services/ChecklistServices';
import { unwrapData } from '@/utils/serviceHelper';

const ProjectChecklist = () => {
  const dispatch = useAppDispatch();
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const canToggle = hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]);
  const items: ChecklistItem[] = project?.checklistItems ?? [];
  const doneCount = items.filter((i) => i.done).length;

  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canToggle) return;
    setLoadingTemplates(true);
    unwrapData(apiGetChecklists())
      .then((data: { checklists_connection: { nodes: Checklist[] } }) => {
        setChecklists(data.checklists_connection?.nodes ?? []);
      })
      .catch(() => setChecklists([]))
      .finally(() => setLoadingTemplates(false));
  }, [canToggle]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyTemplate = (checklist: Checklist) => {
    if (!project) return;
    const newItems: ChecklistItem[] = (checklist.items ?? []).map((label: string) => ({
      label,
      done: false,
    }));
    dispatch(updateCurrentProject({ documentId: project.documentId, checklistItems: newItems }));
    setDropdownOpen(false);
  };

  const toggleItem = (index: number) => {
    if (!canToggle || !project) return;
    const updated = items.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    dispatch(updateCurrentProject({ documentId: project.documentId, checklistItems: updated }));
  };

  const percent = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Checklist du projet
              </p>
              {items.length > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                  {doneCount} / {items.length} effectuée{doneCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Apply template dropdown (admin/producer only) */}
            {canToggle && checklists.length > 0 && (
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  disabled={loadingTemplates}
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
                  Appliquer un modèle
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

          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
              <MdChecklist size={60} style={{ color: 'rgba(255,255,255,0.1)' }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Aucune checklist associée à ce projet</p>
              {canToggle && (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                  {checklists.length > 0
                    ? 'Utilisez le bouton "Appliquer un modèle" ci-dessus pour associer une checklist'
                    : 'Créez d\'abord un modèle de checklist dans la section Administration'}
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => toggleItem(index)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '10px',
                    background: item.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${item.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    cursor: canToggle ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                    background: item.done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${item.done ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {item.done && <HiCheck size={12} style={{ color: '#4ade80' }} />}
                  </div>
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
                  {!canToggle && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      color: item.done ? '#4ade80' : 'rgba(255,255,255,0.25)',
                    }}>
                      {item.done ? 'Effectuée' : 'En attente'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!canToggle && items.length > 0 && (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', textAlign: 'center', marginTop: '16px' }}>
              Seuls les administrateurs et producteurs peuvent modifier la checklist
            </p>
          )}
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default ProjectChecklist;
