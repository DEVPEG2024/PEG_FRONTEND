import { Button, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { createSize, setNewSizeDialog } from '../store/sizeSlice';
import { unwrapData } from '@/utils/serviceHelper';
import { ProductCategory, Size } from '@/@types/product';
import { apiGetProductCategories, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';

type Option = {
  value: string;
  label: string;
};

export type SizeFormModel = Omit<Size, 'documentId' | 'productCategory'> & {
  documentId?: string;
  productCategory: string | null;
}

function ModalNewSize() {
  const { newSizeDialog } = useAppSelector((state) => state.sizes.data);
  const [productCategories, setProductCategories] = useState<Option[]>([]);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<SizeFormModel>({
    name: '',
    value: '',
    description: '',
    productCategory: '',
  });

  const fetchProductCategories = async () => {
    const {productCategories_connection} : {productCategories_connection: GetProductCategoriesResponse}= await unwrapData(apiGetProductCategories());
    const productCategoriesList = productCategories_connection.nodes || [];
    const productCategories = productCategoriesList.map(
      (productCategory: ProductCategory) => ({
        value: productCategory.documentId || '',
        label: productCategory.name || '',
      })
    );
    setProductCategories(productCategories);
  };

  useEffect(() => {
    fetchProductCategories();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const sizeToCreate: Omit<Size, 'documentId'> = {
      ...formData,
      productCategory: formData.productCategory !== '' ? formData.productCategory : null,
    }
    dispatch(createSize(sizeToCreate));
    setFormData({
      name: '',
      value: '',
      productCategory: '',
      description: '',
    });
    handleClose();
  };
  
  const handleClose = () => {
    dispatch(setNewSizeDialog(false));
  };

  return (
    <div>
      <Dialog isOpen={newSizeDialog} onClose={handleClose} width={1200}>
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
              value={formData.value}
              placeholder="Valeur"
              onChange={(e: any) => {
                setFormData({ ...formData, value: e.target.value });
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

export default ModalNewSize;
