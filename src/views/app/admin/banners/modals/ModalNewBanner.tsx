import { Button, Dialog, Input, Select, Switcher } from '@/components/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { createBanner, setNewBannerDialog } from '../store/bannerSlice';
import FileUplaodCustom from '@/components/shared/Upload';
import {
  apiGetCustomers,
  GetCustomersResponse,
} from '@/services/CustomerServices';
import { Customer, CustomerCategory } from '@/@types/customer';
import { unwrapData } from '@/utils/serviceHelper';
import {
  apiGetCustomerCategories,
  GetCustomerCategoriesResponse,
} from '@/services/CustomerCategoryServices';
import { PegFile } from '@/@types/pegFile';
import { Banner } from '@/@types/banner';

type Option = {
  value: string;
  label: string;
};

export type BannerFormModel = {
  documentId?: string;
  name: string;
  customer: string | null;
  customerCategory: string | null;
  active: boolean;
};

function ModalNewBanner() {
  const { newBannerDialog } = useAppSelector((state) => state.banners.data);
  const [image, setImage] = useState<PegFile | undefined>(undefined);
  const [customers, setCustomers] = useState<Option[]>([]);
  const [customerCategories, setCustomerCategories] = useState<Option[]>([]);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<BannerFormModel>({
    name: '',
    customer: '',
    customerCategory: '',
    active: true,
  });

  const fetchCustomers = async () => {
    const {
      customers_connection,
    }: { customers_connection: GetCustomersResponse } =
      await unwrapData(apiGetCustomers());
    const customersList = customers_connection.nodes || [];
    const customers = customersList.map((customer: Customer) => ({
      value: customer.documentId || '',
      label: customer.name,
    }));
    setCustomers(customers);
  };

  const fetchCustomerCategories = async () => {
    const {
      customerCategories_connection,
    }: { customerCategories_connection: GetCustomerCategoriesResponse } =
      await unwrapData(apiGetCustomerCategories());
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
    fetchCustomers();
    fetchCustomerCategories();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const bannerToCreate: Omit<Banner, 'documentId'> = {
      ...formData,
      customer: formData.customer !== '' ? formData.customer : null,
      customerCategory:
        formData.customerCategory !== '' ? formData.customerCategory : null,
      image,
    };
    dispatch(createBanner(bannerToCreate));
    setFormData({
      name: '',
      customer: '',
      customerCategory: '',
      active: true,
    });
    handleClose();
  };

  const handleClose = () => {
    dispatch(setNewBannerDialog(false));
  };

  return (
    <div>
      <Dialog isOpen={newBannerDialog} onClose={handleClose} width={1200}>
        <div className="flex flex-col justify-between">
          <div className="flex flex-row gap-2 justify-center">
            <div className="flex w-3/4">
              <Input
                value={formData.name}
                placeholder="Nom"
                onChange={(e: any) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
              />
            </div>
            <div className="flex justify-center items-center mt-4 w-1/4 gap-2">
              <span className="text-sm text-gray-200">Active</span>
              <Switcher
                checked={formData.active}
                onChange={(e: any) => {
                  setFormData({
                    ...formData,
                    active: !e,
                  });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Client</p>
              <Select
                isClearable={true}
                placeholder="Client"
                options={customers}
                noOptionsMessage={() => 'Aucun client trouvé'}
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
                isClearable={true}
                placeholder="Catégorie client"
                options={customerCategories}
                noOptionsMessage={() => 'Aucune catégorie client trouvée'}
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
            <FileUplaodCustom setImage={setImage} />
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

export default ModalNewBanner;
