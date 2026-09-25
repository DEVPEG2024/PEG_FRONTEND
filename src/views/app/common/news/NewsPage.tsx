import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { HiArrowLeft, HiOutlineNewspaper } from 'react-icons/hi';
import type { ClientCampaign, OpenChannel } from '@/@types/campaign';
import { apiGetMyCampaign, apiGetMyCampaigns, apiTrackCampaign } from '@/services/CampaignServices';
import CampaignContent, { TagChip } from '@/components/campaign/CampaignContent';
import { openCampaignLink } from '@/components/campaign/openCampaignLink';
import { excerpt, fmtRelativeDay } from '@/utils/campaignFormat';

/**
 * Actualités — campagnes reçues par le compte connecté (client ; admin pour ses
 * envois de test). `/common/news` : la liste ; `/common/news/:id` : le détail.
 * `?src=bell|email` indique d'où vient le client, pour le canal d'ouverture.
 */

const PANEL: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
};

const Page = ({ children }: { children: React.ReactNode }) => (
  <div style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
    {children}
  </div>
);

const Header = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(96,165,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', flexShrink: 0 }}>
      <HiOutlineNewspaper size={22} />
    </div>
    <div>
      <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>Actualités</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>Informations, nouveautés et promotions de PEG</p>
    </div>
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div style={{ ...PANEL, padding: '36px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{text}</div>
);

const NewsCard = ({ c, onOpen }: { c: ClientCampaign; onOpen: () => void }) => {
  const cover = c.images[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ ...PANEL, padding: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}
    >
      {cover ? (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', background: '#0b1422' }}>
          <div aria-hidden style={{ position: 'absolute', inset: '-20px', backgroundImage: `url("${cover.url}")`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(16px) brightness(0.55)' }} />
          <img src={cover.url} alt="" loading="lazy" style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        </div>
      ) : null}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <TagChip tag={c.tag} />
          {!c.openedAt && (
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: '100px', padding: '1px 8px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Nouveau
            </span>
          )}
          {c.isTest && <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700 }}>TEST</span>}
          <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{fmtRelativeDay(c.receivedAt)}</span>
        </div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{c.title}</span>
        {c.message && <span style={{ color: 'rgba(226,232,240,0.7)', fontSize: '13px', lineHeight: 1.5 }}>{excerpt(c.message, 140)}</span>}
      </div>
    </button>
  );
};

const NewsList = () => {
  const navigate = useNavigate();
  const [list, setList] = useState<ClientCampaign[] | null>(null);

  useEffect(() => {
    apiGetMyCampaigns()
      .then((res) => setList(res.data.campaigns || []))
      .catch(() => setList([]));
  }, []);

  return (
    <Page>
      <Header />
      {list === null ? (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Chargement…</div>
      ) : list.length === 0 ? (
        <Empty text="Aucune actualité pour le moment." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '14px' }}>
          {list.map((c) => <NewsCard key={c.id} c={c} onOpen={() => navigate(`/common/news/${c.id}`)} />)}
        </div>
      )}
    </Page>
  );
};

const NewsDetail = ({ id }: { id: number }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [campaign, setCampaign] = useState<ClientCampaign | null>(null);
  const [missing, setMissing] = useState(false);
  const tracked = useRef<number | null>(null);
  const src = params.get('src');
  const channel: OpenChannel = src === 'bell' ? 'bell' : src === 'email' ? 'email' : 'feed';

  useEffect(() => {
    setCampaign(null);
    setMissing(false);
    apiGetMyCampaign(id)
      .then((res) => setCampaign(res.data.campaign))
      .catch(() => setMissing(true));
  }, [id]);

  // Ouverture comptée une fois. Depuis l'e-mail, le lien suivi l'a déjà comptée.
  useEffect(() => {
    if (!campaign || tracked.current === campaign.id) return;
    tracked.current = campaign.id;
    if (channel !== 'email') apiTrackCampaign(campaign.id, 'open', channel).catch(() => {});
  }, [campaign, channel]);

  const onCta = () => {
    if (!campaign) return;
    apiTrackCampaign(campaign.id, 'click', channel).catch(() => {});
    openCampaignLink(campaign.ctaUrl, navigate);
  };

  return (
    <Page>
      <Link to="/common/news" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', textDecoration: 'none', width: 'fit-content' }}>
        <HiArrowLeft size={15} /> Toutes les actualités
      </Link>
      {missing ? (
        <Empty text="Cette actualité n’est plus disponible." />
      ) : !campaign ? (
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>Chargement…</div>
      ) : (
        <div style={{ ...PANEL, overflow: 'hidden', maxWidth: '720px', width: '100%', margin: '0 auto' }}>
          <CampaignContent campaign={campaign} dateLabel={fmtRelativeDay(campaign.receivedAt)} onCta={onCta} coverMaxHeight={460} titleSize={24} />
        </div>
      )}
    </Page>
  );
};

const NewsPage = () => {
  const { id } = useParams<{ id?: string }>();
  const numeric = id ? Number.parseInt(id, 10) : NaN;
  return Number.isSafeInteger(numeric) && numeric > 0 ? <NewsDetail id={numeric} /> : <NewsList />;
};

export default NewsPage;
