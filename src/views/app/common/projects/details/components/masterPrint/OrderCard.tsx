/*
 * Une commande Master Print du projet : statut, lignes, fichiers attendus, suivi
 * du colis, historique. Actions : relire, envoyer les fichiers manquants,
 * annuler, et en bac à sable faire avancer la commande (« Simuler »).
 */
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { HiCheckCircle, HiExclamationCircle, HiRefresh } from 'react-icons/hi';
import dayjs from 'dayjs';
import type {
  MpOrderView,
  MpProjectFile,
  MpSimulateEvent,
} from '@/@types/masterPrint';
import {
  apiCancelMasterPrintOrder,
  apiRefreshMasterPrintOrder,
  apiSendMasterPrintFiles,
  apiSimulateMasterPrintOrder,
} from '@/services/MasterPrintServices';
import {
  SIMULATE_LABELS,
  canCancel,
  fmtEur,
  masterPrintError,
  nextSimulateEvents,
  statusTone,
} from '@/utils/masterPrint';
import {
  Btn,
  Field,
  Pill,
  SANDBOX_TONE,
  card,
  grid,
  input,
  label,
  muted,
} from './ui';

type Props = {
  order: MpOrderView;
  files: MpProjectFile[];
  onUpdated: (order: MpOrderView) => void;
};

const date = (iso: string | null | undefined) =>
  iso ? dayjs(iso).format('D MMM YYYY à HH:mm') : '';

/** Le lien de suivi vient du serveur ; on n'ouvre que du https. */
const safeUrl = (u: string | null | undefined) =>
  u && /^https:\/\//i.test(u) ? u : null;

