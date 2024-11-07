import { Button, Dialog, Input, Notification, toast } from '@/components/ui';
import {
  DELETE_CATEGORY_CUSTOMERS_API_URL,
  POST_CATEGORY_CUSTOMERS_API_URL,
} from '@/constants/api.constant';
import { ICategoryCustomer } from '@/services/CustomerServices';
import { RootState } from '@/store';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HiCheckCircle } from 'react-icons/hi';
import { useSelector } from 'react-redux';

function ModalDeleteCategory({
  title,
  isOpen,
  setIsOpen,
  category,
  handleCloseModal,
  fetchCategories,
}: {
  title: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  fetchCategories: () => void;
  category: ICategoryCustomer | null;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const { token } = useSelector((state: RootState) => state.auth.session);
  const onDialogClose = () => {
    setIsOpen(false);
  };

  const onDialogOk = async () => {
    const response = await axios.delete(
      DELETE_CATEGORY_CUSTOMERS_API_URL + '/' + category?._id,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 200) {
      toast.push(
        <Notification
          className="bg-green-500"
          title={t('cat.categoryAdded')}
          type="success"
          customIcon={<HiCheckCircle color="white" size={20} />}
        />
      );
      handleCloseModal();
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
