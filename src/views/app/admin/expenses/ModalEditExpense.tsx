import { useState, useRef } from 'react';
import { HiX, HiCheck, HiUpload, HiDocumentText } from 'react-icons/hi';
import { Expense, ExpenseCategory, ExpenseStatus } from '@/@types/expense';
import { apiUploadFile } from '@/services/FileServices';
import dayjs from 'dayjs';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'supplier', label: 'Fournisseur matériel' },
  { value: 'subcontractor', label: 'Sous-traitance' },
  { value: 'logistics', label: 'Logistique / transport' },
  { value: 'subscription', label: 'Abonnement' },
  { value: 'other', label: 'Divers' },
];

const STATUSES: { value: ExpenseStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'A payer', color: '#fbbf24' },
  { value: 'paid', label: 'Payée', color: '#4ade80' },
  { value: 'overdue', label: 'En retard', color: '#f87171' },
];

const TVA_RATE = 0.20;

const modalStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

type Props = {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
  onSave: (data: any) => void;
  loading: boolean;
};

export default function ModalEditExpense({ open, expense, onClose, onSave, loading }: Props) {
  const isEdit = !!expense;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    label: expense?.label ?? '',
    description: expense?.description ?? '',
    amount: expense?.amount ?? 0,
    vatAmount: expense?.vatAmount ?? 0,
    totalAmount: expense?.totalAmount ?? 0,
    category: expense?.category ?? 'supplier' as ExpenseCategory,
    status: expense?.status ?? 'pending' as ExpenseStatus,
    date: expense?.date ?? dayjs().format('YYYY-MM-DD'),
    dueDate: expense?.dueDate ?? dayjs().add(30, 'day').format('YYYY-MM-DD'),
    paidDate: expense?.paidDate ?? '',
    supplierName: expense?.supplierName ?? '',
    receipt: expense?.receipt ?? null as { documentId: string; url: string; name: string } | null,
  });

  const [vatEnabled, setVatEnabled] = useState((expense?.vatAmount ?? 0) > 0);

  const updateAmount = (ht: number, withVat: boolean) => {
    const vat = withVat ? Math.round(ht * TVA_RATE * 100) / 100 : 0;
    setForm((f) => ({ ...f, amount: ht, vatAmount: vat, totalAmount: ht + vat }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await apiUploadFile(file);
      // Stocker l'id numérique (pour REST media link) ET le documentId
      setForm((f) => ({
        ...f,
        receipt: { documentId: (uploaded as any).id?.toString() ?? uploaded.documentId, url: (uploaded as any).url, name: uploaded.name ?? file.name },
      }));
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || form.amount <= 0) return;
    const payload: any = {
      ...form,
      project: null,
    };
    if (isEdit) payload.documentId = expense!.documentId;
    onSave(payload);
  };

  if (!open) return null;

  const labelStyle: React.CSSProperties = {
    fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', fontWeight: 500, letterSpacing: '0.3px', display: 'block',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
    padding: '10px 14px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, appearance: 'none' as const, cursor: 'pointer',
  };

  return (
    <>
      <style>{modalStyles}</style>
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.25s ease-out' }}
        onClick={onClose}
      >
        <div
          style={{ background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)', borderRadius: '20px', padding: '36px', width: '95%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', animation: 'slideUp 0.35s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
                {isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'}
              </h2>
              {isEdit && <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>{expense!.label}</span>}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}>
              <HiX size={20} />
            </button>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: '28px' }} />

          <form onSubmit={handleSubmit}>
            {/* Row 1: Label + Fournisseur */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Libellé *</label>
                <input style={inputStyle} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex: Achat tissu polyester" />
              </div>
              <div>
                <label style={labelStyle}>Fournisseur</label>
                <input style={inputStyle} value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="Ex: Imbretex, Amazon..." />
              </div>
            </div>

            {/* Row 2: Catégorie + Statut */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Catégorie</label>
                <select style={selectStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Statut</label>
                <select style={selectStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ExpenseStatus })}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" style={inputStyle} value={form.date ? dayjs(form.date).format('YYYY-MM-DD') : ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Echéance</label>
                <input type="date" style={inputStyle} value={form.dueDate ? dayjs(form.dueDate).format('YYYY-MM-DD') : ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Date de paiement</label>
                <input type="date" style={inputStyle} value={form.paidDate ? dayjs(form.paidDate).format('YYYY-MM-DD') : ''} onChange={(e) => setForm({ ...form, paidDate: e.target.value })} />
              </div>
            </div>

            {/* Row 4: Montant + TVA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', marginBottom: '16px', alignItems: 'end' }}>
              <div>
                <label style={labelStyle}>Montant HT (EUR) *</label>
                <input type="number" step="0.01" min="0" style={inputStyle} value={form.amount || ''} onChange={(e) => { const v = parseFloat(e.target.value) || 0; updateAmount(v, vatEnabled); }} placeholder="0.00" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
                <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={vatEnabled} onChange={(e) => { setVatEnabled(e.target.checked); updateAmount(form.amount, e.target.checked); }} style={{ accentColor: '#3b82f6' }} />
                  TVA 20%
                </label>
              </div>
            </div>

            {/* Totaux */}
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>HT</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{form.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR</span>
              </div>
              {vatEnabled && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>TVA (20%)</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{form.vatAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR</span>
                </div>
              )}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>Total TTC</span>
                <span style={{ fontSize: '15px', color: '#f87171', fontWeight: 700 }}>{form.totalAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} EUR</span>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Description / notes</label>
              <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Notes libres..." />
            </div>

            {/* Justificatif */}
            <div style={{ marginBottom: '28px' }}>
              <label style={labelStyle}>Justificatif (PDF / image)</label>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleFileUpload} />
              {form.receipt ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' }}>
                  <HiDocumentText size={18} style={{ color: '#6b9eff', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.receipt.name}</span>
                  <button type="button" onClick={() => setForm({ ...form, receipt: null })} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}>Retirer</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px 18px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                >
                  <HiUpload size={16} />
                  {uploading ? 'Upload en cours...' : 'Ajouter un justificatif'}
                </button>
              )}
            </div>

            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)', marginBottom: '24px' }} />

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px 24px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <HiX size={16} /> Annuler
              </button>
              <button type="submit" disabled={loading || !form.label.trim() || form.amount <= 0}
                style={{ background: loading ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '12px', padding: '10px 28px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: loading ? 'none' : '0 4px 15px rgba(59,130,246,0.3)', opacity: loading ? 0.7 : 1 }}
              >
                <HiCheck size={18} />
                {loading ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
