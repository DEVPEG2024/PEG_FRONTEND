import { useState, useEffect, useRef } from 'react';
import {
  apiGetChatbotConfig,
  apiUpdateChatbotConfig,
  apiAddFaq,
  apiUpdateFaq,
  apiDeleteFaq,
  apiGetChatHistory,
  apiGetConversation,
  apiDeleteConversation,
  apiTestChat,
} from '@/services/ChatbotServices';
import type { ChatbotConfig, FAQ, ConversationSummary, Message } from '@/services/ChatbotServices';
import { MdSmartToy, MdSend, MdDelete, MdEdit, MdAdd, MdSave, MdHistory, MdChat, MdQuestionAnswer, MdSettings } from 'react-icons/md';
import { HiChevronRight } from 'react-icons/hi';

const CARD_STYLE: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
  padding: '24px',
};

const SECTION_TITLE: React.CSSProperties = {
  color: '#fff',
  fontSize: '15px',
  fontWeight: 700,
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const TAB_LABELS = [
  { key: 'prompt',   label: 'System Prompt',  icon: <MdSettings size={16} /> },
  { key: 'faq',      label: 'FAQ',             icon: <MdQuestionAnswer size={16} /> },
  { key: 'history',  label: 'Historique',      icon: <MdHistory size={16} /> },
  { key: 'test',     label: 'Tester en live',  icon: <MdChat size={16} /> },
];

// ─────────────────────────────────────────────────────────────────
// Section System Prompt
// ─────────────────────────────────────────────────────────────────
const PromptSection = ({
  config,
  onUpdate,
}: {
  config: ChatbotConfig | null;
  onUpdate: (c: ChatbotConfig) => void;
}) => {
  const [value, setValue] = useState(config?.systemPrompt ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setValue(config?.systemPrompt ?? ''); }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiUpdateChatbotConfig(value);
      onUpdate(res.data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={CARD_STYLE}>
      <div style={SECTION_TITLE}>
        <MdSettings size={18} color="#6b9eff" /> System Prompt
      </div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginBottom: '12px', lineHeight: 1.5 }}>
        Ce texte définit la personnalité et les instructions du chatbot. Il sera injecté avant chaque conversation client.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        style={{
          width: '100%',
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '13.5px',
          padding: '14px',
          resize: 'vertical',
          outline: 'none',
          lineHeight: 1.6,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <MdSave size={16} />
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Section FAQ
// ─────────────────────────────────────────────────────────────────
const FaqSection = ({
  config,
  onUpdate,
}: {
  config: ChatbotConfig | null;
  onUpdate: (c: ChatbotConfig) => void;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editR, setEditR] = useState('');
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newR, setNewR] = useState('');
  const [loading, setLoading] = useState(false);

  const faqs: FAQ[] = config?.faqs ?? [];

  const startEdit = (faq: FAQ) => {
    setEditingId(faq._id);
    setEditQ(faq.question);
    setEditR(faq.reponse);
  };

  const cancelEdit = () => { setEditingId(null); setEditQ(''); setEditR(''); };

  const saveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      const res = await apiUpdateFaq(editingId, editQ, editR);
      onUpdate(res.data.config);
      cancelEdit();
    } finally { setLoading(false); }
  };

  const handleDelete = async (faqId: string) => {
    if (!confirm('Supprimer cette FAQ ?')) return;
    setLoading(true);
    try {
      const res = await apiDeleteFaq(faqId);
      onUpdate(res.data.config);
    } finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newQ.trim() || !newR.trim()) return;
    setLoading(true);
    try {
      const res = await apiAddFaq(newQ.trim(), newR.trim());
      onUpdate(res.data.config);
      setNewQ(''); setNewR(''); setAdding(false);
    } finally { setLoading(false); }
  };

  return (
    <div style={CARD_STYLE}>
      <div style={{ ...SECTION_TITLE, justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdQuestionAnswer size={18} color="#6b9eff" /> FAQ / Réponses prédéfinies
        </span>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: 'rgba(47,111,237,0.15)',
            border: '1px solid rgba(47,111,237,0.3)',
            color: '#6b9eff',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <MdAdd size={16} /> Ajouter
        </button>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginBottom: '16px', lineHeight: 1.5 }}>
        Ces FAQ sont injectées automatiquement dans le contexte du chatbot avant chaque conversation.
      </p>

      {/* Formulaire ajout */}
      {adding && (
        <div style={{ background: 'rgba(47,111,237,0.08)', border: '1px solid rgba(47,111,237,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Question</label>
            <input
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Ex: Quels sont vos délais de livraison ?"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Réponse</label>
            <textarea
              value={newR}
              onChange={(e) => setNewR(e.target.value)}
              rows={3}
              placeholder="Ex: Nos délais de livraison sont de 3 à 5 jours ouvrés..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleAdd} disabled={loading} style={btnPrimary}>
              {loading ? 'Ajout...' : 'Ajouter'}
            </button>
            <button onClick={() => { setAdding(false); setNewQ(''); setNewR(''); }} style={btnGhost}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste FAQs */}
      {faqs.length === 0 && !adding && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '32px', fontSize: '13px' }}>
          Aucune FAQ configurée. Cliquez sur "Ajouter" pour commencer.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {faqs.map((faq) => (
          <div
            key={faq._id}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            {editingId === faq._id ? (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={labelStyle}>Question</label>
                  <input value={editQ} onChange={(e) => setEditQ(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Réponse</label>
                  <textarea value={editR} onChange={(e) => setEditR(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={saveEdit} disabled={loading} style={btnPrimary}>Enregistrer</button>
                  <button onClick={cancelEdit} style={btnGhost}>Annuler</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: '13.5px', fontWeight: 600, marginBottom: '4px' }}>
                    Q : {faq.question}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12.5px', lineHeight: 1.5 }}>
                    R : {faq.reponse}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => startEdit(faq)} style={iconBtn}>
                    <MdEdit size={15} />
                  </button>
                  <button onClick={() => handleDelete(faq._id)} style={{ ...iconBtn, color: 'rgba(239,68,68,0.7)' }}>
                    <MdDelete size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Section Historique
// ─────────────────────────────────────────────────────────────────
const HistorySection = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const load = async (dateFrom?: string) => {
    setLoading(true);
    try {
      const res = await apiGetChatHistory({ page: 1, pageSize: 50, dateFrom });
      setConversations(res.data.conversations);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openConversation = async (id: string) => {
    setLoadingConv(true);
    try {
      const res = await apiGetConversation(id);
      setSelected(res.data.conversation);
    } finally { setLoadingConv(false); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await apiDeleteConversation(id);
    if (selected?._id === id) setSelected(null);
    setConversations((prev) => prev.filter((c) => c._id !== id));
    setTotal((t) => t - 1);
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '600px' }}>
      {/* Liste */}
      <div style={{ ...CARD_STYLE, flex: '0 0 360px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={SECTION_TITLE}>
          <MdHistory size={18} color="#6b9eff" /> Conversations ({total})
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => { setFilterDate(e.target.value); load(e.target.value || undefined); }}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', marginTop: '32px' }}>Chargement...</div>
        ) : conversations.length === 0 ? (
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', marginTop: '32px' }}>Aucune conversation</div>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {conversations.map((c) => (
              <div
                key={c._id}
                onClick={() => openConversation(c._id)}
                style={{
                  background: selected?._id === c._id ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selected?._id === c._id ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '10px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{c.userName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '2px' }}>
                    {c.messageCount} messages · {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HiChevronRight size={14} color="rgba(255,255,255,0.3)" />
                  <button
                    onClick={(e) => handleDelete(e, c._id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', padding: '2px', display: 'flex', alignItems: 'center' }}
                  >
                    <MdDelete size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détail */}
      <div style={{ ...CARD_STYLE, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loadingConv ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '32px' }}>Chargement...</div>
        ) : !selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.2)', gap: '12px' }}>
            <MdHistory size={40} />
            <span style={{ fontSize: '14px' }}>Sélectionnez une conversation</span>
          </div>
        ) : (
          <>
            <div style={{ ...SECTION_TITLE, marginBottom: '12px' }}>
              <MdChat size={18} color="#6b9eff" /> {selected.userName}
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 400, marginLeft: '8px' }}>
                {new Date(selected.createdAt).toLocaleString('fr-FR')}
              </span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selected.messages.map((msg: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, rgba(47,111,237,0.3), rgba(47,111,237,0.15))'
                        : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${msg.role === 'user' ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding: '10px 14px',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '13px',
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Section Test Live
// ─────────────────────────────────────────────────────────────────
const TestSection = ({ config }: { config: ChatbotConfig | null }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await apiTestChat(next);
      setMessages([...next, { role: 'assistant', content: res.data.reply }]);
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: `❌ Erreur : ${e?.response?.data?.message ?? 'Vérifiez que GROQ_API_KEY est configurée sur le backend.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', height: '600px' }}>
      <div style={SECTION_TITLE}>
        <MdChat size={18} color="#6b9eff" /> Test en live
        <button
          onClick={() => setMessages([])}
          style={{ marginLeft: 'auto', ...btnGhost, fontSize: '11px', padding: '4px 10px' }}
        >
          Réinitialiser
        </button>
      </div>

      {/* Aperçu du prompt actif */}
      {config?.systemPrompt && (
        <div style={{ background: 'rgba(47,111,237,0.07)', border: '1px solid rgba(47,111,237,0.15)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px' }}>
          <div style={{ color: 'rgba(107,158,255,0.7)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>System prompt actif</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {config.systemPrompt}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.2)', gap: '10px' }}>
            <MdSmartToy size={36} />
            <span style={{ fontSize: '13px' }}>Envoyez un message pour tester le chatbot</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(47,111,237,0.3), rgba(47,111,237,0.15))'
                : 'rgba(255,255,255,0.06)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '10px 14px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '13.5px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <MdSmartToy size={14} color="#6b9eff" />
                  <span style={{ color: '#6b9eff', fontSize: '11px', fontWeight: 700 }}>Assistant</span>
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>⋯ Génération en cours</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Écrivez un message... (Entrée pour envoyer)"
          rows={2}
          style={{ ...inputStyle, flex: 1, resize: 'none' }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            padding: '0 16px',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <MdSend size={20} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────
const ChatbotPage = () => {
  const [tab, setTab] = useState<'prompt' | 'faq' | 'history' | 'test'>('prompt');
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGetChatbotConfig()
      .then((res) => setConfig(res.data.config))
      .catch(() => setError('Impossible de charger la configuration du chatbot.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(47,111,237,0.3), rgba(47,111,237,0.1))',
          border: '1px solid rgba(47,111,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MdSmartToy size={24} color="#6b9eff" />
        </div>
        <div>
          <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: 0 }}>Chatbot IA</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '2px 0 0' }}>
            Configuration et supervision du chatbot
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {TAB_LABELS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              background: tab === t.key ? 'rgba(47,111,237,0.25)' : 'transparent',
              border: tab === t.key ? '1px solid rgba(47,111,237,0.4)' : '1px solid transparent',
              borderRadius: '9px',
              color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.5)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '80px', fontSize: '14px' }}>Chargement...</div>
      ) : error ? (
        <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '16px', fontSize: '13px' }}>
          {error}
        </div>
      ) : (
        <>
          {tab === 'prompt'  && <PromptSection config={config} onUpdate={setConfig} />}
          {tab === 'faq'     && <FaqSection config={config} onUpdate={setConfig} />}
          {tab === 'history' && <HistorySection />}
          {tab === 'test'    && <TestSection config={config} />}
        </>
      )}
    </div>
  );
};

export default ChatbotPage;

// ─────────────────────────────────────────────────────────────────
// Shared styles
// ─────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.85)',
  fontSize: '13px',
  padding: '10px 12px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  marginTop: '4px',
};

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.55)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer',
};

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  padding: '5px',
  display: 'flex',
  alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
};
