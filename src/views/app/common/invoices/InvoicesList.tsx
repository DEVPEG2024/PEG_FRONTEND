import { Container, EmptyState } from '@/components/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Invoice } from '@/@types/invoice';
import { injectReducer, useAppDispatch, useAppSelector as useRootAppSelector, RootState } from '@/store';
import reducer, { deleteInvoice, getInvoices, setEditInvoiceDialog, setPrintInvoiceDialog, setSelectedInvoice, updateInvoice, useAppSelector } from './store';
import ModalEditInvoice from './modals/ModalEditInvoice';
import ModalPrintInvoice from './modals/ModalPrintInvoice';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import dayjs from 'dayjs';
import { HiOutlineSearch, HiPencil, HiPrinter, HiBan, HiDocumentText, HiTrash, HiCreditCard } from 'react-icons/hi';
import { stateData } from './constants';

injectReducer('invoices', reducer);

const STATE_CFG: Record<string, { label: string; bg: string; border: string; color: string }> = {
  pending:   { label: 'En attente', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)',  color: '#fbbf24' },
  fulfilled: { label: 'Payée',      bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#4ade80' },
  canceled:  { label: 'Annulée',    bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  color: '#f87171' },
}
const PAY_CFG: Record<string, { label: string; bg: string; color: string; border?: string }> = {
  fulfilled:        { label: 'Payé',                  bg: 'rgba(34,197,94,0.1)',   color: '#4ade80' },
  pending:          { label: 'Non payé',              bg: 'rgba(239,68,68,0.1)',   color: '#f87171' },
  pending_transfer: { label: '⏳ Virement en attente', bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.4)' },
}
const initials = (name: string) => name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title, disabled }: any) => (
  <button title={title} onClick={onClick} disabled={disabled}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder } }}
    onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}
  >{icon}</button>
)

const TAB_STATES = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'fulfilled', label: 'Payées' },
  { key: 'canceled', label: 'Annulées' },
]

const InvoicesList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { user }: { user: User } = useRootAppSelector((state: RootState) => state.auth.user);
  const isAdmin: boolean = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const { invoices, total, loading, selectedInvoice, editInvoiceDialog, printInvoiceDialog } = useAppSelector((state) => state.invoices.data);

  useEffect(() => {
    dispatch(getInvoices({ request: { pagination: { page: currentPage, pageSize }, searchTerm }, user }));
  }, [currentPage, searchTerm]);

  const filtered = invoices.filter((inv) => activeTab === 'all' || inv.state === activeTab);
  const tabCount = (key: string) => key === 'all' ? invoices.length : invoices.filter((i) => i.state === key).length;

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ paddingTop: '28px', paddingBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Finance</p>
        <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Factures <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
        </h2>
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.07)' }}>
          {TAB_STATES.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '6px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600, background: activeTab === tab.key ? 'rgba(47,111,237,0.2)' : 'transparent', color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.6)', transition: 'all 0.15s' }}
            >
              {tab.label}
              <span style={{ marginLeft: '5px', background: activeTab === tab.key ? 'rgba(47,111,237,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: '100px', padding: '1px 6px', fontSize: '10px', color: activeTab === tab.key ? '#6b9eff' : 'rgba(255,255,255,0.55)' }}>
                {tabCount(tab.key)}
              </span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '340px' }}>
          <HiOutlineSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
          <input type="text" placeholder="Rechercher une facture…" value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '8px 14px 8px 33px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '68px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucune facture"
          description="Aucune facture à afficher pour le moment"
          icon={<HiDocumentText size={48} />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {filtered.map((inv: Invoice) => {
            const stateCfg = STATE_CFG[inv.state] ?? STATE_CFG.pending
            const payCfg = PAY_CFG[inv.paymentState] ?? PAY_CFG.pending
            const customerName = inv.customer?.name ?? '—'
            return (
              <div key={inv.documentId}
                style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                {/* Icon */}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HiDocumentText size={20} style={{ color: '#6b9eff' }} />
                </div>

                {/* Ref + Client */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', fontFamily: 'monospace' }}>{inv.name}</span>
                    <span style={{ background: stateCfg.bg, border: `1px solid ${stateCfg.border}`, borderRadius: '100px', padding: '1px 8px', color: stateCfg.color, fontSize: '11px', fontWeight: 700 }}>{stateCfg.label}</span>
                    <span style={{ background: payCfg.bg, border: payCfg.border ? `1px solid ${payCfg.border}` : 'none', borderRadius: '100px', padding: '1px 8px', color: payCfg.color, fontSize: '11px', fontWeight: 600 }}>{payCfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                      <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(customerName)}</span>
                      {customerName}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{dayjs(inv.date).format('DD/MM/YYYY')}</span>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{inv.totalAmount?.toFixed(2)} €</div>
                  {inv.vatAmount > 0 && <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>dont TVA {inv.vatAmount?.toFixed(2)} €</div>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center' }}>
                  <Btn onClick={() => { dispatch(setSelectedInvoice(inv)); dispatch(setPrintInvoiceDialog(true)) }} icon={<HiPrinter size={13} />} hoverBg="rgba(107,158,255,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(107,158,255,0.4)" title="Imprimer" />
                  {!isAdmin && inv.state !== 'canceled' && inv.paymentState !== 'fulfilled' && (
                    <button
                      onClick={() => navigate(`/customer/invoice/${inv.documentId}/virement`)}
                      title="Payer par virement"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '30px', padding: '0 10px', borderRadius: '8px', background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.3)', cursor: 'pointer', color: '#6b9eff', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(47,111,237,0.22)'; e.currentTarget.style.borderColor = 'rgba(47,111,237,0.5)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(47,111,237,0.12)'; e.currentTarget.style.borderColor = 'rgba(47,111,237,0.3)' }}
                    >
                      <HiCreditCard size={13} /> Payer par virement
                    </button>
                  )}
                  {isAdmin && <Btn onClick={() => { dispatch(setSelectedInvoice(inv)); dispatch(setEditInvoiceDialog(true)) }} icon={<HiPencil size={13} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />}
                  {isAdmin && <Btn onClick={() => dispatch(updateInvoice({ documentId: inv.documentId, state: 'canceled' }))} icon={<HiBan size={13} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Annuler" disabled={inv.state === 'canceled'} />}
                  {isAdmin && <Btn onClick={() => { if (window.confirm(`Supprimer définitivement la facture ${inv.name} ?`)) dispatch(deleteInvoice(inv.documentId)) }} icon={<HiTrash size={13} />} hoverBg="rgba(239,68,68,0.15)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.4)" title="Supprimer" />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isAdmin && selectedInvoice && editInvoiceDialog && (
        <ModalEditInvoice editInvoiceDialog={editInvoiceDialog} selectedInvoice={selectedInvoice} setEditInvoiceDialog={setEditInvoiceDialog} setSelectedInvoice={setSelectedInvoice} updateInvoice={updateInvoice} dispatch={dispatch} loading={loading} />
      )}
      {selectedInvoice && printInvoiceDialog && (
        <ModalPrintInvoice printInvoiceDialog={printInvoiceDialog} selectedInvoice={selectedInvoice} setPrintInvoiceDialog={setPrintInvoiceDialog} setSelectedInvoice={setSelectedInvoice} dispatch={dispatch} />
      )}
    </Container>
  );
};

export default InvoicesList;
