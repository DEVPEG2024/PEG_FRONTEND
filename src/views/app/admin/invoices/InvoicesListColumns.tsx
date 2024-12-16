import { Button, Tag } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiPencil, HiPrinter, HiTrash, HiUserCircle } from 'react-icons/hi';
import { Invoice } from '@/@types/invoice';
import dayjs from 'dayjs';

export const InvoicesListColumns = (
  handleEditInvoice: (invoice: Invoice) => void,
  handleDeleteInvoice: (invoice: Invoice) => void,
  handlePrintInvoice: (invoice: Invoice) => void
) => {
  return [
    {
      header: 'Facture N°',
      accessorKey: 'name',
      enableSorting: false,
      cell: ({ row }: { row: {original: Invoice} }) => {
        return (
          <div className="flex items-center gap-2">
            {row.original.name}
          </div>
        );
      },
    },
    {
      header: 'Client',
      accessorKey: 'customerName',
      enableSorting: false,
      cell: ({ row }: { row: {original: Invoice} }) => (
        <div className="flex items-center gap-2">
          <HiUserCircle size={40} />
          <div className="flex flex-col">
            <span className="font-bold">
              {row.original.customer?.name ?? ''}
            </span>
            </div>
        </div>
      ),
    },

    {
      header: 'Date',
      accessorKey: 'date',
      enableSorting: false,
      cell: ({ row }: { row: {original: Invoice} }) => {
        return (
          <div className="flex items-center gap-2">
            {dayjs(row.original.date).format('DD/MM/YYYY')}
          </div>
        );
      },
    },
    {
      header: 'Total',
      accessorKey: 'amount',
      enableSorting: false,
      cell: ({ row }: { row: {original: Invoice} }) => {
        return (
          <Tag>
            <p className="text-sm">{row.original.amount.toFixed(2)} €</p>
          </Tag>
        );
      },
    },
    {
      header: '',
      accessorKey: 'paymentState',
      enableSorting: false,
      cell: ({ row }: { row: {original: Invoice} }) => {
        const paymentState =
          row.original.paymentState === 'fulfilled' ? 'Payé' : 'Non payé';
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.paymentState === 'fulfilled'
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }
            >
              <p className="text-sm text-white">{paymentState}</p>
            </Tag>
            <Button onClick={() => handlePrintInvoice(row.original)} size="sm">
              <HiPrinter size={20} />
            </Button>
            <Button
              onClick={() => handleEditInvoice(row.original)}
              size="sm"
              className="cyan"
            >
              <HiPencil size={20} />
            </Button>
            <Button
              onClick={() => handleDeleteInvoice(row.original)}
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
