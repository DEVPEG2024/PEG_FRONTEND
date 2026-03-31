import { lazy, Suspense } from 'react';
import { Dialog } from '@/components/ui';
import { useAppDispatch, setOrderItemFormDialog } from '../store';
import { FormAnswer } from '@/@types/formAnswer';

const ShowForm = lazy(() => import('@/views/app/customer/products/modal/ShowForm'));

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
          <Suspense fallback={<div>Chargement…</div>}>
            <ShowForm
              onSubmit={() => {}}
              fields={formAnswer.form.fields}
              formAnswer={formAnswer}
              readOnly={true}
            />
          </Suspense>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalShowForm;
