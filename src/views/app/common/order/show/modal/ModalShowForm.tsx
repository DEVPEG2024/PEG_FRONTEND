import { Dialog } from '@/components/ui';
import { useAppDispatch, useAppSelector, setFormDialog } from '../store';
import { Form } from '@/@types/form';
import ShowForm from '@/views/app/customer/products/modal/ShowForm';

function ModalShowForm({ form }: { form: Form }) {
  const dispatch = useAppDispatch();
  const { formDialog, formAnswer } = useAppSelector(
    (state) => state.showOrder.data
  );

  const handleClose = (): void => {
    dispatch(setFormDialog(false));
  };

  return (
    <div>
      <Dialog isOpen={formDialog} onClose={handleClose} width={1200} contentClassName='dialog-formbuilder'>
        <ShowForm onSubmit={() => {}} fields={form.fields} formAnswer={formAnswer} readOnly={true}/>
      </Dialog>
    </div>
  );
}

export default ModalShowForm;
