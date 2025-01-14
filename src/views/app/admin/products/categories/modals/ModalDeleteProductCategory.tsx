import { ProductCategory } from '@/@types/product';
import { Button, Dialog } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { useTranslation } from 'react-i18next';
import { deleteProductCategory } from '../store';

function ModalDeleteProductCategory({
  title,
  isOpen,
  setIsOpen,
  productCategory,
}: {
  title: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  productCategory: ProductCategory;
}) {
  const { t } = useTranslation();
  const onDialogClose = () => {
    setIsOpen(false);
  };
  const dispatch = useAppDispatch();

  const onDialogOk = async () => {
    dispatch(deleteProductCategory(productCategory.documentId));
    onDialogClose();
  };
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onDialogClose}
      onRequestClose={onDialogClose}
    >
      <div className="flex flex-col h-full justify-between">
        <h5 className="mb-4">{title}</h5>
        <p>{t('cat.deleteCategoryConfirmation')}</p>
        <div className="text-right mt-6">
          <Button
            className="ltr:mr-2 rtl:ml-2"
            variant="plain"
            onClick={onDialogClose}
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

export default ModalDeleteProductCategory;
