import { Button, Tag } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiPencil, HiTrash } from 'react-icons/hi';
import dayjs from 'dayjs';
import { ITicket } from '@/@types/ticket';
import { IBanner } from '@/@types/banner';
import { API_URL_IMAGE } from '@/configs/api.config';

export const useColumns = (
  handleEditBanner: (banner: IBanner) => void,
  handleDeleteBanner: (bannerId: string) => void
) => {
  return [
    {
      header: 'Bannière N°',
      accessorKey: 'ref',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">{row.original.ref}</div>
        );
      },
    },
    {
      header: 'Title',
      accessorKey: 'title',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.original.title}</span>
        </div>
      ),
    },
    {
      header: 'Image',
      accessorKey: 'image',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <img
            src={API_URL_IMAGE + row.original.image}
            alt="image"
            className="w-40 h-10 rounded-md"
          />
        </div>
      ),
    },
    {
      header: 'Client',
      accessorKey: 'customer',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex flex-col">
            <span className="font-bold">
              {row.original.customer.companyName}
            </span>
            <span>{row.original.customer.firstName}</span>
          </div>
        );
      },
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            {dayjs(row.original.createdAt).format('DD/MM/YYYY')}
          </div>
        );
      },
    },

    {
      header: '',
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const status = row.original.status === 'active' ? 'Actif' : 'Inactif';
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.status === 'active'
                  ? 'bg-green-500'
                  : row.original.status === 'inactive'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }
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
              onClick={() => handleDeleteBanner(row.original._id)}
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
