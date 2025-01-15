import { Dialog } from '@/components/ui';
import {
  createForm,
  setForm,
  setNewFormDialog,
  updateForm,
  useAppDispatch,
  useAppSelector,
} from '../store';
import EditForm from './EditForm';

function EditFormModal() {
  const { newFormDialog, form } = useAppSelector((state) => state.forms.data);
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(setNewFormDialog(false));
    dispatch(setForm(null));
  };

  const onValidate = (name: string, components: any) => {
    if (form?.documentId) {
      dispatch(
        updateForm({
          documentId: form.documentId,
          name,
          fields: JSON.stringify(components),
        })
      );
    } else {
      dispatch(createForm({ name, fields: JSON.stringify(components) }));
    }
    handleClose();
  };

  return (
    <div>
      <Dialog
        isOpen={newFormDialog}
        onClose={handleClose}
        width={1200}
        contentClassName="dialog-formbuilder"
      >
        <EditForm
          onValidate={onValidate}
          onCancel={handleClose}
          fields={form?.fields ?? []}
          name={form?.name ?? ''}
        />
      </Dialog>
    </div>
  );
}

export default EditFormModal;
