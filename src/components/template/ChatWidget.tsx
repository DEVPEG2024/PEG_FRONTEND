import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MdSend, MdClose, MdChatBubble, MdRefresh, MdAddComment, MdAutoAwesome, MdKeyboardArrowDown } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';
import useResponsive from '@/utils/hooks/useResponsive';
import { useAppSelector } from '@/store';
import axios from 'axios';
import { EXPRESS_BACKEND_URL } from '@/configs/api.config';
import { getPersistedAuthToken } from '@/store/tabSessionStorage';
import { renderChatMarkdown } from '@/utils/chatMarkdown';
import type { ChatCard } from '@/components/template/ChatCardView';
import ChatOfferAction from '@/components/template/ChatOfferAction';
import { isChatOffer, prefillForProduct, type ChatNavState, type ChatOffer } from '@/components/template/chatOffer';

/**
 * `error` : bulle locale (erreur réseau, surcharge) — affichée mais JAMAIS
 * renvoyée au modèle : avant, le message « service indisponible » repartait
 * dans l'historique comme un vrai tour de l'assistant et polluait la suite.
 */
type Message = { role: 'user' | 'assistant'; content: string; error?: boolean; cards?: ChatCard[]; offer?: ChatOffer; at?: number };

const CLOSING_PHRASE_RE = /avez.vous encore besoin de moi/i;
const USER_NO_RE = /^(non|non\s*merci|pas\s*besoin|c[''`]?est\s*(bon|tout)|ça\s*va|ok\s*merci|merci\s*c[''`]?est\s*tout|tout\s*va\s*bien)\s*[.!?]?\s*$/i;

const STORAGE_KEY = 'peg_chat_widget_v2';
const SUGGESTIONS = [
  { icon: '📦', label: 'Où en est ma commande ?' },
  { icon: '🔎', label: 'Je cherche un produit' },
  { icon: '🧾', label: 'Ai-je des factures à payer ?' },
  { icon: '✅', label: 'Un BAT à valider ?' },
];

const fmtTime = (at: number): string => {
  try { return new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

/**
 * Le bouton flottant est en position fixed en bas à droite. Sur les écrans du
 * tunnel de commande il recouvre les contrôles qui s'y trouvent — constaté sur
 * la fiche produit, où il chevauchait le « + » de la première ligne de tailles.
 * On ne l'affiche donc pas pendant une commande en cours.
 *
 * ⚠️ Ce widget est le SEUL accès client au chatbot (la seule route chatbot,
 * /admin/chatbot, est réservée aux admins). Ne pas le retirer partout sans
 * décision produit explicite : ce serait supprimer la fonctionnalité.
 */
const FUNNEL_ROUTES = ['/customer/product', '/customer/cart', '/customer/payment'];

/**
 * Téléphone (< md) : petit bouton dans l'EN-TÊTE, à gauche du panier (demande du
 * 25/09/2026) — un bouton flottant recouvrait les contrôles de la page. Il y
 * reste EN PERMANENCE et pulse sans arrêt (demande du même jour : l'ancien cycle
 * « 7 s visible toutes les 30 s » le faisait disparaître). « Réduire les
 * animations » : une lueur qui pulse doucement remplace le battement.
 * L'en-tête (ModernLayout) fournit l'emplacement HEADER_SLOT_ID ; sans lui (autre
 * mise en page), repli sur le bouton flottant en bas à droite.
 */
const HEADER_SLOT_ID = 'peg-chat-header-slot';

const newConversationId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* contexte non sécurisé */ }
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

// Conversation conservée pour l'onglet (sessionStorage) : un rechargement de page
// ne fait plus perdre l'échange en cours. Lecture/écriture protégées (navigation
// privée, stockage bloqué).
// La clé inclut l'utilisateur : après un changement de compte dans le même
// onglet, l'échange du compte précédent ne doit jamais réapparaître.
const storageKeyFor = (userKey: string) => `${STORAGE_KEY}:${userKey}`;
const loadSaved = (key: string): { conversationId: string; messages: Message[] } | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.conversationId !== 'string' || !Array.isArray(parsed?.messages)) return null;
    const messages = (parsed.messages as unknown[])
      .filter((m): m is Message => {
        const x = m as Partial<Message> | null;
        return !!x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string';
      })
      .map((m) => (m.offer && !isChatOffer(m.offer) ? { ...m, offer: undefined } : m))
      .slice(-40);
    return { conversationId: parsed.conversationId, messages };
  } catch {
    return null;
  }
};
const saveConversation = (key: string, conversationId: string, messages: Message[]) => {
  try { sessionStorage.setItem(key, JSON.stringify({ conversationId, messages: messages.slice(-40) })); } catch { /* ignoré */ }
};

