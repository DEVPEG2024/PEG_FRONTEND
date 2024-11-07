import { Button, Tag } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiPencil, HiPrinter, HiTrash, HiUserCircle } from 'react-icons/hi';
import { Invoice } from '@/@types/invoice';
import dayjs from 'dayjs';

export const useColumns = (
  handleEditInvoice: (invoice: Invoice) => void,
  handleDeleteInvoice: (invoice: string) => void,
  handlePrintInvoice: (invoice: Invoice) => void
) => {
  return [
    {
      header: 'Facture N°',
      accessorKey: 'invoiceNumber',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            {row.original.invoiceNumber}
          </div>
        );
      },
    },
    {
      header: 'Client',
      accessorKey: 'companyName',
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <HiUserCircle size={40} />
          {row.original.customerId.companyName ? (
            <div className="flex flex-col">
              <span className="font-bold">
                {row.original.customerId.companyName}
              </span>
              <span className="text-sm">
                {row.original.customerId.firstName}{' '}
                {row.original.customerId.lastName}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-bold">
                {row.original.customerId.firstName}{' '}
                {row.original.customerId.lastName}
              </span>
            </div>
          )}
        </div>
      ),
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
      header: 'Total',
      accessorKey: 'amount',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <Tag>
            <p className="text-sm">{row.original.amount.toFixed(2)} €</p>
          </Tag>
        );
      },
    },
    {
      header: '',
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const status =
          row.original.paymentStatus === 'paid' ? 'Payé' : 'Non payé';
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.paymentStatus === 'paid'
                  ? 'bg-green-500'
                  : 'bg-red-500'
              }
            >
              <p className="text-sm text-white">{status}</p>
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
              onClick={() => handleDeleteInvoice(row.original._id)}
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
