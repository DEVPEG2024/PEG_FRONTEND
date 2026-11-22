/*
 * Master Print — une seule page à onglets (menu Fournisseurs → « Master Print »,
 * `/admin/master-print`), refonte du 22/11/2026 : vue d'ensemble en widgets,
 * commandes, catalogue, prix, photos, compte et suivi.
 *
 * L'onglet est dans l'adresse (`?tab=commandes`, `&q=<n° de commande>`) : changer
 * d'onglet ne recharge pas la page. Les données de la vue d'ensemble (cinq
 * lectures, chacune peut tomber seule) sont gardées ici : elles alimentent aussi
 * les pastilles des onglets. Les autres onglets réutilisent les écrans existants
 * (`embedded`). Anciennes adresses : LegacyRedirect.tsx.
 *
 *  - bilan        GET /master-print/admin/dashboard       (peg_strapi master-print-dashboard.service.ts)
 *  - compte       GET /master-print/admin/status          (/me chez Master Print)
 *  - service      GET /master-print/admin/service-status
 *  - suivi auto   GET /master-print/admin/webhooks
 *  - prix         GET /master-print/admin/prices
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  TbCategory,
  TbClipboardList,
  TbCurrencyEuro,
  TbLayoutDashboard,
  TbPhoto,
  TbRefresh,
  TbUserCircle,
} from 'react-icons/tb';
import type { MpStatus } from '@/@types/masterPrint';
import type { MpDashboard } from '@/@types/masterPrintDashboard';
import type { MpWebhooksOverview } from '@/@types/masterPrintOrders';
import type { MpPricesOverview } from '@/@types/masterPrintPrices';
import { apiGetMasterPrintDashboard } from '@/services/MasterPrintDashboardServices';
import {
  apiGetMasterPrintWebhooks,
  apiSubscribeMasterPrintWebhook,
} from '@/services/MasterPrintOrdersServices';
import { apiGetMasterPrintPrices } from '@/services/MasterPrintPricesServices';
import { apiGetMasterPrintStatus } from '@/services/MasterPrintServices';
import {
  apiGetMasterPrintServiceStatus,
  type MpServiceStatus,
} from '@/services/MasterPrintStatusServices';
import { isMasterPrintMissing, masterPrintError } from '@/utils/masterPrint';
import { dashboardActions } from '@/utils/masterPrintDashboard';
import {
  HUB_TABS,
  type HubTab,
  hubPath,
  tabBadges,
  tabFromSearch,
} from '@/utils/masterPrintHub';
import MasterPrintCatalog from '../MasterPrintCatalog';
import MasterPrintOrders from '../MasterPrintOrders';
import ProductPhotosPanel from '../ProductPhotosPanel';
import PurchasePricesPanel from '../PurchasePricesPanel';
import ServiceStatusBanner from '../ServiceStatusBanner';
import WebhookPanel from '../WebhookPanel';
import { HUB_CSS } from '@/components/shared/hub/hubStyles';
import {
  AccountCard,
  ActionsCard,
  Atelier,
  CatalogCard,
  CatalogStrip,
  ColorBar,
  KpiRow,
  OrdersCard,
  OrdersStrip,
  PhotosStrip,
  PricesStrip,
  SalesCard,
} from './widgets';

type Slot<T> = { data: T | null; error: string | null; missing: boolean };
const emptySlot = <T,>(): Slot<T> => ({
  data: null,
  error: null,
  missing: false,
});

async function read<T>(
  call: () => Promise<{ data: T }>,
  fallback: string
): Promise<Slot<T>> {
  try {
    const { data } = await call();
    return { data, error: null, missing: false };
  } catch (e) {
    return {
      data: null,
      error: masterPrintError(e, fallback),
      missing: isMasterPrintMissing(e),
    };
  }
}

const TAB_ICONS: Record<HubTab, ReactNode> = {
  overview: <TbLayoutDashboard aria-hidden="true" />,
  commandes: <TbClipboardList aria-hidden="true" />,
  catalogue: <TbCategory aria-hidden="true" />,
  prix: <TbCurrencyEuro aria-hidden="true" />,
  photos: <TbPhoto aria-hidden="true" />,
  compte: <TbUserCircle aria-hidden="true" />,
};

/** Relecture de la vue d'ensemble en revenant dessus, si elle date de plus d'une minute. */
const STALE_MS = 60_000;

