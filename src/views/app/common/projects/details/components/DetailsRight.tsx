import {
  HiClock,
  HiCalendar,
  HiUserCircle,
  HiLightningBolt,
} from 'react-icons/hi';
import dayjs from 'dayjs';
import { statusTextData } from '../../lists/constants';
import { LuCalendarCheck, LuCalendarClock } from 'react-icons/lu';
import { FaEuroSign } from 'react-icons/fa';
import {
  useAppSelector as useRootAppSelector,
  RootState,
  useAppDispatch,
} from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { updateCurrentProject, useAppSelector } from '../store';
import ProgressionBar from '../../lists/components/ProgressionBar';
import { MdPersonAdd } from 'react-icons/md';

const sep: React.CSSProperties = {
  height: '1px',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 75%, transparent)',
  margin: '18px 0',
};

const statusStyles: Record<string, { bg: string; border: string; color: string }> = {
  pending:   { bg: 'rgba(47,111,237,0.15)',  border: 'rgba(47,111,237,0.3)',  color: '#6b9eff' },
  fulfilled: { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   color: '#4ade80' },
  waiting:   { bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.3)',   color: '#fbbf24' },
  canceled:  { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171' },
};

const priorityStyles: Record<string, { bg: string; border: string; color: string }> = {
  low:    { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  color: '#4ade80' },
  medium: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)', color: '#fbbf24' },
  high:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
};

const priorityLabel: Record<string, string> = {
  low: 'Faible', medium: 'Moyenne', high: 'Haute',
};

const MetaRow = ({ icon, label, value }: { icon: React.ReactNode; label?: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
    <div style={{
      width: '30px', height: '30px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      color: 'rgba(255,255,255,0.4)',
    }}>
      {icon}
    </div>
    <div>
      {label && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>{label}</p>}
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>{value}</div>
    </div>
  </div>
);

const DetailsRight = () => {
  const dispatch = useAppDispatch();
  const { project, checklistPercent } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );

  const status = statusTextData[project.state as keyof typeof statusTextData];
  const statusStyle = statusStyles[project.state] ?? statusStyles.pending;
  const priorityStyle = priorityStyles[project.priority] ?? priorityStyles.medium;
  const duration = dayjs(project.endDate).diff(project.startDate, 'day');
  const durationText = duration > 0 ? `${duration} jours restants` : 'Délai dépassé';

  const tasks = project.tasks ?? [];
  const checklistItems = project.checklistItems ?? [];
  const taskPercent = tasks.length > 0
    ? Math.round((tasks.filter((t) => t.state === 'fulfilled').length / tasks.length) * 100)
    : 0;
  const progressPercent = checklistPercent !== null
    ? checklistPercent
    : checklistItems.length > 0
      ? Math.round((checklistItems.filter((i) => i.done).length / checklistItems.length) * 100)
      : taskPercent;
  const progressLabel = checklistPercent !== null || checklistItems.length > 0 ? 'Checklist' : 'Tâches';

  const assignMeAsProducer = () => {
    dispatch(
      updateCurrentProject({
        documentId: project.documentId,
        producer: user.producer!.documentId,
      })
    );
  };

  return (
    <div style={{
      background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
      borderRadius: '18px',
      padding: '24px',
      fontFamily: 'Inter, sans-serif',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
        Détails
      </p>

      {/* Progress */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {progressLabel}
          </span>
        </div>
        <ProgressionBar progression={progressPercent} />
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: statusStyle.bg, border: `1px solid ${statusStyle.border}`,
          borderRadius: '100px', padding: '5px 12px',
          color: statusStyle.color, fontSize: '12px', fontWeight: 600,
        }}>
          <HiClock size={12} />
          {status}
        </span>
      </div>

      {/* Priority badge */}
      <div style={{ marginBottom: '16px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: priorityStyle.bg, border: `1px solid ${priorityStyle.border}`,
          borderRadius: '100px', padding: '5px 12px',
          color: priorityStyle.color, fontSize: '12px', fontWeight: 600,
        }}>
          <HiLightningBolt size={12} />
          Priorité {priorityLabel[project.priority] ?? project.priority}
        </span>
      </div>

      <div style={sep} />

      <MetaRow icon={<HiCalendar size={14} />} label="Durée" value={durationText} />
      <MetaRow icon={<LuCalendarCheck size={14} />} label="Début" value={dayjs(project.startDate).format('DD/MM/YYYY')} />
      <MetaRow icon={<LuCalendarClock size={14} />} label="Fin" value={dayjs(project.endDate).format('DD/MM/YYYY')} />

      {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
        <MetaRow
          icon={<FaEuroSign size={13} />}
          label="Montant total"
          value={`${project.price?.toFixed(2) ?? '0.00'} €`}
        />
      )}

      <div style={sep} />

      {/* Client */}
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Client</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: 'rgba(47,111,237,0.2)', border: '1px solid rgba(47,111,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          color: '#6b9eff',
        }}>
          <HiUserCircle size={18} />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>
          {project.customer?.name ?? 'Non défini'}
        </span>
      </div>

      {hasRole(user, [SUPER_ADMIN, ADMIN, PRODUCER]) && (
        <>
          <div style={sep} />
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Producteur</p>
          {project.producer ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'rgba(47,111,237,0.2)', border: '1px solid rgba(47,111,237,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                color: '#6b9eff',
              }}>
                <HiUserCircle size={18} />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500 }}>
                {project.producer.name}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>À définir</span>
              {hasRole(user, [PRODUCER]) && (
                <button
                  onClick={assignMeAsProducer}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                    border: 'none', borderRadius: '8px', padding: '6px 12px',
                    color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(47,111,237,0.4)',
                  }}
                >
                  <MdPersonAdd size={14} />
                  M'assigner
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DetailsRight;
