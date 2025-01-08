import { Button, Tag } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiBan, HiPencil, HiPrinter, HiUserCircle } from 'react-icons/hi';
import { Invoice } from '@/@types/invoice';
import dayjs from 'dayjs';
import { stateData } from './constants';

export const InvoicesListColumns = (
  handleEditInvoice: (invoice: Invoice) => void,
  handleCancelInvoice: (invoice: Invoice) => void,
  handlePrintInvoice: (invoice: Invoice) => void,
  isAdminOrSuperAdmin: boolean
) => {
  return [
    {
      header: 'Référence',
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
      header: 'Statut',
      accessorKey: 'state',
      enableSorting: false,
      cell: ({ row }: { row: {original: Invoice} }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">
            {stateData.find(({value}) => value === row.original.state)?.label ?? 'Statut non déterminé'}
          </span>
        </div>
      ),
    },

    {
      header: 'Date d\'émission',
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
      accessorKey: 'totalAmount',
      enableSorting: false,
      cell: ({ row }: { row: {original: Invoice} }) => {
        return (
          <Tag>
            <p className="text-sm">{row.original.totalAmount.toFixed(2)} €</p>
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
            {isAdminOrSuperAdmin && (
              <Button
                onClick={() => handleEditInvoice(row.original)}
                size="sm"
                className="cyan"
              >
                <HiPencil size={20} />
              </Button>
            )}
            {isAdminOrSuperAdmin && (
              <Button
                onClick={() => handleCancelInvoice(row.original)}
                size="sm"
                variant="twoTone"
                disabled={row.original.state === 'canceled'}
              >
                <HiBan size={20} />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
};
