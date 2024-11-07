import { Button, Dialog, Input, Notification, toast } from '@/components/ui';
import {
  POST_CATEGORY_CUSTOMERS_API_URL,
  PUT_CATEGORY_CUSTOMERS_API_URL,
} from '@/constants/api.constant';
import { ICategoryCustomer } from '@/services/CustomerServices';
import { RootState } from '@/store';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiCheckCircle } from 'react-icons/hi';
import { useSelector } from 'react-redux';

function ModalFormCategory({
  mode,
  title,
  isOpen,
  setIsOpen,
  category,
  handleCloseModal,
  fetchCategories,
}: {
  mode: string;
  title: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  fetchCategories: () => void;
  category: ICategoryCustomer | null;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const { token } = useSelector((state: RootState) => state.auth.session);
  const [newTitle, setNewTitle] = useState('');
  const onDialogClose = () => {
    handleCloseModal();
  };
  useEffect(() => {
    if (category) {
      setNewTitle(category?.label || '');
    }
  }, [category]);
  const onDialogOk = async () => {
    const url =
      mode === 'add'
        ? POST_CATEGORY_CUSTOMERS_API_URL
        : `${PUT_CATEGORY_CUSTOMERS_API_URL}/${category?._id}`;
    const data = { title: newTitle };

    const response = await axios({
      method: mode === 'add' ? 'post' : 'put',
      url,
      data,
      headers: { Authorization: `Bearer ${token}` },
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
        <Input
          placeholder={t('cat.categoryName')}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
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

export default ModalFormCategory;
