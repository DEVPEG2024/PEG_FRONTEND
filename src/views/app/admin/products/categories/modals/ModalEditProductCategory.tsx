import FileUplaodCustom from '@/components/shared/Upload';
import { Input } from '@/components/ui';
import { HiX, HiChevronDown } from 'react-icons/hi';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PegFile } from '@/@types/pegFile';
import { useAppDispatch } from '@/store';
import {
  createProductCategory,
  updateProductCategory,
  useAppSelector,
} from '../store';
import { apiLoadPegFilesAndFiles } from '@/services/FileServices';
import { Loading } from '@/components/shared';
import { ProductCategory } from '@/@types/product';

function ModalEditProductCategory({
  mode,
  title,
  isOpen,
  handleCloseModal,
  parentCategory,
}: {
  mode: string;
  title: string;
  isOpen: boolean;
  handleCloseModal: () => void;
  parentCategory?: ProductCategory | null;
}) {
  const { t } = useTranslation();
  const { productCategory, productCategories } = useAppSelector(
    (state) => state.productCategories.data
  );
  const [name, setName] = useState<string>(productCategory?.name ?? '');
  const [image, setImage] = useState<PegFile | undefined>(undefined);
  const [imageModified, setImageModified] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [selectedParent, setSelectedParent] = useState<string | null>(
    parentCategory?.documentId ?? productCategory?.parent?.documentId ?? null
  );
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const dispatch = useAppDispatch();

  // Catégories racines disponibles comme parent (exclure la catégorie en cours d'édition)
  const rootCategories = productCategories.filter(
    (c) => !c.parent && c.documentId !== productCategory?.documentId
  );

  const selectedParentObj = rootCategories.find((c) => c.documentId === selectedParent);

  useEffect(() => {
    fetchImage();
  }, [productCategory]);

  const fetchImage = async (): Promise<void> => {
    if (!productCategory?.image) return;
    setImageLoading(true);
    try {
      const imageLoaded: PegFile = (
        await apiLoadPegFilesAndFiles([productCategory.image])
      )[0];
      setImage(imageLoaded);
    } catch (e) {
      console.error('Erreur chargement image catégorie:', e);
    } finally {
      setImageLoading(false);
    }
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
          parent: selectedParent || undefined,
        } as any)
      );
    } else {
      dispatch(
        updateProductCategory({
          productCategory: {
            documentId: productCategory!.documentId,
            name,
            image,
            parent: selectedParent || null,
          },
          imageModified,
        })
      );
    }
    handleCloseModal();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}>
      <div style={{
        width: '520px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
        background: 'linear-gradient(160deg, #1a2d47 0%, #0f1c2e 100%)',
        borderRadius: '20px', padding: '32px', position: 'relative',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={(e) => e.stopPropagation()}>

        <button onClick={handleCloseModal} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
        }}><HiX size={16} /></button>

        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 20px' }}>{title}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            placeholder={t('cat.categoryName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Sélecteur catégorie parente */}
          <div style={{ position: 'relative' }}>
            <label style={{
              display: 'block', color: 'rgba(255,255,255,0.45)', fontSize: '11px',
              fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px',
            }}>
              Catégorie parente (optionnel)
            </label>
            <button
              type="button"
              onClick={() => setParentDropdownOpen(!parentDropdownOpen)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '10px', padding: '10px 14px',
                color: selectedParentObj ? '#fff' : 'rgba(255,255,255,0.35)',
                fontSize: '13px', fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{selectedParentObj?.name ?? 'Aucune (catégorie racine)'}</span>
              <HiChevronDown size={14} style={{
                color: 'rgba(255,255,255,0.3)',
                transform: parentDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }} />
            </button>

            {parentDropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: '#1a2d47', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', overflow: 'hidden', zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)', maxHeight: '200px', overflowY: 'auto',
              }}>
                <button
                  onClick={() => { setSelectedParent(null); setParentDropdownOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
                    background: !selectedParent ? 'rgba(47,111,237,0.1)' : 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: !selectedParent ? '#6b9eff' : 'rgba(255,255,255,0.6)',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    fontWeight: !selectedParent ? 600 : 400,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = !selectedParent ? 'rgba(47,111,237,0.1)' : 'transparent')}
                >
                  Aucune (catégorie racine)
                </button>
                {rootCategories.map((cat) => (
                  <button
                    key={cat.documentId}
                    onClick={() => { setSelectedParent(cat.documentId); setParentDropdownOpen(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px',
                      background: selectedParent === cat.documentId ? 'rgba(47,111,237,0.1)' : 'transparent',
                      border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      color: selectedParent === cat.documentId ? '#6b9eff' : 'rgba(255,255,255,0.6)',
                      fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      fontWeight: selectedParent === cat.documentId ? 600 : 400,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = selectedParent === cat.documentId ? 'rgba(47,111,237,0.1)' : 'transparent')}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Loading loading={imageLoading}>
            <FileUplaodCustom image={image} setImage={updateImage} />
          </Loading>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button onClick={handleCloseModal} style={{
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

export default ModalEditProductCategory;
