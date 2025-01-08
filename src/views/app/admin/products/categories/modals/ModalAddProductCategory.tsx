import FileUplaodDragLight from '@/components/shared/Upload/light';
import { Button, Dialog, Input } from '@/components/ui';
import {  useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductCategory } from '@/@types/product';
import { Image } from '@/@types/image';
import { useAppDispatch } from '@/store';
import { createProductCategory } from '../store';

function ModalAddProductCategory({
  title,
  isOpen,
  onClose,
  productCategory,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  productCategory: ProductCategory | null;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState<string>(productCategory?.name ?? '');
  const [image, setImage] = useState<Partial<Image> | undefined>(productCategory?.image);
  const dispatch = useAppDispatch();

  const onDialogOk = async () => {
    dispatch(createProductCategory({name, products: [], image}))
    setName('')
    onClose()
  };
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onRequestClose={onClose}
    >
      <div className="flex flex-col h-full justify-between">
        <h5 className="mb-4">{title}</h5>
        <div className="flex flex-col gap-4">
          <Input
            placeholder={t('cat.categoryName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FileUplaodDragLight
            setImage={setImage}
          />
        </div>
        <div className="text-right mt-6">
          <Button
            className="ltr:mr-2 rtl:ml-2"
            variant="plain"
            onClick={onClose}
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

export default ModalAddProductCategory;
