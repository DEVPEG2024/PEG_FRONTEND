import { Button, Dialog, Notification, toast } from '@/components/ui';
import { apiDeleteCategoryProduct } from '@/services/categoryProduct';
import { useTranslation } from 'react-i18next';
import { HiCheckCircle } from 'react-icons/hi';

function ModalDeleteCategory({
  title,
  isOpen,
  setIsOpen,
  category,
  fetchCategories,
}: {
  title: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  fetchCategories: () => void;
  category: string | null;
}) {
  const { t } = useTranslation();
  const onDialogClose = () => {
    setIsOpen(false);
  };

  const onDialogOk = async () => {
    const response = await apiDeleteCategoryProduct(category || '');

    if (response.status === 200) {
      toast.push(
        <Notification
          className="bg-green-500"
          title={t('cat.categoryAdded')}
          type="success"
          customIcon={<HiCheckCircle color="white" size={20} />}
        />
      );
      onDialogClose();
      fetchCategories();
    }
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

export default ModalDeleteCategory;
