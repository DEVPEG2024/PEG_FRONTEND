import { Button, Tag } from "@/components/ui"; // Assurez-vous que le chemin est correct
import { HiCheck, HiInformationCircle } from "react-icons/hi";
import { IOrder } from "@/@types/order";
import { SizeSelection } from "@/@types/product";

export const useColumns = (
  handleShowOrder: (order: IOrder) => void,
  handleUpdateStatusOrderFinished: (order: IOrder) => void
) => {

  return [
    {
      header: "Client",
      accessorKey: "customer",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex flex-col">
            <span className="font-bold">{row.original.customer.companyName}</span>
            <span>{row.original.customer.firstName}</span>
          </div>
        );
      },
    },
    {
      header: "Produit",
      accessorKey: "product",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">{row.original.product.title}</div>
        );
      },
    },
    {
      header: "Tailles",
      accessorKey: "sizes",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className='flex-col justify-center gap-2'>
            {row.original.sizes.map((size: SizeSelection) => (
              <p>{size.value} : {size.quantity}</p>
            ))}
          </div>
        );
      },
    },
    {
      header: "Montant",
      accessorKey: "total",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">{row.original.total} €</div>
        );
      },
    },

    {
      header: "Demande",
      accessorKey: "",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center">
            <Button
              onClick={() => handleShowOrder(row.original)}
              size="sm"
              variant="twoTone"
              icon={<HiInformationCircle size={20} />}
            />
          </div>
        );
      },
    },

    {
      header: "Statut",
      accessorKey: "status",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const status = row.original.status === "pending" ? "En attente" : "Terminée";
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.status === "pending"
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }
            >
              <p className="text-sm text-white">{status}</p>
            </Tag>
            <Button
              onClick={() => handleUpdateStatusOrderFinished(row.original)}
              size="sm"
              variant="twoTone"
              icon={<HiCheck size={20} />}
            />
          </div>
        );
      },
    },
  ];
};
