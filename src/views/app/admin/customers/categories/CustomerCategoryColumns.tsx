import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiFolderOpen, HiPencil, HiTrash } from 'react-icons/hi';
import { CustomerCategory } from '@/@types/customer';

export const useColumns = (
  handleDeleteCategory: (customerCateory: CustomerCategory) => void,
  handleEditCategory: (customerCateory: CustomerCategory) => void
) => {
  const { t } = useTranslation();

  return [
    {
      header: t('title'),
      accessorKey: 'name',
      enableSorting: false,
      cell: ({ row }: { row: { original: CustomerCategory } }) => (
        <div className="flex items-center gap-2">
          <HiFolderOpen size={20} />
          {row.original.name}
        </div>
      ),
    },

    {
      header: t('cust.total_customers'),
      accessorKey: 'customers',
      enableSorting: false,
      cell: ({ row }: { row: { original: CustomerCategory } }) => (
        <div className="flex items-center gap-2">
          {row.original.customers.length}
        </div>
      ),
    },

    {
      header: '',
      accessorKey: 'actions',
      enableSorting: false,
      cell: ({ row }: { row: { original: CustomerCategory } }) => (
        <div className="flex justify-end items-center gap-2">
          <Button onClick={() => handleEditCategory(row.original)}>
            <HiPencil size={20} />
          </Button>
          <Button onClick={() => handleDeleteCategory(row.original)}>
            <HiTrash size={20} />
          </Button>
        </div>
      ),
    },
  ];
};
