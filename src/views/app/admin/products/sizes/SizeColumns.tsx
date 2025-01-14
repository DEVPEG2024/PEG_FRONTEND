import { Size } from '@/@types/product';
import { Button } from '@/components/ui';
import { HiPencil, HiTrash } from 'react-icons/hi';

export const useColumns = (
  handleEditSize: (size: Size) => void,
  handleDeleteSize: (size: Size) => void
) => {
  return [
    {
      header: 'Nom',
      accessorKey: 'name',
      enableSorting: false,
      cell: ({ row }: { row: { original: Size } }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.original.name}</span>
        </div>
      ),
    },
    {
      header: 'Valeur',
      accessorKey: 'value',
      enableSorting: false,
      cell: ({ row }: { row: { original: Size } }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.original.value}</span>
        </div>
      ),
    },
    {
      header: 'Catégorie produit',
      accessorKey: 'productCategory',
      enableSorting: false,
      cell: ({ row }: { row: { original: Size } }) => {
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {row.original.productCategory.name}
            </span>
          </div>
        );
      },
    },

    {
      header: '',
      accessorKey: 'actions',
      enableSorting: false,
      cell: ({ row }: { row: { original: Size } }) => {
        return (
          <div className="flex justify-end items-center gap-2">
            <Button
              onClick={() => handleEditSize(row.original)}
              size="sm"
              variant="twoTone"
            >
              <HiPencil size={20} />
            </Button>
            <Button
              onClick={() => handleDeleteSize(row.original)}
              size="sm"
              variant="twoTone"
            >
              <HiTrash size={20} />
            </Button>
          </div>
        );
      },
    },
  ];
};
