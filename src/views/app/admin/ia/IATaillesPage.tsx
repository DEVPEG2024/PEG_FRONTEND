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
  MdStraighten,
  MdUndo,
} from 'react-icons/md';
import {
  TaillesKind,
  TaillesReview,
  TaillesReviewStatus,
  TaillesSizeRef,
  TaillesStatus,
  apiAcceptTaillesReview,
  apiGetTaillesReviews,
  apiGetTaillesStatus,
  apiRejectTaillesReview,
  apiRevertTaillesReview,
  apiRunTailles,
  apiUpdateTaillesSettings,
} from '@/services/TaillesAgentServices';

/**
 * Tailles des produits — agent « Tailles ».
 *
 * Périmètre (côté serveur) : uniquement les tailles rattachées aux PRODUITS.
 * Les tailles elles-mêmes, couleurs, prix et commandes passées ne sont jamais modifiés.
 *  - Rangement (ordre XS → 4XL, doublons XXL/2XL) : toujours appliqué, annulable.
 *  - Ajustements de l'IA (taille sans rapport retirée, taille annoncée ajoutée) :
 *    proposés et validés ici, ou appliqués d'office si l'admin le choisit.
 *  - Signalements : à corriger à la main dans la fiche.
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

const STATUS_LABEL: Record<TaillesReviewStatus, { label: string; color: string }> = {
  applied: { label: 'Appliqué', color: '#4ade80' },
  proposed: { label: 'À valider', color: '#60a5fa' },
  accepted: { label: 'Validé', color: '#4ade80' },
  rejected: { label: 'Refusé', color: 'rgba(255,255,255,0.45)' },
  reverted: { label: 'Annulé', color: '#fbbf24' },
  stale: { label: 'Périmé', color: 'rgba(255,255,255,0.45)' },
  blocked: { label: 'Bloqué par un garde-fou', color: '#f87171' },
  flagged: { label: 'Signalement', color: '#fb923c' },
};

const KIND_LABEL: Record<TaillesKind, string> = {
  ordre: 'Ordre des tailles',
  doublon: 'Doublon',
  ajustement: 'Ajustement',
  signalement: 'À vérifier',
};

type Tab = 'todo' | 'flags' | 'applied' | 'journal';
const TAB_STATUSES: Record<Tab, TaillesReviewStatus[]> = {
  todo: ['proposed'],
  flags: ['flagged'],
  applied: ['applied', 'accepted'],
  journal: [],
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const errorMessage = (e: any, fallback: string) => e?.response?.data?.message || fallback;

// ─────────────────────────────────────────────────────────────────
// Tailles « avant / après »
// ─────────────────────────────────────────────────────────────────
type Mark = 'removed' | 'added' | null;

const chipStyle = (mark: Mark): React.CSSProperties => ({
  fontSize: '12px', fontWeight: 600, borderRadius: '6px', padding: '3px 9px',
  background: mark === 'removed' ? 'rgba(248,113,113,0.1)' : mark === 'added' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
  border: `1px solid ${mark === 'removed' ? 'rgba(248,113,113,0.35)' : mark === 'added' ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`,
  color: mark === 'removed' ? '#fca5a5' : mark === 'added' ? '#86efac' : 'rgba(230,238,250,0.9)',
});

const SizeRow = ({ title, sizes, mark, accent }: { title: string; sizes: TaillesSizeRef[]; mark: (s: TaillesSizeRef) => Mark; accent?: string }) => (
  <div style={{ flex: '1 1 260px', minWidth: 0, background: 'rgba(0,0,0,0.2)', border: `1px solid ${accent || 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '10px 12px' }}>
    <div style={{ ...labelStyle, marginBottom: '8px' }}>{title}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {sizes.length ? sizes.map((s) => {
        const m = mark(s);
        return <span key={s.documentId} style={chipStyle(m)}>{m === 'removed' ? <s>{s.name}</s> : s.name}</span>;
      }) : <em style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Aucune taille (le client commande sans choisir de taille)</em>}
    </div>
  </div>
);

const Explanations = ({ review }: { review: TaillesReview }) => {
  const adjustments = review.details?.ajustements || [];
  const duplicates = review.details?.doublons || [];
  if (!adjustments.length && !duplicates.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {duplicates.map((d, i) => (
        <span key={`d${i}`} style={{ fontSize: '12px', color: 'rgba(230,238,250,0.8)' }}>
          <strong>{d.taille}</strong> retirée : même taille que <strong>{d.gardee}</strong>
        </span>
      ))}
      {adjustments.map((a, i) => (
        <span key={`a${i}`} style={{ fontSize: '12px', color: a.applied ? 'rgba(230,238,250,0.85)' : 'rgba(252,165,165,0.9)' }}>
          {a.action === 'retirer' ? 'Retirer' : 'Ajouter'} <strong>{a.taille}</strong>
          {a.action === 'retirer' && a.raison ? ` — ${a.raison}` : ''}
          {a.action === 'ajouter' && a.preuve ? <> — la fiche dit « <em>{a.preuve}</em> »</> : ''}
          {!a.applied && a.motif ? <em> · refusé : {a.motif}</em> : ''}
        </span>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Carte d'une entrée du journal
// ─────────────────────────────────────────────────────────────────
type CardProps = {
  review: TaillesReview;
  busy: boolean;
  onAccept: (r: TaillesReview) => void;
  onReject: (r: TaillesReview) => void;
  onRevert: (r: TaillesReview) => void;
};

const ReviewCard = ({ review, busy, onAccept, onReject, onRevert }: CardProps) => {
  const st = STATUS_LABEL[review.status];
  const isFlag = review.kind === 'signalement';
  const before = review.before || [];
  const after = review.after || [];
  const afterIds = new Set(after.map((s) => s.documentId));
  const beforeIds = new Set(before.map((s) => s.documentId));
  return (
    <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{review.label}</span>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px 8px' }}>
          {KIND_LABEL[review.kind]}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: st.color }}>{st.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
          {fmtDate(review.createdAt)} · {review.source}
          {review.decidedBy && review.decidedBy !== 'agent' ? ` · ${review.decidedBy}` : ''}
        </span>
      </div>

      {isFlag && (
        <>
          <div style={{ color: '#fed7aa', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <MdOutlineFlag size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            {review.details?.note}
          </div>
          {before.length > 0 && (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              Tailles proposées : {before.map((s) => s.name).join(', ')}
            </div>
          )}
        </>
      )}

      {!isFlag && <Explanations review={review} />}

      {!isFlag && review.after && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <SizeRow title="Avant" sizes={before} mark={(s) => (afterIds.has(s.documentId) ? null : 'removed')} />
          <SizeRow title="Après" sizes={after} mark={(s) => (beforeIds.has(s.documentId) ? null : 'added')} accent="rgba(96,165,250,0.35)" />
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
            <MdUndo size={15} /> Annuler et remettre les tailles d’avant
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
const Toggle = ({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) => (
  <button
    role="switch"
    aria-checked={on}
    aria-label={label}
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

const IATaillesPage = () => {
  const [status, setStatus] = useState<TaillesStatus | null>(null);
  const [reviews, setReviews] = useState<TaillesReview[]>([]);
  const [tab, setTab] = useState<Tab>('todo');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bulk, setBulk] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([apiGetTaillesStatus(), apiGetTaillesReviews(TAB_STATUSES[tab])]);
      setStatus(s.data.status);
      setReviews(r.data.reviews || []);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Agent Tailles indisponible (backend pas encore déployé ?)'));
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
      await apiUpdateTaillesSettings(patch);
      await load();
    } catch (e: any) {
      toast.error(errorMessage(e, 'Réglage non enregistré'));
    }
  };

  const act = async (r: TaillesReview, fn: (id: number) => Promise<unknown>, ok: string) => {
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

  const acceptAll = async () => {
    const todo = reviews.filter((r) => r.status === 'proposed');
    if (!todo.length || !window.confirm(`Accepter les ${todo.length} ajustements affichés ?`)) return;
    setBulk(true);
    let ok = 0; let ko = 0;
    for (const r of todo) {
      try { await apiAcceptTaillesReview(r.id); ok++; } catch { ko++; }
    }
    setBulk(false);
    toast[ko ? 'warning' : 'success'](`${ok} produit(s) mis à jour${ko ? `, ${ko} ignoré(s) (tailles modifiées entre-temps)` : ''}`);
    load();
  };

  const runAll = async () => {
    try {
      const res = await apiRunTailles();
      toast.info(res.data.started ? 'Examen lancé en arrière-plan (un produit toutes les 20 à 40 s)' : 'Un examen est déjà en cours');
      load();
    } catch (e: any) {
      toast.error(errorMessage(e, 'Examen non lancé'));
    }
  };

  const counts = status?.byStatus || {};
  const tabs: { key: Tab; label: string; n?: number }[] = [
    { key: 'todo', label: 'À valider', n: counts.proposed },
    { key: 'flags', label: 'Signalements', n: counts.flagged },
    { key: 'applied', label: 'Modifications appliquées', n: (counts.applied || 0) + (counts.accepted || 0) },
    { key: 'journal', label: 'Journal complet' },
  ];
  const proposals = useMemo(() => reviews.filter((r) => r.status === 'proposed').length, [reviews]);
  const cov = status?.coverage;
  const summary = status?.lastRunSummary;

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
          <MdStraighten size={22} />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Tailles des produits</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>
            L’agent range les tailles de chaque produit, retire celles qui n’ont rien à y faire et ajoute celles que la fiche annonce. Les tailles elles-mêmes, les prix et les commandes passées ne sont jamais modifiés.
          </p>
        </div>
      </div>

      {status && !status.groqConfigured && (
        <div style={{ ...PANEL, padding: '12px 16px', color: '#fca5a5', fontSize: '13px' }}>
          Service IA non configuré sur ce serveur (GROQ_API_KEY manquant) : seul le rangement (ordre, doublons) est fait.
        </div>
      )}

      {/* Réglages et couverture */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle label="Agent actif" on={!!status?.enabled} disabled={!status} onChange={(v) => updateSetting({ enabled: v })} />
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{status?.enabled ? 'Agent actif' : 'Agent en pause'}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Examine chaque produit modifié et tout le catalogue à 3 h 30</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle label="Ajustements appliqués d’office" on={!!status?.autoApply} disabled={!status} onChange={(v) => updateSetting({ autoApply: v })} />
            <div>
              <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Ajustements appliqués d’office</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Sinon, chaque ajustement attend votre validation. L’ordre et les doublons sont toujours rangés.</div>
            </div>
          </div>
        </div>

        <div style={{ ...PANEL, padding: '14px 16px' }}>
          <div style={labelStyle}>Produits examinés</div>
          <div style={{ color: '#fff', fontSize: '26px', fontWeight: 700, marginTop: '6px' }}>
            {cov ? `${cov.examines} / ${cov.produits}` : '—'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
            {cov ? `${cov.avecTailles} produits proposent des tailles` : ''}
          </div>
        </div>

        <div style={{ ...PANEL, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={labelStyle}>Dernière passe complète</div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
            {status?.running
              ? `En cours… (${status.queued} en file)`
              : summary
                ? `${fmtDate(status?.lastRunAt || null)} · ${summary.examines} examinés, ${summary.appliques} rangés ou ajustés, ${summary.propositions} propositions, ${summary.signalements} signalements${summary.arret ? ` · arrêtée : ${summary.arret} (reprise la nuit suivante)` : ''}`
                : 'Jamais lancée'}
          </div>
          {status && status.tokensBudget > 0 && (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
              Budget IA du jour (partagé avec la relecture) : {Math.round((status.tokensToday / status.tokensBudget) * 100)} % · modèle {status.model}
            </div>
          )}
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
        {tab === 'todo' && proposals > 1 && (
          <button style={{ ...btn('#22c55e', true), marginLeft: 'auto' }} disabled={bulk} onClick={acceptAll}>
            <MdAutoAwesome size={15} /> {bulk ? 'Mise à jour…' : `Accepter les ${proposals} ajustements`}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Chargement…</div>
      ) : reviews.length === 0 ? (
        <div style={{ ...PANEL, padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
          {tab === 'todo' ? 'Rien à valider.' : tab === 'flags' ? 'Aucun signalement.' : 'Aucune entrée.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              busy={busyId === r.id || bulk}
              onAccept={(x) => act(x, apiAcceptTaillesReview, 'Tailles du produit mises à jour')}
              onReject={(x) => act(x, apiRejectTaillesReview, x.kind === 'signalement' ? 'Signalement classé' : 'Proposition refusée')}
              onRevert={(x) => act(x, apiRevertTaillesReview, 'Tailles d’avant rétablies')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default IATaillesPage;
