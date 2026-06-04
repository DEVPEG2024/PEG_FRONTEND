import { useState } from 'react';
import SignInForm from './SignInForm';
import SignUpModal from './SignUpModal';
import Logo from '@/components/template/Logo';
import { APP_NAME } from '@/constants/app.constant';
import { HiLockClosed, HiOutlineShieldCheck, HiOutlineLightningBolt, HiOutlineUsers } from 'react-icons/hi';

/* ── Illustration "espace de gestion" — laptop + mug + plante + bouclier ── */
const Scene = () => (
  <svg width="420" height="300" viewBox="0 0 420 300" fill="none" style={{ display: 'block', maxWidth: '100%', height: 'auto' }} aria-hidden>
    <defs>
      <linearGradient id="siScreen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1c2155" /><stop offset="1" stopColor="#0c1030" />
      </linearGradient>
      <linearGradient id="siShield" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7c6bff" /><stop offset="1" stopColor="#4f3fd1" />
      </linearGradient>
      <linearGradient id="siArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8b7dff" stopOpacity="0.6" /><stop offset="1" stopColor="#8b7dff" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* ombre */}
    <ellipse cx="210" cy="270" rx="160" ry="17" fill="#5a47e0" opacity="0.20" />

    {/* plante (droite) */}
    <path d="M330 210 q-10 -42 6 -68" stroke="#6d5dfc" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M336 160 q24 -10 32 -36 q-28 2 -36 26 q-2 8 4 10Z" fill="#7a6bf0" />
    <path d="M330 168 q-24 -6 -36 -30 q26 -4 36 18 q4 8 0 12Z" fill="#6d5dfc" />
    <path d="M336 178 q4 -28 26 -40 q4 24 -16 36 q-8 6 -10 4Z" fill="#8b7dff" />
    <path d="M316 210 h30 l-4 28 q-1 6 -7 6 h-8 q-6 0 -7 -6Z" fill="#2a2466" stroke="rgba(255,255,255,0.12)" />

    {/* écran laptop */}
    <rect x="100" y="62" width="200" height="128" rx="10" fill="url(#siScreen)" stroke="rgba(124,107,255,0.45)" />
    <rect x="109" y="71" width="182" height="110" rx="6" fill="#090d24" />
    {/* barre + logo */}
    <circle cx="120" cy="82" r="2.6" fill="#6d5dfc" /><rect x="127" y="80" width="26" height="4" rx="2" fill="#fff" opacity="0.55" />
    {/* sidebar */}
    <rect x="116" y="94" width="38" height="80" rx="5" fill="rgba(124,107,255,0.08)" />
    {[0,1,2,3,4].map((i)=>(<rect key={i} x="123" y={103+i*14} width="24" height="4.5" rx="2" fill="#8b7dff" opacity={i===0?0.85:0.3} />))}
    {/* area chart */}
    <path d="M166 150 L186 132 L206 140 L226 118 L246 128 L266 108 L282 116 L282 168 L166 168 Z" fill="url(#siArea)" />
    <path d="M166 150 L186 132 L206 140 L226 118 L246 128 L266 108 L282 116" stroke="#a99bff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* donut */}
    <circle cx="190" cy="115" r="14" fill="none" stroke="rgba(124,107,255,0.2)" strokeWidth="5.5" />
    <path d="M190 101 a14 14 0 0 1 12 21" fill="none" stroke="#6d5dfc" strokeWidth="5.5" strokeLinecap="round" />
    {/* lignes liste */}
    <rect x="220" y="100" width="62" height="4.5" rx="2" fill="#fff" opacity="0.18" />
    <rect x="220" y="109" width="48" height="4.5" rx="2" fill="#fff" opacity="0.12" />
    {/* base laptop */}
    <path d="M84 190 h232 l16 16 H68 Z" fill="#221d56" stroke="rgba(255,255,255,0.1)" />
    <rect x="162" y="195" width="86" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />

    {/* mug (gauche) */}
    <rect x="42" y="162" width="48" height="50" rx="10" fill="#2a2466" stroke="rgba(255,255,255,0.12)" />
    <path d="M90 173 q17 2 17 17 q0 15 -17 15" fill="none" stroke="#2a2466" strokeWidth="6.5" />
    <text x="53" y="192" fill="#a99bff" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif">PEG</text>

    {/* bouclier (avant-droite) */}
    <path d="M300 182 l36 -11 l36 11 v24 q0 32 -36 47 q-36 -15 -36 -47 Z" fill="url(#siShield)" stroke="rgba(255,255,255,0.18)" />
    <rect x="326" y="210" width="22" height="17" rx="3" fill="#fff" opacity="0.95" />
    <path d="M329 210 v-5 a8 8 0 0 1 16 0 v5" fill="none" stroke="#fff" strokeWidth="2.8" opacity="0.95" />
    <circle cx="337" cy="218" r="2.6" fill="#4f3fd1" />
  </svg>
);

const LeftBadge = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', textAlign: 'center', maxWidth: '100px' }}>
    <span style={{ color: '#8b7dff', display: 'flex' }}>{icon}</span>
    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, lineHeight: 1.3 }}>{label}</span>
  </div>
);

const SignIn = () => {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <div style={{
      minHeight: '100vh', background: '#06080f', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @media (max-width: 920px){ .si-left{ display:none !important; } .si-card{ max-width:520px !important; } }
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
              <span style={{ color: '#a99bff', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Accès sécurisé</span>
            </div>

            <h1 style={{ color: '#fff', fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08, margin: '0 0 14px' }}>
              Bon retour 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.6, margin: 0, maxWidth: '360px' }}>
              Connectez-vous à votre espace de gestion pour continuer.
            </p>
          </div>

          {/* milieu : illustration */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '-30px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,93,252,0.22) 0%, transparent 62%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}><Scene /></div>
            </div>
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

            {/* Lien créer un compte */}
            <div style={{ textAlign: 'center', marginTop: '22px' }}>
              <span style={{ color: '#64748b', fontSize: '13.5px' }}>Pas encore de compte ? </span>
              <button
                onClick={() => setIsSignUpOpen(true)}
                style={{ background: 'none', border: 'none', color: '#5b4de0', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
              >
                Créer un compte
              </button>
            </div>

            {/* Carte sécurité SSL */}
            <div style={{
              marginTop: '28px', background: '#f8f7ff', border: '1px solid #eceaff',
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

      <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
    </div>
  );
};

export default SignIn;
