import { useCallback, useEffect, useState } from 'react';
import { AdditionalSale } from '@/@types/project';
import { useAppSelector } from '../store';
import { apiGetProjectAdditionalSales, apiUpdateProjectAdditionalSales } from '@/services/ProjectServices';
import { toast } from 'react-toastify';
import { HiPlus, HiTrash, HiPencil, HiCheck, HiX } from 'react-icons/hi';
import { fmtPrice } from '@/utils/priceHelpers';
import DetailsRight from './DetailsRight';
import dayjs from 'dayjs';

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '11px',
  fontWeight: 600,
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '13px',
  padding: '8px 12px',
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
};

type FormData = {
  label: string;
  amount: string;
  date: string;
  note: string;
};

const emptyForm: FormData = { label: '', amount: '', date: dayjs().format('YYYY-MM-DD'), note: '' };

const AdditionalSales = () => {
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const [sales, setSales] = useState<AdditionalSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSales = useCallback(async () => {
    if (!project?.documentId) return;
    setLoading(true);
    try {
      const res = await apiGetProjectAdditionalSales(project.documentId);
      const data = res.data?.data?.project?.additionalSales;
      setSales(Array.isArray(data) ? data : []);
    } catch {
      setSales([]);
    }
    setLoading(false);
  }, [project?.documentId]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const saveSales = async (updated: AdditionalSale[]) => {
    setSaving(true);
    try {
      await apiUpdateProjectAdditionalSales(project.documentId, updated);
      setSales(updated);
      toast.success('Ventes additionnelles mises a jour');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const handleAdd = async () => {
    if (!form.label.trim() || !form.amount) {
      toast.error('Libelle et montant requis');
      return;
    }
    const newSale: AdditionalSale = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      label: form.label.trim(),
      amount: parseFloat(form.amount),
      date: form.date || dayjs().format('YYYY-MM-DD'),
      note: form.note.trim() || undefined,
    };
    await saveSales([...sales, newSale]);
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !form.label.trim() || !form.amount) {
      toast.error('Libelle et montant requis');
      return;
    }
    const updated = sales.map((s) =>
      s.id === editingId
        ? { ...s, label: form.label.trim(), amount: parseFloat(form.amount), date: form.date, note: form.note.trim() || undefined }
        : s
    );
    await saveSales(updated);
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette vente additionnelle ?')) return;
    await saveSales(sales.filter((s) => s.id !== id));
  };

  const startEdit = (sale: AdditionalSale) => {
    setEditingId(sale.id);
    setForm({
      label: sale.label,
      amount: String(sale.amount),
      date: sale.date,
      note: sale.note || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const total = sales.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', padding: '20px 0', fontFamily: 'Inter, sans-serif' }}>
      {/* Left — sales list */}
      <div>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
              Ventes additionnelles
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '2px 0 0' }}>
              Ventes en cours de projet, hors devis initial
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 14px rgba(47,111,237,0.35)',
              }}
            >
              <HiPlus size={14} /> Ajouter
            </button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '18px 20px', marginBottom: '16px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <div style={labelStyle}>Libelle *</div>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Ex: Impression supplement"
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>Montant HT *</div>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={labelStyle}>Date</div>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={labelStyle}>Note (optionnel)</div>
                <input
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Precision..."
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={cancelForm} style={{
                padding: '8px 16px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <HiX size={13} /> Annuler
              </button>
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                disabled={saving}
                style={{
                  padding: '8px 18px',
                  background: saving ? 'rgba(34,197,94,0.4)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                  border: 'none', borderRadius: '8px', color: '#fff',
                  fontSize: '12px', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', gap: '4px',
                  boxShadow: saving ? 'none' : '0 4px 12px rgba(34,197,94,0.3)',
                }}
              >
                <HiCheck size={13} /> {editingId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1.5px solid rgba(255,255,255,0.07)',
          borderRadius: '16px', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 1fr 80px',
            padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '8px',
          }}>
            {['Libelle', 'Montant', 'Date', 'Note', 'Actions'].map((h) => (
              <span key={h} style={{
                color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
              Chargement...
            </div>
          ) : sales.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
              Aucune vente additionnelle
            </div>
          ) : (
            <>
              {sales.map((sale, i) => (
                <div
                  key={sale.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 1fr 80px',
                    padding: '10px 18px', alignItems: 'center', gap: '8px',
                    borderBottom: i < sales.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                    {sale.label}
                  </span>
                  <span style={{ color: '#6b9eff', fontSize: '13px', fontWeight: 700 }}>
                    {fmtPrice(sale.amount)}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                    {dayjs(sale.date).format('DD/MM/YYYY')}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sale.note || '—'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => startEdit(sale)} style={{
                      padding: '5px', background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.2)',
                      borderRadius: '6px', color: '#6b9eff', cursor: 'pointer', display: 'flex',
                    }}>
                      <HiPencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(sale.id)} style={{
                      padding: '5px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '6px', color: '#ef4444', cursor: 'pointer', display: 'flex',
                    }}>
                      <HiTrash size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {/* Total row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 1fr 80px',
                padding: '12px 18px', gap: '8px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>Total</span>
                <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 800 }}>
                  {fmtPrice(total)}
                </span>
                <span />
                <span />
                <span />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right — project sidebar */}
      <DetailsRight />
    </div>
  );
};

export default AdditionalSales;
