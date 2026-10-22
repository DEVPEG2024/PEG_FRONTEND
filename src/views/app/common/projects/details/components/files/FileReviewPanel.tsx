// Réponse du client à un fichier du projet, sous la ligne du fichier :
// client → Valider / Refuser (motif), « Modifier ma demande » après un refus ;
// admin → statut, motif du refus et « Remplacer par une nouvelle version ».
import { useRef, useState } from 'react';
import { HiCheck, HiX, HiOutlineRefresh, HiOutlinePencil } from 'react-icons/hi';
import type { FileReview } from '@/utils/fileReviews';

type Props = {
  fileId: string | number;
  fileName: string;
  review?: FileReview;
  /** client du projet : il répond */
  canAnswer: boolean;
  /** admin : il voit le statut et remplace un fichier refusé */
  isAdmin: boolean;
  busy: boolean;
  onAnswer: (status: 'approved' | 'rejected', comment: string | null) => Promise<boolean>;
  onReplace: (file: File) => Promise<void>;
};

export const FileReviewChip = ({ status, isAdmin }: { status: FileReview['status']; isAdmin: boolean }) => {
  const cfg = status === 'approved'
    ? { text: 'Validé', cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', Icon: HiCheck }
    : status === 'rejected'
      ? { text: 'Refusé', cls: 'text-rose-300 bg-rose-500/10 border-rose-500/30', Icon: HiX }
      : { text: isAdmin ? 'En attente du client' : 'À valider', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30', Icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      {cfg.Icon && <cfg.Icon className="w-3 h-3" aria-hidden />}
      {cfg.text}
    </span>
  );
};

const FileReviewPanel = ({ fileId, fileName, review, canAnswer, isAdmin, busy, onAnswer, onReplace }: Props) => {
  const status = review?.status ?? 'pending';
  const [refusing, setRefusing] = useState(false);
  const [draft, setDraft] = useState('');
  const [missing, setMissing] = useState(false);
  const replaceRef = useRef<HTMLInputElement>(null);

  const openRefusal = (prefill = '') => {
    setDraft(prefill);
    setMissing(false);
    setRefusing(true);
  };

  const sendRefusal = async () => {
    const text = draft.trim();
    if (!text) { setMissing(true); return; }
    if (await onAnswer('rejected', text)) setRefusing(false);
  };

  const history = review?.replaces ? (
    <p className="text-[11px] text-white/45 m-0">
      Nouvelle version de « {review.replaces} »{review.previousComment ? ` — demande : « ${review.previousComment} »` : ''}
    </p>
  ) : null;

  return (
    <div className="flex flex-col gap-2 mt-1 ml-[52px] mb-2">
      {history}

      {canAnswer && status === 'pending' && !refusing && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onAnswer('approved', null)} disabled={busy}
            aria-label={`Valider ${fileName}`}
            className="peg-tap-target inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition disabled:opacity-50">
            <HiCheck className="w-4 h-4" aria-hidden /> Valider
          </button>
          <button type="button" onClick={() => openRefusal()} disabled={busy}
            aria-label={`Refuser ${fileName}`}
            className="peg-tap-target inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-rose-400/60 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/15 transition disabled:opacity-50">
            <HiX className="w-4 h-4" aria-hidden /> Refuser
          </button>
        </div>
      )}

      {canAnswer && refusing && (
        <div className="flex flex-col gap-2 rounded-xl border border-violet-400/40 bg-[#1d2a42] p-3">
          <label htmlFor={`refus-${fileId}`} className="text-xs font-semibold text-white/80">
            Que faut-il modifier sur ce fichier ?
          </label>
          <textarea
            id={`refus-${fileId}`}
            rows={3}
            autoFocus
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setMissing(false); }}
            aria-invalid={missing}
            placeholder="Ex. : logo plus grand, couleur à corriger…"
            className={`w-full resize-y rounded-lg bg-black/25 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none border ${missing ? 'border-rose-400/70' : 'border-white/15'}`}
          />
          {missing && <span role="alert" className="text-xs font-semibold text-rose-300">Indiquez ce qu'il faut modifier.</span>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setRefusing(false)} disabled={busy}
              className="peg-tap-target text-xs font-semibold px-3 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5 transition">
              Annuler
            </button>
            <button type="button" onClick={sendRefusal} disabled={busy}
              className="peg-tap-target text-xs font-bold px-3.5 py-2 rounded-lg bg-[#6d5dfc] hover:bg-[#7d6efc] text-white transition disabled:opacity-50">
              {busy ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
        </div>
      )}

      {status === 'rejected' && !refusing && (
        <div className="flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-500/[0.07] px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-300 m-0">
            {isAdmin ? 'Modification demandée par le client' : 'Votre demande de modification'}
          </p>
          {review?.comment && <p className="text-sm text-white/90 m-0 whitespace-pre-wrap">« {review.comment} »</p>}
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <>
                <input ref={replaceRef} type="file" className="hidden"
                  accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf,application/zip,.psd,.ai"
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onReplace(f); }} />
                <button type="button" onClick={() => replaceRef.current?.click()} disabled={busy}
                  className="peg-tap-target inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-[#6d5dfc] hover:bg-[#7d6efc] text-white transition disabled:opacity-50">
                  <HiOutlineRefresh className="w-4 h-4" aria-hidden /> {busy ? 'Envoi…' : 'Remplacer par une nouvelle version'}
                </button>
              </>
            )}
            {canAnswer && (
              <button type="button" onClick={() => openRefusal(review?.comment ?? '')} disabled={busy}
                className="peg-tap-target inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-white/15 text-white/80 hover:bg-white/5 transition">
                <HiOutlinePencil className="w-3.5 h-3.5" aria-hidden /> Modifier ma demande
              </button>
            )}
          </div>
          {!isAdmin && (
            <p className="text-[11px] text-white/55 m-0">PEG prépare une nouvelle version de ce fichier : vous serez prévenu.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FileReviewPanel;
