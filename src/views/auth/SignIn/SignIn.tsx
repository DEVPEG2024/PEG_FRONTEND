import { useState } from 'react';
import SignInForm from './SignInForm';
import SignUpModal from './SignUpModal';

const SignIn = () => {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  return (
    <>
      {/* Page heading */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>

        {/* Status badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: 'rgba(47,111,237,0.1)',
            border: '1px solid rgba(47,111,237,0.22)',
            borderRadius: '100px',
            padding: '4px 13px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#2f6fed',
              boxShadow: '0 0 6px rgba(47,111,237,0.8)',
            }}
          />
          <span
            style={{
              color: '#6b9eff',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Accès sécurisé
          </span>
        </div>

        <h2
          style={{
            color: '#fff',
            fontSize: '23px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
          }}
        >
          Bon retour 👋
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.38)',
            fontSize: '13px',
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          Connectez-vous à votre espace de gestion
        </p>
      </div>

      <SignInForm disableSubmit={false} />

      {/* Lien créer un compte */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: 'Inter, sans-serif' }}>
          Pas encore de compte ?{' '}
        </span>
        <button
          onClick={() => setIsSignUpOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b9eff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Créer un compte
        </button>
      </div>

      <SignUpModal isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
    </>
  );
};

export default SignIn;
