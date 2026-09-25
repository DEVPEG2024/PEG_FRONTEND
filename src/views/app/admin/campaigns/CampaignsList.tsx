import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineDuplicate,
  HiOutlineMail,
  HiOutlinePencil,
  HiOutlineSearch,
  HiOutlineSpeakerphone,
  HiOutlineTrash,
  HiOutlineViewGridAdd,
  HiPlus,
} from 'react-icons/hi';
import type { CampaignListItem, CampaignsOverview } from '@/@types/campaign';
import { apiDeleteCampaign, apiDuplicateCampaign, apiGetCampaigns } from '@/services/CampaignServices';
import { TagChip } from '@/components/campaign/CampaignContent';
import { TAG_META, fmtInt, fmtRelativeDay, pct } from '@/utils/campaignFormat';
import { SERIES } from './components/charts';
import { Kpi, PANEL, RateBar, StatusBadge, btn, chip, errorMessage, hintStyle, inputStyle, isBackendMissing } from './ui';

/**
 * Campagnes clients — liste, indicateurs globaux, accès à l'éditeur et aux
 * statistiques. Backend : peg_strapi `campaign.service.ts`.
 */

type Tab = 'all' | 'draft' | 'scheduled' | 'sent' | 'archived';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'scheduled', label: 'Programmées' },
  { key: 'sent', label: 'Envoyées' },
  { key: 'archived', label: 'Archivées' },
];

const inTab = (c: CampaignListItem, tab: Tab) => {
  if (tab === 'archived') return c.archived;
  if (c.archived) return false;
  if (tab === 'all') return true;
  if (tab === 'sent') return c.status === 'sent' || c.status === 'sending';
  if (tab === 'draft') return c.status === 'draft' || c.status === 'canceled';
  return c.status === tab;
};

const dateLine = (c: CampaignListItem) => {
  if (c.status === 'sent' || c.status === 'sending') return `Envoyée ${fmtRelativeDay(c.sentAt || c.sendAt)}`;
  if (c.status === 'scheduled') return `Prévue ${fmtRelativeDay(c.sendAt)}`;
  return `Modifiée ${fmtRelativeDay(c.updatedAt)}`;
};

