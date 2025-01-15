import { Customer } from '@/@types/customer';
import { Producer } from '@/@types/producer';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import acronym from '@/utils/acronym';

const AvatarName = ({
  entity,
  type,
}: {
  entity: Customer | Producer | undefined;
  type: string;
}) => {
  return (
    entity && (
      <Tooltip title={entity.name}>
        <div className="flex items-center gap-2">
          <Avatar className="rounded-full text-white text-lg font-bold">
            {acronym(entity.name)}
          </Avatar>
          <div className="flex-col hidden lg:flex">
            <span className="text-xs font-semibold">{type}</span>
            <span className="text-sm font-semibold text-gray-100">
              {entity.name}
            </span>
          </div>
        </div>
      </Tooltip>
    )
  );
};

export default AvatarName;