const MasterPrintHub = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tab = tabFromSearch(`?${params.toString()}`);
  const q = params.get('q') || '';

  const [dash, setDash] = useState<Slot<MpDashboard>>(emptySlot);
  const [status, setStatus] = useState<Slot<MpStatus>>(emptySlot);
  const [service, setService] = useState<Slot<MpServiceStatus>>(emptySlot);
  const [hooks, setHooks] = useState<Slot<MpWebhooksOverview>>(emptySlot);
  const [prices, setPrices] = useState<Slot<MpPricesOverview>>(emptySlot);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState(0);
  const [subscribing, setSubscribing] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null
  );
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    const [d, s, sv, w, p] = await Promise.all([
      read(apiGetMasterPrintDashboard, 'Bilan indisponible.'),
      read(apiGetMasterPrintStatus, 'Compte Master Print illisible.'),
      read(apiGetMasterPrintServiceStatus, 'État du service inconnu.'),
      read(apiGetMasterPrintWebhooks, 'Suivi automatique illisible.'),
      read(apiGetMasterPrintPrices, 'Prix illisibles.'),
    ]);
    if (id !== seq.current) return;
    setDash(d);
    setStatus(s);
    setService(sv);
    setHooks(w);
    setPrices(p);
    setLoading(false);
    setLoadedAt(Date.now());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // De retour sur la vue d'ensemble après un passage dans un autre onglet : chiffres frais.
  useEffect(() => {
    if (
      tab === 'overview' &&
      loadedAt &&
      Date.now() - loadedAt > STALE_MS &&
      !loading
    )
      load();
  }, [tab]);

  // Téléphone : la barre d'onglets défile ; l'onglet ouvert reste visible.
  useEffect(() => {
    document
      .getElementById(`hx-tab-${tab}`)
      ?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [tab]);

  const go = (t: HubTab, query?: string) => navigate(hubPath(t, query));

  const subscribe = async () => {
    setSubscribing(true);
    setNotice(null);
    try {
      const { data } = await apiSubscribeMasterPrintWebhook();
      setNotice({
        ok: true,
        text: `Suivi automatique branché sur ${data.url}.`,
      });
      setHooks(
        await read(apiGetMasterPrintWebhooks, 'Suivi automatique illisible.')
      );
    } catch (e) {
      setNotice({
        ok: false,
        text: masterPrintError(e, 'Abonnement impossible pour le moment.'),
      });
    } finally {
      setSubscribing(false);
    }
  };

  const d = dash.data && dash.data.configured ? dash.data : null;
  const st = status.data && status.data.configured ? status.data : null;
  const orders = d?.orders ?? null;
  const catalog = d?.catalog ?? null;
  const env = d?.environment ?? st?.environment ?? null;
  const sandbox = env === 'sandbox';
  const unconfigured =
    dash.data?.configured === false || status.data?.configured === false;
  const svc = service.data;
  const serviceDown = !!svc && svc.configured !== false && !svc.ok;
  const hooksData = hooks.data && hooks.data.configured ? hooks.data : null;
  const problem = dash.missing
    ? 'Le serveur n’est pas encore à jour pour ce bilan.'
    : d?.ordersError || dash.error;

  // « Mode essai » : déjà dit par la pastille « Essai » de l'en-tête et le pied de l'atelier.
  const actions = dashboardActions({
    dashboard: dash.data,
    status: status.data,
    service: service.data,
    webhooks: hooks.data,
    prices: prices.data,
  }).filter((a) => a.key !== 'sandbox');
  const badges = tabBadges({
    orders,
    pricesPending: prices.data?.pending ?? null,
    offersWithoutPhotos: catalog?.offersWithoutPhotosCount ?? null,
    webhookSubscribed: hooksData ? hooksData.subscribed : null,
    serviceDown,
  });

  const servicePill = !svc ? null : !svc.ok ? (
    <span className="hx-pill hx-pill--down">
      <i aria-hidden="true" />
      Hors service
    </span>
  ) : svc.degraded ? (
    <span className="hx-pill hx-pill--warn">
      <i aria-hidden="true" />
      Ralenti
    </span>
  ) : (
    <span className="hx-pill hx-pill--ok">
      <i aria-hidden="true" />
      En ligne
    </span>
  );

  const overview = (
    <div className="hx-grid">
      <Atelier
        orders={orders}
        sandbox={sandbox}
        loading={loading}
        problem={problem}
        onOpenOrder={(id) => go('commandes', id)}
      />
      <KpiRow
        orders={orders}
        loading={loading}
        onOpenTodo={() => go('commandes')}
      />
      <ActionsCard
        actions={actions}
        loading={loading}
        subscribing={subscribing}
        notice={notice}
        onSubscribe={subscribe}
      />
      <CatalogCard
        catalog={catalog}
        prices={prices.data}
        loading={loading}
        problem={
          dash.missing
            ? 'Le serveur n’est pas encore à jour pour ce bilan.'
            : d?.catalogError || dash.error
        }
        onOpen={() => go('catalogue')}
      />
      <SalesCard orders={orders} sandbox={sandbox} loading={loading} />
      <AccountCard
        status={st}
        hooks={hooks.data}
        subscribing={subscribing}
        onSubscribe={subscribe}
        onDetails={() => go('compte')}
      />
      {orders && orders.counted > 0 && (
        <OrdersCard
          orders={orders}
          onOpenOrder={(id) => go('commandes', id)}
          onOpenAll={() => go('commandes')}
        />
      )}
    </div>
  );

  const content: Record<HubTab, ReactNode> = {
    overview,
    commandes: (
      <>
        {orders && orders.counted > 0 && <OrdersStrip orders={orders} />}
        <MasterPrintOrders key={q} embedded initialQuery={q} />
      </>
    ),
    catalogue: (
      <>
        {catalog && <CatalogStrip catalog={catalog} />}
        <MasterPrintCatalog embedded />
      </>
    ),
    prix: (
      <>
        {prices.data && prices.data.configured && (
          <PricesStrip prices={prices.data} />
        )}
        <PurchasePricesPanel defaultOpen />
      </>
    ),
    photos: (
      <>
        {catalog && catalog.linked > 0 && <PhotosStrip catalog={catalog} />}
        <ProductPhotosPanel />
      </>
    ),
    compte: (
      <div className="hx-grid">
        <AccountCard
          status={st}
          hooks={hooks.data}
          subscribing={subscribing}
          onSubscribe={subscribe}
          span="hx-s12"
        />
        <div className="hx-s12" style={{ minWidth: 0 }}>
          <WebhookPanel />
        </div>
      </div>
    ),
  };

  return (
    <div className="hx" data-testid="mp-hub">
      <style>{HUB_CSS}</style>

      <header className="hx-head">
        <div className="hx-brand">
          <ColorBar />
          <div style={{ minWidth: 0 }}>
            <div className="hx-title-row">
              <h1 className="hx-title">Master Print</h1>
              {env && (
                <span
                  className={`hx-pill ${env === 'production' ? 'hx-pill--live' : 'hx-pill--sandbox'}`}
                >
                  {env === 'production' ? 'Production' : 'Essai'}
                </span>
              )}
              {servicePill}
            </div>
            <p className="hx-sub">
              Votre imprimeur exécutant
              {st?.company ? `, compte ${st.company}` : ''}.
              {loadedAt
                ? ` Mis à jour à ${dayjs(loadedAt).format('HH:mm')}.`
                : ''}
            </p>
          </div>
        </div>
        {tab === 'overview' && (
          <button
            type="button"
            className="hx-btn hx-btn--ghost"
            onClick={load}
            disabled={loading}
          >
            <TbRefresh aria-hidden="true" />
            {loading ? 'Lecture…' : 'Actualiser'}
          </button>
        )}
      </header>

      <nav
        className="hx-tabs"
        role="tablist"
        aria-label="Rubriques Master Print"
      >
        {HUB_TABS.map((t) => {
          const b = badges[t.key];
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`hx-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="hx-panel"
              className="hx-tab"
              onClick={() => go(t.key)}
              data-testid={`hx-tab-${t.key}`}
            >
              {TAB_ICONS[t.key]}
              {t.label}
              {b && (
                <span
                  className={`hx-badge hx-badge--${b.level}${b.count ? '' : ' hx-badge--dot'}`}
                  aria-label={b.count ? `${b.count} à voir` : 'à voir'}
                >
                  {b.count || ''}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {tab !== 'overview' && <ServiceStatusBanner />}

      <div
        id="hx-panel"
        role="tabpanel"
        aria-labelledby={`hx-tab-${tab}`}
        style={{ marginTop: tab === 'overview' ? 0 : 4 }}
      >
        {unconfigured ? (
          <div className="hx-card">
            <p className="hx-muted">
              Master Print n’est pas encore branché sur ce serveur
              (MASTER_PRINT_CLIENT_ID, MASTER_PRINT_API_KEY).
            </p>
          </div>
        ) : (
          content[tab]
        )}
      </div>
    </div>
  );
};

export default MasterPrintHub;
