// src/views/app/admin/customers/lists/CustomerColumns.tsx
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { HiPencil, HiTrash, HiUserCircle } from 'react-icons/hi'
import { Customer, CustomerCategory } from '@/@types/customer'
import { useAppDispatch } from '@/store'
import { deleteCustomer } from '../store'

export const useColumns = (
  handleEditCustomer: (customer: Customer) => void
) => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const handleDeleteCustomer = async (customer: Customer) => {
    dispatch(deleteCustomer(String(customer.documentId)))
  }

  return [
    {
      header: t('title'),
      accessorKey: 'title',
      enableSorting: false,
      cell: ({ row }: { row: { original: Customer } }) => (
        <div className="flex items-center gap-2">
          <HiUserCircle size={40} />
          <div className="flex flex-col">
            <span className="font-bold">{row.original.name}</span>
          </div>
        </div>
      ),
    },
    {
      header: t('category'),
      accessorKey: 'category',
      enableSorting: false,
      cell: ({ row }: { row: { original: Customer } }) => {
        const category: CustomerCategory = (row.original as any).customerCategory
        return <div className="flex items-center gap-2">{category?.name ?? '-'}</div>
      },
    },
    {
      header: t('status'),
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: { original: Customer } }) => (
        <div className="flex justify-end items-center gap-2">
          <Button onClick={() => handleEditCustomer(row.original)} size="sm">
            <HiPencil size={20} />
          </Button>
          <Button
            onClick={() => handleDeleteCustomer(row.original)}
            variant="twoTone"
            size="sm"
          >
            <HiTrash size={20} />
          </Button>
        </div>
      ),
    },
  ]
}