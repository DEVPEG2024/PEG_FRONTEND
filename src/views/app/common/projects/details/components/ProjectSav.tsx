import Container from '@/components/shared/Container';
import { SavTicket } from '@/@types/sav';
import { RootState } from '@/store';
import { useAppSelector as useRootAppSelector } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { useAppSelector } from '../store';
import DetailsRight from './DetailsRight';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGetProjectSavTickets, apiUpdateProjectSavTickets } from '@/services/ProjectServices';
import { toast } from 'react-toastify';
import { HiPlus, HiX, HiCheck, HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { MdBuildCircle } from 'react-icons/md';

const ProjectSav = () => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);

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
  const titleRef = useRef<HTMLInputElement>(null);
  const closureRef = useRef<HTMLTextAreaElement>(null);

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

  // Create ticket
  const createTicket = () => {
    const title = formTitle.trim();
    if (!title) return;
    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin';
    const newTicket: SavTicket = {
      id: `sav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description: formDescription.trim(),
      openDate: new Date().toISOString(),
      status: 'open',
      createdBy: displayName,
    };
    saveTickets([newTicket, ...tickets]);
    setFormTitle('');
    setFormDescription('');
    setShowForm(false);
    toast.success('Ticket SAV ouvert');
  };

  // Close ticket
  const closeTicket = (id: string) => {
    const updated = tickets.map((t) =>
      t.id === id ? { ...t, status: 'closed' as const, closeDate: new Date().toISOString(), closureNote: closureNote.trim() || undefined } : t
    );
    saveTickets(updated);
    setClosingId(null);
    setClosureNote('');
    toast.success('Ticket SAV cl\u00f4tur\u00e9');
  };

  // Reopen ticket
  const reopenTicket = (id: string) => {
    const updated = tickets.map((t) =>
      t.id === id ? { ...t, status: 'open' as const, closeDate: undefined, closureNote: undefined } : t
    );
    saveTickets(updated);
    toast.info('Ticket SAV r\u00e9ouvert');
  };

  // Delete ticket (admin only)
  const deleteTicket = (id: string) => {
    saveTickets(tickets.filter((t) => t.id !== id));
    toast.success('Ticket SAV supprim\u00e9');
  };

  const openTickets = tickets.filter((t) => t.status === 'open');
  const closedTickets = tickets.filter((t) => t.status === 'closed');

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' \u00e0 ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderTicket = (ticket: SavTicket) => {
    const isExpanded = expandedId === ticket.id;
    const isOpen = ticket.status === 'open';

    return (
      <div
        key={ticket.id}
        style={{
          borderRadius: '12px',
          background: isOpen ? 'rgba(251,146,60,0.06)' : 'rgba(34,197,94,0.04)',
          border: `1.5px solid ${isOpen ? 'rgba(251,146,60,0.2)' : 'rgba(34,197,94,0.15)'}`,
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
                {isOpen ? 'Ouvert' : 'Cl\u00f4tur\u00e9'}
              </span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>
              Ouvert le {formatDate(ticket.openDate)} par {ticket.createdBy}
              {ticket.closeDate && ` \u2014 Cl\u00f4tur\u00e9 le ${formatDate(ticket.closeDate)}`}
            </div>
          </div>
          {isExpanded ? <HiChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <HiChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {ticket.description && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  D\u00e9tails
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </p>
              </div>
            )}

            {ticket.closureNote && (
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <p style={{ color: 'rgba(34,197,94,0.7)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Note de cl\u00f4ture
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {ticket.closureNote}
                </p>
              </div>
            )}

            {/* Duration info */}
            {ticket.closeDate && (
              <div style={{ marginTop: '10px', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                Dur\u00e9e : {getDuration(ticket.openDate, ticket.closeDate)}
              </div>
            )}

            {/* Actions — admin only */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
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
                    <HiCheck size={13} /> Cl\u00f4turer
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
                    R\u00e9ouvrir
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
                  placeholder="Note de cl\u00f4ture (optionnelle)..."
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
                    Confirmer la cl\u00f4ture
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
                  {saving ? '\u25cf Sauvegarde...' : `${openTickets.length} ouvert${openTickets.length > 1 ? 's' : ''} \u2014 ${closedTickets.length} cl\u00f4tur\u00e9${closedTickets.length > 1 ? 's' : ''}`}
                </span>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowForm(true)}
                disabled={saving}
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
              {showForm && isAdmin && (
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
                    onKeyDown={(e) => { if (e.key === 'Enter' && formTitle.trim()) createTicket(); if (e.key === 'Escape') { setShowForm(false); setFormTitle(''); setFormDescription(''); } }}
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(251,146,60,0.3)',
                      borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                      padding: '10px 12px', outline: 'none', fontFamily: 'inherit',
                      marginBottom: '8px', boxSizing: 'border-box',
                    }}
                  />
                  <textarea
                    placeholder="D\u00e9tails du SAV (probl\u00e8me rencontr\u00e9, contexte, etc.)..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setShowForm(false); setFormTitle(''); setFormDescription(''); } }}
                    rows={4}
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(251,146,60,0.2)',
                      borderRadius: '8px', color: 'rgba(255,255,255,0.85)', fontSize: '13px',
                      padding: '10px 12px', outline: 'none', fontFamily: 'inherit', resize: 'vertical',
                      marginBottom: '10px', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={createTicket}
                      disabled={!formTitle.trim()}
                      style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: formTitle.trim() ? 'linear-gradient(90deg, #fb923c, #ea580c)' : 'rgba(255,255,255,0.05)',
                        border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700,
                        cursor: formTitle.trim() ? 'pointer' : 'not-allowed',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Cr\u00e9er le ticket
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setFormTitle(''); setFormDescription(''); }}
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
                  {isAdmin && (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                      Cliquez sur "Ouvrir un ticket SAV" pour signaler un probl\u00e8me
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Open tickets first */}
                  {openTickets.length > 0 && (
                    <>
                      <p style={{ color: 'rgba(251,146,60,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '4px', marginBottom: '2px' }}>
                        En cours ({openTickets.length})
                      </p>
                      {openTickets.map(renderTicket)}
                    </>
                  )}

                  {/* Closed tickets */}
                  {closedTickets.length > 0 && (
                    <>
                      <p style={{ color: 'rgba(34,197,94,0.5)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: openTickets.length > 0 ? '16px' : '4px', marginBottom: '2px' }}>
                        Cl\u00f4tur\u00e9s ({closedTickets.length})
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
  if (days > 0) return `${days}j ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}min`;
  return `${minutes}min`;
}

export default ProjectSav;
