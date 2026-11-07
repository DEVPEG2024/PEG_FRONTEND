import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import useResponsive from '@/utils/hooks/useResponsive';
import { FaWhatsapp } from 'react-icons/fa';
import {
  HiArrowLeft,
  HiOutlineBeaker,
  HiOutlinePaperAirplane,
  HiOutlinePaperClip,
  HiOutlinePhone,
  HiOutlineTrash,
} from 'react-icons/hi';
import type {
  WhatsappConversation,
  WhatsappMessage,
  WhatsappStatus,
} from '@/@types/whatsapp';
import { apiUploadFile } from '@/services/FileServices';
import {
  apiDeleteWhatsappTest,
  apiGetWhatsappConversation,
  apiGetWhatsappConversations,
  apiGetWhatsappStatus,
  apiMarkWhatsappRead,
  apiReleaseWhatsapp,
  apiReplyWhatsapp,
  apiSimulateWhatsapp,
  apiTakeOverWhatsapp,
} from '@/services/WhatsappServices';
import {
  agentIsTyping,
  authorLabel,
  errorText,
  eurFr,
  initials,
  isBackendMissing,
  listTime,
  messageTime,
  sortConversations,
  stateInfo,
  statusLabel,
  timeLeftLabel,
} from './whatsappFormat';

// Conversations WhatsApp : l'équipe lit tout et répond d'ici, ordinateur ou téléphone.
// Le contact ne voit jamais que le numéro de PEG. Tant qu'aucun numéro n'est relié, les
// conversations d'essai permettent de tout tester : on écrit comme un contact, l'agent
// répond avec les vraies données, rien ne part vers WhatsApp.

const LIST_POLL_MS = 5000;
const THREAD_POLL_MS = 2500;
const WA_GREEN = '#25d366';

