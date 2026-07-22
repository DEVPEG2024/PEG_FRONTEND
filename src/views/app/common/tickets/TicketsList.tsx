import { Container, EmptyState } from '@/components/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RootState, injectReducer, useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import reducer, { deleteTicket, getTickets, useAppSelector } from './store';
import { createTicket } from './store/ticketSlice';
import { Ticket, TicketMessage } from '@/@types/ticket';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN, CUSTOMER, PRODUCER } from '@/constants/roles.constant';
import { apiUpdateTicketMessages } from '@/services/TicketServices';
import { apiUploadFile } from '@/services/FileServices';
import { triggerNotification } from '@/services/NotificationService';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import {
  HiOutlineSearch, HiPlus, HiTrash, HiTicket, HiChevronDown, HiChevronUp, HiArrowRight, HiArrowLeft,
  HiCheck, HiX, HiPhotograph,
  HiOutlineClock, HiOutlineCheckCircle, HiOutlineChevronRight, HiOutlineChatAlt2,
  HiOutlineShoppingBag, HiOutlinePencilAlt, HiOutlineDocumentText, HiOutlineDotsHorizontal, HiOutlineBell,
} from 'react-icons/hi';
import { MdSend, MdBugReport, MdSettings, MdPayment, MdHelp, MdExtension, MdCode, MdArticle, MdAccountCircle, MdBuild, MdHeadsetMic } from 'react-icons/md';
import { TbActivity, TbClockHour4 } from 'react-icons/tb';
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
  pending:  { label: 'Ouvert',  bg: 'rgba(109,93,252,0.14)',  color: '#a99bff' },
  open:     { label: 'Ouvert',  bg: 'rgba(109,93,252,0.14)',  color: '#a99bff' },
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
  { key: 'waiting', label: 'En attente' },
  { key: 'closed', label: 'Fermés' },
  { key: 'canceled', label: 'Annulés' },
];

// Raccourcis "Choisissez le type de demande" (vue client) → type ticket existant
const QUICK_TYPES = [
  { type: 'technical', label: 'Problème technique',     icon: <MdBuild size={20} />,                color: '#a99bff', bg: 'rgba(139,125,255,0.12)', border: 'rgba(139,125,255,0.25)' },
  { type: 'support',   label: 'Question sur une commande', icon: <HiOutlineShoppingBag size={20} />, color: '#6b9eff', bg: 'rgba(47,111,237,0.12)',  border: 'rgba(47,111,237,0.25)' },
  { type: 'content',   label: 'Modification graphique',  icon: <HiOutlinePencilAlt size={20} />,     color: '#4ade80', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
  { type: 'refunds',   label: 'Facturation',             icon: <HiOutlineDocumentText size={20} />,  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)' },
  { type: 'support',   label: 'Autre demande',           icon: <HiOutlineDotsHorizontal size={20} />, color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.12)' },
];

const FAQ_ITEMS = [
  { q: "Comment suivre l'avancement de mon projet ?", a: "Rendez-vous dans « Mes projets » : chaque projet affiche son statut, ses étapes et les fichiers livrés en temps réel." },
  { q: "Comment télécharger mes fichiers ?", a: "Dans « Mes fichiers », survolez un fichier puis cliquez sur l'icône de téléchargement. Les fichiers partagés par votre chef de projet y apparaissent aussi." },
  { q: "Comment payer une facture ?", a: "Ouvrez « Mes factures », sélectionnez la facture concernée et réglez en ligne par carte (Stripe) ou par virement." },
  { q: "Comment commander un produit ?", a: "Parcourez le « Catalogue », ajoutez les produits au panier puis validez la commande. Un projet est automatiquement créé." },
  { q: "Comment contacter mon chef de projet ?", a: "Créez un ticket ci-dessous ou utilisez le bouton « Envoyer un message » de la carte « Mon interlocuteur »." },
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

const PRIMARY_BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '11px 20px', borderRadius: '12px',
  background: 'linear-gradient(135deg, #6d5dfc, #5a47e0)', border: 'none', cursor: 'pointer', color: '#fff',
  fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 16px rgba(109,93,252,0.4)',
  transition: 'transform 0.15s', whiteSpace: 'nowrap',
};

/* ---------- Petits composants présentation ---------- */

const Panel = ({ title, action, children, style }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '22px', ...style }}>
    {(title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' }}>
        <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
        {action}
      </div>
    )}
    {children}
  </div>
);

