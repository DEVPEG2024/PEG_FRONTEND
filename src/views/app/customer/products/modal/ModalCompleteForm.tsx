import { lazy, Suspense } from 'react';
import { HiX } from 'react-icons/hi';
import {
  useAppDispatch,
  useAppSelector,
  setFormDialog,
  setFormAnswer,
  setFormCompleted,
} from '../show/store';
import { Form } from '@/@types/form';

const ShowForm = lazy(() => import('./ShowForm'));
import {
  CartItemFormAnswerEdition,
  editFormAnswerCartItem,
} from '@/store/slices/base/cartSlice';
import { FormAnswer } from '@/@types/formAnswer';
import { toast } from 'react-toastify';

function ModalCompleteForm({
  form,
  onEdition,
}: {
  form: Form;
  onEdition: boolean;
}) {
  const dispatch = useAppDispatch();
  const { formDialog, formAnswer, cartItemId } = useAppSelector(
    (state) => state.showProduct.data
  );

  const handleClose = () => {
    dispatch(setFormDialog(false));
  };

  const onSubmit = async (submission: any) => {
    const formAnswer: Partial<FormAnswer> = { form, answer: submission };
    if (onEdition) {
      handleEditFormAnswerCartItem(formAnswer);
    }
    dispatch(setFormAnswer(formAnswer));
    dispatch(setFormCompleted(true));
    handleClose();
  };

  const handleEditFormAnswerCartItem = (
    formAnswer: Partial<FormAnswer>
  ): void => {
    dispatch(
      editFormAnswerCartItem({
        cartItemId,
        formAnswer,
      } as CartItemFormAnswerEdition)
    );
    toast.success('Formulaire modifie');
  };

  if (!formDialog) return null;

  return (
    <>
      <style>{`
        @keyframes premiumFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes premiumSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'premiumFadeIn 0.25s ease-out',
        }}
        onClick={handleClose}
      >
        <div
          style={{
            position: 'relative',
            width: '90vw',
            maxWidth: 800,
            maxHeight: '90vh',
            background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
            borderRadius: 20,
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'premiumSlideUp 0.35s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            <HiX size={18} />
          </button>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#fff' }}>
              Details du produit
            </p>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'auto', padding: 24 }} className="dialog-formbuilder-body">
            <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>Chargement...</div>}>
              <ShowForm
                onSubmit={onSubmit}
                fields={form.fields}
                formAnswer={formAnswer}
                readOnly={false}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

export default ModalCompleteForm;
