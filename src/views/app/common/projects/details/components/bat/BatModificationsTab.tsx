// Onglet « Modifications » : apparaît quand le client a refusé le BAT. Même
// bloc que l'Accueil (demande du client, photos, envoi de la nouvelle version).
import Container from '@/components/shared/Container';
import DetailsRight from '../DetailsRight';
import BatHomeBlock from './BatHomeBlock';

const BatModificationsTab = () => (
  <Container className="h-full">
    <div className="peg-stack-mobile" style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 'var(--peg-gap-20)',
      paddingTop: '20px',
      paddingBottom: '20px',
      alignItems: 'start',
    }}>
      <BatHomeBlock />
      <DetailsRight />
    </div>
  </Container>
);

export default BatModificationsTab;
