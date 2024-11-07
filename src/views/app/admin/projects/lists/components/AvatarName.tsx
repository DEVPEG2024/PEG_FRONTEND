import { IUser } from '@/@types/user';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import acronym from '@/utils/acronym';

const AvatarName = ({ user, type }: { user: IUser; type: string }) => {
  return (
    user && (
      <Tooltip title={user.companyName}>
        <div className="flex items-center gap-2">
          <Avatar className="rounded-full text-white text-lg font-bold">
            {acronym(user.firstName + ' ' + user.lastName)}
          </Avatar>
          <div className="flex-col hidden lg:flex">
            <span className="text-xs font-semibold">{type}</span>
            <span className="text-sm font-semibold text-gray-100">
              {user.firstName + ' ' + user.lastName}
            </span>
          </div>
        </div>
      </Tooltip>
    )
  );
};

export default AvatarName;
