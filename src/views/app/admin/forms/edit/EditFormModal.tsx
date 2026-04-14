import { HiX } from 'react-icons/hi';
import {
  createForm,
  setForm,
  setNewFormDialog,
  updateForm,
  useAppDispatch,
  useAppSelector,
} from '../store';
import EditForm from './EditForm';

const fadeSlideKeyframes = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(32px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

function EditFormModal() {
  const { newFormDialog, form } = useAppSelector((state) => state.forms.data);
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(setNewFormDialog(false));
    dispatch(setForm(null));
  };

  const onValidate = (name: string, components: any) => {
    if (form?.documentId) {
      dispatch(updateForm({ documentId: form.documentId, name, fields: JSON.stringify(components) }));
    } else {
      dispatch(createForm({ name, fields: JSON.stringify(components) }));
    }
    handleClose();
  };

  if (!newFormDialog) return null;

  return (
    <>
      <style>{fadeSlideKeyframes}</style>
      <div
        onClick={handleClose}
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
          padding: '24px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '92vh',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            animation: 'slideUp 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column' as const,
          }}
        >
          {/* Header with close button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '16px 20px 0',
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleClose}
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

          {/* Content */}
          <div style={{ overflow: 'auto', flex: 1, padding: '0 20px 20px' }}>
            <EditForm
              onValidate={onValidate}
              onCancel={handleClose}
              fields={form?.fields ?? []}
              name={form?.name ?? ''}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default EditFormModal;
