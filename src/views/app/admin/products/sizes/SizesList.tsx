import { Container } from '@/components/shared';
import { useEffect, useRef, useState } from 'react';
import { Select } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  createSize,
  deleteSize,
  getSizes,
  updateSize,
  useAppSelector,
} from './store';
import { Size, ProductCategory } from '@/@types/product';
import {
  HiOutlineSearch,
  HiTrash,
  HiPencil,
  HiX,
  HiCheck,
  HiPlus,
  HiLightningBolt,
  HiOutlineLink,
  HiOutlineViewGrid,
  HiOutlineTable,
} from 'react-icons/hi';
import { MdStraighten } from 'react-icons/md';
import { toast } from 'react-toastify';
import { unwrapData } from '@/utils/serviceHelper';
import {
  apiGetProductCategories,
  apiDeleteProductCategory,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';

injectReducer('sizes', reducer);

type Option = { value: string; label: string };
type ViewMode = 'matrix' | 'cards';

const TEMPLATES = [
  {
    icon: '👕',
    label: 'Vêtement',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  },
  { icon: '🧢', label: 'Accessoire', sizes: ['Taille unique'] },
  {
    icon: '👟',
    label: 'Pointures',
    sizes: ['37', '38', '39', '40', '41', '42', '43', '44', '45'],
  },
  { icon: '🖨️', label: 'Print', sizes: ['A3', 'A4', 'A5'] },
];

// Tri naturel des tailles : XS < S < M < L < XL < XXL < 3XL, puis numérique (pointures), puis alpha
const SIZE_SCALE = [
  'xxxs',
  'xxs',
  'xs',
  's',
  'm',
  'l',
  'xl',
  'xxl',
  'xxxl',
  'xxxxl',
  'xxxxxl',
];
const SIZE_ALIASES: Record<string, string> = {
  '2xl': 'xxl',
  '3xl': 'xxxl',
  '4xl': 'xxxxl',
  '5xl': 'xxxxxl',
};
const sizeRank = (name: string): [number, number | string] => {
  let n = name.trim().toLowerCase();
  n = SIZE_ALIASES[n] ?? n;
  const li = SIZE_SCALE.indexOf(n);
  if (li !== -1) return [0, li];
  const num = parseFloat(name.replace(',', '.'));
  if (!isNaN(num) && /^[\d.,\s]+$/.test(name.trim())) return [1, num];
  return [2, name.trim().toLowerCase()];
};
const compareSizes = (a: Size, b: Size): number => {
  const [ga, va] = sizeRank(a.name);
  const [gb, vb] = sizeRank(b.name);
  if (ga !== gb) return ga - gb;
  if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  return String(va).localeCompare(String(vb));
};

// Catégories d'une taille (relation multiple, fallback ancien champ unique)
const sizeCategories = (s: Size): ProductCategory[] => {
  if (s.productCategories && s.productCategories.length)
    return s.productCategories;
  if (s.productCategory) return [s.productCategory];
  return [];
};

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

  // Vue : tableau croisé (par défaut) ou cartes par catégorie
  const [view, setView] = useState<ViewMode>('matrix');

  // Cellules en cours de sauvegarde (matrice) — clés `${sizeId}:${catId}`
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());

  // Quick-add state
  const [quickInput, setQuickInput] = useState('');
  const [quickCategories, setQuickCategories] = useState<Option[]>([]);
  const [quickSaving, setQuickSaving] = useState(false);

  // Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<Size | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategories, setFormCategories] = useState<Option[]>([]);
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

  // ── Données vue CARTES — une taille apparaît sous chacune de ses catégories ──
  const grouped = sizes
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        sizeCategories(s).some((c) => c.name?.toLowerCase().includes(search))
    )
    .reduce<
      Record<string, { category: ProductCategory | null; sizes: Size[] }>
    >((acc, size) => {
      const cats = sizeCategories(size);
      if (cats.length === 0) {
        (acc['__none__'] ??= { category: null, sizes: [] }).sizes.push(size);
      } else {
        cats.forEach((cat) => {
          (acc[cat.documentId] ??= { category: cat, sizes: [] }).sizes.push(
            size
          );
        });
      }
      return acc;
    }, {});
  const groups = Object.values(grouped)
    .map((g) => ({ ...g, sizes: [...g.sizes].sort(compareSizes) }))
    .sort((a, b) => {
      if (!a.category) return 1;
      if (!b.category) return -1;
      return a.category.name.localeCompare(b.category.name);
    });

  // ── Données vue MATRICE — UNE ligne par NOM de taille (regroupe les doublons historiques) ──
  type MatrixRow = {
    name: string;
    description: string;
    entities: Size[];
    catIds: Set<string>;
  };
  const matrixRows: MatrixRow[] = Object.values(
    sizes
      .filter((s) => s.name.toLowerCase().includes(search))
      .reduce<Record<string, MatrixRow>>((acc, s) => {
        const k = s.name.trim().toLowerCase();
        if (!acc[k])
          acc[k] = {
            name: s.name,
            description: s.description || '',
            entities: [],
            catIds: new Set(),
          };
        acc[k].entities.push(s);
        sizeCategories(s).forEach((c) => acc[k].catIds.add(c.documentId));
        return acc;
      }, {})
  ).sort((a, b) =>
    compareSizes({ name: a.name } as Size, { name: b.name } as Size)
  );

  // Parse quick input into trimmed names
  const parsedSizes = quickInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Noms de tailles déjà existants (toutes catégories confondues) → fusion plutôt que doublon
  const existingNamesSet = new Set(
    sizes.map((s) => s.name.trim().toLowerCase())
  );

  // Toggle d'une cellule de la matrice (par NOM) — rattache/détache et sauvegarde aussitôt.
  // Ajout → sur la 1ʳᵉ entité du nom. Retrait → sur toutes les entités du nom qui ont la catégorie.
  const toggleNameRow = async (row: MatrixRow, catId: string) => {
    const has = row.catIds.has(catId);
    const key = `${row.name.toLowerCase()}:${catId}`;
    setSavingCells((prev) => new Set(prev).add(key));
    try {
      const apply = async (e: Size, next: string[]) => {
        const r = await dispatch(
          updateSize({
            documentId: e.documentId,
            name: e.name,
            value: e.value || e.name,
            description: e.description || '',
            productCategories: next,
          })
        );
        if (r.meta.requestStatus !== 'fulfilled')
          toast.error('Échec de la sauvegarde');
      };
      if (has) {
        const targets = row.entities.filter((e) =>
          sizeCategories(e).some((c) => c.documentId === catId)
        );
        for (const e of targets) {
          await apply(
            e,
            sizeCategories(e)
              .map((c) => c.documentId)
              .filter((id) => id !== catId)
          );
        }
      } else {
        const e = row.entities[0];
        await apply(e, [...sizeCategories(e).map((c) => c.documentId), catId]);
      }
    } finally {
      setSavingCells((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  };

  // Quick add handler — crée la taille ou ajoute les catégories sélectionnées si elle existe déjà
  const handleQuickAdd = async () => {
    if (quickCategories.length === 0) {
      toast.error('Sélectionne au moins une catégorie');
      return;
    }
    if (parsedSizes.length === 0) {
      toast.error('Saisis au moins une taille');
      return;
    }
    const selectedIds = quickCategories.map((c) => c.value);
    setQuickSaving(true);
    try {
      let created = 0;
      let updated = 0;
      let unchanged = 0;
      let errors = 0;
      for (const name of parsedSizes) {
        const existing = sizes.find(
          (s) => s.name.trim().toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          const currentIds = sizeCategories(existing).map((c) => c.documentId);
          const union = Array.from(new Set([...currentIds, ...selectedIds]));
          if (union.length === currentIds.length) {
            unchanged++;
            continue;
          }
          const r = await dispatch(
            updateSize({
              documentId: existing.documentId,
              name: existing.name,
              value: existing.value || existing.name,
              description: existing.description || '',
              productCategories: union,
            })
          );
          r.meta.requestStatus === 'fulfilled' ? updated++ : errors++;
        } else {
          const r = await dispatch(
            createSize({
              name,
              value: name,
              description: '',
              productCategories: selectedIds,
            })
          );
          r.meta.requestStatus === 'fulfilled' ? created++ : errors++;
        }
      }
      const parts: string[] = [];
      if (created) parts.push(`${created} créée${created > 1 ? 's' : ''}`);
      if (updated)
        parts.push(
          `${updated} rattachée${updated > 1 ? 's' : ''} à de nouvelles catégories`
        );
      if (unchanged) parts.push(`${unchanged} déjà à jour`);
      if (parts.length) toast.success(parts.join(' · '));
      if (errors) toast.error(`${errors} erreur${errors > 1 ? 's' : ''}`);
      setQuickInput('');
      quickInputRef.current?.focus();
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
    setFormCategories(
      sizeCategories(size).map((c) => ({ value: c.documentId, label: c.name }))
    );
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingSize(null);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const result = await dispatch(
        updateSize({
          documentId: editingSize!.documentId,
          name: formName,
          value: formName,
          description: formDescription,
          productCategories: formCategories.map((c) => c.value),
        })
      );
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success('Taille modifiée');
        handleClose();
      } else toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (size: Size) => {
    if (
      !window.confirm(
        `Supprimer définitivement la taille "${size.name}" de toutes les catégories ?`
      )
    )
      return;
    await dispatch(deleteSize(size.documentId));
    toast.success('Taille supprimée');
    if (editingSize?.documentId === size.documentId) handleClose();
  };

  // Retirer une taille d'UNE seule catégorie (sans la supprimer ailleurs)
  const handleRemoveFromCategory = async (size: Size, categoryId: string) => {
    const remaining = sizeCategories(size)
      .map((c) => c.documentId)
      .filter((id) => id !== categoryId);
    const result = await dispatch(
      updateSize({
        documentId: size.documentId,
        name: size.name,
        value: size.value || size.name,
        description: size.description || '',
        productCategories: remaining,
      })
    );
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success(
        remaining.length
          ? 'Retirée de la catégorie'
          : 'Taille désormais sans catégorie'
      );
    } else {
      toast.error('Erreur lors du retrait');
    }
  };

  const handleDeleteCategory = async (category: ProductCategory) => {
    if (
      !window.confirm(
        `Supprimer la catégorie "${category.name}" ? Cette action est irréversible.`
      )
    )
      return;
    try {
      await apiDeleteProductCategory(category.documentId);
      toast.success(`Catégorie "${category.name}" supprimée`);
      fetchCategories();
      dispatch(
        getSizes({ pagination: { page: 1, pageSize: 1000 }, searchTerm })
      );
    } catch {
      toast.error('Erreur lors de la suppression');
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
    background: 'linear-gradient(160deg, #16263d 0%, #14233a 100%)',
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
            Tailles{' '}
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
            · une taille peut couvrir plusieurs catégories
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
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => handleTemplate(tpl.sizes)}
              title={tpl.sizes.join(', ')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '100px',
                padding: '6px 13px',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(47,111,237,0.5)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(47,111,237,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
            >
              <span>{tpl.icon}</span>
              <span>{tpl.label}</span>
            </button>
          ))}
        </div>

        {/* Row: catégories (multi) + saisie + bouton */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'stretch',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: '260px', flex: '0 0 260px' }}>
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
          <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
            <input
              ref={quickInputRef}
              type="text"
              placeholder="S, M, L, XL  (séparés par des virgules)  → Entrée"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              style={{
                ...inputStyle,
                paddingRight: '40px',
                height: '100%',
                minHeight: '40px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(47,111,237,0.5)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.12)';
              }}
            />
          </div>
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
            }}
          >
            <HiPlus size={15} />
            {quickSaving ? 'Création…' : 'Ajouter'}
          </button>
        </div>

        {parsedSizes.length > 0 && (
          <div
            style={{
              marginTop: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginRight: '4px',
              }}
            >
              Aperçu :
            </span>
            {parsedSizes.map((name) => {
              const exists = existingNamesSet.has(name.toLowerCase());
              return (
                <span
                  key={name}
                  title={
                    exists
                      ? 'Existe déjà — les catégories sélectionnées y seront ajoutées'
                      : 'Nouvelle taille'
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: exists
                      ? 'rgba(96,165,250,0.12)'
                      : 'rgba(47,111,237,0.12)',
                    border: `1px solid ${exists ? 'rgba(96,165,250,0.3)' : 'rgba(47,111,237,0.3)'}`,
                    color: exists ? '#93c5fd' : '#6b9eff',
                  }}
                >
                  {exists && <HiOutlineLink size={11} />}
                  {name}
                </span>
              );
            })}
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
          placeholder="Rechercher une taille ou catégorie…"
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
            tailles.
          </div>
        ) : matrixRows.length === 0 ? (
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
            Aucune taille — crée-en une ci-dessus.
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
              Coche une case pour rattacher la taille à la catégorie ·
              sauvegarde automatique
            </p>
            <div
              style={{
                overflow: 'auto',
                maxHeight: 'calc(100vh - 180px)',
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
                        color: 'rgba(255,255,255,0.6)',
                        textTransform: 'uppercase',
                        fontSize: '11px',
                      }}
                    >
                      Taille
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
                  {matrixRows.map((row, ri) => {
                    const ids = row.catIds;
                    return (
                      <tr
                        key={row.name}
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
                          {row.name}
                          {row.description && (
                            <span
                              style={{
                                color: 'rgba(255,255,255,0.3)',
                                fontSize: '11px',
                                marginLeft: 6,
                              }}
                            >
                              {row.description}
                            </span>
                          )}
                          {ids.size > 1 && (
                            <span
                              title={`Présente dans ${ids.size} catégories`}
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
                                marginLeft: 8,
                              }}
                            >
                              <HiOutlineLink size={10} />
                              {ids.size}
                            </span>
                          )}
                        </td>
                        {productCategories.map((cat) => {
                          const checked = ids.has(cat.value);
                          const key = `${row.name.toLowerCase()}:${cat.value}`;
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
                                onClick={() => toggleNameRow(row, cat.value)}
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
            <MdStraighten
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
              Aucune taille — crée-en une ci-dessus
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
            {groups.map(({ category, sizes: catSizes }) => (
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
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
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
                      <MdStraighten size={16} style={{ color: '#6b9eff' }} />
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
                        {catSizes.length} taille{catSizes.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {category && (
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      title="Supprimer la catégorie"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.2)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        color: 'rgba(248,113,113,0.7)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          'rgba(248,113,113,0.15)';
                        e.currentTarget.style.color = '#f87171';
                        e.currentTarget.style.borderColor =
                          'rgba(248,113,113,0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          'rgba(248,113,113,0.08)';
                        e.currentTarget.style.color = 'rgba(248,113,113,0.7)';
                        e.currentTarget.style.borderColor =
                          'rgba(248,113,113,0.2)';
                      }}
                    >
                      <HiTrash size={13} />
                      Supprimer la catégorie
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {catSizes.map((size) => {
                    const catCount = sizeCategories(size).length;
                    return (
                      <div
                        key={size.documentId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '100px',
                          padding: '6px 12px',
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
                        <span
                          style={{
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}
                        >
                          {size.name}
                        </span>
                        {size.description && (
                          <span
                            style={{
                              color: 'rgba(255,255,255,0.35)',
                              fontSize: '11px',
                            }}
                          >
                            · {size.description}
                          </span>
                        )}
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
                          onClick={() => openEdit(size)}
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
                                  size,
                                  category.documentId
                                )
                              : handleDelete(size)
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
              width: '480px',
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
                Modifier la taille
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
                <label style={labelStyle}>Nom *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: XL, 42…"
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
                <label style={labelStyle}>Description</label>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Extra Large"
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
                  Une même taille peut être rattachée à plusieurs catégories —
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
                onClick={() => editingSize && handleDelete(editingSize)}
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
                  {saving ? 'Sauvegarde…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default SizesList;