const OrderCard = ({ order, files, onUpdated }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [choice, setChoice] = useState<Record<string, number>>({});
  const tone = statusTone(order.status);
  const sandbox = order.environment === 'sandbox';

  // Un emplacement manquant n'apparaît qu'une fois, même porté par plusieurs lignes.
  const missing = useMemo(() => {
    const out = new Map<string, string>();
    for (const l of order.lines)
      for (const f of l.files)
        if (!f.received && !out.has(f.slot)) out.set(f.slot, f.label);
    return [...out.entries()];
  }, [order.lines]);

  // Échecs d'envoi encore utiles : emplacement toujours attendu.
  const failures = useMemo(() => {
    const stillMissing = new Set(missing.map(([slot]) => slot));
    const last = new Map<string, (typeof order.uploads)[number]>();
    for (const u of order.uploads) last.set(u.slot, u);
    return [...last.values()].filter((u) => !u.ok && stillMissing.has(u.slot));
  }, [order.uploads, missing]);

  const act = async (
    name: string,
    run: () => Promise<{ data: { order: MpOrderView } }>,
    ok?: string
  ) => {
    setBusy(name);
    try {
      const { data } = await run();
      onUpdated(data.order);
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(masterPrintError(e, 'Master Print n’a pas répondu.'));
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => {
    if (
      !window.confirm(
        `Annuler la commande ${order.orderId} chez Master Print ?`
      )
    )
      return;
    act(
      'cancel',
      () => apiCancelMasterPrintOrder(order.orderId, 'Annulée depuis PEG'),
      'Commande annulée chez Master Print'
    );
  };

  const sendFiles = () => {
    const picked = Object.fromEntries(
      Object.entries(choice).filter(
        ([slot, id]) => id && missing.some(([s]) => s === slot)
      )
    );
    if (!Object.keys(picked).length)
      return toast.info('Choisissez un fichier pour au moins un emplacement.');
    act(
      'files',
      () => apiSendMasterPrintFiles(order.orderId, picked),
      'Envoi des fichiers lancé'
    );
  };

  const simulate = (ev: MpSimulateEvent) =>
    act(`sim-${ev}`, () => apiSimulateMasterPrintOrder(order.orderId, ev));

  return (
    <div style={card} data-testid="master-print-order">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px 10px',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <strong style={{ fontSize: '15px' }}>{order.orderId}</strong>
          <Pill tone={tone}>{order.statusLabel}</Pill>
          {sandbox && <Pill tone={SANDBOX_TONE}>Bac à sable</Pill>}
          {order.blindShipping && <span style={muted}>· envoi neutre</span>}
        </div>
        <span style={muted}>
          {order.createdAt ? `Envoyée le ${date(order.createdAt)}` : ''}
        </span>
      </div>

      <div style={{ ...grid(180), marginTop: '12px' }}>
        <div>
          <p style={label}>Coût Master Print</p>
          <p style={{ fontSize: '15px', fontWeight: 700 }}>
            {fmtEur(order.totalWithShippingExclTax ?? order.totalExclTax)}{' '}
            <span style={muted}>HT</span>
          </p>
        </div>
        {order.tracking?.number && (
          <div>
            <p style={label}>Colis</p>
            <p style={{ fontSize: '13px' }}>
              {[order.tracking.carrier, order.tracking.number]
                .filter(Boolean)
                .join(' · ')}
              {safeUrl(order.tracking.url) && (
                <>
                  {' · '}
                  <a
                    href={safeUrl(order.tracking.url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#93c5fd', textDecoration: 'underline' }}
                  >
                    Suivre
                  </a>
                </>
              )}
            </p>
          </div>
        )}
        {order.invoiceNumber && (
          <div>
            <p style={label}>Facture Master Print</p>
            <p style={{ fontSize: '13px' }}>{order.invoiceNumber}</p>
          </div>
        )}
        {!!order.productionOrders.length && (
          <div>
            <p style={label}>N° atelier</p>
            <p style={{ fontSize: '13px' }}>
              {order.productionOrders.join(', ')}
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {order.lines.map((l) => (
          <div
            key={l.lineId}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 10px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {l.lineId} · {l.productId}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <Pill tone={statusTone(l.status)}>{l.statusLabel}</Pill>
                <span style={muted}>{fmtEur(l.totalExclTax)} HT</span>
              </span>
            </div>
            <p style={{ ...muted, marginTop: '4px' }}>{l.summary}</p>
            {!!l.files.length && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px 12px',
                  marginTop: '6px',
                }}
              >
                {l.files.map((f) => (
                  <span
                    key={f.slot}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: f.received ? '#86efac' : '#fcd34d',
                    }}
                  >
                    {f.received ? (
                      <HiCheckCircle aria-hidden="true" />
                    ) : (
                      <HiExclamationCircle aria-hidden="true" />
                    )}
                    {f.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {order.uploading && (
        <p style={{ ...muted, marginTop: '10px', color: '#93c5fd' }}>
          Envoi des fichiers à Master Print en cours…
        </p>
      )}

      {!!failures.length && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          {failures.map((u) => (
            <p key={u.slot} style={{ fontSize: '12.5px', color: '#fca5a5' }}>
              {u.fileName} : {u.error}
            </p>
          ))}
        </div>
      )}

      {!!missing.length &&
        !order.uploading &&
        !['cancelled', 'delivered'].includes(order.status) && (
          <div style={{ marginTop: '12px' }}>
            <p style={label}>Fichiers manquants</p>
            {!files.length ? (
              <p style={muted}>
                Déposez d’abord les fichiers d’impression dans l’onglet «
                Fichiers » du projet.
              </p>
            ) : (
              <div style={grid(220)}>
                {missing.map(([slot, title]) => (
                  <Field key={slot} title={title}>
                    <select
                      style={input}
                      value={choice[slot] || ''}
                      onChange={(e) =>
                        setChoice((c) => ({
                          ...c,
                          [slot]: Number(e.target.value),
                        }))
                      }
                    >
                      <option value="">Choisir un fichier…</option>
                      {files.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.source})
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            )}
            {!!files.length && (
              <div style={{ marginTop: '8px' }}>
                <Btn variant="primary" onClick={sendFiles} disabled={!!busy}>
                  {busy === 'files' ? 'Envoi…' : 'Envoyer ces fichiers'}
                </Btn>
              </div>
            )}
          </div>
        )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '14px',
        }}
      >
        <Btn
          onClick={() =>
            act('refresh', () => apiRefreshMasterPrintOrder(order.orderId))
          }
          disabled={!!busy}
        >
          <HiRefresh aria-hidden="true" />{' '}
          {busy === 'refresh' ? 'Lecture…' : 'Actualiser'}
        </Btn>
        <Btn onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? 'Masquer l’historique' : 'Historique'}
        </Btn>
        {sandbox &&
          nextSimulateEvents(order.status).map((ev) => (
            <Btn
              key={ev}
              onClick={() => simulate(ev)}
              disabled={!!busy}
              title="Bac à sable : fait avancer la commande comme le ferait Master Print"
            >
              Simuler : {SIMULATE_LABELS[ev]}
            </Btn>
          ))}
        {canCancel(order.status) && (
          <Btn variant="danger" onClick={cancel} disabled={!!busy}>
            {busy === 'cancel' ? 'Annulation…' : 'Annuler chez Master Print'}
          </Btn>
        )}
      </div>

      {showHistory && (
        <ol
          style={{
            margin: '12px 0 0',
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {order.history.map((h, i) => (
            <li
              key={i}
              style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.75)' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                {date(h.at)}
              </span>{' '}
              — {h.label}
              {h.detail ? ` (${h.detail})` : ''}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default OrderCard;
