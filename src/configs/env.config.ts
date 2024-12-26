const dev = {
    API_ENDPOINT_URL: 'https://1337-mguldner-pegstrapi-w6xvie5q322.ws-eu117.gitpod.io'
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
  