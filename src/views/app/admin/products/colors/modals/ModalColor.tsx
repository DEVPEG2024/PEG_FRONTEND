import { Alert, Input, Select } from '@/components/ui';
import { HiX } from 'react-icons/hi';
import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  createColor,
  setNewColorDialog,
  setEditColorDialog,
  setSelectedColor,
  updateColor,
} from '../store/colorSlice';
import { unwrapData } from '@/utils/serviceHelper';
import { ProductCategory, Color } from '@/@types/product';
import {
  apiGetProductCategories,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';

type Option = {
  value: string;
  label: string;
};

export type ColorFormModel = Omit<
  Color,
  'documentId' | 'productCategory' | 'value'
> & {
  documentId?: string;
  productCategory: string | null;
};

type ModalColorProps = {
  mode: 'create' | 'edit';
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

function ModalColor({ mode }: ModalColorProps) {
  const { newColorDialog, editColorDialog, selectedColor } = useAppSelector(
    (state) => state.colors.data
  );

  const isOpen = mode === 'create' ? newColorDialog : editColorDialog;

  const [productCategories, setProductCategories] = useState<Option[]>([]);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<ColorFormModel>({
    name: '',
    description: '',
    productCategory: '',
  });
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchProductCategories();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && selectedColor) {
      setFormData({
        documentId: selectedColor.documentId || '',
        name: selectedColor.name || '',
        description: selectedColor.description || '',
        productCategory: selectedColor.productCategory?.documentId || '',
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        productCategory: '',
      });
    }
  }, [mode, selectedColor]);

  const fetchProductCategories = async () => {
    const {
      productCategories_connection,
    }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories());
    const productCategoriesList = productCategories_connection.nodes || [];
    const categories = productCategoriesList.map(
      (productCategory: ProductCategory) => ({
        value: productCategory.documentId || '',
        label: productCategory.name || '',
      })
    );
    setProductCategories(categories);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (verifyFormData().length === 0) {
      if (mode === 'create') {
        handleCreateColor();
      } else {
        handleModifyColor();
      }
    }
  };

  const verifyFormData = () => {
    const tempErrors: string[] = [];
    if (formData.name === '') {
      tempErrors.push('Le nom est obligatoire');
    }
    if (formData.productCategory === '') {
      tempErrors.push('La catégorie produit est obligatoire');
    }
    setErrors(tempErrors);
    return tempErrors;
  };

  const handleCreateColor = () => {
    const colorToCreate: Omit<Color, 'documentId'> = {
      ...formData,
      value: formData.name,
      productCategory:
        formData.productCategory !== '' ? formData.productCategory : null,
    };
    dispatch(createColor(colorToCreate));
    resetForm();
    handleClose();
  };

  const handleModifyColor = () => {
    const colorToUpdate: Color = {
      ...formData,
      value: formData.name,
      productCategory:
        formData.productCategory !== '' ? formData.productCategory : null,
    };
    dispatch(updateColor(colorToUpdate));
    resetForm();
    handleClose();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      productCategory: '',
      description: '',
    });
    setErrors([]);
  };

  const handleClose = () => {
    if (mode === 'create') {
      dispatch(setNewColorDialog(false));
    } else {
      dispatch(setEditColorDialog(false));
      dispatch(setSelectedColor(null));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '560px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
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
          {mode === 'create' ? 'Nouvelle couleur' : 'Modifier la couleur'}
        </h3>

        {errors.map((error, index) => (
          <Alert key={index} showIcon type="danger" className="mb-4">
            {error}
          </Alert>
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <span style={labelStyle}>Nom *</span>
            <Input
              value={formData.name}
              placeholder="Nom"
              onChange={(e: any) => {
                setFormData({ ...formData, name: e.target.value });
              }}
            />
          </div>
          <div>
            <span style={labelStyle}>Description</span>
            <Input
              value={formData.description}
              placeholder="Description"
              onChange={(e: any) => {
                setFormData({ ...formData, description: e.target.value });
              }}
            />
          </div>
          <div>
            <span style={labelStyle}>Categorie produit *</span>
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

export default ModalColor;
