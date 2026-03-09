import { Container } from '@/components/shared';
import { useAppDispatch, useAppSelector } from '@/store';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { API_BASE_URL } from '@/configs/api.config';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { Button } from '@/components/ui';
import { removeFromCartItemOfOrderItem } from '@/store/slices/base/cartSlice';
import { HiOutlineCheckCircle, HiOutlineFolderOpen, HiHome } from 'react-icons/hi';

function Success() {
  const navigate = useNavigate();
  const { token } = useAppSelector((state) => state.auth.session);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = new URLSearchParams(window.location.search).get(
        'session_id'
      );
      if (sessionId) {
        const response = await fetch(
            API_BASE_URL + '/checkout/stripePaymentInformations',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `${TOKEN_TYPE}${token}`,
              },
              body: JSON.stringify({ sessionId }),
            }
          ),
          {
            sessionOrderItemsDocumentIds,
          }: { sessionOrderItemsDocumentIds: string } = await response.json(),
          orderItemsValidatedDocumentIdsParsed: string[] = JSON.parse(
            sessionOrderItemsDocumentIds
          );

        orderItemsValidatedDocumentIdsParsed.map(
          (orderItemValidatedDocumentId: string) =>
            dispatch(
              removeFromCartItemOfOrderItem(orderItemValidatedDocumentId)
            )
        );
      }
    };

    confirmPayment();
  }, []);

  return (
    <Container className="h-full">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-lg">

          {/* Card principale */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">

            {/* Bannière image */}
            <div className="relative w-full bg-green-50 dark:bg-gray-700">
              <img
                src="/img/checkout/Checkout_OK.png"
                alt="Paiement réussi"
                className="w-full h-64 object-cover"
              />
              {/* Icône overlay */}
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md">
                <HiOutlineCheckCircle className="text-green-500 w-6 h-6" />
              </div>
            </div>

            {/* Contenu */}
            <div className="px-8 py-8 text-center">

              {/* Badge statut */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-600 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Paiement validé
              </span>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Le paiement a franchi l'atmosphère !
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-2">
                Merci, votre paiement a bien été validé.
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mb-8">
                L'équipe créative est en route vers votre projet !
              </p>

              {/* Séparateur */}
              <div className="border-t border-gray-100 dark:border-gray-700 mb-6" />

              {/* Boutons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate('/common/projects')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl font-semibold bg-green-500 border-green-500"
                  variant="solid"
                >
                  <HiOutlineFolderOpen className="w-4 h-4" />
                  Mes projets
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

          {/* Info commande */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Un email de confirmation vous a été envoyé.{' '}
            <a href="mailto:contact@mypeg.fr" className="text-[#F96260] hover:underline">
              Besoin d'aide ?
            </a>
          </p>

        </div>
      </div>
    </Container>
  );
}

export default Success;
