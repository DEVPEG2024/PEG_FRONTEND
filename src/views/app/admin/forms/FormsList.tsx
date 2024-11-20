import FormsListContent from './FormsListContent';
import { Container } from '@/components/shared';
import NewFormModal from './add/NewFormModal';

function FormsList() {
  return (
    <Container className="h-full">
      <FormsListContent />
      <NewFormModal />
    </Container>
  );
}

export default FormsList;
