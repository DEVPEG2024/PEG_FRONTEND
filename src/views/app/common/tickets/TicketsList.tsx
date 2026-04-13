import { Container, EmptyState } from '@/components/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RootState, injectReducer, useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import reducer, { deleteTicket, getTickets, setNewTicketDialog, useAppSelector } from './store';
import { createTicket } from './store/ticketSlice';
import { Ticket, TicketMessage } from '@/@types/ticket';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant';
import { apiUpdateTicketMessages } from '@/services/TicketServices';
import { apiUploadFile } from '@/services/FileServices';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { HiOutlineSearch, HiPlus, HiTrash, HiTicket, HiChevronDown, HiChevronUp, HiArrowRight, HiArrowLeft, HiCheck, HiX, HiPhotograph } from 'react-icons/hi';
import { MdSend, MdBugReport, MdSettings, MdPayment, MdHelp, MdExtension, MdCode, MdArticle, MdAccountCircle } from 'react-icons/md';
import { SlSupport } from 'react-icons/sl';
import { env } from '@/configs/env.config';
import { ticketPriorityData, ticketTypeData } from './constants';

injectReducer('tickets', reducer);

const ensureAbsoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  return (env?.API_ENDPOINT_URL || '') + url;
};

const PRIORITY_CFG: Record<string, { label: string; bg: string; border: string; color: string; bar: string }> = {
  low:    { label: 'Faible',  bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  color: '#4ade80', bar: '#22c55e' },
  medium: { label: 'Moyenne', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  color: '#fbbf24', bar: '#f59e0b' },
  high:   { label: 'Élevée',  bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)',  color: '#f87171', bar: '#ef4444' },
};
const STATE_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Ouvert',  bg: 'rgba(47,111,237,0.12)',  color: '#6b9eff' },
  open:     { label: 'Ouvert',  bg: 'rgba(47,111,237,0.12)',  color: '#6b9eff' },
  fulfilled: { label: 'Fermé',  bg: 'rgba(34,197,94,0.1)', color: '#4ade80' },
  closed:   { label: 'Fermé',   bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' },
  canceled: { label: 'Annulé',  bg: 'rgba(239,68,68,0.1)',    color: '#f87171' },
};
const TYPE_ICONS: Record<string, any> = {
  technical: MdCode, accounts: MdAccountCircle, features: MdExtension,
  subscriptions: MdPayment, integrations: MdSettings, content: MdArticle,
  refunds: MdPayment, support: MdHelp,
};

const TAB_STATES = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'closed', label: 'Fermés' },
  { key: 'canceled', label: 'Annulés' },
];

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin': return { label: 'Admin', color: '#6fa3f5', bg: 'rgba(47,111,237,0.15)' };
    case 'customer': return { label: 'Client', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
    case 'producer': return { label: 'Producteur', color: '#c084fc', bg: 'rgba(168,85,247,0.15)' };
    default: return { label: role, color: '#fff', bg: 'rgba(255,255,255,0.08)' };
  }
};

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '12px 14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

