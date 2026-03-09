import { Container } from '@/components/shared';
import { Button } from '@/components/ui';
import { API_BASE_URL } from '@/configs/api.config';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { useAppSelector } from '@/store';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineExclamationCircle, HiArrowLeft, HiHome } from 'react-icons/hi';

function Cancel() {
  const navigate = useNavigate();
  const { token } = useAppSelector((state) => state.auth.session);

  useEffect(() => {
    const cancelOrderItems = async () => {
      const sessionId = new URLSearchParams(window.location.search).get(
        'session_id'
      );
      if (sessionId) {
        await fetch(API_BASE_URL + '/checkout/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${TOKEN_TYPE}${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });
      }
    };

    cancelOrderItems();
  }, []);

  return (
    <Container className="h-full">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-lg">

          {/* Card principale */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">

            {/* Bannière image */}
            <div className="relative w-full bg-red-50 dark:bg-gray-700">
              <img
                src="/img/checkout/Checkout_KO.png"
                alt="Paiement annulé"
                className="w-full h-64 object-cover"
              />
              {/* Icône overlay */}
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md">
                <HiOutlineExclamationCircle className="text-[#F96260] w-6 h-6" />
              </div>
            </div>

            {/* Contenu */}
            <div className="px-8 py-8 text-center">

              {/* Badge statut */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-[#F96260] mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F96260]" />
                Paiement annulé
              </span>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Mission bloquée
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-2">
                Décollage annulé — le carburant bancaire semble insuffisant.
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mb-8">
                Votre panier a été conservé. Vous pouvez réessayer à tout moment.
              </p>

              {/* Séparateur */}
              <div className="border-t border-gray-100 dark:border-gray-700 mb-6" />

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate('/customer/cart')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold"
                  style={{ backgroundColor: '#F96260', borderColor: '#F96260' }}
                  variant="solid"
                >
                  <HiArrowLeft className="w-4 h-4" />
                  Réessayer
                </Button>
                <Button
                  onClick={() => navigate('/home')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold"
                  variant="default"
                >
                  <HiHome className="w-4 h-4" />
                  Accueil
                </Button>
              </div>

            </div>
          </div>

          {/* Aide */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Un problème persistant ?{' '}
            <a href="mailto:contact@mypeg.fr" className="text-[#F96260] hover:underline">
              Contactez le support
            </a>
          </p>

        </div>
      </div>
    </Container>
  );
}

export default Cancel;
