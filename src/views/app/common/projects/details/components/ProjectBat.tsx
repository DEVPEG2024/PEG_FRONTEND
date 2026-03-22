import { useRef, useState } from 'react';
import { MdDownload, MdUploadFile, MdCheckCircle, MdCancel, MdHourglassEmpty } from 'react-icons/md';
import { toast } from 'react-toastify';
import Container from '@/components/shared/Container';
import DetailsRight from './DetailsRight';
import { useAppSelector, getProjectById, useAppDispatch } from '../store';
import { RootState, useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { SUPER_ADMIN } from '@/constants/roles.constant';
import { apiUploadFile } from '@/services/FileServices';
import { apiUpdateBatFile, apiUpdateBatStatus } from '@/services/ProductServices';

const batStatusConfig = {
  pending: {
    label: 'En attente de validation',
    color: '#fbbf24',
    bg: 'rgba(234,179,8,0.12)',
    border: 'rgba(234,179,8,0.3)',
    Icon: MdHourglassEmpty,
  },
  approved: {
    label: 'Validé par le client',
    color: '#4ade80',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.3)',
    Icon: MdCheckCircle,
  },
  rejected: {
    label: 'Refusé par le client',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    Icon: MdCancel,
  },
};

const ProjectBat = () => {
  const dispatch = useAppDispatch();
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const isSuperAdmin = hasRole(user, [SUPER_ADMIN]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [batAction, setBatAction] = useState<'approve' | 'reject' | null>(null);
  const [batCommentInput, setBatCommentInput] = useState('');
  const [batSubmitting, setBatSubmitting] = useState(false);

  const orderItem = project?.orderItem;
  const product = orderItem?.product;
  const batFile = product?.batFile;
  const batStatus = orderItem?.batStatus ?? 'pending';
  const batComment = orderItem?.batComment;
  const statusCfg = batStatusConfig[batStatus] ?? batStatusConfig.pending;
  const { Icon } = statusCfg;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!orderItem?.documentId) {
      toast.error('orderItem introuvable — impossible d\'envoyer le BAT');
      return;
    }
    setUploading(true);
    try {
      const uploaded = await apiUploadFile(file);
      await apiUpdateBatFile(product!.documentId, orderItem.documentId, uploaded.documentId);
      await dispatch(getProjectById(project!.documentId));
      toast.success('Nouveau BAT soumis au client');
    } catch (err) {
      toast.error("Échec de l'envoi du BAT");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleBatSubmit = async () => {
    if (!orderItem?.documentId || !batAction) return;
    if (batAction === 'reject' && !batCommentInput.trim()) {
      toast.error('Veuillez indiquer le motif du refus');
      return;
    }
    setBatSubmitting(true);
    try {
      await apiUpdateBatStatus(
        orderItem.documentId,
        batAction === 'approve' ? 'approved' : 'rejected',
        batAction === 'reject' ? batCommentInput.trim() : null
      );
      setBatAction(null);
      setBatCommentInput('');
      toast.success(batAction === 'approve' ? 'BAT approuvé' : 'BAT refusé');
      await dispatch(getProjectById(project!.documentId));
    } catch {
      toast.error('Erreur lors de la mise à jour du BAT');
    } finally {
      setBatSubmitting(false);
    }
  };

  return (
    <Container className="h-full">
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        paddingTop: '28px',
        paddingBottom: '28px',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          {/* Title */}
          <div>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
              Bon à Tirer
            </p>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em', margin: 0 }}>
              {product?.name}
            </h3>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: statusCfg.bg,
            border: `1px solid ${statusCfg.border}`,
            borderRadius: '100px',
            padding: '6px 14px',
            alignSelf: 'flex-start',
          }}>
            <Icon size={14} style={{ color: statusCfg.color, flexShrink: 0 }} />
            <span style={{ color: statusCfg.color, fontSize: '13px', fontWeight: 600 }}>
              {statusCfg.label}
            </span>
          </div>

          {/* Comment from client (if rejected) */}
          {batStatus === 'rejected' && batComment && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Motif du refus
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                {batComment}
              </p>
            </div>
          )}

          {/* BAT file */}
          {batFile?.url ? (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <MdDownload size={20} style={{ color: '#6b9eff', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {batFile.name}
                </span>
              </div>
              <a
                href={batFile.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'rgba(47,111,237,0.15)',
                  border: '1px solid rgba(47,111,237,0.3)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  color: '#6b9eff',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                Voir / Télécharger
              </a>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '14px',
            }}>
              Aucun BAT disponible
            </div>
          )}

          {/* Client: approve/reject BAT */}
          {!isSuperAdmin && orderItem && batFile?.url && batStatus !== 'approved' && (
            <div>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.08) 60%, transparent)', marginBottom: '20px' }} />
              {batAction === null && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setBatAction('approve')}
                    style={{ flex: 1, minWidth: '140px', background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.35)', borderRadius: '10px', padding: '12px', color: '#4ade80', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <MdCheckCircle size={16} /> Approuver le BAT
                  </button>
                  <button
                    onClick={() => setBatAction('reject')}
                    style={{ flex: 1, minWidth: '140px', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '12px', color: '#f87171', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <MdCancel size={16} /> Refuser le BAT
                  </button>
                </div>
              )}
              {batAction === 'approve' && (
                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'rgba(74,222,128,0.8)', fontWeight: 600 }}>Confirmer l'approbation du BAT ?</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleBatSubmit} disabled={batSubmitting} style={{ flex: 1, background: 'rgba(34,197,94,0.15)', border: '1.5px solid rgba(34,197,94,0.4)', borderRadius: '8px', padding: '10px', color: '#4ade80', fontWeight: 700, fontSize: '13px', cursor: batSubmitting ? 'not-allowed' : 'pointer' }}>
                      {batSubmitting ? 'Envoi...' : 'Confirmer l\'approbation'}
                    </button>
                    <button onClick={() => setBatAction(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 16px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {batAction === 'reject' && (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'rgba(248,113,113,0.7)', fontWeight: 600, marginBottom: '8px' }}>
                    Motif du refus <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <textarea
                    value={batCommentInput}
                    onChange={(e) => setBatCommentInput(e.target.value)}
                    placeholder="Décrivez la raison du refus..."
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 12px', color: '#f8faff', fontSize: '13px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={handleBatSubmit} disabled={batSubmitting || !batCommentInput.trim()} style={{ flex: 1, background: 'rgba(239,68,68,0.15)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '10px', color: '#f87171', fontWeight: 700, fontSize: '13px', cursor: (batSubmitting || !batCommentInput.trim()) ? 'not-allowed' : 'pointer', opacity: !batCommentInput.trim() ? 0.5 : 1 }}>
                      {batSubmitting ? 'Envoi...' : 'Confirmer le refus'}
                    </button>
                    <button onClick={() => { setBatAction(null); setBatCommentInput(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 16px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin: upload BAT (always shown when superAdmin and orderItem exists, except when already approved) */}
          {isSuperAdmin && orderItem && batStatus !== 'approved' && (
            <div>
              <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.08) 60%, transparent)', marginBottom: '20px' }} />
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
                {batStatus === 'rejected' ? 'Envoyer un nouveau BAT' : batFile ? 'Remplacer le BAT' : 'Envoyer le BAT'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.zip,.ai,.psd"
                onChange={handleFileSelected}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  background: uploading ? 'rgba(47,111,237,0.08)' : 'rgba(47,111,237,0.12)',
                  border: '1px dashed rgba(47,111,237,0.4)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  cursor: uploading ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
              >
                <MdUploadFile size={22} style={{ color: '#6b9eff', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#6b9eff', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                    {uploading ? 'Envoi en cours...' : 'Cliquer pour sélectionner un fichier'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', margin: '2px 0 0' }}>
                    PDF, image, ZIP, AI, PSD
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>

        <DetailsRight />
      </div>
    </Container>
  );
};

export default ProjectBat;
