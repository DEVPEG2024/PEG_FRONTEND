import { Container } from '@/components/shared';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiGetSuggestedProducts } from '@/services/ProductServices';
import { apiGetFallbackBanners } from '@/services/BannerServices';
import { BannerVisual, pickDesktopImage, pickPhoneImage } from '@/utils/bannerVisual';
import CustomerHomeBanner from './CustomerHomeBanner';
import DashboardCustomerMobile, { PcmProduct, PcmRow } from './DashboardCustomerMobile';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@/@types/user';
import {
  HiOutlineClock,
  HiOutlineCollection,
  HiOutlineShoppingCart,
  HiOutlineDocumentText,
  HiOutlineSupport,
  HiOutlineFolder,
  HiOutlineDocumentDownload,
  HiOutlineCube,
  HiArrowRight,
  HiChevronRight,
} from 'react-icons/hi';
import { Project } from '@/@types/project';
import { Product } from '@/@types/product';
import dayjs from 'dayjs';
import { getProductBasePrice, applyPremiumDiscount } from '@/utils/productHelpers';
import { fmtHT, fmtPrice, fmtTTC } from '@/utils/priceHelpers';
import { apiGetCustomerInvoiceSummaries, CustomerInvoiceSummary } from '@/services/InvoicesServices';
import { isInvoiceCanceled, isInvoiceOutstanding, isTransferPending } from '@/utils/invoiceStatus';
import useResponsive from '@/utils/hooks/useResponsive';
import useDashboardPhoto from '@/utils/hooks/useDashboardPhoto';
import reducer, {
  getDashboardCustomerInformations,
  useAppSelector,
} from './store';
import { isOffersReserved, showCatalogSuggestions } from '@/views/app/customer/products/lists/offersView';

injectReducer('dashboardCustomer', reducer);

const FONT = 'Inter, sans-serif';
// Numéro que l'assistant IA donne déjà aux clients (TOOL_GUIDANCE, peg_strapi)
const PEG_TEAM_PHONE = '06 59 25 28 23';
const CARD_BG = 'linear-gradient(165deg, #161a2e 0%, #0e1120 100%)';
const CARD_BORDER = '1px solid rgba(255,255,255,0.08)';
const CARD_SHADOW = '0 10px 30px rgba(0,0,0,0.4)';

const STATE_INFO: Record<string, { label: string; color: string }> = {
  pending: { label: 'En cours', color: '#7c6bff' },
  waiting: { label: 'En attente', color: '#fbbf24' },
  sav: { label: 'SAV', color: '#fb923c' },
  fulfilled: { label: 'Terminé', color: '#4ade80' },
  canceled: { label: 'Annulé', color: '#f87171' },
};
const getStateInfo = (s: string) => STATE_INFO[s] || { label: 'En cours', color: '#7c6bff' };

const SectionCard = ({ children, style }: { children: ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    background: CARD_BG,
    border: CARD_BORDER,
    borderRadius: '18px',
    boxShadow: CARD_SHADOW,
    padding: '22px 24px',
    fontFamily: FONT,
    ...style,
  }}>
    {children}
  </div>
);

