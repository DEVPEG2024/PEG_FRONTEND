import { useEffect, useState } from 'react';
import { PromoCode } from '@/@types/promoCode';
import {
  apiGetPromoCodes,
  apiCreatePromoCode,
  apiUpdatePromoCode,
  apiDeletePromoCode,
  GetPromoCodesResponse,
} from '@/services/PromoCodeServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Container } from '@/components/shared';
import { toast } from 'react-toastify';
import { HiPlus, HiPencil, HiTrash, HiX, HiCheck, HiTag } from 'react-icons/hi';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui';

type PromoFormData = {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  validFrom: string;
  validUntil: string;
  minOrderAmount: string;
  active: boolean;
};

const emptyForm: PromoFormData = {
  code: '',
  discountType: 'percentage',
  discountValue: '',
  validFrom: '',
  validUntil: '',
  minOrderAmount: '',
  active: true,
};

const discountTypeOptions = [
  { value: 'percentage', label: 'Pourcentage (%)' },
  { value: 'fixed', label: 'Montant fixe (€)' },
];

const rowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600,
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em',
};

function PromoCodesList() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPromoCodes = async () => {
    setLoading(true);
    try {
      const { promoCodes_connection }: { promoCodes_connection: GetPromoCodesResponse } =
        await unwrapData(apiGetPromoCodes());
      setPromoCodes(promoCodes_connection.nodes || []);
    } catch {
      toast.error('Erreur lors du chargement des codes promo');
    }
    setLoading(false);
  };

  useEffect(() => { fetchPromoCodes(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditingId(promo.documentId);
    setForm({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      validFrom: promo.validFrom ? promo.validFrom.slice(0, 16) : '',
      validUntil: promo.validUntil ? promo.validUntil.slice(0, 16) : '',
      minOrderAmount: promo.minOrderAmount ? String(promo.minOrderAmount) : '',
      active: promo.active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.discountValue) {
      toast.error('Code et valeur de remise requis');
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        code: form.code.toUpperCase().trim(),
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        active: form.active,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
      };
      if (editingId) {
        await apiUpdatePromoCode(editingId, data);
        toast.success('Code promo mis a jour');
      } else {
        await apiCreatePromoCode(data);
        toast.success('Code promo cree');
      }
      setShowModal(false);
      fetchPromoCodes();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Supprimer ce code promo ?')) return;
    try {
      await apiDeletePromoCode(documentId);
      toast.success('Code promo supprime');
      fetchPromoCodes();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      await apiUpdatePromoCode(promo.documentId, { active: !promo.active });
      fetchPromoCodes();
    } catch {
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ paddingTop: '28px', paddingBottom: '20px' }}>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
          Boutique
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HiTag size={22} style={{ color: '#6b9eff' }} />
            Codes promo
          </h2>
          <button type="button" onClick={openCreate} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
            fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 14px rgba(47,111,237,0.35)',
          }}>
            <HiPlus size={15} /> Nouveau code
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        border: '1.5px solid rgba(255,255,255,0.07)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr 100px',
          padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: '8px',
        }}>
          {['Code', 'Type', 'Valeur', 'Expiration', 'Min. cmd', 'Actif', 'Actions'].map((h) => (
            <span key={h} style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
            Chargement...
          </div>
        ) : promoCodes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
            Aucun code promo
          </div>
        ) : (
          promoCodes.map((promo, i) => (
            <div key={promo.documentId} style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.8fr 0.6fr 100px',
              padding: '12px 20px', alignItems: 'center', gap: '8px',
              borderBottom: i < promoCodes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                {promo.code}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                {promo.discountType === 'percentage' ? 'Pourcentage' : 'Montant fixe'}
              </span>
              <span style={{ color: '#6b9eff', fontSize: '13px', fontWeight: 700 }}>
                {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `${promo.discountValue} €`}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                {formatDate(promo.validUntil)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                {promo.minOrderAmount ? `${promo.minOrderAmount} €` : '—'}
              </span>
              <div>
                <button type="button" onClick={() => handleToggleActive(promo)} style={{
                  width: '28px', height: '16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: promo.active ? '#22c55e' : 'rgba(255,255,255,0.1)',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: '2px',
                    left: promo.active ? '14px' : '2px', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" onClick={() => openEdit(promo)} style={{
                  padding: '6px', background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.2)',
                  borderRadius: '8px', color: '#6b9eff', cursor: 'pointer', display: 'flex',
                }}>
                  <HiPencil size={14} />
                </button>
                <button type="button" onClick={() => handleDelete(promo.documentId)} style={{
                  padding: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '8px', color: '#ef4444', cursor: 'pointer', display: 'flex',
                }}>
                  <HiTrash size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'linear-gradient(160deg, #1a2f4e 0%, #111d30 100%)',
            border: '1.5px solid rgba(255,255,255,0.1)',
            borderRadius: '18px', padding: '24px 28px', width: '480px', maxWidth: '90vw',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
                {editingId ? 'Modifier le code promo' : 'Nouveau code promo'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex',
              }}>
                <HiX size={18} />
              </button>
            </div>

            {/* Code */}
            <div style={{ marginBottom: '12px' }}>
              <div style={labelStyle}>Code</div>
              <Input
                type="text"
                value={form.code}
                onChange={(e: any) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="EX: PROMO2026"
                style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}
              />
            </div>

            {/* Type + Value */}
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Type de remise</div>
                <Select
                  options={discountTypeOptions}
                  value={discountTypeOptions.find((o) => o.value === form.discountType)}
                  onChange={(opt: any) => setForm({ ...form, discountType: opt.value })}
                />
              </div>
              <div>
                <div style={labelStyle}>Valeur</div>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e: any) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === 'percentage' ? 'Ex: 10' : 'Ex: 50'}
                />
              </div>
            </div>

            {/* Dates */}
            <div style={rowStyle}>
              <div>
                <div style={labelStyle}>Valide a partir du</div>
                <Input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e: any) => setForm({ ...form, validFrom: e.target.value })}
                />
              </div>
              <div>
                <div style={labelStyle}>Expire le</div>
                <Input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e: any) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
            </div>

            {/* Min amount */}
            <div style={{ marginBottom: '16px' }}>
              <div style={labelStyle}>Montant minimum de commande (€)</div>
              <Input
                type="number"
                value={form.minOrderAmount}
                onChange={(e: any) => setForm({ ...form, minOrderAmount: e.target.value })}
                placeholder="Optionnel"
              />
            </div>

            {/* Active toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px',
            }}>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Actif</span>
              <button type="button" onClick={() => setForm({ ...form, active: !form.active })} style={{
                width: '36px', height: '20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                background: form.active ? '#22c55e' : 'rgba(255,255,255,0.1)',
                position: 'relative', transition: 'background 0.2s',
              }}>
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '2px',
                  left: form.active ? '18px' : '2px', transition: 'left 0.2s',
                }} />
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{
                padding: '10px 20px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>
                Annuler
              </button>
              <button type="button" onClick={handleSave} disabled={saving} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 22px',
                background: saving ? 'rgba(34,197,94,0.4)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
                border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
                fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 4px 14px rgba(34,197,94,0.35)',
                fontFamily: 'Inter, sans-serif',
              }}>
                <HiCheck size={15} />
                {saving ? 'Enregistrement...' : editingId ? 'Mettre a jour' : 'Creer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

export default PromoCodesList;