const KpiCard = ({ icon, iconBg, iconBorder, iconColor, label, value, hint }: any) => (
  <div style={{ flex: '1 1 220px', minWidth: 0, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: iconBg, border: `1px solid ${iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ color: iconColor, display: 'flex' }}>{icon}</span>
    </div>
    <div style={{ minWidth: 0 }}>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 500, margin: '0 0 3px' }}>{label}</p>
      <p style={{ color: '#fff', fontSize: '26px', fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</p>
      <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '12px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</p>
    </div>
  </div>
);

const SeeAll = ({ onClick, label = 'Voir tout' }: { onClick: () => void; label?: string }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#8b7dff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{label}</button>
);

const BarRow = ({ label, count, total, color }: { label: string; count: number; total: number; color: string }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '13px', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ height: '7px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: '100px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
};

const TicketsList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const { tickets, total, loading } = useAppSelector((state) => state.tickets.data);
  const { user }: { user: User } = useRootAppSelector((state: RootState) => state.auth.user);
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const isCustomer = hasRole(user, [CUSTOMER]) && !isAdmin;
  const isProducer = hasRole(user, [PRODUCER]) && !isAdmin && !isCustomer;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (expandedId && msgsEndRef.current[expandedId]) {
      setTimeout(() => msgsEndRef.current[expandedId]?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [expandedId]);

  /* ---------- Helpers état ---------- */
  const isOpenState = (t: Ticket) => t.state === 'pending' || t.state === 'open';
  const isClosedState = (t: Ticket) => t.state === 'fulfilled' || t.state === 'closed';
  const lastMsgRole = (t: Ticket) => (t.messages && t.messages.length ? t.messages[t.messages.length - 1].createdByRole : null);
  const isWaiting = (t: Ticket) => isOpenState(t) && (lastMsgRole(t) === 'admin' || lastMsgRole(t) === 'producer');

  const filtered = tickets.filter((t) => {
    const matchTab =
      activeTab === 'all' ? true :
      activeTab === 'open' ? isOpenState(t) :
      activeTab === 'waiting' ? isWaiting(t) :
      activeTab === 'closed' ? isClosedState(t) :
      t.state === activeTab;
    return matchTab;
  });

  const tabCount = (key: string) => {
    if (key === 'all') return tickets.length;
    if (key === 'open') return tickets.filter(isOpenState).length;
    if (key === 'waiting') return tickets.filter(isWaiting).length;
    if (key === 'closed') return tickets.filter(isClosedState).length;
    return tickets.filter((t) => t.state === key).length;
  };

  const kpis = useMemo(() => ({
    open: tickets.filter(isOpenState).length,
    waiting: tickets.filter(isWaiting).length,
    resolved: tickets.filter(isClosedState).length,
  }), [tickets]);

  // Flux d'activité récente (création + messages)
  const activity = useMemo(() => {
    const events: { id: string; label: string; sub: string; at: string; color: string; icon: React.ReactNode }[] = [];
    tickets.forEach((t) => {
      events.push({ id: t.documentId + '-c', label: 'Ticket créé', sub: t.name, at: t.createdAt, color: '#8b7dff', icon: <HiTicket size={14} /> });
      (t.messages || []).forEach((m) => {
        events.push({ id: t.documentId + '-' + m.id, label: 'Nouveau message', sub: t.name, at: m.createdAt, color: '#6b9eff', icon: <HiOutlineChatAlt2 size={14} /> });
      });
    });
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);
  }, [tickets]);

  // Stats vue admin (gestion globale)
  const adminStats = useMemo(() => {
    const isAdminWaiting = (t: Ticket) => isOpenState(t) && (!(t.messages && t.messages.length) || t.messages[t.messages.length - 1].createdByRole !== 'admin');
    const prio: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const typeCounts: Record<string, number> = {};
    tickets.forEach((t) => {
      if (prio[t.priority] !== undefined) prio[t.priority]++;
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });
    const types = ticketTypeData
      .map((td: any) => ({ label: td.label, value: td.value, count: typeCounts[td.value] || 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    return {
      open: tickets.filter(isOpenState).length,
      waiting: tickets.filter(isAdminWaiting).length,
      resolved: tickets.filter(isClosedState).length,
      urgent: tickets.filter((t) => isOpenState(t) && t.priority === 'high').length,
      prio,
      types,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  // Wizard
  const resetWizard = () => {
    setWizardOpen(false); setWizStep(0); setWizName(''); setWizDescription('');
    setWizPriority('medium'); setWizType('support'); setWizFiles([]);
  };
  const openWizard = (type?: string, step = 0) => {
    if (type) setWizType(type);
    setWizStep(step);
    setWizardOpen(true);
  };

  const submitWizard = async () => {
    if (!wizName.trim()) { toast.error('Titre obligatoire'); return; }
    setWizSubmitting(true);
    try {
      const imagePayload = wizFiles.length > 0 ? { file: wizFiles[0] } : undefined;
      await dispatch(createTicket({
        name: wizName.trim(), description: wizDescription.trim(),
        state: 'pending', priority: wizPriority, type: wizType,
        user: user.documentId, image: imagePayload,
      } as any)).unwrap();

      // Prévenir les admins de l'ouverture du ticket → cloche + pastille /support.
      const rawSenderId = user?.documentId || (user as any)?.id || (user as any)?._id;
      const senderId = rawSenderId != null ? String(rawSenderId) : undefined;
      if (senderId) {
        triggerNotification({
          eventType: 'new_ticket',
          senderId,
          notifyAdmins: true,
          title: 'Nouveau ticket',
          message: `${getDisplayName()} a ouvert le ticket « ${wizName.trim()} »`,
          link: '/support',
          metadata: { ticketName: wizName.trim(), ticketType: wizType, ticketPriority: wizPriority },
        });
      }

      toast.success('Ticket créé');
      resetWizard();
      dispatch(getTickets({ request: { pagination: { page: currentPage, pageSize }, searchTerm }, user }));
    } catch (err) {
      console.error('[Ticket] Create error:', err);
      toast.error('Erreur lors de la création');
    }
    finally { setWizSubmitting(false); }
  };

  // Chat
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const f of files) {
      try {
        const up = await apiUploadFile(f);
        if (up?.url) urls.push(ensureAbsoluteUrl(up.url));
      } catch (err) { console.error('[Tickets] Échec upload fichier:', err); }
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

      // Notifier l'autre partie de la nouvelle réponse → « botif » (cloche) +
      // pastille rouge sur la section Tickets (/support écoute `new_ticket`).
      // - Admin/producteur répond → le client (propriétaire du ticket) est prévenu.
      // - Client répond → les admins sont prévenus.
      // Le senderId est toujours exclu des destinataires côté backend, donc pas
      // d'auto-notification si l'auteur du ticket répond lui-même.
      const rawSenderId = user?.documentId || (user as any)?.id || (user as any)?._id;
      const senderId = rawSenderId != null ? String(rawSenderId) : undefined;
      if (senderId) {
        const isStaffReply = getUserRole() === 'admin' || getUserRole() === 'producer';
        const ownerId = ticket.user?.documentId;
        triggerNotification({
          eventType: 'new_ticket',
          senderId,
          recipients: ownerId ? [{ userId: ownerId }] : [],
          notifyAdmins: !isStaffReply,
          title: isStaffReply ? 'Réponse à votre ticket' : 'Nouvelle réponse à un ticket',
          message: `${getDisplayName()} a répondu au ticket « ${ticket.name} »`,
          link: '/support',
          metadata: { ticketId: ticket.documentId, ticketName: ticket.name },
        });
      }

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

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    return dayjs(iso).format('DD/MM/YYYY');
  };

  /* ---------- Carte ticket (réutilisée) ---------- */
  const renderTicketCard = (ticket: Ticket) => {
    const pCfg = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.low;
    const sCfg = STATE_CFG[ticket.state] ?? STATE_CFG.pending;
    const isExpanded = expandedId === ticket.documentId;
    const authorName = ticket.user ? (ticket.user.firstName + ' ' + (ticket.user.lastName || '')).trim() : '?';
    const msgs = ticket.messages || [];
    const isOpen = isOpenState(ticket);
    const TypeIcon = TYPE_ICONS[ticket.type] || MdHelp;

    return (
      <div key={ticket.documentId}
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1.5px solid ' + (isExpanded ? 'rgba(109,93,252,0.3)' : 'rgba(255,255,255,0.07)'),
          borderRadius: '14px', overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s',
        }}>
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: pCfg.bar, borderRadius: '14px 0 0 14px' }} />
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
                        background: isMe ? 'rgba(109,93,252,0.12)' : 'rgba(255,255,255,0.04)',
                        border: '1px solid ' + (isMe ? 'rgba(109,93,252,0.18)' : 'rgba(255,255,255,0.06)'),
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
                        background: (msgText[ticket.documentId] || '').trim() || (msgFiles[ticket.documentId] || []).length ? 'linear-gradient(135deg, #6d5dfc, #5a47e0)' : 'rgba(255,255,255,0.04)',
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
  };

  /* ---------- Onglets + recherche ---------- */
  const renderTabsAndSearch = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
        {TAB_STATES.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: activeTab === tab.key ? 'rgba(109,93,252,0.2)' : 'transparent', color: activeTab === tab.key ? '#a99bff' : 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}>
            {tab.label}
            <span style={{ marginLeft: '5px', background: activeTab === tab.key ? 'rgba(109,93,252,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: '100px', padding: '1px 6px', fontSize: '10px' }}>{tabCount(tab.key)}</span>
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
  );

  const renderList = (emptyTitle: string, emptyDesc: string, emptyCta?: React.ReactNode) => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '72px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(139,125,255,0.1)', border: '1px solid rgba(139,125,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <SlSupport size={28} style={{ color: '#8b7dff' }} />
          </div>
          <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>{emptyTitle}</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 auto', maxWidth: '320px', lineHeight: 1.5 }}>{emptyDesc}</p>
          {emptyCta && <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>{emptyCta}</div>}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((ticket: Ticket) => renderTicketCard(ticket))}
      </div>
    );
  };

  /* ═══════════ Wizard modal (partagé) ═══════════ */
  const wizardModal = wizardOpen ? (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) resetWizard(); }}>
      <div style={{
        width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        background: 'linear-gradient(160deg, #1a1730 0%, #0f1018 100%)',
        borderRadius: '20px', padding: '32px', position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={(e) => e.stopPropagation()}>
        <button onClick={resetWizard} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
          <HiX size={16} />
        </button>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: i === wizStep ? '32px' : '8px', height: '8px', borderRadius: '100px', background: i < wizStep ? '#22c55e' : i === wizStep ? 'linear-gradient(90deg, #6d5dfc, #5a47e0)' : 'rgba(255,255,255,0.08)', transition: 'all 0.4s', boxShadow: i === wizStep ? '0 0 10px rgba(109,93,252,0.4)' : 'none' }} />
          ))}
        </div>

        {wizStep === 0 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(109,93,252,0.2), rgba(109,93,252,0.05))', border: '1px solid rgba(109,93,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiTicket size={24} style={{ color: '#a99bff' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Nouveau ticket</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Quel type de demande ?</p>
            </div>

            <span style={labelStyle}>Type</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '16px' }}>
              {ticketTypeData.map((t: any) => {
                const TIcon = TYPE_ICONS[t.value] || MdHelp;
                return (
                  <div key={t.value} onClick={() => setWizType(t.value)}
                    style={{
                      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s',
                      background: wizType === t.value ? 'rgba(109,93,252,0.1)' : 'rgba(255,255,255,0.02)',
                      border: '1.5px solid ' + (wizType === t.value ? 'rgba(109,93,252,0.3)' : 'rgba(255,255,255,0.05)'),
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                    <TIcon size={16} style={{ color: wizType === t.value ? '#a99bff' : 'rgba(255,255,255,0.3)' }} />
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
                padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(90deg, #6d5dfc, #5a47e0)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 16px rgba(109,93,252,0.3)',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {wizStep === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(251,146,60,0.05))', border: '1px solid rgba(251,146,60,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MdBugReport size={24} style={{ color: '#fb923c' }} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Décrivez votre demande</h3>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={labelStyle}>Titre *</span>
              <input type="text" placeholder="Résumez votre demande..." value={wizName} onChange={(e) => setWizName(e.target.value)} style={inputStyle} autoFocus />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={labelStyle}>Description</span>
              <textarea placeholder="Détaillez votre demande..." value={wizDescription} onChange={(e) => setWizDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
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
                background: wizName.trim() ? 'linear-gradient(90deg, #6d5dfc, #5a47e0)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: wizName.trim() ? '0 4px 16px rgba(109,93,252,0.3)' : 'none',
              }}>Suivant <HiArrowRight size={14} /></button>
            </div>
          </div>
        )}

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
                <span style={{ background: 'rgba(109,93,252,0.12)', borderRadius: '100px', padding: '2px 10px', color: '#a99bff', fontSize: '11px', fontWeight: 600 }}>{ticketTypeData.find((t: any) => t.value === wizType)?.label || wizType}</span>
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
  ) : null;

  /* ═══════════ VUE ADMIN / PRODUCTEUR (dashboard gestion) ═══════════ */
  if (isAdmin || isProducer) {
    const typePalette = ['#8b7dff', '#6b9eff', '#4ade80', '#fbbf24', '#f87171', '#22d3ee'];
    return (
      <Container style={{ fontFamily: 'Inter, sans-serif', paddingBottom: '40px' }}>
        {/* HERO */}
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)',
          padding: '34px 36px', marginTop: '24px', marginBottom: '20px',
          background: 'radial-gradient(120% 150% at 82% 0%, rgba(124,107,255,0.30) 0%, rgba(91,71,224,0.10) 38%, rgba(13,16,28,0.3) 72%), linear-gradient(160deg, #15172b 0%, #0d1018 100%)',
        }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '560px' }}>
            <p style={{ color: '#a99bff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', margin: '0 0 12px' }}>CENTRE D'ASSISTANCE</p>
            <h1 style={{ color: '#fff', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, margin: 0 }}>
              ASSISTANCE. SUIVI. <span style={{ color: '#a78bfa' }}>RÉSOLUTION.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '14px 0 0', lineHeight: 1.5 }}>
              Gérez et suivez l'ensemble des tickets de vos clients en un coup d'œil.
            </p>
          </div>
          <button onClick={() => openWizard(undefined, 0)}
            style={{ ...PRIMARY_BTN, position: 'absolute', top: '28px', right: '32px', zIndex: 3, padding: '12px 22px', fontSize: '14px' }}>
            <HiPlus size={16} /> Nouveau ticket
          </button>
          <ChatArt />
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <KpiCard icon={<MdHeadsetMic size={24} />} iconBg="rgba(139,125,255,0.12)" iconBorder="rgba(139,125,255,0.25)" iconColor="#a99bff"
            label="Tickets ouverts" value={loading ? '—' : adminStats.open} hint={adminStats.open === 0 ? 'Aucun ticket ouvert' : 'En cours de traitement'} />
          <KpiCard icon={<HiOutlineClock size={24} />} iconBg="rgba(251,191,36,0.12)" iconBorder="rgba(251,191,36,0.25)" iconColor="#fbbf24"
            label="À traiter" value={loading ? '—' : adminStats.waiting} hint="En attente d'une réponse" />
          <KpiCard icon={<HiOutlineCheckCircle size={24} />} iconBg="rgba(34,197,94,0.12)" iconBorder="rgba(34,197,94,0.25)" iconColor="#4ade80"
            label="Résolus" value={loading ? '—' : adminStats.resolved} hint="Tickets clôturés" />
          <KpiCard icon={<MdBugReport size={24} />} iconBg="rgba(239,68,68,0.12)" iconBorder="rgba(239,68,68,0.25)" iconColor="#f87171"
            label="Urgents" value={loading ? '—' : adminStats.urgent} hint="Priorité élevée ouverte" />
        </div>

        {/* Répartition priorité + type */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <Panel title="Répartition par priorité">
            {tickets.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0 }}>Aucune donnée pour le moment.</p>
            ) : (
              <>
                <BarRow label="Élevée" count={adminStats.prio.high} total={tickets.length} color="#f87171" />
                <BarRow label="Moyenne" count={adminStats.prio.medium} total={tickets.length} color="#fbbf24" />
                <BarRow label="Faible" count={adminStats.prio.low} total={tickets.length} color="#4ade80" />
              </>
            )}
          </Panel>

          <Panel title="Répartition par type">
            {adminStats.types.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: 0 }}>Aucune donnée pour le moment.</p>
            ) : (
              adminStats.types.map((t, i) => (
                <BarRow key={t.value} label={t.label} count={t.count} total={tickets.length} color={typePalette[i % typePalette.length]} />
              ))
            )}
          </Panel>
        </div>

        {/* Tous les tickets + Activité récente */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
          <Panel style={{ minWidth: 0 }} title={`Tous les tickets (${total})`}>
            {renderTabsAndSearch()}
            {renderList('Aucun ticket', "Aucun ticket à afficher pour le moment.")}
          </Panel>

          <Panel title="Activité récente">
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <HiOutlineBell size={26} style={{ color: 'rgba(255,255,255,0.25)' }} />
                </div>
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Aucune activité récente</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12.5px', margin: '0 auto', maxWidth: '220px', lineHeight: 1.5 }}>Les dernières actions sur les tickets apparaîtront ici.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activity.map((ev) => (
                  <div key={ev.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 4px' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ev.color, flexShrink: 0, marginTop: '2px' }}>{ev.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, margin: '0 0 1px' }}>{ev.label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.sub}</p>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>{timeAgo(ev.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {wizardModal}
      </Container>
    );
  }

  /* ═══════════ VUE CLIENT (dashboard assistance) ═══════════ */
  if (isCustomer) {
    return (
      <Container style={{ fontFamily: 'Inter, sans-serif', paddingBottom: '40px' }}>
        {/* HERO */}
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: '22px', border: '1px solid rgba(255,255,255,0.08)',
          padding: '34px 36px', marginTop: '24px', marginBottom: '20px',
          background: 'radial-gradient(120% 150% at 82% 0%, rgba(124,107,255,0.30) 0%, rgba(91,71,224,0.10) 38%, rgba(13,16,28,0.3) 72%), linear-gradient(160deg, #15172b 0%, #0d1018 100%)',
        }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '560px' }}>
            <p style={{ color: '#a99bff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', margin: '0 0 12px' }}>ASSISTANCE</p>
            <h1 style={{ color: '#fff', fontSize: '34px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, margin: 0 }}>
              ASSISTANCE. ÉCHANGE. <span style={{ color: '#a78bfa' }}>RÉSOLUTION.</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '14px 0 0', lineHeight: 1.5 }}>
              Notre équipe vous accompagne tout au long de vos projets.
            </p>
          </div>
          <button onClick={() => openWizard(undefined, 0)}
            style={{ ...PRIMARY_BTN, position: 'absolute', top: '28px', right: '32px', zIndex: 3, padding: '12px 22px', fontSize: '14px' }}>
            <HiPlus size={16} /> Nouveau ticket
          </button>
          <ChatArt />
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <KpiCard icon={<MdHeadsetMic size={24} />} iconBg="rgba(139,125,255,0.12)" iconBorder="rgba(139,125,255,0.25)" iconColor="#a99bff"
            label="Tickets ouverts" value={loading ? '—' : kpis.open} hint={kpis.open === 0 ? 'Aucun ticket ouvert' : 'En cours de traitement'} />
          <KpiCard icon={<HiOutlineClock size={24} />} iconBg="rgba(251,191,36,0.12)" iconBorder="rgba(251,191,36,0.25)" iconColor="#fbbf24"
            label="En attente" value={loading ? '—' : kpis.waiting} hint="En attente de réponse" />
          <KpiCard icon={<HiOutlineCheckCircle size={24} />} iconBg="rgba(34,197,94,0.12)" iconBorder="rgba(34,197,94,0.25)" iconColor="#4ade80"
            label="Résolus" value={loading ? '—' : kpis.resolved} hint="Tickets clôturés" />
          <KpiCard icon={<TbClockHour4 size={24} />} iconBg="rgba(47,111,237,0.12)" iconBorder="rgba(47,111,237,0.25)" iconColor="#6b9eff"
            label="Temps moyen de réponse" value="— —" hint="Moins de 24h en moyenne" />
        </div>

        {/* Créer un ticket + FAQ + Interlocuteur */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Créer un ticket */}
          <Panel title="Créer un ticket">
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '-8px 0 16px' }}>Décrivez votre demande, notre équipe vous répond rapidement.</p>
            <button onClick={() => openWizard(undefined, 0)} style={{ ...PRIMARY_BTN, width: '100%', padding: '13px', fontSize: '14px', marginBottom: '20px' }}>
              <HiPlus size={16} /> Nouveau ticket
            </button>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, margin: '0 0 12px' }}>Choisissez le type de demande</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {QUICK_TYPES.map((qt, i) => (
                <button key={i} onClick={() => openWizard(qt.type, 1)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 8px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = qt.border; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                  <span style={{ width: '40px', height: '40px', borderRadius: '11px', background: qt.bg, border: `1px solid ${qt.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: qt.color }}>{qt.icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', fontWeight: 600, textAlign: 'center', lineHeight: 1.25 }}>{qt.label}</span>
                </button>
              ))}
            </div>
          </Panel>

          {/* Questions fréquentes */}
          <Panel title="Questions fréquentes" action={<SeeAll label="Voir toutes" onClick={() => setFaqOpen(faqOpen === null ? 0 : null)} />}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {FAQ_ITEMS.map((item, i) => {
                const open = faqOpen === i;
                return (
                  <div key={i} style={{ borderBottom: i < FAQ_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <button onClick={() => setFaqOpen(open ? null : i)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'left' }}>
                      <HiOutlineDocumentText size={16} style={{ color: '#8b7dff', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'rgba(255,255,255,0.78)', fontSize: '13px', fontWeight: 500 }}>{item.q}</span>
                      <HiOutlineChevronRight size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {open && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12.5px', lineHeight: 1.55, margin: '0 0 13px', padding: '0 28px' }}>{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Mon interlocuteur */}
          <Panel title="Mon interlocuteur">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'linear-gradient(135deg, #6d5dfc, #5a47e0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>AS</div>
              <div>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: '0 0 3px' }}>Anthony Saldi</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '0 0 6px' }}>Chef de projet</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '100px', padding: '2px 9px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ color: '#4ade80', fontSize: '11px', fontWeight: 600 }}>Disponible</span>
                </span>
              </div>
            </div>
            <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: '14px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 2px' }}>Temps moyen de réponse</p>
              <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>4h</p>
            </div>
            <button onClick={() => openWizard('support', 1)} style={{ ...PRIMARY_BTN, width: '100%', padding: '12px' }}>
              <MdSend size={15} /> Envoyer un message
            </button>
          </Panel>
        </div>

        {/* Mes tickets + Activité récente */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
          <Panel style={{ minWidth: 0 }} title="Mes tickets" action={null}>
            {renderTabsAndSearch()}
            {renderList(
              'Aucune demande en cours',
              "Vous n'avez encore créé aucun ticket. Notre équipe est là pour répondre à toutes vos questions.",
              <button onClick={() => openWizard(undefined, 0)} style={PRIMARY_BTN}>Créer mon premier ticket</button>
            )}
          </Panel>

          <Panel title="Activité récente" action={activity.length > 0 ? <SeeAll onClick={() => { setActiveTab('all'); }} /> : null}>
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <HiOutlineBell size={26} style={{ color: 'rgba(255,255,255,0.25)' }} />
                </div>
                <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>Aucune activité récente</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12.5px', margin: '0 auto', maxWidth: '220px', lineHeight: 1.5 }}>Toutes les actions liées à vos tickets apparaîtront ici.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activity.map((ev) => (
                  <div key={ev.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 4px' }}>
                    <span style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ev.color, flexShrink: 0, marginTop: '2px' }}>{ev.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', fontWeight: 600, margin: '0 0 1px' }}>{ev.label}</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.sub}</p>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>{timeAgo(ev.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {wizardModal}
      </Container>
    );
  }

  /* ═══════════ VUE ADMIN / PRODUCTEUR (existante) ═══════════ */
  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Assistance</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Support <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={() => openWizard(undefined, 0)} style={{ ...PRIMARY_BTN, padding: '10px 20px' }}>
          <HiPlus size={16} /> Nouveau ticket
        </button>
      </div>

      {renderTabsAndSearch()}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '72px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun ticket" description="Aucun ticket à afficher" icon={<SlSupport size={44} />} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {filtered.map((ticket: Ticket) => renderTicketCard(ticket))}
        </div>
      )}

      {wizardModal}
    </Container>
  );
};

