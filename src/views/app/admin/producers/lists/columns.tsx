import { useTranslation } from 'react-i18next';
import { Notification, Switcher, toast, Button, Tag } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { IUser } from '@/@types/user';
import {
  HiCheckCircle,
  HiPencil,
  HiTrash,
  HiUser,
  HiUserCircle,
  HiXCircle,
} from 'react-icons/hi';
import {
  deleteCustomer,
  editStatusCustomer,
} from '@/utils/hooks/customers/useEditCustomer';
import { IoWalletOutline } from 'react-icons/io5';

export const useColumns = (
  fetchCustomers: () => void,
  handleEditCustomer: (customer: IUser) => void
) => {
  const { t } = useTranslation();
  const handleToggle = async (id: string) => {
    const resp = await editStatusCustomer(id);
    if (resp.status === 'success') {
      toast.push(
        <Notification
          className="bg-green-500"
          title={t('n.success')}
          type="success"
          customIcon={<HiCheckCircle color="white" size={20} />}
        />
      );
      fetchCustomers();
    } else {
      toast.push(
        <Notification
          className="bg-red-500"
          title={t('n.error')}
          type="success"
          customIcon={<HiXCircle color="white" size={20} />}
        />
      );
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const resp = await deleteCustomer(id);
    if (resp.status === 'success') {
      toast.push(
        <Notification
          className="bg-green-500"
          title={t('n.success')}
          type="success"
          customIcon={<HiCheckCircle color="white" size={20} />}
        />
      );
    } else {
      toast.push(
        <Notification
          className="bg-red-500"
          title={t('n.error')}
          type="success"
          customIcon={<HiXCircle color="white" size={20} />}
        />
      );
    }
    fetchCustomers();
  };
  return [
    {
      header: t('name'),
      accessorKey: 'firstName',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <HiUserCircle size={40} />
          {row.original.companyName ? (
            <div className="flex flex-col">
              <span className="font-bold">{row.original.companyName}</span>
              <span className="text-sm">
                {row.original.firstName} {row.original.lastName}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold">
                {row.original.firstName} {row.original.lastName}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: t('email'),
      accessorKey: 'email',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">{row.original.email}</div>
      ),
    },
    {
      header: t('phone'),
      accessorKey: 'phone',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">{row.original.phone}</div>
      ),
    },
    {
      header: t('category'),
      accessorKey: 'category',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            {row.original.category.title}
          </div>
        );
      },
    },
    {
      header: t('wallet'),
      accessorKey: 'wallet',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <Tag prefix={<IoWalletOutline size={20} />} prefixClass="mr-2">
            <p className="text-sm ml-2">{row.original.wallet.toFixed(2)} €</p>
          </Tag>
        );
      },
    },
    {
      header: t('status'),
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex justify-end items-center gap-2">
          <Switcher
            checked={row.original.status}
            onChange={() => handleToggle(row.original._id)}
          />
          <Button
            onClick={() => handleEditCustomer(row.original)}
            size="sm"
            variant="twoTone"
          >
            <HiPencil size={20} />
          </Button>
          <Button
            onClick={() => handleDeleteCustomer(row.original._id)}
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
