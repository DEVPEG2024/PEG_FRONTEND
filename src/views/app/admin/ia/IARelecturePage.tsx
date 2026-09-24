import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  MdAutoAwesome,
  MdCheck,
  MdClose,
  MdOpenInNew,
  MdOutlineFlag,
  MdPlayArrow,
  MdRefresh,
  MdSpellcheck,
  MdUndo,
} from 'react-icons/md';
import {
  RelecteurReview,
  RelecteurReviewStatus,
  RelecteurStatus,
  apiAcceptRelecteurReview,
  apiGetRelecteurReviews,
  apiGetRelecteurStatus,
  apiRejectRelecteurReview,
  apiRevertRelecteurReview,
  apiRunRelecteur,
  apiUpdateRelecteurSettings,
} from '@/services/RelecteurServices';
import { safeHtmlParse } from '@/utils/sanitizeHtml';

/**
 * Relecture des fiches produit — agent « Relecteur PEG ».
 *
 * Périmètre (liste blanche, côté serveur) : nom et description des PRODUITS.
 * Les messages admin ↔ client, tickets, devis, factures et descriptions de
 * projet ne sont jamais lus ni modifiés.
 *  - Orthographe : appliquée automatiquement, annulable.
 *  - Uniformisation (gabarit sobre, vouvoiement) : proposée, validée ici.
 *  - Incohérences de fait : signalées, à corriger à la main dans la fiche.
 */

const PANEL: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const btn = (color: string, filled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: filled ? color : 'rgba(255,255,255,0.04)',
  border: `1px solid ${filled ? color : 'rgba(255,255,255,0.12)'}`,
  color: filled ? '#fff' : color,
  borderRadius: '8px', padding: '7px 12px',
  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
});

const STATUS_LABEL: Record<RelecteurReviewStatus, { label: string; color: string }> = {
  applied: { label: 'Appliquée', color: '#4ade80' },
  proposed: { label: 'À valider', color: '#60a5fa' },
  accepted: { label: 'Validée', color: '#4ade80' },
  rejected: { label: 'Refusée', color: 'rgba(255,255,255,0.45)' },
  reverted: { label: 'Annulée', color: '#fbbf24' },
  stale: { label: 'Périmée', color: 'rgba(255,255,255,0.45)' },
  blocked: { label: 'Bloquée par un garde-fou', color: '#f87171' },
  flagged: { label: 'Signalement', color: '#fb923c' },
};

const KIND_LABEL: Record<RelecteurReview['kind'], string> = {
  spelling: 'Orthographe',
  style: 'Uniformisation',
  fact: 'Incohérence',
};

