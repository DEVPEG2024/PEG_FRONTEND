import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HiX } from 'react-icons/hi';
import { useAppSelector } from '@/store';
import type { ClientCampaign } from '@/@types/campaign';
import { apiGetMyCampaigns, apiTrackCampaign } from '@/services/CampaignServices';
import CampaignContent from '@/components/campaign/CampaignContent';
import { openCampaignLink } from '@/components/campaign/openCampaignLink';
import { fmtRelativeDay } from '@/utils/campaignFormat';
import { backdropMotion, cardMotion } from '@/components/campaign/popupMotion';

/**
 * Pop-up des campagnes clients (option « pop-up à la prochaine visite »).
 *
 * Chargée à l'arrivée puis dès qu'une notification `campaign` apparaît dans la
 * cloche (le polling existant fait office de signal : pas de polling en plus).
 * Jamais pendant un paiement ni sur la page Actualités. Une campagne affichée
 * compte comme ouverte (canal « popup ») et ne revient pas. Une seule pop-up par
 * visite (onglet) : les suivantes attendent la visite d'après — elles restent
 * dans la cloche et les Actualités.
 *
 * Réglages par campagne : délai d'ouverture (compté depuis l'arrivée sur
 * l'application), fermeture automatique (décompte suspendu tant que le client
 * survole ou touche la pop-up ; ne compte pas comme une fermeture), période de
 * proposition (appliquée par le serveur).
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
  // Le délai d'ouverture court depuis l'arrivée sur l'application, pas depuis le chargement.
  const arrivedAt = useRef(Date.now());
  const [remaining, setRemaining] = useState<number | null>(null);
  const paused = useRef(false);
  // Préférence système « réduire les animations » : fondu simple, contenu sans décalage.
  const reduced = !!useReducedMotion();

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
    const show = () => {
      if (shownThisVisit()) return;
      setCurrent(next);
      markSeen(next.id);
      apiTrackCampaign(next.id, 'open', 'popup').catch(() => {});
    };
    const wait = arrivedAt.current + (next.popupDelay || 0) * 1000 - Date.now();
    if (wait <= 0) { show(); return; }
    const t = setTimeout(show, wait);
    return () => clearTimeout(t);
  }, [current, hidden, queue]);

  // 'auto' : fermeture automatique (durée écoulée) — ni clic ni fermeture comptés.
  const close = useCallback((kind: 'dismiss' | 'click' | 'feed' | 'auto') => {
    if (!current) return;
    if (kind === 'dismiss') apiTrackCampaign(current.id, 'dismiss', 'popup').catch(() => {});
    if (kind === 'click') apiTrackCampaign(current.id, 'click', 'popup').catch(() => {});
    setQueue((q) => q.filter((c) => c.id !== current.id));
    setCurrent(null);
  }, [current]);

  const closeRef = useRef(close);
  closeRef.current = close;

  // Fermeture automatique au bout de `popupDuration` secondes.
  useEffect(() => {
    paused.current = false;
    if (!current?.popupDuration) { setRemaining(null); return; }
    const TICK = 100;
    let left = current.popupDuration * 1000;
    setRemaining(left);
    const t = setInterval(() => {
      if (paused.current) return;
      left -= TICK;
      setRemaining(Math.max(0, left));
      if (left <= 0) { clearInterval(t); closeRef.current('auto'); }
    }, TICK);
    return () => clearInterval(t);
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

  const onCta = () => {
    if (!current) return;
    const url = current.ctaUrl;
    close('click');
    openCampaignLink(url, navigate);
  };
  const m = current ? cardMotion(current.popupAnimation || 'zoom', reduced) : null;

  // AnimatePresence : la pop-up joue aussi son animation de sortie à la fermeture.
  return (
    <AnimatePresence>
    {current && m && (
    <motion.div
      key={`campaign-popup-${current.id}`}
      {...backdropMotion}
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
        initial={m.initial}
        animate={m.animate}
        exit={m.exit}
        onClick={(e) => e.stopPropagation()}
        onPointerEnter={() => { paused.current = true; }}
        onPointerLeave={() => { paused.current = false; }}
        // Focus sur un bouton ou un lien (clavier) = le client lit : décompte suspendu.
        // Pas le focus de la pop-up elle-même, qu'elle prend à l'ouverture.
        onFocusCapture={(e) => { if (e.target !== e.currentTarget) paused.current = true; }}
        onBlurCapture={(e) => { if (e.target !== e.currentTarget) paused.current = false; }}
        style={{
          position: 'relative', width: '100%', maxWidth: '460px',
          maxHeight: 'calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
          overflowY: 'auto', overscrollBehavior: 'contain', outline: 'none',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
        }}
      >
        {remaining !== null && current.popupDuration && (
          <div
            role="progressbar"
            aria-label="Fermeture automatique"
            aria-valuemin={0}
            aria-valuemax={current.popupDuration}
            aria-valuenow={Math.ceil(remaining / 1000)}
            style={{ position: 'sticky', top: 0, zIndex: 3, height: '3px', background: 'rgba(255,255,255,0.08)' }}
          >
            <div style={{ height: '100%', width: `${(remaining / (current.popupDuration * 1000)) * 100}%`, background: '#60a5fa', transition: 'width 0.1s linear' }} />
          </div>
        )}
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
        <CampaignContent campaign={current} dateLabel={fmtRelativeDay(current.receivedAt)} onCta={onCta} entranceDelay={reduced ? null : m.contentDelay} />
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
    </motion.div>
    )}
    </AnimatePresence>
  );
};

export default CampaignPopup;
