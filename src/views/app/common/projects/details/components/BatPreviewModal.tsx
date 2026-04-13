import { useState } from 'react';
import { HiX, HiZoomIn, HiZoomOut, HiCheck } from 'react-icons/hi';
import { MdCheckCircle, MdCancel } from 'react-icons/md';
import { toast } from 'react-toastify';

type Props = {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  batStatus: string;
  isClient: boolean;
  onApprove: () => Promise<void>;
  onReject: (comment: string) => Promise<void>;
};

const BatPreviewModal = ({ open, onClose, fileUrl, fileName, batStatus, isClient, onApprove, onReject }: Props) => {
  const [zoom, setZoom] = useState(1);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPdf = fileName?.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName || '');

  const handleApprove = async () => {
    setSubmitting(true);
    try { await onApprove(); onClose(); }
    catch { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) { toast.error('Indiquez le motif du refus'); return; }
    setSubmitting(true);
    try { await onReject(rejectComment.trim()); onClose(); }
    catch { toast.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const reset = () => {
    setZoom(1); setAction(null); setRejectComment(''); onClose();
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeIn 0.2s ease',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600 }}>{fileName}</span>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
            background: batStatus === 'approved' ? 'rgba(34,197,94,0.12)' : batStatus === 'rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
            color: batStatus === 'approved' ? '#4ade80' : batStatus === 'rejected' ? '#f87171' : '#fbbf24',
            textTransform: 'uppercase',
          }}>
            {batStatus === 'approved' ? 'Validé' : batStatus === 'rejected' ? 'Refusé' : 'En attente'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isImage && (
            <>
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <HiZoomOut size={18} />
              </button>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                <HiZoomIn size={18} />
              </button>
            </>
          )}
          <button onClick={reset} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginLeft: '8px' }}>
            <HiX size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {isPdf ? (
          <iframe src={fileUrl} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} />
        ) : isImage ? (
          <img src={fileUrl} alt="BAT" style={{
            maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px',
            transform: 'scale(' + zoom + ')', transition: 'transform 0.2s',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Aperçu non disponible pour ce format</p>
            <a href={fileUrl} target="_blank" rel="noreferrer" style={{ color: '#6fa3f5', fontSize: '13px' }}>Télécharger le fichier</a>
          </div>
        )}
      </div>

      {/* Bottom action bar — client only, not yet approved */}
      {isClient && batStatus !== 'approved' && (
        <div style={{
          padding: '16px 20px', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          {action === null && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setAction('approve')} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px',
                background: 'linear-gradient(90deg, #22c55e, #16a34a)', border: 'none', color: '#fff',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
              }}>
                <MdCheckCircle size={18} /> Approuver le BAT
              </button>
              <button onClick={() => setAction('reject')} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px',
                background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)', color: '#f87171',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                <MdCancel size={18} /> Refuser
              </button>
            </div>
          )}

          {action === 'approve' && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>Confirmer l'approbation ?</span>
              <button onClick={handleApprove} disabled={submitting} style={{
                padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>{submitting ? 'Envoi...' : 'Oui, approuver'}</button>
              <button onClick={() => setAction(null)} style={{
                padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>Annuler</button>
            </div>
          )}

          {action === 'reject' && (
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <textarea placeholder="Motif du refus *..." value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={2}
                style={{ width: '100%', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '10px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: '10px' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button onClick={handleReject} disabled={submitting || !rejectComment.trim()} style={{
                  padding: '10px 24px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)',
                  border: '1.5px solid rgba(239,68,68,0.4)', color: '#f87171', fontSize: '13px',
                  fontWeight: 700, cursor: (submitting || !rejectComment.trim()) ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif', opacity: !rejectComment.trim() ? 0.5 : 1,
                }}>{submitting ? 'Envoi...' : 'Confirmer le refus'}</button>
                <button onClick={() => { setAction(null); setRejectComment(''); }} style={{
                  padding: '10px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
};

export default BatPreviewModal;
