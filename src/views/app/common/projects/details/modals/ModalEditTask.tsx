import { useCallback, useState } from 'react';
import dayjs from 'dayjs';
import { HiCheck, HiX, HiPencil, HiFlag, HiCalendar } from 'react-icons/hi';
import {
  setEditDialogTask,
  updateTask,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { priorityData, statsDataTask } from '../../lists/constants';
import { TaskFormModel } from './ModalNewTask';

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '12px 14px',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
  textTransform: 'uppercase', marginBottom: '6px', display: 'block',
};

function ModalEditTask() {
  const { editDialogTask, selectedTask, loading } = useAppSelector(
    (state) => state.projectDetails.data
  );
  const [description, setDescription] = useState<string>(
    selectedTask?.description || ''
  );

  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<TaskFormModel>({
    documentId: selectedTask?.documentId || '',
    name: selectedTask?.name || '',
    description: selectedTask?.description || '',
    state: selectedTask?.state || 'pending',
    priority: selectedTask?.priority || 'low',
    startDate: selectedTask?.startDate || new Date(),
    endDate: selectedTask?.endDate || new Date(),
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(updateTask({ ...formData, description }));
  };

  const handleClose = () => {
    dispatch(setEditDialogTask(false));
  };

  const handleDescriptionChange = useCallback((val: string) => {
    setDescription(val);
  }, []);

  if (!editDialogTask) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div style={{
        width: '540px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
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

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HiPencil size={24} style={{ color: '#fbbf24' }} />
          </div>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>Modifier la tache</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Modifiez les details de cette tache</p>
        </div>

        {/* Name */}
        <div style={{ marginBottom: '14px' }}>
          <span style={labelStyle}>Titre de la tache *</span>
          <input type="text" placeholder="Titre de la tache" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '14px' }}>
          <span style={labelStyle}>Description</span>
          <textarea placeholder="Decrivez la tache..." value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Priority + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <span style={labelStyle}>Priorite</span>
            <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>
              {priorityData.map((p: any) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <span style={labelStyle}>Statut</span>
            <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} style={{ ...inputStyle, appearance: 'auto' }}>
              {statsDataTask.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div>
            <span style={labelStyle}>Date de debut</span>
            <input type="date" value={dayjs(formData.startDate).format('YYYY-MM-DD')}
              onChange={(e) => setFormData({ ...formData, startDate: dayjs(e.target.value).toDate() })}
              style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Date de fin</span>
            <input type="date" value={dayjs(formData.endDate).format('YYYY-MM-DD')}
              onChange={(e) => setFormData({ ...formData, endDate: dayjs(e.target.value).toDate() })}
              style={inputStyle} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={handleClose} style={{
            padding: '10px 20px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>Annuler</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: '12px 28px', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
            background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #22c55e, #16a34a)',
            display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(34,197,94,0.4)',
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Enregistrement...' : 'Enregistrer'} <HiCheck size={16} />
          </button>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `}</style>
      </div>
    </div>
  );
}

export default ModalEditTask;
