const dev = {
    API_ENDPOINT_URL: import.meta.env.VITE_API_ENDPOINT_URL || 'http://localhost:1337',
    EXPRESS_BACKEND_URL: 'http://localhost:3000',
    STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
    IMBRETEX_API_URL: import.meta.env.VITE_IMBRETEX_API_URL || 'https://api.preprod.imbretex-upgrade.hegyd.net/api',
    IMBRETEX_API_TOKEN: import.meta.env.VITE_IMBRETEX_API_TOKEN || '',
  };

  // API HEROKU
  // Note: Vercel expose les variables avec le préfixe VITE_ (ex: VITE_API_ENDPOINT_URL)
  // Si la variable n'est pas trouvée, on utilise l'URL de production par défaut
  const apiUrl = import.meta.env.VITE_API_ENDPOINT_URL || 'https://api.mypeg.fr';
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
  const prod = {
    API_ENDPOINT_URL: apiUrl,
    EXPRESS_BACKEND_URL: apiUrl + '/api',
    STRIPE_PUBLIC_KEY: stripeKey,
    IMBRETEX_API_URL: import.meta.env.VITE_IMBRETEX_API_URL || 'https://api.preprod.imbretex-upgrade.hegyd.net/api',
    IMBRETEX_API_TOKEN: import.meta.env.VITE_IMBRETEX_API_TOKEN || '',
  };

  const getEnv = () => {
      switch (process.env.NODE_ENV) {
          case 'development':
              return dev
          case 'production':
              return prod
          default:
              return prod
      }
  }

  export const env = getEnv()
