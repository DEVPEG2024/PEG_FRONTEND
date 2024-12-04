import FileUplaodDragLight from '@/components/shared/Upload/light';
import { Button, Dialog, Input, Notification, toast } from '@/components/ui';
import { apiNewCategoryProduct } from '@/services/ProductCategoryServices';
import { ICategoryProducer } from '@/services/ProducerServices';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiCheckCircle } from 'react-icons/hi';

function ModalFormCategoryProduct({
  title,
  isOpen,
  onClose,
  category,
  fetchCategories,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  fetchCategories: () => void;
  category: ICategoryProducer | null;
}) {
  const { t } = useTranslation();
  const [newTitle, setNewTitle] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const onDialogClose = () => {
    onClose();
  };
  useEffect(() => {
    if (category) {
      setNewTitle(category?.label || '');
    }
  }, [category]);
  const onDialogOk = async () => {
    const response = await apiNewCategoryProduct({
      title: newTitle,
      image: image || '',
    });

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
      setNewTitle('');
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
        <div className="flex flex-col gap-4">
          <Input
            placeholder={t('cat.categoryName')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <FileUplaodDragLight
            image={image || ''}
            setImage={setImage}
            setFileType={(type: string) => {}}
          />
        </div>
        <div className="text-right mt-6">
          <Button
            className="ltr:mr-2 rtl:ml-2"
            variant="plain"
            onClick={onDialogClose}
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

export default ModalFormCategoryProduct;