/* ---------- Illustration héro (bulles de chat) ---------- */
const ChatArt = () => (
  <div style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', width: '320px', height: '160px', zIndex: 1, pointerEvents: 'none', opacity: 0.95 }} className="tickets-hero-art">
    <div style={{ position: 'absolute', right: '150px', top: '14px', width: '120px', height: '54px', borderRadius: '16px 16px 16px 4px', background: 'linear-gradient(135deg, #6d5dfc, #5a47e0)', boxShadow: '0 14px 36px rgba(109,93,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)' }} />)}
    </div>
    <div style={{ position: 'absolute', right: '20px', top: '64px', width: '150px', height: '60px', borderRadius: '16px 16px 4px 16px', background: 'rgba(255,255,255,0.95)', boxShadow: '0 14px 36px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px', padding: '0 16px' }}>
      <span style={{ width: '90%', height: '6px', borderRadius: '4px', background: 'rgba(20,23,43,0.18)' }} />
      <span style={{ width: '65%', height: '6px', borderRadius: '4px', background: 'rgba(20,23,43,0.12)' }} />
    </div>
    <div style={{ position: 'absolute', right: '180px', top: '92px', width: '46px', height: '46px', borderRadius: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MdHeadsetMic size={22} style={{ color: '#a99bff' }} />
    </div>
    <style>{`@media (max-width: 1024px){ .tickets-hero-art{ display:none; } }`}</style>
  </div>
);

export default TicketsList;
