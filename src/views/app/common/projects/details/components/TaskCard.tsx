import { HiLightningBolt, HiPencil, HiTrash, HiCheck } from 'react-icons/hi';
import { Task } from '@/@types/project';
import { User } from '@/@types/user';
import {
  RootState,
  useAppDispatch,
  useAppSelector as useRootAppSelector,
} from '@/store';
import { safeHtmlParse } from '@/utils/sanitizeHtml';
import { useState } from 'react';
import dayjs from 'dayjs';
import { FaAngleDown, FaAngleUp } from 'react-icons/fa';
import { hasRole } from '@/utils/permissions';
import { ADMIN, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import {
  updateTask,
  setEditDialogTask,
  setSelectedTask,
  deleteTask,
} from '../store';

const priorityStyles: Record<string, { bg: string; border: string; color: string }> = {
  low:    { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#4ade80' },
  medium: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#fbbf24' },
  high:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
};
const priorityLabel: Record<string, string> = { low: 'Faible', medium: 'Moyenne', high: 'Haute' };

const TaskCard = ({
  task,
  index,
  loading,
}: {
  task: Task;
  index: number;
  loading: boolean;
}) => {
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const dispatch = useAppDispatch();
  const [openTasks, setOpenTasks] = useState<{ [key: string]: boolean }>({});

  const handleChangeTaskState = async (documentId: string, state: string) => {
    dispatch(updateTask({ documentId, state }));
  };

  const handleEditTask = (task: Task) => {
    dispatch(setSelectedTask(task));
    dispatch(setEditDialogTask(true));
  };

  const handleRemoveTask = (task: Task) => {
    dispatch(deleteTask(task.documentId));
  };

  const toggleTask = (taskDocumentId: string) => {
    setOpenTasks((prev) => ({
      ...prev,
      [taskDocumentId]: !prev[taskDocumentId],
    }));
  };

  const pStyle = priorityStyles[task.priority] ?? priorityStyles.medium;
  const checked = task.state === 'fulfilled';
  const isOpen = openTasks[task.documentId];
  const canToggle = hasRole(user, [SUPER_ADMIN, PRODUCER]);

  return (
    <div style={{
      background: checked ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${checked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '12px',
      padding: '14px 16px',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.15s ease',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        {/* Left: toggle + name + date */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}
          onClick={() => toggleTask(task.documentId)}
        >
          <div style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
            {isOpen ? <FaAngleUp size={14} /> : <FaAngleDown size={14} />}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', flexShrink: 0 }}>#{index + 1}</span>
          <span style={{
            color: checked ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: checked ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {task.name}
          </span>
          {task.endDate && (
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', flexShrink: 0, marginLeft: '4px' }}>
              · avant le {dayjs(task.endDate).format('DD/MM/YYYY')}
            </span>
          )}
        </div>

        {/* Right: priority badge + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: pStyle.bg, border: `1px solid ${pStyle.border}`,
            borderRadius: '100px', padding: '3px 8px',
            color: pStyle.color, fontSize: '11px', fontWeight: 600,
          }}>
            <HiLightningBolt size={10} />
            {priorityLabel[task.priority] ?? task.priority}
          </span>

          {/* Custom checkbox */}
          <div
            onClick={() => {
              if (!loading && canToggle) {
                handleChangeTaskState(task.documentId, checked ? 'pending' : 'fulfilled');
              }
            }}
            style={{
              width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
              background: checked ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${checked ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canToggle && !loading ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {checked && <HiCheck size={12} style={{ color: '#4ade80' }} />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isOpen && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.7, marginBottom: '14px' }}>
            {safeHtmlParse(task.description || '')}
          </div>
          {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={loading || !canToggle}
                onClick={() => handleEditTask(task)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', padding: '6px 12px',
                  color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  opacity: (loading || !canToggle) ? 0.4 : 1,
                }}
              >
                <HiPencil size={13} /> Modifier
              </button>
              <button
                disabled={loading || !canToggle}
                onClick={() => handleRemoveTask(task)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                  borderRadius: '8px', padding: '6px 12px',
                  color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  opacity: (loading || !canToggle) ? 0.4 : 1,
                }}
              >
                <HiTrash size={13} /> Supprimer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
