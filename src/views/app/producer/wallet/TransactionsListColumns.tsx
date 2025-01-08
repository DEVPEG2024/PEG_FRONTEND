import { Tag } from '@/components/ui'; // Assurez-vous que le chemin est correct
import { HiUserCircle } from 'react-icons/hi';
import dayjs from 'dayjs';
import { paymentTypes } from './constants';
import { Transaction } from '@/@types/transaction';
import { useNavigate } from 'react-router-dom';
import { AiOutlineProject } from 'react-icons/ai';

export const TransactionsListColumns = (
) => {
  const navigate = useNavigate()
  
  return [
    {
      header: 'Projet',
      accessorKey: 'project',
      enableSorting: false,
      cell: ({ row }: { row: {original: Transaction} }) => (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/common/projects/details/${row.original.project?.documentId}`)}>
          <AiOutlineProject size={40} />
          <div className="flex flex-col">
            <span className="font-bold">
              {row.original.project?.name ?? ''}
            </span>
            </div>
        </div>
      ),
    },
    
    {
      header: 'Type',
      accessorKey: 'type',
      enableSorting: false,
      cell: ({ row }: { row: {original: Transaction} }) => (
        <div className="flex items-center gap-2">
          <span className="font-bold">
            {paymentTypes.find(({value}) => value === row.original.type)?.label ?? 'Type non déterminé'}
          </span>
        </div>
      ),
    },

    {
      header: 'Date d\'émission',
      accessorKey: 'date',
      enableSorting: false,
      cell: ({ row }: { row: {original: Transaction} }) => {
        return (
          <div className="flex items-center gap-2">
            {dayjs(row.original.date).format('DD/MM/YYYY')}
          </div>
        );
      },
    },
    {
      header: 'Montant',
      accessorKey: 'amount',
      enableSorting: false,
      cell: ({ row }: { row: {original: Transaction} }) => {
        const paymentWay = paymentTypes.find(({value}) => value === row.original.type)!.type
        return (
          <Tag className={paymentWay === 'add' ? 'bg-green-500' : 'bg-red-500'}>
            <p className="text-sm text-white">{paymentWay === 'add' ? '+' : '-'} {row.original.amount.toFixed(2)} €</p>
          </Tag>
        );
      },
    },
  ];
};
