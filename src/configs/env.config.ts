const dev = {
    API_ENDPOINT_URL: 'https://ideal-space-parakeet-wrrj467p9w4fg64-1337.app.github.dev',
    STRIPE_PUBLIC_KEY: 'pk_test_51R9MNCQMnon3CcoqBv9jtL5Njxa36ATMCBqNnDZVuBmnBBtt990Qs4lCm8cBPBKVtSPs47EdJgKojXIYlpd6VaE300SZEcS93P'
  };
  
  // API HEROKU
  const prod = {
    API_ENDPOINT_URL: 'https://api.mypeg.fr',
    STRIPE_PUBLIC_KEY: 'pk_test_51R9MNCQMnon3CcoqBv9jtL5Njxa36ATMCBqNnDZVuBmnBBtt990Qs4lCm8cBPBKVtSPs47EdJgKojXIYlpd6VaE300SZEcS93P' 
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
  