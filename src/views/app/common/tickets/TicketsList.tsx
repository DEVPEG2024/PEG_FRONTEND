import { Container } from '@/components/shared';
import { useEffect, useState } from 'react';
import { RootState, injectReducer, useAppDispatch, useAppSelector as useRootAppSelector } from '@/store';
import reducer, { deleteTicket, getTickets, setEditTicketDialog, setNewTicketDialog, setSelectedTicket, useAppSelector } from './store';
import ModalNewTicket from './modals/ModalNewTicket';
import { Ticket } from '@/@types/ticket';
import ModalEditTicket from './modals/ModalEditTicket';
import { User } from '@/@types/user';
import dayjs from 'dayjs';
import { HiOutlineSearch, HiPlus, HiPencil, HiTrash, HiTicket } from 'react-icons/hi';
import { SlSupport } from 'react-icons/sl';

injectReducer('tickets', reducer);

const PRIORITY_CFG: Record<string, { label: string; bg: string; border: string; color: string; bar: string }> = {
  low:    { label: 'Faible',  bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  color: '#4ade80', bar: '#22c55e' },
  medium: { label: 'Moyenne', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  color: '#fbbf24', bar: '#f59e0b' },
  high:   { label: 'Élevée',  bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)',  color: '#f87171', bar: '#ef4444' },
}
const STATE_CFG: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: 'Ouvert',  bg: 'rgba(47,111,237,0.12)',  color: '#6b9eff' },
  open:     { label: 'Ouvert',  bg: 'rgba(47,111,237,0.12)',  color: '#6b9eff' },
  closed:   { label: 'Fermé',   bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)' },
  canceled: { label: 'Annulé',  bg: 'rgba(239,68,68,0.1)',    color: '#f87171' },
}

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title }: any) => (
  <button title={title} onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
  >{icon}</button>
)

const TAB_STATES = [
  { key: 'all', label: 'Tous' },
  { key: 'open', label: 'Ouverts' },
  { key: 'closed', label: 'Fermés' },
  { key: 'canceled', label: 'Annulés' },
]

const TicketsList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { tickets, total, loading, newTicketDialog, editTicketDialog } = useAppSelector((state) => state.tickets.data);
  const { user }: { user: User } = useRootAppSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    dispatch(getTickets({ request: { pagination: { page: currentPage, pageSize }, searchTerm }, user }));
  }, [currentPage, searchTerm]);

  const filtered = tickets.filter((t) => {
    const matchTab = activeTab === 'all' || t.state === activeTab || (activeTab === 'open' && t.state === 'pending')
    const matchSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchTab && matchSearch
  })

  const tabCount = (key: string) => {
    if (key === 'all') return tickets.length
    if (key === 'open') return tickets.filter((t) => t.state === 'open' || t.state === 'pending').length
    return tickets.filter((t) => t.state === key).length
  }

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Assistance</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Support <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={() => dispatch(setNewTicketDialog(true))} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
          <HiPlus size={16} /> Nouveau ticket
        </button>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TAB_STATES.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: activeTab === tab.key ? 'rgba(47,111,237,0.2)' : 'transparent', color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}
            >
              {tab.label}
              <span style={{ marginLeft: '5px', background: activeTab === tab.key ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: '100px', padding: '1px 6px', fontSize: '10px', color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.3)' }}>
                {tabCount(tab.key)}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '340px' }}>
          <HiOutlineSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Rechercher un ticket…" value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '8px 14px 8px 33px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '72px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <SlSupport size={44} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucun ticket</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {filtered.map((ticket: Ticket) => {
            const pCfg = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.low
            const sCfg = STATE_CFG[ticket.state] ?? STATE_CFG.pending
            const authorName = ticket.user ? `${ticket.user.firstName ?? ''} ${ticket.user.lastName ?? ''}`.trim() || ticket.user.username : '?'
            return (
              <div key={ticket.documentId}
                style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden', position: 'relative', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                {/* Priority bar */}
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: pCfg.bar, borderRadius: '14px 0 0 14px' }} />

                {/* Icon */}
                <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: pCfg.bg, border: `1px solid ${pCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HiTicket size={18} style={{ color: pCfg.color }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{ticket.name}</span>
                    <span style={{ background: sCfg.bg, borderRadius: '100px', padding: '1px 8px', color: sCfg.color, fontSize: '11px', fontWeight: 600 }}>{sCfg.label}</span>
                    <span style={{ background: pCfg.bg, border: `1px solid ${pCfg.border}`, borderRadius: '100px', padding: '1px 8px', color: pCfg.color, fontSize: '11px', fontWeight: 600 }}>
                      {pCfg.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>Par {authorName}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>{dayjs(ticket.createdAt).format('DD/MM/YYYY')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <Btn onClick={() => { dispatch(setSelectedTicket(ticket)); dispatch(setEditTicketDialog(true)) }} icon={<HiPencil size={13} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />
                  <Btn onClick={() => dispatch(deleteTicket(ticket.documentId))} icon={<HiTrash size={13} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Supprimer" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {newTicketDialog && <ModalNewTicket />}
      {editTicketDialog && <ModalEditTicket />}
    </Container>
  );
};

export default TicketsList;
