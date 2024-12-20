import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import {
  HiPencil,
  HiTrash,
  HiUserCircle,
} from 'react-icons/hi';
import { Producer, ProducerCategory } from '@/@types/producer';
import { useAppDispatch } from '@/store';
import { deleteProducer } from '../store';

export const useColumns = (
  handleEditProducer: (producer: Producer) => void
) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const handleDeleteProducer = async (producer: Producer) => {
    dispatch(deleteProducer(producer.documentId))
  };
  return [
    {
      header: t('title'),
      accessorKey: 'title',
      enableSorting: false,
      cell: ({ row }: { row: {original: Producer} }) => (
        <div className="flex items-center gap-2">
          <HiUserCircle size={40} />
          <div className="flex flex-col">
            <span className="font-bold">{row.original.name}</span>
          </div>
        </div>
      ),
    },
    // TODO: Ajouter un mainUser sur le producer ?
    /*{
      header: t('email'),
      accessorKey: 'email',
      enableSorting: false,
      cell: ({ row }: { row: {original: Producer} }) => (
        <div className="flex items-center gap-2">{row.original.email}</div>
      ),
    },
    {
      header: t('phone'),
      accessorKey: 'phone',
      enableSorting: false,
      cell: ({ row }: { row: {original: Producer} }) => (
        <div className="flex items-center gap-2">{row.original.phone}</div>
      ),
    },*/
    {
      header: t('category'),
      accessorKey: 'category',
      enableSorting: false,
      cell: ({ row }: { row: {original: Producer} }) => {
        const category: ProducerCategory = row.original.producerCategory;
        return <div className="flex items-center gap-2">{category?.name}</div>;
      },
    },
    {
      header: t('status'),
      accessorKey: 'status',
      enableSorting: false,
      cell: ({ row }: { row: {original: Producer} }) => (
        <div className="flex justify-end items-center gap-2">
          <Button onClick={() => handleEditProducer(row.original)} size="sm">
            <HiPencil size={20} />
          </Button>
          <Button
            onClick={() => handleDeleteProducer(row.original)}
            variant="twoTone"
            size="sm"
          >
            <HiTrash size={20} />
          </Button>
        </div>
      ),
    },
  ];
};
