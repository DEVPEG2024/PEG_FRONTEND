import { Container } from '@/components/shared';
import { useEffect, useRef, useState } from 'react';
import { Select } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  createColor,
  deleteColor,
  getColors,
  updateColor,
  useAppSelector,
} from './store';
import { Color, ProductCategory } from '@/@types/product';
import {
  HiOutlineSearch,
  HiTrash,
  HiPencil,
  HiX,
  HiCheck,
  HiPlus,
  HiLightningBolt,
  HiChevronDown,
  HiChevronUp,
  HiOutlineLink,
  HiOutlineViewGrid,
  HiOutlineTable,
} from 'react-icons/hi';
import { IoColorPaletteOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { unwrapData } from '@/utils/serviceHelper';
import {
  apiGetProductCategories,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';

injectReducer('colors', reducer);

type Option = { value: string; label: string };
type TemplateColor = { name: string; hex: string };
type ViewMode = 'matrix' | 'cards';

// Validation / normalisation des codes hex (#RGB → #RRGGBB)
const normalizeHex = (input: string): string => {
  let v = input.trim();
  if (!v.startsWith('#')) v = '#' + v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    v =
      '#' +
      v
        .slice(1)
        .split('')
        .map((c) => c + c)
        .join('');
  }
  return v.toLowerCase();
};
const isValidHex = (input: string): boolean =>
  /^#[0-9a-fA-F]{6}$/.test(normalizeHex(input));

// Catégories d'une couleur (relation multiple, fallback ancien champ unique)
const colorCategories = (c: Color): ProductCategory[] => {
  if (c.productCategories && c.productCategories.length)
    return c.productCategories;
  if (c.productCategory) return [c.productCategory];
  return [];
};

const PALETTE_GRID = [
  '#ffffff',
  '#f5f5f4',
  '#e7e5e4',
  '#d6d3d1',
  '#a8a29e',
  '#78716c',
  '#57534e',
  '#292524',
  '#1c1917',
  '#000000',
  '#fecdd3',
  '#fda4af',
  '#fb7185',
  '#f43f5e',
  '#e11d48',
  '#be123c',
  '#fce7f3',
  '#fbcfe8',
  '#f9a8d4',
  '#ec4899',
  '#db2777',
  '#be185d',
  '#fed7aa',
  '#fdba74',
  '#fb923c',
  '#f97316',
  '#ea580c',
  '#c2410c',
  '#fef08a',
  '#fde047',
  '#facc15',
  '#eab308',
  '#ca8a04',
  '#a16207',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e',
  '#16a34a',
  '#15803d',
  '#166534',
  '#a7f3d0',
  '#6ee7b7',
  '#34d399',
  '#10b981',
  '#059669',
  '#047857',
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8',
  '#0ea5e9',
  '#0284c7',
  '#0369a1',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6',
  '#2563eb',
  '#1d4ed8',
  '#1e40af',
  '#c7d2fe',
  '#a5b4fc',
  '#818cf8',
  '#6366f1',
  '#4f46e5',
  '#4338ca',
  '#e9d5ff',
  '#d8b4fe',
  '#c084fc',
  '#a855f7',
  '#9333ea',
  '#7e22ce',
  '#f5d0fe',
  '#f0abfc',
  '#e879f9',
  '#d946ef',
  '#c026d3',
  '#a21caf',
  '#fef3c7',
  '#fde68a',
  '#d97706',
  '#92400e',
  '#78350f',
  '#f5f0eb',
  '#e8dcc8',
  '#c8a97e',
  '#a0785a',
  '#7c5a3c',
  '#5c3d1e',
];

const TEMPLATES: { icon: string; label: string; colors: TemplateColor[] }[] = [
  {
    icon: '⬛',
    label: 'Essentiels',
    colors: [
      { name: 'Blanc pur', hex: '#ffffff' },
      { name: 'Blanc cassé', hex: '#f5f0eb' },
      { name: 'Gris clair', hex: '#d6d3d1' },
      { name: 'Gris moyen', hex: '#78716c' },
      { name: 'Anthracite', hex: '#292524' },
      { name: 'Noir', hex: '#000000' },
    ],
  },
  {
    icon: '🎨',
    label: 'Primaires & Secondaires',
    colors: [
      { name: 'Rouge', hex: '#e11d48' },
      { name: 'Bleu', hex: '#2563eb' },
      { name: 'Jaune', hex: '#eab308' },
      { name: 'Vert', hex: '#16a34a' },
      { name: 'Orange', hex: '#ea580c' },
      { name: 'Violet', hex: '#7e22ce' },
    ],
  },
  {
    icon: '🏢',
    label: 'Corporate',
    colors: [
      { name: 'Bleu corporate', hex: '#1e40af' },
      { name: 'Bleu ciel', hex: '#0ea5e9' },
      { name: 'Gris professionnel', hex: '#475569' },
      { name: 'Vert confiance', hex: '#059669' },
      { name: 'Bordeaux', hex: '#881337' },
      { name: 'Or', hex: '#ca8a04' },
    ],
  },
  {
    icon: '🖨️',
    label: 'Impression',
    colors: [
      { name: 'Cyan CMJN', hex: '#00bcd4' },
      { name: 'Magenta CMJN', hex: '#e91e63' },
      { name: 'Jaune CMJN', hex: '#ffeb3b' },
      { name: 'Noir CMJN', hex: '#212121' },
      { name: 'Pantone 185 C', hex: '#e4002b' },
      { name: 'Pantone 286 C', hex: '#0032a0' },
    ],
  },
  {
    icon: '🪵',
    label: 'Naturels & Matières',
    colors: [
      { name: 'Beige', hex: '#e8dcc8' },
      { name: 'Sable', hex: '#c8a97e' },
      { name: 'Terracotta', hex: '#c2410c' },
      { name: 'Bois clair', hex: '#a0785a' },
      { name: 'Marron', hex: '#5c3d1e' },
      { name: 'Ardoise', hex: '#334155' },
    ],
  },
];

const Swatch = ({ hex, size = 20 }: { hex: string; size?: number }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: hex || '#888',
      border: '2px solid rgba(255,255,255,0.15)',
      flexShrink: 0,
    }}
  />
);

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

