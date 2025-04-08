import { Container } from '@/components/shared';
import { useAppDispatch, useAppSelector } from '@/store';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { API_BASE_URL } from '@/configs/api.config';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { Button } from '@/components/ui';
import { removeFromCartItemOfOrderItem } from '@/store/slices/base/cartSlice';

function Success() {
  const navigate = useNavigate();
  const { token } = useAppSelector((state) => state.auth.session)
  const dispatch = useAppDispatch();

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = new URLSearchParams(window.location.search).get('session_id');
      if (sessionId) {
        const response = await fetch(API_BASE_URL + '/checkout/stripePaymentInformations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${TOKEN_TYPE}${token}`
          },
          body: JSON.stringify({sessionId}),
        }),
        { sessionOrderItemsDocumentIds }: { sessionOrderItemsDocumentIds: string } = await response.json(),
        orderItemsValidatedDocumentIdsParsed: string[] = JSON.parse(sessionOrderItemsDocumentIds);
        
        orderItemsValidatedDocumentIdsParsed.map((orderItemValidatedDocumentId: string) => dispatch(removeFromCartItemOfOrderItem(orderItemValidatedDocumentId)))
      }
    }
    
    confirmPayment()
  }, []);

  return (
    <Container className="h-full">
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="lg:w-1/2 w-full">
          <img
            src="/img/checkout/Checkout_OK.png"
            alt="Paiement réussi"
            className="w-full h-auto rounded-lg object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-green-600 mt-4">Le paiement a franchi l'atmosphère !</h1>
        <p>Merci, votre paiement a été validé.</p>
        <p>L'équipe créative est en route vers votre projet !</p>
        <Button
            onClick={() => navigate('/common/projects')}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-full"
            variant="solid"
          >
            Mes projets
          </Button>
      </div>
    </Container>
  );
}

export default Success;
