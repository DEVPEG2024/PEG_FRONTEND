import { Dialog, Notification, toast } from '@/components/ui';
import {
  useAppDispatch,
  useAppSelector,
  setFormDialog,
  setFormAnswer,
  setFormCompleted,
} from '../show/store';
import { Form } from '@/@types/form';

import ShowForm from './ShowForm';
import { CartItemFormAnswerEdition, editFormAnswerCartItem } from '@/store/slices/base/cartSlice';
import { FormAnswer } from '@/@types/formAnswer';

function ModalCompleteForm({
  form,
  onEdition,
}: {
  form: Form;
  onEdition: boolean;
}) {
  const dispatch = useAppDispatch();
  const { formDialog, formAnswer, cartItemId } = useAppSelector(
    (state) => state.showProduct.data
  );

  const handleClose = () => {
    dispatch(setFormDialog(false));
    //dispatch(setForm(null));
  };

  const onSubmit = async (submission: any) => {
    const formAnswer: Partial<FormAnswer> = {form, answer: submission}
    if (onEdition) {
      handleEditFormAnswerCartItem(formAnswer);
    }
    dispatch(setFormAnswer(formAnswer));
    dispatch(setFormCompleted(true))
    handleClose()
  }

  const handleEditFormAnswerCartItem = (formAnswer: Partial<FormAnswer>): void => {
    dispatch(
      editFormAnswerCartItem({
        cartItemId,
        formAnswer,
      } as CartItemFormAnswerEdition)
    );
    toast.push(
      <Notification type="success" title="Modifié">
        Formulaire modifié
      </Notification>
    );
  };

  return (
    <div>
      <Dialog isOpen={formDialog} onClose={handleClose} width={1200} contentClassName='dialog-formbuilder'>
        <ShowForm onSubmit={onSubmit} fields={form.fields} formAnswer={formAnswer} readOnly={false}/>
      </Dialog>
    </div>
  );
}

export default ModalCompleteForm;
