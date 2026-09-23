import { useState, useRef, useEffect, useCallback } from 'react';
import { MdSmartToy, MdSend, MdClose, MdChatBubble, MdRefresh, MdAddComment } from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import useResponsive from '@/utils/hooks/useResponsive';
import { useAppSelector } from '@/store';
import axios from 'axios';
import { EXPRESS_BACKEND_URL } from '@/configs/api.config';
import { getPersistedAuthToken } from '@/store/tabSessionStorage';
import { renderChatMarkdown as renderContent } from '@/utils/chatMarkdown';

/**
 * `error` : bulle locale (erreur réseau, surcharge) — affichée mais JAMAIS
 * renvoyée au modèle : avant, le message « service indisponible » repartait
 * dans l'historique comme un vrai tour de l'assistant et polluait la suite.
 */
type Message = { role: 'user' | 'assistant'; content: string; error?: boolean };

const CLOSING_PHRASE_RE = /avez.vous encore besoin de moi/i;
const USER_NO_RE = /^(non|non\s*merci|pas\s*besoin|c[''`]?est\s*(bon|tout)|ça\s*va|ok\s*merci|merci\s*c[''`]?est\s*tout|tout\s*va\s*bien)\s*[.!?]?\s*$/i;

const STORAGE_KEY = 'peg_chat_widget_v2';
const SUGGESTIONS = ['Prépare-moi une offre', 'Où en sont mes projets ?', 'Ai-je des factures à payer ?', 'Un BAT à valider ?'];

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

type ChatResult = { reply: string; authenticated?: boolean; rateLimited?: boolean };
type StreamHandlers = { onStatus: (label: string) => void; onDelta: (text: string) => void };

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
  const handleEvent = (event: string, data: StreamData) => {
    if (event === 'status' && data?.label) { received = true; h.onStatus(String(data.label)); }
    else if (event === 'delta' && typeof data?.text === 'string') { received = true; streamedText += data.text; h.onDelta(data.text); }
    else if (event === 'done') { received = true; done = { reply: data.reply ?? '', authenticated: data.authenticated, rateLimited: data.rateLimited }; }
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
  return { reply: streamedText };
};