const TicketsList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { tickets, total, loading } = useAppSelector((state) => state.tickets.data);
  const { user }: { user: User } = useRootAppSelector((state: RootState) => state.auth.user);
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);

  const getUserRole = () => isAdmin ? 'admin' : hasRole(user, [CUSTOMER]) ? 'customer' : hasRole(user, [PRODUCER]) ? 'producer' : 'admin';
  const getDisplayName = () => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Utilisateur';

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizStep, setWizStep] = useState(0);
  const [wizName, setWizName] = useState('');
  const [wizDescription, setWizDescription] = useState('');
  const [wizPriority, setWizPriority] = useState('medium');
  const [wizType, setWizType] = useState('support');
  const [wizFiles, setWizFiles] = useState<File[]>([]);
  const [wizSubmitting, setWizSubmitting] = useState(false);
  const wizFileRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [msgText, setMsgText] = useState<Record<string, string>>({});
  const [msgFiles, setMsgFiles] = useState<Record<string, File[]>>({});
  const msgFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const msgsEndRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [msgSaving, setMsgSaving] = useState(false);

  useEffect(() => {
    dispatch(getTickets({ request: { pagination: { page: currentPage, pageSize }, searchTerm }, user }));
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (expandedId && msgsEndRef.current[expandedId]) {
      setTimeout(() => msgsEndRef.current[expandedId]?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [expandedId]);

  const filtered = tickets.filter((t) => {
    const matchTab = activeTab === 'all' || t.state === activeTab || (activeTab === 'open' && t.state === 'pending') || (activeTab === 'closed' && t.state === 'fulfilled');
    return matchTab;
  });

  const tabCount = (key: string) => {
    if (key === 'all') return tickets.length;
    if (key === 'open') return tickets.filter((t) => t.state === 'open' || t.state === 'pending').length;
    if (key === 'closed') return tickets.filter((t) => t.state === 'closed' || t.state === 'fulfilled').length;
    return tickets.filter((t) => t.state === key).length;
  };

  // Wizard
  const resetWizard = () => {
    setWizardOpen(false); setWizStep(0); setWizName(''); setWizDescription('');
    setWizPriority('medium'); setWizType('support'); setWizFiles([]);
  };

  const submitWizard = async () => {
    if (!wizName.trim()) { toast.error('Titre obligatoire'); return; }
    setWizSubmitting(true);
    try {
      let imageFile: any = undefined;
      if (wizFiles.length > 0) {
        const uploaded = await apiUploadFile(wizFiles[0]);
        if (uploaded) imageFile = uploaded;
      }
      await dispatch(createTicket({
        name: wizName.trim(), description: wizDescription.trim(),
        state: 'pending', priority: wizPriority, type: wizType,
        user: user.documentId, image: imageFile,
      } as any));
      toast.success('Ticket créé');
      resetWizard();
      dispatch(getTickets({ request: { pagination: { page: currentPage, pageSize }, searchTerm }, user }));
    } catch { toast.error('Erreur'); }
    finally { setWizSubmitting(false); }
  };

  // Chat
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const f of files) {
      try {
        const up = await apiUploadFile(f);
        if (up?.url) urls.push(ensureAbsoluteUrl(up.url));
      } catch {}
    }
    return urls;
  };

  const sendMessage = async (ticket: Ticket) => {
    const text = (msgText[ticket.documentId] || '').trim();
    const files = msgFiles[ticket.documentId] || [];
    if (!text && files.length === 0) return;

    setMsgSaving(true);
    let imageUrls: string[] = [];
    if (files.length > 0) imageUrls = await uploadFiles(files);

    const msg: TicketMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      content: text,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      createdBy: getDisplayName(),
      createdByRole: getUserRole(),
      createdAt: new Date().toISOString(),
    };

    const newMessages = [...(ticket.messages || []), msg];
    try {
      await apiUpdateTicketMessages(ticket.documentId, newMessages);
      // Update local state
      dispatch(getTickets({ request: { pagination: { page: currentPage, pageSize }, searchTerm }, user }));
    } catch { toast.error('Erreur envoi message'); }
    setMsgText((p) => ({ ...p, [ticket.documentId]: '' }));
    setMsgFiles((p) => ({ ...p, [ticket.documentId]: [] }));
    setMsgSaving(false);
    setTimeout(() => msgsEndRef.current[ticket.documentId]?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui " + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Assistance</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Support <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={() => setWizardOpen(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '12px',
          padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}>
          <HiPlus size={16} /> Nouveau ticket
        </button>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TAB_STATES.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: activeTab === tab.key ? 'rgba(47,111,237,0.2)' : 'transparent', color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}>
              {tab.label}
              <span style={{ marginLeft: '5px', background: activeTab === tab.key ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: '100px', padding: '1px 6px', fontSize: '10px' }}>{tabCount(tab.key)}</span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '340px' }}>
          <HiOutlineSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Rechercher..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '8px 14px 8px 33px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Ticket list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '72px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun ticket" description="Aucun ticket à afficher" icon={<SlSupport size={44} />} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {filtered.map((ticket: Ticket) => {
            const pCfg = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.low;
            const sCfg = STATE_CFG[ticket.state] ?? STATE_CFG.pending;
            const isExpanded = expandedId === ticket.documentId;
            const authorName = ticket.user ? (ticket.user.firstName + ' ' + (ticket.user.lastName || '')).trim() : '?';
            const msgs = ticket.messages || [];
            const isOpen = ticket.state === 'pending' || ticket.state === 'open';
            const TypeIcon = TYPE_ICONS[ticket.type] || MdHelp;

            return (
              <div key={ticket.documentId}
                style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  border: '1.5px solid ' + (isExpanded ? 'rgba(47,111,237,0.2)' : 'rgba(255,255,255,0.07)'),
                  borderRadius: '14px', overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s',
                }}>
                {/* Priority bar */}
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: pCfg.bar, borderRadius: '14px 0 0 14px' }} />

                {/* Header */}
                <div onClick={() => setExpandedId(isExpanded ? null : ticket.documentId)}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', cursor: 'pointer' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: pCfg.bg, border: '1px solid ' + pCfg.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TypeIcon size={18} style={{ color: pCfg.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{ticket.name}</span>
                      <span style={{ background: sCfg.bg, borderRadius: '100px', padding: '1px 8px', color: sCfg.color, fontSize: '11px', fontWeight: 600 }}>{sCfg.label}</span>
                      <span style={{ background: pCfg.bg, border: '1px solid ' + pCfg.border, borderRadius: '100px', padding: '1px 8px', color: pCfg.color, fontSize: '11px', fontWeight: 600 }}>{pCfg.label}</span>
                      {msgs.length > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{msgs.length} msg</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>Par {authorName}</span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>{dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); dispatch(deleteTicket(ticket.documentId)); }} title="Supprimer"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                        <HiTrash size={13} />
                      </button>
                    )}
                    {isExpanded ? <HiChevronUp size={18} style={{ color: 'rgba(255,255,255,0.25)' }} /> : <HiChevronDown size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />}
                  </div>
                </div>

                {/* Expanded: description + chat */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {ticket.description && (
                      <div style={{ marginTop: '14px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Description</p>
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{ticket.description}</p>
                      </div>
                    )}
                    {ticket.image?.url && (
                      <div style={{ marginTop: '10px' }}>
                        <a href={ensureAbsoluteUrl(ticket.image.url)} target="_blank" rel="noreferrer">
                          <img src={ensureAbsoluteUrl(ticket.image.url)} alt="" style={{ height: '100px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }} />
                        </a>
                      </div>
                    )}

                    {/* Chat */}
                    <div style={{ marginTop: '18px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                        {'Échanges (' + msgs.length + ')'}
                      </p>
                      <div style={{
                        maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
                        padding: '10px', borderRadius: '12px', background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.03)',
                      }}>
                        {msgs.length === 0 && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>Aucun message</p>}
                        {msgs.map((msg) => {
                          const isMe = msg.createdBy === getDisplayName();
                          const badge = getRoleBadge(msg.createdByRole);
                          return (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                maxWidth: '80%', padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                background: isMe ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.04)',
                                border: '1px solid ' + (isMe ? 'rgba(47,111,237,0.15)' : 'rgba(255,255,255,0.06)'),
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: badge.color }}>{msg.createdBy}</span>
                                  <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: badge.bg, color: badge.color }}>{badge.label}</span>
                                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{formatShortDate(msg.createdAt)}</span>
                                </div>
                                {msg.content && <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>}
                                {msg.images && msg.images.length > 0 && (
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                                    {msg.images.map((url, i) => (
                                      <a key={i} href={ensureAbsoluteUrl(url)} target="_blank" rel="noreferrer">
                                        <img src={ensureAbsoluteUrl(url)} alt="" style={{ height: '72px', width: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }} />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={(el) => { msgsEndRef.current[ticket.documentId] = el; }} />
                      </div>

                      {/* Message input */}
                      {isOpen && (
                        <div style={{ marginTop: '10px' }}>
                          {(msgFiles[ticket.documentId] || []).length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                              {(msgFiles[ticket.documentId] || []).map((f, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                  <img src={URL.createObjectURL(f)} alt="" style={{ height: '48px', width: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} />
                                  <button onClick={() => setMsgFiles((p) => ({ ...p, [ticket.documentId]: (p[ticket.documentId] || []).filter((_, idx) => idx !== i) }))}
                                    style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0f1c2e', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <HiX size={8} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                            <input ref={(el) => { msgFileRefs.current[ticket.documentId] = el; }} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp" style={{ display: 'none' }}
                              onChange={(e) => {
                                const files = e.target.files;
                                const tid = ticket.documentId;
                                if (files && files.length > 0) setMsgFiles((p) => ({ ...p, [tid]: [...(p[tid] || []), ...Array.from(files)] }));
                                setTimeout(() => { e.target.value = ''; }, 100);
                              }}
                            />
                            <button onClick={() => msgFileRefs.current[ticket.documentId]?.click()}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                              <HiPhotograph size={18} />
                            </button>
                            <input type="text" placeholder="Votre message..."
                              value={msgText[ticket.documentId] || ''}
                              onChange={(e) => setMsgText((p) => ({ ...p, [ticket.documentId]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(ticket); } }}
                              style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', color: 'rgba(255,255,255,0.85)', fontSize: '13px', padding: '9px 14px', outline: 'none', fontFamily: 'inherit' }}
                            />
                            <button onClick={() => sendMessage(ticket)}
                              disabled={msgSaving || (!(msgText[ticket.documentId] || '').trim() && !(msgFiles[ticket.documentId] || []).length)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                                background: (msgText[ticket.documentId] || '').trim() || (msgFiles[ticket.documentId] || []).length ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.04)',
                                border: 'none', color: '#fff', cursor: 'pointer',
                              }}>
                              <MdSend size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Wizard Modal ═══ */}
      {wizardOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease',
        }} onClick={(e) => { if (e.target === e.currentTarget) resetWizard(); }}>
          <div style={{
            width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
            background: 'linear-gradient(160deg, #1a2d47 0%, #0f1c2e 100%)',
            borderRadius: '20px', padding: '32px', position: 'relative',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }} onClick={(e) => e.stopPropagation()}>
            <button onClick={resetWizard} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
              <HiX size={16} />
            </button>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: i === wizStep ? '32px' : '8px', height: '8px', borderRadius: '100px', background: i < wizStep ? '#22c55e' : i === wizStep ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.08)', transition: 'all 0.4s', boxShadow: i === wizStep ? '0 0 10px rgba(47,111,237,0.4)' : 'none' }} />
              ))}
            </div>

            {/* Step 0: Type + Priorité */}
            {wizStep === 0 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(47,111,237,0.2), rgba(47,111,237,0.05))', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HiTicket size={24} style={{ color: '#6fa3f5' }} />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Nouveau ticket</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Quel type de problème ?</p>
                </div>

                <span style={labelStyle}>Type</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
                  {ticketTypeData.map((t: any) => {
                    const TIcon = TYPE_ICONS[t.value] || MdHelp;
                    return (
                      <div key={t.value} onClick={() => setWizType(t.value)}
                        style={{
                          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                          background: wizType === t.value ? 'rgba(47,111,237,0.1)' : 'rgba(255,255,255,0.02)',
                          border: '1.5px solid ' + (wizType === t.value ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.05)'),
                          display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                        <TIcon size={16} style={{ color: wizType === t.value ? '#6fa3f5' : 'rgba(255,255,255,0.3)' }} />
                        <span style={{ color: wizType === t.value ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>{t.label}</span>
                      </div>
                    );
                  })}
                </div>

                <span style={labelStyle}>Priorité</span>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                  {ticketPriorityData.map((p: any) => {
                    const cfg = PRIORITY_CFG[p.value] || PRIORITY_CFG.low;
                    return (
                      <div key={p.value} onClick={() => setWizPriority(p.value)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
                          background: wizPriority === p.value ? cfg.bg : 'rgba(255,255,255,0.02)',
                          border: '1.5px solid ' + (wizPriority === p.value ? cfg.border : 'rgba(255,255,255,0.05)'),
                          transition: 'all 0.15s',
                        }}>
                        <span style={{ color: wizPriority === p.value ? cfg.color : 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 700 }}>{p.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                  <button onClick={resetWizard} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Annuler</button>
                  <button onClick={() => setWizStep(1)} style={{
                    padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 16px rgba(47,111,237,0.3)',
                  }}>Suivant <HiArrowRight size={14} /></button>
                </div>
              </div>
            )}

            {/* Step 1: Description */}
            {wizStep === 1 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(251,146,60,0.05))', border: '1px solid rgba(251,146,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MdBugReport size={24} style={{ color: '#fb923c' }} />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Décrivez le problème</h3>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <span style={labelStyle}>Titre *</span>
                  <input type="text" placeholder="Résumez le problème..." value={wizName} onChange={(e) => setWizName(e.target.value)} style={inputStyle} autoFocus />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <span style={labelStyle}>Description</span>
                  <textarea placeholder="Détaillez le problème..." value={wizDescription} onChange={(e) => setWizDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <input ref={wizFileRef} type="file" multiple accept="image/jpeg,image/png,image/jpg,image/webp" style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files) setWizFiles((p) => [...p, ...Array.from(e.target.files!)]); setTimeout(() => { e.target.value = ''; }, 100); }}
                />
                {wizFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {wizFiles.map((f, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={URL.createObjectURL(f)} alt="" style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} />
                        <button onClick={() => setWizFiles((p) => p.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0f1c2e', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <HiX size={8} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => wizFileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginBottom: '12px' }}>
                  <HiPhotograph size={14} /> Ajouter des photos
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                  <button onClick={() => setWizStep(0)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HiArrowLeft size={14} /> Retour
                  </button>
                  <button onClick={() => { if (!wizName.trim()) { toast.error('Titre obligatoire'); return; } setWizStep(2); }} style={{
                    padding: '10px 24px', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700,
                    cursor: wizName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif',
                    background: wizName.trim() ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: wizName.trim() ? '0 4px 16px rgba(47,111,237,0.3)' : 'none',
                  }}>Suivant <HiArrowRight size={14} /></button>
                </div>
              </div>
            )}

            {/* Step 2: Confirm */}
            {wizStep === 2 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.05))', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HiCheck size={24} style={{ color: '#4ade80' }} />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Confirmer le ticket</h3>
                </div>

                <div style={{ borderRadius: '14px', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>{wizName}</p>
                  {wizDescription && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{wizDescription.length > 150 ? wizDescription.slice(0, 150) + '...' : wizDescription}</p>}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ background: PRIORITY_CFG[wizPriority]?.bg, border: '1px solid ' + PRIORITY_CFG[wizPriority]?.border, borderRadius: '100px', padding: '2px 10px', color: PRIORITY_CFG[wizPriority]?.color, fontSize: '11px', fontWeight: 600 }}>{PRIORITY_CFG[wizPriority]?.label}</span>
                    <span style={{ background: 'rgba(47,111,237,0.1)', borderRadius: '100px', padding: '2px 10px', color: '#6fa3f5', fontSize: '11px', fontWeight: 600 }}>{ticketTypeData.find((t: any) => t.value === wizType)?.label || wizType}</span>
                    {wizFiles.length > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{wizFiles.length} photo{wizFiles.length > 1 ? 's' : ''}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                  <button onClick={() => setWizStep(1)} style={{ padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HiArrowLeft size={14} /> Modifier
                  </button>
                  <button onClick={submitWizard} disabled={wizSubmitting} style={{
                    padding: '12px 28px', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
                    cursor: wizSubmitting ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                    background: wizSubmitting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: wizSubmitting ? 'none' : '0 4px 20px rgba(34,197,94,0.4)',
                  }}>{wizSubmitting ? 'Envoi...' : 'Envoyer le ticket'} <HiCheck size={16} /></button>
                </div>
              </div>
            )}

            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
            `}</style>
          </div>
        </div>
      )}
    </Container>
  );
};

export default TicketsList;
