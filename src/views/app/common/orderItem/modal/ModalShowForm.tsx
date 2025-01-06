import { Dialog } from '@/components/ui';
import { useAppDispatch, setOrderItemFormDialog } from '../store';
import ShowForm from '@/views/app/customer/products/modal/ShowForm';
import { FormAnswer } from '@/@types/formAnswer';

function ModalShowForm({ formAnswer, formDialog }: { formAnswer: FormAnswer, formDialog: boolean }) {
  const dispatch = useAppDispatch();

  const handleClose = (): void => {
    dispatch(setOrderItemFormDialog(false));
  };

  return (
    <div>
      <Dialog isOpen={formDialog} onClose={handleClose} width={1200} contentClassName='dialog-formbuilder'>
        <ShowForm onSubmit={() => {}} fields={formAnswer.form.fields} formAnswer={formAnswer} readOnly={true}/>
      </Dialog>
    </div>
  );
}

export default ModalShowForm;
