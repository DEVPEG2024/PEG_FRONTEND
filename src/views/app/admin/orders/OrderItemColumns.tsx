import { Button, Tag, Tooltip } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiBan, HiCheck, HiInformationCircle } from 'react-icons/hi';
import { OrderItem } from '@/@types/orderItem';
import { SizeSelection } from '@/@types/product';

export const useColumns = (
  handleShowOrderItem: (order: OrderItem) => void,
  handleFinishOrder: (order: OrderItem) => void,
  handlePendOrder: (order: OrderItem) => void
) => {
  return [
    {
      header: 'Client',
      accessorKey: 'customer',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div className="flex flex-col" key={row.original.documentId}>
            <span className="font-bold">{row.original.customer.name}</span>
          </div>
        );
      },
    },
    {
      header: 'Produit',
      accessorKey: 'product',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div
            className="flex items-center gap-2"
            key={row.original.documentId}
          >
            {row.original.product
              ? row.original.product.name
              : 'PRODUIT SUPPRIME'}
          </div>
        );
      },
    },
    {
      header: 'Tailles',
      accessorKey: 'sizeSelections',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div
            className="flex-col justify-center gap-2"
            key={row.original.documentId}
          >
            {row.original.sizeSelections.map((sizeSelection: SizeSelection) => (
              <p>
                {sizeSelection.size.name} : {sizeSelection.quantity}
              </p>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Montant',
      accessorKey: 'price',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div
            className="flex items-center gap-2"
            key={row.original.documentId}
          >
            {row.original.price} €
          </div>
        );
      },
    },

    {
      header: 'Demande',
      accessorKey: '',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div className="flex items-center" key={row.original.documentId}>
            <Tooltip title="Consulter les détails">
              <Button
                onClick={() => handleShowOrderItem(row.original)}
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
      accessorKey: 'state',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        const state =
          row.original.state === 'pending' ? 'En attente' : 'Terminée';
        return (
          <div
            className="flex justify-end items-center gap-2"
            key={row.original.documentId}
          >
            <Tag
              className={
                row.original.state === 'pending'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }
            >
              <p className="text-sm text-white">{state}</p>
            </Tag>
            <Tooltip
              title={
                row.original.state === 'pending'
                  ? 'Terminer la commande'
                  : 'Mettre en attente'
              }
            >
              <Button
                onClick={() =>
                  row.original.state === 'pending'
                    ? handleFinishOrder(row.original)
                    : handlePendOrder(row.original)
                }
                size="sm"
                variant="twoTone"
                icon={
                  row.original.state === 'pending' ? (
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
