import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { env } from '@/configs/env.config';

const resolveUrl = (url: string) => url.startsWith('http') ? url : env.API_ENDPOINT_URL + url;
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import { safeHtmlParse } from '@/utils/sanitizeHtml';
import { Project } from '@/@types/project';
import DetailsRight from './DetailsRight';
import { Button } from '@/components/ui';
import OrderItemDetails from './OrderItemDetails';
import { debounce } from 'lodash';
import { HiPencil, HiPhotograph } from 'react-icons/hi';
import { RichTextEditor } from '@/components/shared';
import { User } from '@/@types/user';
import {
  RootState,
  useAppDispatch,
  useAppSelector as useRootAppSelector,
} from '@/store';
import { hasRole } from '@/utils/permissions';
import { SUPER_ADMIN, ADMIN } from '@/constants/roles.constant';
import {
  useAppSelector,
  updateCurrentProject,
  setEditDescription,
  getProjectById,
} from '../store';
import { apiUploadFile } from '@/services/FileServices';
import { toast } from 'react-toastify';

// Fix #6 : strip HTML via DOM plutôt que regex fragile
const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
};

// Fix #8 : ID de gradient unique par instance via useId
const CircularProgress = ({ percent, label = 'tâches', size = 88 }: { percent: number; label?: string; size?: number }) => {
  const rawId = useId();
  const gradId = `pgGrad-${rawId.replace(/:/g, '')}`;
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2f6fed" />
            <stop offset="100%" stopColor="#6b9eff" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: `${size * 0.22}px`, letterSpacing: '-0.03em', lineHeight: 1 }}>{percent}%</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: `${size * 0.1}px`, letterSpacing: '0.03em', marginTop: '2px' }}>{label}</span>
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(22,38,61,0.8) 0%, rgba(15,28,46,0.9) 100%)',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.06)',
};

const sectionLabel: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '14px',
};

