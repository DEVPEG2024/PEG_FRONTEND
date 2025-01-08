import { Button, Dialog, Input } from '@/components/ui';

import { useAppDispatch } from '@/store';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createCustomerCategory, updateCustomerCategory, useAppSelector } from '../store';

function ModalEditCustomerCategory({
  mode,
  title,
  isOpen,
  handleCloseModal,
}: {
  mode: string;
  title: string;
  isOpen: boolean;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const { customerCategory } = useAppSelector(
    (state) => state.customerCategories.data
  );
  const [newName, setNewName] = useState(customerCategory?.name?? '');
  const dispatch = useAppDispatch();

  const onDialogOk = async () => {
    if (mode === 'add') {
      dispatch(createCustomerCategory({name: newName, banner: undefined, products: [], customers: []}))
    } else {
      dispatch(updateCustomerCategory({documentId: customerCategory!.documentId, name: newName}))
    }
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
        <Input
          placeholder={t('cat.categoryName')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div className="text-right mt-6">
          <Button
            className="ltr:mr-2 rtl:ml-2"
            variant="plain"
            onClick={handleCloseModal}
          >
            {t('cancel')}
          </Button>
          <Button variant="solid" onClick={onDialogOk}>
            {t('save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default ModalEditCustomerCategory;
