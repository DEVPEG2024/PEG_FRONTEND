import { useState, useRef } from 'react';
import { HiArrowRight, HiArrowLeft, HiCheck, HiX, HiPhotograph, HiPlus } from 'react-icons/hi';
import { MdLocalShipping, MdCheckCircle, MdCameraAlt } from 'react-icons/md';
import { toast } from 'react-toastify';
import { apiUploadFile } from '@/services/FileServices';
import { useAppSelector, updateCurrentProject, getProjectById } from '../store';
import { useAppDispatch } from '@/store';
import { apiUpdateProjectChecklistItems } from '@/services/ProjectServices';
import { ChecklistItem } from '@/@types/checklist';
import { triggerNotification } from '@/services/NotificationService';
import { RootState, useAppSelector as useRootAppSelector } from '@/store';
import { env } from '@/configs/env.config';

const ensureAbsoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return (env?.API_ENDPOINT_URL || '') + url;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const StepDot = ({ current, total }: { current: number; total: number }) => (
  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        width: i === current ? '32px' : '8px', height: '8px', borderRadius: '100px',
        background: i < current ? '#22c55e' : i === current ? 'linear-gradient(90deg, #fb923c, #ea580c)' : 'rgba(255,255,255,0.08)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: i === current ? '0 0 10px rgba(251,146,60,0.4)' : 'none',
      }} />
    ))}
  </div>
);

