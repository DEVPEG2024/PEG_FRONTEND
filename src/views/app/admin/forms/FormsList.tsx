import FormsListContent from './FormsListContent';
import { Container } from '@/components/shared';
import EditFormModal from './edit/EditFormModal';

function FormsList() {
  return (
    <Container className="h-full">
      <FormsListContent />
      <EditFormModal />
    </Container>
  );
}

export default FormsList;
