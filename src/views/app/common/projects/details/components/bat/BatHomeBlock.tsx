// Bloc « Bon à tirer » de l'Accueil du projet (et de l'onglet Modifications),
// maquette validée le 22/10/2026 : l'aperçu du BAT sous la description, deux
// boutons pour le client — Valider / Refuser — et, au refus, un panneau
// « Modifications demandées » (texte + photos). L'admin y dépose le BAT et,
// après un refus, voit la demande et envoie la nouvelle version.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { HiCheck, HiX, HiOutlinePencil, HiOutlinePhotograph, HiOutlineClock, HiPaperAirplane } from 'react-icons/hi';
import { MdUploadFile } from 'react-icons/md';
import { env } from '@/configs/env.config';
import { BAT_ACCEPT, BAT_FORMATS_LABEL } from '@/utils/batFiles';
import { findBatRefusalComment } from '@/utils/projectBat';
import { setSelectedTab, useAppDispatch, useAppSelector } from '../../store';
import { useProjectBatActions } from './useProjectBatActions';
import BatDocumentPreview from './BatDocumentPreview';

const MAX_PHOTOS = 4;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

const absoluteUrl = (url?: string | null) =>
  !url ? '' : url.startsWith('http') ? url : (env?.API_ENDPOINT_URL || '') + url;

const TONES = {
  pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
  rejected: { color: '#fca5a5', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)' },
  approved: { color: '#86efac', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)' },
  none: { color: 'rgba(255,255,255,0.7)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)' },
};

const label: React.CSSProperties = {
  color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0,
};

const bigButton = (bg: string, color: string, border = 'none'): React.CSSProperties => ({
  flex: '1 1 200px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  minHeight: '50px', borderRadius: '14px', border, background: bg, color,
  fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 800, cursor: 'pointer',
});

const smallButton: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px', padding: '0 18px',
  borderRadius: '12px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent',
  color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
};