const DeliveryWizard = ({ open, onClose }: Props) => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user } = useRootAppSelector((state: RootState) => state.auth.user);
  const dispatch = useAppDispatch();

  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [qualityChecks, setQualityChecks] = useState<Record<string, boolean>>({
    'Qualité conforme au BAT': false,
    'Couleurs vérifiées': false,
    'Quantité correcte': false,
    'Emballage sécurisé': false,
    'Aucun défaut visible': false,
  });
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allChecked = Object.values(qualityChecks).every(Boolean);
  const checkedCount = Object.values(qualityChecks).filter(Boolean).length;
  const totalChecks = Object.keys(qualityChecks).length;

  const reset = () => {
    setStep(0);
    setPhotos([]);
    setQualityChecks(Object.fromEntries(Object.keys(qualityChecks).map((k) => [k, false])));
    setNotes('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!project?.documentId) return;
    setUploading(true);

    try {
      // Upload photos and collect their uploaded objects (with id/documentId)
      const uploadedImages: any[] = [];
      for (const file of photos) {
        try {
          const uploaded = await apiUploadFile(file);
          if (uploaded) uploadedImages.push(uploaded);
        } catch {}
      }

      // Mark all checklist items as done
      const checklistItems: ChecklistItem[] = (project.checklistItems || []).map((item: ChecklistItem) => ({ ...item, done: true }));
      if (checklistItems.length > 0) {
        await apiUpdateProjectChecklistItems(project.documentId, checklistItems);
      }

      // Update project: state fulfilled + attach delivery photos to project images
      const existingImages = (project.images || []).map((img: any) => img.documentId || img.id || img);
      const newImageIds = uploadedImages.map((img) => img.documentId || img.id).filter(Boolean);
      const updateData: any = {
        documentId: project.documentId,
        state: 'fulfilled',
        images: [...existingImages, ...newImageIds],
      };
      // Store delivery note separately — don't pollute description
      if (notes.trim()) {
        updateData.description = (project.description || '') + '\n\n--- Note de livraison (' + new Date().toLocaleDateString('fr-FR') + ') ---\n' + notes.trim();
      }
      await dispatch(updateCurrentProject(updateData));

      // Send notification to customer
      const senderId = user?.documentId || user?.id || user?._id;
      if (senderId && project.customer?.documentId) {
        triggerNotification({
          eventType: 'project_status_change',
          senderId,
          recipients: [{ userId: project.customer.documentId }],
          notifyAdmins: true,
          title: 'Projet livré',
          message: 'Le projet "' + project.name + '" a été livré par le producteur',
          link: '/common/projects/details/' + project.documentId,
          metadata: { projectId: project.documentId },
        });
      }

      await dispatch(getProjectById(project.documentId));
      toast.success('Livraison confirmée — projet terminé');
      reset();
    } catch {
      toast.error('Erreur lors de la livraison');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) reset(); }}>
      <div style={{
        width: '540px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        background: 'linear-gradient(160deg, #1a2d47 0%, #0f1c2e 100%)',
        borderRadius: '20px', padding: '32px', position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={(e) => e.stopPropagation()}>

        <button onClick={reset} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
        }}><HiX size={16} /></button>

        <StepDot current={step} total={3} />

        {/* ═══ Step 0: Photos ═══ */}
        {step === 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px', background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(251,146,60,0.05))', border: '1px solid rgba(251,146,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MdCameraAlt size={28} style={{ color: '#fb923c' }} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>Photos du produit fini</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 24px' }}>Photographiez le résultat avant expédition</p>

            <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp" style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) setPhotos((p) => [...p, ...Array.from(e.target.files!)]);
                setTimeout(() => { e.target.value = ''; }, 100);
              }}
            />

            <div onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(251,146,60,0.5)'; }}
              onDragLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; if (e.dataTransfer.files.length > 0) setPhotos((p) => [...p, ...Array.from(e.dataTransfer.files)]); }}
              style={{
                border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '14px',
                padding: photos.length > 0 ? '16px' : '40px 20px',
                cursor: 'pointer', transition: 'border-color 0.2s', background: 'rgba(255,255,255,0.02)',
              }}>
              {photos.length === 0 ? (
                <div>
                  <HiPhotograph size={32} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '8px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', margin: 0 }}>Cliquez ou glissez vos photos ici</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {photos.map((f, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={URL.createObjectURL(f)} alt="" style={{ height: '80px', width: '80px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.08)' }} />
                      <button onClick={(e) => { e.stopPropagation(); setPhotos((p) => p.filter((_, idx) => idx !== i)); }}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0f1c2e', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HiX size={10} />
                      </button>
                    </div>
                  ))}
                  <div onClick={() => fileRef.current?.click()} style={{ height: '80px', width: '80px', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HiPlus size={20} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button onClick={reset} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
              <button onClick={() => setStep(1)} style={{
                padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(90deg, #fb923c, #ea580c)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 16px rgba(251,146,60,0.3)',
              }}>{photos.length > 0 ? 'Suivant' : 'Passer'} <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Step 1: Quality Check ═══ */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px', background: 'linear-gradient(135deg, rgba(47,111,237,0.2), rgba(47,111,237,0.05))', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MdCheckCircle size={28} style={{ color: '#6fa3f5' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>Contrôle qualité</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
                {checkedCount}/{totalChecks} vérifications
              </p>
            </div>

            {/* Progress */}
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: (checkedCount / totalChecks * 100) + '%', background: allChecked ? '#22c55e' : '#2f6fed', borderRadius: '100px', transition: 'width 0.3s' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
              {Object.entries(qualityChecks).map(([label, checked]) => (
                <div key={label} onClick={() => setQualityChecks((p) => ({ ...p, [label]: !p[label] }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px',
                    background: checked ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                    border: '1.5px solid ' + (checked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'),
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                    background: checked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                    border: '1.5px solid ' + (checked ? '#22c55e' : 'rgba(255,255,255,0.15)'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                  }}>
                    {checked && <HiCheck size={14} style={{ color: '#4ade80' }} />}
                  </div>
                  <span style={{ color: checked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, textDecoration: checked ? 'none' : 'none' }}>{label}</span>
                </div>
              ))}
            </div>

            <textarea placeholder="Notes complémentaires (optionnel)..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', padding: '12px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setStep(0)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Retour
              </button>
              <button onClick={() => setStep(2)} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: allChecked ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #fb923c, #ea580c)',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: allChecked ? '0 4px 16px rgba(34,197,94,0.3)' : '0 4px 16px rgba(251,146,60,0.3)',
              }}>Confirmer la livraison <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Confirm ═══ */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MdLocalShipping size={28} style={{ color: '#4ade80' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>Prêt à livrer</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Le client et les admins seront notifiés</p>
            </div>

            <div style={{ borderRadius: '14px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projet</span>
                  <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>{project?.name}</p>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Photos</span>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>{photos.length} photo{photos.length > 1 ? 's' : ''}</p>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Qualité</span>
                  <p style={{ color: allChecked ? '#4ade80' : '#fbbf24', fontSize: '14px', fontWeight: 600, margin: '2px 0 0' }}>{checkedCount}/{totalChecks} OK</p>
                </div>
                {notes && (
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</span>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '2px 0 0' }}>{notes.length > 60 ? notes.slice(0, 60) + '...' : notes}</p>
                  </div>
                )}
              </div>

              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
                  {photos.slice(0, 6).map((f, i) => (
                    <img key={i} src={URL.createObjectURL(f)} alt="" style={{ height: '52px', width: '52px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }} />
                  ))}
                  {photos.length > 6 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', alignSelf: 'center' }}>+{photos.length - 6}</span>}
                </div>
              )}
            </div>

            {!allChecked && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', marginBottom: '16px' }}>
                <p style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 600, margin: 0 }}>
                  Attention : {totalChecks - checkedCount} vérification{totalChecks - checkedCount > 1 ? 's' : ''} non validée{totalChecks - checkedCount > 1 ? 's' : ''}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HiArrowLeft size={14} /> Modifier
              </button>
              <button onClick={handleSubmit} disabled={uploading} style={{
                padding: '12px 28px', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                background: uploading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: uploading ? 'none' : '0 4px 20px rgba(34,197,94,0.4)',
              }}>
                {uploading ? 'Envoi en cours...' : 'Confirmer la livraison'} <MdLocalShipping size={18} />
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
      </div>
    </div>
  );
};

export default DeliveryWizard;
