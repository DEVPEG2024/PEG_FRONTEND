import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { env } from '@/configs/env.config';
import { API_BASE_URL } from '@/configs/api.config';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { Container } from '@/components/shared';
import { RootState, useAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { TbSparkles, TbSend, TbCheck, TbX, TbClock, TbTrash, TbRefresh, TbFileInvoice, TbClipboardCheck, TbCoin, TbMessageDots, TbFolderPlus } from 'react-icons/tb';
import { HiOutlineSearch } from 'react-icons/hi';
import { Quote, QUOTE_STATUS_META } from '@/@types/quote';
import { apiGetQuotes, apiGetCustomerQuotes, apiUpdateQuote, apiDeleteQuote } from '@/services/QuoteServices';
import { apiCreateProject } from '@/services/ProjectServices';
import { apiCreateInvoice, apiGetNextInvoiceNumber } from '@/services/InvoicesServices';
import { unwrapData } from '@/utils/serviceHelper';
import { fmtEur } from '@/utils/priceHelpers';
import CatalogueBanner from '@/views/app/common/categories/CatalogueBanner';

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtAmount = (n?: number | null) =>
  typeof n === 'number' ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' € HT' : '—';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

const card: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(22,28,43,0.95), rgba(13,16,24,0.95))',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px 20px',
  display: 'flex', flexDirection: 'column', gap: '12px',
};
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '13px',
  fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
};

