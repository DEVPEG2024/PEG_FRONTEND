import FileUplaodDragLight from '@/components/shared/Upload/light';
import { Button, Dialog, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PegFile } from '@/@types/pegFile';
import { useAppDispatch } from '@/store';
import { createProductCategory, updateProductCategory, useAppSelector } from '../store';
import { apiLoadPegFilesAndFiles } from '@/services/FileServices';
import FileUplaodCustom from '@/components/shared/Upload';
import { Loading } from '@/components/shared';

function ModalEditProductCategory({
  mode,
  title,
  isOpen,
  handleCloseModal
}: {
  mode: string,
  title: string;
  isOpen: boolean;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const { productCategory } = useAppSelector(
      (state) => state.productCategories.data
    );
  const [name, setName] = useState<string>(productCategory?.name ?? '');
  const [image, setImage] = useState<PegFile | undefined>(undefined);
  const [imageModified, setImageModified] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const dispatch = useAppDispatch();

  useEffect(() => {
    fetchImage();
  }, [productCategory]);

  const fetchImage = async (): Promise<void> => {
    setImageLoading(true);
    if (productCategory?.image) {
      const imageLoaded: PegFile = (
        await apiLoadPegFilesAndFiles([productCategory.image])
      )[0];
      
      setImage(imageLoaded);
    }
    setImageLoading(false);
  };

  const updateImage = (image: { file: File; name: string }) => {
    setImage(image);
    setImageModified(true);
  };

  const handleSubmit = async () => {
      if (mode === 'add') {
        dispatch(
          createProductCategory({
            name,
            products: [],
            image,
          })
        );
      } else {
        dispatch(
          updateProductCategory({ 
            productCategory: {
              documentId: productCategory!.documentId,
              name,
              image
            },
            imageModified})
        );
      }
      handleCloseModal();
    };

  return (
    <Dialog isOpen={isOpen} onClose={handleCloseModal} onRequestClose={handleCloseModal}>
      <div className="flex flex-col h-full justify-between">
        <h5 className="mb-4">{title}</h5>
        <div className="flex flex-col gap-4">
          <Input
            placeholder={t('cat.categoryName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Loading loading={imageLoading}>
            <FileUplaodCustom image={image} setImage={updateImage} />
          </Loading>
        </div>
        <div className="text-right mt-6">
          <Button
            className="ltr:mr-2 rtl:ml-2"
            variant="plain"
            onClick={handleCloseModal}
          >
            {t('cancel')}
          </Button>
          <Button variant="solid" onClick={handleSubmit}>
            {t('save')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default ModalEditProductCategory;
