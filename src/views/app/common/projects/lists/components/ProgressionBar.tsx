type ProgressionBarProps = {
  progression: number;
};

const ProgressionBar = ({ progression }: ProgressionBarProps) => {
  const color =
    progression > 70
      ? { bar: 'linear-gradient(90deg, #22c55e, #16a34a)', glow: 'rgba(34,197,94,0.4)' }
      : progression < 40
      ? { bar: 'linear-gradient(90deg, #ef4444, #dc2626)', glow: 'rgba(239,68,68,0.4)' }
      : { bar: 'linear-gradient(90deg, #f59e0b, #d97706)', glow: 'rgba(245,158,11,0.4)' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{
        flex: 1,
        height: '4px',
        background: 'rgba(255,255,255,0.07)',
        borderRadius: '100px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${progression}%`,
          background: color.bar,
          borderRadius: '100px',
          transition: 'width 0.4s ease',
          boxShadow: `0 0 6px ${color.glow}`,
        }} />
      </div>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, flexShrink: 0, minWidth: '30px', textAlign: 'right' }}>
        {progression}%
      </span>
    </div>
  );
};

export default ProgressionBar;
