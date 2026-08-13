import { useMemo, useState } from 'react';
import SignInForm from './SignInForm';
import SignUpModal, { type AccountType } from './SignUpModal';
import Logo from '@/components/template/Logo';
import { APP_NAME } from '@/constants/app.constant';
import {
  HiLockClosed,
  HiOutlineShieldCheck,
  HiOutlineLightningBolt,
  HiOutlineUsers,
  HiOutlineOfficeBuilding,
  HiOutlineCash,
  HiArrowNarrowRight,
} from 'react-icons/hi';

/* ── Vitrine de l'offre PEG : tuiles produits/services ── */
const OFFER_TILES: { emoji: string; label: string; sub: string }[] = [
  { emoji: '👕', label: 'Textile personnalisé', sub: 'T-shirts, polos, vestes à votre image' },
  { emoji: '🦺', label: 'Haute visibilité & EPI', sub: 'Vêtements de travail, chaussures de sécurité' },
  { emoji: '🧢', label: 'Casquettes & accessoires', sub: 'Bonnets, accessoires hiver…' },
  { emoji: '🖨️', label: 'Print & supports', sub: 'Affiches, flyers, signalétique' },
  { emoji: '🎁', label: 'Objets publicitaires', sub: 'Goodies et cadeaux d’entreprise' },
  { emoji: '🎨', label: 'Création & BAT', sub: 'Maquettes validées avant production' },
];

