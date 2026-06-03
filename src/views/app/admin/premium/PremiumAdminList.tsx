import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { TbCrown, TbCheck, TbRefresh, TbMail, TbPhone, TbMapPin, TbAlertCircle } from 'react-icons/tb';
import { env } from '@/configs/env.config';
import {
  apiGetPremiumCustomers,
  apiSetPremiumProcessed,
  PremiumCustomer,
} from '@/services/PremiumServices';

const GOLD = '#eab308';

function resolveLogo(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return (env?.API_ENDPOINT_URL ?? '') + url;
}

function formatSince(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

const PremiumAdminList = () => {
  const [customers, setCustomers] = useState<PremiumCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGetPremiumCustomers();
      setCustomers(data);
    } catch {
      toast.error('Erreur lors du chargement des clients Premium');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleProcessed = async (c: PremiumCustomer, value: boolean) => {
    setBusyId(c.documentId);
    try {
      await apiSetPremiumProcessed(c.documentId, value);
      setCustomers((prev) => prev.map((x) => (x.documentId === c.documentId ? { ...x, premiumProcessed: value } : x)));
      toast.success(value ? `"${c.name}" marqué comme traité` : `"${c.name}" rouvert`);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setBusyId(null);
    }
  };

  const toProcess = customers.filter((c) => !c.premiumProcessed);
  const processed = customers.filter((c) => c.premiumProcessed);

  const renderCard = (c: PremiumCustomer) => {
    const logo = resolveLogo(c.logo?.url);
    const ci = c.companyInformations;
    return (
      <div
        key={c.documentId}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          background: 'linear-gradient(160deg, rgba(22,28,43,0.9), rgba(13,16,24,0.9))',
          border: `1px solid ${c.premiumProcessed ? 'rgba(255,255,255,0.08)' : 'rgba(234,179,8,0.3)'}`,
          borderRadius: '14px', padding: '14px 16px',
        }}
      >
        {/* Logo / initiale */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, overflow: 'hidden',
          background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {logo ? (
            <img src={logo} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color: GOLD, fontWeight: 800, fontSize: '20px' }}>{(c.name || '?').charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* Infos */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{c.name}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '3px',
              background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)',
              borderRadius: '100px', padding: '2px 8px', color: GOLD, fontSize: '10px', fontWeight: 700,
            }}>
              <TbCrown size={11} /> Premium
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px', color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
            {ci?.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TbMail size={12} /> {ci.email}</span>}
            {ci?.phoneNumber && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TbPhone size={12} /> {ci.phoneNumber}</span>}
            {ci?.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><TbMapPin size={12} /> {ci.city}</span>}
            {c.premiumSince && <span>Depuis le {formatSince(c.premiumSince)}</span>}
          </div>
        </div>

        {/* Action */}
        {c.premiumProcessed ? (
          <button
            onClick={() => toggleProcessed(c, false)}
            disabled={busyId === c.documentId}
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px', padding: '8px 14px', color: 'rgba(255,255,255,0.6)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <TbRefresh size={14} /> Rouvrir
          </button>
        ) : (
          <button
            onClick={() => toggleProcessed(c, true)}
            disabled={busyId === c.documentId}
            style={{
              flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: `linear-gradient(90deg, ${GOLD}, #ca8a04)`, border: 'none',
              borderRadius: '10px', padding: '8px 14px', color: '#1a1505',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}
          >
            <TbCheck size={14} /> Marquer comme traité
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', maxWidth: '900px', margin: '0 auto', padding: '24px 20px 48px' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'rgba(234,179,8,0.16)', border: '1px solid rgba(234,179,8,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TbCrown size={22} color={GOLD} />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Clients Premium</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '2px 0 0' }}>
            {customers.length} client(s) Premium · {toProcess.length} à traiter
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>Chargement…</div>
      ) : customers.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center', padding: '40px' }}>Aucun client Premium pour le moment.</div>
      ) : (
        <>
          {/* Nouveaux à traiter */}
          {toProcess.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <TbAlertCircle size={16} color={GOLD} />
                <h3 style={{ color: GOLD, fontSize: '13px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Nouveaux — offres personnalisées à préparer ({toProcess.length})
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {toProcess.map(renderCard)}
              </div>
            </div>
          )}

          {/* Traités */}
          {processed.length > 0 && (
            <div>
              <h3 style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Traités ({processed.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {processed.map(renderCard)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PremiumAdminList;
