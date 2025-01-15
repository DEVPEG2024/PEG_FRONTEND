import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiFolderOpen, HiPencil, HiTrash } from 'react-icons/hi';
import { ProducerCategory } from '@/@types/producer';

export const useColumns = (
  handleDeleteCategory: (producerCateory: ProducerCategory) => void,
  handleEditCategory: (producerCateory: ProducerCategory) => void
) => {
  const { t } = useTranslation();

  return [
    {
      header: t('title'),
      accessorKey: 'name',
      enableSorting: false,
      cell: ({ row }: { row: { original: ProducerCategory } }) => (
        <div className="flex items-center gap-2">
          <HiFolderOpen size={20} />
          {row.original.name}
        </div>
      ),
    },

    {
      header: t('p.total_producers'),
      accessorKey: 'producers',
      enableSorting: false,
      cell: ({ row }: { row: { original: ProducerCategory } }) => (
        <div className="flex items-center gap-2">
          {row.original.producers.length}
        </div>
      ),
    },

    {
      header: '',
      accessorKey: 'actions',
      enableSorting: false,
      cell: ({ row }: { row: { original: ProducerCategory } }) => (
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