const BatHomeBlock = () => {
  const dispatch = useAppDispatch();
  const { comments } = useAppSelector((state) => state.projectDetails.data);
  const { bat, isAdmin, isCustomer, uploading, uploadBat, submitDecision } = useProjectBatActions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'refuse'>('idle');
  const [draft, setDraft] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [missingText, setMissingText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Accord de production : le client doit avoir vu le fichier (aperçu affiché,
  // ou fichier téléchargé quand il ne s'affiche pas) avant de valider.
  const [viewed, setViewed] = useState(false);

  const fileUrl = bat?.file?.url ?? '';
  const status = bat?.status ?? 'pending';
  useEffect(() => {
    setPhase('idle');
    setViewed(false);
  }, [fileUrl, status]);

  const photoPreviews = useObjectUrls(photos);

  // Rien à montrer : pas de BAT possible, ou pas encore déposé (seul l'admin voit le bloc vide).
  if (!bat || (!bat.file && !isAdmin)) return null;

  const file = bat.file;
  const canAnswer = isCustomer && !isAdmin && !!file && status === 'pending';
  const tone = !file ? TONES.none : TONES[status];
  const refusal = status === 'rejected' ? findBatRefusalComment(comments, bat.comment) : null;
  const refusalPhotos = (refusal?.images ?? []).map((img) => absoluteUrl(img.url)).filter(Boolean);

  const title = !file
    ? 'Aucun BAT pour ce projet'
    : status === 'approved'
      ? 'BAT validé'
      : status === 'rejected'
        ? isAdmin ? 'Le client demande des modifications' : 'Modifications envoyées à PEG'
        : isAdmin ? 'BAT envoyé au client' : 'Votre BAT est prêt à valider';

  const badge = !file
    ? null
    : status === 'approved'
      ? { icon: <HiCheck size={15} />, text: 'Validé' }
      : status === 'rejected'
        ? { icon: <HiX size={15} />, text: 'Refusé — modifications demandées' }
        : { icon: <HiOutlineClock size={15} />, text: isAdmin ? 'En attente du client' : 'À valider' };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (picked) await uploadBat(picked);
  };

  const onPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    const tooBig = picked.filter((f) => f.size > MAX_PHOTO_SIZE);
    if (tooBig.length) toast.error('Photo trop lourde (10 Mo maximum)');
    setPhotos((prev) => [...prev, ...picked.filter((f) => f.size <= MAX_PHOTO_SIZE)].slice(0, MAX_PHOTOS));
  };

  const cancel = () => {
    setPhase('idle');
    setMissingText(false);
  };

  const approve = async () => {
    setSubmitting(true);
    try {
      await submitDecision('approved', null);
      setPhase('idle');
    } catch {
      toast.error('Erreur lors de la validation du BAT');
    } finally {
      setSubmitting(false);
    }
  };

  const refuse = async () => {
    const text = draft.trim();
    if (!text) { setMissingText(true); return; }
    setSubmitting(true);
    try {
      await submitDecision('rejected', text, photos);
      setDraft('');
      setPhotos([]);
      setPhase('idle');
    } catch {
      toast.error("Erreur lors de l'envoi des modifications");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      aria-labelledby="bat-home-title"
      className="peg-pad-mobile"
      style={{
        background: 'linear-gradient(160deg, rgba(22,38,61,0.8) 0%, rgba(15,28,46,0.9) 100%)',
        borderRadius: '16px', border: `1px solid ${tone.border}`, padding: '24px 28px',
        display: 'flex', flexDirection: 'column', gap: '18px', fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <p style={label}>Bon à tirer</p>
          <h3 id="bat-home-title" style={{ margin: 0, color: '#fff', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</h3>
          {file?.name && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{file.name}</span>
          )}
        </div>
        {badge && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: tone.color, background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: '100px', padding: '6px 12px' }}>
            {badge.icon} {badge.text}
          </span>
        )}
      </div>

      {file?.url ? (
        <BatDocumentPreview key={file.url} file={file} onViewed={() => setViewed(true)} />
      ) : (
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.55 }}>
          Déposez le BAT ici : le client le verra dans l'Accueil de son projet et pourra le valider ou demander des modifications.
        </p>
      )}

      {/* Client : valider ou refuser */}
      {canAnswer && phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '14px', lineHeight: 1.55 }}>
            Vérifiez textes, couleurs, tailles et emplacements. Une fois validé, la fabrication démarre sur cette base.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <button type="button" onClick={() => setPhase('confirm')} disabled={!viewed} className="peg-tap-target"
              style={{ ...bigButton('#15803d', '#fff'), opacity: viewed ? 1 : 0.5, cursor: viewed ? 'pointer' : 'not-allowed' }}>
              <HiCheck size={20} /> Valider le BAT
            </button>
            <button type="button" onClick={() => setPhase('refuse')} className="peg-tap-target"
              style={bigButton('rgba(239,68,68,0.08)', '#fca5a5', '1.5px solid rgba(248,113,113,0.6)')}>
              <HiX size={20} /> Refuser
            </button>
          </div>
          {!viewed && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px' }}>
              Ouvrez ou téléchargez le fichier pour pouvoir le valider.
            </span>
          )}
        </div>
      )}

      {canAnswer && phase === 'confirm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '14px', padding: '16px 18px' }}>
          <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>Valider ce BAT ?</span>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.5 }}>La fabrication démarrera exactement sur ce visuel.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button type="button" onClick={approve} disabled={submitting} className="peg-tap-target"
              style={{ ...smallButton, border: 'none', background: '#15803d', color: '#fff', fontWeight: 800, cursor: submitting ? 'wait' : 'pointer' }}>
              {submitting ? 'Envoi…' : 'Oui, je valide'}
            </button>
            <button type="button" onClick={cancel} disabled={submitting} className="peg-tap-target" style={smallButton}>Annuler</button>
          </div>
        </div>
      )}

      {canAnswer && phase === 'refuse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(29,42,66,0.9)', border: '1px solid rgba(109,93,252,0.45)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(109,93,252,0.18)', color: '#b3a9ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HiOutlinePencil size={17} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: '#fff', fontSize: '16px', fontWeight: 800 }}>Modifications demandées</span>
              <span style={{ color: 'rgba(255,255,255,0.62)', fontSize: '13px' }}>Dites-nous ce qu'il faut changer : PEG vous renvoie une nouvelle version.</span>
            </div>
          </div>
          <label htmlFor="bat-modifs" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600 }}>Quelles modifications souhaitez-vous ?</label>
          <textarea
            id="bat-modifs"
            rows={4}
            autoFocus
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setMissingText(false); }}
            placeholder="Ex. : logo un peu plus grand, texte à corriger, autre couleur…"
            aria-invalid={missingText}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '110px', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${missingText ? 'rgba(248,113,113,0.7)' : 'rgba(255,255,255,0.16)'}`, background: 'rgba(0,0,0,0.25)', color: '#fff', fontFamily: 'Inter, sans-serif', fontSize: '15px', lineHeight: 1.5, outline: 'none' }}
          />
          {missingText && <span role="alert" style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 600 }}>Décrivez au moins une modification.</span>}
          {photoPreviews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {photoPreviews.map((src, i) => (
                <div key={src} style={{ position: 'relative' }}>
                  <img src={src} alt={`Photo jointe ${i + 1}`} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', display: 'block' }} />
                  <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))} aria-label={`Retirer la photo ${i + 1}`}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #16263d', background: '#ef4444', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                    <HiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={onPhotos} style={{ display: 'none' }} />
            {photos.length < MAX_PHOTOS && (
              <button type="button" onClick={() => photoInputRef.current?.click()} disabled={submitting} className="peg-tap-target"
                style={{ ...smallButton, border: '1px dashed rgba(255,255,255,0.25)' }}>
                <HiOutlinePhotograph size={17} /> Joindre une photo
              </button>
            )}
            <div style={{ flex: '1 1 auto' }} />
            <button type="button" onClick={cancel} disabled={submitting} className="peg-tap-target" style={smallButton}>Annuler</button>
            <button type="button" onClick={refuse} disabled={submitting} className="peg-tap-target"
              style={{ ...smallButton, border: 'none', background: '#6d5dfc', color: '#fff', fontWeight: 800, cursor: submitting ? 'wait' : 'pointer' }}>
              <HiPaperAirplane size={16} style={{ transform: 'rotate(90deg)' }} /> {submitting ? 'Envoi…' : 'Envoyer les modifications'}
            </button>
          </div>
        </div>
      )}

      {/* Refus : la demande du client, pour lui comme pour l'admin */}
      {file && status === 'rejected' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '16px 18px' }}>
          <p style={{ ...label, color: '#fca5a5' }}>{isAdmin ? 'Modifications demandées par le client' : 'Vos modifications'}</p>
          {bat.comment && (
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>« {bat.comment} »</p>
          )}
          {refusalPhotos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {refusalPhotos.map((src, i) => (
                <a key={src} href={src} target="_blank" rel="noreferrer" aria-label={`Photo jointe ${i + 1}`}>
                  <img src={src} alt="" style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', display: 'block' }} />
                </a>
              ))}
            </div>
          )}
          {!isAdmin && (
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>L'équipe PEG prépare une nouvelle version : vous serez prévenu dès qu'elle sera prête.</span>
          )}
        </div>
      )}

      {file && status === 'approved' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '14px', padding: '14px 18px' }}>
          <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#15803d', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HiCheck size={18} />
          </span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 600 }}>
            {isAdmin ? 'Le client a validé ce BAT : la fabrication peut démarrer.' : 'Merci ! La fabrication peut démarrer.'}
          </span>
        </div>
      )}

      {/* Admin : déposer, remplacer, ou envoyer la version suivante après un refus */}
      {isAdmin && status !== 'approved' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input ref={fileInputRef} type="file" accept={BAT_ACCEPT} onChange={onFile} disabled={uploading} style={{ display: 'none' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {!file || status === 'rejected' ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="peg-tap-target"
                style={{ ...bigButton('#6d5dfc', '#fff'), cursor: uploading ? 'wait' : 'pointer' }}>
                <MdUploadFile size={20} /> {uploading ? 'Envoi en cours…' : !file ? 'Déposer un BAT' : 'Envoyer la nouvelle version au client'}
              </button>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="peg-tap-target"
                style={{ ...smallButton, cursor: uploading ? 'wait' : 'pointer' }}>
                <MdUploadFile size={18} /> {uploading ? 'Envoi en cours…' : 'Remplacer le BAT'}
              </button>
            )}
            {file && status === 'rejected' && (
              <button type="button" onClick={() => dispatch(setSelectedTab('Commentaires'))} className="peg-tap-target" style={smallButton}>
                Répondre au client
              </button>
            )}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            {status === 'rejected' && file
              ? "La nouvelle version remplace l'aperçu chez le client et lui redemande de valider."
              : `Formats : ${BAT_FORMATS_LABEL}. Le client est prévenu à chaque envoi.`}
          </span>
        </div>
      )}
    </section>
  );
};

/** URLs d'aperçu des photos choisies, libérées quand la liste change. */
function useObjectUrls(files: File[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}

export default BatHomeBlock;
