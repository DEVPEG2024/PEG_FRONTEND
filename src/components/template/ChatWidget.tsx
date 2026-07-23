import { useState, useRef, useEffect } from 'react';
import { MdSmartToy, MdSend, MdClose, MdChatBubble } from 'react-icons/md';
import { useAppSelector } from '@/store';
import axios from 'axios';
import { EXPRESS_BACKEND_URL } from '@/configs/api.config';
import { getPersistedAuthToken } from '@/store/tabSessionStorage';

type Message = { role: 'user' | 'assistant'; content: string };

const CLOSING_PHRASE_RE = /avez.vous encore besoin de moi/i;
const USER_NO_RE = /^(non|non\s*merci|pas\s*besoin|c[''`]?est\s*(bon|tout)|ça\s*va|ok\s*merci|merci\s*c[''`]?est\s*tout|tout\s*va\s*bien)\s*[.!?]?\s*$/i;

const LINK_STYLE = { color: '#6b9eff', textDecoration: 'underline', wordBreak: 'break-word' as const };

// Rendu inline : liens markdown [label](url), URLs nues, **gras**, _italique_.
const renderInline = (text: string, keyBase: string): (string | JSX.Element)[] => {
  const re = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)|(https?:\/\/[^\s\]>]+)|\*\*([^*]+)\*\*|_([^_]+)_/g;
  const out: (string | JSX.Element)[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1] !== undefined) out.push(<a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>{m[1]}</a>);
    else if (m[3] !== undefined) out.push(<a key={key} href={m[3]} target="_blank" rel="noopener noreferrer" style={LINK_STYLE}>{m[3]}</a>);
    else if (m[4] !== undefined) out.push(<strong key={key} style={{ fontWeight: 700, color: '#fff' }}>{m[4]}</strong>);
    else if (m[5] !== undefined) out.push(<em key={key} style={{ opacity: 0.85 }}>{m[5]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
};

// Rendu markdown léger : paragraphes + listes à puces (les offres du bot utilisent
// **gras**, _italique_, lignes "- ...") — sinon les ** et _ s'afficheraient bruts.
const renderContent = (content: string): JSX.Element[] => {
  const lines = (content || '').split('\n');
  const blocks: JSX.Element[] = [];
  let li: JSX.Element[] = [];
  const flush = () => {
    if (li.length) {
      blocks.push(<ul key={`ul-${blocks.length}`} style={{ margin: '4px 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '2px' }}>{li}</ul>);
      li = [];
    }
  };
  lines.forEach((line, idx) => {
    const t = line.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(t);
    if (bullet) { li.push(<li key={`li-${idx}`}>{renderInline(bullet[1], `li-${idx}`)}</li>); return; }
    flush();
    if (t === '') { blocks.push(<div key={`sp-${idx}`} style={{ height: '5px' }} />); return; }
    blocks.push(<div key={`p-${idx}`} style={{ margin: '1px 0' }}>{renderInline(line, `p-${idx}`)}</div>);
  });
  flush();
  return blocks.length ? blocks : [<span key="0">{content}</span>];
};

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [awaitingClose, setAwaitingClose] = useState(false);
  const [authWarn, setAuthWarn] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const user = useAppSelector((state) => state.auth.user.user);
  const sessionToken = useAppSelector((state) => state.auth.session.token);
  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Client';

  // Le backend interroge désormais les vraies données PEG en direct (catalogue,
  // projets, commandes, compte) via ses outils, en identifiant le client par son
  // JWT — plus besoin de précharger un instantané figé côté front.

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const resetConversation = () => {
    setMessages([]);
    setAwaitingClose(false);
  };

  const sendText = async (raw: string) => {
    const text = (raw || '').trim();
    if (!text || loading) return;
    // Si le bot attend une réponse de clôture et l'utilisateur dit non → fermer après réponse
    const isClosing = awaitingClose && USER_NO_RE.test(text);
    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      // Le token identifie le client côté backend (accès sécurisé à ses données).
      const token = sessionToken || getPersistedAuthToken();
      const res = await axios.post(
        `${EXPRESS_BACKEND_URL}/chatbot/chat`,
        {
          messages: next,
          userName,
          origin: window.location.origin,
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );
      const reply = res.data.reply as string;
      const updated = [...next, { role: 'assistant' as const, content: reply }];
      setMessages(updated);
      // Token envoyé mais backend n'a pas pu identifier le client → session expirée.
      setAuthWarn(Boolean(token) && res.data?.authenticated === false);
      if (!open) setUnread((n) => n + 1);
      if (CLOSING_PHRASE_RE.test(reply)) setAwaitingClose(true);
      if (isClosing) {
        setTimeout(() => { setOpen(false); resetConversation(); }, 2500);
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Désolé, le service est momentanément indisponible. Veuillez réessayer plus tard.' }]);
    } finally {
      setLoading(false);
    }
  };

  const send = () => sendText(input);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Focus le champ à l'ouverture (accessibilité clavier).
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  return (
    <div style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 9999, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes peg-chat-pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(239,68,68,0.45); }
          50% { box-shadow: 0 8px 32px rgba(239,68,68,0.75), 0 0 0 8px rgba(239,68,68,0.12); }
        }
      `}</style>
      {/* Fenêtre de chat */}
      {open && (
        <div role="dialog" aria-label="Assistant PEG" style={{
          position: 'absolute',
          bottom: '72px',
          right: 0,
          width: 'min(360px, calc(100vw - 32px))',
          height: 'min(500px, calc(100vh - 140px))',
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
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Assistant PEG</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>
                {loading ? 'En train d\'écrire...' : 'En ligne'}
              </div>
            </div>
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
            {messages.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: '12px',
                color: 'rgba(255,255,255,0.55)',
              }}>
                <MdSmartToy size={40} />
                <div style={{ textAlign: 'center', fontSize: '13px', lineHeight: 1.5 }}>
                  Bonjour {userName.split(' ')[0] || ''} ! 👋<br />
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
                    Comment puis-je vous aider ?
                  </span>
                </div>
                {/* Suggestions rapides — envoi direct au clic */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {['Prépare-moi une offre', 'Où en sont mes projets ?', 'Ai-je des factures à payer ?', 'Un BAT à valider ?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendText(q)}
                      style={{
                        background: 'rgba(47,111,237,0.1)',
                        border: '1px solid rgba(47,111,237,0.2)',
                        borderRadius: '8px',
                        color: 'rgba(107,158,255,0.8)',
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
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '6px',
                    background: 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginRight: '6px', marginTop: '2px',
                  }}>
                    <MdSmartToy size={14} color="#fff" />
                  </div>
                )}
                <div style={{
                  maxWidth: '75%',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(47,111,237,0.35), rgba(47,111,237,0.2))'
                    : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding: '9px 13px',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '13px',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}>
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '6px',
                  background: 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <MdSmartToy size={14} color="#fff" />
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px 14px 14px 4px', padding: '9px 13px',
                  color: 'rgba(255,255,255,0.35)', fontSize: '18px', letterSpacing: '4px',
                }}>
                  ···
                </div>
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
              placeholder="Votre message..."
              rows={1}
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
