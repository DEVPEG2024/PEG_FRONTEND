import { Container } from '@/components/shared';
import { useEffect, useState } from 'react';
import { Dialog, Select } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  createColor,
  deleteColor,
  getColors,
  updateColor,
  useAppSelector,
} from './store';
import { Color, ProductCategory } from '@/@types/product';
import { HiOutlineSearch, HiPlus, HiTrash, HiPencil, HiX, HiCheck } from 'react-icons/hi';
import { IoColorPaletteOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetProductCategories, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';

injectReducer('colors', reducer);

type Option = { value: string; label: string };

const PALETTE = [
  // Neutres
  '#ffffff', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#292524', '#1c1917', '#000000',
  // Rouges / roses
  '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239',
  '#fce7f3', '#fbcfe8', '#f9a8d4', '#ec4899', '#db2777', '#be185d',
  // Oranges / jaunes
  '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c',
  '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207',
  // Verts
  '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534',
  '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857',
  // Bleus
  '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985',
  '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af',
  '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
  // Violets / mauves
  '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce',
  '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf',
  // Marrons / beiges
  '#fef3c7', '#fde68a', '#d97706', '#92400e', '#78350f',
  '#f5f0eb', '#e8dcc8', '#c8a97e', '#a0785a', '#7c5a3c', '#5c3d1e',
];


const Swatch = ({ hex, size = 20 }: { hex: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: hex || '#888',
    border: '2px solid rgba(255,255,255,0.15)',
    flexShrink: 0,
  }} />
);

