import Container from '@/components/shared/Container';
import { SavTicket, SavMessage } from '@/@types/sav';
import { RootState } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant';
import { useAppSelector, updateCurrentProject } from '../store';
import { useAppDispatch } from '@/store';
import DetailsRight from './DetailsRight';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetProjectSavTickets, apiUpdateProjectSavTickets } from '@/services/ProjectServices';
import { apiUploadFile } from '@/services/FileServices';
import { toast } from 'react-toastify';
import { HiPlus, HiX, HiCheck, HiChevronDown, HiChevronUp, HiPhotograph } from 'react-icons/hi';
import { MdBuildCircle, MdSend } from 'react-icons/md';
import { env } from '@/configs/env.config';

// Strapi peut retourner des URLs relatives — on les préfixe si nécessaire
const ensureAbsoluteUrl = (url: string) => {
  if (!url) return url;
  if (url.startsWith('http')) return url;
  const base = env?.API_ENDPOINT_URL || '';
  return base + url;
};

const ProjectSav = () => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const dispatch = useAppDispatch();

  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const isCustomer = hasRole(user, [CUSTOMER]);
  const isProducer = hasRole(user, [PRODUCER]);

  const getUserRole = () => {
    if (isAdmin) return 'admin';
    if (isCustomer) return 'customer';
    if (isProducer) return 'producer';
    return 'admin';
  };

  const getDisplayName = () => {
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Utilisateur';
  };

  const [tickets, setTickets] = useState<SavTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closureNote, setClosureNote] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const closureRef = useRef<HTMLTextAreaElement>(null);
  const formFileRef = useRef<HTMLInputElement>(null);

  // Message fields
  const [messageText, setMessageText] = useState<Record<string, string>>({});
  const [messageFiles, setMessageFiles] = useState<Record<string, File[]>>({});
  const messageFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const messagesEndRef = useRef<Record<string, HTMLDivElement | null>>({});

  // Load SAV tickets
  useEffect(() => {
    if (!project?.documentId) return;
    setLoading(true);
    apiGetProjectSavTickets(project.documentId)
      .then((res: any) => {
        const loaded = res?.data?.data?.project?.savTickets ?? [];
        setTickets(loaded);
      })
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, [project?.documentId]);

  useEffect(() => {
    if (showForm && titleRef.current) titleRef.current.focus();
  }, [showForm]);

  useEffect(() => {
    if (closingId && closureRef.current) closureRef.current.focus();
  }, [closingId]);

  // Auto-scroll messages on expand
  useEffect(() => {
    if (expandedId && messagesEndRef.current[expandedId]) {
      setTimeout(() => {
        messagesEndRef.current[expandedId]?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [expandedId]);

  // Persist
  const persistTickets = useCallback(async (newTickets: SavTicket[]) => {
    if (!project?.documentId) return;
    setSaving(true);
    try {
      await apiUpdateProjectSavTickets(project.documentId, newTickets);
    } catch {
      toast.error('Erreur lors de la sauvegarde SAV');
    } finally {
      setSaving(false);
    }
  }, [project?.documentId]);

  const saveTickets = useCallback((newTickets: SavTicket[]) => {
    setTickets(newTickets);
    persistTickets(newTickets);
  }, [persistTickets]);

  // Upload files helper
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      try {
        console.log('[SAV] Uploading file:', file.name, file.type, file.size);
        const uploaded = await apiUploadFile(file);
        console.log('[SAV] Upload response:', JSON.stringify(uploaded));
        const url = uploaded?.url;
        if (url) {
          urls.push(ensureAbsoluteUrl(url));
        } else {
          console.error('[SAV] No URL in upload response:', uploaded);
          toast.error('Upload OK mais pas d\'URL pour: ' + file.name);
        }
      } catch (err) {
        console.error('[SAV] Upload error:', err);
        toast.error('Erreur upload: ' + file.name);
      }
    }
    return urls;
  };

  // Create ticket
  const createTicket = async () => {
    const title = formTitle.trim();
    if (!title) return;

    setUploading(true);
    let imageUrls: string[] = [];
    if (formFiles.length > 0) {
      imageUrls = await uploadFiles(formFiles);
    }

    const newTicket: SavTicket = {
      id: 'sav-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      title,
      description: formDescription.trim(),
      openDate: new Date().toISOString(),
      status: 'open',
      createdBy: getDisplayName(),
      createdByRole: getUserRole(),
      images: imageUrls.length > 0 ? imageUrls : undefined,
      messages: [],
    };

    const newTickets = [newTicket, ...tickets];
    saveTickets(newTickets);

    // Auto-passer le projet en statut SAV
    if (project && project.state !== 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'sav' }));
      toast.info('Projet passé en statut SAV');
    }

    setFormTitle('');
    setFormDescription('');
    setFormFiles([]);
    setShowForm(false);
    setUploading(false);
    setExpandedId(newTicket.id);
    toast.success('Ticket SAV ouvert');
  };

  // Send message in ticket
  const sendMessage = async (ticketId: string) => {
    const text = (messageText[ticketId] || '').trim();
    const files = messageFiles[ticketId] || [];
    if (!text && files.length === 0) return;

    setUploading(true);
    let imageUrls: string[] = [];
    if (files.length > 0) {
      imageUrls = await uploadFiles(files);
    }

    const newMessage: SavMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      content: text,
      images: imageUrls.length > 0 ? imageUrls : undefined,
      createdBy: getDisplayName(),
      createdByRole: getUserRole(),
      createdAt: new Date().toISOString(),
    };

    const updated = tickets.map((t) =>
      t.id === ticketId ? { ...t, messages: [...(t.messages || []), newMessage] } : t
    );
    saveTickets(updated);
    setMessageText((prev) => ({ ...prev, [ticketId]: '' }));
    setMessageFiles((prev) => ({ ...prev, [ticketId]: [] }));
    setUploading(false);

    setTimeout(() => {
      messagesEndRef.current[ticketId]?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Close ticket
  const closeTicket = async (id: string) => {
    const updated = tickets.map((t) =>
      t.id === id ? { ...t, status: 'closed' as const, closeDate: new Date().toISOString(), closureNote: closureNote.trim() || undefined } : t
    );
    saveTickets(updated);
    setClosingId(null);
    setClosureNote('');

    const stillOpen = updated.filter((t) => t.status === 'open');
    if (stillOpen.length === 0 && project && project.state === 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'fulfilled' }));
      toast.info('Plus aucun ticket ouvert — projet repassé en "Terminé"');
    }

    toast.success('Ticket SAV fermé');
  };

  // Reopen ticket
  const reopenTicket = async (id: string) => {
    const updated = tickets.map((t) =>
      t.id === id ? { ...t, status: 'open' as const, closeDate: undefined, closureNote: undefined } : t
    );
    saveTickets(updated);

    if (project && project.state !== 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'sav' }));
      toast.info('Projet repassé en statut SAV');
    }

    toast.info('Ticket SAV réouvert');
  };

  // Delete ticket (admin only)
  const deleteTicket = async (id: string) => {
    const newTickets = tickets.filter((t) => t.id !== id);
    saveTickets(newTickets);

    const stillOpen = newTickets.filter((t) => t.status === 'open');
    if (stillOpen.length === 0 && project && project.state === 'sav') {
      await dispatch(updateCurrentProject({ documentId: project.documentId, state: 'fulfilled' }));
    }

    toast.success('Ticket supprimé');
  };

  const openTickets = tickets.filter((t) => t.status === 'open');
  const closedTickets = tickets.filter((t) => t.status === 'closed');

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' à '
      + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return 'Aujourd\'hui ' + formatTime(iso);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier ' + formatTime(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + formatTime(iso);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'Admin', color: '#6fa3f5', bg: 'rgba(47,111,237,0.12)' };
      case 'customer': return { label: 'Client', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
      case 'producer': return { label: 'Producteur', color: '#c084fc', bg: 'rgba(168,85,247,0.12)' };
      default: return { label: role, color: '#fff', bg: 'rgba(255,255,255,0.06)' };
    }
  };

  const renderTicket = (ticket: SavTicket) => {
    const isExpanded = expandedId === ticket.id;
    const isOpen = ticket.status === 'open';
    const ticketMessages = ticket.messages || [];

    return (
      <div
        key={ticket.id}
        style={{
          borderRadius: '12px',
          background: isOpen ? 'rgba(251,146,60,0.06)' : 'rgba(34,197,94,0.04)',
          border: '1.5px solid ' + (isOpen ? 'rgba(251,146,60,0.2)' : 'rgba(34,197,94,0.15)'),
          overflow: 'hidden',
          transition: 'all 0.15s',
        }}
      >
        {/* Header */}
        <div
          onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', cursor: 'pointer',
          }}
        >
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
            background: isOpen ? '#fb923c' : '#4ade80',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {ticket.title}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                background: isOpen ? 'rgba(251,146,60,0.15)' : 'rgba(34,197,94,0.12)',
                color: isOpen ? '#fb923c' : '#4ade80',
                textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
              }}>
                {isOpen ? 'Ouvert' : 'Fermé'}
              </span>
              {ticketMessages.length > 0 && (
                <span style={{
                  fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)',
                }}>
                  {ticketMessages.length} message{ticketMessages.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>
              {'Ouvert le ' + formatDate(ticket.openDate) + ' par ' + ticket.createdBy}
              {ticket.closeDate && (' — Fermé le ' + formatDate(ticket.closeDate))}
            </div>
          </div>
          {isExpanded ? <HiChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <HiChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Description */}
            {ticket.description && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {'Détails'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </p>
              </div>
            )}

            {/* Opening images */}
            {ticket.images && ticket.images.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {ticket.images.map((url, i) => (
                  <a key={i} href={ensureAbsoluteUrl(url)} target="_blank" rel="noreferrer">
                    <img src={ensureAbsoluteUrl(url)} alt={'SAV-' + i} style={{
                      height: '100px', width: '100px', objectFit: 'cover', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }} />
                  </a>
                ))}
              </div>
            )}

            {/* Closure note */}
            {ticket.closureNote && (
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <p style={{ color: 'rgba(34,197,94,0.7)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {'Note de fermeture'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {ticket.closureNote}
                </p>
              </div>
            )}

            {/* Duration info */}
            {ticket.closeDate && (
              <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                {'Durée : ' + getDuration(ticket.openDate, ticket.closeDate)}
              </div>
            )}

            {/* Messages / Chat */}
            {(ticketMessages.length > 0 || isOpen) && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {'Échanges (' + ticketMessages.length + ')'}
                </p>

                {/* Message list */}
                <div style={{
                  maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
                  padding: '8px', borderRadius: '10px', background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {ticketMessages.length === 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
                      Aucun message pour le moment
                    </p>
                  )}
                  {ticketMessages.map((msg) => {
                    const isMe = msg.createdBy === getDisplayName();
                    const badge = getRoleBadge(msg.createdByRole);
                    return (
                      <div key={msg.id} style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                      }}>
                        <div style={{
                          maxWidth: '80%', padding: '10px 12px', borderRadius: '12px',
                          background: isMe ? 'rgba(47,111,237,0.12)' : 'rgba(255,255,255,0.05)',
                          border: '1px solid ' + (isMe ? 'rgba(47,111,237,0.2)' : 'rgba(255,255,255,0.07)'),
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: badge.color }}>
                              {msg.createdBy}
                            </span>
                            <span style={{
                              fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
                              background: badge.bg, color: badge.color,
                            }}>
                              {badge.label}
                            </span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
                              {formatShortDate(msg.createdAt)}
                            </span>
                          </div>
                          {msg.content && (
                            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', lineHeight: '1.4', whiteSpace: 'pre-wrap', margin: 0 }}>
                              {msg.content}
                            </p>
                          )}
                          {msg.images && msg.images.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                              {msg.images.map((url, i) => (
                                <a key={i} href={ensureAbsoluteUrl(url)} target="_blank" rel="noreferrer">
                                  <img src={ensureAbsoluteUrl(url)} alt={'msg-' + i} style={{
                                    height: '80px', width: '80px', objectFit: 'cover', borderRadius: '6px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                  }} />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={(el) => { messagesEndRef.current[ticket.id] = el; }} />
                </div>

                {/* Message input — only if ticket is open */}
                {isOpen && (
                  <div style={{ marginTop: '8px' }}>
                    {/* File previews */}
                    {(messageFiles[ticket.id] || []).length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        {(messageFiles[ticket.id] || []).map((f, i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={URL.createObjectURL(f)} alt={f.name} style={{
                              height: '50px', width: '50px', objectFit: 'cover', borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.1)',
                            }} />
                            <button
                              onClick={() => setMessageFiles((prev) => ({
                                ...prev,
                                [ticket.id]: (prev[ticket.id] || []).filter((_, idx) => idx !== i),
                              }))}
                              style={{
                                position: 'absolute', top: '-4px', right: '-4px',
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: '#ef4444', border: 'none', color: '#fff',
                                fontSize: '10px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <HiX size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                      <input
                        ref={(el) => { messageFileRefs.current[ticket.id] = el; }}
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files) {
                            setMessageFiles((prev) => ({
                              ...prev,
                              [ticket.id]: [...(prev[ticket.id] || []), ...Array.from(e.target.files!)],
                            }));
                          }
                          e.target.value = '';
                        }}
                      />
                      <button
                        onClick={() => messageFileRefs.current[ticket.id]?.click()}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                        }}
                        title="Joindre une photo"
                      >
                        <HiPhotograph size={18} />
                      </button>
                      <input
                        type="text"
                        placeholder="Votre message..."
                        value={messageText[ticket.id] || ''}
                        onChange={(e) => setMessageText((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(ticket.id); } }}
                        style={{
                          flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                          padding: '8px 12px', outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <button
                        onClick={() => sendMessage(ticket.id)}
                        disabled={uploading || (!(messageText[ticket.id] || '').trim() && !(messageFiles[ticket.id] || []).length)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                          background: (messageText[ticket.id] || '').trim() || (messageFiles[ticket.id] || []).length
                            ? 'linear-gradient(90deg, #2f6fed, #1f4bb6)' : 'rgba(255,255,255,0.05)',
                          border: 'none', color: '#fff', cursor: 'pointer',
                        }}
                      >
                        <MdSend size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions — admin only */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                {isOpen && closingId !== ticket.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setClosingId(ticket.id); setClosureNote(''); }}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                      color: '#4ade80', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <HiCheck size={13} /> Fermer le ticket
                  </button>
                )}
                {!isOpen && (
                  <button
                    onClick={(e) => { e.stopPropagation(); reopenTicket(ticket.id); }}
                    disabled={saving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', borderRadius: '8px',
                      background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)',
                      color: '#fb923c', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Rouvrir
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTicket(ticket.id); }}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '8px',
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <HiX size={13} /> Supprimer
                </button>
              </div>
            )}

            {/* Closure form */}
            {closingId === ticket.id && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  ref={closureRef}
                  placeholder="Note de fermeture (optionnelle)..."
                  value={closureNote}
                  onChange={(e) => setClosureNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setClosingId(null); setClosureNote(''); } }}
                  rows={3}
                  style={{
                    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                    padding: '10px 12px', outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => closeTicket(ticket.id)}
                    style={{
                      padding: '8px 16px', borderRadius: '8px',
                      background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                      border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Confirmer la fermeture
                  </button>
                  <button
                    onClick={() => { setClosingId(null); setClosureNote(''); }}
                    style={{
                      padding: '8px 12px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Both admin and customer can open tickets
  const canOpenTicket = isAdmin || isCustomer;

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '28px', paddingBottom: '28px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Tickets SAV
              </p>
              {tickets.length > 0 && (
                <span style={{ color: saving ? '#fbbf24' : 'rgba(255,255,255,0.6)', fontSize: '12px', transition: 'color 0.2s' }}>
                  {saving ? 'Sauvegarde...' : (openTickets.length + ' ouvert' + (openTickets.length > 1 ? 's' : '') + ' — ' + closedTickets.length + ' fermé' + (closedTickets.length > 1 ? 's' : ''))}
                </span>
              )}
            </div>

            {canOpenTicket && (
              <button
                onClick={() => setShowForm(true)}
                disabled={saving || uploading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: 'rgba(251,146,60,0.12)',
                  border: '1px solid rgba(251,146,60,0.3)',
                  color: '#fb923c', fontSize: '12px', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <HiPlus size={13} />
                Ouvrir un ticket SAV
              </button>
            )}
          </div>

          {/* Loading */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>Chargement...</p>
            </div>
          ) : (
            <>
              {/* Create form */}
              {showForm && canOpenTicket && (
                <div style={{
                  marginBottom: '16px', padding: '16px', borderRadius: '12px',
                  background: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.15)',
                }}>
                  <input
                    ref={titleRef}
                    type="text"
                    placeholder="Titre du ticket SAV..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && formTitle.trim()) createTicket(); if (e.key === 'Escape') { setShowForm(false); setFormTitle(''); setFormDescription(''); setFormFiles([]); } }}
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(251,146,60,0.3)',
                      borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                      padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
                      marginBottom: '8px', boxSizing: 'border-box',
                    }}
                  />
                  <textarea
                    placeholder="Décrivez le problème rencontré..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowForm(false); setFormTitle(''); setFormDescription(''); setFormFiles([]); } }}
                    rows={4}
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(251,146,60,0.2)',
                      borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                      padding: '10px 12px', outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                      marginBottom: '10px', boxSizing: 'border-box',
                    }}
                  />

                  {/* File input for creation */}
                  <input
                    ref={formFileRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files) setFormFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                      e.target.value = '';
                    }}
                  />

                  {/* File previews */}
                  {formFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {formFiles.map((f, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={URL.createObjectURL(f)} alt={f.name} style={{
                            height: '60px', width: '60px', objectFit: 'cover', borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }} />
                          <button
                            onClick={() => setFormFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            style={{
                              position: 'absolute', top: '-4px', right: '-4px',
                              width: '16px', height: '16px', borderRadius: '50%',
                              background: '#ef4444', border: 'none', color: '#fff',
                              fontSize: '10px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <HiX size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => formFileRef.current?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <HiPhotograph size={14} /> Ajouter des photos
                    </button>
                    <button
                      onClick={createTicket}
                      disabled={!formTitle.trim() || uploading}
                      style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: formTitle.trim() && !uploading ? 'linear-gradient(90deg, #fb923c, #ea580c)' : 'rgba(255,255,255,0.05)',
                        border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700,
                        cursor: formTitle.trim() && !uploading ? 'pointer' : 'not-allowed',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      {uploading ? 'Envoi...' : 'Créer le ticket'}
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setFormTitle(''); setFormDescription(''); setFormFiles([]); }}
                      style={{
                        padding: '8px 12px', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {tickets.length === 0 && !showForm ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
                  <MdBuildCircle size={60} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>Aucun ticket SAV sur ce projet</p>
                  {canOpenTicket && (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                      Cliquez sur "Ouvrir un ticket SAV" pour signaler un problème
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {openTickets.length > 0 && (
                    <>
                      <p style={{ color: 'rgba(251,146,60,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '4px', marginBottom: '2px' }}>
                        {'En cours (' + openTickets.length + ')'}
                      </p>
                      {openTickets.map(renderTicket)}
                    </>
                  )}

                  {closedTickets.length > 0 && (
                    <>
                      <p style={{ color: 'rgba(34,197,94,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: openTickets.length > 0 ? '16px' : '4px', marginBottom: '2px' }}>
                        {'Fermés (' + closedTickets.length + ')'}
                      </p>
                      {closedTickets.map(renderTicket)}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <DetailsRight />
      </div>
    </Container>
  );
};

function getDuration(openDate: string, closeDate: string): string {
  const diff = new Date(closeDate).getTime() - new Date(openDate).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return days + 'j ' + (hours % 24) + 'h';
  if (hours > 0) return hours + 'h ' + (minutes % 60) + 'min';
  return minutes + 'min';
}

export default ProjectSav;
