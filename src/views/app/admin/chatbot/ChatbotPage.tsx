import { useState, useEffect, useRef } from 'react';
import {
  apiGetChatbotConfig,
  apiUpdateChatbotConfig,
  apiAddFaq,
  apiUpdateFaq,
  apiDeleteFaq,
  apiGetDocuments,
  apiUploadDocument,
  apiDeleteDocument,
  apiGetChatHistory,
  apiGetConversation,
  apiDeleteConversation,
  apiTestChat,
} from '@/services/ChatbotServices';
import { EXPRESS_BACKEND_URL } from '@/configs/api.config';
import type { ChatbotConfig, FAQ, ChatbotDocument, ConversationSummary, Message } from '@/services/ChatbotServices';
import {
  MdSmartToy, MdSend, MdDelete, MdEdit, MdAdd, MdSave,
  MdHistory, MdChat, MdQuestionAnswer, MdSettings, MdArrowBack,
  MdImage, MdPerson, MdUploadFile, MdPictureAsPdf, MdTextSnippet, MdInsertDriveFile,
} from 'react-icons/md';
import { HiChevronRight } from 'react-icons/hi';

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

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  display: 'block',
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

const PANEL: React.CSSProperties = {
  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px',
};

const SECTION_LABEL: React.CSSProperties = {
  color: 'rgba(255,255,255,0.35)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

// ─────────────────────────────────────────────────────────────────
// Avatar Upload
// ─────────────────────────────────────────────────────────────────
const AvatarUpload = ({
  currentUrl,
  name,
  onUploaded,
}: {
  currentUrl: string | null;
  name: string;
  onUploaded: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${EXPRESS_BACKEND_URL}/upload`, { method: 'POST', body: form });
      const data = await res.json();
      if (data.fileUrl) onUploaded(data.fileUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
      {/* Avatar */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: currentUrl ? 'transparent' : 'linear-gradient(135deg, rgba(47,111,237,0.3), rgba(47,111,237,0.1))',
          border: '2px solid rgba(47,111,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <MdPerson size={36} color="rgba(107,158,255,0.7)" />
        )}
        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
        >
          {uploading
            ? <span style={{ color: '#fff', fontSize: '11px' }}>...</span>
            : <MdImage size={20} color="#fff" />
          }
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <div>
        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
          {name || 'Nom du bot'}
        </div>
        <button
          onClick={() => !uploading && inputRef.current?.click()}
          style={{ ...btnGhost, padding: '5px 12px', fontSize: '12px' }}
        >
          {uploading ? 'Upload...' : 'Changer l\'image'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Documents Section
// ─────────────────────────────────────────────────────────────────
const DocIcon = ({ type }: { type: string }) => {
  if (type === 'image') return <MdImage size={15} color="#a78bfa" />;
  if (type === 'pdf')   return <MdPictureAsPdf size={15} color="#f87171" />;
  if (type === 'text')  return <MdTextSnippet size={15} color="#34d399" />;
  return <MdInsertDriveFile size={15} color="#94a3b8" />;
};

const DocumentsSection = () => {
  const [documents, setDocuments] = useState<ChatbotDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGetDocuments().then((res) => setDocuments(res.data.documents)).catch(() => {});
  }, []);

  const handleFiles = async (files: FileList) => {
    setError('');
    for (const file of Array.from(files)) {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await apiUploadDocument(form);
        setDocuments((prev) => [res.data.document, ...prev]);
      } catch {
        setError(`Échec de l'envoi : ${file.name}`);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDelete = async (id: number) => {
    await apiDeleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#2f6fed' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '12px',
          padding: '20px 16px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          background: dragOver ? 'rgba(47,111,237,0.08)' : 'rgba(0,0,0,0.15)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.md"
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
        />
        <MdUploadFile size={24} color={dragOver ? '#6b9eff' : 'rgba(255,255,255,0.25)'} style={{ marginBottom: '8px' }} />
        <div style={{ color: uploading ? '#6b9eff' : dragOver ? '#6b9eff' : 'rgba(255,255,255,0.35)', fontSize: '12.5px', fontWeight: 500 }}>
          {uploading ? 'Envoi en cours...' : 'Glissez vos fichiers ici ou cliquez pour choisir'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '4px' }}>
          Images · PDF · Fichiers texte — 10 Mo max
        </div>
      </div>

      {error && (
        <div style={{ color: '#f87171', fontSize: '11px', marginTop: '6px' }}>{error}</div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px', padding: '8px 12px',
              }}
            >
              <DocIcon type={doc.file_type} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', marginTop: '1px' }}>
                  {doc.content
                    ? `${doc.content.length.toLocaleString('fr-FR')} caractères extraits`
                    : doc.file_url ? 'Image stockée' : 'Aucun contenu extrait'
                  }
                </div>
              </div>
              {doc.file_url && doc.file_type === 'image' && (
                <img src={doc.file_url} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
              )}
              <button onClick={() => handleDelete(doc.id)} style={{ ...iconBtn, color: 'rgba(239,68,68,0.7)', flexShrink: 0 }}>
                <MdDelete size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '12px', textAlign: 'center', paddingTop: '10px' }}>
          Aucun document ajouté
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Config Panel (left)
// ─────────────────────────────────────────────────────────────────
const ConfigPanel = ({
  config,
  onUpdate,
}: {
  config: ChatbotConfig | null;
  onUpdate: (c: ChatbotConfig) => void;
}) => {
  const [form, setForm] = useState({
    name: config?.name ?? 'Assistant PEG',
    description: config?.description ?? '',
    avatarUrl: config?.avatarUrl ?? null as string | null,
    systemPrompt: config?.systemPrompt ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [faqSection, setFaqSection] = useState(false);

  // FAQ state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editR, setEditR] = useState('');
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newR, setNewR] = useState('');
  const [faqLoading, setFaqLoading] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        name: config.name ?? 'Assistant PEG',
        description: config.description ?? '',
        avatarUrl: config.avatarUrl ?? null,
        systemPrompt: config.systemPrompt ?? '',
      });
    }
  }, [config]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiUpdateChatbotConfig(form.systemPrompt, form.name, form.description, form.avatarUrl);
      onUpdate(res.data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  const faqs: FAQ[] = config?.faqs ?? [];

  const startEdit = (faq: FAQ) => { setEditingId(faq._id); setEditQ(faq.question); setEditR(faq.reponse); };
  const cancelEdit = () => { setEditingId(null); setEditQ(''); setEditR(''); };

  const saveEdit = async () => {
    if (!editingId) return;
    setFaqLoading(true);
    try { const res = await apiUpdateFaq(editingId, editQ, editR); onUpdate(res.data.config); cancelEdit(); }
    finally { setFaqLoading(false); }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Supprimer cette FAQ ?')) return;
    setFaqLoading(true);
    try { const res = await apiDeleteFaq(id); onUpdate(res.data.config); }
    finally { setFaqLoading(false); }
  };

  const handleAdd = async () => {
    if (!newQ.trim() || !newR.trim()) return;
    setFaqLoading(true);
    try {
      const res = await apiAddFaq(newQ.trim(), newR.trim());
      onUpdate(res.data.config);
      setNewQ(''); setNewR(''); setAdding(false);
    } finally { setFaqLoading(false); }
  };

  return (
    <div style={{ ...PANEL, flex: '0 0 420px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <div style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>Configurer</div>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px', flex: 1 }}>

        {/* ── Identité ── */}
        <div>
          <div style={SECTION_LABEL}><MdPerson size={13} /> Identité</div>
          <AvatarUpload
            currentUrl={form.avatarUrl}
            name={form.name}
            onUploaded={(url) => setForm({ ...form, avatarUrl: url })}
          />
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Nom</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Assistant PEG"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Votre assistant commercial PEG"
              style={inputStyle}
            />
          </div>
        </div>

        {/* ── Instructions ── */}
        <div>
          <div style={SECTION_LABEL}><MdSettings size={13} /> Instructions</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '10px', lineHeight: 1.5 }}>
            Définissez la personnalité, le ton et les règles de comportement du bot.
          </p>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
            rows={8}
            placeholder="Ex: Tu es l'assistant de PEG. Tu réponds toujours en français..."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
        </div>

        {/* ── Documents ── */}
        <div>
          <div style={SECTION_LABEL}><MdUploadFile size={13} /> Fichiers de référence</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '10px', lineHeight: 1.5 }}>
            Glissez des photos ou documents (PDF, texte) pour enrichir les connaissances du bot.
          </p>
          <DocumentsSection />
        </div>

        {/* ── FAQ / Connaissances ── */}
        <div>
          <div style={{ ...SECTION_LABEL, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MdQuestionAnswer size={13} /> Base de connaissances
              <span style={{ background: 'rgba(47,111,237,0.2)', color: '#6b9eff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px' }}>
                {faqs.length}
              </span>
            </span>
            <button
              onClick={() => setAdding(true)}
              style={{ background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)', color: '#6b9eff', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <MdAdd size={14} /> Ajouter
            </button>
          </div>

          {adding && (
            <div style={{ background: 'rgba(47,111,237,0.07)', border: '1px solid rgba(47,111,237,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>Question</label>
                <input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Que souhaitez-vous que le bot sache ?" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Réponse</label>
                <textarea value={newR} onChange={(e) => setNewR(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleAdd} disabled={faqLoading} style={btnPrimary}>{faqLoading ? '...' : 'Ajouter'}</button>
                <button onClick={() => { setAdding(false); setNewQ(''); setNewR(''); }} style={btnGhost}>Annuler</button>
              </div>
            </div>
          )}

          {faqs.length === 0 && !adding && (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
              Ajoutez des questions-réponses pour enrichir les connaissances du bot.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {faqs.map((faq) => (
              <div key={faq._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px 14px' }}>
                {editingId === faq._id ? (
                  <div>
                    <div style={{ marginBottom: '6px' }}>
                      <label style={labelStyle}>Question</label>
                      <input value={editQ} onChange={(e) => setEditQ(e.target.value)} style={inputStyle} />
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={labelStyle}>Réponse</label>
                      <textarea value={editR} onChange={(e) => setEditR(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={saveEdit} disabled={faqLoading} style={btnPrimary}>Enregistrer</button>
                      <button onClick={cancelEdit} style={btnGhost}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '12.5px', fontWeight: 600, marginBottom: '3px' }}>{faq.question}</div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.4 }}>{faq.reponse}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                      <button onClick={() => startEdit(faq)} style={iconBtn}><MdEdit size={14} /></button>
                      <button onClick={() => handleDeleteFaq(faq._id)} style={{ ...iconBtn, color: 'rgba(239,68,68,0.7)' }}><MdDelete size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            ...btnPrimary,
            width: '100%',
            justifyContent: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '11px 20px',
            background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
          }}
        >
          <MdSave size={16} />
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder les modifications'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Preview Panel (right) — chat live
// ─────────────────────────────────────────────────────────────────
const PreviewPanel = ({ config }: { config: ChatbotConfig | null }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${EXPRESS_BACKEND_URL}/upload`, { method: 'POST', body: form });
        const data = await res.json();
        if (data.fileUrl) {
          setPendingImages((prev) => [...prev, data.fileUrl]);
        }
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    if ((!input.trim() && pendingImages.length === 0) || loading) return;
    const userMsg: Message = {
      role: 'user',
      content: input.trim(),
      ...(pendingImages.length > 0 ? { images: [...pendingImages] } : {}),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setPendingImages([]);
    setLoading(true);
    try {
      const res = await apiTestChat(next);
      setMessages([...next, { role: 'assistant', content: res.data.reply }]);
    } catch (e: any) {
      setMessages([...next, { role: 'assistant', content: `❌ ${e?.response?.data?.message ?? 'Erreur — vérifiez GROQ_API_KEY'}` }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const avatarUrl = config?.avatarUrl;
  const botName = config?.name ?? 'Assistant';

  return (
    <div style={{ ...PANEL, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header preview */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(47,111,237,0.2)', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <MdSmartToy size={18} color="#6b9eff" />
            }
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{botName}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>Aperçu</div>
          </div>
        </div>
        <button onClick={() => setMessages([])} style={{ ...btnGhost, fontSize: '11px', padding: '4px 10px' }}>
          Réinitialiser
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.2)', gap: '10px' }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', opacity: 0.6 }} />
              : <MdSmartToy size={40} />
            }
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{botName}</div>
              <div style={{ fontSize: '12px' }}>{config?.description ?? 'Envoyez un message pour tester'}</div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(47,111,237,0.2)', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <MdSmartToy size={14} color="#6b9eff" />
                }
              </div>
            )}
            <div style={{
              maxWidth: '78%',
              background: msg.role === 'user' ? 'linear-gradient(135deg, rgba(47,111,237,0.35), rgba(47,111,237,0.2))' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(47,111,237,0.35)' : 'rgba(255,255,255,0.09)'}`,
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
              color: 'rgba(255,255,255,0.88)',
              fontSize: '13.5px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.images && msg.images.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: msg.content ? '8px' : 0 }}>
                  {msg.images.map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" style={{ maxWidth: '180px', maxHeight: '140px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
                    </a>
                  ))}
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(47,111,237,0.2)', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MdSmartToy size={14} color="#6b9eff" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>⋯</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pending images preview */}
      {pendingImages.length > 0 && (
        <div style={{ padding: '8px 16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {pendingImages.map((url, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <img src={url} alt="" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
              <button
                onClick={() => removePendingImage(idx)}
                style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: '#ef4444', border: 'none', color: '#fff',
                  fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', color: uploading ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)',
            padding: '8px 10px',
            cursor: uploading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
          title="Joindre une image"
        >
          <MdImage size={18} />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Testez votre bot… (Entrée pour envoyer)"
          rows={2}
          style={{ ...inputStyle, flex: 1, resize: 'none', marginTop: 0 }}
        />
        <button
          onClick={send}
          disabled={loading || (!input.trim() && pendingImages.length === 0)}
          style={{
            background: loading || (!input.trim() && pendingImages.length === 0) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #2f6fed, #1a4fbf)',
            border: 'none', borderRadius: '10px', color: '#fff', padding: '8px 14px',
            cursor: loading || (!input.trim() && pendingImages.length === 0) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}
        >
          <MdSend size={18} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// History Panel
// ─────────────────────────────────────────────────────────────────
const HistoryPanel = () => {
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
    try { const res = await apiGetConversation(id); setSelected(res.data.conversation); }
    finally { setLoadingConv(false); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await apiDeleteConversation(id);
    if (selected?._id === id) setSelected(null);
    setConversations((prev) => prev.filter((c) => c._id !== id));
    setTotal((t) => t - 1);
  };

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
      {/* Liste */}
      <div style={{ ...PANEL, flex: '0 0 360px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdHistory size={18} color="#6b9eff" /> Conversations <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400, fontSize: '12px' }}>({total})</span>
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => { setFilterDate(e.target.value); load(e.target.value || undefined); }}
          style={{ ...inputStyle, marginBottom: '10px' }}
        />
        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', textAlign: 'center', marginTop: '32px' }}>Chargement...</div>
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
                  borderRadius: '10px', padding: '10px 12px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{c.userName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '2px' }}>
                    {c.messageCount} messages · {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HiChevronRight size={14} color="rgba(255,255,255,0.55)" />
                  <button onClick={(e) => handleDelete(e, c._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', padding: '2px', display: 'flex', alignItems: 'center' }}>
                    <MdDelete size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détail */}
      <div style={{ ...PANEL, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
        {loadingConv ? (
          <div style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: '32px' }}>Chargement...</div>
        ) : !selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'rgba(255,255,255,0.2)', gap: '12px' }}>
            <MdChat size={40} />
            <span style={{ fontSize: '14px' }}>Sélectionnez une conversation</span>
          </div>
        ) : (
          <>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MdChat size={18} color="#6b9eff" /> {selected.userName}
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 400 }}>
                {new Date(selected.createdAt).toLocaleString('fr-FR')}
              </span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selected.messages.map((msg: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%',
                    background: msg.role === 'user' ? 'rgba(47,111,237,0.2)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    padding: '10px 14px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', lineHeight: 1.5,
                  }}>
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
// Page principale
// ─────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: ChatbotConfig = {
  _id: '',
  name: 'Assistant PEG',
  description: '',
  avatarUrl: null,
  systemPrompt: '',
  faqs: [],
  updatedAt: '',
};

const ChatbotPage = () => {
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    apiGetChatbotConfig()
      .then((res) => setConfig(res.data.config))
      .catch(() => {
        setBackendError(
          `Le service chatbot (${EXPRESS_BACKEND_URL}) est inaccessible. ` +
          'Vérifiez que Strapi est démarré et que GROQ_API_KEY est configurée.'
        );
        setConfig(DEFAULT_CONFIG);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px 28px', fontFamily: 'Inter, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {showHistory && (
            <button
              onClick={() => setShowHistory(false)}
              style={{ ...iconBtn, padding: '8px', borderRadius: '10px' }}
            >
              <MdArrowBack size={18} />
            </button>
          )}
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(47,111,237,0.3), rgba(47,111,237,0.1))', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MdSmartToy size={22} color="#6b9eff" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              {showHistory ? 'Historique des conversations' : 'Chatbot IA'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: '2px 0 0' }}>
              {showHistory ? 'Consultez les échanges avec vos clients' : 'Configurez et testez votre assistant en temps réel'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            ...btnGhost,
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
            background: showHistory ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.05)',
            borderColor: showHistory ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.1)',
            color: showHistory ? '#6b9eff' : 'rgba(255,255,255,0.55)',
          }}
        >
          <MdHistory size={16} />
          Historique
        </button>
      </div>

      {backendError && !loading && (
        <div style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '12px 16px', fontSize: '12.5px', marginBottom: '16px', lineHeight: 1.5 }}>
          ⚠️ {backendError}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: '80px', fontSize: '14px' }}>Chargement...</div>
      ) : showHistory ? (
        <div style={{ flex: 1, minHeight: 0, height: 'calc(100vh - 130px)' }}>
          <HistoryPanel />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0, height: 'calc(100vh - 130px)' }}>
          <ConfigPanel config={config} onUpdate={setConfig} />
          <PreviewPanel config={config} />
        </div>
      )}
    </div>
  );
};

export default ChatbotPage;
