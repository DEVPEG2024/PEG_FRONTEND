import { Button, Dialog, Input, Select } from '@/components/ui';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  createBanner,
  setEditBannerDialog,
  setNewBannerDialog,
  updateBanner,
} from '../store/bannerSlice';
import { IBanner } from '@/@types/banner';
import FileUplaodCustom from '@/components/shared/Upload';
import {
  apiGetCategoriesCustomers,
  apiGetCustomers,
  ICategoryCustomer,
} from '@/services/CustomerServices';
import { IUser } from '@/@types/user';
type Option = {
  value: string;
  label: string;
};
function ModalEditBanner() {
  const user = useAppSelector((state: any) => state.auth.user);
  const { editBannerDialog, selectedBanner } = useAppSelector(
    (state) => state.banners.data
  );
  const [customers, setCustomers] = useState<Option[]>([]);
  const [customersCategories, setCustomersCategories] = useState<Option[]>([]);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    title: selectedBanner?.title || '',
    image: selectedBanner?.image || '',
    customer: selectedBanner?.customer || '',
    link: selectedBanner?.link || '',
    customerCategory: selectedBanner?.customerCategory || '',
    status: selectedBanner?.status || 'active',
    user: user._id,
  });

  useEffect(
    () =>
      setFormData({
        title: selectedBanner?.title || '',
        image: selectedBanner?.image || '',
        customer: selectedBanner?.customer || '',
        link: selectedBanner?.link || '',
        customerCategory: selectedBanner?.customerCategory || '',
        status: selectedBanner?.status || 'active',
        user: user._id,
      }),
    [selectedBanner]
  );

  const fetchCustomers = async () => {
    const response = await apiGetCustomers(1, 1000, '');
    const customersList = response.data.customers || [];
    const customers = customersList.map((customer: IUser) => ({
      value: customer._id || '',
      label: customer.firstName + ' ' + customer.lastName,
    }));
    setCustomers(customers);
  };

  const fetchCustomersCategories = async () => {
    const response = await apiGetCategoriesCustomers(1, 1000, '');
    const customersCategoriesList = response.data.categories || [];
    const customersCategories = customersCategoriesList.map(
      (customerCategory: ICategoryCustomer) => ({
        value: customerCategory._id || '',
        label: customerCategory.label || '',
      })
    );
    setCustomersCategories(customersCategories);
  };

  useEffect(() => {
    fetchCustomers();
    fetchCustomersCategories();
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(
      updateBanner({
        banner: formData as unknown as IBanner,
        bannerId: selectedBanner?._id || '',
      })
    );
    setFormData({
      title: '',
      image: '',
      customer: '',
      link: '',
      customerCategory: '',
      status: 'active',
      user: user._id,
    });
    handleClose();
  };
  const handleClose = () => {
    dispatch(setEditBannerDialog(false));
  };

  const onFileChange = (e: any) => {
    setFormData({ ...formData, image: e });
  };

  return (
    <div>
      <Dialog isOpen={editBannerDialog} onClose={handleClose} width={1200}>
        <div className="flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 ">
              <Input
                value={formData.title}
                placeholder="Titre"
                onChange={(e: any) => {
                  setFormData({ ...formData, title: e.target.value });
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
                  (customer) => customer.value === formData.customer._id
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
                options={customersCategories}
                noOptionsMessage={() => 'Aucune catégorie client trouvée'}
                value={customersCategories.find(
                  (customerCategory) =>
                    customerCategory.value === formData.customerCategory._id
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
              image={formData.image}
              setImage={onFileChange}
              setFileType={() => {}}
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