/* ── Panel chrome (titre + action optionnelle) ── */
const Panel = ({ title, action, children, style }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '22px', ...style }}>
    {(title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

/* ── KPI card ── */
const KpiCard = ({ icon, iconBg, iconBorder, iconColor, label, value, hint }: any) => (
  <div style={{ flex: '1 1 200px', minWidth: 0, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, margin: '0 0 2px' }}>{label}</p>
      <p style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>{hint}</p>
    </div>
  </div>
);

/* ── Illustration hero (presse-papiers DEVIS + stylo + bulle + €) ── */
const HeroArt = () => (
  <svg width="300" height="170" viewBox="0 0 300 170" fill="none" style={{ flexShrink: 0, maxWidth: '40%', height: 'auto' }} aria-hidden>
    <defs>
      <linearGradient id="devG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6d5dfc" /><stop offset="1" stopColor="#4534c9" />
      </linearGradient>
    </defs>
    {/* socle */}
    <ellipse cx="150" cy="150" rx="96" ry="12" fill="#3d2fa8" opacity="0.35" />
    {/* presse-papiers */}
    <rect x="98" y="26" width="104" height="124" rx="12" fill="url(#devG)" opacity="0.95" />
    <rect x="120" y="18" width="60" height="18" rx="6" fill="#7a6bf0" />
    <rect x="138" y="13" width="24" height="12" rx="5" fill="#a99bff" />
    {/* feuille */}
    <rect x="110" y="40" width="80" height="100" rx="7" fill="#f4f3ff" />
    <text x="122" y="62" fill="#5a47e0" fontSize="12" fontWeight="800" fontFamily="Inter, sans-serif">DEVIS</text>
    <rect x="122" y="72" width="46" height="6" rx="3" fill="#cfc8ff" />
    <rect x="122" y="84" width="56" height="6" rx="3" fill="#e0dcff" />
    <rect x="122" y="96" width="40" height="6" rx="3" fill="#e0dcff" />
    <rect x="122" y="108" width="52" height="6" rx="3" fill="#e0dcff" />
    {/* signature */}
    <path d="M124 126 q6 -8 12 0 q6 8 12 0" stroke="#8b7dff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    {/* bulle de chat */}
    <rect x="30" y="56" width="48" height="34" rx="10" fill="#5a47e0" />
    <path d="M44 90 l-6 12 l16 -10 Z" fill="#5a47e0" />
    <circle cx="44" cy="73" r="3" fill="#fff" /><circle cx="54" cy="73" r="3" fill="#fff" /><circle cx="64" cy="73" r="3" fill="#fff" />
    {/* badge € */}
    <rect x="36" y="104" width="42" height="42" rx="11" fill="#3d2fa8" stroke="rgba(255,255,255,0.15)" />
    <text x="50" y="132" fill="#a99bff" fontSize="20" fontWeight="800" fontFamily="Inter, sans-serif">€</text>
    {/* check + lignes */}
    <rect x="218" y="86" width="50" height="40" rx="10" fill="#1f2740" stroke="rgba(255,255,255,0.1)" />
    <circle cx="232" cy="106" r="9" fill="#34d399" />
    <path d="M228 106 l3 3 l5 -6" stroke="#0f1c2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <rect x="246" y="100" width="16" height="4" rx="2" fill="#fff" opacity="0.6" />
    <rect x="246" y="109" width="12" height="4" rx="2" fill="#fff" opacity="0.4" />
    {/* avion en papier */}
    <path d="M236 44 l34 -16 l-12 34 l-8 -12 Z" fill="#8b7dff" />
    <path d="M236 44 l22 6 l-8 -16 Z" fill="#6d5dfc" />
    <path d="M250 60 q14 -10 20 -32" stroke="#6d5dfc" strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round" fill="none" opacity="0.6" />
  </svg>
);

/* ── Area chart (montants validés par mois) — axes toujours visibles ── */
const niceMax = (m: number): number => {
  if (m <= 0) return 3000;
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const n = m / pow;
  const step = n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : 10;
  return step * pow;
};
const QuotesChart = ({ data, empty }: { data: number[]; empty?: boolean }) => {
  const max = empty ? 3000 : niceMax(Math.max(...data));
  const ticks = [max, (max * 2) / 3, max / 3, 0];
  const W = 720, H = 200, padT = 8, padB = 8;
  const innerH = H - padT - padB;
  const pts = data.map((v, i) => {
    const x = (W * i) / (data.length - 1);
    const y = padT + innerH - (innerH * v) / max;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${W},${padT + innerH} L0,${padT + innerH} Z`;
  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '200px', paddingBottom: '22px', flexShrink: 0 }}>
        {ticks.map((t) => <span key={t} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textAlign: 'right', lineHeight: 1 }}>{Math.round(t)} €</span>)}
      </div>
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" preserveAspectRatio="none" role="img" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="quoteG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a78bfa" stopOpacity="0.35" />
              <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => {
            const y = padT + innerH - (innerH * t) / max;
            return <line key={t} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
          })}
          {!empty && <>
            <path d={area} fill="url(#quoteG)" />
            <path d={line} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {pts.map((p, i) => data[i] > 0 && <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="#a78bfa" />)}
          </>}
        </svg>
        {empty && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>
            <TbSparkles size={28} style={{ color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }} />
            <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 6px' }}>Aucune donnée pour le moment</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>Vos devis validés apparaîtront ici.</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
          {MONTHS.map((m) => <span key={m} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{m}</span>)}
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: Quote['status'] }) => {
  const m = QUOTE_STATUS_META[status];
  return (
    <span style={{
      background: `${m.color}22`, border: `1px solid ${m.color}55`, color: m.color,
      borderRadius: '100px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
};

function QuoteCard({ quote, isAdmin, busy, validateLabel = 'Valider le devis', onPropose, onValidate, onReject, onDelete, onReopen }: {
  quote: Quote; isAdmin: boolean; busy: boolean; validateLabel?: string;
  onPropose: (amount: number, message: string) => void;
  onValidate: () => void;
  onReject: () => void;
  onDelete: () => void;
  onReopen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0, letterSpacing: '-0.01em' }}>
            {quote.title || quote.projectType || 'Demande de devis'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '3px 0 0' }}>
            {isAdmin ? (quote.customer?.name || quote.requestedByName || 'Client') : quote.projectType}
            {' · '}{fmtDate(quote.createdAt)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <StatusBadge status={quote.status} />
          {isAdmin && (
            <button
              onClick={onDelete}
              disabled={busy}
              title="Supprimer le devis"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', cursor: busy ? 'wait' : 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
            >
              <TbTrash size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Détails de la demande */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {quote.projectType && <Tag>{quote.projectType}</Tag>}
        {quote.quantity && <Tag>Qté : {quote.quantity}</Tag>}
        {quote.desiredDeadline && <Tag>Délai : {fmtDate(quote.desiredDeadline)}</Tag>}
      </div>
      {quote.description && (
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {quote.description}
        </p>
      )}

      {/* Proposition existante */}
      {(quote.status === 'proposed' || quote.status === 'accepted') && (
        <div style={{
          background: 'rgba(107,158,255,0.08)', border: '1px solid rgba(107,158,255,0.25)',
          borderRadius: '12px', padding: '12px 14px',
        }}>
          <p style={{ color: '#6b9eff', fontSize: '11px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Proposition
          </p>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{fmtAmount(quote.proposalAmount)}</p>
          {quote.proposalMessage && (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', margin: '6px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {quote.proposalMessage}
            </p>
          )}
        </div>
      )}

      {/* Actions ADMIN : envoyer une proposition */}
      {isAdmin && quote.status === 'requested' && (
        !open ? (
          <button onClick={() => setOpen(true)} style={btnPrimary}>
            <TbSend size={16} /> Envoyer une proposition
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input style={inputStyle} type="number" placeholder="Montant (€ HT)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="Message / détails de la proposition" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button disabled={busy} onClick={() => {
                const a = parseFloat(amount);
                if (!a || a <= 0) { toast.error('Montant invalide'); return; }
                onPropose(a, message.trim());
              }} style={{ ...btnPrimary, flex: 1, opacity: busy ? 0.6 : 1 }}>
                <TbSend size={16} /> {busy ? 'Envoi…' : 'Envoyer'}
              </button>
              <button onClick={() => setOpen(false)} style={btnGhost}>Annuler</button>
            </div>
          </div>
        )
      )}

      {/* Actions CLIENT : valider / refuser la proposition */}
      {!isAdmin && quote.status === 'proposed' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button disabled={busy} onClick={onValidate} style={{ ...btnSuccess, flex: 1, opacity: busy ? 0.6 : 1 }}>
            <TbCheck size={16} /> {busy ? 'Traitement…' : validateLabel}
          </button>
          <button disabled={busy} onClick={onReject} style={btnDanger}>
            <TbX size={16} /> Refuser
          </button>
        </div>
      )}

      {quote.status === 'accepted' && (
        <p style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TbCheck size={16} /> Validé — projet créé
        </p>
      )}
      {quote.status === 'rejected' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ color: '#f87171', fontSize: '13px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TbX size={16} /> Devis refusé{!isAdmin ? '' : ' par le client'}
          </p>
          {isAdmin && (
            <button disabled={busy} onClick={onReopen} style={{ ...btnGhost, padding: '7px 12px' }}>
              <TbRefresh size={15} /> {busy ? '…' : 'Rouvrir'}
            </button>
          )}
        </div>
      )}
      {!isAdmin && quote.status === 'requested' && (
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TbClock size={15} /> En attente de la proposition de l'équipe
        </p>
      )}
    </div>
  );
}

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
    borderRadius: '8px', padding: '3px 9px', color: '#a78bfa', fontSize: '11px', fontWeight: 600,
  }}>{children}</span>
);

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: '10px',
  padding: '10px 14px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
};
const btnSuccess: React.CSSProperties = { ...btnPrimary, background: 'linear-gradient(90deg, #22c55e, #16a34a)' };
const btnDanger: React.CSSProperties = { ...btnPrimary, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' };
const btnGhost: React.CSSProperties = { ...btnPrimary, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' };

const TAB_STATES = [
  { key: 'all', label: 'Tous' },
  { key: 'requested', label: 'Demandes' },
  { key: 'proposed', label: 'Propositions' },
  { key: 'accepted', label: 'Validés' },
  { key: 'rejected', label: 'Refusés' },
];

const HOW_STEPS = [
  { Icon: TbMessageDots, color: '#a99bff', bg: 'rgba(139,125,255,0.12)', title: 'Demande envoyée', desc: 'Décrivez votre besoin, on revient vers vous.' },
  { Icon: TbCoin, color: '#6b9eff', bg: 'rgba(107,158,255,0.12)', title: 'Proposition chiffrée', desc: "L'équipe vous transmet un montant détaillé." },
  { Icon: TbClipboardCheck, color: '#34d399', bg: 'rgba(52,211,153,0.12)', title: 'Validation', desc: 'Vous acceptez et réglez en un clic.' },
  { Icon: TbFolderPlus, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', title: 'Projet créé', desc: 'Votre projet démarre automatiquement.' },
];

const QuotesList = () => {
  const { user }: { user: User } = useAppSelector((state: RootState) => state.auth.user);
  const { token } = useAppSelector((state: RootState) => state.auth.session);
  const isAdmin = hasRole(user, [ADMIN, SUPER_ADMIN]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const paidHandledRef = useRef<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = isAdmin
        ? await unwrapData(apiGetQuotes({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' }))
        : await unwrapData(apiGetCustomerQuotes(user?.customer?.documentId || ''));
      setQuotes((res as any).quotes_connection?.nodes || []);
    } catch {
      toast.error('Impossible de charger les devis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Retour de paiement Stripe : finalise (crée le projet) si payé, ou notifie l'annulation
  useEffect(() => {
    const canceled = params.get('canceled');
    if (canceled) {
      toast.info('Paiement annulé — devis non validé');
      navigate('/common/quotes', { replace: true });
      return;
    }
    const paid = params.get('paid');
    if (!paid || loading) return;
    if (paidHandledRef.current === paid) return;
    paidHandledRef.current = paid;
    // Le projet est créé de façon fiable par le webhook Stripe (côté backend).
    // On affiche le succès et on rafraîchit le temps que le webhook traite.
    toast.success('Paiement reçu — votre projet est en cours de création.');
    navigate('/common/quotes', { replace: true });
    setTimeout(() => load(), 3000);
    setTimeout(() => load(), 7000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, loading]);

  const pendingCount = useMemo(
    () => quotes.filter((q) => (isAdmin ? q.status === 'requested' : q.status === 'proposed')).length,
    [quotes, isAdmin]
  );

  /* ── KPI ── */
  const stats = useMemo(() => {
    const acceptedQ = quotes.filter((q) => q.status === 'accepted');
    const validatedAmount = acceptedQ.reduce((s, q) => s + (q.proposalAmount ?? 0), 0);
    return { total: quotes.length, pending: pendingCount, accepted: acceptedQ.length, validatedAmount };
  }, [quotes, pendingCount]);

  /* ── Filtrage (tabs + recherche) ── */
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return quotes.filter((q) => {
      if (activeTab !== 'all' && q.status !== activeTab) return false;
      if (!term) return true;
      return [q.title, q.projectType, q.description, q.customer?.name, q.requestedByName]
        .some((v) => v?.toLowerCase().includes(term));
    });
  }, [quotes, activeTab, searchTerm]);
  const tabCount = (key: string) => key === 'all' ? quotes.length : quotes.filter((q) => q.status === key).length;

  /* ── Suivi des devis validés par mois ── */
  const years = useMemo(() => {
    const set = new Set<number>(quotes.map((q) => dayjs(q.validatedAt || q.createdAt).year()).filter(Boolean));
    set.add(dayjs().year());
    return Array.from(set).sort((a, b) => b - a);
  }, [quotes]);
  const [year, setYear] = useState<number>(dayjs().year());

  const monthly = useMemo(() => {
    const months = new Array(12).fill(0);
    for (const q of quotes) {
      if (q.status !== 'accepted') continue;
      const d = dayjs(q.validatedAt || q.createdAt);
      if (d.year() === year) months[d.month()] += q.proposalAmount ?? 0;
    }
    return months;
  }, [quotes, year]);
  const hasMonthly = monthly.some((v) => v > 0);

  /* ── Activité récente (5 derniers devis) ── */
  const activity = useMemo(() =>
    [...quotes].sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf()).slice(0, 5)
  , [quotes]);

  const handlePropose = async (q: Quote, amount: number, message: string) => {
    setBusyId(q.documentId);
    try {
      await unwrapData(apiUpdateQuote(q.documentId, {
        status: 'proposed', proposalAmount: amount, proposalMessage: message || null,
        proposedAt: new Date().toISOString(),
      }));
      toast.success('Proposition envoyée');
      await load();
    } catch { toast.error("Échec de l'envoi"); } finally { setBusyId(null); }
  };

  // Validation : paiement immédiat si le client n'a PAS le paiement différé,
  // sinon validation différée en GraphQL (projet + facture en attente)
  const handleValidate = async (q: Quote) => {
    const deferred = !!user?.customer?.deferredPayment;
    if (deferred) {
      await finalizeDeferred(q);
    } else {
      await startQuotePayment(q);
    }
  };

  // Paiement différé : crée le projet + une facture en attente (tout en GraphQL)
  const finalizeDeferred = async (q: Quote) => {
    if (q.status === 'accepted') return;
    setBusyId(q.documentId);
    try {
      const now = new Date();
      const end = q.desiredDeadline ? new Date(q.desiredDeadline) : new Date(now.getTime() + 30 * 86400000);
      const amountHT = q.proposalAmount || 0;

      const { createProject }: any = await unwrapData(apiCreateProject({
        name: q.title || `Projet — ${q.projectType || 'Devis'}`,
        description: q.description || '',
        startDate: now,
        endDate: end,
        state: 'pending',
        priority: 'medium',
        price: amountHT,
        producerPrice: 0,
        paidPrice: 0,
        producerPaidPrice: 0,
        poolable: false,
        customer: q.customer?.documentId ? { documentId: q.customer.documentId } : null,
      } as any));

      // Facture en attente liée au projet
      try {
        const totalTTC = Math.round(amountHT * 1.2 * 100) / 100;
        const name = await apiGetNextInvoiceNumber();
        await unwrapData(apiCreateInvoice({
          name,
          customer: q.customer?.documentId ? { documentId: q.customer.documentId } : undefined,
          project: createProject?.documentId,
          amount: amountHT,
          vatAmount: Math.round((totalTTC - amountHT) * 100) / 100,
          totalAmount: totalTTC,
          date: now,
          dueDate: end,
          state: 'pending',
          paymentMethod: 'transfer',
          paymentState: 'pending',
          paymentAmount: 0,
        } as any));
      } catch { /* facture non bloquante */ }

      await unwrapData(apiUpdateQuote(q.documentId, {
        status: 'accepted', validatedAt: now.toISOString(), project: createProject?.documentId,
      }));
      toast.success('Devis validé — projet créé');
      await load();
    } catch {
      toast.error('Échec de la validation');
    } finally {
      setBusyId(null);
    }
  };

  // Paiement immédiat : redirige vers Stripe (Stripe.js chargé à la demande)
  const startQuotePayment = async (q: Quote) => {
    setBusyId(q.documentId);
    try {
      const res = await fetch(API_BASE_URL + '/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `${TOKEN_TYPE}${token}` },
        body: JSON.stringify({ quoteDocumentId: q.documentId }),
      });
      if (!res.ok) throw new Error('session');
      const { id } = await res.json();
      const stripe = await loadStripe(env?.STRIPE_PUBLIC_KEY as string);
      if (!stripe || !id) throw new Error('stripe');
      await stripe.redirectToCheckout({ sessionId: id });
    } catch {
      toast.error('Impossible de démarrer le paiement');
      setBusyId(null);
    }
  };

  const handleReopen = async (q: Quote) => {
    setBusyId(q.documentId);
    try {
      // Rouvre : si une proposition existe → 'proposed' (le client peut re-décider), sinon 'requested'
      await unwrapData(apiUpdateQuote(q.documentId, { status: q.proposalAmount ? 'proposed' : 'requested' }));
      toast.success('Devis rouvert');
      await load();
    } catch { toast.error('Échec de la réouverture'); } finally { setBusyId(null); }
  };

  const handleDelete = async (q: Quote) => {
    if (!window.confirm(`Supprimer définitivement ce devis ${q.customer?.name ? `de ${q.customer.name}` : ''} ?`)) return;
    setBusyId(q.documentId);
    try {
      await unwrapData(apiDeleteQuote(q.documentId));
      toast.success('Devis supprimé');
      setQuotes((prev) => prev.filter((x) => x.documentId !== q.documentId));
    } catch { toast.error('Échec de la suppression'); } finally { setBusyId(null); }
  };

  const handleReject = async (q: Quote) => {
    setBusyId(q.documentId);
    try {
      await unwrapData(apiUpdateQuote(q.documentId, { status: 'rejected' }));
      toast.success('Devis refusé');
      await load();
    } catch { toast.error("Échec"); } finally { setBusyId(null); }
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Bannière (CMS, comme Projets / Offres) ── */}
      <div style={{ paddingTop: '24px' }}>
        <CatalogueBanner bannerName="Bannière devis" aspect="3.4 / 1" minHeight="220px" maxHeight="380px" />
      </div>

      {/* ── Hero ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginBottom: '24px' }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#8b7dff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Devis</p>
          <h2 style={{ color: '#fff', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAdmin ? 'Devis' : 'Mes devis'} <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: 600, borderRadius: '100px', padding: '3px 11px' }}>{quotes.length}</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0, maxWidth: '440px' }}>
            Consultez, comparez et suivez vos demandes de devis en toute simplicité.
          </p>
        </div>
        <HeroArt />
      </div>

      {/* ── KPI ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
        <KpiCard icon={<TbSparkles size={24} />} iconBg="rgba(139,125,255,0.12)" iconBorder="rgba(139,125,255,0.28)" iconColor="#a99bff"
          label="Total devis" value={stats.total} hint="Toutes demandes confondues" />
        <KpiCard icon={<TbClock size={24} />} iconBg="rgba(251,191,36,0.12)" iconBorder="rgba(251,191,36,0.28)" iconColor="#fbbf24"
          label="En attente" value={stats.pending} hint={isAdmin ? 'Demandes à traiter' : 'Propositions à valider'} />
        <KpiCard icon={<TbClipboardCheck size={24} />} iconBg="rgba(52,211,153,0.12)" iconBorder="rgba(52,211,153,0.28)" iconColor="#34d399"
          label="Validés" value={stats.accepted} hint="Devis acceptés" />
        <KpiCard icon={<TbCoin size={22} />} iconBg="rgba(107,158,255,0.12)" iconBorder="rgba(107,158,255,0.28)" iconColor="#6b9eff"
          label="Montant validé" value={fmtEur(stats.validatedAmount)} hint="Devis acceptés (HT)" />
      </div>

      {/* ── Tabs + Search ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TAB_STATES.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: activeTab === tab.key ? 'rgba(139,92,246,0.2)' : 'transparent', color: activeTab === tab.key ? '#a78bfa' : 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}
            >
              {tab.label}
              <span style={{ marginLeft: '5px', background: activeTab === tab.key ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: '100px', padding: '1px 6px', fontSize: '10px', color: activeTab === tab.key ? '#a78bfa' : 'rgba(255,255,255,0.55)' }}>
                {tabCount(tab.key)}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '340px' }}>
          <HiOutlineSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Rechercher un devis…" value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '8px 14px 8px 33px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
          />
        </div>
        {!isAdmin && (
          <button onClick={() => navigate('/customer/devis')}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 16px', borderRadius: '10px', background: 'rgba(139,125,255,0.1)', border: '1px solid rgba(139,125,255,0.3)', cursor: 'pointer', color: '#a99bff', fontSize: '13px', fontWeight: 600, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,125,255,0.2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139,125,255,0.1)' }}
          >
            <TbSend size={15} /> Demander un devis
          </button>
        )}
      </div>

      {/* ── Grille principale : liste + activité ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '18px', marginBottom: '18px' }}>
        {/* Liste devis */}
        <Panel style={{ padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', height: '120px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: '74px', height: '74px', borderRadius: '18px', border: '2px dashed rgba(139,125,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                <TbFileInvoice size={34} style={{ color: '#8b7dff' }} />
              </div>
              <p style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: '0 0 8px' }}>
                {quotes.length === 0 ? 'Aucun devis pour le moment' : 'Aucun devis dans cette catégorie'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 20px', maxWidth: '320px', lineHeight: 1.5 }}>
                {isAdmin
                  ? 'Les demandes de devis de vos clients apparaîtront ici.'
                  : "Vous n'avez pas encore créé de demande de devis."}
              </p>
              {!isAdmin && (
                <button onClick={() => navigate('/customer/devis')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 22px', borderRadius: '11px', background: 'linear-gradient(135deg, #6d5dfc, #5a47e0)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(109,93,252,0.35)', transition: 'transform 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  Demander un devis →
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filtered.map((q) => (
                <QuoteCard
                  key={q.documentId}
                  quote={q}
                  isAdmin={isAdmin}
                  busy={busyId === q.documentId}
                  validateLabel={user?.customer?.deferredPayment ? 'Valider le devis' : 'Payer et valider'}
                  onPropose={(a, m) => handlePropose(q, a, m)}
                  onValidate={() => handleValidate(q)}
                  onReject={() => handleReject(q)}
                  onDelete={() => handleDelete(q)}
                  onReopen={() => handleReopen(q)}
                />
              ))}
            </div>
          )}
        </Panel>

        {/* Activité récente */}
        <Panel title="Activité récente" action={<a onClick={(e) => { e.preventDefault(); setActiveTab('all'); setSearchTerm('') }} href="#" style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>Voir tout</a>}>
          {activity.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                {[
                  { c: '#34d399', bg: 'rgba(52,211,153,0.12)', Icon: TbClipboardCheck },
                  { c: '#a99bff', bg: 'rgba(139,125,255,0.12)', Icon: TbFileInvoice },
                  { c: '#6b9eff', bg: 'rgba(107,158,255,0.12)', Icon: TbMessageDots },
                  { c: '#fbbf24', bg: 'rgba(251,191,36,0.12)', Icon: TbCoin },
                ].map((it, i) => (
                  <div key={i} style={{ width: '34px', height: '34px', borderRadius: '10px', background: it.bg, border: `1px solid ${it.c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: it.c }}>
                    <it.Icon size={16} />
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <TbSparkles size={26} style={{ color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }} />
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 6px' }}>Aucune activité récente</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>Vos demandes et propositions de devis apparaîtront ici.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activity.map((q) => {
                const m = QUOTE_STATUS_META[q.status];
                return (
                  <div key={q.documentId} style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${m.color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: m.color }}>
                      <TbFileInvoice size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: '0 0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.title || q.projectType || 'Demande de devis'}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>{fmtDate(q.createdAt)} · {m.label}</p>
                    </div>
                    {typeof q.proposalAmount === 'number' && (
                      <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{fmtEur(q.proposalAmount)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* ── Grille basse : suivi + comment ça marche ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: '18px', paddingBottom: '40px' }}>
        {/* Suivi des devis validés */}
        <Panel title={`Devis validés ${year}`} action={
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', padding: '6px 12px', color: '#fff', fontSize: '12px', fontWeight: 600, fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}>
            {years.map((y) => <option key={y} value={y} style={{ background: '#16263d' }}>Année {y}</option>)}
          </select>
        }>
          <QuotesChart data={monthly} empty={!hasMonthly} />
        </Panel>

        {/* Comment ça marche ? */}
        <Panel title="Comment ça marche ?" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 1 }}>
            {HOW_STEPS.map((step) => (
              <div key={step.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: step.bg, border: `1px solid ${step.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: step.color }}>
                  <step.Icon size={17} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>{step.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0, lineHeight: 1.45 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {/* déco avion */}
          <svg width="140" height="140" viewBox="0 0 100 100" style={{ position: 'absolute', right: '-14px', bottom: '-14px', opacity: 0.85, pointerEvents: 'none' }} aria-hidden>
            <defs>
              <linearGradient id="planeG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8b7dff" /><stop offset="1" stopColor="#5a47e0" />
              </linearGradient>
            </defs>
            <path d="M20 50 L80 22 L62 78 L50 60 Z" fill="url(#planeG)" />
            <path d="M20 50 L50 60 L42 38 Z" fill="#6d5dfc" />
          </svg>
        </Panel>
      </div>
    </Container>
  );
};

export default QuotesList;
