import SignInForm from './SignInForm';

const SignIn = () => {
  return (
    <>
      <div style={{ marginBottom: '32px' }}>
        <p style={{
          color: 'rgba(255,255,255,0.3)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          Connexion
        </p>
        <h2 style={{
          color: '#fff',
          fontSize: '24px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginBottom: '6px',
        }}>
          Bon retour 👋
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Entrez vos identifiants pour accéder à votre espace
        </p>
      </div>
      <SignInForm disableSubmit={false} />
    </>
  );
};

export default SignIn;
