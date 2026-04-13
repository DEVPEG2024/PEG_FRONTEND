import { Input } from '@/components/ui';
import { HiX } from 'react-icons/hi';

import { useAppDispatch } from '@/store';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createProducerCategory,
  updateProducerCategory,
  useAppSelector,
} from '../store';

function ModalEditProducerCategory({
  mode,
  title,
  isOpen,
  handleCloseModal,
}: {
  mode: string;
  title: string;
  isOpen: boolean;
  handleCloseModal: () => void;
}) {
  const { t } = useTranslation();
  const { producerCategory } = useAppSelector(
    (state) => state.producerCategories.data
  );
  const [newName, setNewName] = useState(producerCategory?.name ?? '');
  const dispatch = useAppDispatch();

  const onDialogOk = async () => {
    if (mode === 'add') {
      dispatch(createProducerCategory({ name: newName, producers: [] }));
    } else {
      dispatch(
        updateProducerCategory({
          documentId: producerCategory!.documentId,
          name: newName,
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
        width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
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

        <div style={{ marginBottom: '20px' }}>
          <Input
            placeholder={t('cat.categoryName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={handleCloseModal} style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>{t('cancel')}</button>
          <button onClick={onDialogOk} style={{
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

export default ModalEditProducerCategory;
