import { Button, Dialog } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { useTranslation } from 'react-i18next';
import { deleteCustomerCategory, useAppSelector } from '../store';

function ModalDeleteCustomerCategory({
  title,
  isOpen,
  handleCloseModal,
}: {
  title: string;
  isOpen: boolean;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const { customerCategory } = useAppSelector(
    (state) => state.customerCategories.data
  );
  const dispatch = useAppDispatch();

  const onDialogOk = async () => {
    dispatch(deleteCustomerCategory(customerCategory!.documentId));
    handleCloseModal();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCloseModal}
      onRequestClose={handleCloseModal}
    >
      <div className="flex flex-col h-full justify-between">
        <h5 className="mb-4">{title}</h5>
        <p>{t('cat.deleteCategoryConfirmation')}</p>
        <div className="text-right mt-6">
          <Button
            className="ltr:mr-2 rtl:ml-2"
            variant="plain"
            onClick={handleCloseModal}
          >
            {t('cancel')}
          </Button>
          <Button variant="solid" onClick={onDialogOk}>
            {t('delete')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default ModalDeleteCustomerCategory;
