import { injectReducer, RootState } from '@/store';
import reducer, {
  getProducts,
  useAppDispatch,
  useAppSelector,
  setModalDeleteProductOpen,
  setModalDeleteProductClose,
  deleteProduct,
  duplicateProduct,
  updateProduct,
} from './store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pagination, Select } from '@/components/ui';
import { Product } from '@/@types/product';
import { Container, Loading, EmptyState } from '@/components/shared';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { OrderItem } from '@/@types/orderItem';
import { apiGetPendingOrderItemsLinkedToProduct } from '@/services/OrderItemServices';
import { apiGetAllProductsForExport, apiCreateProduct, apiUpdateProduct } from '@/services/ProductServices';
import { apiGetProductCategories } from '@/services/ProductCategoryServices';
import { apiGetCustomerCategories } from '@/services/CustomerCategoryServices';
import { apiGetSizes } from '@/services/SizeServices';
import { apiGetColors } from '@/services/ColorServices';
import { apiGetCustomers } from '@/services/CustomerServices';
import { apiGetForms } from '@/services/FormServices';
import { apiGetChecklists } from '@/services/ChecklistServices';
import { unwrapData } from '@/utils/serviceHelper';
import { PegFile } from '@/@types/pegFile';
import { apiDeleteFiles, apiLoadPegFilesAndFiles } from '@/services/FileServices';
import { toast } from 'react-toastify';
import ProductCard from './ProductCard';
import { HiOutlineSearch, HiPlus, HiExclamation, HiDownload, HiUpload } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import CatalogueBanner from '@/views/app/common/categories/CatalogueBanner';

injectReducer('products', reducer);

type PageOption = { value: number; label: string };

