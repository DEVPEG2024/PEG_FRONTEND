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
      color: 'rgba(255,255,255,0.6)',
    }}>
      {icon}
    </div>
    <div>
      {label && <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1px' }}>{label}</p>}
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

  // Timeline visuelle (#11)
  const totalDays = dayjs(project.endDate).diff(dayjs(project.startDate), 'day');
  const elapsedDays = dayjs().diff(dayjs(project.startDate), 'day');
  const timelinePercent = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100))) : 100;
  const isOverdue = daysRemaining < 0;

  const assignMeAsProducer = () => {
    dispatch(
      updateCurrentProject({
        documentId: project.documentId,
        producer: user.producer?.documentId ?? '',
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
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
        Détails
      </p>

      {/* Progress */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {progressLabel}
          </span>
        </div>
        <ProgressionBar progression={progressPercent} />
      </div>

      {/* Timeline visuelle — barre temporelle (#11) */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Temps écoulé
          </span>
          <span style={{ color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 600 }}>
            {timelinePercent}%
          </span>
        </div>
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', overflow: 'hidden' }}>
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
            boxShadow: isOverdue ? '0 0 6px rgba(239,68,68,0.4)' : '0 0 6px rgba(47,111,237,0.3)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{dayjs(project.startDate).format('DD/MM')}</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{dayjs(project.endDate).format('DD/MM')}</span>
        </div>
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

      {/* Priority badge — admin only */}
      {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
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
      )}

      <div style={sep} />

      <MetaRow icon={<HiCalendar size={14} />} label="Durée" value={durationText} />
      <MetaRow icon={<LuCalendarCheck size={14} />} label="Début" value={dayjs(project.startDate).format('DD/MM/YYYY')} />
      <MetaRow icon={<LuCalendarClock size={14} />} label="Fin" value={dayjs(project.endDate).format('DD/MM/YYYY')} />

      {/* Résumé financier (#10) — admin only */}
      {hasRole(user, [SUPER_ADMIN, ADMIN]) && (
        <>
          <div style={sep} />
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Finances
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Prix total</span>
              <span style={{ color: '#6b9eff', fontSize: '13px', fontWeight: 700 }}>
                {project.price?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'} €
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Payé par client</span>
              {editingField === 'paidPrice' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    ref={editFieldRef}
                    type="number"
                    step="0.01"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmEditField(); if (e.key === 'Escape') cancelEditField(); }}
                    onBlur={confirmEditField}
                    style={{
                      width: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.4)',
                      borderRadius: '6px', color: '#4ade80', fontSize: '13px', fontWeight: 700,
                      padding: '2px 6px', outline: 'none', textAlign: 'right', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>€</span>
                </div>
              ) : (
                <span
                  onClick={() => isAdmin && startEditField('paidPrice')}
                  style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700, cursor: isAdmin ? 'pointer' : 'default' }}
                  title={isAdmin ? 'Cliquer pour modifier' : undefined}
                >
                  {project.paidPrice?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'} €
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Reste dû client</span>
              <span style={{
                color: (project.price ?? 0) - (project.paidPrice ?? 0) > 0 ? '#fbbf24' : '#4ade80',
                fontSize: '13px', fontWeight: 700,
              }}>
                {((project.price ?? 0) - (project.paidPrice ?? 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Commission producteur</span>
              <span style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 700 }}>
                {project.producerPrice?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'} €
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Payé au producteur</span>
              {editingField === 'producerPaidPrice' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    ref={editFieldRef}
                    type="number"
                    step="0.01"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmEditField(); if (e.key === 'Escape') cancelEditField(); }}
                    onBlur={confirmEditField}
                    style={{
                      width: '80px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(34,197,94,0.4)',
                      borderRadius: '6px', color: '#4ade80', fontSize: '13px', fontWeight: 700,
                      padding: '2px 6px', outline: 'none', textAlign: 'right', fontFamily: 'inherit',
                    }}
                  />
                  <span style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700 }}>€</span>
                </div>
              ) : (
                <span
                  onClick={() => isAdmin && startEditField('producerPaidPrice')}
                  style={{ color: '#4ade80', fontSize: '13px', fontWeight: 700, cursor: isAdmin ? 'pointer' : 'default' }}
                  title={isAdmin ? 'Cliquer pour modifier' : undefined}
                >
                  {project.producerPaidPrice?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00'} €
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Reste dû producteur</span>
              <span style={{
                color: (project.producerPrice ?? 0) - (project.producerPaidPrice ?? 0) > 0 ? '#fbbf24' : '#4ade80',
                fontSize: '13px', fontWeight: 700,
              }}>
                {((project.producerPrice ?? 0) - (project.producerPaidPrice ?? 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            {/* Marge */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>Marge</span>
              <span style={{
                color: (project.price ?? 0) - (project.producerPrice ?? 0) >= 0 ? '#4ade80' : '#f87171',
                fontSize: '13px', fontWeight: 700,
              }}>
                {((project.price ?? 0) - (project.producerPrice ?? 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </>
      )}

      <div style={sep} />

      {/* Client */}
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Client</p>
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

      {/* Producteur section */}
      <div style={sep} />
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
        {isCustomer ? 'Réalisé par' : 'Producteur'}
      </p>

      {isCustomer ? (
        /* Client: show "PEG" */
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #2f6fed, #1f4bb6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.02em' }}>P</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600 }}>
            PEG
          </span>
        </div>
      ) : project.producer ? (
        /* Admin/Producer: show real name + quick change for admin */
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={producerDropdownRef}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            color: '#a78bfa',
          }}>
            <HiUserCircle size={18} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500, flex: 1 }}>
            {project.producer.name}
          </span>
          {isAdmin && (
            <button
              onClick={openProducerDropdown}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '28px', height: '28px', borderRadius: '7px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer', flexShrink: 0,
              }}
              title="Changer de producteur"
            >
              <HiSwitchHorizontal size={13} />
            </button>
          )}
          {/* Dropdown */}
          {producerDropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: '#1a2d47', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              zIndex: 100, minWidth: '180px', maxHeight: '200px', overflowY: 'auto',
            }}>
              {producers.filter((p) => p.documentId !== project.producer?.documentId).map((p) => (
                <button
                  key={p.documentId}
                  onClick={() => changeProducer(p)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.75)', fontSize: '13px',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {p.name}
                </button>
              ))}
              {producers.filter((p) => p.documentId !== project.producer?.documentId).length === 0 && (
                <p style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.55)', fontSize: '12px', margin: 0 }}>
                  Aucun autre producteur
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* No producer assigned */
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={!project.producer ? producerDropdownRef : undefined}>
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
          {isAdmin && (
            <>
              <button
                onClick={openProducerDropdown}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '8px', padding: '6px 12px',
                  color: '#a78bfa', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <MdPersonAdd size={14} />
                Assigner
              </button>
              {producerDropdownOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  background: '#1a2d47', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 100, minWidth: '180px', maxHeight: '200px', overflowY: 'auto',
                }}>
                  {producers.map((p) => (
                    <button
                      key={p.documentId}
                      onClick={() => changeProducer(p)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.75)', fontSize: '13px',
                        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DetailsRight;