const CampaignCard = ({ c, onOpen, onDuplicate, onDelete }: {
  c: CampaignListItem;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) => {
  const cover = c.images[0];
  const sent = c.status === 'sent' || c.status === 'sending';
  const editable = c.status === 'draft' || c.status === 'scheduled' || c.status === 'canceled';
  const tag = TAG_META[c.tag] || TAG_META.info;
  return (
    <div style={{ ...PANEL, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <button type="button" onClick={onOpen} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', flex: 1, fontFamily: 'Inter, sans-serif' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 7', background: '#0b1422', overflow: 'hidden' }}>
          {cover ? (
            <>
              <div aria-hidden style={{ position: 'absolute', inset: '-20px', backgroundImage: `url("${cover.url}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(16px) brightness(0.5)' }} />
              <img src={cover.url} alt="" loading="lazy" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', background: tag.bg }} aria-hidden>{tag.emoji}</div>
          )}
          {c.images.length > 1 && (
            <span style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(15,23,42,0.75)', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '100px', padding: '2px 8px' }}>
              {c.images.length} photos
            </span>
          )}
        </div>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <StatusBadge status={c.status} archived={c.archived} />
            <span style={{ ...hintStyle, marginLeft: 'auto' }}>{dateLine(c)}</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{c.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <TagChip tag={c.tag} />
            <span style={{ ...hintStyle, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <HiOutlineBell size={13} title="Cloche" />
              {c.channelPopup && <HiOutlineViewGridAdd size={13} title="Pop-up" />}
              {c.channelEmail && <HiOutlineMail size={13} title="E-mail" />}
              {c.audienceSummary}
            </span>
          </div>
          {sent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
                <span><strong style={{ color: '#fff' }}>{fmtInt(c.stats.recipients)}</strong> destinataires</span>
                <span>Ouverture <strong style={{ color: '#fff' }}>{pct(c.stats.openRate)}</strong></span>
                <span>Clics <strong style={{ color: '#fff' }}>{pct(c.stats.clickRate)}</strong></span>
              </div>
              <RateBar rate={c.stats.openRate} color={SERIES.opens} />
            </div>
          )}
        </div>
      </button>
      <div style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
        <button type="button" style={{ ...btn(sent ? '#4ade80' : '#60a5fa'), flex: 1 }} onClick={onOpen}>
          {sent ? <><HiOutlineChartBar size={15} /> Statistiques</> : <><HiOutlinePencil size={15} /> Modifier</>}
        </button>
        <button type="button" style={btn('rgba(255,255,255,0.7)')} onClick={onDuplicate} aria-label="Dupliquer" title="Dupliquer">
          <HiOutlineDuplicate size={15} />
        </button>
        {editable && (
          <button type="button" style={btn('#f87171')} onClick={onDelete} aria-label="Supprimer" title="Supprimer">
            <HiOutlineTrash size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

const CampaignsList = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignListItem[] | null>(null);
  const [overview, setOverview] = useState<CampaignsOverview | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiGetCampaigns();
      setCampaigns(res.data.campaigns || []);
      setOverview(res.data.overview);
      setSandbox(!!res.data.sandbox);
    } catch (e: any) {
      if (isBackendMissing(e)) setMissing(true);
      else toast.error(errorMessage(e, 'Campagnes indisponibles'));
      setCampaigns([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Un envoi en cours : rafraîchissement jusqu'à la fin.
  const sending = campaigns?.some((c) => c.status === 'sending');
  useEffect(() => {
    if (!sending) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [sending, load]);

  const counts = useMemo(() => {
    const out: Record<Tab, number> = { all: 0, draft: 0, scheduled: 0, sent: 0, archived: 0 };
    (campaigns || []).forEach((c) => TABS.forEach((t) => { if (inTab(c, t.key)) out[t.key]++; }));
    return out;
  }, [campaigns]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (campaigns || []).filter((c) => inTab(c, tab) && (!q || c.title.toLowerCase().includes(q)));
  }, [campaigns, tab, search]);

  const open = (c: CampaignListItem) =>
    navigate(c.status === 'sent' || c.status === 'sending' ? `/admin/campaigns/${c.id}` : `/admin/campaigns/${c.id}/edit`);

  const duplicate = async (c: CampaignListItem) => {
    try {
      const res = await apiDuplicateCampaign(c.id, 'copy');
      toast.success('Copie créée en brouillon');
      navigate(`/admin/campaigns/${res.data.campaign.id}/edit`);
    } catch (e: any) {
      toast.error(errorMessage(e, 'Duplication impossible'));
    }
  };

  const remove = async (c: CampaignListItem) => {
    if (!window.confirm(`Supprimer la campagne « ${c.title} » ?`)) return;
    try {
      await apiDeleteCampaign(c.id);
      toast.success('Campagne supprimée');
      load();
    } catch (e: any) {
      toast.error(errorMessage(e, 'Suppression impossible'));
    }
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
          <HiOutlineSpeakerphone size={22} />
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Campagnes</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>
            Notifiez tous vos clients ou une partie d’entre eux — message, photos, bouton d’action — et suivez ouvertures et clics.
          </p>
        </div>
        <button type="button" style={btn('#2563eb', true)} onClick={() => navigate('/admin/campaigns/new')} disabled={missing}>
          <HiPlus size={16} /> Nouvelle campagne
        </button>
      </div>

      {missing && (
        <div style={{ ...PANEL, padding: '14px 16px', color: '#fca5a5', fontSize: '13px' }}>
          Module indisponible : le serveur (Strapi) n’a pas encore été déployé avec les campagnes.
        </div>
      )}
      {sandbox && !missing && (
        <div style={{ ...PANEL, padding: '12px 16px', color: '#fde68a', fontSize: '13px', borderColor: 'rgba(251,191,36,0.3)' }}>
          Environnement de test : les campagnes envoyées d’ici ne notifient aucun client (ni cloche, ni e-mail) — les statistiques et vos envois de test fonctionnent.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
        <Kpi label="Campagnes envoyées" value={overview ? fmtInt(overview.sent) : '—'} sub={overview ? `${overview.sentLast30Days} ces 30 derniers jours` : undefined} />
        <Kpi label="Destinataires touchés" value={overview ? fmtInt(overview.recipients) : '—'} sub="comptes clients, toutes campagnes" />
        <Kpi label="Taux d’ouverture moyen" value={overview ? pct(overview.openRate) : '—'} sub="ouvertures / destinataires" />
        <Kpi label="Taux de clic moyen" value={overview ? pct(overview.clickRate) : '—'} sub="clics sur le bouton / destinataires" />
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" style={chip(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}{counts[t.key] ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
        <div style={{ position: 'relative', marginLeft: 'auto', flex: '0 1 240px', minWidth: '160px' }}>
          <HiOutlineSearch size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher" aria-label="Rechercher une campagne" style={{ ...inputStyle, padding: '8px 10px 8px 30px', fontSize: '13px' }} />
        </div>
      </div>

      {campaigns === null ? (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Chargement…</div>
      ) : visible.length === 0 ? (
        <div style={{ ...PANEL, padding: '36px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
            {campaigns.length === 0 ? 'Aucune campagne pour l’instant.' : 'Aucune campagne dans cette vue.'}
          </span>
          {campaigns.length === 0 && !missing && (
            <button type="button" style={btn('#2563eb', true)} onClick={() => navigate('/admin/campaigns/new')}>
              <HiPlus size={16} /> Créer la première campagne
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '14px' }}>
          {visible.map((c) => (
            <CampaignCard key={c.id} c={c} onOpen={() => open(c)} onDuplicate={() => duplicate(c)} onDelete={() => remove(c)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignsList;
