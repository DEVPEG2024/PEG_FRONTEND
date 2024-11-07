import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiFolderOpen, HiPencil, HiTrash } from 'react-icons/hi';
import { ICategoryProducer } from '@/services/ProducerServices';

export const useColumns = (
  handleDeleteCategory: (category: ICategoryProducer) => void,
  handleEditCategory: (category: ICategoryProducer) => void
) => {
  const { t } = useTranslation();

  return [
    {
      header: t('title'),
      accessorKey: 'title',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <HiFolderOpen size={20} />
          {row.original.label}
        </div>
      ),
    },

    {
      header: t('cust.total_customers'),
      accessorKey: 'customers',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">{row.original.customers}</div>
      ),
    },

    {
      header: '',
      accessorKey: 'actions',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
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
