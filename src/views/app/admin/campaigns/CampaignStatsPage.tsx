import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HiArrowLeft,
  HiOutlineArchive,
  HiOutlineBan,
  HiOutlineDownload,
  HiOutlineDuplicate,
  HiOutlineRefresh,
  HiOutlineReply,
  HiOutlineSearch,
} from 'react-icons/hi';
import type { Campaign, CampaignRecipient, CampaignStats, CampaignTimeline } from '@/@types/campaign';
import {
  apiArchiveCampaign,
  apiDuplicateCampaign,
  apiGetCampaignRecipients,
  apiGetCampaignStats,
  apiWithdrawCampaign,
} from '@/services/CampaignServices';
import CampaignContent from '@/components/campaign/CampaignContent';
import {
  CHANNEL_LABELS,
  EMAIL_STATUS_LABELS,
  RecipientFilter,
  filterRecipients,
  fmtDateTime,
  fmtInt,
  pct,
  recipientsToCsv,
} from '@/utils/campaignFormat';
import { ChannelBars, Funnel, OpensChart } from './components/charts';
import { Kpi, PANEL, StatusBadge, btn, chip, errorMessage, hintStyle, inputStyle, labelStyle } from './ui';

/**
 * Statistiques d'une campagne envoyée : taux d'ouverture et de clic, courbe dans
 * le temps, canaux, détail par destinataire (export CSV), relance des
 * non-ouvreurs. Les envois de test ne sont jamais comptés.
 */

const PAGE = 50;

