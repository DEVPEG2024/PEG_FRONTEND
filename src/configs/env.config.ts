const dev = {
    API_ENDPOINT_URL: 'https://ideal-space-parakeet-wrrj467p9w4fg64-1337.app.github.dev'
  };
  
  // API HEROKU
  const prod = {
    API_ENDPOINT_URL: 'http://api.mypeg.fr' // TODO: passer en HTTPS via Caddy par exemple (https://forum.strapi.io/t/caddy-proxying-with-strapi/40616) --> voir page déploiement Strapi
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
  