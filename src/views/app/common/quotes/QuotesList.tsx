import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/shared';
import { RootState, useAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { toast } from 'react-toastify';
import { TbSparkles, TbSend, TbCheck, TbX, TbClock } from 'react-icons/tb';
import { Quote, QUOTE_STATUS_META } from '@/@types/quote';
import { apiGetQuotes, apiGetCustomerQuotes, apiUpdateQuote } from '@/services/QuoteServices';
import { apiCreateProject } from '@/services/ProjectServices';
import { unwrapData } from '@/utils/serviceHelper';

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtEur = (n?: number | null) =>
  typeof n === 'number' ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' € HT' : '—';

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

function QuoteCard({ quote, isAdmin, busy, onPropose, onValidate, onReject }: {
  quote: Quote; isAdmin: boolean; busy: boolean;
  onPropose: (amount: number, message: string) => void;
  onValidate: () => void;
  onReject: () => void;
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
        <StatusBadge status={quote.status} />
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
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 800, margin: '4px 0 0' }}>{fmtEur(quote.proposalAmount)}</p>
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
            <TbCheck size={16} /> {busy ? 'Validation…' : 'Valider le devis'}
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

const QuotesList = () => {
  const { user }: { user: User } = useAppSelector((state: RootState) => state.auth.user);
  const isAdmin = hasRole(user, [ADMIN, SUPER_ADMIN]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const pendingCount = useMemo(
    () => quotes.filter((q) => (isAdmin ? q.status === 'requested' : q.status === 'proposed')).length,
    [quotes, isAdmin]
  );

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

  const handleValidate = async (q: Quote) => {
    setBusyId(q.documentId);
    try {
      // 1) Crée le projet (devis validé → projet en cours)
      const now = new Date();
      const end = q.desiredDeadline ? new Date(q.desiredDeadline) : new Date(now.getTime() + 30 * 86400000);
      const { createProject }: any = await unwrapData(apiCreateProject({
        name: q.title || `Projet — ${q.projectType || 'Devis'}`,
        description: q.description || '',
        startDate: now,
        endDate: end,
        state: 'pending',
        priority: 'medium',
        price: q.proposalAmount || 0,
        producerPrice: 0,
        paidPrice: 0,
        producerPaidPrice: 0,
        poolable: false,
        customer: q.customer?.documentId ? { documentId: q.customer.documentId } : null,
      } as any));
      // 2) Marque le devis comme validé + lie le projet
      await unwrapData(apiUpdateQuote(q.documentId, {
        status: 'accepted', validatedAt: now.toISOString(),
        project: createProject?.documentId,
      }));
      toast.success('Devis validé — projet créé');
      await load();
    } catch { toast.error('Échec de la validation'); } finally { setBusyId(null); }
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '28px', paddingBottom: '24px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139,92,246,0.16)',
          border: '1px solid rgba(139,92,246,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TbSparkles size={20} color="#a78bfa" />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Devis <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '16px', fontWeight: 500 }}>({quotes.length})</span>
          </h2>
          {pendingCount > 0 && (
            <p style={{ color: '#a78bfa', fontSize: '13px', margin: '2px 0 0', fontWeight: 600 }}>
              {pendingCount} {isAdmin ? `nouvelle${pendingCount > 1 ? 's' : ''} demande${pendingCount > 1 ? 's' : ''}` : `proposition${pendingCount > 1 ? 's' : ''} à valider`}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Chargement…</p>
      ) : quotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: 'rgba(255,255,255,0.45)' }}>
          <TbSparkles size={40} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: '15px', fontWeight: 600, margin: '12px 0 0' }}>Aucun devis pour le moment</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '18px', paddingBottom: '40px' }}>
          {quotes.map((q) => (
            <QuoteCard
              key={q.documentId}
              quote={q}
              isAdmin={isAdmin}
              busy={busyId === q.documentId}
              onPropose={(a, m) => handlePropose(q, a, m)}
              onValidate={() => handleValidate(q)}
              onReject={() => handleReject(q)}
            />
          ))}
        </div>
      )}
    </Container>
  );
};

export default QuotesList;
