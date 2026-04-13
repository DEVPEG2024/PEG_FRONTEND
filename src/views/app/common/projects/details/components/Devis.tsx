import { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Container from '@/components/shared/Container';
import { HiUpload, HiDocumentText, HiTrash } from 'react-icons/hi';
import DetailsRight from './DetailsRight';
import { User } from '@/@types/user';
import { RootState, useAppDispatch } from '@/store';
import { addDevis, deleteDevis, useAppSelector } from '../store';
import Empty from '@/components/shared/Empty';
import { GoTasklist } from 'react-icons/go';
import dayjs from 'dayjs';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { toast } from 'react-toastify';
import { apiUploadFile } from '@/services/FileServices';
import { PegFile } from '@/@types/pegFile';

const Devis = () => {
  const { user }: { user: User } = useAppSelector(
    (state: RootState) => state.auth.user
  );
  const dispatch = useAppDispatch();
  const { project, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const devisList: PegFile[] = project?.devis || [];

  const handleUploadDevis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }
    setUploading(true);
    try {
      const uploadedFile = await apiUploadFile(file);
      await dispatch(addDevis({ file: uploadedFile, project }));
      toast.success('Devis téléversé avec succès');
    } catch {
      toast.error('Erreur lors du téléversement du devis');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDevis = (devisFile: PegFile) => {
    if (!window.confirm(`Supprimer le devis "${devisFile.name}" ?`)) return;
    dispatch(deleteDevis({ fileDocumentId: devisFile.documentId, project }));
  };

  const iconBtn = (danger = false): React.CSSProperties => ({
    width: '30px', height: '30px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)',
    color: danger ? '#f87171' : 'rgba(255,255,255,0.55)',
    transition: 'background 0.15s',
  });

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '20px', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleUploadDevis}
              />
              <Button
                loading={uploading}
                onClick={() => fileInputRef.current?.click()}
                variant="twoTone"
                icon={<HiUpload />}
              >
                Téléverser un devis
              </Button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {devisList.length > 0 ? (
              devisList.map((devisFile: PegFile, index: number) => (
                <div
                  key={devisFile.documentId}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', flexShrink: 0 }}>#{index + 1}</span>
                    <HiDocumentText size={16} style={{ color: '#6fa3f5', flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {devisFile.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {devisFile.url && (
                      <a
                        href={devisFile.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...iconBtn(), color: '#6fa3f5', textDecoration: 'none' }}
                        title="Voir le PDF"
                      >
                        <HiDocumentText size={14} />
                      </a>
                    )}
                    {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
                      <button
                        style={iconBtn(true)}
                        onClick={() => handleDeleteDevis(devisFile)}
                        title="Supprimer"
                      >
                        <HiTrash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <Empty icon={<GoTasklist size={80} style={{ color: 'rgba(255,255,255,0.12)' }} />}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '12px' }}>Aucun devis trouvé</p>
                </Empty>
              </div>
            )}
          </div>
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

export default Devis;
