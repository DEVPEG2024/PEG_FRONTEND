import { Container } from '@/components/shared';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { ReactNode, Suspense, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiGetProducts } from '@/services/ProductServices';
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
  HiOutlineCurrencyEuro,
  HiOutlineUserGroup,
  HiOutlineBadgeCheck,
  HiOutlineLightningBolt,
  HiOutlineCube,
  HiArrowRight,
  HiChevronRight,
} from 'react-icons/hi';
import { Project } from '@/@types/project';
import { Product } from '@/@types/product';
import dayjs from 'dayjs';
import { getProductBasePrice, applyPremiumDiscount } from '@/utils/productHelpers';
import { fmtHT } from '@/utils/priceHelpers';
import reducer, {
  getDashboardCustomerInformations,
  useAppSelector,
} from './store';

injectReducer('dashboardCustomer', reducer);

const FONT = 'Inter, sans-serif';
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

  // Suggestions produits (carrousel auto-défilant, comme le panier)
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (user.customer?.documentId) {
      dispatch(getDashboardCustomerInformations(user.customer.documentId));
    }
  }, [dispatch, user.customer?.documentId]);

  // Récupère les produits du catalogue pour les suggestions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGetProducts({ pagination: { page: 1, pageSize: 100 }, searchTerm: '' });
        const all: Product[] = (res.data?.data?.products_connection?.nodes ?? []).filter(
          (p: Product) => p.active && p.inCatalogue
        );
        if (!cancelled) setSuggestions(all);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-scroll continu du carrousel de suggestions
  useEffect(() => {
    if (suggestions.length === 0) return;
    let raf: number | null = null;
    const startTimeout = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const step = () => {
        if (!isPausedRef.current && el) {
          el.scrollLeft += 0.6;
          if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft = 0;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 200);
    return () => {
      clearTimeout(startTimeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [suggestions.length]);

  if (loading) {
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
  const invoicesCount = projects.reduce((s, p) => s + (p.invoices?.length || 0), 0);
  const offersCount = products.length;

  const sortedProjects = [...projects].sort(
    (a, b) => new Date(b.startDate as unknown as string).getTime() - new Date(a.startDate as unknown as string).getTime()
  );
  const lastOrder = sortedProjects[0];

  const pendingBats = projects.filter(
    (p) => p.orderItem?.product?.requiresBat && p.orderItem?.product?.batFile?.url && (!p.orderItem?.batStatus || p.orderItem?.batStatus === 'pending')
  );

  // Flux d'activité récente (à partir des données réelles)
  type Act = { id: string; color: string; icon: ReactNode; title: string; sub?: string; date: Date };
  const activity: Act[] = [];
  projects.forEach((p) => {
    const si = getStateInfo(p.state);
    activity.push({ id: `p-${p.documentId}`, color: si.color, icon: <HiOutlineShoppingCart size={16} />, title: `Commande ${p.name}`, sub: si.label, date: p.startDate });
    (p.invoices || []).forEach((inv, i) => activity.push({
      id: `i-${p.documentId}-${i}`, color: '#fbbf24', icon: <HiOutlineDocumentDownload size={16} />,
      title: `Facture ${inv.name || ''}`.trim(), sub: inv.totalAmount ? fmtHT(inv.totalAmount) : undefined, date: (inv.date as unknown as Date) || p.startDate,
    }));
    (p.devis || []).forEach((_, i) => activity.push({
      id: `d-${p.documentId}-${i}`, color: '#6b9eff', icon: <HiOutlineDocumentText size={16} />,
      title: `Devis — ${p.name}`, date: p.startDate,
    }));
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
    { icon: <HiOutlineCollection size={22} />, label: 'Offres personnalisées', value: offersCount, to: '/customer/products', link: 'Voir toutes les offres', color: '#fbbf24', bg: 'rgba(234,179,8,0.16)' },
  ];

  const advantages = [
    { icon: <HiOutlineCurrencyEuro size={20} />, title: 'Tarifs négociés', sub: "Des prix préférentiels toute l'année" },
    { icon: <HiOutlineUserGroup size={20} />, title: 'Accompagnement dédié', sub: 'Une équipe à votre écoute' },
    { icon: <HiOutlineBadgeCheck size={20} />, title: 'Qualité garantie', sub: 'Des produits testés et approuvés' },
    { icon: <HiOutlineLightningBolt size={20} />, title: 'Livraison rapide', sub: 'Respect des délais et suivi en temps réel' },
  ];

  const recommendedProducts = products.slice(0, 5);

  const lastOrderImage = lastOrder?.images?.[0]?.url || lastOrder?.orderItem?.product?.images?.[0]?.url;
  const lastOrderState = lastOrder ? getStateInfo(lastOrder.state) : null;

  const ProductRow = ({ product }: { product: Product }) => {
    const priceHT = applyPremiumDiscount(getProductBasePrice(product), user?.customer);
    return (
      <div
        onClick={() => navigate(`/customer/product/${product.documentId}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.15s' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ width: '46px', height: '46px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {product.images?.[0]?.url
            ? <img src={product.images[0].url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

  return (
    customer && (
      <Suspense fallback={<></>}>
        {/* Banner — NE PAS MODIFIER (système customer.banner) */}
        {customer.banner ? (
          <div style={{ position: 'relative' }}>
            <img
              src={customer.banner.image.url}
              alt="Banner"
              style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '80px',
              background: 'linear-gradient(to top, #0a1628, transparent)',
            }} />
          </div>
        ) : (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a6e 35%, #0f2d5a 60%, #081524 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            padding: '0 40px',
          }}>
            {/* Cercles décoratifs */}
            <div style={{
              position: 'absolute', top: '-40px', right: '10%',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'rgba(47,111,237,0.12)',
              border: '1px solid rgba(47,111,237,0.15)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-60px', right: '25%',
              width: '160px', height: '160px', borderRadius: '50%',
              background: 'rgba(47,111,237,0.07)',
              border: '1px solid rgba(47,111,237,0.1)',
            }} />
            <div style={{
              position: 'absolute', top: '20px', right: '5%',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(107,158,255,0.08)',
            }} />
            {/* Grille de points */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }} />
            {/* Contenu */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                background: 'rgba(47,111,237,0.15)',
                border: '1px solid rgba(47,111,237,0.25)',
                borderRadius: '100px', padding: '4px 12px', marginBottom: '12px',
              }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: '#6b9eff', boxShadow: '0 0 6px rgba(107,158,255,0.8)',
                }} />
                <span style={{ color: '#6b9eff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Bienvenue sur PEG
                </span>
              </div>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Votre espace client
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '6px' }}>
                Découvrez vos offres et suivez vos projets
              </p>
            </div>
            {/* Dégradé bas */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '60px',
              background: 'linear-gradient(to top, #0d1b2e, transparent)',
            }} />
          </div>
        )}

        <Container style={{ fontFamily: FONT }}>
          <div style={{ paddingTop: '28px', paddingBottom: '48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── Hero : bienvenue + actions rapides ── */}
            <div style={{
              position: 'relative',
              borderRadius: '22px',
              overflow: 'hidden',
              border: '1px solid rgba(124,107,255,0.22)',
              background: 'radial-gradient(120% 160% at 88% 6%, rgba(124,107,255,0.32) 0%, rgba(91,71,224,0.10) 44%, rgba(10,12,22,0.2) 74%), linear-gradient(160deg, #14152a 0%, #0a0c16 100%)',
              padding: '32px 34px',
            }}>
              {/* Swoosh décoratif */}
              <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '260px', height: '260px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,107,255,0.22), transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) auto', gap: '32px', alignItems: 'center' }}>
                {/* Gauche : message de bienvenue */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    Bonjour, {user?.firstName || customer?.name} 👋
                  </p>
                  <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, margin: 0 }}>
                    Bienvenue dans votre<br /><span style={{ color: '#a99bff' }}>espace client.</span>
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', lineHeight: 1.55, margin: '14px 0 0', maxWidth: '380px' }}>
                    Retrouvez ici l'essentiel de vos commandes, devis, factures et offres personnalisées.
                  </p>
                </div>

                {/* Droite : actions rapides */}
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                    Actions rapides
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 116px)', gap: '12px' }}>
                    {quickActions.map((a) => (
                      <div
                        key={a.title}
                        onClick={() => navigate(a.to)}
                        style={{
                          borderRadius: '16px', padding: '16px 12px', cursor: 'pointer',
                          background: `linear-gradient(160deg, ${a.from}, ${a.to2})`,
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 10px 26px rgba(0,0,0,0.35)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px',
                          transition: 'transform 0.18s, box-shadow 0.18s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(79,63,209,0.4)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 26px rgba(0,0,0,0.35)'; }}
                      >
                        <span style={{ color: '#fff', display: 'flex' }}>{a.icon}</span>
                        <div>
                          <p style={{ margin: 0, color: '#fff', fontSize: '12.5px', fontWeight: 700, lineHeight: 1.2 }}>{a.title}</p>
                          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '10.5px', lineHeight: 1.2 }}>{a.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── BAT en attente ── */}
            {pendingBats.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingBats.map((p) => (
                  <div
                    key={p.documentId}
                    onClick={() => navigate(`/customer/product/${p.orderItem!.product.documentId}?orderItemId=${p.orderItem!.documentId}`)}
                    style={{
                      background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)',
                      border: '1.5px solid rgba(168,85,247,0.3)',
                      borderRadius: '14px', padding: '14px 18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                      cursor: 'pointer', fontFamily: FONT,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>📄</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#c084fc' }}>{p.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{p.orderItem!.product.name} — Bon à Tirer à valider</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
                      Valider →
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── KPIs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {kpis.map((k) => (
                <SectionCard key={k.label} style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: k.bg, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {k.icon}
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', fontWeight: 600, margin: '16px 0 4px' }}>{k.label}</p>
                  <p style={{ color: '#fff', fontSize: '30px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>{k.value}</p>
                  <Link to={k.to} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '14px', color: '#a99bff', fontSize: '12px', fontWeight: 600 }}>
                    {k.link} <HiArrowRight size={12} />
                  </Link>
                </SectionCard>
              ))}
            </div>

            {/* ── Dernière commande + Activité récente ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
              {/* Dernière commande */}
              <SectionCard>
                <SectionHeader icon={<HiOutlineShoppingCart size={18} />} title="Ma dernière commande" />
                {lastOrder ? (
                  <>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ width: '130px', height: '130px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {lastOrderImage
                          ? <img src={lastOrderImage} alt={lastOrder.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <HiOutlineCube size={36} color="rgba(255,255,255,0.2)" />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {lastOrderState && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: lastOrderState.color, background: `${lastOrderState.color}22`, border: `1px solid ${lastOrderState.color}55`, borderRadius: '8px', padding: '3px 9px' }}>
                              {lastOrderState.label}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>{lastOrder.name}</p>
                        {lastOrder.orderItem?.product?.name && (
                          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{lastOrder.orderItem.product.name}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
                          <HiOutlineCurrencyEuro size={15} color="rgba(255,255,255,0.4)" />
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>Montant HT</span>
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}>{fmtHT(lastOrder.price || 0)}</span>
                        </div>
                        {lastOrder.endDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                            <HiOutlineClock size={15} color="rgba(255,255,255,0.4)" />
                            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>Livraison estimée</span>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700, marginLeft: 'auto' }}>{dayjs(lastOrder.endDate).format('DD MMM YYYY')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/common/projects/details/${lastOrder.documentId}`)}
                      style={{ marginTop: '18px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(124,107,255,0.14)', border: '1px solid rgba(124,107,255,0.35)', borderRadius: '12px', padding: '11px', color: '#a99bff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                    >
                      Voir le détail <HiArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Aucune commande pour le moment.</p>
                )}
              </SectionCard>

              {/* Activité récente */}
              <SectionCard>
                <SectionHeader
                  title="Activité récente"
                  action={<Link to="/common/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a99bff', fontSize: '12px', fontWeight: 600 }}>Voir tout <HiArrowRight size={12} /></Link>}
                />
                {recentActivity.length > 0 ? (
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
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Aucune activité récente.</p>
                )}
              </SectionCard>
            </div>

            {/* ── Suggestions (carrousel auto-défilant, comme le panier) ── */}
            {suggestions.length > 0 && (
              <SectionCard style={{ padding: '22px 0 22px 24px' }}>
                <div style={{ paddingRight: '24px' }}>
                  <SectionHeader
                    icon={<HiOutlineCollection size={18} />}
                    title="Suggestions pour vous"
                    action={catalogAccess ? <Link to="/customer/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#a99bff', fontSize: '12px', fontWeight: 600 }}>Voir le catalogue <HiArrowRight size={12} /></Link> : undefined}
                  />
                </div>
                <div
                  ref={scrollRef}
                  onMouseEnter={() => { isPausedRef.current = true; }}
                  onMouseLeave={() => { isPausedRef.current = false; }}
                  style={{ display: 'flex', gap: '14px', overflowX: 'hidden', scrollbarWidth: 'none', paddingRight: '24px' }}
                >
                  {[...suggestions, ...suggestions].map((product, idx) => {
                    const priceHT = applyPremiumDiscount(getProductBasePrice(product), user?.customer);
                    return (
                      <div
                        key={`${product.documentId}-${idx}`}
                        onClick={() => navigate(`/customer/product/${product.documentId}`)}
                        style={{ flexShrink: 0, width: '210px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s ease, transform 0.2s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(124,107,255,0.5)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <div style={{ height: '140px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          {product.images?.[0]?.url
                            ? <img src={product.images[0].url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              </SectionCard>
            )}

            {/* ── 2 colonnes : recommandé / avantages ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Recommandé pour vous */}
              {recommendedProducts.length > 0 && (
                <SectionCard>
                  <SectionHeader icon={<HiOutlineCube size={18} />} title="Recommandé pour vous" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {recommendedProducts.map((product) => <ProductRow key={product.documentId} product={product} />)}
                  </div>
                  {catalogAccess && (
                    <Link to="/customer/catalogue">
                      <button style={{ marginTop: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '11px', padding: '10px', color: 'rgba(255,255,255,0.8)', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>
                        Voir toutes les recommandations <HiArrowRight size={13} />
                      </button>
                    </Link>
                  )}
                </SectionCard>
              )}

              {/* Vos avantages PEG */}
              <SectionCard>
                <SectionHeader icon={<HiOutlineBadgeCheck size={18} />} title="Vos avantages PEG" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {advantages.map((adv) => (
                    <div key={adv.title} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '11px', flexShrink: 0, background: 'rgba(124,107,255,0.14)', border: '1px solid rgba(124,107,255,0.3)', color: '#a99bff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {adv.icon}
                      </div>
                      <div>
                        <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 700 }}>{adv.title}</p>
                        <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '11.5px' }}>{adv.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
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
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>Besoin d'aide ou d'un conseil personnalisé ?</h3>
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
