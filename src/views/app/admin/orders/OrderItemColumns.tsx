import { Button, Tag, Tooltip } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiBan, HiCheck, HiInformationCircle, HiTrash } from 'react-icons/hi';
import { OrderItem } from '@/@types/orderItem';
import { SizeAndColorSelection } from '@/@types/product';
import { User } from '@/@types/user';
import { SUPER_ADMIN } from '@/constants/roles.constant';
import { hasRole } from '@/utils/permissions';

export const useColumns = (
  handleShowOrderItem: (order: OrderItem) => void,
  handleFinishOrder: (order: OrderItem) => void,
  handlePendOrder: (order: OrderItem) => void,
  handleShowProject: (order: OrderItem) => void,
  handleDeleteOrderItem: (order: OrderItem) => void,
  user: User
) => {
  return [
    {
      header: 'Client',
      accessorKey: 'customer',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div className="flex flex-col" key={row.original.documentId}>
            <span className="font-bold">{row.original.customer?.name ?? 'Client supprimé'}</span>
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
      accessorKey: 'sizeAndColorSelections',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div
            className="flex-col justify-center gap-2"
            key={row.original.documentId}
          >
            {row.original.sizeAndColorSelections?.map((sizeAndColorSelection: SizeAndColorSelection) => (
              <p>
                {sizeAndColorSelection.size.name} : {sizeAndColorSelection.quantity}
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
      header: 'Projet',
      accessorKey: '',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div className="flex items-center" key={row.original.documentId}>
            {row.original.project ? (
              <Tooltip title="Consulter le projet">
                <Button
                  onClick={() => handleShowProject(row.original)}
                  size="sm"
                  variant="twoTone"
                  icon={<HiInformationCircle size={20} />}
                />
              </Tooltip>
            ) : (
              <Tooltip title="Projet inexistant">
                <Button
                  disabled
                  size="sm"
                  variant="twoTone"
                  icon={<HiBan size={20} />}
                />
              </Tooltip>
            )}
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
            className="flex items-center gap-2"
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

    {
      header: 'Actions',
      accessorKey: '',
      enableSorting: false,
      cell: ({ row }: { row: { original: OrderItem } }) => {
        return (
          <div className="flex items-center" key={row.original.documentId}>
            <Tooltip title="Supprimer la commande">
              <Button
                onClick={() => handleDeleteOrderItem(row.original)}
                size="sm"
                variant="twoTone"
                icon={<HiTrash size={20} />}
                disabled={!hasRole(user, [SUPER_ADMIN])}
              />
            </Tooltip>
          </div>
        );
      },
    },
  ];
};
