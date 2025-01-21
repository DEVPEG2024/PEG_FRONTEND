import { Alert, Button, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setEditSizeDialog,
  setSelectedSize,
  updateSize,
} from '../store/sizeSlice';
import { unwrapData } from '@/utils/serviceHelper';
import { SizeFormModel } from './ModalNewSize';
import { ProductCategory, Size } from '@/@types/product';
import {
  apiGetProductCategories,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';

type Option = {
  value: string;
  label: string;
};

// TODO: Mettre en commun avec ModalNewSize
function ModalEditSize() {
  const { editSizeDialog, selectedSize } = useAppSelector(
    (state) => state.sizes.data
  );
  const [productCategories, setProductCategories] = useState<Option[]>([]);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<SizeFormModel>({
    documentId: selectedSize?.documentId || '',
    name: selectedSize?.name || '',
    description: selectedSize?.description || '',
    productCategory: selectedSize?.productCategory?.documentId || '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchProductCategories();
  }, []);

  const fetchProductCategories = async () => {
    const {
      productCategories_connection,
    }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories());
    const productCategoriesList = productCategories_connection.nodes || [];
    const productCategories = productCategoriesList.map(
      (productCategory: ProductCategory) => ({
        value: productCategory.documentId || '',
        label: productCategory.name || '',
      })
    );
    setProductCategories(productCategories);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (verifyFormData().length === 0) {
      handleModifySize()
    }
  };

  const verifyFormData = () => {
    const tempErrors : string[] = [];
    if (formData.name === '') {
      tempErrors.push('Le nom est obligatoire');
    }
    setErrors(tempErrors);
    return tempErrors;
  }

  const handleModifySize = () => {
    const sizeToUpdate: Size = {
      ...formData,
      value: formData.name,
      productCategory:
        formData.productCategory !== '' ? formData.productCategory : null,
    };
    dispatch(updateSize(sizeToUpdate));
    setFormData({
      name: '',
      productCategory: '',
      description: '',
    });
    handleClose();
  }

  const handleClose = () => {
    dispatch(setEditSizeDialog(false));
    dispatch(setSelectedSize(null));
  };

  return (
    <div>
      <Dialog isOpen={editSizeDialog} onClose={handleClose} width={1200}>
        {errors.map((error, index) => (
          <Alert key={index} showIcon type="danger" className="mb-4">
            {error}
          </Alert>
        ))}
        <div className="flex flex-col justify-between gap-2">
          <div className="flex flex-row w-3/4">
            <Input
              value={formData.name}
              placeholder="Nom"
              onChange={(e: any) => {
                setFormData({ ...formData, name: e.target.value });
              }}
            />
          </div>
          <div className="flex flex-row w-3/4">
            <Input
              value={formData.description}
              placeholder="Description"
              onChange={(e: any) => {
                setFormData({ ...formData, description: e.target.value });
              }}
            />
          </div>
          <div className="flex flex-row w-3/4">
            <Select
              isClearable={true}
              placeholder="Catégorie produit"
              options={productCategories}
              noOptionsMessage={() => 'Aucune catégorie produit trouvée'}
              value={productCategories.find(
                (productCategory) =>
                  productCategory.value === formData.productCategory
              )}
              onChange={(e: any) => {
                setFormData({
                  ...formData,
                  productCategory: e?.value || '',
                });
              }}
            />
          </div>
          <div className="text-right mt-6 flex flex-row items-center justify-end gap-2">
            <Button
              className="ltr:mr-2 rtl:ml-2"
              variant="plain"
              onClick={handleClose}
            >
              {t('cancel')}
            </Button>
            <Button variant="solid" onClick={handleSubmit}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalEditSize;
