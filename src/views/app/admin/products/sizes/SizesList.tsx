import { Container } from '@/components/shared';
import { useEffect, useState } from 'react';
import { Dialog, Select } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  createSize,
  deleteSize,
  getSizes,
  updateSize,
  useAppSelector,
} from './store';
import { Size, ProductCategory } from '@/@types/product';
import { HiOutlineSearch, HiPlus, HiTrash, HiPencil, HiX, HiCheck } from 'react-icons/hi';
import { MdStraighten } from 'react-icons/md';
import { toast } from 'react-toastify';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetProductCategories, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';

injectReducer('sizes', reducer);

type Option = { value: string; label: string };

const SizesList = () => {
  const dispatch = useAppDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [productCategories, setProductCategories] = useState<Option[]>([]);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategories, setFormCategories] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);

  const { sizes, total, loading } = useAppSelector((state) => state.sizes.data);

  useEffect(() => {
    dispatch(getSizes({ pagination: { page: 1, pageSize: 1000 }, searchTerm }));
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

  const grouped = sizes
    .filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.productCategory?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .reduce<Record<string, { category: ProductCategory | null; sizes: Size[] }>>((acc, size) => {
      const key = size.productCategory?.documentId || '__none__';
      if (!acc[key]) acc[key] = { category: size.productCategory || null, sizes: [] };
      acc[key].sizes.push(size);
      return acc;
    }, {});

  const openNew = () => {
    setEditingSize(null);
    setFormName('');
    setFormDescription('');
    setFormCategories([]);
    setDialogOpen(true);
  };

  const openEdit = (size: Size) => {
    setEditingSize(size);
    setFormName(size.name);
    setFormDescription(size.description || '');
    setFormCategories(
      size.productCategory
        ? [{ value: size.productCategory.documentId, label: size.productCategory.name }]
        : []
    );
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setEditingSize(null); };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Le nom est obligatoire'); return; }
    if (!editingSize && formCategories.length === 0) { toast.error('Sélectionnez au moins une catégorie'); return; }
    setSaving(true);
    try {
      if (editingSize) {
        const result = await dispatch(updateSize({ documentId: editingSize.documentId, name: formName, value: formName, description: formDescription, productCategory: formCategories[0]?.value || null }));
        if (result.meta.requestStatus === 'fulfilled') { toast.success('Taille modifiée'); handleClose(); }
        else toast.error('Erreur lors de la modification');
      } else {
        const results = await Promise.all(
          formCategories.map((cat) => dispatch(createSize({ name: formName, value: formName, description: formDescription, productCategory: cat.value })))
        );
        const allOk = results.every((r) => r.meta.requestStatus === 'fulfilled');
        if (allOk) { toast.success(formCategories.length > 1 ? `${formCategories.length} tailles créées` : 'Taille créée'); handleClose(); }
        else toast.error('Erreur lors de la création');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (size: Size) => {
    await dispatch(deleteSize(size.documentId));
    toast.success('Taille supprimée');
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Produits</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Tailles <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
          <HiPlus size={16} /> Nouvelle taille
        </button>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: '28px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Rechercher une taille ou catégorie…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
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
          <MdStraighten size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucune taille</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          {Object.values(grouped).map(({ category, sizes: catSizes }) => (
            <div key={category?.documentId || '__none__'} style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MdStraighten size={16} style={{ color: '#6b9eff' }} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{category?.name || 'Sans catégorie'}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>{catSizes.length} taille{catSizes.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {catSizes.map((size) => (
                  <div key={size.documentId}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '6px 12px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  >
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{size.name}</span>
                    {size.description && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>· {size.description}</span>}
                    <button onClick={() => openEdit(size)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '0 2px' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#6b9eff')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}><HiPencil size={12} /></button>
                    <button onClick={() => handleDelete(size)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: '0 2px' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')} onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}><HiTrash size={12} /></button>
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
          <h5 style={{ margin: '0 0 20px', color: '#fff', fontSize: '16px', fontWeight: 700 }}>{editingSize ? 'Modifier la taille' : 'Nouvelle taille'}</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nom *</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: XS, S, M, L, XL, 42…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
              <input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Très petite taille"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{editingSize ? 'Catégorie' : 'Catégories *'}</label>
              {!editingSize && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginBottom: '8px', marginTop: 0 }}>Sélectionne plusieurs catégories pour créer cette taille dans chacune.</p>}
              <Select
                isMulti={!editingSize} isClearable
                placeholder="Sélectionner une ou plusieurs catégories…"
                options={productCategories}
                value={editingSize ? (formCategories[0] || null) : formCategories}
                noOptionsMessage={() => 'Aucune catégorie trouvée'}
                onChange={(val: any) => {
                  if (editingSize) setFormCategories(val ? [val] : []);
                  else setFormCategories((val as Option[]) || []);
                }}
              />
              {!editingSize && formCategories.length > 1 && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.25)', borderRadius: '8px', color: '#6b9eff', fontSize: '12px' }}>
                  ✓ {formCategories.length} tailles "{formName || '…'}" seront créées
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
              {saving ? 'Sauvegarde…' : editingSize ? 'Modifier' : `Créer${formCategories.length > 1 ? ` (${formCategories.length})` : ''}`}
            </button>
          </div>
        </div>
      </Dialog>
    </Container>
  );
};

export default SizesList;
