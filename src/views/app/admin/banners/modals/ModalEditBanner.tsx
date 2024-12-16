import { Button, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setEditBannerDialog,
  setSelectedBanner,
  updateBanner,
} from '../store/bannerSlice';
import FileUplaodCustom from '@/components/shared/Upload';
import {
  apiGetCustomers,
  GetCustomersResponse,
} from '@/services/CustomerServices';
import { Customer, CustomerCategory } from '@/@types/customer';
import { apiGetCustomerCategories, GetCustomerCategoriesResponse } from '@/services/CustomerCategoryServices';
import { unwrapData } from '@/utils/serviceHelper';
import { BannerFormModel } from './ModalNewBanner';
import { Image } from '@/@types/product';
import { apiLoadImagesAndFiles } from '@/services/FileServices';

type Option = {
  value: string;
  label: string;
};

function ModalEditBanner() {
  const { editBannerDialog, selectedBanner } = useAppSelector(
    (state) => state.banners.data
  );
  const [customers, setCustomers] = useState<Option[]>([]);
  const [customerCategories, setCustomerCategories] = useState<Option[]>([]);
  const [image, setImage] = useState<Image | undefined>(undefined)
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<BannerFormModel>({
    documentId: selectedBanner?.documentId || '',
    name: selectedBanner?.name || '',
    customer: selectedBanner?.customer.documentId || '',
    customerCategory: selectedBanner?.customerCategory.documentId || '',
    active: selectedBanner?.active || true
  });

  useEffect(() => {
    fetchCustomers();
    fetchCustomerCategories();
  }, []);

  const fetchCustomers = async () => {
    const {customers_connection} : {customers_connection: GetCustomersResponse}= await unwrapData(apiGetCustomers());
    const customersList = customers_connection.nodes || [];
    const customers = customersList.map((customer: Customer) => ({
      value: customer.documentId || '',
      label: customer.name,
    }));
    setCustomers(customers);
  };

  const fetchCustomerCategories = async () => {
    const {customerCategories_connection} : {customerCategories_connection: GetCustomerCategoriesResponse}= await unwrapData(apiGetCustomerCategories());
    const customerCategoriesList = customerCategories_connection.nodes || [];
    const customerCategories = customerCategoriesList.map(
      (customerCategory: CustomerCategory) => ({
        value: customerCategory.documentId || '',
        label: customerCategory.name || '',
      })
    );
    setCustomerCategories(customerCategories);
  };

  useEffect(() => {
    fetchImage();
  }, [selectedBanner]);

  const fetchImage = async (): Promise<void> => {
    if (selectedBanner?.image){
      const imageLoaded: Image = (await apiLoadImagesAndFiles([selectedBanner.image]))[0]

      setImage(imageLoaded);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(
      updateBanner({...formData, image: image?.id ?? null})
    );
    setFormData({
      name: '',
      customer: '',
      customerCategory: '',
      active: true
    });
    handleClose();
  };
  
  const handleClose = () => {
    dispatch(setEditBannerDialog(false));
    dispatch(setSelectedBanner(null));
  };

  return (
    <div>
      <Dialog isOpen={editBannerDialog} onClose={handleClose} width={1200}>
        <div className="flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 ">
              <Input
                value={formData.name}
                placeholder="Titre"
                onChange={(e: any) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Client</p>
              <Select
                placeholder="Clients"
                options={customers}
                noOptionsMessage={() => 'Aucun client trouvé'}
                value={customers.find(
                  (customer) => customer.value === formData.customer
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, customer: e?.value || '' });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Catégorie client
              </p>
              <Select
                placeholder="Catégorie client"
                options={customerCategories}
                noOptionsMessage={() => 'Aucune catégorie client trouvée'}
                value={customerCategories.find(
                  (customerCategory) =>
                    customerCategory.value === formData.customerCategory
                )}
                onChange={(e: any) => {
                  setFormData({
                    ...formData,
                    customerCategory: e?.value || '',
                  });
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <FileUplaodCustom
              image={image}
              setImage={setImage}
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

export default ModalEditBanner;