const CSS = `
.wa-page { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); gap: 14px; height: calc(100dvh - 128px); min-height: 420px; font-family: Inter, sans-serif; color: rgba(255,255,255,0.88); }
.wa-pane { display: flex; flex-direction: column; min-height: 0; min-width: 0; border-radius: 18px; background: linear-gradient(160deg, rgba(22,38,61,0.9), rgba(15,28,46,0.95)); border: 1px solid rgba(255,255,255,0.07); overflow: hidden; }
.wa-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.wa-title { margin: 0; font-size: 16px; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; letter-spacing: -0.01em; }
.wa-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 10px; font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer; color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); text-decoration: none; white-space: nowrap; }
.wa-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.wa-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.wa-btn-green { color: #06210f; background: ${WA_GREEN}; border-color: ${WA_GREEN}; }
.wa-btn-green:hover:not(:disabled) { background: #3be37a; }
.wa-btn-danger { color: #f87171; }
.wa-icon { width: 36px; padding: 0; }
.wa-chips { display: flex; gap: 6px; padding: 10px 14px 4px; }
.wa-chip { padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; color: rgba(255,255,255,0.55); background: transparent; border: 1px solid rgba(255,255,255,0.1); }
.wa-chip-on { color: #fff; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
.wa-list { flex: 1; min-height: 0; overflow-y: auto; padding: 6px; }
.wa-row { width: 100%; display: flex; gap: 11px; padding: 11px 10px; border-radius: 12px; background: transparent; border: none; cursor: pointer; text-align: left; color: inherit; font-family: inherit; }
.wa-row:hover { background: rgba(255,255,255,0.04); }
.wa-row-on { background: rgba(255,255,255,0.08) !important; }
.wa-avatar { flex-shrink: 0; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #2f6fed, #1f4bb6); }
.wa-row-main { flex: 1; min-width: 0; }
.wa-row-top { display: flex; align-items: baseline; gap: 8px; }
.wa-row-name { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wa-row-time { flex-shrink: 0; font-size: 11px; color: rgba(255,255,255,0.4); }
.wa-row-preview { margin: 2px 0 5px; font-size: 12.5px; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wa-row-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.wa-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; border: 1px solid; white-space: nowrap; }
.wa-unread { margin-left: auto; min-width: 19px; height: 19px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 11px; font-weight: 800; color: #06210f; background: ${WA_GREEN}; }
.wa-empty { margin: auto; padding: 28px 22px; text-align: center; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.5); }
.wa-empty svg { margin: 0 auto 10px; color: rgba(255,255,255,0.25); }
.wa-banner { display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; font-size: 12.5px; line-height: 1.4; color: #fde68a; background: rgba(251,191,36,0.1); border-bottom: 1px solid rgba(251,191,36,0.2); }
.wa-thread-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.wa-thread-who { flex: 1; min-width: 0; }
.wa-thread-name { margin: 0; font-size: 15px; font-weight: 800; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wa-thread-sub { margin: 1px 0 0; font-size: 12px; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wa-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); }
.wa-notice { margin: 10px 14px 0; padding: 10px 12px; border-radius: 12px; font-size: 12.5px; line-height: 1.45; color: #fde68a; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.22); }
.wa-notice strong { display: block; color: #fff; font-weight: 700; }
.wa-needs { margin: 10px 14px 0; border-radius: 12px; font-size: 12.5px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
.wa-needs summary { display: flex; align-items: baseline; gap: 8px; padding: 9px 12px; cursor: pointer; list-style: none; color: rgba(255,255,255,0.6); }
.wa-needs summary::-webkit-details-marker { display: none; }
.wa-needs summary strong { flex-shrink: 0; color: #fff; font-weight: 700; }
.wa-needs summary span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wa-needs dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; padding: 0 12px 10px; }
.wa-needs dt { color: rgba(255,255,255,0.45); }
.wa-needs dd { margin: 0; color: rgba(255,255,255,0.85); overflow-wrap: anywhere; }
.wa-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 7px; background: rgba(0,0,0,0.14); }
.wa-bubble { max-width: min(78%, 480px); padding: 8px 11px; border-radius: 14px; font-size: 14px; line-height: 1.42; overflow-wrap: anywhere; white-space: pre-wrap; }
.wa-in { align-self: flex-start; color: #fff; background: rgba(255,255,255,0.09); border-bottom-left-radius: 4px; }
.wa-out { align-self: flex-end; color: #eafff2; background: rgba(37,211,102,0.2); border-bottom-right-radius: 4px; }
.wa-out-admin { color: #eaf2ff; background: rgba(47,111,237,0.42); }
.wa-out-failed { outline: 1px solid rgba(248,113,113,0.7); }
.wa-author { display: block; margin-bottom: 2px; font-size: 11px; font-weight: 700; opacity: 0.7; }
.wa-meta { display: block; margin-top: 3px; text-align: right; font-size: 10.5px; opacity: 0.55; }
.wa-error { display: block; margin-top: 4px; font-size: 11.5px; color: #fecaca; }
.wa-img { display: block; max-width: 100%; max-height: 260px; margin-bottom: 5px; border-radius: 10px; background: #fff; object-fit: contain; }
.wa-file { color: inherit; font-weight: 700; text-decoration: underline; }
.wa-choices { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
.wa-choice { min-height: 36px; padding: 6px 10px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; text-align: center; color: #bbf7d0; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.14); cursor: pointer; text-decoration: none; display: block; }
.wa-choice:disabled { cursor: default; opacity: 0.75; }
.wa-choice:hover:not(:disabled) { background: rgba(0,0,0,0.32); }
.wa-typing { align-self: flex-start; font-size: 12px; color: rgba(255,255,255,0.45); padding: 2px 4px; }
.wa-composer { padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid rgba(255,255,255,0.06); }
.wa-as { display: flex; gap: 6px; margin-bottom: 8px; }
.wa-compose-row { display: flex; align-items: flex-end; gap: 8px; }
.wa-input { flex: 1; min-width: 0; min-height: 42px; max-height: 130px; padding: 10px 12px; border-radius: 12px; font-size: 16px; line-height: 1.35; font-family: inherit; color: #fff; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); resize: none; outline: none; }
.wa-input:focus { border-color: rgba(37,211,102,0.55); }
.wa-send { width: 42px; height: 42px; flex-shrink: 0; padding: 0; border-radius: 50%; }
.wa-send svg { transform: rotate(90deg); }
.wa-back { display: none; }
@media (max-width: 767.98px) {
  /* Entre l'en-tête et la barre du bas : le pied de page ne pousse jamais le champ de saisie. */
  .wa-page { display: block; position: fixed; top: calc(64px + env(safe-area-inset-top, 0px)); left: 0; right: 0; bottom: var(--peg-dock-lift, 0px); height: auto; min-height: 0; margin: 0; z-index: 5; background: #070a08; }
  /* Conversation ouverte : plein écran, calé sur la zone visible pour rester au-dessus du clavier. */
  .wa-page-thread { z-index: 10003; top: var(--wa-top, 0px); bottom: auto; height: var(--wa-height, 100dvh); background: #070a08; }
  .wa-page-thread .wa-thread-head { padding-top: calc(10px + env(safe-area-inset-top, 0px)); }
  .wa-pane { height: 100%; border-radius: 0; border-left: none; border-right: none; border-bottom: none; background: transparent; }
  .wa-hide-phone { display: none !important; }
  .wa-back { display: inline-flex; }
  .wa-bubble { max-width: 86%; }
}
`;

