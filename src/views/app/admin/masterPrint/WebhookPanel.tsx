/*
 * « Suivi automatique » de la page Commandes Master Print — ajout 20/11/2026.
 * Master Print prévient PEG à chaque étape par un webhook signé. Ici : ce serveur
 * est-il abonné, Master Print arrive-t-il à le joindre (derniers envois, code
 * HTTP), et PEG a-t-il bien reçu et traité ces notifications
 * (`master_print_events`). « Abonner ce serveur » (re)crée l'abonnement de CETTE
 * adresse seulement : les autres serveurs PEG (même clé) ne bougent pas.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { HiCheckCircle, HiRefresh, HiXCircle } from 'react-icons/hi';
import type { MpWebhooksOverview } from '@/@types/masterPrintOrders';
import {
  apiGetMasterPrintWebhooks,
  apiSubscribeMasterPrintWebhook,
} from '@/services/MasterPrintOrdersServices';
import { isMasterPrintMissing, masterPrintError } from '@/utils/masterPrint';
import {
  ALERT_TONES,
  HEALTH_TONES,
  deliveryLabel,
  eventLabel,
} from '@/utils/masterPrintOrders';
import {
  Btn,
  Pill,
  card,
  grid,
  label,
  muted,
} from '@/views/app/common/projects/details/components/masterPrint/ui';

const date = (iso: string | null | undefined) =>
  iso ? dayjs(iso).format('D MMM YYYY à HH:mm') : '';

const Fact = ({ title, children }: { title: string; children: string }) => (
  <div style={{ minWidth: 0 }}>
    <p style={label}>{title}</p>
    <p style={{ fontSize: '13px', overflowWrap: 'anywhere' }}>{children}</p>
  </div>
);

const WebhookPanel = () => {
  const [data, setData] = useState<MpWebhooksOverview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const res = await apiGetMasterPrintWebhooks();
      setData(res.data);
      setState('ready');
    } catch (e) {
      setError(
        isMasterPrintMissing(e)
          ? 'Suivi automatique indisponible : le serveur n’est pas encore à jour.'
          : masterPrintError(e, 'État du suivi automatique indisponible.')
      );
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subscribe = async (again: boolean) => {
    if (
      again &&
      !window.confirm(
        'Réabonner ce serveur ? L’abonnement de cette adresse est remplacé ; ceux des autres serveurs ne bougent pas.'
      )
    )
      return;
    setBusy(true);
    try {
      await apiSubscribeMasterPrintWebhook();
      toast.success('Ce serveur est abonné aux notifications de Master Print.');
      await load();
    } catch (e) {
      toast.error(masterPrintError(e, 'Abonnement impossible.'));
    } finally {
      setBusy(false);
    }
  };

  if (state === 'error' || (state === 'loading' && !data)) {
    return (
      <div style={card}>
        <p style={{ fontSize: '14px', fontWeight: 700 }}>Suivi automatique</p>
        <p
          style={{
            ...muted,
            marginTop: '4px',
            ...(state === 'error' ? { color: '#fca5a5' } : {}),
          }}
        >
          {state === 'error' ? error : 'Lecture de l’abonnement…'}
        </p>
        {state === 'error' && (
          <div style={{ marginTop: '10px' }}>
            <Btn onClick={load}>Réessayer</Btn>
          </div>
        )}
      </div>
    );
  }
  if (!data || !data.configured) return null;

  const { health, received, deliveriesSummary: sum } = data;
  const https = !!data.url && data.url.startsWith('https://');
  const again = data.subscribed;

  return (
    <div style={card} data-testid="master-print-webhooks">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <strong style={{ fontSize: '14px' }}>Suivi automatique</strong>
        <Pill tone={HEALTH_TONES[health.level]}>{health.title}</Pill>
      </div>
      <p style={{ ...muted, marginTop: '4px' }}>{health.detail}</p>

      <div style={{ ...grid(170), marginTop: '12px' }}>
        <Fact title="Abonné">
          {data.subscribed
            ? `Oui${data.stored?.since ? `, depuis le ${date(data.stored.since)}` : ''}`
            : 'Non'}
        </Fact>
        <Fact title="Envois de Master Print">
          {sum.total
            ? `${sum.delivered} reçu(s)${sum.failed ? ` · ${sum.failed} refusé(s)` : ''}${sum.pending ? ` · ${sum.pending} en attente` : ''}`
            : 'Aucun pour l’instant'}
        </Fact>
        <Fact title="Dernier reçu par PEG">
          {received.lastAt
            ? `${date(received.lastAt)} · ${eventLabel(received.recent[0]?.type || '')}`
            : 'Jamais'}
        </Fact>
        <Fact title="Reçus sur 7 jours">{String(received.last7Days)}</Fact>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '12px',
        }}
      >
        <Btn
          variant={again && health.level === 'ok' ? 'ghost' : 'primary'}
          onClick={() => subscribe(again)}
          disabled={busy || !https}
          title={
            https
              ? undefined
              : 'Master Print n’appelle qu’une adresse https publique'
          }
        >
          {busy
            ? 'Abonnement…'
            : again
              ? 'Réabonner ce serveur'
              : 'Abonner ce serveur'}
        </Btn>
        <Btn onClick={() => setOpen((v) => !v)}>
          {open ? 'Masquer le détail' : 'Détail des envois'}
        </Btn>
        <Btn onClick={load} disabled={state === 'loading'}>
          <HiRefresh aria-hidden="true" />
          {state === 'loading' ? 'Lecture…' : 'Actualiser'}
        </Btn>
      </div>

      {open && (
        <div
          style={{
            marginTop: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <Fact title="Adresse appelée par Master Print">
            {data.url || 'inconnue'}
          </Fact>

          <div>
            <p style={label}>Derniers envois de Master Print</p>
            {data.deliveriesError && (
              <p style={{ ...muted, color: '#fca5a5' }}>
                {data.deliveriesError}
              </p>
            )}
            {!data.deliveries.length ? (
              <p style={muted}>Aucun envoi enregistré pour cet abonnement.</p>
            ) : (
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {data.deliveries.map((d, i) => {
                  const r = deliveryLabel(d);
                  return (
                    <li
                      key={d.eventId || i}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        fontSize: '12.5px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: '6px 10px',
                        }}
                      >
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {date(d.createdAt || d.lastAttemptAt)}
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          {eventLabel(d.event)}
                        </span>
                        <Pill tone={ALERT_TONES[r.level]}>{r.label}</Pill>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: d.receivedByPeg ? '#86efac' : '#fcd34d',
                          }}
                        >
                          {d.receivedByPeg ? (
                            <HiCheckCircle aria-hidden="true" />
                          ) : (
                            <HiXCircle aria-hidden="true" />
                          )}
                          {d.receivedByPeg
                            ? 'traité par PEG'
                            : 'pas trace chez PEG'}
                        </span>
                      </div>
                      {d.lastError && d.state !== 'delivered' && (
                        <p
                          style={{
                            ...muted,
                            color: '#fca5a5',
                            marginTop: '2px',
                          }}
                        >
                          {d.lastError}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {!!received.recent.length && (
            <div>
              <p style={label}>Derniers événements reçus par PEG</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {received.recent.map((r, i) => (
                  <li key={i} style={{ ...muted, fontSize: '12.5px' }}>
                    {date(r.at)} · {eventLabel(r.type)}
                    {r.orderId ? ` · ${r.orderId}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!data.others.length && (
            <div>
              <p style={label}>Autres adresses abonnées avec cette clé</p>
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {data.others.map((o) => (
                  <li
                    key={o.url}
                    style={{
                      ...muted,
                      fontSize: '12.5px',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {o.url}
                    {o.active ? '' : ' (désactivé)'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebhookPanel;
