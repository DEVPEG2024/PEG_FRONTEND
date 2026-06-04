import { Container } from '@/components/shared';
import { RootState, injectReducer, useAppDispatch } from '@/store';
import { Suspense, useEffect } from 'react';
import { useSelector } from 'react-redux';
import HomeProductsList from './HomeProductsList';
import { BsArrowRight } from 'react-icons/bs';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@/@types/user';
import { HiOutlineClipboardList, HiOutlineCheckCircle, HiOutlineCollection, HiOutlineClock, HiLockClosed, HiOutlineShieldCheck, HiOutlineLightningBolt, HiOutlineUsers } from 'react-icons/hi';
import { Project } from '@/@types/project';
import dayjs from 'dayjs';
import reducer, {
  getDashboardCustomerInformations,
  useAppSelector,
} from './store';

injectReducer('dashboardCustomer', reducer);

const StatWidget = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) => (
  <div style={{
    background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
    borderRadius: '16px',
    padding: '20px 24px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontFamily: 'Inter, sans-serif',
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ color: '#fff', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  </div>
);

/* ── Illustration "Espace de gestion" (laptop + mug + plante + bouclier) — style page de connexion ── */
const HeroScene = () => (
  <svg width="400" height="280" viewBox="0 0 400 280" fill="none" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} aria-hidden>
    <defs>
      <linearGradient id="hcScreen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1a1f4d" /><stop offset="1" stopColor="#0c1030" />
      </linearGradient>
      <linearGradient id="hcShield" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7c6bff" /><stop offset="1" stopColor="#4f3fd1" />
      </linearGradient>
      <linearGradient id="hcArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8b7dff" stopOpacity="0.55" /><stop offset="1" stopColor="#8b7dff" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* ombre de sol */}
    <ellipse cx="200" cy="252" rx="150" ry="16" fill="#5a47e0" opacity="0.18" />

    {/* plante (droite) */}
    <path d="M312 196 q-10 -40 6 -64" stroke="#6d5dfc" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M318 150 q22 -10 30 -34 q-26 2 -34 24 q-2 8 4 10Z" fill="#7a6bf0" />
    <path d="M312 158 q-22 -6 -34 -28 q24 -4 34 16 q4 8 0 12Z" fill="#6d5dfc" />
    <path d="M318 168 q4 -26 24 -38 q4 22 -14 34 q-8 6 -10 4Z" fill="#8b7dff" />
    <path d="M300 196 h28 l-4 26 q-1 6 -7 6 h-6 q-6 0 -7 -6Z" fill="#2a2466" stroke="rgba(255,255,255,0.12)" />

    {/* écran du laptop */}
    <rect x="96" y="58" width="184" height="118" rx="9" fill="url(#hcScreen)" stroke="rgba(124,107,255,0.4)" />
    <rect x="104" y="66" width="168" height="102" rx="5" fill="#0a0e26" />
    {/* barre + logo */}
    <circle cx="113" cy="76" r="2.4" fill="#6d5dfc" /><rect x="119" y="74" width="22" height="4" rx="2" fill="#fff" opacity="0.55" />
    {/* sidebar */}
    <rect x="110" y="86" width="34" height="76" rx="4" fill="rgba(124,107,255,0.08)" />
    {[0,1,2,3,4].map((i)=>(<rect key={i} x="116" y={94+i*13} width="22" height="4" rx="2" fill="#8b7dff" opacity={i===0?0.8:0.3} />))}
    {/* mini area chart */}
    <path d="M152 138 L168 124 L184 130 L200 112 L216 120 L232 104 L248 110 L264 100 L264 150 L152 150 Z" fill="url(#hcArea)" />
    <path d="M152 138 L168 124 L184 130 L200 112 L216 120 L232 104 L248 110 L264 100" stroke="#a99bff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* donut */}
    <circle cx="174" cy="108" r="13" fill="none" stroke="rgba(124,107,255,0.2)" strokeWidth="5" />
    <path d="M174 95 a13 13 0 0 1 11 20" fill="none" stroke="#6d5dfc" strokeWidth="5" strokeLinecap="round" />
    {/* lignes liste */}
    <rect x="202" y="92" width="58" height="4" rx="2" fill="#fff" opacity="0.18" />
    <rect x="202" y="100" width="44" height="4" rx="2" fill="#fff" opacity="0.12" />
    {/* base du laptop */}
    <path d="M80 176 h220 l14 14 H66 Z" fill="#211c52" stroke="rgba(255,255,255,0.1)" />
    <rect x="150" y="180" width="80" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />

    {/* mug (gauche) */}
    <rect x="40" y="150" width="44" height="46" rx="9" fill="#2a2466" stroke="rgba(255,255,255,0.12)" />
    <path d="M84 160 q16 2 16 16 q0 14 -16 14" fill="none" stroke="#2a2466" strokeWidth="6" />
    <text x="50" y="179" fill="#a99bff" fontSize="12" fontWeight="800" fontFamily="Inter, sans-serif">PEG</text>

    {/* bouclier (avant-droite) */}
    <path d="M286 168 l34 -10 l34 10 v22 q0 30 -34 44 q-34 -14 -34 -44 Z" fill="url(#hcShield)" stroke="rgba(255,255,255,0.18)" />
    <rect x="310" y="194" width="20" height="16" rx="3" fill="#fff" opacity="0.92" />
    <path d="M313 194 v-4 a7 7 0 0 1 14 0 v4" fill="none" stroke="#fff" strokeWidth="2.6" opacity="0.92" />
    <circle cx="320" cy="201" r="2.4" fill="#4f3fd1" />
  </svg>
);

