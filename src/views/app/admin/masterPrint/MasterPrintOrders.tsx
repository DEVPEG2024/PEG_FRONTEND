/*
 * Commandes Master Print — ajout 20/11/2026. Depuis le 22/11, onglet « Commandes »
 * de la page Master Print (`/admin/master-print?tab=commandes`, `embedded`).
 *
 * Toutes les commandes passées chez Master Print avec la clé de ce serveur,
 * fusionnées avec celles enregistrées par PEG : statut, alertes (fichier refusé,
 * fichiers attendus depuis plus de 24 h, BAT attendu, annulée), fichiers reçus,
 * achat / vente / marge HT, colis, facture d'achat PDF. Une commande que PEG ne
 * connaît pas (autre serveur PEG avec la même clé, essai) est « hors PEG ».
 * En haut : le suivi automatique (webhooks).
 * Backend : peg_strapi `master-print-orders.service.ts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { HiRefresh, HiSearch } from 'react-icons/hi';
import type {
  MpAdminOrder,
  MpOrdersFilter,
  MpOrdersPage,
} from '@/@types/masterPrintOrders';
import { apiGetMasterPrintOrders } from '@/services/MasterPrintOrdersServices';
import {
  fmtEur,
  isMasterPrintMissing,
  masterPrintError,
  statusTone,
} from '@/utils/masterPrint';
import {
  ALERT_TONES,
  envLabel,
  filesLabel,
  rowMargin,
} from '@/utils/masterPrintOrders';
import useResponsive from '@/utils/hooks/useResponsive';
import InvoiceButton from '@/views/app/common/projects/details/components/masterPrint/InvoiceButton';
import {
  Btn,
  LIVE_TONE,
  Pill,
  SANDBOX_TONE,
  card,
  grid,
  input,
  label,
  muted,
} from '@/views/app/common/projects/details/components/masterPrint/ui';
import WebhookPanel from './WebhookPanel';

const PAGE = 25;

const MUTED_TONE = ALERT_TONES.muted;

const date = (iso: string | null | undefined) =>
  iso ? dayjs(iso).format('D MMM YYYY à HH:mm') : '';

const Cell = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div style={{ minWidth: 0 }}>
    <p style={label}>{title}</p>
    <div style={{ fontSize: '13px', overflowWrap: 'anywhere' }}>{children}</div>
  </div>
);

const OrderRow = ({ o }: { o: MpAdminOrder }) => {
  const { sale, margin, sharedWith } = rowMargin(o);
  const cancelled = o.status === 'cancelled';
  return (
    <div
      style={{ ...card, padding: '14px 16px' }}
      data-testid="master-print-admin-order"
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px 10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px 8px',
            minWidth: 0,
          }}
        >
          <strong style={{ fontSize: '14px' }}>{o.orderId}</strong>
          <Pill tone={statusTone(o.status)}>{o.statusLabel}</Pill>
          <Pill
            tone={o.environment === 'production' ? LIVE_TONE : SANDBOX_TONE}
          >
            {envLabel(o.environment)}
          </Pill>
          {!o.known && <Pill tone={MUTED_TONE}>Hors PEG</Pill>}
        </div>
        <span style={muted}>{date(o.createdAt)}</span>
      </div>

      {!!o.alerts.filter((a) => a.code !== 'cancelled').length && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            marginTop: '8px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {o.alerts
              .filter((a) => a.code !== 'cancelled')
              .map((a) => (
                <Pill key={a.code} tone={ALERT_TONES[a.level]}>
                  {a.label}
                </Pill>
              ))}
          </div>
          {o.alerts
            .filter((a) => a.detail)
            .map((a) => (
              <p
                key={`${a.code}-detail`}
                style={{ ...muted, color: ALERT_TONES[a.level].color }}
              >
                {a.detail}
              </p>
            ))}
        </div>
      )}

      <div style={{ ...grid(140), marginTop: '12px' }}>
        <Cell title="Projet PEG">
          {o.project ? (
            <>
              <Link
                to={`/common/projects/details/${o.project.documentId}?tab=Master%20Print`}
                style={{ color: '#8db4ff', textDecoration: 'underline' }}
              >
                {o.project.name || 'Projet'}
              </Link>
              {o.project.customerName && (
                <span style={{ ...muted, display: 'block' }}>
                  {o.project.customerName}
                </span>
              )}
            </>
          ) : o.known ? (
            <span style={muted}>Projet supprimé</span>
          ) : (
            <span style={muted}>
              Hors PEG{o.reference ? ` · ${o.reference}` : ''}
            </span>
          )}
        </Cell>
        <Cell title="Fichiers reçus">
          {cancelled ? '—' : filesLabel(o.files)}
        </Cell>
        <Cell title="Achat HT">
          {cancelled ? (
            <span style={muted}>
              <s>{fmtEur(o.purchaseExclTax)}</s> non facturée
            </span>
          ) : (
            <>
              {fmtEur(o.purchaseExclTax)}
              {o.shippingIncluded && (
                <span style={{ ...muted, display: 'block' }}>port compris</span>
              )}
            </>
          )}
        </Cell>
        <Cell title="Vente HT">{o.project ? fmtEur(sale) : '—'}</Cell>
        <Cell title="Marge">
          {margin ? (
            <>
              <span
                style={{
                  fontWeight: 700,
                  color: margin.negative ? '#fca5a5' : '#86efac',
                }}
              >
                {fmtEur(margin.amount)} · {margin.rate.toLocaleString('fr-FR')}{' '}
                %
              </span>
              {sharedWith > 1 && (
                <span style={{ ...muted, display: 'block' }}>
                  projet, {sharedWith} commandes
                </span>
              )}
            </>
          ) : (
            '—'
          )}
        </Cell>
        <Cell title="Colis">
          {o.tracking?.number ? (
            <>
              {[o.tracking.carrier, o.tracking.number]
                .filter(Boolean)
                .join(' · ')}
              {o.tracking.url && (
                <>
                  {' · '}
                  <a
                    href={o.tracking.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#93c5fd', textDecoration: 'underline' }}
                  >
                    Suivre
                  </a>
                </>
              )}
            </>
          ) : (
            '—'
          )}
        </Cell>
      </div>

      {(o.project || o.invoiceAvailable || !o.sameEnvironment) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            marginTop: '12px',
          }}
        >
          {o.project && (
            <Link
              to={`/common/projects/details/${o.project.documentId}?tab=Master%20Print`}
            >
              <Btn>Ouvrir le projet</Btn>
            </Link>
          )}
          {o.invoiceAvailable && <InvoiceButton orderId={o.orderId} />}
          {!o.sameEnvironment && (
            <span style={muted}>
              Commande de l’autre environnement : données gardées par PEG.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

type Meta = Extract<MpOrdersPage, { configured: true }>;

type Props = {
  /** Affichée dans un onglet de la page Master Print : ni titre ni suivi automatique (onglet « Compte et suivi »). */
  embedded?: boolean;
  /** Recherche de départ (n° de commande cliqué depuis la vue d'ensemble). */
  initialQuery?: string;
};

