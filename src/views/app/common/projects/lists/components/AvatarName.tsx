import { Customer } from '@/@types/customer';
import { Producer } from '@/@types/producer';
import { Tooltip } from '@/components/ui/Tooltip';
import acronym from '@/utils/acronym';

const AvatarName = ({
  entity,
  type,
}: {
  entity: (Customer | Producer) & { users?: { avatar?: { url?: string } }[] } | undefined;
  type: string;
}) => {
  const logoUrl = entity && 'logo' in entity ? entity.logo?.url : undefined;
  const userAvatarUrl = entity?.users?.[0]?.avatar?.url;
  const imageUrl = logoUrl || userAvatarUrl;

  return (
    entity && (
      <Tooltip title={entity.name}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
            background: type === 'Client' ? 'rgba(47,111,237,0.2)' : 'rgba(139,92,246,0.2)',
            border: `1px solid ${type === 'Client' ? 'rgba(47,111,237,0.35)' : 'rgba(139,92,246,0.35)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            color: type === 'Client' ? '#6b9eff' : '#a78bfa',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.02em',
          }}>
            {imageUrl ? (
              <img src={imageUrl} alt={entity.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              acronym(entity.name)
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{type}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}>{entity.name}</span>
          </div>
        </div>
      </Tooltip>
    )
  );
};

export default AvatarName;