const chatJson = async (body: object, token: string | null, signal: AbortSignal): Promise<ChatResult> => {
  const res = await axios.post(`${EXPRESS_BACKEND_URL}/chatbot/chat`, body, {
    signal,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  return res.data as ChatResult;
};

// ── Composant ────────────────────────────────────────────────────────────────

const ChatWidget = () => {
  const { pathname } = useLocation();
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
        });
      } catch (e) {
        if (!(e instanceof StreamUnavailableError)) throw e;
        setStreamingText('');
        result = await chatJson(body, token, controller.signal);
      }
      if (controller.signal.aborted) return;
      const reply = (result.reply || '').trim();
      if (result.rateLimited || !reply) {
        setMessages([...history, { role: 'assistant', content: reply || 'Aucune réponse reçue.', error: true }]);
      } else {
        setMessages([...history, { role: 'assistant', content: reply }]);
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
      setMessages([...history, { role: 'assistant', content, error: true }]);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      setStatusLabel(null);
      setStreamingText('');
    }
  };

  const sendText = async (raw: string) => {
    const text = (raw || '').trim();
    if (!text || loading) return;
    // Si le bot attend une réponse de clôture et l'utilisateur dit non → fermer après réponse
    const isClosing = awaitingClose && USER_NO_RE.test(text);
    // Les bulles d'erreur précédentes disparaissent dès qu'on renvoie un message.
    const next: Message[] = [...messages.filter((m) => !m.error), { role: 'user', content: text }];
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

  // Masqué sur TÉLÉPHONE (< md) : sur un écran étroit, un bouton flottant de
  // 56px recouvre en permanence une partie du contenu — il chevauchait le « + »
  // de la première ligne de tailles. Le chatbot reste accessible sur ordinateur.
  if (smaller.md) return null;

  // Masqué aussi pendant une commande sur grand écran : le bouton recouvrait
  // les actions de ligne du panier et le lien « Voir tout » du tableau de bord.
  if (FUNNEL_ROUTES.some((r) => pathname.startsWith(r))) return null;

  const lastIsError = messages.length > 0 && messages[messages.length - 1].error;

  const botAvatar = (
    <div style={{
      width: '24px', height: '24px', borderRadius: '6px',
      background: 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginRight: '6px', marginTop: '2px',
    }}>
      <MdSmartToy size={14} color="#fff" />
    </div>
  );

  const bubble = (role: 'user' | 'assistant', error?: boolean): React.CSSProperties => ({
    maxWidth: '80%',
    minWidth: 0,
    background: role === 'user'
      ? 'linear-gradient(135deg, rgba(47,111,237,0.35), rgba(47,111,237,0.2))'
      : error ? 'rgba(234,179,8,0.10)' : 'rgba(255,255,255,0.07)',
    border: `1px solid ${role === 'user' ? 'rgba(47,111,237,0.4)' : error ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    padding: '9px 13px',
    color: error ? '#fcd34d' : 'rgba(255,255,255,0.9)',
    fontSize: '13px',
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  });

  return (
    <div style={{ position: 'fixed', bottom: 'calc(90px + var(--peg-safe-bottom, 0px))', right: '24px', zIndex: 9999, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes peg-chat-pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(239,68,68,0.45); }
          50% { box-shadow: 0 8px 32px rgba(239,68,68,0.75), 0 0 0 8px rgba(239,68,68,0.12); }
        }
        @keyframes peg-chat-dot { 0%, 80%, 100% { opacity: .25 } 40% { opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { .peg-chat-anim { animation: none !important; } }
      `}</style>
      {/* Fenêtre de chat */}
      {open && (
        <div role="dialog" aria-label="Assistant PEG" style={{
          position: 'absolute',
          bottom: '72px',
          right: 0,
          width: 'min(380px, calc(100vw - 32px))',
          height: 'min(540px, calc(100dvh - 140px))',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(47,111,237,0.3), rgba(47,111,237,0.1))',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MdSmartToy size={20} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Assistant PEG</div>
              <div aria-live="polite" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {loading ? (statusLabel || 'En train d\'écrire...') : 'En ligne'}
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={resetConversation}
                aria-label="Nouvelle conversation"
                title="Nouvelle conversation"
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
              >
                <MdAddComment size={18} />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer le chat"
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
            >
              <MdClose size={18} />
            </button>
          </div>

          {/* Messages */}
          <div role="log" aria-live="polite" aria-label="Conversation" style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && !loading && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: '12px',
                color: 'rgba(255,255,255,0.55)',
              }}>
                <MdSmartToy size={40} />
                <div style={{ textAlign: 'center', fontSize: '13px', lineHeight: 1.5 }}>
                  Bonjour {userName.split(' ')[0] || ''} ! 👋<br />
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
                    Comment puis-je vous aider ?
                  </span>
                </div>
                {/* Suggestions rapides — envoi direct au clic */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendText(q)}
                      style={{
                        background: 'rgba(47,111,237,0.1)',
                        border: '1px solid rgba(47,111,237,0.2)',
                        borderRadius: '8px',
                        color: 'rgba(107,158,255,0.9)',
                        fontSize: '12px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && botAvatar}
                <div style={bubble(msg.role, msg.error)}>
                  {msg.role === 'assistant' && !msg.error ? renderContent(msg.content) : msg.content}
                  {msg.error && i === messages.length - 1 && (
                    <div style={{ marginTop: '6px' }}>
                      <button
                        onClick={retryLast}
                        disabled={loading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.35)',
                          borderRadius: '6px', color: '#fcd34d', fontSize: '11px', padding: '3px 8px', cursor: 'pointer',
                        }}
                      >
                        <MdRefresh size={13} /> Réessayer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                {botAvatar}
                {streamingText ? (
                  <div style={bubble('assistant')}>{renderContent(streamingText)}</div>
                ) : (
                  <div style={{ ...bubble('assistant'), color: 'rgba(255,255,255,0.55)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span aria-hidden="true" style={{ fontSize: '18px', letterSpacing: '2px' }}>
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="peg-chat-anim" style={{ animation: `peg-chat-dot 1.2s ${d * 0.15}s infinite` }}>·</span>
                      ))}
                    </span>
                    {statusLabel && <span>{statusLabel}</span>}
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Bandeau session expirée */}
          {authWarn && (
            <div style={{
              padding: '6px 12px', fontSize: '11px', textAlign: 'center',
              color: '#fcd34d', background: 'rgba(234,179,8,0.12)',
              borderTop: '1px solid rgba(234,179,8,0.25)',
            }}>
              Mode limité : reconnectez-vous pour accéder à vos données (offres, projets, factures).
            </div>
          )}

          {/* Input */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              aria-label="Votre message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={lastIsError ? 'Réessayez ou reformulez…' : 'Votre message...'}
              rows={1}
              maxLength={2000}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.85)',
                fontSize: '13px',
                padding: '9px 12px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                maxHeight: '80px',
                overflowY: 'auto',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Envoyer"
              className="peg-tap-target"
              style={{
                width: '36px', height: '36px',
                background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              <MdSend size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bouton flottant */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer le chat' : 'Ouvrir le chat assistant'}
        aria-expanded={open}
        className="peg-chat-anim"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: open ? 'rgba(220,38,38,0.25)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
          border: open ? '1px solid rgba(239,68,68,0.5)' : 'none',
          boxShadow: open ? '0 8px 24px rgba(239,68,68,0.3)' : undefined,
          animation: open ? 'none' : 'peg-chat-pulse 2.2s ease-in-out infinite',
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
  );
};

export default ChatWidget;
