import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { env } from '@/configs/env.config';

const resolveUrl = (url: string) => url.startsWith('http') ? url : env.API_ENDPOINT_URL + url;
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import ReactHtmlParser from 'html-react-parser';
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
import { SUPER_ADMIN } from '@/constants/roles.constant';
import {
  useAppSelector,
  updateCurrentProject,
  setEditDescription,
  getProjectById,
} from '../store';
import { apiGetPegFiles, apiUploadFile } from '@/services/FileServices';

const sep: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 75%, transparent)',
  margin: '22px 0',
};

// Fix #6 : strip HTML via DOM plutôt que regex fragile
const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? '';
};

// Fix #8 : ID de gradient unique par instance via useId
const CircularProgress = ({ percent, label = 'tâches' }: { percent: number; label?: string }) => {
  const rawId = useId();
  const gradId = `pgGrad-${rawId.replace(/:/g, '')}`;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
      <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2f6fed" />
            <stop offset="100%" stopColor="#1f4bb6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="8"
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
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.03em', lineHeight: 1 }}>{percent}%</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.03em', marginTop: '3px' }}>{label}</span>
      </div>
    </div>
  );
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
      const existingPegFiles = project.images?.length > 0
        ? await apiGetPegFiles(project.images)
        : [];
      await dispatch(
        updateCurrentProject({
          documentId: project.documentId,
          // Fix #5 : cast number[] au lieu de any
          images: [...existingPegFiles.map(({ id }) => id), pegFile.id] as number[],
        })
      );
      await dispatch(getProjectById(project.documentId));
    } catch (err) {
      console.error('Photo upload failed:', err);
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

  // Fix #6 : strip HTML calculé en amont, réutilisé dans le JSX
  const strippedDescription = project.description ? stripHtml(project.description) : '';

  return (
    <Container className="h-full">
      <Loading loading={loading}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '20px',
          paddingTop: '28px',
          paddingBottom: '28px',
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
            {/* Main card */}
            <div style={{
              background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
              borderRadius: '18px',
              overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
              display: 'flex',
            }}>
              {/* Image sidebar */}
              {project.orderItem?.product?.images?.[0]?.url ? (
                <div style={{
                  width: '200px',
                  flexShrink: 0,
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                }}>
                  <img
                    src={resolveUrl(project.orderItem.product.images[0].url)}
                    alt={project.orderItem.product.name}
                    style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '8px' }}
                  />
                </div>
              ) : !project.orderItem ? (
                <div style={{
                  width: '200px',
                  flexShrink: 0,
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  gap: '10px',
                }}>
                  {project.images?.[0]?.url ? (
                    <img
                      src={resolveUrl(project.images[0].url)}
                      alt={project.name}
                      style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  ) : (
                    <div style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '12px',
                      background: 'rgba(47,111,237,0.08)',
                      border: '1px solid rgba(47,111,237,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <HiPhotograph style={{ fontSize: '48px', color: 'rgba(47,111,237,0.4)' }} />
                    </div>
                  )}
                  {hasRole(user, [SUPER_ADMIN]) && (
                    // Fix #4 : couleur via état React, plus de mutation DOM directe
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: uploadingPhoto ? 'wait' : 'pointer',
                        color: photoLabelHovered ? '#fff' : 'rgba(255,255,255,0.5)',
                        fontSize: '12px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px dashed rgba(255,255,255,0.2)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={() => setPhotoLabelHovered(true)}
                      onMouseLeave={() => setPhotoLabelHovered(false)}
                    >
                      <HiPhotograph />
                      {uploadingPhoto ? 'Upload...' : project.images?.[0]?.url ? 'Changer' : 'Ajouter une photo'}
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
              ) : null}

              {/* Content */}
              <div style={{ flex: 1, padding: '28px', minWidth: 0 }}>
                {/* Progress + project name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '8px' }}>
                  <CircularProgress percent={percentageComplete} label={checklistPercent !== null ? 'checklist' : 'tâches'} />
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em', marginBottom: '8px', lineHeight: 1.25 }}>
                      {project.name}
                    </h3>
                    {project.description && !project.orderItem && (
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.5 }}>
                        {strippedDescription.slice(0, 120)}
                        {strippedDescription.length > 120 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div style={sep} />

                {project.orderItem ? (
                  <OrderItemDetails
                    orderItem={project.orderItem}
                    customer={project.customer!}
                    hideImage
                  />
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Description détaillée
                      </p>
                      {hasRole(user, [SUPER_ADMIN]) && (
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
                    {hasRole(user, [SUPER_ADMIN]) && editDescription ? (
                      <RichTextEditor value={description} onChange={onEdit} />
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.7 }}>
                        {ReactHtmlParser(description || '')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right details */}
            <DetailsRight />
          </div>
        </div>
      </Loading>
    </Container>
  );
};

export default Summary;
