import { Dialog } from '@/components/ui';
import {
  useAppDispatch,
  useAppSelector,
  setFormDialog,
  setFormAnswer,
  setFormCompleted,
} from '../show/store';
import { Form } from '@/@types/form';

import ShowForm from './ShowForm';
import {
  CartItemFormAnswerEdition,
  editFormAnswerCartItem,
} from '@/store/slices/base/cartSlice';
import { FormAnswer } from '@/@types/formAnswer';
import { toast } from 'react-toastify';

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
    const formAnswer: Partial<FormAnswer> = { form, answer: submission };
    if (onEdition) {
      handleEditFormAnswerCartItem(formAnswer);
    }
    dispatch(setFormAnswer(formAnswer));
    dispatch(setFormCompleted(true));
    handleClose();
  };

  const handleEditFormAnswerCartItem = (
    formAnswer: Partial<FormAnswer>
  ): void => {
    dispatch(
      editFormAnswerCartItem({
        cartItemId,
        formAnswer,
      } as CartItemFormAnswerEdition)
    );
    toast.success('Formulaire modifié');
  };

  return (
    <div>
      <Dialog
        isOpen={formDialog}
        onClose={handleClose}
        closable={false}
        width={800}
        contentClassName="dialog-formbuilder"
      >
        <div className="dialog-formbuilder-header">
          <p className="dialog-formbuilder-title">Détails du produit</p>
          <button
            type="button"
            className="dialog-formbuilder-close"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <div className="dialog-formbuilder-body">
          <ShowForm
            onSubmit={onSubmit}
            fields={form.fields}
            formAnswer={formAnswer}
            readOnly={false}
          />
        </div>
      </Dialog>
    </div>
  );
}

export default ModalCompleteForm;
