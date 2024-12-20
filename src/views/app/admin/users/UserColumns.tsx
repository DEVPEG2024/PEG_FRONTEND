import { useTranslation } from 'react-i18next';
import { Switcher, Button } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { User } from '@/@types/user';
import {
  HiPencil,
  HiTrash,
  HiUserCircle,
} from 'react-icons/hi';
import { getUserRoleText } from '@/constants/roles.constant';

export const useColumns = (
  handleEditUser: (user: User) => void,
  handleBlockUser: (user: User) => void,
  handleDeleteUser: (user: User) => void
) => {
  const { t } = useTranslation();

  return [
    {
      header: t('name'),
      accessorKey: 'firstName',
      enableSorting: false,
      cell: ({ row }: { row: {original: User} }) => (
        <div className="flex items-center gap-2">
          <HiUserCircle size={40} />
          <div className="flex flex-col">
            <span className="font-bold">
              {row.original.firstName} {row.original.lastName}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: t('email'),
      accessorKey: 'email',
      enableSorting: false,
      cell: ({ row }: { row: {original: User} }) => (
        <div className="flex items-center gap-2">{row.original.email}</div>
      ),
    },
    /*{
      header: t('phone'),
      accessorKey: 'phone',
      enableSorting: false,
      cell: ({ row }: { row: {original: User} }) => (
        <div className="flex items-center gap-2">{row.original.phone}</div>
      ),
    },*/
    {
      header: 'Rôle',
      accessorKey: 'authority',
      enableSorting: false,
      cell: ({ row }: { row: {original: User} }) => {
        return (
          <div className="flex items-center gap-2">
            {row.original.role.name}
          </div>
        );
      },
    },
    /*{
      header: t('wallet'),
      accessorKey: 'wallet',
      enableSorting: false,
      cell: ({ row }: { row: {original: User} }) => {
        return (
          <Tag prefix={<IoWalletOutline size={20} />} prefixClass="mr-2">
            <p className="text-sm ml-2">{row.original.wallet.toFixed(2)} €</p>
          </Tag>
        );
      },
    },*/
    {
      header: t('status'),
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: {original: User} }) => (
        <div className="flex items-center gap-2">
          <Switcher
            checked={!row.original.blocked}
            disabled={row.original.role.name === 'super_admin'}
            onChange={() => handleBlockUser(row.original)}
          />
          <Button
            onClick={() => handleEditUser(row.original)}
            disabled={row.original.role.name === 'super_admin'}
            size="sm"
            variant="twoTone"
          >
            <HiPencil size={20} />
          </Button>
          <Button
            onClick={() => handleDeleteUser(row.original)}
            disabled={row.original.role.name === 'super_admin'}
            size="sm"
            variant="twoTone"
          >
            <HiTrash size={20} />
          </Button>
        </div>
      ),
    },
  ];
};
