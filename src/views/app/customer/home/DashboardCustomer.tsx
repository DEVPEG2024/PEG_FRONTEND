import { Container } from '@/components/shared';
import Carousel from '@/components/shared/Carousel';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiGetSuggestedProducts } from '@/services/ProductServices';
import { apiGetFallbackBanners } from '@/services/BannerServices';
import { BannerVisual, pickDesktopImage, pickPhoneImage } from '@/utils/bannerVisual';
import CustomerHomeBanner from './CustomerHomeBanner';
import DashboardCustomerMobile, { PcmProduct, PcmProject, PcmRow, PcmWork } from './DashboardCustomerMobile';
import FeaturedOffers from './components/FeaturedOffers';
import OffersGrid from './components/OffersGrid';
import PremiumTeaser from './components/PremiumTeaser';
import DeliveryCountdown from './components/DeliveryCountdown';
import { OFFER_CSS, OFFER_ON_YELLOW, OFFER_YELLOW } from './components/OfferVisuals';
import { MAX_FEATURED, buildOfferShowcase, daysUntil } from './offerShowcase';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@/@types/user';
import {
  HiOutlineChatAlt2,
  HiOutlineCollection,
  HiOutlineShoppingCart,
  HiOutlineDocumentText,
  HiOutlinePhone,
  HiOutlineSupport,
  HiOutlineFolder,
  HiOutlineDocumentDownload,
  HiOutlineCube,
  HiOutlineStar,
  HiArrowRight,
} from 'react-icons/hi';
import { Project } from '@/@types/project';
import { Product } from '@/@types/product';
import dayjs from 'dayjs';
import { getProductBasePrice, applyPremiumDiscount } from '@/utils/productHelpers';
import { fmtHT, fmtTTC } from '@/utils/priceHelpers';
import { apiGetCustomerInvoiceSummaries, CustomerInvoiceSummary } from '@/services/InvoicesServices';
import { isInvoiceCanceled, isInvoiceOutstanding, isTransferPending } from '@/utils/invoiceStatus';
import useResponsive from '@/utils/hooks/useResponsive';
import useDashboardPhoto from '@/utils/hooks/useDashboardPhoto';
import { projectCoverUrl, projectProgress } from '@/views/app/common/projects/details/utils';
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
// Cartes de l'accueil (maquette du 21/10/2026) : bleu nuit uni
const PANEL = '#141a2e';
const ACCENT = '#6d5dfc';
const ACCENT_TEXT = '#a99bff';
const MUTED = 'rgba(255,255,255,0.66)';

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
const TodoRow = ({ row, first }: { row: PcmRow; first: boolean }) => {
  const color = row.color ?? ACCENT_TEXT;
  return (
    <button
      type="button"
      onClick={row.onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', cursor: 'pointer',
        border: 0, borderTop: first ? 'none' : '1px solid rgba(255,255,255,0.07)', background: 'none',
        color: '#fff', textAlign: 'left', fontFamily: FONT,
      }}
    >
      <span style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '13px', background: `${color}26`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
        {row.icon}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.title}</span>
        <span style={{ display: 'block', color: MUTED, fontSize: '12.5px', marginTop: '2px' }}>{row.sub}</span>
      </span>
      <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', height: '38px', padding: '0 14px', borderRadius: '11px', color, background: `${color}24`, border: `1px solid ${color}73`, fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {row.cta}
      </span>
    </button>
  );
};

/** Un projet en cours : photo, statut, livraison, avancement et compte à rebours */
const ProjectRow = ({ project, first }: { project: PcmProject; first: boolean }) => (
  <button
    type="button"
    onClick={project.onClick}
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 0', cursor: 'pointer',
      border: 0, borderTop: first ? 'none' : '1px solid rgba(255,255,255,0.07)', background: 'none',
      color: '#fff', textAlign: 'left', fontFamily: FONT,
    }}
  >
    <span style={{ width: '64px', height: '64px', flexShrink: 0, borderRadius: '16px', overflow: 'hidden', background: '#eef0f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {project.image ? (
        <img
          src={project.image}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px', boxSizing: 'border-box', mixBlendMode: 'multiply' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
      ) : (
        <HiOutlineCube size={22} color="rgba(20,26,46,0.3)" />
      )}
    </span>
    <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '14.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title}</span>
      <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: project.pill.color, background: `${project.pill.color}26`, borderRadius: '8px', padding: '3px 8px' }}>{project.pill.label}</span>
        {project.sub && <span style={{ fontSize: '12.5px', color: MUTED }}>{project.sub}</span>}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          role="progressbar"
          aria-label="Avancement"
          aria-valuenow={project.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ flex: 1, height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}
        >
          <span style={{ display: 'block', height: '100%', width: `${project.progress}%`, borderRadius: '999px', background: ACCENT }} />
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{project.progress} %</span>
      </span>
    </span>
    {project.days !== null && (
      <DeliveryCountdown days={project.days} size={62} accent={ACCENT_TEXT} soft="rgba(109,93,252,0.16)" line="rgba(109,93,252,0.42)" />
    )}
  </button>
);

