import { Container } from '@/components/shared';
import { Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

function Cancel() {
  const navigate = useNavigate();

  return (
    <Container className="h-full">
      <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold text-red-600">Paiement annulé</h1>
      <p>Vous pouvez réessayer à tout moment.</p>
      <Button
        onClick={() => navigate('/common/cart')}
        className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
        variant="solid"
      >
        Retour au panier
      </Button>
    </div>
    </Container>
  );
}

export default Cancel;
