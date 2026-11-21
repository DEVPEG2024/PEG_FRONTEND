import { useEffect, useState } from 'react';
import { HiExclamation } from 'react-icons/hi';
import {
  apiGetMasterPrintServiceStatus,
  type MpServiceStatus,
} from '@/services/MasterPrintStatusServices';

/*
 * Écrans admin Master Print (catalogue, réglages d'offre, onglet du projet) :
 * bandeau jaune quand Master Print ne répond pas (sonde /status + vrais appels
 * récents, vus par le serveur), relu toutes les minutes. Rien sinon — ni quand
 * le serveur n'a pas encore cette route.
 */

const POLL_MS = 60 * 1000;

const hhmm = (iso: string | null) => {
  const t = iso ? new Date(iso) : null;
  return t && !Number.isNaN(t.getTime())
    ? t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;
};

const ServiceStatusBanner = () => {
  const [status, setStatus] = useState<MpServiceStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const read = () =>
      apiGetMasterPrintServiceStatus()
        .then((r) => alive && setStatus(r.data))
        .catch(() => alive && setStatus(null));
    read();
    const t = setInterval(read, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!status?.configured || (status.ok && !status.degraded)) return null;
  const down = !status.ok;
  const since = hhmm(status.lastFailureAt);
  return (
    <div
      role="status"
      data-testid="master-print-service-banner"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '14px',
        background: down ? 'rgba(234,179,8,0.14)' : 'rgba(234,179,8,0.08)',
        border: `1px solid rgba(234,179,8,${down ? 0.45 : 0.25})`,
        color: '#fde68a',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        lineHeight: 1.45,
      }}
    >
      <HiExclamation
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: '2px', color: '#eab308' }}
        size={18}
      />
      <span>
        <strong style={{ color: '#fef3c7' }}>
          {down ? 'Master Print ne répond pas pour le moment' : status.message}
        </strong>
        {down && (
          <>
            {since ? ` (dernier échec à ${since})` : ''}. Prix, envois et
            catalogue reprendront dès son retour ; côté clients, les produits
            concernés affichent « momentanément indisponible ».
          </>
        )}
      </span>
    </div>
  );
};

export default ServiceStatusBanner;