const ColorsList = () => {
  const dispatch = useAppDispatch();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [productCategories, setProductCategories] = useState<Option[]>([]);
  const [view, setView] = useState<ViewMode>('matrix');
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());

  // Quick-add state
  const [quickName, setQuickName] = useState('');
  const [quickHex, setQuickHex] = useState('#3b82f6');
  const [quickCategories, setQuickCategories] = useState<Option[]>([]);
  const [quickSaving, setQuickSaving] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  // Template batch state
  const [activeTemplate, setActiveTemplate] = useState<number | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  // Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('#000000');
  const [formDescription, setFormDescription] = useState('');
  const [formCategories, setFormCategories] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);

  const { colors, total, loading } = useAppSelector(
    (state) => state.colors.data
  );

  useEffect(() => {
    dispatch(
      getColors({ pagination: { page: 1, pageSize: 1000 }, searchTerm })
    );
  }, [searchTerm]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const {
      productCategories_connection,
    }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories());
    setProductCategories(
      (productCategories_connection.nodes || []).map((c: ProductCategory) => ({
        value: c.documentId,
        label: c.name,
      }))
    );
  };

  const search = searchTerm.toLowerCase();

  // ── Données vue CARTES ──
  const grouped = colors
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        colorCategories(c).some((cat) =>
          cat.name?.toLowerCase().includes(search)
        )
    )
    .reduce<
      Record<string, { category: ProductCategory | null; colors: Color[] }>
    >((acc, color) => {
      const cats = colorCategories(color);
      if (cats.length === 0) {
        (acc['__none__'] ??= { category: null, colors: [] }).colors.push(color);
      } else {
        cats.forEach((cat) => {
          (acc[cat.documentId] ??= { category: cat, colors: [] }).colors.push(
            color
          );
        });
      }
      return acc;
    }, {});
  const groups = Object.values(grouped).sort((a, b) => {
    if (!a.category) return 1;
    if (!b.category) return -1;
    return a.category.name.localeCompare(b.category.name);
  });

  // ── Données vue MATRICE ──
  const matrixColors = colors
    .filter((c) => c.name.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Nom déjà existant (toutes catégories) → fusion plutôt que doublon
  const existingNamesSet = new Set(
    colors.map((c) => c.name.trim().toLowerCase())
  );
  const isExistingName =
    quickName.trim() && existingNamesSet.has(quickName.trim().toLowerCase());

  // Toggle cellule matrice
  const toggleCell = async (color: Color, catId: string) => {
    const current = colorCategories(color).map((c) => c.documentId);
    const has = current.includes(catId);
    const next = has
      ? current.filter((id) => id !== catId)
      : [...current, catId];
    const key = `${color.documentId}:${catId}`;
    setSavingCells((prev) => new Set(prev).add(key));
    try {
      const r = await dispatch(
        updateColor({
          documentId: color.documentId,
          name: color.name,
          value: color.value,
          description: color.description || '',
          productCategories: next,
        })
      );
      if (r.meta.requestStatus !== 'fulfilled')
        toast.error('Échec de la sauvegarde');
    } finally {
      setSavingCells((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  };

  // Quick-add une couleur
  const handleQuickAdd = async () => {
    if (quickCategories.length === 0) {
      toast.error('Sélectionne au moins une catégorie');
      return;
    }
    if (!quickName.trim()) {
      toast.error('Saisis un nom de couleur');
      return;
    }
    if (!isValidHex(quickHex)) {
      toast.error('Code couleur invalide (ex: #2563eb)');
      return;
    }
    const selectedIds = quickCategories.map((c) => c.value);
    const hex = normalizeHex(quickHex);
    setQuickSaving(true);
    try {
      const existing = colors.find(
        (c) => c.name.trim().toLowerCase() === quickName.trim().toLowerCase()
      );
      if (existing) {
        const currentIds = colorCategories(existing).map((c) => c.documentId);
        const union = Array.from(new Set([...currentIds, ...selectedIds]));
        if (union.length === currentIds.length) {
          toast.info(`"${existing.name}" est déjà dans ces catégories`);
        } else {
          const r = await dispatch(
            updateColor({
              documentId: existing.documentId,
              name: existing.name,
              value: existing.value,
              description: existing.description || '',
              productCategories: union,
            })
          );
          if (r.meta.requestStatus === 'fulfilled')
            toast.success(`"${existing.name}" rattachée aux catégories`);
          else toast.error('Erreur lors du rattachement');
        }
      } else {
        const r = await dispatch(
          createColor({
            name: quickName.trim(),
            value: hex,
            description: '',
            productCategories: selectedIds,
          })
        );
        if (r.meta.requestStatus === 'fulfilled')
          toast.success(`Couleur "${quickName.trim()}" créée`);
        else toast.error('Erreur lors de la création');
      }
      setQuickName('');
      nameInputRef.current?.focus();
    } finally {
      setQuickSaving(false);
    }
  };

  const handleQuickKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleQuickAdd();
  };

  // Template batch add
  const handleAddTemplate = async (tplIdx: number) => {
    if (quickCategories.length === 0) {
      toast.error("Sélectionne au moins une catégorie d'abord");
      return;
    }
    const tpl = TEMPLATES[tplIdx];
    const selectedIds = quickCategories.map((c) => c.value);
    setTemplateSaving(true);
    try {
      let created = 0;
      let updated = 0;
      let unchanged = 0;
      for (const tc of tpl.colors) {
        const existing = colors.find(
          (c) => c.name.toLowerCase() === tc.name.toLowerCase()
        );
        if (existing) {
          const currentIds = colorCategories(existing).map((c) => c.documentId);
          const union = Array.from(new Set([...currentIds, ...selectedIds]));
          if (union.length === currentIds.length) {
            unchanged++;
            continue;
          }
          const r = await dispatch(
            updateColor({
              documentId: existing.documentId,
              name: existing.name,
              value: existing.value,
              description: existing.description || '',
              productCategories: union,
            })
          );
          if (r.meta.requestStatus === 'fulfilled') updated++;
        } else {
          const r = await dispatch(
            createColor({
              name: tc.name,
              value: tc.hex,
              description: '',
              productCategories: selectedIds,
            })
          );
          if (r.meta.requestStatus === 'fulfilled') created++;
        }
      }
      const parts: string[] = [];
      if (created) parts.push(`${created} créée${created > 1 ? 's' : ''}`);
      if (updated) parts.push(`${updated} rattachée${updated > 1 ? 's' : ''}`);
      if (unchanged) parts.push(`${unchanged} déjà à jour`);
      toast.success(parts.length ? parts.join(' · ') : 'Aucun changement');
      setActiveTemplate(null);
    } finally {
      setTemplateSaving(false);
    }
  };

  // Edit dialog
  const openEdit = (color: Color) => {
    setEditingColor(color);
    setFormName(color.name);
    setFormValue(color.value || '#000000');
    setFormDescription(color.description || '');
    setFormCategories(
      colorCategories(color).map((c) => ({
        value: c.documentId,
        label: c.name,
      }))
    );
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingColor(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    if (!isValidHex(formValue)) {
      toast.error('Code couleur invalide (ex: #2563eb)');
      return;
    }
    setSaving(true);
    try {
      const result = await dispatch(
        updateColor({
          documentId: editingColor!.documentId,
          name: formName,
          value: normalizeHex(formValue),
          description: formDescription,
          productCategories: formCategories.map((c) => c.value),
        })
      );
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Couleur modifiée');
        handleClose();
      } else toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (color: Color) => {
    if (
      !window.confirm(
        `Supprimer définitivement la couleur "${color.name}" de toutes les catégories ?`
      )
    )
      return;
    await dispatch(deleteColor(color.documentId));
    toast.success('Couleur supprimée');
    if (editingColor?.documentId === color.documentId) handleClose();
  };

  // Retirer une couleur d'UNE seule catégorie
  const handleRemoveFromCategory = async (color: Color, categoryId: string) => {
    const remaining = colorCategories(color)
      .map((c) => c.documentId)
      .filter((id) => id !== categoryId);
    const result = await dispatch(
      updateColor({
        documentId: color.documentId,
        name: color.name,
        value: color.value,
        description: color.description || '',
        productCategories: remaining,
      })
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(
        remaining.length
          ? 'Retirée de la catégorie'
          : 'Couleur désormais sans catégorie'
      );
    } else {
      toast.error('Erreur lors du retrait');
    }
  };

  // ── Styles matrice ──
  const thBase: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 2,
    background: '#16263d',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '12px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    whiteSpace: 'nowrap',
  };
  const firstColStyle: React.CSSProperties = {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    color: '#fff',
    fontWeight: 600,
    fontSize: '13px',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  };

  const renderToggle = () => (
    <div
      style={{
        display: 'inline-flex',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {(
        [
          ['matrix', 'Tableau croisé', <HiOutlineTable size={14} key="t" />],
          ['cards', 'Cartes', <HiOutlineViewGrid size={14} key="c" />],
        ] as const
      ).map(([mode, label, icon]) => (
        <button
          key={mode}
          onClick={() => setView(mode as ViewMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            border: 'none',
            cursor: 'pointer',
            background:
              view === mode ? 'rgba(47,111,237,0.2)' : 'rgba(255,255,255,0.04)',
            color: view === mode ? '#7eb3ff' : 'rgba(255,255,255,0.5)',
          }}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          paddingTop: '28px',
          paddingBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Produits
          </p>
          <h2
            style={{
              color: '#fff',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Couleurs{' '}
            <span
              style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              ({total})
            </span>
          </h2>
        </div>
        {renderToggle()}
      </div>

      {/* ── Zone création rapide ── */}
      <div
        style={{
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1.5px solid rgba(47,111,237,0.25)',
          borderRadius: '18px',
          padding: '22px 24px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <HiLightningBolt size={15} style={{ color: '#6b9eff' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
            Création rapide
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            · une couleur peut couvrir plusieurs catégories
          </span>
        </div>

        {/* Templates */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          {TEMPLATES.map((tpl, idx) => (
            <button
              key={tpl.label}
              onClick={() =>
                setActiveTemplate(activeTemplate === idx ? null : idx)
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background:
                  activeTemplate === idx
                    ? 'rgba(47,111,237,0.18)'
                    : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeTemplate === idx ? 'rgba(47,111,237,0.5)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '100px',
                padding: '6px 13px',
                color:
                  activeTemplate === idx ? '#6b9eff' : 'rgba(255,255,255,0.75)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (activeTemplate !== idx) {
                  e.currentTarget.style.borderColor = 'rgba(47,111,237,0.5)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTemplate !== idx) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                }
              }}
            >
              <span>{tpl.icon}</span>
              <span>{tpl.label}</span>
            </button>
          ))}
        </div>

        {/* Template expanded preview */}
        {activeTemplate !== null && (
          <div
            style={{
              marginBottom: '16px',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {TEMPLATES[activeTemplate].icon}{' '}
                {TEMPLATES[activeTemplate].label}
              </span>
              <button
                onClick={() => handleAddTemplate(activeTemplate)}
                disabled={templateSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: templateSaving
                    ? 'rgba(47,111,237,0.4)'
                    : 'rgba(47,111,237,0.2)',
                  border: '1px solid rgba(47,111,237,0.4)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  color: '#6b9eff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: templateSaving ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <HiPlus size={12} />
                {templateSaving ? 'Ajout…' : 'Tout ajouter aux catégories'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TEMPLATES[activeTemplate].colors.map((tc) => {
                const exists = existingNamesSet.has(tc.name.toLowerCase());
                return (
                  <div
                    key={tc.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '100px',
                      background: exists
                        ? 'rgba(96,165,250,0.1)'
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${exists ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setQuickHex(tc.hex);
                      setQuickName(tc.name);
                      nameInputRef.current?.focus();
                    }}
                    title="Cliquer pour pré-remplir"
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: tc.hex,
                        border: '1.5px solid rgba(255,255,255,0.2)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: exists ? '#93c5fd' : '#fff',
                      }}
                    >
                      {tc.name}
                    </span>
                    {exists && (
                      <HiOutlineLink
                        size={11}
                        style={{ color: 'rgba(147,197,253,0.7)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {quickCategories.length === 0 && (
              <p
                style={{
                  color: 'rgba(251,146,60,0.8)',
                  fontSize: '11px',
                  marginTop: '10px',
                  marginBottom: 0,
                }}
              >
                Sélectionne une ou plusieurs catégories ci-dessous pour activer
                l&apos;ajout en lot.
              </p>
            )}
          </div>
        )}

        {/* Row: catégories + couleur + nom + bouton */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: '220px', flex: '0 0 220px' }}>
            <label style={labelStyle}>Catégorie(s)</label>
            <Select
              isMulti
              placeholder="Catégorie(s)…"
              options={productCategories}
              value={quickCategories}
              noOptionsMessage={() => 'Aucune catégorie'}
              onChange={(val: any) =>
                setQuickCategories((val || []) as Option[])
              }
            />
          </div>

          <div style={{ flexShrink: 0 }}>
            <label style={labelStyle}>Couleur</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '2px solid rgba(255,255,255,0.2)',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                title="Choisir une couleur"
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: quickHex,
                  }}
                />
                <input
                  type="color"
                  value={
                    isValidHex(quickHex) ? normalizeHex(quickHex) : '#000000'
                  }
                  onChange={(e) => setQuickHex(e.target.value)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />
              </div>
              <button
                onClick={() => setShowPalette(!showPalette)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: showPalette
                    ? 'rgba(47,111,237,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${showPalette ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  height: '40px',
                }}
                title="Ouvrir la palette"
              >
                {showPalette ? (
                  <HiChevronUp size={13} />
                ) : (
                  <HiChevronDown size={13} />
                )}
              </button>
            </div>
          </div>

          <div style={{ width: '110px', flexShrink: 0 }}>
            <label style={labelStyle}>Hex</label>
            <input
              value={quickHex}
              onChange={(e) => setQuickHex(e.target.value)}
              placeholder="#3b82f6"
              style={{
                ...inputStyle,
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '10px 10px',
                borderColor:
                  quickHex && !isValidHex(quickHex)
                    ? 'rgba(251,146,60,0.5)'
                    : 'rgba(255,255,255,0.12)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(47,111,237,0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor =
                  quickHex && !isValidHex(quickHex)
                    ? 'rgba(251,146,60,0.5)'
                    : 'rgba(255,255,255,0.12)';
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <label
              style={{
                ...labelStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Nom
              {quickName && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '100px',
                    padding: '1px 7px 1px 4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isExistingName ? '#93c5fd' : '#fff',
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  <Swatch hex={quickHex} size={12} />
                  {quickName}
                  {isExistingName && <HiOutlineLink size={10} />}
                </span>
              )}
            </label>
            <input
              ref={nameInputRef}
              type="text"
              placeholder="Ex: Rouge, Bleu marine…"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              style={inputStyle}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(47,111,237,0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            />
          </div>

          <div style={{ flexShrink: 0, paddingBottom: '0px' }}>
            <label style={{ ...labelStyle, opacity: 0 }}>_</label>
            <button
              onClick={handleQuickAdd}
              disabled={quickSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: quickSaving
                  ? 'rgba(47,111,237,0.5)'
                  : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 18px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: quickSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
                height: '40px',
              }}
            >
              <HiPlus size={15} />
              {quickSaving ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </div>

        {/* Palette dépliable */}
        {showPalette && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {PALETTE_GRID.map((hex) => (
                <button
                  key={hex}
                  title={hex}
                  onClick={() => {
                    setQuickHex(hex);
                  }}
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: hex,
                    border:
                      normalizeHex(quickHex) === hex
                        ? '2.5px solid #fff'
                        : '2px solid rgba(255,255,255,0.15)',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    boxShadow:
                      normalizeHex(quickHex) === hex
                        ? '0 0 0 2px rgba(47,111,237,0.7)'
                        : 'none',
                    transition: 'transform 0.1s',
                    transform:
                      normalizeHex(quickHex) === hex
                        ? 'scale(1.2)'
                        : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    if (normalizeHex(quickHex) !== hex)
                      e.currentTarget.style.transform = 'scale(1.15)';
                  }}
                  onMouseLeave={(e) => {
                    if (normalizeHex(quickHex) !== hex)
                      e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Recherche ── */}
      <div
        style={{
          position: 'relative',
          marginBottom: '20px',
          maxWidth: '400px',
        }}
      >
        <HiOutlineSearch
          size={15}
          style={{
            position: 'absolute',
            left: '13px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.55)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Rechercher une couleur ou catégorie…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '10px',
            padding: '10px 14px 10px 36px',
            color: '#fff',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(47,111,237,0.5)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.09)';
          }}
        />
      </div>

      {/* ════════════ VUE MATRICE ════════════ */}
      {view === 'matrix' &&
        (loading ? (
          <div
            style={{
              color: 'rgba(255,255,255,0.55)',
              textAlign: 'center',
              padding: '64px',
            }}
          >
            Chargement…
          </div>
        ) : productCategories.length === 0 ? (
          <div
            style={{
              background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            Crée d'abord des catégories produit pour pouvoir rattacher les
            couleurs.
          </div>
        ) : matrixColors.length === 0 ? (
          <div
            style={{
              background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            Aucune couleur — crée-en une ci-dessus.
          </div>
        ) : (
          <div style={{ marginBottom: '40px' }}>
            <p
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                marginBottom: '10px',
              }}
            >
              Coche une case pour rattacher la couleur à la catégorie ·
              sauvegarde automatique
            </p>
            <div
              style={{
                overflowX: 'auto',
                borderRadius: '16px',
                border: '1.5px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              }}
            >
              <table
                style={{
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  width: '100%',
                  background:
                    'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        ...thBase,
                        ...firstColStyle,
                        top: 0,
                        zIndex: 3,
                        background: '#16263d',
                        color: 'rgba(255,255,255,0.6)',
                        textTransform: 'uppercase',
                        fontSize: '11px',
                      }}
                    >
                      Couleur
                    </th>
                    {productCategories.map((cat) => (
                      <th
                        key={cat.value}
                        style={{
                          ...thBase,
                          textAlign: 'center',
                          minWidth: '92px',
                        }}
                      >
                        {cat.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixColors.map((color, ri) => {
                    const ids = new Set(
                      colorCategories(color).map((c) => c.documentId)
                    );
                    return (
                      <tr
                        key={color.documentId}
                        style={{
                          background:
                            ri % 2 ? 'rgba(255,255,255,0.015)' : 'transparent',
                        }}
                      >
                        <td
                          style={{
                            ...firstColStyle,
                            background: ri % 2 ? '#15233a' : '#16263d',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <Swatch hex={color.value} size={16} />
                            {color.name}
                            {ids.size > 1 && (
                              <span
                                title={`Partagée par ${ids.size} catégories`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  color: '#93c5fd',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  background: 'rgba(96,165,250,0.12)',
                                  borderRadius: '100px',
                                  padding: '1px 6px',
                                }}
                              >
                                <HiOutlineLink size={10} />
                                {ids.size}
                              </span>
                            )}
                          </span>
                        </td>
                        {productCategories.map((cat) => {
                          const checked = ids.has(cat.value);
                          const key = `${color.documentId}:${cat.value}`;
                          const busy = savingCells.has(key);
                          return (
                            <td
                              key={cat.value}
                              style={{
                                textAlign: 'center',
                                padding: '8px 10px',
                                borderBottom:
                                  '1px solid rgba(255,255,255,0.05)',
                              }}
                            >
                              <button
                                onClick={() => toggleCell(color, cat.value)}
                                disabled={busy}
                                title={
                                  checked
                                    ? `Retirer de ${cat.label}`
                                    : `Rattacher à ${cat.label}`
                                }
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '7px',
                                  cursor: busy ? 'wait' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: checked
                                    ? 'linear-gradient(135deg, #2f6fed, #1f4bb6)'
                                    : 'rgba(255,255,255,0.05)',
                                  border: `1.5px solid ${checked ? 'rgba(47,111,237,0.7)' : 'rgba(255,255,255,0.15)'}`,
                                  color: '#fff',
                                  opacity: busy ? 0.5 : 1,
                                  transition: 'all 0.12s',
                                }}
                                onMouseEnter={(e) => {
                                  if (!busy && !checked)
                                    e.currentTarget.style.borderColor =
                                      'rgba(47,111,237,0.6)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!busy && !checked)
                                    e.currentTarget.style.borderColor =
                                      'rgba(255,255,255,0.15)';
                                }}
                              >
                                {checked && <HiCheck size={15} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      {/* ════════════ VUE CARTES ════════════ */}
      {view === 'cards' &&
        (loading ? (
          <div
            style={{
              color: 'rgba(255,255,255,0.55)',
              textAlign: 'center',
              padding: '64px',
            }}
          >
            Chargement…
          </div>
        ) : groups.length === 0 ? (
          <div
            style={{
              background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
              borderRadius: '16px',
              padding: '64px 24px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <IoColorPaletteOutline
              size={48}
              style={{
                color: 'rgba(255,255,255,0.1)',
                margin: '0 auto 14px',
                display: 'block',
              }}
            />
            <p
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              Aucune couleur — crée-en une ci-dessus
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              paddingBottom: '40px',
            }}
          >
            {groups.map(({ category, colors: catColors }) => (
              <div
                key={category?.documentId || '__none__'}
                style={{
                  background:
                    'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '18px',
                  padding: '20px 24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '9px',
                      background: 'rgba(47,111,237,0.15)',
                      border: '1px solid rgba(47,111,237,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IoColorPaletteOutline
                      size={16}
                      style={{ color: '#6b9eff' }}
                    />
                  </div>
                  <div>
                    <p
                      style={{
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '15px',
                        margin: 0,
                      }}
                    >
                      {category?.name || 'Sans catégorie'}
                    </p>
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: '12px',
                        margin: 0,
                      }}
                    >
                      {catColors.length} couleur
                      {catColors.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {catColors.map((color) => {
                    const catCount = colorCategories(color).length;
                    return (
                      <div
                        key={color.documentId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '100px',
                          padding: '5px 10px 5px 7px',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.borderColor =
                            'rgba(255,255,255,0.22)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.borderColor =
                            'rgba(255,255,255,0.1)')
                        }
                      >
                        <Swatch hex={color.value} size={18} />
                        <span
                          style={{
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          {color.name}
                        </span>
                        {color.description && (
                          <span
                            style={{
                              color: 'rgba(255,255,255,0.35)',
                              fontSize: '11px',
                            }}
                          >
                            · {color.description}
                          </span>
                        )}
                        <span
                          style={{
                            color: 'rgba(255,255,255,0.25)',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {color.value}
                        </span>
                        {catCount > 1 && (
                          <span
                            title={`Partagée par ${catCount} catégories`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              color: '#93c5fd',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: 'rgba(96,165,250,0.12)',
                              borderRadius: '100px',
                              padding: '1px 6px',
                            }}
                          >
                            <HiOutlineLink size={10} />
                            {catCount}
                          </span>
                        )}
                        <button
                          onClick={() => openEdit(color)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 2px',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = '#6b9eff')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              'rgba(255,255,255,0.35)')
                          }
                          title="Modifier / gérer les catégories"
                        >
                          <HiPencil size={12} />
                        </button>
                        <button
                          onClick={() =>
                            category
                              ? handleRemoveFromCategory(
                                  color,
                                  category.documentId
                                )
                              : handleDelete(color)
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'rgba(255,255,255,0.55)',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 2px',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = '#f87171')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              'rgba(255,255,255,0.55)')
                          }
                          title={
                            category
                              ? 'Retirer de cette catégorie'
                              : 'Supprimer'
                          }
                        >
                          <HiX size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* ── Modal modification ── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      {dialogOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
              borderRadius: '20px',
              padding: '28px',
              width: '520px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              border: '1.5px solid rgba(255,255,255,0.08)',
              animation: 'slideUp 0.25s ease',
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
              }}
            >
              <h5
                style={{
                  margin: 0,
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                Modifier la couleur
              </h5>
              <button
                onClick={handleClose}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <HiX size={15} />
              </button>
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Nom *
                  {formValue && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '100px',
                        padding: '1px 8px 1px 5px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#fff',
                        textTransform: 'none',
                        letterSpacing: 0,
                      }}
                    >
                      <Swatch hex={formValue} size={14} />
                      {formName || '...'}
                    </span>
                  )}
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Rouge, Bleu marine, Écru…"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(47,111,237,0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Couleur *
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '5px',
                    marginBottom: '10px',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                  }}
                >
                  {PALETTE_GRID.map((hex) => (
                    <button
                      key={hex}
                      title={hex}
                      onClick={() => setFormValue(hex)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: hex,
                        border:
                          normalizeHex(formValue) === hex
                            ? '2.5px solid #fff'
                            : '2px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        boxShadow:
                          normalizeHex(formValue) === hex
                            ? '0 0 0 2px rgba(47,111,237,0.7)'
                            : 'none',
                        transition: 'transform 0.1s',
                        transform:
                          normalizeHex(formValue) === hex
                            ? 'scale(1.2)'
                            : 'scale(1)',
                      }}
                      onMouseEnter={(e) => {
                        if (normalizeHex(formValue) !== hex)
                          e.currentTarget.style.transform = 'scale(1.15)';
                      }}
                      onMouseLeave={(e) => {
                        if (normalizeHex(formValue) !== hex)
                          e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '44px',
                      height: '38px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid rgba(255,255,255,0.15)',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: formValue,
                      }}
                    />
                    <input
                      type="color"
                      value={
                        isValidHex(formValue)
                          ? normalizeHex(formValue)
                          : '#000000'
                      }
                      onChange={(e) => setFormValue(e.target.value)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  </div>
                  <input
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="#000000"
                    style={{
                      ...inputStyle,
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      borderColor:
                        formValue && !isValidHex(formValue)
                          ? 'rgba(251,146,60,0.5)'
                          : 'rgba(255,255,255,0.12)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(47,111,237,0.5)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor =
                        formValue && !isValidHex(formValue)
                          ? 'rgba(251,146,60,0.5)'
                          : 'rgba(255,255,255,0.12)';
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Rouge vif"
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(47,111,237,0.5)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                  }}
                />
              </div>

              <div>
                <label style={labelStyle}>Catégories</label>
                <Select
                  isMulti
                  placeholder="Sélectionner une ou plusieurs catégories…"
                  options={productCategories}
                  value={formCategories}
                  noOptionsMessage={() => 'Aucune catégorie trouvée'}
                  onChange={(val: any) =>
                    setFormCategories((val || []) as Option[])
                  }
                />
                <p
                  style={{
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '11px',
                    marginTop: '6px',
                    marginBottom: 0,
                  }}
                >
                  Une même couleur peut être rattachée à plusieurs catégories —
                  pas besoin de la recréer.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
                marginTop: '24px',
              }}
            >
              <button
                onClick={() => editingColor && handleDelete(editingColor)}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.25)',
                  borderRadius: '10px',
                  color: 'rgba(248,113,113,0.85)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <HiTrash
                  size={14}
                  style={{ display: 'inline', marginRight: 4 }}
                />{' '}
                Supprimer
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleClose}
                  style={{
                    padding: '10px 18px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <HiX
                    size={14}
                    style={{ display: 'inline', marginRight: 4 }}
                  />{' '}
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '10px 18px',
                    background: saving
                      ? 'rgba(47,111,237,0.5)'
                      : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    boxShadow: '0 4px 14px rgba(47,111,237,0.35)',
                  }}
                >
                  <HiCheck
                    size={14}
                    style={{ display: 'inline', marginRight: 4 }}
                  />
                  {saving ? 'Sauvegarde…' : 'Modifier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default ColorsList;