const Summary = ({ project }: { project: Project }) => {
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  // Fix #2 : un seul useAppSelector pour le même slice
  const { loading, editDescription, checklistPercent } = useAppSelector(
    (state) => state.projectDetails.data
  );

  const dispatch = useAppDispatch();
  const [description, setDescription] = useState(project.description);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Fix #4 : état React pour le hover plutôt que manipulation DOM directe
  const [photoLabelHovered, setPhotoLabelHovered] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Fix #1 : debounce stabilisé via useMemo — plus recréé à chaque render
  const debounceFn = useMemo(
    () => debounce((val: string) => setDescription(val), 1000),
    []
  );

  useEffect(() => {
    return () => {
      dispatch(setEditDescription(false));
      debounceFn.cancel(); // Fix #1 : annuler les appels pendants au démontage
    };
  }, [dispatch, debounceFn]);

  const onEditModeActive = () => {
    dispatch(setEditDescription(true));
  };

  const onEditComplete = () => {
    dispatch(
      updateCurrentProject({
        documentId: project.documentId,
        description,
      })
    );
  };

  const onEdit = (val: string) => {
    debounceFn(val);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const pegFile = await apiUploadFile(file);
      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          images: [pegFile.id] as number[],
        })
      ).unwrap();
      await dispatch(getProjectById(project.documentId));
    } catch (err) {
      toast.error("Échec de l'envoi de la photo");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // Fix #3 : null guard cohérent sur tasks
  const tasks = project.tasks ?? [];
  const completedTasksCount = tasks.filter((task) => task.state === 'fulfilled').length;
  const taskPercent = tasks.length > 0
    ? Number(((completedTasksCount / tasks.length) * 100).toFixed(0))
    : 0;
  const percentageComplete = checklistPercent !== null ? checklistPercent : taskPercent;

  // Admin notes
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesValue, setNotesValue] = useState(project.adminNotes ?? '');
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNotesValue(project.adminNotes ?? '');
  }, [project.adminNotes]);

  useEffect(() => {
    if (notesEditing && notesRef.current) {
      notesRef.current.focus();
      notesRef.current.selectionStart = notesRef.current.value.length;
    }
  }, [notesEditing]);

  const saveNotes = useCallback(() => {
    const trimmed = notesValue.trim();
    if (trimmed !== (project.adminNotes ?? '').trim()) {
      dispatch(updateCurrentProject({ documentId: project.documentId, adminNotes: trimmed || '' }));
      toast.success('Notes sauvegardées');
    }
    setNotesEditing(false);
  }, [notesValue, project.adminNotes, project.documentId, dispatch]);

  const hasImage = project.orderItem?.product?.images?.[0]?.url || (!project.orderItem && project.images?.[0]?.url);
  const imageUrl = project.orderItem?.product?.images?.[0]?.url
    ? resolveUrl(project.orderItem.product.images[0].url)
    : project.images?.[0]?.url
      ? resolveUrl(project.images[0].url)
      : null;

  return (
    <Container className="h-full">
      <Loading loading={loading}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '14px',
          paddingTop: '20px',
          paddingBottom: '20px',
          fontFamily: 'Inter, sans-serif',
          alignItems: 'start',
        }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Top row: Image + Progress circle + Project name */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'stretch' }}>
              {/* Image column */}
              {(hasImage || !project.orderItem) && (
                <div style={{
                  width: '180px',
                  flexShrink: 0,
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(0,0,0,0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  gap: '10px',
                }}>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={project.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '140px',
                        objectFit: 'contain',
                        borderRadius: '10px',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '14px',
                      background: 'rgba(47,111,237,0.06)',
                      border: '1px dashed rgba(47,111,237,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <HiPhotograph style={{ fontSize: '36px', color: 'rgba(47,111,237,0.3)' }} />
                    </div>
                  )}
                  {hasRole(user, [SUPER_ADMIN, ADMIN]) && !project.orderItem && (
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        cursor: uploadingPhoto ? 'wait' : 'pointer',
                        color: photoLabelHovered ? '#fff' : 'rgba(255,255,255,0.4)',
                        fontSize: '11px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px dashed rgba(255,255,255,0.15)',
                        transition: 'all 0.2s',
                        fontWeight: 500,
                      }}
                      onMouseEnter={() => setPhotoLabelHovered(true)}
                      onMouseLeave={() => setPhotoLabelHovered(false)}
                    >
                      <HiPhotograph size={13} />
                      {uploadingPhoto ? 'Upload...' : project.images?.[0]?.url ? 'Changer' : 'Ajouter'}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Progress + Name */}
              <div style={{ flex: 1, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                <CircularProgress percent={percentageComplete} label={checklistPercent !== null ? 'checklist' : 'tâches'} size={88} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '17px',
                    letterSpacing: '-0.01em',
                    marginBottom: '6px',
                    lineHeight: 1.3,
                  }}>
                    {project.name}
                  </h3>
                  {project.customer?.name && (
                    <p style={{
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '11px',
                      margin: 0,
                    }}>
                      {project.customer.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description card */}
            {project.orderItem ? (
              <div style={{ ...cardStyle, padding: '24px 28px' }}>
                <OrderItemDetails
                  orderItem={project.orderItem}
                  customer={project.customer!}
                  hideImage
                />
              </div>
            ) : (
              <div style={{ ...cardStyle, padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <p style={sectionLabel}>
                    Description détaillée
                  </p>
                  {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
                    <div>
                      {editDescription ? (
                        <Button size="sm" variant="solid" onClick={onEditComplete} loading={loading}>
                          Terminer
                        </Button>
                      ) : (
                        <Button size="sm" icon={<HiPencil />} onClick={onEditModeActive}>
                          Modifier
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {hasRole(user, [SUPER_ADMIN, ADMIN]) && editDescription ? (
                  <RichTextEditor value={description} onChange={onEdit} />
                ) : (
                  <div style={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: '13.5px',
                    lineHeight: 1.75,
                  }}>
                    {safeHtmlParse(description || '')}
                  </div>
                )}
              </div>
            )}

            {/* Admin Notes card */}
            {isAdmin && (
              <div style={{ ...cardStyle, padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <p style={sectionLabel}>Notes internes</p>
                  {!notesEditing && (
                    <Button size="sm" icon={<HiPencil />} onClick={() => setNotesEditing(true)}>
                      Modifier
                    </Button>
                  )}
                </div>
                {notesEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                      ref={notesRef}
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { setNotesValue(project.adminNotes ?? ''); setNotesEditing(false); }
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNotes();
                      }}
                      placeholder="Notes visibles uniquement par les admins..."
                      style={{
                        width: '100%', minHeight: '100px', resize: 'vertical',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(47,111,237,0.3)',
                        borderRadius: '10px',
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '13px', lineHeight: '1.6',
                        padding: '12px 14px',
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
                        Ctrl+Entrée pour sauvegarder · Échap pour annuler
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" onClick={() => { setNotesValue(project.adminNotes ?? ''); setNotesEditing(false); }}>
                          Annuler
                        </Button>
                        <Button size="sm" variant="solid" onClick={saveNotes}>
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setNotesEditing(true)}
                    style={{
                      color: notesValue ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)',
                      fontSize: '13.5px',
                      lineHeight: 1.75,
                      whiteSpace: 'pre-wrap',
                      cursor: 'pointer',
                      minHeight: '24px',
                    }}
                  >
                    {notesValue || 'Cliquer pour ajouter des notes...'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column — details */}
          <DetailsRight />
        </div>
      </Loading>
    </Container>
  );
};

export default Summary;
