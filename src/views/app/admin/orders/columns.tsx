import { Button, Tag, Tooltip } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiBan, HiCheck, HiInformationCircle } from 'react-icons/hi';
import { IOrder } from '@/@types/order';
import { SizeSelection } from '@/@types/product';

export const useColumns = (
  handleShowOrder: (order: IOrder) => void,
  handleFinishOrder: (order: IOrder) => void,
  handlePendOrder: (order: IOrder) => void,
  handleValidatePaymentStatus: (order: IOrder) => void,
  handleInvalidatePaymentStatus: (order: IOrder) => void
) => {
  return [
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
      header: 'Produit',
      accessorKey: 'product',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            {row.original.product
              ? row.original.product.title
              : 'PRODUIT SUPPRIME'}
          </div>
        );
      },
    },
    {
      header: 'Tailles',
      accessorKey: 'sizes',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex-col justify-center gap-2">
            {row.original.sizes.map((size: SizeSelection) => (
              <p>
                {size.value} : {size.quantity}
              </p>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Montant',
      accessorKey: 'total',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">{row.original.total} €</div>
        );
      },
    },
    {
      header: 'Paiement',
      accessorKey: 'paymentStatus',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const status =
          row.original.paymentStatus === 'PENDING' ? 'En attente' : 'Effectué';
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.paymentStatus === 'PENDING'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }
            >
              <p className="text-sm text-white">{status}</p>
            </Tag>
            <Tooltip
              title={
                (row.original.paymentStatus === 'PENDING'
                  ? 'Valider'
                  : 'Invalider') + ' le paiement'
              }
            >
              <Button
                onClick={() =>
                  row.original.paymentStatus === 'PENDING'
                    ? handleValidatePaymentStatus(row.original)
                    : handleInvalidatePaymentStatus(row.original)
                }
                size="sm"
                variant="twoTone"
                icon={
                  row.original.paymentStatus === 'PENDING' ? (
                    <HiCheck size={20} />
                  ) : (
                    <HiBan size={20} />
                  )
                }
              />
            </Tooltip>
          </div>
        );
      },
    },

    {
      header: 'Demande',
      accessorKey: '',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center">
            <Tooltip title="Consulter les détails">
              <Button
                onClick={() => handleShowOrder(row.original)}
                size="sm"
                variant="twoTone"
                icon={<HiInformationCircle size={20} />}
              />
            </Tooltip>
          </div>
        );
      },
    },

    {
      header: 'Statut',
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const status =
          row.original.status === 'PENDING' ? 'En attente' : 'Terminée';
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.status === 'PENDING'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }
            >
              <p className="text-sm text-white">{status}</p>
            </Tag>
            <Tooltip
              title={
                row.original.status === 'PENDING'
                  ? 'Terminer la commande'
                  : 'Mettre en attente'
              }
            >
              <Button
                onClick={() =>
                  row.original.status === 'PENDING'
                    ? handleFinishOrder(row.original)
                    : handlePendOrder(row.original)
                }
                size="sm"
                variant="twoTone"
                icon={
                  row.original.status === 'PENDING' ? (
                    <HiCheck size={20} />
                  ) : (
                    <HiBan size={20} />
                  )
                }
              />
            </Tooltip>
          </div>
        );
      },
    },
  ];
};
