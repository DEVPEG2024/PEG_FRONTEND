import { Container } from '@/components/shared';
import { Button } from '@/components/ui';
import { API_BASE_URL } from '@/configs/api.config';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { useAppSelector } from '@/store';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Cancel() {
  const navigate = useNavigate();
  const { token } = useAppSelector((state) => state.auth.session)

  useEffect(() => {
    const cancelOrderItems = async () => {
      const sessionId = new URLSearchParams(window.location.search).get('session_id');
      if (sessionId) {
        await fetch(API_BASE_URL + '/checkout/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${TOKEN_TYPE}${token}`
          },
          body: JSON.stringify({sessionId}),
        })
      }
    }
    
    cancelOrderItems()
  }, []);

  return (
    <Container className="h-full">
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="lg:w-1/2 w-full">
          <img
            src="/img/checkout/Checkout_KO.png"
            alt="Paiement annulé"
            className="w-full h-auto rounded-lg object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-red-600 mt-4">Mission bloquée</h1>
        <p>Décollage annulé: le carburant bancaire semble insuffisant.</p>
        <Button
          onClick={() => navigate('/customer/cart')}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-full"
          variant="solid"
        >
          Réessayer
        </Button>
      </div>
    </Container>
  );
}

export default Cancel;