const ColorsList = () => {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [productCategories, setProductCategories] = useState<Option[]>([]);
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('#000000');
  const [formDescription, setFormDescription] = useState('');
  const [formCategories, setFormCategories] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);

  const { colors, total, loading } = useAppSelector((state) => state.colors.data);

  useEffect(() => {
    dispatch(getColors({ pagination: { page: 1, pageSize: 1000 }, searchTerm }));
  }, [searchTerm]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { productCategories_connection }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories());
    setProductCategories(
      (productCategories_connection.nodes || []).map((c: ProductCategory) => ({
        value: c.documentId,
        label: c.name,
      }))
    );
  };

  const filtered = colors.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.productCategory?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, { category: ProductCategory | null; colors: Color[] }>>(
    (acc, color) => {
      const key = color.productCategory?.documentId || '__none__';
      if (!acc[key]) acc[key] = { category: color.productCategory || null, colors: [] };
      acc[key].colors.push(color);
      return acc;
    },
    {}
  );

  const openNew = () => {
    setEditingColor(null);
    setFormName('');
    setFormValue('#000000');
    setFormDescription('');
    setFormCategories([]);
    setDialogOpen(true);
  };

  const openEdit = (color: Color) => {
    setEditingColor(color);
    setFormName(color.name);
    setFormValue(color.value || '#000000');
    setFormDescription(color.description || '');
    setFormCategories(
      color.productCategory
        ? [{ value: color.productCategory.documentId, label: color.productCategory.name }]
        : []
    );
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setEditingColor(null); };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Le nom est obligatoire'); return; }
    if (!editingColor && formCategories.length === 0) { toast.error('Sélectionnez au moins une catégorie'); return; }
    setSaving(true);
    try {
      if (editingColor) {
        const result = await dispatch(updateColor({
          documentId: editingColor.documentId,
          name: formName,
          value: formValue,
          description: formDescription,
          productCategory: (formCategories[0]?.value || null) as any,
        }));
        if (result.meta.requestStatus === 'fulfilled') { toast.success('Couleur modifiée'); handleClose(); }
        else toast.error('Erreur lors de la modification');
      } else {
        const results = await Promise.all(
          formCategories.map((cat) =>
            dispatch(createColor({ name: formName, value: formValue, description: formDescription, productCategory: cat.value as any }))
          )
        );
        const allOk = results.every((r) => r.meta.requestStatus === 'fulfilled');
        if (allOk) {
          toast.success(formCategories.length > 1 ? `${formCategories.length} couleurs créées` : 'Couleur créée');
          handleClose();
        } else {
          toast.error('Erreur lors de la création');
        }
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (color: Color) => {
    await dispatch(deleteColor(color.documentId));
    toast.success('Couleur supprimée');
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px',
    fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Produits</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Couleurs <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
          <HiPlus size={16} /> Nouvelle couleur
        </button>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: '28px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Rechercher une couleur ou catégorie…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
        />
      </div>

      {/* Cards par catégorie */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '64px' }}>Chargement…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <IoColorPaletteOutline size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucune couleur</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          {Object.values(grouped).map(({ category, colors: catColors }) => (
            <div key={category?.documentId || '__none__'} style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
              {/* Category header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IoColorPaletteOutline size={16} style={{ color: '#6b9eff' }} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{category?.name || 'Sans catégorie'}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>{catColors.length} couleur{catColors.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Color pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {catColors.map((color) => (
                  <div
                    key={color.documentId}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '5px 10px 5px 7px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  >
                    <Swatch hex={color.value} size={18} />
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{color.name}</span>
                    {color.description && (
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>· {color.description}</span>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: 'monospace' }}>{color.value}</span>
                    <button
                      onClick={() => openEdit(color)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '0 2px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#6b9eff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >
                      <HiPencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(color)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: '0 2px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                    >
                      <HiTrash size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog isOpen={dialogOpen} onClose={handleClose} width={520}>
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
          <h5 style={{ margin: '0 0 20px', color: '#fff', fontSize: '16px', fontWeight: 700 }}>
            {editingColor ? 'Modifier la couleur' : 'Nouvelle couleur'}
          </h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Nom */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nom *
                {formValue && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '1px 8px 1px 5px', fontSize: '11px', fontWeight: 600, color: '#fff', textTransform: 'none', letterSpacing: 0 }}>
                    <Swatch hex={formValue} size={14} />
                    {formName || '…'}
                  </span>
                )}
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Rouge, Bleu marine, Écru…"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>

            {/* Couleur */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Couleur *</label>

              {/* Nuancier */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                {PALETTE.map((hex) => (
                  <button
                    key={hex}
                    title={hex}
                    onClick={() => setFormValue(hex)}
                    style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: hex, border: formValue === hex ? '2.5px solid #fff' : '2px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      boxShadow: formValue === hex ? '0 0 0 2px rgba(47,111,237,0.7)' : 'none',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      transform: formValue === hex ? 'scale(1.2)' : 'scale(1)',
                    }}
                    onMouseEnter={(e) => { if (formValue !== hex) e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={(e) => { if (formValue !== hex) e.currentTarget.style.transform = 'scale(1)'; }}
                  />
                ))}
              </div>

              {/* Color picker + hex */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '44px', height: '38px', borderRadius: '8px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0, cursor: 'pointer' }} title="Ouvrir le sélecteur de couleur">
                  <div style={{ position: 'absolute', inset: 0, background: formValue }} />
                  <input
                    type="color"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />
                </div>
                <input
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="#000000"
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex: Rouge vif"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>

            {/* Catégories */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {editingColor ? 'Catégorie' : 'Catégories *'}
              </label>
              {!editingColor && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginBottom: '8px', marginTop: 0 }}>
                  Sélectionne plusieurs catégories pour créer cette couleur dans chacune.
                </p>
              )}
              <Select
                isMulti={!editingColor}
                isClearable
                placeholder="Sélectionner une ou plusieurs catégories…"
                options={productCategories}
                value={editingColor ? (formCategories[0] || null) : formCategories}
                noOptionsMessage={() => 'Aucune catégorie trouvée'}
                onChange={(val: any) => {
                  if (editingColor) setFormCategories(val ? [val] : []);
                  else setFormCategories((val as Option[]) || []);
                }}
              />
              {!editingColor && formCategories.length > 1 && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#6b9eff', fontSize: '12px' }}>
                  <Swatch hex={formValue} size={14} />
                  ✓ {formCategories.length} couleurs "{formName || '…'}" seront créées
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button onClick={handleClose} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              <HiX size={14} style={{ display: 'inline', marginRight: 4 }} /> Annuler
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 18px', background: saving ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(47,111,237,0.35)' }}>
              <HiCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
              {saving ? 'Sauvegarde…' : editingColor ? 'Modifier' : `Créer${formCategories.length > 1 ? ` (${formCategories.length})` : ''}`}
            </button>
          </div>
        </div>
      </Dialog>
    </Container>
  );
};

export default ColorsList;
