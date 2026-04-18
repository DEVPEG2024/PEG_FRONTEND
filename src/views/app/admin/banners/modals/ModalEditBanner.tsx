/**
 * COMPOSANT PROTEGE — NE PAS MODIFIER SANS DEMANDE EXPLICITE DE NOVA
 * Modal edition de banniere
 * Derniere validation : 2026-04-18
 * Reference : GLOSSARY.md + PROTECTED_COMPONENTS.md
 */
import { Input, Select, Switcher } from '@/components/ui';
import { HiX } from 'react-icons/hi';
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
import {
  apiGetCustomerCategories,
  GetCustomerCategoriesResponse,
} from '@/services/CustomerCategoryServices';
import { unwrapData } from '@/utils/serviceHelper';
import { BannerFormModel } from './ModalNewBanner';
import { PegFile } from '@/@types/pegFile';
import { apiLoadPegFilesAndFiles } from '@/services/FileServices';
import { Banner } from '@/@types/banner';
import { Loading } from '@/components/shared';

type Option = {
  value: string;
  label: string;
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

function ModalEditBanner() {
  const { editBannerDialog, selectedBanner } = useAppSelector(
    (state) => state.banners.data
  );
  const [customers, setCustomers] = useState<Option[]>([]);
  const [customerCategories, setCustomerCategories] = useState<Option[]>([]);
  const [imageModified, setImageModified] = useState<boolean>(false);
  const [image, setImage] = useState<PegFile | undefined>(undefined);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<BannerFormModel>({
    documentId: selectedBanner?.documentId || '',
    name: selectedBanner?.name || '',
    customer: selectedBanner?.customer?.documentId || '',
    customerCategory: selectedBanner?.customerCategory?.documentId || '',
    active: selectedBanner?.active ?? true,
  });

  useEffect(() => {
    fetchCustomers();
    fetchCustomerCategories();
  }, []);

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
    fetchImage();
  }, [selectedBanner]);

  const fetchImage = async (): Promise<void> => {
    setImageLoading(true);
    try {
      if (selectedBanner?.image) {
        const imageLoaded: PegFile = (
          await apiLoadPegFilesAndFiles([selectedBanner.image])
        )[0];

        setImage(imageLoaded);
      }
    } catch (error) {
      console.error('Erreur chargement image bannière:', error);
    } finally {
      setImageLoading(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const bannerToUpdate: Banner = {
      ...formData,
      customer: formData.customer !== '' ? formData.customer : null,
      customerCategory:
        formData.customerCategory !== '' ? formData.customerCategory : null,
      image,
    };
    dispatch(updateBanner({ banner: bannerToUpdate, imageModified }));
    setFormData({
      name: '',
      customer: '',
      customerCategory: '',
      active: true,
    });
    handleClose();
  };

  const handleClose = () => {
    dispatch(setEditBannerDialog(false));
    dispatch(setSelectedBanner(null));
  };

  const updateImage = (image: { file: File; name: string }) => {
    setImage(image);
    setImageModified(true);
  };

  if (!editBannerDialog) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '640px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        background: 'linear-gradient(160deg, #1a2d47 0%, #0f1c2e 100%)',
        borderRadius: '20px', padding: '32px', position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={(e) => e.stopPropagation()}>

        <button onClick={handleClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
        }}><HiX size={16} /></button>

        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px' }}>
          Modifier la banniere
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 3 }}>
              <span style={labelStyle}>Nom</span>
              <Input
                value={formData.name}
                placeholder="Nom"
                onChange={(e: any) => {
                  setFormData({ ...formData, name: e.target.value });
                }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '16px' }}>
              <span style={{ ...labelStyle, textAlign: 'center' }}>Active</span>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <span style={labelStyle}>Client</span>
              <Select
                isClearable={true}
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
            <div>
              <span style={labelStyle}>Categorie client</span>
              <Select
                isClearable={true}
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

          <Loading loading={imageLoading}>
            <div>
              <span style={labelStyle}>Image</span>
              <FileUplaodCustom image={image} setImage={updateImage} />
            </div>
          </Loading>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={handleClose} style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>{t('cancel')}</button>
          <button onClick={handleSubmit} style={{
            padding: '12px 28px', borderRadius: '12px', border: 'none', color: '#fff',
            fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            background: 'linear-gradient(90deg, #2f6fed, #1d4ed8)',
            boxShadow: '0 4px 20px rgba(47,111,237,0.4)',
          }}>{t('save')}</button>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
      </div>
    </div>
  );
}

export default ModalEditBanner;