const ProductsList = () => {
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector(
    (state: RootState) => state.auth.user
  );
  const isAdminOrSuperAdmin: boolean = hasRole(user, [ADMIN, SUPER_ADMIN]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isAdminOrSuperAdmin ? 100 : 10);
  const [searchTerm, setSearchTerm] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product>();
  const { products, modalDeleteProduct, loading, total } = useAppSelector(
    (state) => state.products.data
  );

  useEffect(() => {
    dispatch(getProducts({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const onDeleted = async () => {
    if (productToDelete) {
      dispatch(deleteProduct(productToDelete.documentId));
      try {
        if (productToDelete.images?.length > 0) {
          const pegFilesToDelete: PegFile[] = await apiLoadPegFilesAndFiles(productToDelete.images);
          apiDeleteFiles(pegFilesToDelete.map((f) => f.id));
        }
      } catch {
        // Images introuvables ou déjà supprimées — on continue
      }
    }
    dispatch(setModalDeleteProductClose());
  };

  const onDeleteModalOpen = async (product: Product) => {
    const { orderItems: pending }: { orderItems: OrderItem[] } = await unwrapData(
      apiGetPendingOrderItemsLinkedToProduct(product.documentId)
    );
    if (pending.length > 0) {
      toast.warn('Au moins une commande en cours est rattachée à ce produit');
    } else {
      setProductToDelete(product);
      dispatch(setModalDeleteProductOpen());
    }
  };

  const onDeleteModalClose = () => {
    setProductToDelete(undefined);
    dispatch(setModalDeleteProductClose());
  };

  const onActivate = (product: Product, checked: boolean) => {
    dispatch(updateProduct({ documentId: product.documentId, active: checked }));
    toast.success(checked ? 'Produit activé' : 'Produit désactivé');
  };

  const onDuplicate = async (product: Product) => {
    dispatch(duplicateProduct(product));
    toast.success('Produit dupliqué');
  };

  const handlePaginationChange = (page: number) => {
    if (!loading) setCurrentPage(page);
  };

  const pageSizeOption: PageOption[] = useMemo(
    () => [10, 25, 50, 100].map((n) => ({ value: n, label: `${n} / page` })),
    []
  );

  const handleSelectChange = (value?: number) => {
    if (!loading) {
      setPageSize(Number(value));
      setCurrentPage(1);
    }
  };

  const handleOnDeleteModalOpen = useCallback((product: Product) => { onDeleteModalOpen(product); }, []);
  const handleOnActivate = useCallback((product: Product, checked: boolean) => { onActivate(product, checked); }, []);
  const handleOnDuplicate = useCallback((product: Product) => { onDuplicate(product); }, []);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.replace(/^\uFEFF/, '').split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('Fichier CSV vide ou invalide');
        return;
      }

      const headers = parseCsvLine(lines[0]);
      // Recherche une colonne par l'un de ses libellés possibles (insensible à la casse)
      const idxOf = (...names: string[]) =>
        headers.findIndex(h => names.includes(h.trim().toLowerCase()));

      const nomIdx = idxOf('nom');
      const descIdx = idxOf('description');
      const prixIdx = idxOf('prix');
      const paliersIdx = idxOf('paliers de prix');
      const actifIdx = idxOf('actif');
      const catalogueIdx = idxOf('en catalogue');
      const refIdx = idxOf('référence', 'reference');
      const batIdx = idxOf('requiert bat');
      const catProdIdx = idxOf('catégorie produit', 'categorie produit', 'catégorie', 'categorie');
      const catClientIdx = idxOf('catégories clients', 'categories clients', 'catégorie client', 'categorie client', 'catégories client');
      const clientsIdx = idxOf('clients', 'client(s)', 'client');
      const taillesIdx = idxOf('tailles', 'taille');
      const couleursIdx = idxOf('couleurs', 'couleur');
      const formIdx = idxOf('formulaire');
      const checklistIdx = idxOf('checklist');

      if (nomIdx === -1) {
        toast.error('Colonne "Nom" introuvable dans le CSV');
        return;
      }

      // Tables de correspondance nom → documentId pour résoudre les relations,
      // et liste des produits existants pour décider create vs update (anti-doublon).
      const norm = (s?: string) => (s || '').trim().toLowerCase();
      const splitNames = (cell?: string) =>
        (cell || '').split(',').map(n => n.trim()).filter(Boolean);
      const buildMap = (nodes: { documentId: string; name: string }[]) => {
        const m = new Map<string, string>();
        nodes.forEach(n => { if (n?.name) m.set(norm(n.name), n.documentId); });
        return m;
      };

      let existingByName = new Map<string, string>();
      let pcMap = new Map<string, string>();
      let ccMap = new Map<string, string>();
      let custMap = new Map<string, string>();
      let szMap = new Map<string, string>();
      let clrMap = new Map<string, string>();
      let formMap = new Map<string, string>();
      let chkMap = new Map<string, string>();

      try {
        const [existing, pc, cc, sz, clr, cust, frm] = await Promise.all([
          unwrapData(apiGetAllProductsForExport()),
          unwrapData(apiGetProductCategories({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
          unwrapData(apiGetCustomerCategories({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
          unwrapData(apiGetSizes({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
          unwrapData(apiGetColors({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
          unwrapData(apiGetCustomers({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
          unwrapData(apiGetForms({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' })),
        ]);
        existingByName = buildMap((existing as any).products || []);
        pcMap = buildMap((pc as any).productCategories_connection?.nodes || []);
        ccMap = buildMap((cc as any).customerCategories_connection?.nodes || []);
        szMap = buildMap((sz as any).sizes_connection?.nodes || []);
        clrMap = buildMap((clr as any).colors_connection?.nodes || []);
        custMap = buildMap((cust as any).customers_connection?.nodes || []);
        formMap = buildMap((frm as any).forms_connection?.nodes || []);
      } catch {
        toast.error('Impossible de charger les références (catégories, tailles…). Import annulé.');
        return;
      }

      // Checklist : champ Strapi optionnel/gaté — on charge sans bloquer l'import s'il est absent
      try {
        const chk = await unwrapData(apiGetChecklists({ pagination: { page: 1, pageSize: 1000 }, searchTerm: '' }));
        chkMap = buildMap((chk as any).checklists_connection?.nodes || []);
      } catch {
        chkMap = new Map();
      }

      let created = 0;
      let updated = 0;
      let errors = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const name = cols[nomIdx]?.trim();
        if (!name) continue;

        const productData: Record<string, unknown> = { name };

        // --- Champs scalaires (omis si la colonne est absente pour ne pas écraser en update) ---
        if (descIdx !== -1) {
          const v = (cols[descIdx] || '').trim();
          if (v) productData.description = v;
        }
        if (prixIdx !== -1 && cols[prixIdx]?.trim()) {
          productData.price = parseFloat(cols[prixIdx]);
        }
        if (paliersIdx !== -1 && cols[paliersIdx]) {
          const priceTiers: { minQuantity: number; price: number }[] = [];
          for (const part of cols[paliersIdx].split('|').map(s => s.trim())) {
            const match = part.match(/^(\d+)\+:\s*([\d.]+)/);
            if (match) priceTiers.push({ minQuantity: parseInt(match[1]), price: parseFloat(match[2]) });
          }
          if (priceTiers.length) productData.priceTiers = priceTiers;
        }
        if (actifIdx !== -1) productData.active = norm(cols[actifIdx]) === 'oui';
        if (catalogueIdx !== -1) productData.inCatalogue = norm(cols[catalogueIdx]) === 'oui';
        if (refIdx !== -1) {
          const v = (cols[refIdx] || '').trim();
          if (v) productData.productRef = v;
        }
        if (batIdx !== -1) productData.requiresBat = norm(cols[batIdx]) === 'oui';

        // --- Relations (résolues par nom ; omises si vides pour ne pas écraser en update) ---
        if (catProdIdx !== -1) {
          const id = pcMap.get(norm(cols[catProdIdx]));
          if (id) productData.productCategory = id;
        }
        if (catClientIdx !== -1) {
          const ids = splitNames(cols[catClientIdx]).map(n => ccMap.get(norm(n))).filter(Boolean);
          if (ids.length) productData.customerCategories = ids;
        }
        if (clientsIdx !== -1) {
          const ids = splitNames(cols[clientsIdx]).map(n => custMap.get(norm(n))).filter(Boolean);
          if (ids.length) productData.customers = ids;
        }
        if (taillesIdx !== -1) {
          const ids = splitNames(cols[taillesIdx]).map(n => szMap.get(norm(n))).filter(Boolean);
          if (ids.length) productData.sizes = ids;
        }
        if (couleursIdx !== -1) {
          const ids = splitNames(cols[couleursIdx]).map(n => clrMap.get(norm(n))).filter(Boolean);
          if (ids.length) productData.colors = ids;
        }
        if (formIdx !== -1) {
          const id = formMap.get(norm(cols[formIdx]));
          if (id) productData.form = id;
        }
        if (checklistIdx !== -1) {
          const id = chkMap.get(norm(cols[checklistIdx]));
          if (id) productData.checklist = id;
        }

        const existingId = existingByName.get(norm(name));
        try {
          if (existingId) {
            // Produit du même nom déjà présent → mise à jour (évite le doublon)
            await unwrapData(apiUpdateProduct({ documentId: existingId, ...productData } as any));
            updated++;
          } else {
            const res: any = await unwrapData(apiCreateProduct(productData as any));
            // Mémorise l'id pour éviter un doublon si le nom réapparaît plus bas dans le fichier
            const newId = res?.createProduct?.documentId;
            if (newId) existingByName.set(norm(name), newId);
            created++;
          }
        } catch {
          errors++;
        }
      }

      const summary: string[] = [];
      if (created) summary.push(`${created} créé${created > 1 ? 's' : ''}`);
      if (updated) summary.push(`${updated} mis à jour`);
      if (errors) summary.push(`${errors} erreur${errors > 1 ? 's' : ''}`);
      toast.success(`Import terminé — ${summary.join(', ') || 'aucune ligne'}`);
      dispatch(getProducts({ pagination: { page: currentPage, pageSize }, searchTerm }));
    } catch {
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { products: allProducts }: { products: Product[] } = await unwrapData(
        apiGetAllProductsForExport()
      );

      const escapeCsv = (val: string) => {
        if (val.includes('"') || val.includes(',') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const headers = [
        'Nom', 'Description', 'Prix', 'Paliers de prix',
        'Actif', 'En catalogue', 'Référence', 'Requiert BAT',
        'Catégorie produit', 'Catégories clients', 'Clients',
        'Tailles', 'Couleurs', 'Formulaire', 'Checklist', 'Images',
      ];

      const rows = allProducts.map((p) => [
        escapeCsv(p.name || ''),
        escapeCsv((p.description || '').replace(/<[^>]*>/g, '')),
        p.price != null ? String(p.price) : '',
        escapeCsv(
          (p.priceTiers || [])
            .map((t) => `${t.minQuantity}+: ${t.price}€`)
            .join(' | ')
        ),
        p.active ? 'Oui' : 'Non',
        p.inCatalogue ? 'Oui' : 'Non',
        escapeCsv(p.productRef || ''),
        p.requiresBat ? 'Oui' : 'Non',
        escapeCsv(p.productCategory?.name || ''),
        escapeCsv((p.customerCategories || []).map((cc) => cc.name).join(', ')),
        escapeCsv((p.customers || []).map((c) => c.name).join(', ')),
        escapeCsv((p.sizes || []).map((s) => s.name).join(', ')),
        escapeCsv((p.colors || []).map((c) => c.name).join(', ')),
        escapeCsv(p.form?.name || ''),
        escapeCsv(p.checklist?.name || ''),
        escapeCsv((p.images || []).map((img) => img.url).join(', ')),
      ]);

      const bom = '\uFEFF';
      const csv = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${allProducts.length} produits exportés`);
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const inactiveProducts = useMemo(() => products.filter((p) => !p.active), [products]);
  const activeCount = activeProducts.length;
  const inactiveCount = inactiveProducts.length;

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Catalogue
          </p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Produits{' '}
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>● {activeCount} actifs</span>
            <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 600 }}>● {inactiveCount} inactifs</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px', padding: '10px 18px',
              color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
              cursor: exporting ? 'wait' : 'pointer',
              opacity: exporting ? 0.5 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiDownload size={16} /> {exporting ? 'Export…' : 'Export CSV'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px', padding: '10px 18px',
              color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
              cursor: importing ? 'wait' : 'pointer',
              opacity: importing ? 0.5 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <HiUpload size={16} /> {importing ? 'Import…' : 'Import CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImportCSV}
          />
          <Link to="/admin/products/new" style={{ textDecoration: 'none' }}>
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                border: 'none', borderRadius: '10px', padding: '10px 18px',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <HiPlus size={16} /> Nouveau produit
            </button>
          </Link>
        </div>
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{
          position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.55)', pointerEvents: 'none',
        }} />
        <input
          type="text"
          placeholder="Rechercher un produit…"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '10px',
            padding: '10px 14px 10px 36px',
            color: '#fff', fontSize: '13px',
            fontFamily: 'Inter, sans-serif', outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; }}
        />
      </div>

      {/* Bannière */}
      <div style={{ marginBottom: '24px' }}>
        <CatalogueBanner bannerName="Bannière offres" aspect="3.4 / 1" minHeight="220px" maxHeight="380px" />
      </div>

      <Loading loading={loading} type="cover">
        {products.length > 0 ? (
          <>
            {/* Section Actifs */}
            {activeProducts.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.4)',
                  }} />
                  <h3 style={{
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    letterSpacing: '-0.01em', margin: 0,
                  }}>
                    En ligne
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>
                      ({activeProducts.length})
                    </span>
                  </h3>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px',
                }}>
                  {activeProducts.map((product) => (
                    <ProductCard
                      key={product.documentId}
                      product={product}
                      onDeleteModalOpen={handleOnDeleteModalOpen}
                      onActivate={handleOnActivate}
                      onDuplicate={handleOnDuplicate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section Inactifs */}
            {inactiveProducts.length > 0 && (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '16px',
                }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#f87171', boxShadow: '0 0 8px rgba(248,113,113,0.3)',
                  }} />
                  <h3 style={{
                    color: '#fff', fontSize: '16px', fontWeight: 700,
                    letterSpacing: '-0.01em', margin: 0,
                  }}>
                    Inactifs
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontWeight: 500, marginLeft: '8px' }}>
                      ({inactiveProducts.length})
                    </span>
                  </h3>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px',
                  opacity: 0.7,
                }}>
                  {inactiveProducts.map((product) => (
                    <ProductCard
                      key={product.documentId}
                      product={product}
                      onDeleteModalOpen={handleOnDeleteModalOpen}
                      onActivate={handleOnActivate}
                      onDuplicate={handleOnDuplicate}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <EmptyState
              title="Aucun produit"
              description="Ajoutez votre premier produit pour commencer"
              icon={<HiOutlineSearch size={48} />}
            />
          )
        )}

        {/* Pagination */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: '12px', marginTop: '32px', paddingBottom: '32px', flexWrap: 'wrap',
        }}>
          <Pagination
            pageSize={pageSize}
            currentPage={currentPage}
            total={total}
            onChange={handlePaginationChange}
          />
          <div style={{ minWidth: '130px' }}>
            <Select
              size="sm"
              menuPlacement="top"
              isSearchable={false}
              value={pageSizeOption.filter((o) => o.value === pageSize)}
              options={pageSizeOption}
              onChange={(option) => handleSelectChange((option as PageOption)?.value)}
            />
          </div>
        </div>
      </Loading>

      {/* Modal suppression */}
      {modalDeleteProduct && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
          onClick={onDeleteModalClose}
        >
          <div
            style={{
              background: 'linear-gradient(160deg, #1a2f4a 0%, #111e30 100%)',
              border: '1.5px solid rgba(239,68,68,0.25)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              fontFamily: 'Inter, sans-serif',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icône */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
            }}>
              <HiExclamation size={26} style={{ color: '#f87171' }} />
            </div>

            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Supprimer le produit ?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.5 }}>
              {productToDelete?.name && (
                <><span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>"{productToDelete.name}"</span> sera supprimé définitivement. Cette action est irréversible.</>
              )}
              {!productToDelete?.name && 'Cette action est irréversible.'}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onDeleteModalClose}
                style={{
                  flex: 1, padding: '11px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px', color: 'rgba(255,255,255,0.6)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Annuler
              </button>
              <button
                onClick={onDeleted}
                style={{
                  flex: 1, padding: '11px',
                  background: 'linear-gradient(90deg, #dc2626, #b91c1c)',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 14px rgba(220,38,38,0.4)',
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default ProductsList;
