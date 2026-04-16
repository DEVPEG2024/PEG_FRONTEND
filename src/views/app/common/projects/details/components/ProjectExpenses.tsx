import { useEffect, useState } from 'react';
import Container from '@/components/shared/Container';
import Empty from '@/components/shared/Empty';
import DetailsRight from './DetailsRight';
import ModalEditExpense from '@/views/app/admin/expenses/ModalEditExpense';
import { Expense, ExpenseCategory } from '@/@types/expense';
import { apiGetExpenses, apiCreateExpense, apiUpdateExpense, apiDeleteExpense } from '@/services/ExpenseServices';
import { unwrapData } from '@/utils/serviceHelper';
import { useAppSelector } from '../store';
import dayjs from 'dayjs';
import { HiPencil, HiTrash, HiPlus, HiDocumentText, HiExternalLink } from 'react-icons/hi';
import { HiOutlineBanknotes } from 'react-icons/hi2';
import { GoTasklist } from 'react-icons/go';

const CAT_CFG: Record<ExpenseCategory, { label: string; color: string; bg: string; border: string }> = {
  supplier:      { label: 'Fournisseur',    color: '#6b9eff', bg: 'rgba(107,158,255,0.12)', border: 'rgba(107,158,255,0.3)' },
  subcontractor: { label: 'Sous-traitance', color: '#c084fc', bg: 'rgba(192,132,252,0.12)', border: 'rgba(192,132,252,0.3)' },
  logistics:     { label: 'Logistique',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)' },
  subscription:  { label: 'Abonnement',     color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)' },
  other:         { label: 'Divers',         color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)' },
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'A payer',   color: '#fbbf24', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.3)' },
  paid:    { label: 'Payée',     color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)' },
  overdue: { label: 'En retard', color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)' },
};

const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const resolveUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${import.meta.env.VITE_API_ENDPOINT_URL || ''}${url}`;
};

const iconBtn = (danger = false): React.CSSProperties => ({
  width: '30px', height: '30px', borderRadius: '8px', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.06)',
  color: danger ? '#f87171' : 'rgba(255,255,255,0.55)',
  transition: 'background 0.15s',
});

const ProjectExpenses = () => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    if (!project?.documentId) return;
    setLoading(true);
    try {
      const { expenses_connection } = await unwrapData(
        apiGetExpenses({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })
      );
      // Filter expenses linked to this project
      const projectExpenses = expenses_connection.nodes.filter(
        (e: Expense) => e.project?.documentId === project.documentId
      );
      setExpenses(projectExpenses);
    } catch (err) {
      console.error('[ProjectExpenses] fetch error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [project?.documentId]);

  const handleOpenCreate = () => {
    setSelectedExpense(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (e: Expense) => {
    setSelectedExpense(e);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedExpense(null);
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    try {
      // Force link to current project
      const payload = {
        ...data,
        project: { documentId: project?.documentId },
      };
      if (data.documentId) {
        await unwrapData(apiUpdateExpense(payload));
      } else {
        delete payload.documentId;
        await unwrapData(apiCreateExpense(payload));
      }
      handleClose();
      await fetchExpenses();
    } catch (err) {
      console.error('[ProjectExpenses] save error:', err);
    }
    setSaving(false);
  };

  const handleDelete = async (e: Expense) => {
    if (!window.confirm(`Supprimer la dépense "${e.label}" ?`)) return;
    try {
      await unwrapData(apiDeleteExpense(e.documentId));
      await fetchExpenses();
    } catch (err) {
      console.error('[ProjectExpenses] delete error:', err);
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + (e.totalAmount || 0), 0);
  const margin = (project?.price || 0) - totalExpenses - Math.max(project?.producerPrice || 0, project?.producerPaidPrice || 0);

  return (
    <Container className="h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingTop: '20px', paddingBottom: '20px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        }}>
          {/* Header + KPI */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                Dépenses du projet
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>({expenses.length})</span>
              </h3>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  Total : <strong style={{ color: '#f87171' }}>-{fmt(totalExpenses)} EUR</strong>
                </span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                  Marge réelle : <strong style={{ color: margin >= 0 ? '#4ade80' : '#f87171' }}>{fmt(margin)} EUR</strong>
                </span>
              </div>
            </div>
            <button onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '10px', padding: '8px 16px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', fontFamily: 'Inter, sans-serif' }}
            >
              <HiPlus size={14} /> Ajouter
            </button>
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', height: '56px', border: '1px solid rgba(255,255,255,0.06)' }} />
              ))
            ) : expenses.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <Empty icon={<GoTasklist size={80} style={{ color: 'rgba(255,255,255,0.12)' }} />}>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', marginTop: '12px' }}>Aucune dépense liée à ce projet</p>
                </Empty>
              </div>
            ) : (
              expenses.map((exp) => {
                const cat = CAT_CFG[exp.category] ?? CAT_CFG.other;
                const status = STATUS_CFG[exp.status] ?? STATUS_CFG.pending;
                return (
                  <div key={exp.documentId} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <HiOutlineBanknotes size={16} style={{ color: '#f87171', flexShrink: 0 }} />
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exp.label}
                      </span>
                      <span style={{ background: cat.bg, border: `1px solid ${cat.border}`, borderRadius: '100px', padding: '1px 7px', color: cat.color, fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{cat.label}</span>
                      <span style={{ background: status.bg, border: `1px solid ${status.border}`, borderRadius: '100px', padding: '1px 7px', color: status.color, fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{status.label}</span>
                      {exp.supplierName && (
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', flexShrink: 0 }}>{exp.supplierName}</span>
                      )}
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', flexShrink: 0 }}>{dayjs(exp.date).format('DD/MM/YYYY')}</span>
                      {exp.receipt && (
                        <a href={resolveUrl(exp.receipt.url)} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
                          <HiDocumentText size={12} /> <HiExternalLink size={9} />
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: '100px', padding: '3px 10px',
                          color: '#f87171', fontSize: '12px', fontWeight: 700,
                        }}>
                          -{fmt(exp.totalAmount)} EUR TTC
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                          {fmt(exp.amount)} EUR HT
                        </span>
                      </div>
                      <button style={iconBtn()} onClick={() => handleOpenEdit(exp)}>
                        <HiPencil size={14} />
                      </button>
                      <button style={iconBtn(true)} onClick={() => handleDelete(exp)}>
                        <HiTrash size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <DetailsRight />
      </div>

      {modalOpen && (
        <ModalEditExpense
          open={modalOpen}
          expense={selectedExpense}
          onClose={handleClose}
          onSave={handleSave}
          loading={saving}
        />
      )}
    </Container>
  );
};

export default ProjectExpenses;
