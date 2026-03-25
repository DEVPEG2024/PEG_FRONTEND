import { Button, Tooltip } from '@/components/ui'; // Assurez-vous que le chemin est correct
import {
  getProductPriceForSizeAndColors,
  getTotalPriceForCartItem,
} from '@/utils/productHelpers';
import { toTTC } from '@/utils/priceHelpers';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { CartItem } from '@/@types/cart';

export const useColumns = (
  handleEdit: (cartItem: CartItem) => void,
  handleDelete: (cartItem: CartItem) => void
) => {
  return [
    {
      header: 'Produit',
      accessorKey: 'product',
      enableSorting: false,
      cell: ({ row }: { row: { original: CartItem } }) => {
        return (
          <div className="flex items-center gap-2">
            <img
              src={row.original.product.images[0]?.url}
              alt={row.original.product.name}
              className="w-20 h-20 object-cover rounded-md bg-slate-50"
            />
            <p>{row.original.product.name}</p>
          </div>
        );
      },
    },
    {
      header: 'Prix unitaire',
      accessorKey: 'price',
      enableSorting: false,
      cell: ({ row }: { row: { original: CartItem } }) => {
        const ht = getProductPriceForSizeAndColors(
          row.original.product,
          row.original.sizeAndColors
        );
        return (
          <div>
            <p className="font-semibold">{ht.toFixed(2)} € HT</p>
            <p className="text-xs text-gray-400">{toTTC(ht).toFixed(2)} € TTC</p>
          </div>
        );
      },
    },
    {
      header: 'Tailles',
      accessorKey: 'sizeAndColorSelections',
      enableSorting: false,
      cell: ({ row }: { row: { original: CartItem } }) => {
        return (
          <div className="flex-col justify-center gap-2">
            {row.original.sizeAndColors.map((sizeAndColor) => (
              <p key={sizeAndColor.size.value}>
                {sizeAndColor.size.value === 'DEFAULT'
                  ? 'Quantité'
                  : sizeAndColor.size.name}{' '}
                {sizeAndColor.color.value !== 'DEFAULT'
                  ? '(' + sizeAndColor.color.name + ')'
                  : ''}{' '}
                : {sizeAndColor.quantity}
              </p>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Montant total',
      accessorKey: 'totalPrice',
      enableSorting: false,
      cell: ({ row }: { row: { original: CartItem } }) => {
        const ht = getTotalPriceForCartItem(
          row.original.product,
          row.original.sizeAndColors
        );
        return (
          <div className="flex flex-col" key={row.original.id}>
            <span className="font-semibold">{ht.toFixed(2)} € HT</span>
            <span className="text-xs text-gray-400">{toTTC(ht).toFixed(2)} € TTC</span>
          </div>
        );
      },
    },

    {
      header: 'Actions',
      accessorKey: 'actions',
      enableSorting: false,
      cell: ({ row }: { row: { original: CartItem } }) => {
        return (
          <div className="flex gap-1" key={row.original.id}>
            <Tooltip title="Modifier la demande">
              <Button
                onClick={() => handleEdit(row.original)}
                size="sm"
                icon={<HiPencil />}
              />
            </Tooltip>
            <Tooltip title="Annuler la demande">
              <Button
                onClick={() => handleDelete(row.original)}
                size="sm"
                icon={<HiTrash />}
              />
            </Tooltip>
          </div>
        );
      },
    },
  ];
};
