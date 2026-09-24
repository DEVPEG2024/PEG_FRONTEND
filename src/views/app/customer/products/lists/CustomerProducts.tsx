import { injectReducer, setOwnUser } from '@/store';
import reducer, {
  getCustomerProducts,
  useAppDispatch,
  useAppSelector,
  setProduct,
} from '../store';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import CustomerProductCard from './CustomerProductCard';
import { User } from '@/@types/user';
import { Customer } from '@/@types/customer';
import CatalogueBanner from '@/views/app/common/categories/CatalogueBanner';
import { loadOffersContext, OffersContext } from './offersContext';
import { isOffersReserved, resolveOffersView } from './offersView';
import OffersHero from './components/OffersHero';
import OffersEmptyState from './components/OffersEmptyState';
import OffersErrorState from './components/OffersErrorState';
import OffersNoResult from './components/OffersNoResult';
import OffersHelpStrip from './components/OffersHelpStrip';
import {
  OFFERS_PAGE_CSS,
  PRODUCT_GRID_STYLE,
  SR_ONLY_STYLE,
  SkeletonCard,
} from './components/offersUi';

injectReducer('customerProducts', reducer);

// Chargement par tranches : 100 produits d'un coup, c'était 100 images
// pleine taille sur mobile. On charge 24 puis on étend à la demande.
// Le slice remplace la liste à chaque réponse (il n'accumule pas) : on
// redemande donc la même page avec un pageSize plus grand.
const PAGE_SIZE = 24;

/** Champs du client que la page relit et qui peuvent être périmés dans le store. */
const SYNCED_FIELDS = [
  'premium',
  'premiumProcessed',
  'premiumSince',
  'catalogAccess',
] as const;

