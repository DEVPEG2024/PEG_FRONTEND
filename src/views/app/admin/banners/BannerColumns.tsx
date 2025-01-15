import { Button, Tag } from '@/components/ui';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { Banner } from '@/@types/banner';

export const useColumns = (
  handleEditBanner: (banner: Banner) => void,
  handleDeleteBanner: (banner: Banner) => void
) => {
  return [
    {
      header: 'Nom',
      accessorKey: 'name',
      enableSorting: false,
      cell: ({ row }: { row: { original: Banner } }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.original.name}</span>
        </div>
      ),
    },
    {
      header: 'Image',
      accessorKey: 'image',
      enableSorting: false,
      cell: ({ row }: { row: { original: Banner } }) => (
        <div className="flex items-center gap-2">
          {row.original.image && (
            <img
              src={row.original.image?.url}
              alt="image"
              className="w-40 h-10 rounded-md"
            />
          )}
        </div>
      ),
    },
    {
      header: 'Client',
      accessorKey: 'customer',
      enableSorting: false,
      cell: ({ row }: { row: { original: Banner } }) => {
        return (
          <div className="flex flex-col">
            <span className="font-bold">{row.original.customer?.name}</span>
          </div>
        );
      },
    },
    {
      header: 'Catégorie client',
      accessorKey: 'customerCategory',
      enableSorting: false,
      cell: ({ row }: { row: { original: Banner } }) => {
        return (
          <div className="flex flex-col">
            <span className="font-bold">
              {row.original.customerCategory?.name}
            </span>
          </div>
        );
      },
    },

    {
      header: '',
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: { original: Banner } }) => {
        const status = row.original.active ? 'Actif' : 'Inactif';
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={row.original.active ? 'bg-green-500' : 'bg-red-500'}
            >
              <p className="text-sm text-white">{status}</p>
            </Tag>
            <Button
              onClick={() => handleEditBanner(row.original)}
              size="sm"
              variant="twoTone"
            >
              <HiPencil size={20} />
            </Button>
            <Button
              onClick={() => handleDeleteBanner(row.original)}
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
