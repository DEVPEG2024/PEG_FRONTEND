const dev = {
    API_ENDPOINT_URL: 'https://ideal-space-parakeet-wrrj467p9w4fg64-1337.app.github.dev'
  };
  
  // API HEROKU
  const prod = {
    API_ENDPOINT_URL: 'https://api.mypeg.fr'
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
  