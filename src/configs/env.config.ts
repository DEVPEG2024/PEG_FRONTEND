const dev = {
    API_ENDPOINT_URL: 'https://ideal-space-parakeet-wrrj467p9w4fg64-1337.app.github.dev',
    //API_ENDPOINT_URL: 'http://localhost:1337',
    STRIPE_PUBLIC_KEY: 'pk_test_51R9MNCQMnon3CcoqBv9jtL5Njxa36ATMCBqNnDZVuBmnBBtt990Qs4lCm8cBPBKVtSPs47EdJgKojXIYlpd6VaE300SZEcS93P'
  };
  
  // API HEROKU
  const prod = {
    API_ENDPOINT_URL: 'https://api.mypeg.fr',
    STRIPE_PUBLIC_KEY: 'pk_live_51R9MMyKa36UjT6qO6418qHBIJuOqvtIXK9VIUD1H7DV9wUVG9SYyHKPDPkiC4PfgINSqzUy5bWWIE9viuwuBKMjk00RO7QspVZ' 
  };
  
  const getEnv = () => {
      switch (process.env.NODE_ENV) {
          case 'development':
              return dev
          case 'production':
              return prod
          default:
              break;
      }
  }
  
  export const env = getEnv()
  