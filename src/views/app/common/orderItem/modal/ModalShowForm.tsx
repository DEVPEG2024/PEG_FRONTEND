import { Dialog } from '@/components/ui';
import { useAppDispatch, setOrderItemFormDialog } from '../store';
import ShowForm from '@/views/app/customer/products/modal/ShowForm';
import { FormAnswer } from '@/@types/formAnswer';

function ModalShowForm({
  formAnswer,
  formDialog,
}: {
  formAnswer: FormAnswer;
  formDialog: boolean;
}) {
  const dispatch = useAppDispatch();

  const handleClose = (): void => {
    dispatch(setOrderItemFormDialog(false));
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
            onSubmit={() => {}}
            fields={formAnswer.form.fields}
            formAnswer={formAnswer}
            readOnly={true}
          />
        </div>
      </Dialog>
    </div>
  );
}

export default ModalShowForm;