type Tab = 'todo' | 'flags' | 'applied' | 'journal';
const TAB_STATUSES: Record<Tab, RelecteurReviewStatus[]> = {
  todo: ['proposed'],
  flags: ['flagged'],
  applied: ['applied', 'accepted'],
  journal: [],
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const stripTags = (html: string | null) =>
  (html || '').replace(/<\/(p|li|h\d)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{2,}/g, '\n').trim();

const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

// ─────────────────────────────────────────────────────────────────
// Bloc « avant / après »
// ─────────────────────────────────────────────────────────────────
const TextBox = ({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) => (
  <div style={{ flex: '1 1 280px', minWidth: 0, background: 'rgba(0,0,0,0.2)', border: `1px solid ${accent || 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '10px 12px' }}>
    <div style={{ ...labelStyle, marginBottom: '6px' }}>{title}</div>
    <div className="relecteur-text" style={{ color: 'rgba(220,230,245,0.85)', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
      {children}
    </div>
  </div>
);

const EditsList = ({ review }: { review: RelecteurReview }) => {
  const edits = review.details?.corrections || [];
  if (!edits.length && !review.details?.nettoyage) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {review.details?.nettoyage && (
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '3px 8px' }}>
          Nettoyage : espaces et caractères invisibles
        </span>
      )}
      {edits.map((e, i) => (
        <span
          key={i}
          title={e.applied ? e.raison : `Refusée : ${e.motif}`}
          style={{
            fontSize: '12px', borderRadius: '6px', padding: '3px 8px',
            background: e.applied ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
            border: `1px solid ${e.applied ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
            color: 'rgba(230,238,250,0.85)',
          }}
        >
          <s style={{ opacity: 0.6 }}>{e.avant}</s> → <strong>{e.apres}</strong>
          {!e.applied && <em style={{ color: '#f87171', marginLeft: '6px' }}>refusée : {e.motif}</em>}
        </span>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Carte d'une entrée du journal
// ─────────────────────────────────────────────────────────────────
type CardProps = {
  review: RelecteurReview;
  busy: boolean;
  onAccept: (r: RelecteurReview) => void;
  onReject: (r: RelecteurReview) => void;
  onRevert: (r: RelecteurReview) => void;
};

const ReviewCard = ({ review, busy, onAccept, onReject, onRevert }: CardProps) => {
  const st = STATUS_LABEL[review.status];
  const isStyle = review.kind === 'style';
  const isFact = review.kind === 'fact';
  return (
    <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{review.label}</span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 8px' }}>
          {KIND_LABEL[review.kind]} · {review.field === 'name' ? 'nom' : 'description'}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: st.color }}>{st.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          {fmtDate(review.createdAt)} · {review.source}
          {review.decidedBy && review.decidedBy !== 'relecteur' ? ` · ${review.decidedBy}` : ''}
        </span>
      </div>

      {isFact && (
        <div style={{ color: '#fed7aa', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <MdOutlineFlag size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          {review.details?.note}
        </div>
      )}

      {review.status === 'blocked' && review.details?.garde_fou && (
        <div style={{ color: '#fca5a5', fontSize: '12px' }}>Garde-fou : {review.details.garde_fou}</div>
      )}

      {!isFact && <EditsList review={review} />}

      {!isFact && review.after !== null && (isStyle || review.field === 'name') && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <TextBox title="Avant">{stripTags(review.before)}</TextBox>
          <TextBox title="Après" accent="rgba(96,165,250,0.35)">
            {isStyle ? <div style={{ whiteSpace: 'normal' }}>{safeHtmlParse(review.after || '')}</div> : review.after}
          </TextBox>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {review.status === 'proposed' && (
          <>
            <button style={btn('#2563eb', true)} disabled={busy} onClick={() => onAccept(review)}>
              <MdCheck size={15} /> Accepter
            </button>
            <button style={btn('rgba(255,255,255,0.7)')} disabled={busy} onClick={() => onReject(review)}>
              <MdClose size={15} /> Refuser
            </button>
          </>
        )}
        {review.status === 'flagged' && (
          <button style={btn('rgba(255,255,255,0.7)')} disabled={busy} onClick={() => onReject(review)}>
            <MdCheck size={15} /> Classer (corrigé ou sans objet)
          </button>
        )}
        {(review.status === 'applied' || review.status === 'accepted') && (
          <button style={btn('#fbbf24')} disabled={busy} onClick={() => onRevert(review)}>
            <MdUndo size={15} /> Annuler et remettre le texte d’origine
          </button>
        )}
        <Link to={`/admin/products/edit/${review.documentId}`} style={{ ...btn('rgba(255,255,255,0.6)'), textDecoration: 'none' }}>
          <MdOpenInNew size={14} /> Ouvrir la fiche
        </Link>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────
const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    role="switch"
    aria-checked={on}
    disabled={disabled}
    onClick={() => onChange(!on)}
    style={{
      width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative',
      background: on ? '#22c55e' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s', flexShrink: 0,
    }}
  >
    <span style={{ position: 'absolute', top: '3px', left: on ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
  </button>
);

const IARelecturePage = () => {
  const [status, setStatus] = useState<RelecteurStatus | null>(null);
  const [reviews, setReviews] = useState<RelecteurReview[]>([]);
  const [tab, setTab] = useState<Tab>('todo');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulk, setBulk] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([apiGetRelecteurStatus(), apiGetRelecteurReviews(TAB_STATUSES[tab])]);
      setStatus(s.data.status);
      setReviews(r.data.reviews || []);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Relecteur indisponible (backend pas encore déployé ?)'));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Rafraîchissement pendant une passe en cours
  useEffect(() => {
    if (!status?.running && !status?.queued) return;
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [status?.running, status?.queued, load]);

  const updateSetting = async (patch: { enabled?: boolean; autoApply?: boolean }) => {
    try {
      await apiUpdateRelecteurSettings(patch);
      await load();
    } catch (e: any) {
      toast.error(errorMessage(e, 'Réglage non enregistré'));
    }
  };

  const act = async (r: RelecteurReview, fn: (id: number) => Promise<unknown>, ok: string) => {
    setBusyId(r.id);
    try {
      await fn(r.id);
      toast.success(ok);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Action impossible'));
    } finally {
      setBusyId(null);
      load();
    }
  };

  const acceptAllStyle = async () => {
    const todo = reviews.filter((r) => r.status === 'proposed' && r.kind === 'style');
    if (!todo.length || !window.confirm(`Accepter les ${todo.length} fiches uniformisées affichées ?`)) return;
    setBulk(true);
    let ok = 0; let ko = 0;
    for (const r of todo) {
      try { await apiAcceptRelecteurReview(r.id); ok++; } catch { ko++; }
    }
    setBulk(false);
    toast[ko ? 'warning' : 'success'](`${ok} fiche(s) mise(s) à jour${ko ? `, ${ko} ignorée(s) (texte modifié entre-temps)` : ''}`);
    load();
  };

  const runAll = async () => {
    try {
      const res = await apiRunRelecteur();
      toast.info(res.data.started ? 'Relecture lancée en arrière-plan (un produit toutes les 20 à 40 s)' : 'Une relecture est déjà en cours');
      load();
    } catch (e: any) {
      toast.error(errorMessage(e, 'Relecture non lancée'));
    }
  };

  const counts = status?.byStatus || {};
  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: 'todo', label: 'À valider', n: counts.proposed },
    { key: 'flags', label: 'Signalements', n: counts.flagged },
    { key: 'applied', label: 'Corrections appliquées', n: (counts.applied || 0) + (counts.accepted || 0) },
    { key: 'journal', label: 'Journal complet' },
  ];
  const styleProposals = useMemo(() => reviews.filter((r) => r.status === 'proposed' && r.kind === 'style').length, [reviews]);
  const cov = status?.coverage;
  const summary = status?.lastRunSummary;

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{'.relecteur-text ul{margin:4px 0;padding-left:18px;list-style:disc}.relecteur-text p{margin:0 0 4px}'}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
          <MdSpellcheck size={22} />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Relecture des fiches produit</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>
            Orthographe corrigée automatiquement, fiches uniformisées après votre validation. Les messages, tickets, devis, factures et projets ne sont jamais modifiés.
          </p>
        </div>
      </div>

      {status && !status.groqConfigured && (
        <div style={{ ...PANEL, padding: '12px 16px', color: '#fca5a5', fontSize: '13px' }}>
          Service IA non configuré sur ce serveur (GROQ_API_KEY manquant) : aucune relecture possible.
        </div>
      )}

      {/* Réglages et couverture */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle on={!!status?.enabled} disabled={!status} onChange={(v) => updateSetting({ enabled: v })} />
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{status?.enabled ? 'Agent actif' : 'Agent en pause'}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Relit chaque produit modifié et tout le catalogue à 3 h</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle on={!!status?.autoApply} disabled={!status} onChange={(v) => updateSetting({ autoApply: v })} />
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Orthographe appliquée d’office</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Sinon, chaque correction attend votre validation</div>
            </div>
          </div>
        </div>

        <div style={{ ...PANEL, padding: '14px 16px' }}>
          <div style={labelStyle}>Fiches au gabarit sobre</div>
          <div style={{ color: '#fff', fontSize: '26px', fontWeight: 700, marginTop: '6px' }}>
            {cov ? `${cov.visiblesSobres} / ${cov.visibles}` : '—'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
            produits visibles{cov ? ` · ${cov.sobres} / ${cov.produits} au total` : ''}
          </div>
        </div>

        <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={labelStyle}>Dernière passe complète</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
            {status?.running
              ? `En cours… (${status.queued} en file)`
              : summary
                ? `${fmtDate(status?.lastRunAt || null)} · ${summary.relus} relus, ${summary.appliquees} corrigés, ${summary.propositions} propositions, ${summary.signalements} signalements`
                : 'Jamais lancée'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={btn('#60a5fa')} disabled={!status || status.running} onClick={runAll}>
              <MdPlayArrow size={16} /> Lancer maintenant
            </button>
            <button style={btn('rgba(255,255,255,0.6)')} onClick={() => load()} aria-label="Rafraîchir">
              <MdRefresh size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...btn(tab === t.key ? '#fff' : 'rgba(255,255,255,0.6)'),
              background: tab === t.key ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.04)',
              borderColor: tab === t.key ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {t.label}{t.n ? ` (${t.n})` : ''}
          </button>
        ))}
        {tab === 'todo' && styleProposals > 1 && (
          <button style={{ ...btn('#22c55e', true), marginLeft: 'auto' }} disabled={bulk} onClick={acceptAllStyle}>
            <MdAutoAwesome size={15} /> {bulk ? 'Mise à jour…' : `Accepter les ${styleProposals} fiches uniformisées`}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Chargement…</div>
      ) : reviews.length === 0 ? (
        <div style={{ ...PANEL, padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
          {tab === 'todo' ? 'Rien à valider.' : tab === 'flags' ? 'Aucune incohérence signalée.' : 'Aucune entrée.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              busy={busyId === r.id || bulk}
              onAccept={(x) => act(x, (id) => apiAcceptRelecteurReview(id), 'Fiche mise à jour')}
              onReject={(x) => act(x, apiRejectRelecteurReview, x.kind === 'fact' ? 'Signalement classé' : 'Proposition refusée')}
              onRevert={(x) => act(x, apiRevertRelecteurReview, 'Texte d’origine rétabli')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default IARelecturePage;