type Filter = 'todo' | 'all';

/** Gras WhatsApp (*mot*) : aucune balise n'est interprétée, seulement des éléments React. */
const formatted = (body: string) =>
  body
    .split(/(\*[^*\n]+\*)/g)
    .map((part, i) =>
      /^\*[^*\n]+\*$/.test(part) ? (
        <strong key={i}>{part.slice(1, -1)}</strong>
      ) : (
        part
      )
    );

const Bubble = ({
  m,
  test,
  onChoice,
  busy,
}: {
  m: WhatsappMessage;
  test: boolean;
  onChoice: (id: string, title: string) => void;
  busy: boolean;
}) => {
  const out = m.direction === 'out';
  const label = out ? authorLabel(m) : '';
  const status = out ? statusLabel(m.status) : null;
  const image =
    m.mediaUrl &&
    (m.kind === 'image' || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(m.mediaUrl));
  const choices =
    m.kind === 'buttons' ? m.buttons : m.kind === 'list' ? m.rows : null;
  return (
    <div
      className={`wa-bubble ${out ? 'wa-out' : 'wa-in'} ${m.author === 'admin' ? 'wa-out-admin' : ''} ${m.status === 'failed' ? 'wa-out-failed' : ''}`}
    >
      {label && <span className="wa-author">{label}</span>}
      {image && (
        <img
          className="wa-img"
          src={m.mediaUrl as string}
          alt={m.mediaName || m.body || 'Image'}
          loading="lazy"
        />
      )}
      {m.mediaUrl && !image && (
        <a
          className="wa-file"
          href={m.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {m.mediaName || 'Fichier reçu'}
        </a>
      )}
      {m.body ? formatted(m.body) : null}
      {!m.body && m.kind === 'audio' && (
        <em>Message vocal impossible à lire</em>
      )}
      {!m.body && !m.mediaUrl && m.kind === 'unsupported' && (
        <em>Message d’un type non pris en charge</em>
      )}
      {choices && (
        <div className="wa-choices">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="wa-choice"
              disabled={!test || busy}
              onClick={() => onChoice(c.id, c.title)}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
      {m.kind === 'cta' && m.url && (
        <div className="wa-choices">
          <a
            className="wa-choice"
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {m.label || 'Ouvrir'}
          </a>
        </div>
      )}
      <span className="wa-meta">
        {messageTime(m.createdAt)}
        {status ? ` · ${status}` : ''}
      </span>
      {m.status === 'failed' && m.error && (
        <span className="wa-error">{m.error}</span>
      )}
    </div>
  );
};

const WhatsappPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<WhatsappStatus | null>(null);
  const [missing, setMissing] = useState(false);
  const [conversations, setConversations] = useState<
    WhatsappConversation[] | null
  >(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<WhatsappConversation | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [draftTest, setDraftTest] = useState(false);
  const [asContact, setAsContact] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [viewport, setViewport] = useState<{
    height: number;
    top: number;
  } | null>(null);
  const { smaller } = useResponsive();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const lastCount = useRef(0);

  const selectedId = Number(searchParams.get('c')) || null;

  const select = useCallback(
    (id: number | null) => {
      setDraftTest(false);
      setText('');
      setFeedback(null);
      setSearchParams(id ? { c: String(id) } : {}, { replace: !id });
    },
    [setSearchParams]
  );

  const loadList = useCallback(async () => {
    try {
      const res = await apiGetWhatsappConversations();
      setConversations(res.data.conversations || []);
    } catch (e) {
      if (isBackendMissing(e)) setMissing(true);
      setConversations((prev) => prev ?? []);
    }
  }, []);

  const loadThread = useCallback(
    async (id: number) => {
      try {
        const res = await apiGetWhatsappConversation(id);
        setSelected(res.data.conversation);
      // La liste reflète tout de suite l'état de la conversation ouverte, sans attendre son rafraîchissement.
      setConversations((prev) => prev?.map((c) => (c.id === id ? res.data.conversation : c)) ?? prev);
        setMessages(res.data.messages || []);
        if (res.data.conversation.unread > 0) await apiMarkWhatsappRead(id);
      } catch (e: any) {
        if (e?.response?.status === 404) select(null);
      }
    },
    [select]
  );

  useEffect(() => {
    apiGetWhatsappStatus()
      .then((r) => setStatus(r.data))
      .catch((e) => {
        if (isBackendMissing(e)) setMissing(true);
      });
    void loadList();
  }, [loadList]);

  // L'application rafraîchit quand l'onglet est visible : inutile d'interroger en arrière-plan.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') {
        void loadList();
        setNow(Date.now());
      }
    };
    const timer = window.setInterval(tick, LIST_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    setSelected(null);
    setMessages([]);
    lastCount.current = 0;
    if (!selectedId) return undefined;
    void loadThread(selectedId);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadThread(selectedId);
    }, THREAD_POLL_MS);
    return () => window.clearInterval(timer);
  }, [selectedId, loadThread]);

  // Une conversation d'essai s'ouvre côté contact, une vraie côté équipe.
  useEffect(() => {
    setAsContact(!!selected?.isTest);
  }, [selected?.id, selected?.isTest]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      const el = messagesRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  // Téléphone, conversation ouverte : calé sur la zone visible, page figée derrière.
  const threadOpen = !!selectedId || draftTest;
  const phoneThread = smaller.md && threadOpen;
  useEffect(() => {
    if (!phoneThread) {
      setViewport(null);
      return undefined;
    }
    const vv = window.visualViewport;
    const update = () =>
      setViewport(vv ? { height: vv.height, top: vv.offsetTop } : null);
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      document.body.style.overflow = previous;
    };
  }, [phoneThread]);

  // Clavier ouvert ou nouveau message : le dernier message reste visible.
  useEffect(() => {
    const el = messagesRef.current;
    if (el && viewport) el.scrollTop = el.scrollHeight;
  }, [viewport]);

  const shown = useMemo(() => {
    const list = sortConversations(conversations || []);
    return filter === 'todo'
      ? list.filter((c) => c.state === 'waiting_human')
      : list;
  }, [conversations, filter]);
  const todoCount = useMemo(
    () =>
      (conversations || []).filter((c) => c.state === 'waiting_human').length,
    [conversations]
  );

  const simulate = async (
    payload: Parameters<typeof apiSimulateWhatsapp>[0]
  ) => {
    const res = await apiSimulateWhatsapp({
      ...(selected?.isTest ? { phone: selected.phone } : { name: 'Essai' }),
      ...payload,
    });
    const id = res.data.conversationId;
    if (id !== selectedId) select(id);
    else await loadThread(id);
    void loadList();
  };

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      if (draftTest || (selected?.isTest && asContact)) {
        await simulate({ text: value });
      } else if (selected) {
        const res = await apiReplyWhatsapp(selected.id, value);
        if (res.data.queued)
          setFeedback(
            'Plus de 24 h : votre message partira quand le contact aura répondu.'
          );
        await loadThread(selected.id);
        void loadList();
      }
      setText('');
    } catch (e) {
      setFeedback(errorText(e, "Le message n'a pas pu partir."));
    } finally {
      setSending(false);
    }
  };

  const onChoice = async (id: string, title: string) => {
    setSending(true);
    try {
      await simulate({ text: title, replyId: id });
    } catch (e) {
      setFeedback(errorText(e, 'Essai impossible.'));
    } finally {
      setSending(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setSending(true);
    try {
      const up: any = await apiUploadFile(file);
      await simulate({
        attachment: {
          url: up.url,
          name: up.name || file.name,
          mime: up.mime || file.type,
          fileId: up.id,
        },
      });
    } catch (e) {
      setFeedback(errorText(e, "Le fichier n'a pas pu être envoyé."));
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const act = async (run: () => Promise<unknown>, fallback: string) => {
    if (!selected) return;
    try {
      await run();
      await loadThread(selected.id);
      void loadList();
    } catch (e) {
      setFeedback(errorText(e, fallback));
    }
  };

  const removeTest = async () => {
    if (!selected?.isTest) return;
    if (!window.confirm("Supprimer cette conversation d'essai ?")) return;
    try {
      await apiDeleteWhatsappTest(selected.id);
      select(null);
      void loadList();
    } catch (e) {
      setFeedback(errorText(e, 'Suppression impossible.'));
    }
  };

  if (missing) {
    return (
      <div className="wa-page" style={{ display: 'block', height: 'auto' }}>
        <style>{CSS}</style>
        <div className="wa-pane">
          <p className="wa-empty">
            Module WhatsApp indisponible : le serveur n’est pas encore à jour.
          </p>
        </div>
      </div>
    );
  }

  const selectedState = selected ? stateInfo(selected) : null;
  const left = selected?.windowClosesAt
    ? timeLeftLabel(selected.windowClosesAt, now)
    : null;
  const closed = !!selected && !selected.windowOpen && !asContact;
  const contactMode = draftTest || (!!selected?.isTest && asContact);

  const pageStyle = viewport
    ? ({
        '--wa-top': `${viewport.top}px`,
        '--wa-height': `${viewport.height}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={`wa-page ${threadOpen ? 'wa-page-thread' : ''}`}
      style={pageStyle}
    >
      <style>{CSS}</style>

      <section
        className={`wa-pane ${threadOpen ? 'wa-hide-phone' : ''}`}
        aria-label="Conversations"
      >
        <div className="wa-head">
          <h1 className="wa-title" style={{ flex: 1 }}>
            <FaWhatsapp size={18} color={WA_GREEN} /> WhatsApp
          </h1>
          <button
            type="button"
            className="wa-btn"
            onClick={() => {
              setSearchParams({}, { replace: true });
              setDraftTest(true);
              setText('');
            }}
          >
            <HiOutlineBeaker size={15} /> Essayer
          </button>
        </div>
        {status && !status.live && (
          <div className="wa-banner">
            Aucun numéro relié pour l’instant. Touchez « Essayer » : vous
            écrivez comme un contact, l’agent répond avec le vrai catalogue, et
            rien ne part vers WhatsApp.
          </div>
        )}
        <div className="wa-chips">
          <button
            type="button"
            className={`wa-chip ${filter === 'all' ? 'wa-chip-on' : ''}`}
            onClick={() => setFilter('all')}
          >
            Toutes
          </button>
          <button
            type="button"
            className={`wa-chip ${filter === 'todo' ? 'wa-chip-on' : ''}`}
            onClick={() => setFilter('todo')}
          >
            À répondre{todoCount ? ` (${todoCount})` : ''}
          </button>
        </div>
        <div className="wa-list">
          {conversations && !shown.length && (
            <p className="wa-empty">
              <FaWhatsapp size={30} />
              {filter === 'todo'
                ? 'Rien à répondre pour le moment.'
                : 'Aucune conversation pour le moment.'}
            </p>
          )}
          {shown.map((c) => {
            const info = stateInfo(c);
            const waitLeft =
              c.state === 'waiting_human'
                ? timeLeftLabel(c.windowClosesAt, now)
                : null;
            return (
              <button
                key={c.id}
                type="button"
                className={`wa-row ${c.id === selectedId ? 'wa-row-on' : ''}`}
                onClick={() => select(c.id)}
              >
                <span className="wa-avatar" aria-hidden="true">
                  {initials(c.name)}
                </span>
                <span className="wa-row-main">
                  <span className="wa-row-top">
                    <span className="wa-row-name">{c.name}</span>
                    <span className="wa-row-time">
                      {listTime(c.updatedAt, new Date(now))}
                    </span>
                  </span>
                  <p className="wa-row-preview">{c.preview || ' '}</p>
                  <span className="wa-row-tags">
                    <span
                      className="wa-pill"
                      style={{
                        color: info.color,
                        background: info.bg,
                        borderColor: info.border,
                      }}
                    >
                      {info.label}
                    </span>
                    {waitLeft && (
                      <span
                        className="wa-pill"
                        style={{
                          color: '#fecaca',
                          background: 'rgba(248,113,113,0.12)',
                          borderColor: 'rgba(248,113,113,0.3)',
                        }}
                      >
                        {waitLeft}
                      </span>
                    )}
                    {c.isTest && (
                      <span
                        className="wa-pill"
                        style={{
                          color: 'rgba(255,255,255,0.6)',
                          background: 'transparent',
                          borderColor: 'rgba(255,255,255,0.18)',
                        }}
                      >
                        Essai
                      </span>
                    )}
                    {c.unread > 0 && c.id !== selectedId && (
                      <span className="wa-unread">{c.unread}</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className={`wa-pane ${threadOpen ? '' : 'wa-hide-phone'}`}
        aria-label="Conversation"
      >
        {!threadOpen && (
          <p className="wa-empty">
            <FaWhatsapp size={34} />
            Choisissez une conversation.
          </p>
        )}

        {draftTest && (
          <>
            <div className="wa-thread-head">
              <button
                type="button"
                className="wa-btn wa-icon wa-back"
                aria-label="Retour"
                onClick={() => setDraftTest(false)}
              >
                <HiArrowLeft size={18} />
              </button>
              <div className="wa-thread-who">
                <p className="wa-thread-name">Nouvel essai</p>
                <p className="wa-thread-sub">
                  Écrivez comme le ferait un contact sur WhatsApp
                </p>
              </div>
            </div>
            <div className="wa-messages">
              <p className="wa-empty">
                Par exemple : « Bonjour, il me faudrait 30 casquettes pour mon
                club ».
              </p>
            </div>
          </>
        )}

        {selected && selectedState && (
          <>
            <div className="wa-thread-head">
              <button
                type="button"
                className="wa-btn wa-icon wa-back"
                aria-label="Retour"
                onClick={() => select(null)}
              >
                <HiArrowLeft size={18} />
              </button>
              <span className="wa-avatar" aria-hidden="true">
                {initials(selected.name)}
              </span>
              <div className="wa-thread-who">
                <p className="wa-thread-name">{selected.name}</p>
                <p className="wa-thread-sub">
                  {selected.isTest ? 'Conversation d’essai' : selected.phone}
                  {selected.offerTotalTTC != null
                    ? ` · Offre ${eurFr(selected.offerTotalTTC)} TTC`
                    : ''}
                </p>
              </div>
              {!selected.isTest && (
                <a
                  className="wa-btn wa-icon"
                  href={`tel:${selected.phone.replace(/\s/g, '')}`}
                  aria-label="Appeler"
                >
                  <HiOutlinePhone size={17} />
                </a>
              )}
            </div>
            <div className="wa-actions">
              <span
                className="wa-pill"
                style={{
                  color: selectedState.color,
                  background: selectedState.bg,
                  borderColor: selectedState.border,
                }}
              >
                {selectedState.label}
              </span>
              {left && selected.state !== 'agent' && (
                <span
                  className="wa-pill"
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    background: 'transparent',
                    borderColor: 'rgba(255,255,255,0.18)',
                  }}
                >
                  {left}
                </span>
              )}
              <span style={{ flex: 1 }} />
              {selected.state === 'human' ? (
                <button
                  type="button"
                  className="wa-btn"
                  onClick={() =>
                    act(
                      () => apiReleaseWhatsapp(selected.id),
                      'Action impossible.'
                    )
                  }
                >
                  Rendre la main à l’agent
                </button>
              ) : (
                <button
                  type="button"
                  className="wa-btn"
                  onClick={() =>
                    act(
                      () => apiTakeOverWhatsapp(selected.id),
                      'Action impossible.'
                    )
                  }
                >
                  Reprendre la main
                </button>
              )}
              {selected.isTest && (
                <button
                  type="button"
                  className="wa-btn wa-icon wa-btn-danger"
                  aria-label="Supprimer l'essai"
                  title="Supprimer l'essai"
                  onClick={removeTest}
                >
                  <HiOutlineTrash size={16} />
                </button>
              )}
            </div>
            {selected.state === 'waiting_human' && selected.handoffReason && (
              <div className="wa-notice">
                <strong>{selected.handoffReason}</strong>
                {selected.handoffSummary}
              </div>
            )}
            {!!selected.needs?.length && (
              <details className="wa-needs">
                <summary>
                  <strong>Ce que cherche le contact</strong>
                  <span>{selected.needs.map((n) => n.value).join(' · ')}</span>
                </summary>
                <dl>
                  {selected.needs.map((n) => (
                    <Fragment key={n.label}>
                      <dt>{n.label}</dt>
                      <dd>{n.value}</dd>
                    </Fragment>
                  ))}
                </dl>
              </details>
            )}
            <div className="wa-messages" ref={messagesRef}>
              {messages.map((m) => (
                <Bubble
                  key={m.id}
                  m={m}
                  test={selected.isTest}
                  onChoice={onChoice}
                  busy={sending}
                />
              ))}
              {agentIsTyping(selected, messages, now) && (
                <span className="wa-typing">L’agent écrit…</span>
              )}
            </div>
          </>
        )}

        {threadOpen && (draftTest || selected) && (
          <div className="wa-composer">
            {selected?.isTest && (
              <div
                className="wa-as"
                role="group"
                aria-label="Écrire en tant que"
              >
                <button
                  type="button"
                  className={`wa-chip ${asContact ? 'wa-chip-on' : ''}`}
                  onClick={() => setAsContact(true)}
                >
                  Comme le contact
                </button>
                <button
                  type="button"
                  className={`wa-chip ${!asContact ? 'wa-chip-on' : ''}`}
                  onClick={() => setAsContact(false)}
                >
                  Comme l’équipe
                </button>
              </div>
            )}
            {feedback && (
              <div
                className="wa-notice"
                role="alert"
                style={{ margin: '0 0 8px' }}
              >
                {feedback}
              </div>
            )}
            {closed && (
              <div className="wa-notice" style={{ margin: '0 0 8px' }}>
                {selected?.consent !== true
                  ? "Plus de 24 h depuis son dernier message, et ce contact n'a pas accepté d'être recontacté : WhatsApp bloque l'envoi. Appelez-le plutôt."
                  : status?.templateReady
                    ? 'Plus de 24 h : il recevra une invitation à répondre, et votre message partira à sa réponse.'
                    : "Plus de 24 h : il faut un modèle validé par Meta, qui n'est pas encore configuré. Appelez-le plutôt."}
              </div>
            )}
            <div className="wa-compose-row">
              {contactMode && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    accept="image/*,.pdf,.ai,.eps,.svg"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    className="wa-btn wa-icon"
                    style={{ height: 42, width: 42 }}
                    aria-label="Envoyer un fichier"
                    disabled={sending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <HiOutlinePaperClip size={18} />
                  </button>
                </>
              )}
              <textarea
                className="wa-input"
                rows={1}
                value={text}
                placeholder={
                  contactMode
                    ? 'Écrire comme le contact…'
                    : 'Répondre au contact…'
                }
                aria-label="Message"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    !e.shiftKey &&
                    window.matchMedia('(min-width: 768px)').matches
                  ) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button
                type="button"
                className="wa-btn wa-btn-green wa-send"
                aria-label="Envoyer"
                disabled={sending || !text.trim()}
                onClick={() => void send()}
              >
                <HiOutlinePaperAirplane size={18} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default WhatsappPage;