// ── Transport ────────────────────────────────────────────────────────────────

type ChatResult = { reply: string; authenticated?: boolean; rateLimited?: boolean; cards?: ChatCard[]; offer?: unknown };
type StreamHandlers = { onStatus: (label: string) => void; onDelta: (text: string) => void; onCards: (cards: ChatCard[]) => void };

class StreamUnavailableError extends Error {}

/**
 * Réponse en flux SSE (POST /chatbot/chat/stream) : le texte s'affiche au fil de
 * l'eau et l'outil en cours est annoncé (« Consultation de vos factures… »).
 * Lève StreamUnavailableError si la route n'existe pas encore (backend pas
 * redéployé) ou si le flux est coupé avant tout contenu : l'appelant retombe
 * alors sur la route JSON historique.
 */
const chatStream = async (body: object, token: string | null, signal: AbortSignal, h: StreamHandlers): Promise<ChatResult> => {
  let res: Response;
  try {
    res = await fetch(`${EXPRESS_BACKEND_URL}/chatbot/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    // Annulation volontaire : on la propage telle quelle. Toute autre erreur
    // (réseau, CORS, proxy qui refuse le flux) → repli sur la route JSON.
    if (signal.aborted) throw e;
    throw new StreamUnavailableError('fetch stream');
  }
  if (res.status === 429) {
    return { reply: 'Beaucoup de demandes en ce moment : réessayez dans quelques secondes.', rateLimited: true };
  }
  if (!res.ok || !res.body || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
    throw new StreamUnavailableError(`stream ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let received = false;
  let done: ChatResult | null = null;
  let streamedText = '';

  type StreamData = { label?: string; text?: string; message?: string } & Partial<ChatResult>;
  let lastCards: ChatCard[] = [];
  const handleEvent = (event: string, data: StreamData) => {
    if (event === 'status' && data?.label) { received = true; h.onStatus(String(data.label)); }
    else if (event === 'delta' && typeof data?.text === 'string') { received = true; streamedText += data.text; h.onDelta(data.text); }
    else if (event === 'cards' && Array.isArray(data?.cards)) { lastCards = data.cards; h.onCards(data.cards); }
    else if (event === 'done') { received = true; done = { reply: data.reply ?? '', authenticated: data.authenticated, rateLimited: data.rateLimited, cards: Array.isArray(data.cards) ? data.cards : undefined, offer: data.offer }; }
    else if (event === 'error') { throw new Error(data?.message || 'stream error'); }
  };

  for (;;) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      const dataLines: string[] = [];
      for (const l of rawEvent.split('\n')) {
        if (l.startsWith(':')) continue; // battement de cœur
        if (l.startsWith('event:')) event = l.slice(6).trim();
        else if (l.startsWith('data:')) dataLines.push(l.slice(5).trim());
      }
      if (!dataLines.length) continue;
      let data: StreamData;
      try { data = JSON.parse(dataLines.join('\n')) as StreamData; } catch { continue; }
      handleEvent(event, data);
    }
  }
  if (done) return done;
  if (!received) throw new StreamUnavailableError('flux vide');
  // Flux coupé après du contenu : on garde ce qui a été reçu.
  return { reply: streamedText, cards: lastCards };
};

