import {
  HiClock,
  HiCalendar,
  HiUserCircle,
  HiLightningBolt,
  HiSwitchHorizontal,
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
import { ADMIN, CUSTOMER, PRODUCER, SUPER_ADMIN } from '@/constants/roles.constant';
import { updateCurrentProject, useAppSelector } from '../store';
import ProgressionBar from '../../lists/components/ProgressionBar';
import { MdPersonAdd } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';
import { unwrapData } from '@/utils/serviceHelper';
import { apiGetProducers, GetProducersResponse } from '@/services/ProducerServices';
import { Producer } from '@/@types/producer';
import { toast } from 'react-toastify';

/* ── Shared styles ── */

const miniCard: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(22,38,61,0.8) 0%, rgba(15,28,46,0.9) 100%)',
  borderRadius: '14px',
  padding: '16px 18px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const sectionLabel: React.CSSProperties = {
  color: 'rgba(255,255,255,0.4)',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: '12px',
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

/* ── Sub-components ── */

const MetaRow = ({ icon, label, value }: { icon: React.ReactNode; label?: string; value: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{
      width: '28px', height: '28px', borderRadius: '7px',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      color: 'rgba(255,255,255,0.45)',
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      {label && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>{label}</p>}
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12.5px', fontWeight: 500 }}>{value}</div>
    </div>
  </div>
);

const FinanceRow = ({ label, value, color = 'rgba(255,255,255,0.8)', bold = false, onClick }: {
  label: string; value: string; color?: string; bold?: boolean; onClick?: () => void;
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11.5px', fontWeight: bold ? 600 : 400 }}>{label}</span>
    <span
      onClick={onClick}
      style={{
        color,
        fontSize: '12.5px',
        fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: onClick ? '1px dashed rgba(255,255,255,0.15)' : 'none',
      }}
      title={onClick ? 'Cliquer pour modifier' : undefined}
    >
      {value}
    </span>
  </div>
);

/* ── Main component ── */

const DetailsRight = () => {
  const dispatch = useAppDispatch();
  const { project, checklistPercent } = useAppSelector((state) => state.projectDetails.data);
  const { user }: { user: User } = useRootAppSelector(
    (state: RootState) => state.auth.user
  );
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const isCustomer = hasRole(user, [CUSTOMER]);

  // Inline edit paidPrice / producerPaidPrice
  const [editingField, setEditingField] = useState<'paidPrice' | 'producerPaidPrice' | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editFieldRef = useRef<HTMLInputElement>(null);

  const startEditField = (field: 'paidPrice' | 'producerPaidPrice') => {
    setEditingField(field);
    setEditingValue(String(project[field] ?? 0));
  };

  const confirmEditField = () => {
    if (!editingField) return;
    const val = parseFloat(editingValue);
    if (isNaN(val) || val < 0) { cancelEditField(); return; }
    dispatch(updateCurrentProject({ documentId: project.documentId, [editingField]: val }));
    toast.success(editingField === 'paidPrice' ? 'Montant payé par client mis à jour' : 'Montant payé au producteur mis à jour');
    setEditingField(null);
    setEditingValue('');
  };

  const cancelEditField = () => {
    setEditingField(null);
    setEditingValue('');
  };

  useEffect(() => {
    if (editingField && editFieldRef.current) editFieldRef.current.focus();
  }, [editingField]);

  // Quick producer change
  const [producerDropdownOpen, setProducerDropdownOpen] = useState(false);
  const [producers, setProducers] = useState<Producer[]>([]);
  const producerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (producerDropdownRef.current && !producerDropdownRef.current.contains(e.target as Node)) {
        setProducerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openProducerDropdown = async () => {
    if (producers.length === 0) {
      const { producers_connection }: { producers_connection: GetProducersResponse } =
        await unwrapData(apiGetProducers());
      setProducers(producers_connection.nodes || []);
    }
    setProducerDropdownOpen((v) => !v);
  };

  const changeProducer = (producer: Producer) => {
    dispatch(updateCurrentProject({ documentId: project.documentId, producer: producer.documentId }));
    toast.success(`Producteur changé : ${producer.name}`);
    setProducerDropdownOpen(false);
  };

  const assignMeAsProducer = () => {
    dispatch(
      updateCurrentProject({
        documentId: project.documentId,
        producer: user.producer?.documentId ?? '',
      })
    );
  };

  const status = statusTextData[project.state as keyof typeof statusTextData];
  const statusStyle = statusStyles[project.state] ?? statusStyles.pending;
  const priorityStyle = priorityStyles[project.priority] ?? priorityStyles.medium;
  const daysRemaining = dayjs(project.endDate).diff(dayjs(), 'day');
  const durationText = daysRemaining > 0 ? `${daysRemaining} jours restants` : daysRemaining === 0 ? "Aujourd'hui" : 'Délai dépassé';

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

  // Timeline visuelle
  const totalDays = dayjs(project.endDate).diff(dayjs(project.startDate), 'day');
  const elapsedDays = dayjs().diff(dayjs(project.startDate), 'day');
  const timelinePercent = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : 100;
  const isOverdue = daysRemaining < 0;

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderEditableAmount = (field: 'paidPrice' | 'producerPaidPrice', color: string) => {
    if (editingField === field) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <input
            ref={editFieldRef}
            type="number"
            step="0.01"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirmEditField(); if (e.key === 'Escape') cancelEditField(); }}
            onBlur={confirmEditField}
            style={{
              width: '72px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${color}40`,
              borderRadius: '5px', color, fontSize: '12.5px', fontWeight: 700,
              padding: '2px 6px', outline: 'none', textAlign: 'right', fontFamily: 'inherit',
            }}
          />
          <span style={{ color, fontSize: '12.5px', fontWeight: 700 }}>€</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── Card 1: Progress & Timeline ── */}
      <div style={miniCard}>
        <p style={sectionLabel}>Avancement</p>

        {/* Progress bar */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>
              {progressLabel}
            </span>
            <span style={{ color: '#6b9eff', fontSize: '11px', fontWeight: 700 }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.max(progressPercent, 2)}%`,
              background: 'linear-gradient(90deg, #2f6fed, #6b9eff)',
              borderRadius: '100px',
              transition: 'width 0.4s ease',
              minWidth: progressPercent === 0 ? '0px' : undefined,
            }} />
          </div>
        </div>

        {/* Timeline bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 500 }}>
              Temps écoulé
            </span>
            <span style={{ color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700 }}>
              {timelinePercent}%
            </span>
          </div>
          <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${timelinePercent}%`,
              background: isOverdue
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : timelinePercent > 80
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #6b9eff, #2f6fed)',
              borderRadius: '100px',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>{dayjs(project.startDate).format('DD/MM')}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>{dayjs(project.endDate).format('DD/MM')}</span>
          </div>
        </div>
      </div>

      {/* ── Card 2: Status, Priority & Dates ── */}
      <div style={miniCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: statusStyle.bg, border: `1px solid ${statusStyle.border}`,
            borderRadius: '100px', padding: '4px 11px',
            color: statusStyle.color, fontSize: '11px', fontWeight: 600,
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusStyle.color }} />
            {status}
          </span>
          {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: priorityStyle.bg, border: `1px solid ${priorityStyle.border}`,
              borderRadius: '100px', padding: '4px 11px',
              color: priorityStyle.color, fontSize: '11px', fontWeight: 600,
            }}>
              <HiLightningBolt size={10} />
              {priorityLabel[project.priority] ?? project.priority}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <MetaRow icon={<HiCalendar size={13} />} label="Durée" value={
            <span style={{ color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.8)' }}>{durationText}</span>
          } />
          <MetaRow icon={<LuCalendarCheck size={13} />} label="Début" value={dayjs(project.startDate).format('DD/MM/YYYY')} />
          <MetaRow icon={<LuCalendarClock size={13} />} label="Fin" value={dayjs(project.endDate).format('DD/MM/YYYY')} />
        </div>
      </div>

      {/* ── Card 3: Finances (admin) ── */}
      {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
        <div style={miniCard}>
          <p style={sectionLabel}>Finances</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <FinanceRow label="Prix total" value={`${fmt(project.price ?? 0)} €`} color="#6b9eff" />
            {renderEditableAmount('paidPrice', '#4ade80') || (
              <FinanceRow
                label="Payé par client"
                value={`${fmt(project.paidPrice ?? 0)} €`}
                color="#4ade80"
                onClick={isAdmin ? () => startEditField('paidPrice') : undefined}
              />
            )}
            <FinanceRow
              label="Reste dû client"
              value={`${fmt((project.price ?? 0) - (project.paidPrice ?? 0))} €`}
              color={(project.price ?? 0) - (project.paidPrice ?? 0) > 0 ? '#fbbf24' : '#4ade80'}
            />

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />

            <FinanceRow label="Commission prod." value={`${fmt(project.producerPrice ?? 0)} €`} color="#a78bfa" />
            {renderEditableAmount('producerPaidPrice', '#4ade80') || (
              <FinanceRow
                label="Payé au prod."
                value={`${fmt(project.producerPaidPrice ?? 0)} €`}
                color="#4ade80"
                onClick={isAdmin ? () => startEditField('producerPaidPrice') : undefined}
              />
            )}
            <FinanceRow
              label="Reste dû prod."
              value={`${fmt((project.producerPrice ?? 0) - (project.producerPaidPrice ?? 0))} €`}
              color={(project.producerPrice ?? 0) - (project.producerPaidPrice ?? 0) > 0 ? '#fbbf24' : '#4ade80'}
            />

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />

            <FinanceRow
              label="Marge"
              value={`${fmt((project.price ?? 0) - (project.producerPrice ?? 0))} €`}
              color={(project.price ?? 0) - (project.producerPrice ?? 0) >= 0 ? '#4ade80' : '#f87171'}
              bold
            />
          </div>
        </div>
      )}

      {/* ── Card 4: People ── */}
      <div style={miniCard}>
        <p style={sectionLabel}>Équipe</p>

        {/* Client */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: '#6b9eff',
          }}>
            <HiUserCircle size={16} />
          </div>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>Client</p>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12.5px', fontWeight: 500 }}>
              {project.customer?.name ?? 'Non défini'}
            </span>
          </div>
        </div>

        {/* Producteur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={producerDropdownRef}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: isCustomer ? 'linear-gradient(135deg, #2f6fed, #1f4bb6)' : 'rgba(139,92,246,0.15)',
            border: isCustomer ? 'none' : '1px solid rgba(139,92,246,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: isCustomer ? '#fff' : '#a78bfa',
          }}>
            {isCustomer ? (
              <span style={{ fontSize: '10px', fontWeight: 800 }}>P</span>
            ) : (
              <HiUserCircle size={16} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>
              {isCustomer ? 'Réalisé par' : 'Producteur'}
            </p>
            {isCustomer ? (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12.5px', fontWeight: 600 }}>PEG</span>
            ) : project.producer ? (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12.5px', fontWeight: 500 }}>
                {project.producer.name}
              </span>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12.5px' }}>À définir</span>
            )}
          </div>

          {/* Quick actions for producer section */}
          {!isCustomer && (
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {hasRole(user, [PRODUCER]) && !project.producer && (
                <button
                  onClick={assignMeAsProducer}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                    border: 'none', borderRadius: '7px', padding: '5px 10px',
                    color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <MdPersonAdd size={12} />
                  M'assigner
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={openProducerDropdown}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '26px', height: '26px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.45)', cursor: 'pointer', flexShrink: 0,
                  }}
                  title={project.producer ? 'Changer de producteur' : 'Assigner un producteur'}
                >
                  {project.producer ? <HiSwitchHorizontal size={12} /> : <MdPersonAdd size={12} />}
                </button>
              )}
            </div>
          )}

          {/* Dropdown */}
          {producerDropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: '#1a2d47', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 100, minWidth: '170px', maxHeight: '200px', overflowY: 'auto',
            }}>
              {producers.filter((p) => p.documentId !== project.producer?.documentId).map((p) => (
                <button
                  key={p.documentId}
                  onClick={() => changeProducer(p)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 14px',
                    background: 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.7)', fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {p.name}
                </button>
              ))}
              {producers.filter((p) => p.documentId !== project.producer?.documentId).length === 0 && (
                <p style={{ padding: '9px 14px', color: 'rgba(255,255,255,0.45)', fontSize: '11px', margin: 0 }}>
                  Aucun autre producteur
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DetailsRight;
