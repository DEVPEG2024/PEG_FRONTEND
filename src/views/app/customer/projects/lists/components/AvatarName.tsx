import { Customer } from '@/@types/customer';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import acronym from '@/utils/acronym';

const AvatarName = ({ customer }: { customer: Customer }) => {
  return (
    <Tooltip title={customer.name}>
      <div className="flex items-center gap-2">
        <Avatar className="rounded-full text-white text-lg font-bold">
          {acronym(customer.name)}
        </Avatar>
        <div className="flex-col hidden lg:flex">
          <span className="text-xs font-semibold">{customer.name}</span>
        </div>
      </div>
    </Tooltip>
  );
};

export default AvatarName;