const CustomerProducts = () => {
  const { user }: { user?: User } = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { products, loading, loadingMore, loadMoreError, error, total } =
    useAppSelector((state) => state.customerProducts.data);

  const storeCustomer = user?.customer;
  const customerId = storeCustomer?.documentId || '';
  const hasCustomer = !!customerId;
  // Toujours la dernière version du client du store (bootstrap, « Réessayer »).
  const storeCustomerRef = useRef(storeCustomer);
  storeCustomerRef.current = storeCustomer;

  // Contexte client relu à part : /users/me ne peuple pas customerCategory,
  // sans lui les offres rattachées au secteur du client n'apparaissaient pas.
  const [context, setContext] = useState<OffersContext | null>(null);
  const contextRef = useRef<OffersContext | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Terme de la dernière requête envoyée (le champ, lui, est débouncé).
  const [appliedTerm, setAppliedTerm] = useState('');
  // Total de la dernière réponse SANS recherche : ne bouge pas pendant une recherche.
  const [baseTotal, setBaseTotal] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  // Dernière requête produits envoyée : seule sa réponse fait foi (le slice
  // ignore déjà les réponses périmées ; ceci protège baseTotal).
  const lastRequestIdRef = useRef<string | null>(null);
  // Dernier chargement de contexte lancé : un contexte périmé (client changé,
  // « Réessayer » doublé) n'enchaîne jamais sur une requête produits.
  const bootstrapRunRef = useRef(0);

  const fetchProducts = useCallback(
    (
      ctx: OffersContext,
      term: string,
      size: number = PAGE_SIZE,
      loadMore = false
    ) => {
      setAppliedTerm(term);
      const request = dispatch(
        getCustomerProducts({
          page: 1,
          pageSize: size,
          searchTerm: term,
          customerDocumentId: ctx.customerDocumentId,
          customerCategoryDocumentId: ctx.customerCategoryDocumentId,
          loadMore,
        })
      );
      lastRequestIdRef.current = request.requestId;
      request.then((action) => {
        if (!mountedRef.current) return;
        if (action.meta.requestId !== lastRequestIdRef.current) return;
        if (getCustomerProducts.fulfilled.match(action) && term.trim() === '') {
          setBaseTotal(action.payload.total);
        }
      });
    },
    [dispatch]
  );

  // Le contexte est relu en GraphQL à chaque ouverture ; le store (/users/me)
  // n'est pas rafraîchi après un paiement Stripe. On l'aligne pour que les prix
  // des cartes, le panier et le menu suivent le même statut Premium que la page.
  const syncStoreCustomer = useCallback(
    (ctx: OffersContext) => {
      const current = storeCustomerRef.current;
      if (!current?.documentId || current.documentId !== ctx.customerDocumentId)
        return;
      const patch: Partial<Customer> = {};
      SYNCED_FIELDS.forEach((field) => {
        const fresh = ctx[field];
        if (fresh === undefined || fresh === null) return;
        if (fresh !== current[field]) {
          (patch as Record<string, unknown>)[field] = fresh;
        }
      });
      if (Object.keys(patch).length === 0) return;
      dispatch(setOwnUser({ customer: { ...current, ...patch } as Customer }));
    },
    [dispatch]
  );

  // Contexte d'abord, produits ensuite (même enchaînement que le dashboard).
  const bootstrap = useCallback(
    (term: string) => {
      const run = ++bootstrapRunRef.current;
      setContext(null);
      contextRef.current = null;
      loadOffersContext(storeCustomerRef.current).then((ctx) => {
        if (!mountedRef.current || run !== bootstrapRunRef.current) return;
        contextRef.current = ctx;
        setContext(ctx);
        syncStoreCustomer(ctx);
        // Réservé aux Premium : un client Standard ne charge pas les offres.
        if (isOffersReserved(ctx.premium, ctx.catalogAccess)) return;
        fetchProducts(ctx, term, PAGE_SIZE);
      });
    },
    [fetchProducts, syncStoreCustomer]
  );

  // Relancé quand le client du store change : le profil persisté peut être
  // affiché avant la réponse de /users/me (useAuthBootstrap), et un compte
  // rattaché à une fiche après coup doit charger ses offres sans navigation.
  useEffect(() => {
    mountedRef.current = true;
    if (customerId) {
      dispatch(setProduct(null));
      setBaseTotal(null);
      bootstrap('');
    }
    return () => {
      mountedRef.current = false;
      clearTimeout(debounceRef.current);
    };
  }, [dispatch, bootstrap, customerId]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (contextRef.current) fetchProducts(contextRef.current, value);
    }, 400);
  };

  const handleClearSearch = () => {
    clearTimeout(debounceRef.current);
    setSearchTerm('');
    if (contextRef.current) fetchProducts(contextRef.current, '');
    inputRef.current?.focus();
  };

  // Taille calculée depuis la liste affichée : un « Voir plus » en échec puis
  // relancé redemande la même tranche (pas de saut).
  const handleLoadMore = () => {
    if (!contextRef.current) return;
    fetchProducts(
      contextRef.current,
      appliedTerm,
      products.length + PAGE_SIZE,
      true
    );
  };

  const handleRetry = () => {
    clearTimeout(debounceRef.current);
    bootstrap(searchTerm);
  };

  const view = resolveOffersView({
    hasCustomer,
    loading,
    contextLoaded: context !== null,
    error,
    searchTerm: appliedTerm,
    total,
    catalogAccess: context?.catalogAccess,
    premium: context?.premium,
    premiumProcessed: context?.premiumProcessed,
    premiumSince: context?.premiumSince,
  });

  const customerName =
    context?.customerName || storeCustomer?.name || undefined;
  const showSelection = context?.catalogAccess !== false;
  const remaining = Math.max(0, total - products.length);

  const renderContent = () => {
    switch (view) {
      case 'loading':
        return (
          <div aria-busy="true">
            <p className="sr-only" role="status" style={SR_ONLY_STYLE}>
              Chargement de vos offres…
            </p>
            <div style={PRODUCT_GRID_STYLE}>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        );

      case 'error':
        return <OffersErrorState onRetry={handleRetry} />;

      case 'noResult':
        return (
          <OffersNoResult
            searchTerm={appliedTerm}
            onClearSearch={handleClearSearch}
          />
        );

      case 'list':
        return (
          <>
            {appliedTerm && (
              <p
                aria-live="polite"
                className="peg-text-caption"
                style={{ margin: '0 0 14px', fontSize: '13px' }}
              >
                {total} résultat(s) pour « {appliedTerm} »
              </p>
            )}
            <div style={PRODUCT_GRID_STYLE}>
              {products.map((product, index) => (
                <CustomerProductCard
                  key={product.documentId}
                  product={product}
                  priority={index < 4}
                />
              ))}
            </div>
            {products.length < total && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '28px',
                }}
              >
                <button
                  type="button"
                  className="peg-tap-target"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  aria-busy={loadingMore || undefined}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#a0b9dc',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                    cursor: loadingMore ? 'default' : 'pointer',
                    opacity: loadingMore ? 0.7 : 1,
                  }}
                >
                  {loadingMore
                    ? 'Chargement…'
                    : `Afficher plus d'offres (${remaining} restante(s))`}
                </button>
                {loadMoreError && (
                  <p
                    role="alert"
                    className="peg-text-secondary"
                    style={{ margin: 0, fontSize: '13px', textAlign: 'center' }}
                  >
                    Impossible de charger plus d&apos;offres. Réessayez.
                  </p>
                )}
              </div>
            )}
            <OffersHelpStrip />
          </>
        );

      case 'standard':
      case 'preparing':
      case 'premium':
      case 'noCatalogue':
      case 'unknown':
      case 'noCustomer':
      default:
        return (
          <OffersEmptyState
            variant={view}
            customerName={customerName}
            premiumSince={context?.premiumSince}
            showSelection={showSelection}
            excludeIds={products.map((p) => p.documentId)}
          />
        );
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Animation des squelettes et de la frise (coupée si mouvement réduit) */}
      <style>{OFFERS_PAGE_CSS}</style>

      <OffersHero
        customerName={customerName}
        baseTotal={baseTotal}
        premium={context?.premium}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        inputRef={inputRef}
      />

      {/* Bannière : uniquement au-dessus d'une liste (jamais sur une page vide).
          Elle porte déjà sa marge basse de 24px. */}
      {view === 'list' && (
        <CatalogueBanner
          bannerName="Bannière offres"
          aspect="3.4 / 1"
          minHeight="220px"
          maxHeight="380px"
        />
      )}

      {renderContent()}
    </div>
  );
};

export default CustomerProducts;