const MasterPrintOrders = ({ embedded = false, initialQuery = '' }: Props) => {
  const { smaller } = useResponsive();
  const phone = smaller.md;
  const [filter, setFilter] = useState<MpOrdersFilter>('todo');
  const [q, setQ] = useState(initialQuery);
  const [items, setItems] = useState<MpAdminOrder[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [state, setState] = useState<
    'loading' | 'ready' | 'missing' | 'error' | 'unconfigured'
  >('loading');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  const fetchPage = useCallback(
    async (offset: number, refresh = false) => {
      const id = ++seq.current;
      setLoading(true);
      try {
        const { data } = await apiGetMasterPrintOrders({
          filter,
          q: q.trim(),
          offset,
          limit: PAGE,
          refresh,
        });
        if (id !== seq.current) return;
        if (!data.configured) {
          setState('unconfigured');
          return;
        }
        setItems((cur) => (offset ? [...cur, ...data.items] : data.items));
        setMeta(data);
        setState('ready');
      } catch (e) {
        if (id !== seq.current) return;
        if (isMasterPrintMissing(e)) setState('missing');
        else {
          setError(
            masterPrintError(e, 'Commandes Master Print indisponibles.')
          );
          setState('error');
        }
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [filter, q]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchPage(0), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchPage, q]);

  const wrap = (children: React.ReactNode) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
        padding: embedded ? 0 : phone ? '12px 0' : '4px 0 24px',
      }}
    >
      {children}
    </div>
  );

  const header = (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px 10px',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
          Commandes Master Print
        </h1>
        {meta && (
          <Pill
            tone={meta.environment === 'production' ? LIVE_TONE : SANDBOX_TONE}
          >
            {meta.environment === 'production' ? 'Production' : 'Bac à sable'}
          </Pill>
        )}
      </div>
      <p style={{ ...muted, marginTop: '4px' }}>
        Les commandes passées chez Master Print avec la clé de ce serveur, et
        celles enregistrées par PEG. Montants hors taxes ; la marge est celle du
        projet (prix du projet moins ses commandes Master Print non annulées).
      </p>
    </div>
  );

  if (state === 'missing')
    return wrap(
      <>
        {!embedded && header}
        <div style={card}>
          <p style={muted}>
            Module indisponible : le serveur n’est pas encore à jour.
          </p>
        </div>
      </>
    );
  if (state === 'unconfigured')
    return wrap(
      <>
        {!embedded && header}
        <div style={card}>
          <p style={muted}>
            Master Print n’est pas encore branché sur ce serveur
            (MASTER_PRINT_CLIENT_ID, MASTER_PRINT_API_KEY).
          </p>
        </div>
      </>
    );

  const tabs: Array<[MpOrdersFilter, string]> = [
    ['todo', `À traiter${meta ? ` (${meta.counts.todo})` : ''}`],
    ['all', `Toutes${meta ? ` (${meta.counts.all})` : ''}`],
  ];

  return wrap(
    <>
      {!embedded && header}
      {!embedded && <WebhookPanel />}

      <div
        style={{
          ...card,
          padding: '14px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          role="tablist"
          aria-label="Filtre des commandes"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
        >
          {tabs.map(([code, name]) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={filter === code}
              className="peg-tap-target"
              onClick={() => setFilter(code)}
              style={{
                padding: '6px 14px',
                borderRadius: '100px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                border:
                  filter === code ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background:
                  filter === code
                    ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)'
                    : 'rgba(255,255,255,0.05)',
                color: filter === code ? '#fff' : 'rgba(255,255,255,0.7)',
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
          <HiSearch
            style={{ position: 'absolute', left: 10, top: 11, opacity: 0.5 }}
            aria-hidden="true"
          />
          <input
            style={{ ...input, paddingLeft: '30px' }}
            placeholder="N° de commande, projet, client…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher une commande Master Print"
          />
        </div>
        <Btn onClick={() => fetchPage(0, true)} disabled={loading}>
          <HiRefresh aria-hidden="true" />
          {loading ? 'Lecture…' : 'Actualiser'}
        </Btn>
      </div>

      {meta?.mpError && (
        <div
          style={{
            ...card,
            padding: '12px 16px',
            border: `1px solid ${ALERT_TONES.warning.border}`,
          }}
        >
          <p style={{ ...muted, color: ALERT_TONES.warning.color }}>
            Master Print est momentanément indisponible ({meta.mpError}). Seules
            les commandes enregistrées par PEG sont affichées.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div style={card}>
          <p style={{ ...muted, color: '#fca5a5' }}>{error}</p>
          <div style={{ marginTop: '10px' }}>
            <Btn onClick={() => fetchPage(0)}>Réessayer</Btn>
          </div>
        </div>
      )}

      {state === 'loading' && !items.length && (
        <p style={muted}>Chargement des commandes…</p>
      )}

      {state === 'ready' && !items.length && (
        <div style={card}>
          <p style={muted}>
            {q.trim()
              ? 'Aucune commande ne correspond à cette recherche.'
              : filter === 'todo'
                ? 'Rien à traiter : aucune commande bloquée ni en attente.'
                : 'Aucune commande Master Print pour l’instant.'}
          </p>
          {filter === 'todo' && !q.trim() && !!meta?.counts.all && (
            <div style={{ marginTop: '10px' }}>
              <Btn onClick={() => setFilter('all')}>
                Voir toutes les commandes
              </Btn>
            </div>
          )}
        </div>
      )}

      {items.map((o) => (
        <OrderRow key={o.key} o={o} />
      ))}

      {meta && items.length < meta.total && (
        <div>
          <Btn onClick={() => fetchPage(items.length)} disabled={loading}>
            {loading
              ? 'Chargement…'
              : `Afficher plus (${meta.total - items.length} restantes)`}
          </Btn>
        </div>
      )}

      {meta && !meta.listComplete && (
        <p style={muted}>
          Liste limitée aux 2 000 commandes les plus récentes de Master Print.
        </p>
      )}
    </>
  );
};

export default MasterPrintOrders;