const chatJson = async (body: object, token: string | null, signal: AbortSignal): Promise<ChatResult> => {
  const res = await axios.post(`${EXPRESS_BACKEND_URL}/chatbot/chat`, body, {
    signal,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  return res.data as ChatResult;
};

// ── Apparence de la conversation ─────────────────────────────────────────────
// Classes préfixées `pcw-` (portée : la fenêtre du chat). Style « messagerie » :
// bulles regroupées par auteur, dégradé bleu→violet pour le client, surface
// translucide pour l'assistant, en-tête vitré, zone de saisie en pilule.
const CHAT_CSS = `
.pcw {
  --pcw-bg: #0b1120; --pcw-surface: rgba(255,255,255,0.055); --pcw-border: rgba(255,255,255,0.08);
  --pcw-text: rgba(255,255,255,0.92); --pcw-muted: rgba(255,255,255,0.55);
  --pcw-a1: #4f7cff; --pcw-a2: #7c5cff;
  color: var(--pcw-text); font-family: Inter, system-ui, -apple-system, sans-serif;
  background:
    radial-gradient(120% 55% at 100% 0%, rgba(124,92,255,0.16), transparent 60%),
    radial-gradient(100% 45% at 0% 0%, rgba(79,124,255,0.13), transparent 60%),
    var(--pcw-bg);
}
.pcw--desk { transform-origin: bottom right; animation: pcw-open .22s cubic-bezier(.2,.8,.2,1); }
.pcw--phone { animation: pcw-slide .26s cubic-bezier(.2,.8,.2,1); }
@keyframes pcw-open { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes pcw-slide { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }

.pcw-head { display: flex; align-items: center; gap: 12px; padding: 14px 10px 12px 16px;
  border-bottom: 1px solid var(--pcw-border); background: rgba(11,17,32,0.55);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.pcw-avatar-wrap { position: relative; flex-shrink: 0; }
.pcw-avatar { border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--pcw-a1), var(--pcw-a2)); }
.pcw-head .pcw-avatar { box-shadow: 0 6px 18px rgba(92,108,255,0.35); }
.pcw-online { position: absolute; right: -1px; bottom: -1px; width: 12px; height: 12px; border-radius: 50%;
  background: #22c55e; border: 2px solid var(--pcw-bg); }
.pcw-title { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
.pcw-sub { font-size: 12px; color: var(--pcw-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
.pcw-icon-btn { width: 38px; height: 38px; border-radius: 50%; border: none; background: transparent; flex-shrink: 0;
  color: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: background .15s, color .15s; }
.pcw-icon-btn:hover, .pcw-icon-btn:focus-visible { background: rgba(255,255,255,0.08); color: #fff; outline: none; }

.pcw-log { flex: 1; overflow-y: auto; padding: 18px 14px 10px; display: flex; flex-direction: column;
  overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }
.pcw-msg { display: flex; flex-direction: column; }
.pcw-row { display: flex; align-items: flex-end; gap: 8px; margin-top: 3px; animation: pcw-in .22s ease-out both; }
.pcw-row--group { margin-top: 14px; }
.pcw-msg:first-child .pcw-row { margin-top: 0; }
.pcw-row--user { justify-content: flex-end; }
@keyframes pcw-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.pcw-avatar-slot { width: 28px; flex-shrink: 0; }

.pcw-bubble { max-width: 82%; min-width: 0; padding: 10px 14px; border-radius: 20px;
  font-size: 14px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
.pcw-bubble--bot { background: var(--pcw-surface); border: 1px solid var(--pcw-border); color: var(--pcw-text); }
.pcw-bubble--bot.pcw-tail { border-bottom-left-radius: 6px; }
.pcw-bubble--user { color: #fff; background: linear-gradient(135deg, var(--pcw-a1), var(--pcw-a2));
  box-shadow: 0 6px 16px rgba(92,108,255,0.28); }
.pcw-bubble--user.pcw-tail { border-bottom-right-radius: 6px; }
.pcw-bubble--error { background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.28); color: #fcd34d; }
.pcw-bubble--error.pcw-tail { border-bottom-left-radius: 6px; }
.pcw-time { font-size: 10.5px; color: rgba(255,255,255,0.38); margin: 5px 0 0 38px; }
.pcw-time--user { align-self: flex-end; margin: 5px 4px 0 0; }

.pcw-typing-bubble { display: inline-flex; align-items: center; padding: 12px 14px; }
.pcw-typing { display: inline-flex; align-items: center; gap: 4px; }
.pcw-typing i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.65);
  animation: pcw-bounce 1.2s infinite ease-in-out; }
.pcw-typing i:nth-child(2) { animation-delay: .15s; }
.pcw-typing i:nth-child(3) { animation-delay: .3s; }
@keyframes pcw-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .4; } 30% { transform: translateY(-4px); opacity: 1; } }
.pcw-status { font-size: 12px; color: var(--pcw-muted); margin-left: 10px; }

.pcw-empty { margin: auto 0; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 8px 2px 4px; }
.pcw-hero .pcw-avatar { box-shadow: 0 0 0 7px rgba(124,92,255,0.12), 0 14px 34px rgba(92,108,255,0.38); }
.pcw-hello { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.015em; margin-top: 12px; }
.pcw-intro { font-size: 13.5px; line-height: 1.5; color: var(--pcw-muted); max-width: 290px; }
.pcw-sugg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; margin-top: 14px; }
.pcw-chip { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; text-align: left; padding: 12px;
  border-radius: 16px; background: var(--pcw-surface); border: 1px solid var(--pcw-border); color: var(--pcw-text);
  font: inherit; font-size: 13px; font-weight: 600; line-height: 1.35; cursor: pointer;
  transition: transform .15s, background .15s, border-color .15s; }
.pcw-chip:hover, .pcw-chip:focus-visible { background: rgba(255,255,255,0.09); border-color: rgba(124,92,255,0.45); transform: translateY(-1px); outline: none; }
.pcw-chip-ico { font-size: 18px; line-height: 1; }

.pcw-retry { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 999px; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 600; color: #fcd34d; background: rgba(245,158,11,0.14); border: 1px solid rgba(245,158,11,0.35); }
.pcw-warn { margin: 0 12px 4px; padding: 8px 12px; border-radius: 12px; font-size: 12px; line-height: 1.4;
  color: #fcd34d; background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.25); }

.pcw-compose { padding: 10px 12px 14px; }
.pcw-field { display: flex; align-items: flex-end; gap: 8px; padding: 5px 5px 5px 16px; border-radius: 26px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); transition: border-color .15s, box-shadow .15s; }
.pcw-field:focus-within { border-color: rgba(124,92,255,0.6); box-shadow: 0 0 0 4px rgba(124,92,255,0.15); }
.pcw-field textarea { flex: 1; min-width: 0; background: transparent; border: none; outline: none; resize: none;
  color: #fff; font: inherit; font-size: 14px; line-height: 1.45; padding: 9px 0; max-height: 120px; overflow-y: auto; }
.pcw-field textarea::placeholder { color: rgba(255,255,255,0.4); }
.pcw-send { width: 40px; height: 40px; border-radius: 50%; border: none; flex-shrink: 0; cursor: pointer; color: #fff;
  display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--pcw-a1), var(--pcw-a2));
  box-shadow: 0 6px 16px rgba(92,108,255,0.35); transition: transform .15s, opacity .15s, box-shadow .15s; }
.pcw-send:disabled { opacity: .35; cursor: not-allowed; box-shadow: none; }
.pcw-send:not(:disabled):hover { transform: scale(1.06); }

.pcw--phone .pcw-bubble { font-size: 15px; }
.pcw--phone .pcw-log { padding: 18px 12px 10px; }
@media (prefers-reduced-motion: reduce) {
  .pcw, .pcw-row, .pcw-typing i { animation: none !important; }
}
`;

// ── Composant ────────────────────────────────────────────────────────────────

const ChatWidget = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { smaller } = useResponsive();
  const user = useAppSelector((state) => state.auth.user.user);
  const sessionToken = useAppSelector((state) => state.auth.session.token);
  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Client';
  const storageKey = storageKeyFor(String(user?.documentId || user?.id || 'anon'));
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => loadSaved(storageKey)?.messages ?? []);
  const [conversationId, setConversationId] = useState<string>(() => loadSaved(storageKey)?.conversationId ?? newConversationId());
  const loadedKeyRef = useRef(storageKey);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streamingCards, setStreamingCards] = useState<ChatCard[]>([]);
  const [unread, setUnread] = useState(0);
  const [awaitingClose, setAwaitingClose] = useState(false);
  const [authWarn, setAuthWarn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Le backend interroge les vraies données PEG en direct (catalogue, projets,
  // commandes, compte) via ses outils, en identifiant le client par son JWT.

  // Changement de compte sans démontage : on bascule sur la conversation du nouveau compte.
  useEffect(() => {
    if (loadedKeyRef.current === storageKey) return;
    loadedKeyRef.current = storageKey;
    abortRef.current?.abort();
    const next = loadSaved(storageKey);
    setMessages(next?.messages ?? []);
    setConversationId(next?.conversationId ?? newConversationId());
    setAwaitingClose(false);
    setAuthWarn(false);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKeyRef.current === storageKey) saveConversation(storageKey, conversationId, messages);
  }, [storageKey, conversationId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingText, statusLabel]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  // Annule une requête en cours si le widget est démonté (changement de layout).
  useEffect(() => () => abortRef.current?.abort(), []);

  const resetConversation = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setAwaitingClose(false);
    setStreamingText('');
    setStatusLabel(null);
    setLoading(false);
    setConversationId(newConversationId());
  }, []);

  /** Envoie l'historique (sans les bulles d'erreur locales) et ajoute la réponse. */
  const requestReply = async (history: Message[], isClosing: boolean) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setStatusLabel(null);
    setStreamingText('');
    setStreamingCards([]);
    const token = sessionToken || getPersistedAuthToken();
    const body = {
      messages: history.filter((m) => !m.error).map(({ role, content }) => ({ role, content })),
      userName,
      origin: window.location.origin,
      conversationId,
    };
    try {
      let result: ChatResult;
      try {
        result = await chatStream(body, token, controller.signal, {
          onStatus: (label) => setStatusLabel(label),
          onDelta: (text) => { setStatusLabel(null); setStreamingText((prev) => prev + text); },
          onCards: setStreamingCards,
        });
      } catch (e) {
        if (!(e instanceof StreamUnavailableError)) throw e;
        setStreamingText('');
        result = await chatJson(body, token, controller.signal);
      }
      if (controller.signal.aborted) return;
      const reply = (result.reply || '').trim();
      if (result.rateLimited || !reply) {
        setMessages([...history, { role: 'assistant', content: reply || 'Aucune réponse reçue.', error: true, at: Date.now() }]);
      } else {
        // Seules les cartes citées dans la réponse sont conservées (le serveur les filtre ; la route
        // JSON d'un backend antérieur n'en renvoie pas → liens simples).
        const cards = (result.cards || []).filter((c) => reply.includes(`](${c.url})`));
        // Offre chiffrée → bouton « Ajouter au panier » sous la réponse.
        const offer = isChatOffer(result.offer) ? result.offer : undefined;
        setMessages([...history, { role: 'assistant', content: reply, at: Date.now(), ...(cards.length ? { cards } : {}), ...(offer ? { offer } : {}) }]);
        // Token envoyé mais backend n'a pas pu identifier le client → session expirée.
        setAuthWarn(Boolean(token) && result.authenticated === false);
        if (CLOSING_PHRASE_RE.test(reply)) setAwaitingClose(true);
        if (isClosing) setTimeout(() => { setOpen(false); resetConversation(); }, 2500);
      }
      if (!openRef.current) setUnread((n) => n + 1);
    } catch (e: unknown) {
      const err = e as { name?: string; response?: { status?: number } };
      if (controller.signal.aborted || err?.name === 'AbortError' || err?.name === 'CanceledError') return;
      const status = err?.response?.status;
      const content = status === 429
        ? 'Beaucoup de demandes en ce moment : réessayez dans quelques secondes.'
        : !navigator.onLine
          ? 'Vous semblez hors ligne. Vérifiez votre connexion puis réessayez.'
          : 'Le service est momentanément indisponible. Réessayez dans un instant.';
      setMessages([...history, { role: 'assistant', content, error: true, at: Date.now() }]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setStatusLabel(null);
      setStreamingText('');
      setStreamingCards([]);
    }
  };

  const sendText = async (raw: string) => {
    const text = (raw || '').trim();
    if (!text || loading) return;
    // Si le bot attend une réponse de clôture et l'utilisateur dit non → fermer après réponse
    const isClosing = awaitingClose && USER_NO_RE.test(text);
    // Les bulles d'erreur précédentes disparaissent dès qu'on renvoie un message.
    const next: Message[] = [...messages.filter((m) => !m.error), { role: 'user', content: text, at: Date.now() }];
    setMessages(next);
    setInput('');
    await requestReply(next, isClosing);
  };

  /** Réessaie la dernière question après une erreur, sans la ressaisir. */
  const retryLast = () => {
    if (loading) return;
    const history = messages.filter((m) => !m.error);
    if (!history.length || history[history.length - 1].role !== 'user') return;
    setMessages(history);
    requestReply(history, false);
  };

  const send = () => sendText(input);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === 'Escape') setOpen(false);
  };

  // Focus le champ à l'ouverture (accessibilité clavier).
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  // À l'ouverture, on arrive sur le DERNIER message (la conversation est conservée
  // pour l'onglet : sans ça, on retombait sur son début).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Zone de saisie qui s'agrandit avec le texte (jusqu'à 5 lignes environ).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input, open]);

  const isPhone = smaller.md;

  // Téléphone, chat ouvert : plein écran calé sur la zone VISIBLE (visualViewport),
  // pour que le champ de saisie reste au-dessus du clavier, et page figée derrière.
  const [viewport, setViewport] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    if (!isPhone || !open) return;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const update = () => setViewport(vv ? { height: vv.height, top: vv.offsetTop } : null);
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      document.body.style.overflow = previousOverflow;
    };
  }, [isPhone, open]);

  // Emplacement du bouton dans l'en-tête du téléphone. L'en-tête peut se monter
  // après ce composant (ou être remplacé) : on le suit jusqu'à le trouver.
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!isPhone) { setHeaderSlot(null); return; }
    const find = () => {
      const el = document.getElementById(HEADER_SLOT_ID);
      setHeaderSlot((prev) => (prev === el ? prev : el));
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isPhone]);
  const inHeader = isPhone && !!headerSlot;

  // Masqué aussi pendant une commande sur grand écran : le bouton recouvrait
  // les actions de ligne du panier et le lien « Voir tout » du tableau de bord.
  // Sauf si la conversation est OUVERTE : un clic sur une carte produit mène à
  // /customer/product/… et faisait disparaître le chat au milieu de l'échange.
  // Une fois refermé, le bouton s'efface comme avant.
  // Dans l'en-tête du téléphone, le bouton ne recouvre rien : il reste disponible
  // pendant la commande aussi.
  if (!inHeader && !open && FUNNEL_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const lastIsError = messages.length > 0 && messages[messages.length - 1].error;

  /** Met à jour l'état du bouton panier d'un message (conservé avec la conversation). */
  const updateOffer = (index: number, offer: ChatOffer) =>
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, offer } : m)));

  // Le panier et la fiche produit sont sous la fenêtre du chat (en bas à droite,
  // là où se trouvent « Ajouter au panier » et « Payer ») : on la referme.
  const goFromOffer = (path: string, state?: ChatNavState) => {
    setOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  // Une carte interne navigue dans l'application sans recharger. Carte PRODUIT dont
  // la conversation contient une offre (« 10 bonnets noirs ») : la fiche s'ouvre
  // pré-remplie — quantité, tailles, couleurs — avec l'offre la plus récente pour ce
  // produit, et le chat se referme (il recouvrait les boutons de la fiche).
  const navigateFromChat = (path: string) => {
    const productId = /^\/customer\/product\/([^/?#]+)/.exec(path)?.[1];
    if (productId) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const offer = messages[i].offer;
        const prefill = offer ? prefillForProduct(offer, productId) : null;
        if (prefill) { goFromOffer(path, { chatOffer: prefill }); return; }
      }
    }
    navigate(path);
  };
  const renderContent = (content: string, cards?: ChatCard[]) => renderChatMarkdown(content, { cards, onNavigate: navigateFromChat });

  const botAvatar = (size: number) => (
    <div className="pcw-avatar" style={{ width: size, height: size }} aria-hidden="true">
      <MdAutoAwesome size={Math.round(size * 0.5)} color="#fff" />
    </div>
  );
  const firstName = userName.split(' ')[0] || '';

  return (
    <div style={{
      position: 'fixed',
      // Téléphone : au-dessus de la barre d'onglets, du bouton « retour en haut »
      // et du bandeau « Installer MyPEG » de l'accueil (82px de haut avec sa marge).
      bottom: isPhone
        ? 'calc(96px + var(--peg-safe-bottom, 0px) + var(--peg-dock-lift, 0px))'
        : 'calc(90px + var(--peg-safe-bottom, 0px) + var(--peg-dock-lift, 0px))',
      right: isPhone ? '16px' : '24px',
      zIndex: 9999,
      fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @keyframes peg-chat-pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(92,108,255,0.45); }
          50% { box-shadow: 0 8px 32px rgba(92,108,255,0.7), 0 0 0 9px rgba(124,92,255,0.14); }
        }
        @keyframes peg-chat-pop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes peg-chat-halo {
          0% { box-shadow: 0 0 0 0 rgba(124,92,255,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(124,92,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(124,92,255,0); }
        }
        @keyframes peg-chat-glow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(124,92,255,0.25); }
          50% { box-shadow: 0 0 14px 3px rgba(124,92,255,0.65); }
        }
        @media (prefers-reduced-motion: reduce) {
          .peg-chat-anim { animation: none !important; }
          /* Pas de battement ni d'anneau qui s'étend : une lueur qui pulse sur place */
          .peg-chat-glow { animation: peg-chat-glow 1.8s ease-in-out infinite !important; }
        }
        ${CHAT_CSS}
      `}</style>
      {/* Fenêtre de chat */}
      {open && (
        <div role="dialog" aria-label="Assistant PEG" className={`pcw ${isPhone ? 'pcw--phone' : 'pcw--desk'}`} style={{
          ...(isPhone
            ? {
                // Plein écran : une fenêtre de 400px flottante n'a pas de sens sur un
                // téléphone, et la barre d'onglets passerait sur le champ de saisie.
                position: 'fixed',
                left: 0,
                right: 0,
                top: viewport ? `${viewport.top}px` : 0,
                height: viewport ? `${viewport.height}px` : '100dvh',
                width: '100vw',
                borderRadius: 0,
                border: 'none',
                paddingTop: 'env(safe-area-inset-top, 0px)',
                boxSizing: 'border-box',
              }
            : {
                position: 'absolute',
                bottom: '72px',
                right: 0,
                width: 'min(400px, calc(100vw - 32px))',
                height: 'min(620px, calc(100dvh - 140px))',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '24px',
                boxShadow: '0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.2)',
              }),
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* En-tête */}
          <div className="pcw-head">
            <div className="pcw-avatar-wrap">
              {botAvatar(40)}
              <span className="pcw-online" aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pcw-title">Assistant PEG</div>
              <div className="pcw-sub" aria-live="polite">
                {loading ? (statusLabel || 'Écrit…') : 'En ligne'}
              </div>
            </div>
            {messages.length > 0 && (
              <button type="button" className="pcw-icon-btn" onClick={resetConversation} aria-label="Nouvelle conversation" title="Nouvelle conversation">
                <MdAddComment size={19} />
              </button>
            )}
            <button type="button" className="pcw-icon-btn" onClick={() => setOpen(false)} aria-label="Fermer le chat" title="Fermer">
              {isPhone ? <MdKeyboardArrowDown size={26} /> : <MdClose size={20} />}
            </button>
          </div>

          {/* Messages */}
          <div role="log" aria-live="polite" aria-label="Conversation" className="pcw-log">
            {messages.length === 0 && !loading && (
              <div className="pcw-empty">
                <div className="pcw-hero">{botAvatar(60)}</div>
                <div className="pcw-hello">Bonjour {firstName} 👋</div>
                <div className="pcw-intro">Commandes, produits, factures, devis… Posez votre question, je vous réponds tout de suite.</div>
                {/* Suggestions rapides — envoi direct au clic */}
                <div className="pcw-sugg">
                  {SUGGESTIONS.map((q) => (
                    <button key={q.label} type="button" className="pcw-chip" onClick={() => sendText(q.label)}>
                      <span className="pcw-chip-ico" aria-hidden="true">{q.icon}</span>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const prev = messages[i - 1];
              const next = messages[i + 1];
              // Messages regroupés par auteur : l'avatar, la « queue » de la bulle et
              // l'heure ne figurent que sur le dernier message du groupe.
              const firstOfGroup = !prev || prev.role !== msg.role;
              const lastOfGroup = !next || next.role !== msg.role;
              const tone = isUser ? 'pcw-bubble--user' : msg.error ? 'pcw-bubble--error' : 'pcw-bubble--bot';
              return (
                <div key={i} className="pcw-msg">
                  <div className={`pcw-row${firstOfGroup ? ' pcw-row--group' : ''}${isUser ? ' pcw-row--user' : ''}`}>
                    {!isUser && <div className="pcw-avatar-slot">{lastOfGroup && botAvatar(28)}</div>}
                    <div className={`pcw-bubble ${tone}${lastOfGroup ? ' pcw-tail' : ''}`}>
                      {msg.role === 'assistant' && !msg.error ? renderContent(msg.content, msg.cards) : msg.content}
                      {msg.role === 'assistant' && !msg.error && msg.offer && (
                        <ChatOfferAction offer={msg.offer} onChange={(o) => updateOffer(i, o)} onGo={goFromOffer} />
                      )}
                      {msg.error && i === messages.length - 1 && (
                        <div style={{ marginTop: '8px' }}>
                          <button type="button" className="pcw-retry" onClick={retryLast} disabled={loading}>
                            <MdRefresh size={14} /> Réessayer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {lastOfGroup && msg.at && (
                    <div className={`pcw-time${isUser ? ' pcw-time--user' : ''}`}>{fmtTime(msg.at)}</div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="pcw-msg">
                <div className="pcw-row pcw-row--group">
                  <div className="pcw-avatar-slot">{botAvatar(28)}</div>
                  {streamingText ? (
                    <div className="pcw-bubble pcw-bubble--bot pcw-tail">{renderContent(streamingText, streamingCards)}</div>
                  ) : (
                    <div className="pcw-bubble pcw-bubble--bot pcw-tail pcw-typing-bubble">
                      <span className="pcw-typing" aria-hidden="true"><i /><i /><i /></span>
                      {statusLabel && <span className="pcw-status">{statusLabel}</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Bandeau session expirée */}
          {authWarn && (
            <div className="pcw-warn">
              Mode limité : reconnectez-vous pour accéder à vos données (offres, projets, factures).
            </div>
          )}

          {/* Saisie */}
          <div className="pcw-compose" style={{
            // Téléphone : au-dessus de la barre d'accueil de l'iPhone.
            paddingBottom: isPhone ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : '14px',
          }}>
            <div className="pcw-field">
              <textarea
                ref={inputRef}
                aria-label="Votre message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={lastIsError ? 'Réessayez ou reformulez…' : 'Écrivez votre message…'}
                rows={1}
                maxLength={2000}
              />
              <button type="button" className="pcw-send" onClick={send} disabled={loading || !input.trim()} aria-label="Envoyer">
                <MdSend size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Téléphone : petit bouton dans l'en-tête, à gauche du panier — toujours là,
          pulsation permanente (halo + battement). */}
      {inHeader && headerSlot && createPortal(
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            width: '40px',
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le chat assistant"
            title="Une question ? Assistant PEG"
            className="peg-chat-anim peg-chat-glow"
            style={{
              width: '32px', height: '32px', padding: 0, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #4f7cff, #7c5cff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0,
              animation: 'peg-chat-halo 1.4s ease-out infinite',
            }}
          >
            <span className="peg-chat-anim" style={{ display: 'flex', animation: 'peg-chat-pop 1.4s ease-in-out infinite' }}>
              <MdChatBubble size={16} color="#fff" />
            </span>
            {unread > 0 && (
              <span aria-label={`${unread} réponse${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}`} style={{
                position: 'absolute', top: '-2px', right: '-2px', width: '11px', height: '11px',
                borderRadius: '50%', background: '#22c55e', border: '2px solid #0b0f14',
              }} />
            )}
          </button>
        </span>,
        headerSlot,
      )}

      {/* Bouton flottant (ordinateur, ou téléphone sans emplacement d'en-tête) —
          sur téléphone, masqué pendant que le chat occupe l'écran. */}
      {!inHeader && !(isPhone && open) && (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
      {isPhone && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          tabIndex={-1}
          style={{
            position: 'absolute', right: '64px', whiteSpace: 'nowrap',
            padding: '8px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(15,28,46,0.92)', color: '#fff', fontSize: '12.5px', fontWeight: 600,
            fontFamily: 'inherit', boxShadow: '0 6px 20px rgba(0,0,0,0.35)', cursor: 'pointer',
          }}
        >
          {unread > 0 ? 'Nouvelle réponse' : 'Une question ?'}
        </button>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer le chat' : 'Ouvrir le chat assistant'}
        aria-expanded={open}
        className="peg-chat-anim"
        style={{
          width: '56px',
          height: '56px',
          // Même langage visuel que la fenêtre : rond, dégradé bleu→violet.
          borderRadius: '50%',
          background: open ? 'rgba(15,23,42,0.92)' : 'linear-gradient(135deg, #4f7cff, #7c5cff)',
          border: open ? '1px solid rgba(255,255,255,0.14)' : 'none',
          boxShadow: open ? '0 10px 28px rgba(0,0,0,0.45)' : undefined,
          // Téléphone : pulsation plus marquée (halo + battement).
          animation: open ? 'none' : isPhone
            ? 'peg-chat-pulse 1.25s ease-in-out infinite, peg-chat-pop 1.25s ease-in-out infinite'
            : 'peg-chat-pulse 2.2s ease-in-out infinite',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        {open ? <MdClose size={24} color="#fff" /> : <MdChatBubble size={24} color="#fff" />}
        {unread > 0 && !open && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '18px',
            height: '18px',
            background: '#ef4444',
            borderRadius: '50%',
            fontSize: '10px',
            fontWeight: 700,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unread}
          </span>
        )}
      </button>
      </div>
      )}
    </div>
  );
};

export default ChatWidget;
