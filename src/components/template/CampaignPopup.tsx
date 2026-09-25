import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { useAppSelector } from '@/store';
import type { ClientCampaign } from '@/@types/campaign';
import { apiGetMyCampaigns, apiTrackCampaign } from '@/services/CampaignServices';
import CampaignContent from '@/components/campaign/CampaignContent';
import { openCampaignLink } from '@/components/campaign/openCampaignLink';
import { fmtRelativeDay } from '@/utils/campaignFormat';

/**
 * Pop-up des campagnes clients (option « pop-up à la prochaine visite »).
 *
 * Chargée à l'arrivée puis dès qu'une notification `campaign` apparaît dans la
 * cloche (le polling existant fait office de signal : pas de polling en plus).
 * Jamais pendant un paiement ni sur la page Actualités. Une campagne affichée
 * compte comme ouverte (canal « popup ») et ne revient pas. Une seule pop-up par
 * visite (onglet) : les suivantes attendent la visite d'après — elles restent
 * dans la cloche et les Actualités.
 */

const HIDDEN_ON = [/^\/customer\/cart/, /^\/customer\/checkout/, /^\/customer\/invoice\/[^/]+\/virement/, /^\/common\/news/];
const SEEN_KEY = 'peg_campaign_popup_seen';
const VISIT_KEY = 'peg_campaign_popup_visit';

const shownThisVisit = () => {
  try { return sessionStorage.getItem(VISIT_KEY) === '1'; } catch { return false; }
};

const readSeen = (): Set<number> => {
  try {
    return new Set<number>(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const markSeen = (id: number) => {
  try {
    const seen = readSeen();
    seen.add(id);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
    sessionStorage.setItem(VISIT_KEY, '1');
  } catch {
    /* stockage indisponible : le serveur empêche de toute façon le ré-affichage */
  }
};

const CampaignPopup = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<ClientCampaign[]>([]);
  const [current, setCurrent] = useState<ClientCampaign | null>(null);
  // Backend pas encore déployé (route absente) : on n'insiste pas.
  const unavailable = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const notifications = useAppSelector((s) => s.base.notification?.notifications ?? []);
  const latestCampaignNotif = useMemo(
    () => notifications.find((n) => n.eventType === 'campaign' && !n.read)?._id ?? null,
    [notifications],
  );

  const load = useCallback(async () => {
    if (unavailable.current) return;
    try {
      const res = await apiGetMyCampaigns();
      const seen = readSeen();
      setQueue((res.data.popups || []).filter((c) => !seen.has(c.id)));
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404 || status === 405) unavailable.current = true;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 1200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (latestCampaignNotif) load();
  }, [latestCampaignNotif, load]);

  const hidden = HIDDEN_ON.some((re) => re.test(location.pathname));

  useEffect(() => {
    if (current || hidden || queue.length === 0 || shownThisVisit()) return;
    const next = queue[0];
    setCurrent(next);
    markSeen(next.id);
    apiTrackCampaign(next.id, 'open', 'popup').catch(() => {});
  }, [current, hidden, queue]);

  const close = useCallback((kind: 'dismiss' | 'click' | 'feed') => {
    if (!current) return;
    if (kind === 'dismiss') apiTrackCampaign(current.id, 'dismiss', 'popup').catch(() => {});
    if (kind === 'click') apiTrackCampaign(current.id, 'click', 'popup').catch(() => {});
    setQueue((q) => q.filter((c) => c.id !== current.id));
    setCurrent(null);
  }, [current]);

  // Échap = « plus tard » ; défilement de la page bloqué pendant l'affichage.
  useEffect(() => {
    if (!current) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close('dismiss'); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [current, close]);

  if (!current) return null;

  const onCta = () => {
    const url = current.ctaUrl;
    close('click');
    openCampaignLink(url, navigate);
  };

  return (
    <div
      onClick={() => close('dismiss')}
      style={{
        position: 'fixed', inset: 0, zIndex: 10050,
        background: 'rgba(3,7,18,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={current.title}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: '460px',
          maxHeight: 'calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          overflowY: 'auto', overscrollBehavior: 'contain', outline: 'none',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        }}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={() => close('dismiss')}
          style={{
            position: 'sticky', top: '10px', float: 'right', marginRight: '10px', marginTop: '10px', marginBottom: '-44px', zIndex: 2,
            width: '34px', height: '34px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(15,23,42,0.7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <HiX size={18} />
        </button>
        <CampaignContent campaign={current} dateLabel={fmtRelativeDay(current.receivedAt)} onCta={onCta} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '0 18px 16px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { close('feed'); navigate('/common/news'); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: '12px', cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}
          >
            Toutes les actualités
          </button>
          <button
            type="button"
            onClick={() => close('dismiss')}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter, sans-serif' }}
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CampaignPopup;