const DashboardCustomer = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { customer, products, offersTotal, projects, loading } = useAppSelector(
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
  const { smaller } = useResponsive();
  // Téléphone : photo de fond de l'accueil, téléversée par le client (pas de bannière)
  const dashboardPhoto = useDashboardPhoto(smaller.md ? user?.documentId : undefined);

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
  const offersCount = Math.max(offersTotal, products.length);

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
  const todoIntro = todos.length === 1
    ? 'Une petite action et vos projets avancent.'
    : `${todos.length} petites actions et vos projets avancent.`;

  // ── Offres personnalisées, mises en avant (maquette du 21/10/2026) ──
  const offers = offersReserved ? [] : buildOfferShowcase(products, user?.customer);
  const offersVisible = offers.length > 0;
  const openProduct = (documentId: string) => navigate(`/customer/product/${documentId}`);
  const seeAllOffers = () => navigate('/customer/products');

  // Projets réellement en cours : ni terminés, ni annulés.
  const ongoingProjects = [...projects]
    .filter((p) => p.state !== 'fulfilled' && p.state !== 'canceled')
    .sort((a, b) => new Date(b.startDate as unknown as string).getTime() - new Date(a.startDate as unknown as string).getTime())
    .slice(0, 3);
  const projectCards: PcmProject[] = ongoingProjects.map((p) => {
    const si = getStateInfo(p.state);
    const batToValidate = pendingBats.some((b) => b.documentId === p.documentId);
    return {
      key: p.documentId,
      title: p.name,
      image: projectCoverUrl(p),
      pill: { label: si.label, color: si.color },
      sub: [
        batToValidate ? 'BAT à valider' : undefined,
        p.endDate ? `Livraison ${dayjs(p.endDate).format('D MMM')}` : undefined,
      ].filter(Boolean).join(' · ') || undefined,
      progress: projectProgress(p).percent,
      days: daysUntil(p.endDate),
      onClick: () => navigate(`/common/projects/details/${p.documentId}`),
    };
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
  const hello = new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
  const firstName = user?.firstName || customer.name;
  const premium = !!user.customer?.premium;

  // Ses réalisations : les photos de ses projets (sinon celle du produit), les plus récents d'abord
  const works: PcmWork[] = sortedProjects
    .filter((p) => p.state !== 'canceled')
    .map((p) => {
      const own = p.images?.[0]?.url;
      return { p, image: own || p.orderItem?.product?.images?.[0]?.url, contain: !own };
    })
    .filter((w): w is { p: Project; image: string; contain: boolean } => !!w.image)
    .slice(0, 8)
    .map(({ p, image, contain }) => ({
      key: p.documentId,
      image,
      contain,
      title: p.name,
      caption: p.state === 'fulfilled'
        ? `Livré · ${dayjs(p.endDate || p.startDate).format('MMMM YYYY')}`
        : getStateInfo(p.state).label,
      onClick: () => navigate(`/common/projects/details/${p.documentId}`),
    }));

  const quickActions = [
    { icon: <HiOutlineShoppingCart size={24} />, title: 'Commander', to: catalogAccess ? '/customer/catalogue' : '/customer/products', color: ACCENT_TEXT },
    { icon: <HiOutlineDocumentText size={24} />, title: 'Demander un devis', to: '/customer/devis', color: '#9dbdff' },
    { icon: <HiOutlineSupport size={24} />, title: 'Ouvrir un ticket', to: '/support', color: '#5eead4' },
    { icon: <HiOutlineFolder size={24} />, title: 'Mes fichiers', to: '/customer/files', color: '#d8b4fe' },
  ];

  const kpis = [
    { icon: <HiOutlineShoppingCart size={22} />, label: 'Commandes', value: ordersCount, to: '/common/projects', link: "Voir l'historique", color: '#a99bff' },
    { icon: <HiOutlineDocumentText size={22} />, label: 'Devis en attente', value: devisCount, to: '/customer/devis', link: 'Voir mes devis', color: '#9dbdff' },
    { icon: <HiOutlineDocumentDownload size={22} />, label: 'Factures disponibles', value: invoicesCount, to: '/customer/invoices', link: 'Voir mes factures', color: '#4ade80' },
    ...(offersReserved ? [] : [
      { icon: <HiOutlineCollection size={22} />, label: 'Offres personnalisées', value: offersCount, to: '/customer/products', link: 'Voir toutes les offres', color: OFFER_YELLOW },
    ]),
  ];

  const bannerChain: BannerVisual[] = [customer.banner, ...fallbackBanners];
  const desktopBanner = pickDesktopImage(bannerChain);
  const phoneBanner = pickPhoneImage(bannerChain);

  // ── Téléphone : rendu « app » (même langage que l'admin), mêmes données ──
  if (smaller.md) {
    const productCard = (product: Product): PcmProduct => ({
      key: product.documentId,
      name: product.name,
      price: fmtHT(applyPremiumDiscount(getProductBasePrice(product), user?.customer, product)),
      image: product.images?.[0]?.url,
      onClick: () => navigate(`/customer/product/${product.documentId}`),
    });
    return (
      <DashboardCustomerMobile
        photo={dashboardPhoto}
        hero={{
          date: dayjs().format('dddd D MMMM'),
          hello,
          name: firstName,
          tagline: offersVisible ? 'Vos prix réservés vous attendent.' : undefined,
          facts,
          premium,
        }}
        onRefresh={refresh}
        refreshing={refreshing}
        offers={offers.map((o) => ({ ...o, onClick: () => openProduct(o.documentId) }))}
        offersTotal={offersCount}
        onSeeOffers={seeAllOffers}
        onDiscoverPremium={offersReserved ? () => navigate('/customer/premium') : undefined}
        shortcuts={quickActions.map((a) => ({ key: a.title, label: a.title, icon: a.icon, onClick: () => navigate(a.to) }))}
        todos={todos}
        projects={projectCards}
        onSeeAllProjects={() => navigate('/common/projects')}
        onOrder={() => navigate(catalogAccess ? '/customer/catalogue' : '/customer/products')}
        works={works}
        worksCount={doneCount}
        onSeeAllWorks={() => navigate('/common/projects')}
        suggestions={suggestionsWanted ? suggestions.map(productCard) : []}
        onSeeCatalogue={catalogAccess ? () => navigate('/customer/catalogue') : undefined}
        team={{ phone: PEG_TEAM_PHONE, onWrite: () => navigate('/support') }}
      />
    );
  }

  return (
    customer && (
      <Suspense fallback={<></>}>
        <style>{OFFER_CSS}</style>
        {/* Bannière : celle du client (customer.banner), puis celle de sa
            catégorie, puis NEW CUSTOMER — choisie image par image et appareil
            par appareil (utils/bannerVisual.ts). */}
        <CustomerHomeBanner desktop={desktopBanner} phone={phoneBanner} />

        {/* Gouttière latérale : la route /home est sans marge (bannière bord à
            bord) — sans elle, titres et cartes collaient au menu et à l'écran. */}
        <Container style={{ fontFamily: FONT, paddingLeft: 'clamp(16px, 2.5vw, 32px)', paddingRight: 'clamp(16px, 2.5vw, 32px)' }}>
          <div style={{ paddingTop: '28px', paddingBottom: '48px', display: 'flex', flexDirection: 'column', gap: '28px', color: '#fff' }}>

            {/* ── Accueil : salutation, relation avec PEG, raccourcis ronds ── */}
            <section aria-label="Bienvenue" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px' }}>
              <div style={{ flex: '1 1 460px', minWidth: 0 }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.62)' }}>
                  {dayjs().format('dddd D MMMM')}
                </p>
                <h1 style={{ margin: 0, color: '#fff', fontSize: 'clamp(30px, 3.2vw, 44px)', lineHeight: 1.06, fontWeight: 800, letterSpacing: '-0.035em' }}>
                  {hello} {firstName},<br />
                  {offersVisible
                    ? <><span style={{ color: ACCENT_TEXT }}>vos prix réservés</span> vous attendent.</>
                    : <>qu'est-ce qu'on <span style={{ color: ACCENT_TEXT }}>lance aujourd'hui</span>{'\u00a0'}?</>}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px' }}>
                  {premium && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 13px', borderRadius: '999px', background: OFFER_YELLOW, color: OFFER_ON_YELLOW, fontSize: '12.5px', fontWeight: 800 }}>
                      <HiOutlineStar size={15} aria-hidden="true" /> Client Premium
                    </span>
                  )}
                  {facts.map((f) => (
                    <span key={f} style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 13px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', fontSize: '12.5px', fontWeight: 600 }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <nav aria-label="Raccourcis" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {quickActions.map((a) => (
                  <button
                    key={a.title}
                    type="button"
                    onClick={() => navigate(a.to)}
                    className="pco-round"
                    style={{ width: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px', padding: 0, border: 0, background: 'none', color: '#fff', cursor: 'pointer', fontFamily: FONT, textAlign: 'center' }}
                  >
                    <span className="pco-round-icon" style={{ width: '60px', height: '60px', borderRadius: '50%', background: `${a.color}26`, border: `1px solid ${a.color}66`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {a.icon}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, lineHeight: 1.25 }}>{a.title}</span>
                  </button>
                ))}
              </nav>
            </section>

            {/* ── L'offre à la une (ou Premium pour un client Standard), et à
                côté ce qui attend le client puis ses chiffres ──
                « À faire » n'est rendu que s'il y a quelque chose à faire. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
              {offersVisible && (
                <div style={{ flex: '2 1 560px', minWidth: 0 }}>
                  <FeaturedOffers offers={offers.slice(0, MAX_FEATURED)} onOpen={openProduct} onSeeAll={seeAllOffers} />
                </div>
              )}
              {offersReserved && <PremiumTeaser onDiscover={() => navigate('/customer/premium')} />}

              <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {todos.length > 0 && (
                  <section aria-labelledby="pco-todo-title" style={{ background: PANEL, border: '1px solid rgba(192,132,252,0.35)', borderRadius: '24px', padding: '22px 22px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <h3 id="pco-todo-title" style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>À faire</h3>
                      <span style={{ minWidth: '28px', height: '28px', padding: '0 8px', boxSizing: 'border-box', borderRadius: '999px', background: 'rgba(192,132,252,0.18)', color: '#d8b4fe', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {todos.length}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 4px', fontSize: '13.5px', color: MUTED }}>{todoIntro}</p>
                    {todos.map((r, i) => <TodoRow key={r.key} row={r} first={i === 0} />)}
                  </section>
                )}

                {/* Chiffres clés */}
                <section aria-label="Mon activité" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '12px' }}>
                  {kpis.map((k) => (
                    <Link
                      key={k.label}
                      to={k.to}
                      title={k.link}
                      className="pco-lift"
                      style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '16px 18px', borderRadius: '20px', background: PANEL, border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: k.color }}>
                        <span style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</span>
                        <span aria-hidden="true" style={{ display: 'flex', opacity: 0.8 }}>{k.icon}</span>
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{k.label}</span>
                    </Link>
                  ))}
                </section>
              </div>
            </div>

            {/* ── Toutes ses offres, en cartes ── */}
            {offersVisible && (
              <OffersGrid
                offers={offers}
                total={offersCount}
                customerName={customer.name}
                onOpen={openProduct}
                onSeeAll={seeAllOffers}
              />
            )}

            {/* ── Projets en cours + réalisations ──
                `min(…, 100%)` : un minimum plus large que l'écran déborderait. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'stretch' }}>
              <section aria-labelledby="pco-projects-title" style={{ flex: '1 1 440px', minWidth: 0, background: PANEL, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '22px 22px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                  <h3 id="pco-projects-title" style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>Vos projets en cours</h3>
                  {projectCards.length > 0 && (
                    <Link to="/common/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: ACCENT_TEXT, fontSize: '13px', fontWeight: 700 }}>
                      Voir tout <HiArrowRight size={13} />
                    </Link>
                  )}
                </div>
                {projectCards.length > 0 ? (
                  projectCards.map((p, i) => <ProjectRow key={p.key} project={p} first={i === 0} />)
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '10px 0 16px' }}>
                    <p style={{ color: MUTED, fontSize: '13.5px', margin: 0 }}>Aucun projet en cours.</p>
                    <button
                      type="button"
                      onClick={() => navigate(catalogAccess ? '/customer/catalogue' : '/customer/products')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(124,107,255,0.14)', border: '1px solid rgba(124,107,255,0.35)', borderRadius: '11px', height: '40px', padding: '0 14px', color: ACCENT_TEXT, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                    >
                      Commander <HiArrowRight size={13} />
                    </button>
                  </div>
                )}
              </section>

              {works.length > 0 && (
                <section aria-labelledby="pco-works-title" style={{ flex: '1 1 440px', minWidth: 0, background: PANEL, border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '18px' }}>
                    <h3 id="pco-works-title" style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>Vos réalisations</h3>
                    {doneCount > 0 && (
                      <span style={{ fontSize: '13px', color: MUTED }}>{doneCount} projet{doneCount > 1 ? 's' : ''} livré{doneCount > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {/* Trois polaroïds légèrement penchés, redressés au survol */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', padding: '0 4px 6px' }}>
                    {works.slice(0, 3).map((w, i) => (
                      <button
                        key={w.key}
                        type="button"
                        onClick={w.onClick}
                        className="pco-pola"
                        style={{
                          display: 'block', padding: '9px 9px 12px', border: 0, borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                          background: '#f6f4ef', boxShadow: '0 10px 22px rgba(0,0,0,0.35)', fontFamily: FONT,
                          transform: `rotate(${[-3, 2, -1.5][i % 3]}deg)`,
                        }}
                      >
                        <span style={{ display: 'flex', aspectRatio: '1 / 1', borderRadius: '3px', overflow: 'hidden', background: '#eef0f5' }}>
                          <img
                            src={w.image}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            style={{ width: '100%', height: '100%', objectFit: w.contain ? 'contain' : 'cover', mixBlendMode: w.contain ? 'multiply' : undefined }}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                          />
                        </span>
                        <span style={{ display: 'block', marginTop: '9px', fontSize: '13px', fontWeight: 700, color: '#1d2033', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</span>
                        <span style={{ display: 'block', marginTop: '2px', fontSize: '11.5px', color: '#4a4f63' }}>{w.caption}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

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
                <div style={{ paddingRight: '24px' }}>
                  {/* Défilé continu, glissable au doigt (iPad) comme à la souris ;
                      pause au survol sur ordinateur. */}
                  <Carousel
                    label="Suggestions pour vous"
                    autoplay="continuous"
                    speed={0.9}
                    gap={14}
                    slideStyle={{ width: '210px' }}
                  >
                    {suggestions.map((product) => {
                      const priceHT = applyPremiumDiscount(getProductBasePrice(product), user?.customer, product);
                      return (
                        <div
                          key={product.documentId}
                          onClick={() => navigate(`/customer/product/${product.documentId}`)}
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s ease, transform 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,107,255,0.5)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <div style={{ height: '140px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            {product.images?.[0]?.url
                              ? <img loading="lazy" decoding="async" draggable={false}
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
                  </Carousel>
                </div>
              </SectionCard>
            )}

            {/* ── Son équipe PEG (même carte que sur téléphone) ── */}
            <section aria-labelledby="pco-team-title" style={{ borderRadius: '26px', background: PANEL, border: '1px solid rgba(255,255,255,0.08)', padding: '24px 26px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flex: '1 1 380px', minWidth: 0 }}>
                <span aria-hidden="true" style={{ width: '58px', height: '58px', borderRadius: '50%', flexShrink: 0, background: '#a78bfa', color: PANEL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800 }}>
                  PEG
                </span>
                <span style={{ minWidth: 0 }}>
                  <span id="pco-team-title" style={{ display: 'block', fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>Une idée, une question ? Votre équipe PEG vous répond.</span>
                  <span style={{ display: 'block', marginTop: '5px', fontSize: '14px', color: MUTED }}>Appelez-nous ou écrivez-nous, on revient vers vous rapidement.</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <a
                  href={`tel:${PEG_TEAM_PHONE.replace(/\s/g, '')}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', height: '48px', padding: '0 20px', borderRadius: '14px', background: ACCENT, color: '#fff', fontSize: '14px', fontWeight: 700 }}
                >
                  <HiOutlinePhone size={18} /> Appeler · {PEG_TEAM_PHONE}
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/support')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', height: '48px', padding: '0 18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
                >
                  <HiOutlineChatAlt2 size={18} /> Écrire un message
                </button>
              </div>
            </section>

          </div>
        </Container>
      </Suspense>
    )
  );
};

export default DashboardCustomer;
