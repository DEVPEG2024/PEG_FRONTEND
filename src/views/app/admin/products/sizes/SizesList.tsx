import { Container } from '@/components/shared';
import { useEffect, useRef, useState } from 'react';
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
import { HiOutlineSearch, HiTrash, HiPencil, HiX, HiCheck, HiPlus, HiLightningBolt } from 'react-icons/hi';
import { MdStraighten } from 'react-icons/md';
import { toast } from 'react-toastify';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetProductCategories, apiDeleteProductCategory, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';

injectReducer('sizes', reducer);

type Option = { value: string; label: string };

const TEMPLATES = [
  { icon: '👕', label: 'Vêtement', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] },
  { icon: '🧢', label: 'Accessoire', sizes: ['Taille unique'] },
  { icon: '👟', label: 'Pointures', sizes: ['37', '38', '39', '40', '41', '42', '43', '44', '45'] },
  { icon: '🖨️', label: 'Print', sizes: ['A3', 'A4', 'A5'] },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: '#fff',
  fontSize: '14px',
  fontFamily: 'Inter, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.5)',
  fontSize: '11px',
  fontWeight: 600,
  display: 'block',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const SizesList = () => {
  const dispatch = useAppDispatch();
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Quick-add state
  const [quickInput, setQuickInput] = useState('');
  const [quickCategory, setQuickCategory] = useState<Option | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);

  // Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<Option | null>(null);
  const [saving, setSaving] = useState(false);

  // Categories
  const [productCategories, setProductCategories] = useState<Option[]>([]);

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

  // Grouped display
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

  // Parse quick input into trimmed names
  const parsedSizes = quickInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Check duplicates against existing sizes in the selected category
  const existingInCategory = quickCategory
    ? sizes.filter((s) => s.productCategory?.documentId === quickCategory.value).map((s) => s.name.toLowerCase())
    : [];
  const newSizes = parsedSizes.filter((n) => !existingInCategory.includes(n.toLowerCase()));
  const duplicates = parsedSizes.filter((n) => existingInCategory.includes(n.toLowerCase()));

  // Quick add handler
  const handleQuickAdd = async () => {
    if (!quickCategory) { toast.error('Sélectionne une catégorie'); return; }
    if (newSizes.length === 0) {
      if (duplicates.length > 0) toast.warning(`Ces tailles existent déjà : ${duplicates.join(', ')}`);
      else toast.error('Saisis au moins une taille');
      return;
    }
    setQuickSaving(true);
    try {
      const results = await Promise.all(
        newSizes.map((name) =>
          dispatch(createSize({ name, value: name, description: '', productCategory: quickCategory.value as any }))
        )
      );
      const ok = results.filter((r) => r.meta.requestStatus === 'fulfilled').length;
      const ko = results.length - ok;
      if (ok > 0) {
        toast.success(
          `${ok} taille${ok > 1 ? 's' : ''} créée${ok > 1 ? 's' : ''}${duplicates.length > 0 ? ` (${duplicates.length} ignorée${duplicates.length > 1 ? 's' : ''} car déjà existante${duplicates.length > 1 ? 's' : ''})` : ''}`
        );
        setQuickInput('');
        quickInputRef.current?.focus();
      }
      if (ko > 0) toast.error(`${ko} erreur${ko > 1 ? 's' : ''} lors de la création`);
    } finally {
      setQuickSaving(false);
    }
  };

  const handleQuickKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleQuickAdd();
  };

  // Template click
  const handleTemplate = (templateSizes: string[]) => {
    setQuickInput(templateSizes.join(', '));
    quickInputRef.current?.focus();
  };

  // Edit dialog
  const openEdit = (size: Size) => {
    setEditingSize(size);
    setFormName(size.name);
    setFormDescription(size.description || '');
    setFormCategory(
      size.productCategory
        ? { value: size.productCategory.documentId, label: size.productCategory.name }
        : null
    );
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setEditingSize(null); };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Le nom est obligatoire'); return; }
    setSaving(true);
    try {
      const result = await dispatch(updateSize({
        documentId: editingSize!.documentId,
        name: formName,
        value: formName,
        description: formDescription,
        productCategory: (formCategory?.value || null) as any,
      }));
      if (result.meta.requestStatus === 'fulfilled') { toast.success('Taille modifiée'); handleClose(); }
      else toast.error('Erreur lors de la modification');
    } finally { setSaving(false); }
  };

  const handleDelete = async (size: Size) => {
    await dispatch(deleteSize(size.documentId));
    toast.success('Taille supprimée');
  };

  const handleDeleteCategory = async (category: ProductCategory) => {
    if (!window.confirm(`Supprimer la catégorie "${category.name}" ? Cette action est irréversible.`)) return;
    try {
      await apiDeleteProductCategory(category.documentId);
      toast.success(`Catégorie "${category.name}" supprimée`);
      fetchCategories();
      dispatch(getSizes({ pagination: { page: 1, pageSize: 1000 }, searchTerm }));
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Produits</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Tailles <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
      </div>

      {/* ── Zone création rapide ── */}
      <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(47,111,237,0.25)', borderRadius: '18px', padding: '22px 24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <HiLightningBolt size={15} style={{ color: '#6b9eff' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Création rapide</span>
        </div>

        {/* Templates */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => handleTemplate(tpl.sizes)}
              title={tpl.sizes.join(', ')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '100px', padding: '6px 13px', color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(47,111,237,0.5)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(47,111,237,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <span>{tpl.icon}</span>
              <span>{tpl.label}</span>
            </button>
          ))}
        </div>

        {/* Row: catégorie + saisie + bouton */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
          {/* Catégorie */}
          <div style={{ minWidth: '200px', flex: '0 0 200px' }}>
            <Select
              placeholder="Catégorie…"
              options={productCategories}
              value={quickCategory}
              isClearable
              noOptionsMessage={() => 'Aucune catégorie'}
              onChange={(val: any) => setQuickCategory(val || null)}
            />
          </div>

          {/* Saisie */}
          <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
            <input
              ref={quickInputRef}
              type="text"
              placeholder="S, M, L, XL  (séparés par des virgules)  → Entrée"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              style={{ ...inputStyle, paddingRight: '40px', height: '100%', minHeight: '40px' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
            />
          </div>

          {/* Bouton créer */}
          <button
            onClick={handleQuickAdd}
            disabled={quickSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: quickSaving ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: quickSaving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
          >
            <HiPlus size={15} />
            {quickSaving ? 'Création…' : 'Ajouter'}
          </button>
        </div>

        {/* Preview des tailles parsées */}
        {parsedSizes.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px' }}>Aperçu :</span>
            {parsedSizes.map((name) => {
              const isDupe = existingInCategory.includes(name.toLowerCase());
              return (
                <span key={name} style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, background: isDupe ? 'rgba(251,146,60,0.12)' : 'rgba(47,111,237,0.12)', border: `1px solid ${isDupe ? 'rgba(251,146,60,0.3)' : 'rgba(47,111,237,0.3)'}`, color: isDupe ? '#fb923c' : '#6b9eff' }}>
                  {name}{isDupe && ' ×'}
                </span>
              );
            })}
            {duplicates.length > 0 && (
              <span style={{ color: 'rgba(251,146,60,0.7)', fontSize: '11px', marginLeft: '4px' }}>
                (× déjà existant)
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Recherche ── */}
      <div style={{ position: 'relative', marginBottom: '28px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Rechercher une taille ou catégorie…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
        />
      </div>

      {/* ── Liste par catégorie ── */}
      {loading ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '64px' }}>Chargement…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <MdStraighten size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>Aucune taille — crée-en une ci-dessus</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
          {Object.values(grouped).map(({ category, sizes: catSizes }) => (
            <div key={category?.documentId || '__none__'} style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MdStraighten size={16} style={{ color: '#6b9eff' }} />
                  </div>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{category?.name || 'Sans catégorie'}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: 0 }}>{catSizes.length} taille{catSizes.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                {category && (
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    title="Supprimer la catégorie"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '6px 12px', color: 'rgba(248,113,113,0.7)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; e.currentTarget.style.color = 'rgba(248,113,113,0.7)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.2)'; }}
                  >
                    <HiTrash size={13} />
                    Supprimer la catégorie
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {catSizes.map((size) => (
                  <div
                    key={size.documentId}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '6px 12px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                  >
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{size.name}</span>
                    {size.description && (
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>· {size.description}</span>
                    )}
                    <button
                      onClick={() => openEdit(size)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: '0 2px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#6b9eff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                      title="Modifier"
                    >
                      <HiPencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(size)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: '0 2px' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                      title="Supprimer"
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

      {/* ── Dialog modification ── */}
      <Dialog isOpen={dialogOpen} onClose={handleClose} width={480}>
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
          <h5 style={{ margin: '0 0 20px', color: '#fff', fontSize: '16px', fontWeight: 700 }}>Modifier la taille</h5>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: XL, 42…"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex: Extra Large"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
              />
            </div>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <Select
                isClearable
                placeholder="Sélectionner une catégorie…"
                options={productCategories}
                value={formCategory}
                noOptionsMessage={() => 'Aucune catégorie trouvée'}
                onChange={(val: any) => setFormCategory(val || null)}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button
              onClick={handleClose}
              style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              <HiX size={14} style={{ display: 'inline', marginRight: 4 }} /> Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 18px', background: saving ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(47,111,237,0.35)' }}
            >
              <HiCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
              {saving ? 'Sauvegarde…' : 'Modifier'}
            </button>
          </div>
        </div>
      </Dialog>
    </Container>
  );
};

export default SizesList;
