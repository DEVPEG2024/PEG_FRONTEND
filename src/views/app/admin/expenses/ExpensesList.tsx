import { Container, EmptyState } from '@/components/shared';
import { useEffect, useState } from 'react';
import { injectReducer } from '@/store';
import reducer, {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  setEditDialog,
  setSelectedExpense,
  useAppSelector,
  useAppDispatch,
} from './store';
import { Expense, ExpenseCategory } from '@/@types/expense';
import ModalEditExpense from './ModalEditExpense';
import dayjs from 'dayjs';
import {
  HiOutlineSearch,
  HiPencil,
  HiTrash,
  HiPlus,
  HiDocumentText,
  HiExternalLink,
} from 'react-icons/hi';
import {
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';

injectReducer('expenses', reducer);

const CAT_CFG: Record<ExpenseCategory, { label: string; color: string; bg: string; border: string }> = {
  supplier:      { label: 'Fournisseur',  color: '#6b9eff', bg: 'rgba(107,158,255,0.12)', border: 'rgba(107,158,255,0.3)' },
  subcontractor: { label: 'Sous-traitance', color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)' },
  logistics:     { label: 'Logistique',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)' },
  subscription:  { label: 'Abonnement',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)' },
  other:         { label: 'Divers',       color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'A payer',   color: '#fbbf24', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)' },
  paid:    { label: 'Payée',     color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  overdue: { label: 'En retard', color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
};

const TAB_STATES = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'A payer' },
  { key: 'paid', label: 'Payées' },
  { key: 'overdue', label: 'En retard' },
];

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title }: any) => (
  <button title={title} onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
  >{icon}</button>
);

const resolveUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_ENDPOINT_URL || ''}${url}`;
};

const ExpensesList = () => {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(1000);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { expenses, total, loading, selectedExpense, editDialog } = useAppSelector((state) => state.expenses.data);

  useEffect(() => {
    dispatch(getExpenses({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, searchTerm]);

  const filtered = expenses.filter((e) => activeTab === 'all' || e.status === activeTab);
  const tabCount = (key: string) => key === 'all' ? expenses.length : expenses.filter((e) => e.status === key).length;

  // KPI
  const totalExpenses = expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const totalPaid = expenses.filter((e) => e.status === 'paid').reduce((s, e) => s + (e.totalAmount || 0), 0);
  const totalPending = expenses.filter((e) => e.status === 'pending').reduce((s, e) => s + (e.totalAmount || 0), 0);
  const totalOverdue = expenses.filter((e) => e.status === 'overdue').reduce((s, e) => s + (e.totalAmount || 0), 0);

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleOpenCreate = () => {
    dispatch(setSelectedExpense(null));
    dispatch(setEditDialog(true));
  };
  const handleOpenEdit = (e: Expense) => {
    dispatch(setSelectedExpense(e));
    dispatch(setEditDialog(true));
  };
  const handleClose = () => {
    dispatch(setEditDialog(false));
    dispatch(setSelectedExpense(null));
  };
  const handleSave = (data: any) => {
    if (data.documentId) {
      dispatch(updateExpense(data));
    } else {
      dispatch(createExpense(data));
    }
  };
  const handleDelete = (e: Expense) => {
    if (window.confirm(`Supprimer la dépense "${e.label}" ?`)) {
      dispatch(deleteExpense(e.documentId));
    }
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ paddingTop: '28px', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Finance</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Dépenses <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={handleOpenCreate}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '12px', padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', fontFamily: 'Inter, sans-serif' }}
        >
          <HiPlus size={16} /> Nouvelle dépense
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total dépenses', value: fmt(totalExpenses), icon: <HiOutlineBanknotes size={20} />, color: '#6b9eff' },
          { label: 'Payé', value: fmt(totalPaid), icon: <HiOutlineCheckCircle size={20} />, color: '#4ade80' },
          { label: 'A payer', value: fmt(totalPending), icon: <HiOutlineClock size={20} />, color: '#fbbf24' },
          { label: 'En retard', value: fmt(totalOverdue), icon: <HiOutlineExclamationTriangle size={20} />, color: '#f87171' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ color: kpi.color }}>{kpi.icon}</div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 }}>{kpi.label}</span>
            </div>
            <div style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>{kpi.value} <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>EUR</span></div>
          </div>
        ))}
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
          <input type="text" placeholder="Rechercher une dépense..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '8px 14px 8px 33px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '68px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucune dépense"
          description="Aucune dépense enregistrée pour le moment"
          icon={<HiOutlineBanknotes size={48} />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {filtered.map((exp: Expense) => {
            const cat = CAT_CFG[exp.category] ?? CAT_CFG.other;
            const status = STATUS_CFG[exp.status] ?? STATUS_CFG.pending;
            return (
              <div key={exp.documentId}
                style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                {/* Icon */}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HiOutlineBanknotes size={20} style={{ color: '#f87171' }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{exp.label}</span>
                    <span style={{ background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: '100px', padding: '1px 8px', color: cat.color, fontSize: '11px', fontWeight: 700 }}>{cat.label}</span>
                    <span style={{ background: status.bg, border: `1px solid ${status.border}`, borderRadius: '100px', padding: '1px 8px', color: status.color, fontSize: '11px', fontWeight: 700 }}>{status.label}</span>
                    {exp.receipt && (
                      <a href={resolveUrl(exp.receipt.url)} target="_blank" rel="noreferrer" title="Voir justificatif"
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textDecoration: 'none' }}
                      >
                        <HiDocumentText size={13} /> <HiExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {exp.supplierName && (
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{exp.supplierName}</span>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>{dayjs(exp.date).format('DD/MM/YYYY')}</span>
                    {exp.dueDate && (
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Ech. {dayjs(exp.dueDate).format('DD/MM/YYYY')}</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#f87171', fontWeight: 700, fontSize: '15px' }}>-{fmt(exp.totalAmount)} <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>TTC</span></div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{fmt(exp.amount)} EUR HT</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0, alignItems: 'center' }}>
                  <Btn onClick={() => handleOpenEdit(exp)} icon={<HiPencil size={13} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />
                  <Btn onClick={() => handleDelete(exp)} icon={<HiTrash size={13} />} hoverBg="rgba(239,68,68,0.15)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Supprimer" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {editDialog && (
        <ModalEditExpense
          open={editDialog}
          expense={selectedExpense}
          onClose={handleClose}
          onSave={handleSave}
          loading={loading}
        />
      )}
    </Container>
  );
};

export default ExpensesList;
