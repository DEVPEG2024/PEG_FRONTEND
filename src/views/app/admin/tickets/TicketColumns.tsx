import { Button, Tag } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiPencil, HiTrash } from 'react-icons/hi';
import dayjs from 'dayjs';
import { Ticket } from '@/@types/ticket';

export const useColumns = (
  handleEditTicket: (ticket: Ticket) => void,
  handleDeleteTicket: (ticketId: Ticket) => void
) => {
  return [
    {
      header: 'Nom',
      accessorKey: 'name',
      enableSorting: false,
      cell: ({ row }: { row: {original: Ticket} }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">{row.original.name}</span>
        </div>
      ),
    },
    {
      header: 'Crée par',
      accessorKey: 'user',
      enableSorting: false,
      cell: ({ row }: { row: {original: Ticket} }) => {
        return (
          <span className="font-bold">{row.original.user.firstName + ' ' + row.original.user.lastName}</span>
        );
      },
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      enableSorting: false,
      cell: ({ row }: { row: {original: Ticket} }) => {
        return (
          <div className="flex items-center gap-2">
            {dayjs(row.original.createdAt).format('DD/MM/YYYY')}
          </div>
        );
      },
    },
    {
      header: 'Priorité',
      accessorKey: 'priority',
      enableSorting: false,
      cell: ({ row }: { row: {original: Ticket} }) => {
        const priority =
          row.original.priority === 'low'
            ? 'Faible'
            : row.original.priority === 'medium'
              ? 'Moyenne'
              : 'Elevée';
        return (
          <Tag
            className={
              row.original.priority === 'low'
                ? 'bg-green-500'
                : row.original.priority === 'medium'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }
          >
            <p className="text-sm text-white">{priority}</p>
          </Tag>
        );
      },
    },
    {
      header: '',
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: {original: Ticket} }) => {
        const status = row.original.state === 'pending' ? 'Ouvert' : row.original.state === 'canceled' ? 'Annulé' : 'Fermé';
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.state === 'open'
                  ? 'bg-green-500'
                  : row.original.state === 'closed'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }
            >
              <p className="text-sm text-white">{status}</p>
            </Tag>
            <Button
              onClick={() => handleEditTicket(row.original)}
              size="sm"
              variant="twoTone"
            >
              <HiPencil size={20} />
            </Button>
            <Button
              onClick={() => handleDeleteTicket(row.original)}
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