const Card = ({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) => (
  <section style={{ ...PANEL, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>{title}</h3>
      {aside && <div style={{ marginLeft: 'auto' }}>{aside}</div>}
    </div>
    {children}
  </section>
);

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '9px 10px', color: 'rgba(226,232,240,0.88)', fontSize: '13px', verticalAlign: 'top' };

const downloadCsv = (name: string, csv: string) => {
  // BOM : accents corrects à l'ouverture dans Excel.
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const CampaignStatsPage = () => {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [timeline, setTimeline] = useState<CampaignTimeline | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [recipients, setRecipients] = useState<CampaignRecipient[] | null>(null);
  const [filter, setFilter] = useState<RecipientFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([apiGetCampaignStats(id), apiGetCampaignRecipients(id)]);
      const c = s.data.campaign;
      if (c.status === 'draft' || c.status === 'scheduled' || c.status === 'canceled') {
        navigate(`/admin/campaigns/${c.id}/edit`, { replace: true });
        return;
      }
      setCampaign(c);
      setStats(s.data.stats);
      setTimeline(s.data.timeline);
      setSandbox(!!s.data.sandbox);
      setRecipients(r.data.recipients || []);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Statistiques indisponibles'));
      navigate('/admin/campaigns', { replace: true });
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  // Envoi en cours : rafraîchissement rapide ; ensuite, toutes les minutes.
  useEffect(() => {
    const t = setInterval(load, campaign?.status === 'sending' ? 4000 : 60_000);
    return () => clearInterval(t);
  }, [campaign?.status, load]);

  const visible = useMemo(() => filterRecipients(recipients || [], filter, search), [recipients, filter, search]);
  useEffect(() => { setPage(0); }, [filter, search]);
  const unopened = useMemo(() => (recipients || []).filter((r) => !r.openedAt).length, [recipients]);
  const customers = useMemo(() => new Set((recipients || []).map((r) => r.customerDocumentId)).size, [recipients]);

  const act = async (fn: () => Promise<any>, ok: string, after?: (res: any) => void) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(ok);
      after?.(res);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Action impossible'));
    } finally {
      setBusy(false);
    }
  };

  if (!campaign || !stats) return <div style={{ padding: '24px 16px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Chargement…</div>;

  const expired = !!campaign.expiresAt && new Date(campaign.expiresAt).getTime() <= Date.now();
  const channels = ['Cloche + push', campaign.channelPopup && 'Pop-up', campaign.channelEmail && 'E-mail'].filter(Boolean).join(' · ');
  const pageRows = visible.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.ceil(visible.length / PAGE);

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1240px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <Link to="/admin/campaigns" style={{ ...btn('rgba(255,255,255,0.7)'), padding: '7px 10px' }} aria-label="Retour aux campagnes">
          <HiArrowLeft size={16} />
        </Link>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0, overflowWrap: 'anywhere' }}>{campaign.title}</h2>
            <StatusBadge status={campaign.status} archived={campaign.archived} />
            {expired && <span style={{ ...hintStyle, color: '#fbbf24' }}>retirée des Actualités</span>}
          </div>
          <div style={{ ...hintStyle, marginTop: '4px' }}>
            {campaign.sentAt ? `Envoyée le ${fmtDateTime(campaign.sentAt)}` : 'Envoi en cours'} · {campaign.audienceSummary} · {channels}
            {campaign.createdBy ? ` · par ${campaign.createdBy}` : ''}
            {campaign.expiresAt && !expired ? ` · retrait prévu le ${fmtDateTime(campaign.expiresAt)}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" style={btn('rgba(255,255,255,0.7)')} onClick={() => load()} aria-label="Rafraîchir" title="Rafraîchir"><HiOutlineRefresh size={15} /></button>
          {unopened > 0 && campaign.status === 'sent' && (
            <button
              type="button"
              style={btn('#fbbf24')}
              disabled={busy}
              onClick={() => act(() => apiDuplicateCampaign(campaign.id, 'unopened'), 'Relance créée en brouillon', (res) => navigate(`/admin/campaigns/${res.data.campaign.id}/edit`))}
              title="Brouillon ciblé sur les comptes qui n’ont pas ouvert"
            >
              <HiOutlineReply size={15} /> Relancer les {fmtInt(unopened)} non-ouvreurs
            </button>
          )}
          <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={busy} onClick={() => act(() => apiDuplicateCampaign(campaign.id, 'copy'), 'Copie créée en brouillon', (res) => navigate(`/admin/campaigns/${res.data.campaign.id}/edit`))}>
            <HiOutlineDuplicate size={15} /> Dupliquer
          </button>
          {!expired && (
            <button
              type="button"
              style={btn('#f87171')}
              disabled={busy}
              onClick={() => window.confirm('Retirer cette campagne ? Elle disparaît des pop-ups et des Actualités des clients (les statistiques sont conservées).') && act(() => apiWithdrawCampaign(campaign.id), 'Campagne retirée', () => load())}
            >
              <HiOutlineBan size={15} /> Retirer
            </button>
          )}
          <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={busy} onClick={() => act(() => apiArchiveCampaign(campaign.id, !campaign.archived), campaign.archived ? 'Campagne désarchivée' : 'Campagne archivée', () => load())}>
            <HiOutlineArchive size={15} /> {campaign.archived ? 'Désarchiver' : 'Archiver'}
          </button>
        </div>
      </div>

      {campaign.status === 'sending' && (
        <div style={{ ...PANEL, padding: '12px 16px', color: '#93c5fd', fontSize: '13px' }}>
          Envoi en cours… {fmtInt(campaign.recipientCount)} destinataire(s) — la page se met à jour toute seule.
        </div>
      )}
      {campaign.dispatchError && (
        <div style={{ ...PANEL, padding: '12px 16px', color: '#fca5a5', fontSize: '13px' }}>
          Incident pendant l’envoi : {campaign.dispatchError}. L’envoi reprend automatiquement dans quelques minutes.
        </div>
      )}
      {sandbox && (
        <div style={{ ...PANEL, padding: '12px 16px', color: '#fde68a', fontSize: '13px', borderColor: 'rgba(251,191,36,0.3)' }}>
          Environnement de test : aucun client n’a été notifié par la cloche ni par e-mail.
        </div>
      )}

      {/* Indicateurs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '12px' }}>
        <Kpi label="Destinataires" value={fmtInt(stats.recipients)} sub={`${fmtInt(customers)} client${customers > 1 ? 's' : ''}`} />
        <Kpi label="Taux d’ouverture" value={pct(stats.openRate)} sub={`${fmtInt(stats.opened)} ouverture${stats.opened > 1 ? 's' : ''}`} />
        <Kpi label="Taux de clic" value={campaign.ctaLabel ? pct(stats.clickRate) : '—'} sub={campaign.ctaLabel ? `${fmtInt(stats.clicked)} clic${stats.clicked > 1 ? 's' : ''} sur « ${campaign.ctaLabel} »` : 'pas de bouton d’action'} />
        <Kpi label="Clics après ouverture" value={campaign.ctaLabel ? pct(stats.clickToOpenRate) : '—'} sub="clics / ouvertures" />
        {campaign.channelEmail && (
          <Kpi
            label="E-mails"
            value={fmtInt(stats.emailSent)}
            sub={`${pct(stats.emailOpenRate)} ouverts${stats.emailOptout ? ` · ${stats.emailOptout} désinscrit(s)` : ''}${stats.emailFailed ? ` · ${stats.emailFailed} en échec` : ''}`}
          />
        )}
        {campaign.channelPopup && <Kpi label="Pop-ups fermées" value={fmtInt(stats.dismissed)} sub="fermées sans cliquer" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '14px' }}>
        <Card title="Ouvertures dans le temps">
          {timeline && timeline.points.length ? <OpensChart timeline={timeline} /> : <span style={hintStyle}>La courbe apparaîtra après l’envoi.</span>}
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
          <Card title="Entonnoir">
            <Funnel recipients={stats.recipients} opened={stats.opened} clicked={stats.clicked} />
          </Card>
          <Card title="Canal de la première ouverture">
            <ChannelBars
              data={(['popup', 'bell', 'feed', 'email'] as const)
                .filter((k) => k !== 'popup' || campaign.channelPopup)
                .filter((k) => k !== 'email' || campaign.channelEmail)
                .map((k) => ({ label: CHANNEL_LABELS[k], value: stats.byChannel[k] }))}
            />
          </Card>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
        {/* Destinataires */}
        <div style={{ flex: '2 1 560px', minWidth: 0 }}>
          <Card
            title={`Destinataires (${fmtInt(visible.length)})`}
            aside={
              <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={!visible.length} onClick={() => downloadCsv(`campagne-${campaign.id}-destinataires.csv`, recipientsToCsv(visible))}>
                <HiOutlineDownload size={15} /> Exporter
              </button>
            }
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              {([['all', 'Tous'], ['opened', 'Ont ouvert'], ['unopened', 'N’ont pas ouvert'], ['clicked', 'Ont cliqué']] as const).map(([k, label]) => (
                <button key={k} type="button" style={chip(filter === k)} onClick={() => setFilter(k)}>{label}</button>
              ))}
              <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '160px' }}>
                <HiOutlineSearch size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Client, nom, e-mail" aria-label="Rechercher un destinataire" style={{ ...inputStyle, padding: '8px 10px 8px 30px', fontSize: '13px' }} />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                <thead>
                  <tr>
                    <th style={th}>Client</th>
                    <th style={th}>Compte</th>
                    <th style={th}>Ouvert</th>
                    <th style={th}>Clic</th>
                    {campaign.channelEmail && <th style={th}>E-mail</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <td style={{ ...td, color: '#fff', fontWeight: 600 }}>{r.customerName}</td>
                      <td style={td}>
                        {r.userName || '—'}
                        {r.userEmail && <div style={{ ...hintStyle, fontSize: '11px' }}>{r.userEmail}</div>}
                      </td>
                      <td style={td}>
                        {r.openedAt ? (
                          <>
                            {fmtDateTime(r.openedAt)}
                            <div style={{ ...hintStyle, fontSize: '11px' }}>
                              {r.openChannel ? CHANNEL_LABELS[r.openChannel] : ''}{r.openCount > 1 ? ` · ${r.openCount} fois` : ''}
                            </div>
                          </>
                        ) : (
                          <span style={hintStyle}>{r.dismissedAt ? 'pop-up fermée' : 'non ouvert'}</span>
                        )}
                      </td>
                      <td style={td}>{r.clickedAt ? fmtDateTime(r.clickedAt) : <span style={hintStyle}>—</span>}</td>
                      {campaign.channelEmail && (
                        <td style={td} title={r.emailError || undefined}>
                          <span style={{ color: r.emailStatus === 'failed' ? '#fca5a5' : undefined }}>{r.emailStatus ? EMAIL_STATUS_LABELS[r.emailStatus] || r.emailStatus : '—'}</span>
                          {r.emailOpenedAt && <div style={{ ...hintStyle, fontSize: '11px' }}>ouvert</div>}
                        </td>
                      )}
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={5} style={{ ...td, ...hintStyle, textAlign: 'center', padding: '20px' }}>Aucun destinataire dans cette vue.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Précédents</button>
                <span style={hintStyle}>{page + 1} / {pages}</span>
                <button type="button" style={btn('rgba(255,255,255,0.7)')} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Suivants</button>
              </div>
            )}
          </Card>
        </div>

        {/* Contenu envoyé */}
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <span style={{ ...labelStyle, display: 'block', marginBottom: '8px' }}>Contenu envoyé</span>
          <div style={{ ...PANEL, overflow: 'hidden' }}>
            <CampaignContent campaign={campaign} dateLabel={campaign.sentAt ? fmtDateTime(campaign.sentAt) : undefined} coverMaxHeight={240} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignStatsPage;
