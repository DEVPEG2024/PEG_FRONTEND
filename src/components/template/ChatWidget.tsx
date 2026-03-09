import { useState, useRef, useEffect } from 'react';
import { MdSmartToy, MdSend, MdClose, MdChatBubble } from 'react-icons/md';
import { useAppSelector } from '@/store';
import axios from 'axios';
import { EXPRESS_BACKEND_URL } from '@/configs/api.config';
import { apiGetCustomerProjects } from '@/services/ProjectServices';
import { apiGetCustomerProducts } from '@/services/ProductServices';
import { apiGetOrderItems } from '@/services/OrderItemServices';

type Message = { role: 'user' | 'assistant'; content: string };

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [userContext, setUserContext] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector((state) => state.auth.user.user);
  const userName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : 'Client';
  const userId   = user?.documentId ?? undefined;

  // Charger le contexte client une seule fois
  useEffect(() => {
    if (!user?.customer?.documentId) return;
    const customerDocumentId = user.customer.documentId;
    const customerCategoryDocumentId = user.customer?.customerCategory?.documentId ?? '';
    Promise.allSettled([
      apiGetCustomerProjects({ customerDocumentId, pagination: { page: 1, pageSize: 5 }, searchTerm: '' }),
      apiGetCustomerProducts(customerDocumentId, customerCategoryDocumentId, { page: 1, pageSize: 10 }),
      apiGetOrderItems({ pagination: { page: 1, pageSize: 5 }, searchTerm: '' }),
    ]).then(([projectsRes, productsRes, ordersRes]) => {
      const lines: string[] = [];
      if (projectsRes.status === 'fulfilled') {
        const projects = projectsRes.value.data.data.projects_connection?.nodes ?? [];
        if (projects.length > 0) {
          lines.push('Projets en cours du client : ' + projects.map((p: any) => `${p.name} (état: ${p.state})`).join(', '));
        }
      }
      if (productsRes.status === 'fulfilled') {
        const products = productsRes.value.data.data.products_connection?.nodes ?? [];
        if (products.length > 0) {
          lines.push('Produits disponibles pour ce client : ' + products.map((p: any) => p.name).join(', '));
        }
      }
      if (ordersRes.status === 'fulfilled') {
        const orders = ordersRes.value.data.data.orderItems_connection?.nodes ?? [];
        if (orders.length > 0) {
          lines.push('Dernières commandes : ' + orders.map((o: any) => `${o.product?.name ?? 'produit'} (qté: ${o.quantity})`).join(', '));
        }
      }
      if (lines.length > 0) setUserContext(lines.join('\n'));
    });
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${EXPRESS_BACKEND_URL}/chatbot/chat`, {
        messages: next,
        userName,
        userId,
        userContext: userContext || undefined,
      });
      const reply = res.data.reply as string;
      setMessages([...next, { role: 'assistant', content: reply }]);
      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Désolé, le service est momentanément indisponible. Veuillez réessayer plus tard.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ position: 'fixed', bottom: '44px', right: '24px', zIndex: 9999, fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @keyframes peg-chat-pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(239,68,68,0.45); }
          50% { box-shadow: 0 8px 32px rgba(239,68,68,0.75), 0 0 0 8px rgba(239,68,68,0.12); }
        }
      `}</style>
      {/* Fenêtre de chat */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: '72px',
          right: 0,
          width: '360px',
          height: '500px',
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
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}
            >
              <MdClose size={18} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: '12px',
                color: 'rgba(255,255,255,0.3)',
              }}>
                <MdSmartToy size={40} />
                <div style={{ textAlign: 'center', fontSize: '13px', lineHeight: 1.5 }}>
                  Bonjour {userName.split(' ')[0] || ''} ! 👋<br />
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
                    Comment puis-je vous aider ?
                  </span>
                </div>
                {/* Suggestions rapides */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {['Comment passer une commande ?', 'Quels sont vos produits ?', 'Comment vous contacter ?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
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
                  {msg.content}
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

          {/* Input */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}>
            <textarea
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
