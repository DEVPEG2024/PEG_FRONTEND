import { useAppDispatch } from '@/store';
import { useTranslation } from 'react-i18next';
import { deleteProductCategory, useAppSelector } from '../store';
import { HiX, HiExclamation } from 'react-icons/hi';

const fadeSlideKeyframes = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(32px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

function ModalDeleteProductCategory({
  title,
  isOpen,
  handleCloseModal,
}: {
  title: string;
  isOpen: boolean;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const { productCategory } = useAppSelector(
    (state) => state.productCategories.data
  );
  const dispatch = useAppDispatch();

  const onDialogOk = async () => {
    dispatch(deleteProductCategory(productCategory!.documentId));
    handleCloseModal();
  };

  if (!isOpen) return null;

  return (
    <>
      <style>{fadeSlideKeyframes}</style>
      <div
        onClick={handleCloseModal}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
            borderRadius: '20px',
            padding: '36px 32px 28px',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: 'slideUp 0.3s ease-out',
            textAlign: 'center',
          }}
        >
          {/* Close button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-12px', marginRight: '-8px' }}>
            <button
              onClick={handleCloseModal}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '10px',
                padding: '6px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                display: 'flex',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              <HiX size={18} />
            </button>
          </div>

          {/* Warning icon */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <HiExclamation size={28} style={{ color: '#f87171' }} />
          </div>

          {/* Heading */}
          <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
            {title}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.6 }}>
            {t('cat.deleteCategoryConfirmation')}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleCloseModal}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 24px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
              }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={onDialogOk}
              style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 24px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,38,38,0.6)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(220,38,38,0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {t('delete')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ModalDeleteProductCategory;