const OfferShowcase = () => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', maxWidth: '460px' }}>
    {OFFER_TILES.map((tile) => (
      <div
        key={tile.label}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: '11px',
          background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px', padding: '13px 14px',
        }}
      >
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{tile.emoji}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{tile.label}</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11.5px', margin: '3px 0 0', lineHeight: 1.4 }}>{tile.sub}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ── Cartes d'inscription : les deux natures de compte, mises au même niveau ── */
const AccountCta = ({
  variant, icon, title, subtitle, onClick,
}: {
  variant: 'client' | 'generator';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => {
  const accent = variant === 'client'
    ? { tile: '#efedff', icon: '#6d5dfc' }
    : { tile: '#e6f7ef', icon: '#0d9f6e' };

  return (
    <button type="button" onClick={onClick} className={`si-acct si-acct--${variant}`}>
      <span className="si-acct__tile" style={{ background: accent.tile, color: accent.icon }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', color: '#1e1b4b', fontSize: '13.5px', fontWeight: 700 }}>
          {title}
        </span>
        <span style={{ display: 'block', color: '#64748b', fontSize: '11.5px', lineHeight: 1.45, marginTop: '2px' }}>
          {subtitle}
        </span>
      </span>
      <HiArrowNarrowRight className="si-acct__arrow" size={16} color="#94a3b8" />
    </button>
  );
};

const LeftBadge = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', textAlign: 'center', maxWidth: '100px' }}>
    <span style={{ color: '#8b7dff', display: 'flex' }}>{icon}</span>
    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
  </div>
);

const SignIn = () => {
  // Lien de parrainage Générateur : /sign-in?ref=CODE → on ouvre directement
  // l'inscription avec le code pré-rempli.
  const referralFromUrl = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('ref') || '';
    } catch {
      return '';
    }
  }, []);
  const [isSignUpOpen, setIsSignUpOpen] = useState(!!referralFromUrl);
  // Nature de compte proposée à l'ouverture — modifiable dans la modale
  const [signUpType, setSignUpType] = useState<AccountType>('customer');
  const year = new Date().getFullYear();

  const openSignUp = (type: AccountType) => {
    setSignUpType(type);
    setIsSignUpOpen(true);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#06080f', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @media (max-width: 920px){ .si-left{ display:none !important; } .si-card{ max-width:520px !important; } }

        .si-acct{
          display:flex; align-items:center; gap:13px; width:100%;
          text-align:left; cursor:pointer; background:#fff;
          border:1px solid #e8e5f7; border-radius:14px; padding:13px 15px;
          font-family:Inter, sans-serif;
          transition:border-color .15s, box-shadow .15s, transform .15s;
        }
        .si-acct:hover{ transform:translateY(-1px); box-shadow:0 8px 22px rgba(17,24,39,0.07); }
        .si-acct:focus-visible{ outline:2px solid #6d5dfc; outline-offset:2px; }
        .si-acct--client:hover{ border-color:#c7bfff; }
        .si-acct--generator:hover{ border-color:#9fdcc1; }
        .si-acct__tile{
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
          width:38px; height:38px; border-radius:11px;
        }
        .si-acct__arrow{ flex-shrink:0; transition:transform .15s; }
        .si-acct:hover .si-acct__arrow{ transform:translateX(3px); }

        /* Le parcours Générateur est le moins connu des visiteurs : il pulse
           pour se signaler, et s'arrête dès qu'on le survole (l'attention est
           captée, l'animation n'a plus lieu d'être). */
        @keyframes siGenPulse{
          0%, 100%{
            border-color:rgba(13,159,110,0.45);
            box-shadow:0 0 0 0 rgba(13,159,110,0.35);
            background:#fff;
          }
          50%{
            border-color:rgba(13,159,110,0.95);
            box-shadow:0 0 20px 3px rgba(13,159,110,0.28), 0 0 0 4px rgba(13,159,110,0.10);
            background:#f2fdf8;
          }
        }
        @keyframes siGenTilePulse{
          0%, 100%{ transform:scale(1); }
          50%{ transform:scale(1.12); }
        }
        .si-acct--generator{
          border-color:rgba(13,159,110,0.45);
          animation:siGenPulse 1.9s ease-in-out infinite;
        }
        .si-acct--generator .si-acct__tile{
          animation:siGenTilePulse 1.9s ease-in-out infinite;
        }
        /* animation:none plutôt que animation-play-state:paused — une animation
           en pause continue d'imposer ses valeurs et écraserait l'ombre du survol. */
        .si-acct--generator:hover,
        .si-acct--generator:hover .si-acct__tile{ animation:none; }

        @media (prefers-reduced-motion: reduce){
          .si-acct--generator,
          .si-acct--generator .si-acct__tile{ animation:none; }
        }
      `}</style>

      <div className="si-card" style={{
        width: '100%', maxWidth: '1180px', minHeight: 'min(880px, 92vh)',
        display: 'flex', borderRadius: '28px', overflow: 'hidden',
        boxShadow: '0 40px 120px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.06)',
      }}>

        {/* ───────── PANNEAU GAUCHE (branding) ───────── */}
        <div className="si-left" style={{
          flex: '1 1 50%', position: 'relative', overflow: 'hidden',
          background: '#070c1a',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          padding: '52px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* glows */}
          <div style={{ position: 'absolute', top: '-130px', right: '-90px', width: '460px', height: '460px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,93,252,0.22) 0%, transparent 62%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-150px', left: '-110px', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(47,111,237,0.14) 0%, transparent 60%)', pointerEvents: 'none' }} />

          {/* haut : logo + texte */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Logo mode="light" logoWidth="auto" imgStyle={{ maxWidth: '128px', display: 'block' }} />

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(124,107,255,0.12)', border: '1px solid rgba(124,107,255,0.28)',
              borderRadius: '100px', padding: '5px 14px', margin: '40px 0 22px',
            }}>
              <HiLockClosed size={12} color="#a99bff" />
              <span style={{ color: '#a99bff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Plateforme professionnelle</span>
            </div>

            <h1 style={{ color: '#fff', fontSize: '38px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 14px' }}>
              Votre image, sur tous vos supports
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.6, margin: 0, maxWidth: '400px' }}>
              Textile personnalisé, haute visibilité, objets publicitaires, print…
              Commandez vos produits, suivez vos projets et validez vos BAT dans un seul espace.
            </p>
          </div>

          {/* milieu : vitrine de l'offre */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <OfferShowcase />
          </div>

          {/* bas : badges de confiance */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', gap: '16px' }}>
            <LeftBadge icon={<HiOutlineShieldCheck size={22} />} label="Connexion sécurisée" />
            <LeftBadge icon={<HiOutlineLightningBolt size={22} />} label="Accès instantané" />
            <LeftBadge icon={<HiOutlineUsers size={22} />} label="Données en France" />
          </div>
        </div>

        {/* ───────── PANNEAU DROIT (formulaire) ───────── */}
        <div style={{
          flex: '1 1 50%', background: '#fff', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '48px 40px',
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <SignInForm disableSubmit={false} />

            {/* Création de compte — les deux natures, chacune sa carte */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '26px 0 14px' }}>
              <span style={{ flex: 1, height: '1px', background: '#eef0f5' }} />
              <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Pas encore de compte ?
              </span>
              <span style={{ flex: 1, height: '1px', background: '#eef0f5' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <AccountCta
                variant="client"
                icon={<HiOutlineOfficeBuilding size={19} />}
                title="Créer un compte client"
                subtitle="Commandez vos produits, suivez vos projets et validez vos BAT"
                onClick={() => openSignUp('customer')}
              />
              <AccountCta
                variant="generator"
                icon={<HiOutlineCash size={19} />}
                title="Devenir Générateur"
                subtitle="Apportez des clients à PEG et percevez une commission sur leurs commandes"
                onClick={() => openSignUp('generator')}
              />
            </div>

            {/* Carte sécurité SSL */}
            <div style={{
              marginTop: '22px', background: '#f8f7ff', border: '1px solid #eceaff',
              borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <HiLockClosed size={15} color="#6d5dfc" />
                  <span style={{ color: '#312e81', fontSize: '13.5px', fontWeight: 700 }}>Vos données sont protégées</span>
                </div>
                <p style={{ color: '#64748b', fontSize: '12.5px', lineHeight: 1.5, margin: 0 }}>
                  Nous utilisons un chiffrement SSL 256-bit pour garantir la sécurité de vos informations.
                </p>
              </div>
              <svg width="58" height="58" viewBox="0 0 58 58" fill="none" style={{ flexShrink: 0 }} aria-hidden>
                <path d="M29 6 l18 6 v13 q0 17 -18 27 q-18 -10 -18 -27 V12 Z" fill="#e9e6ff" stroke="#c7bfff" strokeWidth="1.5" />
                <rect x="22" y="27" width="14" height="11" rx="2.5" fill="#6d5dfc" />
                <path d="M24 27 v-3 a5 5 0 0 1 10 0 v3" fill="none" stroke="#6d5dfc" strokeWidth="2.2" />
                <circle cx="44" cy="40" r="9" fill="#7c6bff" />
                <path d="M40 40 l3 3 l5 -6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '22px' }}>
              <p style={{ color: '#475569', fontSize: '12.5px', fontWeight: 500, margin: '0 0 6px' }}>
                🇫🇷 Hébergé en France
              </p>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                © {year} {APP_NAME}
              </p>
            </div>
          </div>
        </div>
      </div>

      <SignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        initialReferralCode={referralFromUrl}
        initialAccountType={signUpType}
      />
    </div>
  );
};

export default SignIn;