const SectionHeader = ({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
      {icon && <span style={{ color: '#a99bff', display: 'flex' }}>{icon}</span>}
      <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>{title}</h3>
    </div>
    {action}
  </div>
);

/** Une ligne du bloc « À faire » : un libellé, un motif, une action. */
const TodoRow = ({ first, color, icon, title, sub, cta, onClick }: {
  first: boolean; color: string; icon: ReactNode; title: string; sub: string; cta: string; onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="peg-stack-mobile"
    style={{
      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
      padding: '13px 4px', borderTop: first ? 'none' : '1px solid rgba(255,255,255,0.06)',
      fontFamily: FONT,
    }}
  >
    <span style={{ width: '34px', height: '34px', flexShrink: 0, borderRadius: '10px', background: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </span>
    <span style={{ minWidth: 0, flex: 1 }}>
      <span style={{ display: 'block', color: '#fff', fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      <span style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '11.5px', marginTop: '2px' }}>{sub}</span>
    </span>
    <span className="peg-tap-target" style={{ flexShrink: 0, color, background: `${color}1f`, border: `1px solid ${color}55`, borderRadius: '9px', padding: '5px 12px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {cta} →
    </span>
  </div>
);

const DashboardCustomer = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { customer, products, projects, loading } = useAppSelector(
    (state) => state.dashboardCustomer.data
  );
  const { user }: { user: User } = useSelector(
    (state: RootState) => state.auth.user!
  );
  const catalogAccess = user.customer?.catalogAccess !== false;
  // « Mes offres » est réservé aux Premium (décision du 24/09/2026) : un client
  // Standard ne voit ni le chiffre ni le bloc de ses offres. Même règle que la
  // page (isOffersReserved) : un client sans accès catalogue les garde.
  const offersReserved = isOffersReserved(user.customer?.premium, user.customer?.catalogAccess);
  // Carrousel de suggestions : une piste animée en boucle ne se saisit pas au
  // doigt (le :hover qui la met en pause n'existe pas au tactile) et ignore
  // prefers-reduced-motion. Dans ces deux cas elle devient une piste défilante.
  const { smaller } = useResponsive();
  // Téléphone : photo de fond de l'accueil, téléversée par le client (pas de bannière)
  const dashboardPhoto = useDashboardPhoto(smaller.md ? user?.documentId : undefined);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const staticCarousel = smaller.md || reducedMotion;

  // Suggestions produits (carrousel auto-défilant, comme le panier)
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  // Bannières de repli (gérées dans l'admin) : catégorie du client, puis NEW CUSTOMER
  const [fallbackBanners, setFallbackBanners] = useState<BannerVisual[]>([]);

  useEffect(() => {
    if (user.customer?.documentId) {
      dispatch(getDashboardCustomerInformations(user.customer.documentId));
    }
  }, [dispatch, user.customer?.documentId]);

  // Factures du client : la requête des projets ne les ramène pas (compteur,
  // « À faire » et activité restaient à zéro). Chargées à part, jamais
  // bloquantes : en cas d'échec l'accueil s'affiche sans elles.
  const [invoices, setInvoices] = useState<CustomerInvoiceSummary[]>([]);
  const loadInvoices = async (customerDocumentId: string) => {
    try {
      setInvoices(await apiGetCustomerInvoiceSummaries(customerDocumentId));
    } catch {
      /* accueil sans factures */
    }
  };
  useEffect(() => {
    if (user.customer?.documentId) loadInvoices(user.customer.documentId);
  }, [user.customer?.documentId]);

  // Téléphone : bouton « Actualiser »
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    const id = user.customer?.documentId;
    if (!id || refreshing) return;
    setRefreshing(true);
    await Promise.allSettled([dispatch(getDashboardCustomerInformations(id)), loadInvoices(id)]);
    setRefreshing(false);
  };

  // Bannière propre sans image d'ordinateur (absente, ou seulement une version
  // téléphone) : on charge la bannière de sa catégorie, sinon NEW CUSTOMER.
  useEffect(() => {
    if (customer && !customer.banner?.image?.url) {
      apiGetFallbackBanners(customer.customerCategory?.documentId).then(setFallbackBanners);
    } else {
      setFallbackBanners([]);
    }
  }, [customer?.documentId, customer?.banner, customer?.customerCategory?.documentId]);

  // Suggestions du catalogue : remplacées par les offres personnalisées quand le
  // client en a et les voit (showCatalogSuggestions). On attend les données de
  // l'accueil (client + offres) pour ne pas afficher puis retirer le bloc.
  const suggestionsWanted = !!customer && showCatalogSuggestions({ catalogAccess, offersReserved, offersCount: products.length });

  // Récupère les produits du catalogue pour les suggestions
  // (uniquement si le client a accès au catalogue)
  useEffect(() => {
    if (!suggestionsWanted) { setSuggestions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        // apiGetProducts ne filtre QUE sur le terme de recherche : elle renvoyait
        // ici 100 produits sans distinction de visibilité, et le tri actif/
        // inCatalogue se faisait dans le navigateur — les produits privés
        // transitaient donc jusqu'au client, lisibles dans les outils de
        // développement. apiGetSuggestedProducts filtre côté serveur
        // (suggested + active + inCatalogue, repli sur les nouveautés du
        // catalogue) et c'est la même source que l'onglet « Nos suggestions ».
        const { products } = await apiGetSuggestedProducts();
        if (!cancelled) setSuggestions(products);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [suggestionsWanted]);

  if (loading && !customer) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    );
  }

  if (!customer) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', fontFamily: FONT, flexDirection: 'column', gap: '12px',
        padding: '0 24px', textAlign: 'center',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
          Bienvenue, {user?.firstName || user?.email} 👋
        </p>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
          Votre espace est en cours de configuration. Revenez dans quelques instants.
        </p>
      </div>
    );
  }

  // ── Données dérivées ──
  const ordersCount = projects.length;
  const devisCount = projects.filter((p) => (p.devis?.length || 0) > 0 && (p.paidPrice ?? 0) < (p.price ?? 0)).length;
  const liveInvoices = invoices.filter((inv) => !isInvoiceCanceled(inv));
  const invoicesCount = liveInvoices.length;
  const outstandingInvoices = invoices.filter(isInvoiceOutstanding);
  const offersCount = products.length;

  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.startDate as unknown as string).getTime() - new Date(a.startDate as unknown as string).getTime()
  );

  const pendingBats = projects.filter(
    (p) => p.orderItem?.product?.requiresBat && p.orderItem?.product?.batFile?.url && (!p.orderItem?.batStatus || p.orderItem?.batStatus === 'pending')
  );

  // ── « À faire » : ce qui attend une action DU CLIENT ──
  // C'est la seule chose qui justifie un tableau de bord. Les trois cas sont
  // disjoints : un projet dont la facture est émise est au stade du paiement,
  // un projet qui n'a qu'un devis est au stade de l'examen.
  // Facture à régler — sauf si le client a déjà déclaré son virement.
  const invoicesToPay = outstandingInvoices.filter((inv) => !isTransferPending(inv));
  const quotesToReview = projects.filter(
    (p) => (p.devis?.length || 0) > 0 && (p.invoices?.length || 0) === 0 && (p.paidPrice ?? 0) < (p.price ?? 0)
  );
  const todoCount = pendingBats.length + invoicesToPay.length + quotesToReview.length;

  // Commandes réellement en cours : ni terminées, ni annulées.
  const ongoingProjects = [...projects]
    .filter((p) => p.state !== 'fulfilled' && p.state !== 'canceled')
    .sort((a, b) => new Date(b.startDate as unknown as string).getTime() - new Date(a.startDate as unknown as string).getTime())
    .slice(0, 3);

  // Flux d'activité récente (à partir des données réelles)
  type Act = { id: string; color: string; icon: ReactNode; title: string; sub?: string; amount?: string; date: Date };
  const activity: Act[] = [];
  projects.forEach((p) => {
    const si = getStateInfo(p.state);
    activity.push({ id: `p-${p.documentId}`, color: si.color, icon: <HiOutlineShoppingCart size={16} />, title: `Commande ${p.name}`, sub: si.label, date: p.startDate });
    (p.devis || []).forEach((_, i) => activity.push({
      id: `d-${p.documentId}-${i}`, color: '#6b9eff', icon: <HiOutlineDocumentText size={16} />,
      title: `Devis — ${p.name}`, date: p.startDate,
    }));
  });
  liveInvoices.forEach((inv) => {
    // totalAmount = TTC (la page Factures l'affiche ainsi)
    const amount = inv.totalAmount ? fmtTTC(inv.totalAmount) : undefined;
    activity.push({
      id: `i-${inv.documentId}`, color: '#fbbf24', icon: <HiOutlineDocumentDownload size={16} />,
      title: `Facture ${inv.name || ''}`.trim(), sub: amount, amount, date: inv.date,
    });
  });
  const recentActivity = activity
    .filter((a) => a.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const quickActions = [
    { icon: <HiOutlineShoppingCart size={26} />, title: 'Commander', sub: 'Parcourir le catalogue', to: catalogAccess ? '/customer/catalogue' : '/customer/products', from: '#6d5dfc', to2: '#4f3fd1' },
    { icon: <HiOutlineDocumentText size={26} />, title: 'Demander un devis', sub: 'Réponse rapide', to: '/customer/devis', from: '#2f6fed', to2: '#1f4bb6' },
    { icon: <HiOutlineSupport size={26} />, title: 'Ouvrir un ticket', sub: 'Support dédié', to: '/support', from: '#0ea5a3', to2: '#0d7d7b' },
    { icon: <HiOutlineFolder size={26} />, title: 'Mes fichiers', sub: 'Accéder à vos fichiers', to: '/customer/files', from: '#7c6bff', to2: '#4f3fd1' },
  ];

  const kpis = [
    { icon: <HiOutlineShoppingCart size={22} />, label: 'Commandes', value: ordersCount, to: '/common/projects', link: "Voir l'historique", color: '#a99bff', bg: 'rgba(124,107,255,0.16)' },
    { icon: <HiOutlineDocumentText size={22} />, label: 'Devis en attente', value: devisCount, to: '/customer/devis', link: 'Voir mes devis', color: '#6b9eff', bg: 'rgba(47,111,237,0.16)' },
    { icon: <HiOutlineDocumentDownload size={22} />, label: 'Factures disponibles', value: invoicesCount, to: '/customer/invoices', link: 'Voir mes factures', color: '#4ade80', bg: 'rgba(34,197,94,0.16)' },
    ...(offersReserved ? [] : [
      { icon: <HiOutlineCollection size={22} />, label: 'Offres personnalisées', value: offersCount, to: '/customer/products', link: 'Voir toutes les offres', color: '#fbbf24', bg: 'rgba(234,179,8,0.16)' },
    ]),
  ];


  const recommendedProducts = products.slice(0, 5);

  const bannerChain: BannerVisual[] = [customer.banner, ...fallbackBanners];
  const desktopBanner = pickDesktopImage(bannerChain);
  const phoneBanner = pickPhoneImage(bannerChain);


  const ProductRow = ({ product }: { product: Product }) => {
    const priceHT = applyPremiumDiscount(getProductBasePrice(product), user?.customer, product);
    return (
      <div
        onClick={() => navigate(`/customer/product/${product.documentId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ width: '46px', height: '46px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {product.images?.[0]?.url
            ? <img loading="lazy" decoding="async" src={product.images[0].url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <HiOutlineCube size={20} color="rgba(255,255,255,0.25)" />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
          <p style={{ margin: '2px 0 0', color: '#a99bff', fontSize: '12px', fontWeight: 700 }}>{fmtHT(priceHT)}</p>
        </div>
        <HiChevronRight size={16} color="rgba(255,255,255,0.3)" />
      </div>
    );
  };

  // ── Téléphone : rendu « app » (même langage que l'admin), mêmes données ──
  if (smaller.md) {
    const productCard = (product: Product): PcmProduct => ({
      key: product.documentId,
      name: product.name,
      price: fmtHT(applyPremiumDiscount(getProductBasePrice(product), user?.customer, product)),
      image: product.images?.[0]?.url,
      onClick: () => navigate(`/customer/product/${product.documentId}`),
    });
    // En-tête : la relation avec PEG, pas un montant (« créer du lien et faire beau »)
    const liveProjects = projects.filter((p) => p.state !== 'canceled');
    const firstStart = liveProjects
      .map((p) => dayjs(p.startDate))
      .filter((d) => d.isValid())
      .sort((a, b) => a.valueOf() - b.valueOf())[0];
    const doneCount = projects.filter((p) => p.state === 'fulfilled').length;
    const facts = [
      firstStart ? `Ensemble depuis ${firstStart.format('MMMM YYYY')}` : 'Bienvenue chez PEG',
      ...(doneCount > 0 ? [`${doneCount} projet${doneCount > 1 ? 's' : ''} réalisé${doneCount > 1 ? 's' : ''}`] : []),
    ];
    // Ses réalisations : les photos de ses projets (sinon celle du produit), les plus récents d'abord
    const works = sortedProjects
      .filter((p) => p.state !== 'canceled')
      .map((p) => ({ p, image: p.images?.[0]?.url || p.orderItem?.product?.images?.[0]?.url }))
      .filter((w): w is { p: Project; image: string } => !!w.image)
      .slice(0, 8)
      .map(({ p, image }) => ({
        key: p.documentId,
        image,
        title: p.name,
        caption: p.state === 'fulfilled'
          ? `Livré · ${dayjs(p.endDate || p.startDate).format('MMMM YYYY')}`
          : getStateInfo(p.state).label,
        onClick: () => navigate(`/common/projects/details/${p.documentId}`),
      }));
    const todos: PcmRow[] = [
      ...pendingBats.map((p) => ({
        key: `bat-${p.documentId}`, title: p.name, sub: `${p.orderItem!.product.name} — Bon à Tirer à valider`,
        icon: <HiOutlineDocumentText />, color: '#c084fc', cta: 'Valider',
        onClick: () => navigate(`/customer/product/${p.orderItem!.product.documentId}?orderItemId=${p.orderItem!.documentId}`),
      })),
      ...invoicesToPay.map((inv) => ({
        key: `inv-${inv.documentId}`, title: inv.name || 'Facture', sub: `À régler — ${fmtTTC(inv.totalAmount ?? 0)}`,
        icon: <HiOutlineDocumentDownload />, color: '#fbbf24', cta: 'Régler',
        onClick: () => navigate('/customer/invoices'),
      })),
      ...quotesToReview.map((p) => ({
        key: `dev-${p.documentId}`, title: p.name, sub: 'Devis à examiner',
        icon: <HiOutlineDocumentText />, color: '#6b9eff', cta: 'Voir',
        onClick: () => navigate('/customer/devis'),
      })),
    ];
    return (
      <DashboardCustomerMobile
        photo={dashboardPhoto}
        hero={{
          date: dayjs().format('dddd D MMMM'),
          hello: new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour',
          name: user?.firstName || customer.name,
          facts,
          premium: !!user.customer?.premium,
        }}
        onRefresh={refresh}
        refreshing={refreshing}
        works={works}
        onSeeAllWorks={() => navigate('/common/projects')}
        todos={todos}
        tiles={kpis.map((k, i) => ({
          key: k.label, label: k.label, value: String(k.value), icon: k.icon,
          tone: (['accent', 'sky', 'mint', 'amber'] as const)[i],
          onClick: () => navigate(k.to),
        }))}
        shortcuts={quickActions.map((a) => ({ key: a.title, label: a.title, icon: a.icon, onClick: () => navigate(a.to) }))}
        orders={ongoingProjects.map((p) => {
          const si = getStateInfo(p.state);
          const va = (p.additionalSales ?? []).reduce((s: number, e) => s + (Number(e?.amount) || 0), 0);
          return {
            key: p.documentId,
            title: p.name,
            image: p.images?.[0]?.url || p.orderItem?.product?.images?.[0]?.url,
            pill: { label: si.label, color: si.color },
            sub: p.endDate ? `Livraison ${dayjs(p.endDate).format('DD MMM')}` : undefined,
            right: fmtHT((p.price || 0) + va),
            rightSub: va > 0 ? `dont ventes add. ${fmtPrice(va)}` : undefined,
            onClick: () => navigate(`/common/projects/details/${p.documentId}`),
          };
        })}
        onSeeAllOrders={() => navigate('/common/projects')}
        onOrder={() => navigate(catalogAccess ? '/customer/catalogue' : '/customer/products')}
        activity={recentActivity.map((a) => ({
          key: a.id, title: a.title, icon: a.icon, color: a.color,
          sub: [a.amount ? undefined : a.sub, dayjs(a.date).format('DD MMM')].filter(Boolean).join(' · '),
          right: a.amount,
        }))}
        suggestions={suggestionsWanted ? suggestions.map(productCard) : []}
        onSeeCatalogue={catalogAccess ? () => navigate('/customer/catalogue') : undefined}
        offers={offersReserved ? [] : recommendedProducts.map(productCard)}
        onSeeOffers={() => navigate('/customer/products')}
        team={{ phone: PEG_TEAM_PHONE, onWrite: () => navigate('/support') }}
      />
    );
  }

  return (
    customer && (
      <Suspense fallback={<></>}>
        {/* Bannière : celle du client (customer.banner), puis celle de sa
            catégorie, puis NEW CUSTOMER — choisie image par image et appareil
            par appareil (utils/bannerVisual.ts). */}
        <CustomerHomeBanner desktop={desktopBanner} phone={phoneBanner} />

        <Container style={{ fontFamily: FONT }}>
          <div style={{ paddingTop: '28px', paddingBottom: '48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── En-tête : salutation + actions rapides sur une rangée ──
                Les quatre pavés dégradés qui occupaient ~400px sur téléphone
                dupliquaient le menu de gauche ; ils deviennent une rangée de
                boutons compacts, défilante au doigt sous md. */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px', fontFamily: FONT }}>
                Bonjour, {user?.firstName || customer?.name} 👋
              </p>
              <h1 style={{ color: '#fff', fontSize: 'var(--peg-fs-24)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 16px', fontFamily: FONT }}>
                Votre <span style={{ color: '#a99bff' }}>espace client</span>
              </h1>
              <div className="peg-scroll-x" style={{ display: 'flex', gap: '10px' }}>
                {quickActions.map((a) => (
                  <button
                    key={a.title}
                    type="button"
                    onClick={() => navigate(a.to)}
                    className="peg-tap-target"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '9px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', padding: '10px 15px', cursor: 'pointer',
                      color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: FONT,
                      whiteSpace: 'nowrap', transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${a.from}88`; e.currentTarget.style.background = `${a.from}1f`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  >
                    <span style={{ color: a.from, display: 'flex' }}>{a.icon}</span>
                    {a.title}
                  </button>
                ))}
              </div>
            </div>

            {/* ── « À faire » : ce qui attend une action du client ──
                Rendu uniquement s'il y a quelque chose à faire : un panneau
                vide n'apporte rien et coûtait un écran de défilement. */}
            {todoCount > 0 && (
              <SectionCard style={{ borderColor: 'rgba(168,85,247,0.3)' }}>
                <SectionHeader
                  icon={<HiOutlineClock size={18} />}
                  title="À faire"
                  action={<span style={{ color: '#c084fc', fontSize: '12px', fontWeight: 700, background: 'rgba(168,85,247,0.14)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '100px', padding: '3px 10px' }}>{todoCount}</span>}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {pendingBats.map((p, i) => (
                    <TodoRow
                      key={`bat-${p.documentId}`} first={i === 0} color="#c084fc"
                      icon={<HiOutlineDocumentText size={16} />}
                      title={p.name} sub={`${p.orderItem!.product.name} — Bon à Tirer à valider`} cta="Valider"
                      onClick={() => navigate(`/customer/product/${p.orderItem!.product.documentId}?orderItemId=${p.orderItem!.documentId}`)}
                    />
                  ))}
                  {invoicesToPay.map((inv, i) => (
                    <TodoRow
                      key={`inv-${inv.documentId}`} first={pendingBats.length === 0 && i === 0} color="#fbbf24"
                      icon={<HiOutlineDocumentDownload size={16} />}
                      title={inv.name || 'Facture'} sub={`Facture à régler — ${fmtTTC(inv.totalAmount ?? 0)}`} cta="Régler"
                      onClick={() => navigate('/customer/invoices')}
                    />
                  ))}
                  {quotesToReview.map((p, i) => (
                    <TodoRow
                      key={`dev-${p.documentId}`} first={pendingBats.length === 0 && invoicesToPay.length === 0 && i === 0} color="#6b9eff"
                      icon={<HiOutlineDocumentText size={16} />}
                      title={p.name} sub="Devis à examiner" cta="Voir"
                      onClick={() => navigate('/customer/devis')}
                    />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── Chiffres clés, en rangée compacte ──
                Quatre cartes hautes occupaient ~700px sur téléphone pour
                afficher quatre nombres. Une seule carte, quatre cellules. */}
            <SectionCard style={{ padding: '6px 8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {kpis.map((k) => (
                  <Link
                    key={k.label}
                    to={k.to}
                    title={k.link}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 14px', borderRadius: '12px', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: '38px', height: '38px', flexShrink: 0, borderRadius: '11px', background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {k.icon}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', color: '#fff', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{k.value}</span>
                      <span style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>{k.label}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </SectionCard>

            {/* ── Commandes en cours + Activité récente ──
                « Ma dernière commande » affichait une carte pleine hauteur pour
                dire « Aucune commande pour le moment ». On montre désormais les
                commandes réellement en cours, et rien si l'activité est vide. */}
            {/* `min(340px, 100%)` : auto-fit ne peut pas descendre sous le minimum
                d'un minmax — à 360px de large la piste restait à 340px et débordait. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '20px' }}>
              <SectionCard>
                <SectionHeader
                  icon={<HiOutlineShoppingCart size={18} />}
                  title="Mes commandes en cours"
                  action={ongoingProjects.length > 0 ? <Link to="/common/projects" className="peg-tap-target" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', color: '#a99bff', fontSize: '12px', fontWeight: 600 }}>Voir tout <HiArrowRight size={12} /></Link> : undefined}
                />
                {ongoingProjects.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {ongoingProjects.map((p, i) => {
                      const si = getStateInfo(p.state);
                      const img = p.images?.[0]?.url || p.orderItem?.product?.images?.[0]?.url;
                      return (
                        <div
                          key={p.documentId}
                          onClick={() => navigate(`/common/projects/details/${p.documentId}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <div style={{ width: '46px', height: '46px', flexShrink: 0, borderRadius: '11px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {img
                              ? <img loading="lazy" decoding="async" src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                              : <HiOutlineCube size={20} color="rgba(255,255,255,0.25)" />}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, color: '#fff', fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 700, color: si.color, background: `${si.color}22`, border: `1px solid ${si.color}55`, borderRadius: '7px', padding: '2px 7px' }}>{si.label}</span>
                              {p.endDate && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11.5px' }}>Livraison {dayjs(p.endDate).format('DD MMM')}</span>}
                            </div>
                          </div>
                          {/* Même base que la liste des commandes (prix projet +
                              ventes additionnelles) : afficher ici le seul prix
                              projet donnait deux totaux pour la même commande. */}
                          {(() => {
                            const va = (p.additionalSales ?? []).reduce((s: number, e: any) => s + (Number(e?.amount) || 0), 0);
                            return (
                              <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtHT((p.price || 0) + va)}</span>
                                {va > 0 && (
                                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10.5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    dont ventes add. {fmtPrice(va)}
                                  </span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>Aucune commande en cours.</p>
                    <button
                      type="button"
                      onClick={() => navigate(catalogAccess ? '/customer/catalogue' : '/customer/products')}
                      className="peg-tap-target"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(124,107,255,0.14)', border: '1px solid rgba(124,107,255,0.35)', borderRadius: '10px', padding: '8px 14px', color: '#a99bff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                    >
                      Commander <HiArrowRight size={13} />
                    </button>
                  </div>
                )}
              </SectionCard>
            </div>

            {/* Activité récente — rendue seulement si elle a du contenu. */}
            {recentActivity.length > 0 && (
              <SectionCard>
                <SectionHeader
                  title="Activité récente"
                  action={<Link to="/common/projects" className="peg-tap-target" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', color: '#a99bff', fontSize: '12px', fontWeight: 600 }}>Voir tout <HiArrowRight size={12} /></Link>}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {recentActivity.map((a, i) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: `${a.color}22`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {a.icon}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</p>
                          {a.sub && <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '11.5px' }}>{a.sub}</p>}
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11.5px', whiteSpace: 'nowrap' }}>{dayjs(a.date).format('DD MMM')}</span>
                      </div>
                    ))}
                </div>
              </SectionCard>
            )}

            {/* ── Suggestions (carrousel auto-défilant, comme le panier) ── */}
            {suggestionsWanted && suggestions.length > 0 && (
              <SectionCard style={{ padding: '22px 0 22px 24px' }}>
                <div style={{ paddingRight: '24px' }}>
                  <SectionHeader
                    icon={<HiOutlineCollection size={18} />}
                    title="Suggestions pour vous"
                    action={catalogAccess ? <Link to="/customer/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a99bff', fontSize: '12px', fontWeight: 600 }}>Voir le catalogue <HiArrowRight size={12} /></Link> : undefined}
                  />
                </div>
                <div className="dash-suggest-mask" style={{ overflow: 'hidden', paddingRight: '24px' }}>
                  {/* Sous md (ou en mouvement réduit) : piste défilante au doigt,
                      liste non dupliquée et aucune animation. Au-dessus de md, sans
                      préférence de mouvement réduit, le carrousel est inchangé. */}
                  <div
                    className={staticCarousel ? 'peg-scroll-x' : 'dash-suggest-track'}
                    style={staticCarousel
                      // `overflowX` et `scrollSnapType` en ligne : .peg-scroll-x ne
                      // s'applique que sous md et y force `scroll-snap-type: none`.
                      ? { display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory' }
                      : { display: 'flex', width: 'max-content' }}
                  >
                    {(staticCarousel ? suggestions : [...suggestions, ...suggestions]).map((product, idx) => {
                      const priceHT = applyPremiumDiscount(getProductBasePrice(product), user?.customer, product);
                      return (
                        <div
                          key={`${product.documentId}-${idx}`}
                          onClick={() => navigate(`/customer/product/${product.documentId}`)}
                          style={{ flexShrink: 0, width: '210px', marginRight: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s ease, transform 0.2s ease', ...(staticCarousel ? { scrollSnapAlign: 'start' as const } : null) }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,107,255,0.5)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <div style={{ height: '140px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {product.images?.[0]?.url
                              ? <img loading="lazy" decoding="async"
                                  src={product.images[0].url}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  // Une image en 404 affichait son texte alternatif en clair
                                  // au milieu du carrousel (« Bache standard 200×80cm »).
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                                />
                              : <HiOutlineCube size={30} color="rgba(255,255,255,0.2)" />}
                          </div>
                          <div style={{ padding: '12px 14px' }}>
                            <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                              <span style={{ background: 'rgba(124,107,255,0.12)', border: '1px solid rgba(124,107,255,0.25)', borderRadius: '8px', padding: '4px 9px', color: '#a99bff', fontSize: '12px', fontWeight: 800 }}>{fmtHT(priceHT)}</span>
                              <span style={{ color: '#a99bff', fontSize: '11px', fontWeight: 600 }}>Voir →</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <style>{`
                    @keyframes dashSuggestScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                    .dash-suggest-track { animation: dashSuggestScroll ${Math.max(20, suggestions.length * 4)}s linear infinite; }
                    .dash-suggest-mask:hover .dash-suggest-track { animation-play-state: paused; }
                    @media (prefers-reduced-motion: reduce) {
                      .dash-suggest-track { animation: none; }
                    }
                  `}</style>
                </div>
              </SectionCard>
            )}

            {/* ── Offres personnalisées du client ──
                Ce bloc s'appelait « Recommandé pour vous » et affichait en fait
                les offres personnalisées (products), pendant que « Suggestions
                pour vous » montrait le catalogue générique : deux blocs de
                recommandation sans différence lisible. Le titre reprend le
                libellé déjà employé plus haut dans la page. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '20px' }}>
              {!offersReserved && recommendedProducts.length > 0 && (
                <SectionCard>
                  <SectionHeader icon={<HiOutlineCube size={18} />} title="Vos offres personnalisées" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {recommendedProducts.map((product) => <ProductRow key={product.documentId} product={product} />)}
                  </div>
                  {/* Ces produits sont les offres personnalisées du client :
                      le lien pointait à tort vers le catalogue générique. */}
                  <Link to="/customer/products">
                    <button className="peg-tap-target" style={{ marginTop: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px', padding: '10px', color: 'rgba(255,255,255,0.8)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
                      Voir toutes mes offres <HiArrowRight size={13} />
                    </button>
                  </Link>
                </SectionCard>
              )}

            </div>

            {/* ── CTA support ── */}
            <div style={{
              borderRadius: '20px',
              border: '1px solid rgba(124,107,255,0.22)',
              background: 'radial-gradient(120% 200% at 8% 50%, rgba(124,107,255,0.22) 0%, rgba(10,12,22,0.2) 60%), linear-gradient(160deg, #14152a 0%, #0a0c16 100%)',
              padding: '26px 30px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0, background: 'rgba(124,107,255,0.16)', border: '1px solid rgba(124,107,255,0.3)', color: '#a99bff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HiOutlineSupport size={28} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: 'var(--peg-fs-18)', fontWeight: 700, letterSpacing: '-0.01em' }}>Besoin d'aide ou d'un conseil personnalisé ?</h3>
                  <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: '13.5px' }}>Notre équipe est disponible pour vous accompagner dans tous vos projets.</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/support')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #6d5dfc, #4f3fd1)', border: 'none', borderRadius: '12px', padding: '13px 22px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 26px rgba(79,63,209,0.4)', fontFamily: FONT }}
              >
                Contacter le support <HiArrowRight size={15} />
              </button>
            </div>

          </div>
        </Container>
      </Suspense>
    )
  );
};

export default DashboardCustomer;