const HeroBadge = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', fontWeight: 500 }}>
    <span style={{ color: '#8b7dff', display: 'flex' }}>{icon}</span>{label}
  </div>
);

const WelcomeHero = ({ firstName }: { firstName?: string }) => (
  <div style={{
    position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif',
    background: '#05101e', borderBottom: '1px solid rgba(255,255,255,0.06)',
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
    backgroundSize: '28px 28px',
  }}>
    {/* glows ambiants */}
    <div style={{ position: 'absolute', top: '-140px', right: '6%', width: '460px', height: '460px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,93,252,0.20) 0%, transparent 62%)', pointerEvents: 'none' }} />
    <div style={{ position: 'absolute', bottom: '-160px', left: '-80px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,111,237,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />

    <div style={{
      position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto',
      padding: '40px 40px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '32px', flexWrap: 'wrap',
    }}>
      {/* Colonne texte */}
      <div style={{ minWidth: 0, flex: '1 1 380px' }}>
        {/* Badge ACCÈS SÉCURISÉ */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(124,107,255,0.12)', border: '1px solid rgba(124,107,255,0.28)',
          borderRadius: '100px', padding: '5px 14px', marginBottom: '18px',
        }}>
          <HiLockClosed size={12} color="#a99bff" />
          <span style={{ color: '#a99bff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Accès sécurisé</span>
        </div>

        <h1 style={{ color: '#fff', fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 12px' }}>
          Bon retour{firstName ? `, ${firstName}` : ''} <span style={{ WebkitTextFillColor: 'initial' }}>👋</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '440px' }}>
          Connectez-vous à votre espace de gestion pour suivre vos projets, vos offres et vos documents en toute simplicité.
        </p>

        {/* Trust badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <HeroBadge icon={<HiOutlineShieldCheck size={17} />} label="Connexion sécurisée" />
          <HeroBadge icon={<HiOutlineLightningBolt size={17} />} label="Accès instantané" />
          <HeroBadge icon={<HiOutlineUsers size={17} />} label="Données en France" />
        </div>
      </div>

      {/* Colonne illustration */}
      <div style={{ flex: '0 0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: '-20px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,93,252,0.22) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}><HeroScene /></div>
      </div>
    </div>
  </div>
);

const DashboardCustomer = () => {
  const dispatch = useAppDispatch();
  const { customer, products, projects, loading } = useAppSelector(
    (state) => state.dashboardCustomer.data
  );
  const { user }: { user: User } = useSelector(
    (state: RootState) => state.auth.user!
  );
  // "Mes offres personnalisées" est réservé aux clients Premium
  const isPremium = !!user?.customer?.premium;

  useEffect(() => {
    if (user.customer?.documentId) {
      dispatch(getDashboardCustomerInformations(user.customer.documentId));
    }
  }, [dispatch, user.customer?.documentId]);

  const navigate = useNavigate();
  const projectsDone = projects.filter((p) => p.state === 'fulfilled').length;
  const projectsInProgress = projects.filter((p) => p.state !== 'fulfilled' && p.state !== 'canceled').length;
  const pendingBats = projects.filter(
    (p) => p.orderItem?.product?.requiresBat && p.orderItem?.product?.batFile?.url && (!p.orderItem?.batStatus || p.orderItem?.batStatus === 'pending')
  );

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
        minHeight: '60vh', fontFamily: 'Inter, sans-serif', flexDirection: 'column', gap: '12px',
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

  return (
    customer && (
      <Suspense fallback={<></>}>
        {/* Banner personnalisé (si défini par le client) */}
        {customer.banner && (
          <div style={{ position: 'relative' }}>
            <img
              src={customer.banner.image.url}
              alt="Banner"
              style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '80px',
              background: 'linear-gradient(to top, #05101e, transparent)',
            }} />
          </div>
        )}

        {/* Hero — design "Bon retour" (cohérent avec la page de connexion) */}
        <WelcomeHero firstName={user?.firstName} />

        <Container style={{ fontFamily: 'Inter, sans-serif' }}>
          <div style={{ paddingTop: '28px', paddingBottom: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Stat widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <StatWidget
                icon={<HiOutlineClipboardList size={22} color="#6b9eff" />}
                label="Projets en cours"
                value={projectsInProgress}
                color="rgba(47,111,237,0.18)"
              />
              <StatWidget
                icon={<HiOutlineCheckCircle size={22} color="#4ade80" />}
                label="Projets réalisés"
                value={projectsDone}
                color="rgba(34,197,94,0.18)"
              />
              <StatWidget
                icon={<HiOutlineCollection size={22} color="#a78bfa" />}
                label="Offres personnalisées"
                value={products.length}
                color="rgba(139,92,246,0.18)"
              />
            </div>

            {/* BAT en attente */}
            {pendingBats.length > 0 && (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Bon à Tirer — Validation requise
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingBats.map((p) => (
                    <div
                      key={p.documentId}
                      onClick={() => navigate(`/customer/product/${p.orderItem!.product.documentId}?orderItemId=${p.orderItem!.documentId}`)}
                      style={{
                        background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)',
                        border: '1.5px solid rgba(168,85,247,0.3)',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>📄</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#c084fc' }}>{p.name}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{p.orderItem!.product.name}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#c084fc', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', padding: '4px 10px', whiteSpace: 'nowrap' }}>
                        Valider →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projets en cours */}
            {projects.filter((p) => p.state !== 'fulfilled' && p.state !== 'canceled').length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Suivi
                    </p>
                    <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
                      Mes projets en cours
                    </h3>
                  </div>
                  <Link to="/customer/projects">
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      Tous les projets <BsArrowRight size={12} />
                    </button>
                  </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {projects
                    .filter((p: Project) => p.state !== 'fulfilled' && p.state !== 'canceled')
                    .map((p: Project) => {
                      const stateLabels: Record<string, { label: string; color: string; bg: string; border: string }> = {
                        pending:   { label: 'En cours',   color: '#6b9eff', bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.35)' },
                        waiting:   { label: 'En attente', color: '#fbbf24', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.35)' },
                        sav:       { label: 'SAV',        color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.35)' },
                      };
                      const stateInfo = stateLabels[p.state] || { label: 'En cours', color: '#6b9eff', bg: 'rgba(47,111,237,0.15)', border: 'rgba(47,111,237,0.35)' };
                      const imageUrl = p.images?.[0]?.url || p.orderItem?.product?.images?.[0]?.url;
                      return (
                        <div
                          key={p.documentId}
                          onClick={() => navigate(`/common/projects/details/${p.documentId}`)}
                          style={{
                            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                            transition: 'border-color 0.2s, transform 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = stateInfo.border; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          {/* Image du projet — pleine carte */}
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={p.name}
                              style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '180px', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f1c2e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <HiOutlineCollection size={40} color="rgba(255,255,255,0.15)" />
                            </div>
                          )}
                          {/* Infos + barre statut colorée en bas */}
                          <div style={{ padding: '14px 16px' }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name}
                            </p>
                            {p.endDate && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                                <HiOutlineClock size={13} color="rgba(255,255,255,0.35)" />
                                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                  Échéance : {dayjs(p.endDate).format('DD/MM/YYYY')}
                                </p>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: stateInfo.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '11px', fontWeight: 600, color: stateInfo.color }}>
                                {stateInfo.label}
                              </span>
                            </div>
                          </div>
                          {/* Barre colorée statut */}
                          <div style={{ height: '3px', background: stateInfo.color }} />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Personalized offers — Premium uniquement */}
            {isPremium && (
            <div>
              {/* Section header */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Catalogue personnalisé
                </p>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
                  Mes offres personnalisées
                </h3>
              </div>

              {/* Products grid */}
              {products.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  <HomeProductsList products={products} />
                </div>
              ) : (
                <div style={{
                  background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
                }}>
                  <HiOutlineCollection size={48} style={{ color: 'rgba(255,255,255,0.12)', margin: '0 auto 12px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>Aucune offre personnalisée disponible</p>
                </div>
              )}

              {/* Buttons under offers */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                <Link to="/customer/products">
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                    border: 'none', borderRadius: '10px',
                    padding: '9px 16px',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(34,197,94,0.4)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    Toutes mes offres <BsArrowRight size={14} />
                  </button>
                </Link>
                {user.customer?.catalogAccess !== false && (
                  <Link to="/customer/catalogue">
                    <button style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                      border: 'none', borderRadius: '10px',
                      padding: '9px 16px',
                      color: '#fff', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(47,111,237,0.4)',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      Catalogue <BsArrowRight size={14} />
                    </button>
                  </Link>
                )}
              </div>
            </div>
            )}
          </div>
        </Container>
      </Suspense>
    )
  );
};

export default DashboardCustomer;
