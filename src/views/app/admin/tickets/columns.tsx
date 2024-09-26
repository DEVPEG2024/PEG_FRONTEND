import {Button, Tag } from "@/components/ui"; // Assurez-vous que le chemin est correct
import {  HiPencil,  HiTrash,  } from "react-icons/hi";
import dayjs from "dayjs";
import { ITicket } from "@/@types/ticket";

export const useColumns = (
  handleEditTicket: (ticket: ITicket) => void,
  handleDeleteTicket: (ticketId: string) => void,
  handleViewTicket: (ticket: ITicket) => void
) => {

  return [
    {
      header: "Ticket N°",
      accessorKey: "ref",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            <a
              className="cursor-pointer"
              onClick={()=>handleViewTicket(row.original)}
            >
              {row.original.ref}
            </a>
          </div>
        );
      },
    },
    {
      header: "Title",
      accessorKey: "title",
      enableSorting: false,
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          <a
            className="cursor-pointer"
            onClick={()=>handleViewTicket(row.original)}
          >
          <span className="font-bold">{row.original.title}</span>
          </a>
        </div>
      ),
    },
    {
      header: "Crée par",
      accessorKey: "user",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <a
            className="cursor-pointer"
            onClick={()=>handleViewTicket(row.original)}
          >
           <span className="font-bold">{row.original.user.companyName}</span> 
           <span>{row.original.user.firstName}</span> 
          </a>
        );
      },
    },
    {
      header: "Date",
      accessorKey: "createdAt",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        return (
          <div className="flex items-center gap-2">
            <a
              className="cursor-pointer"
              onClick={()=>handleViewTicket(row.original)}
            >
            {dayjs(row.original.createdAt).format("DD/MM/YYYY")}
          </a>
          </div>
        );
      },
    },
    {
      header: "Priorité",
      accessorKey: "priority",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const priority = row.original.priority === "low" ? "Faible" : row.original.priority === "medium" ? "Moyenne" : "Elevée";
        return (
          <Tag
            className={
              row.original.priority === "low"
                ? "bg-green-500"
                : row.original.priority === "medium"
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }
          >
            <a
              className="cursor-pointer"
              onClick={()=>handleViewTicket(row.original)}
            >
              <p className="text-sm text-white">{priority}</p>
            </a>
          </Tag>
        );
      },
    },
    {
      header: "",
      accessorKey: "status",
      enableSorting: false,
      cell: ({ row }: { row: any }) => {
        const status = row.original.status === "open" ? "Ouvert" : "Fermé";
        return (
          <div className="flex justify-end items-center gap-2">
            <Tag
              className={
                row.original.status === "open"
                  ? "bg-green-500"
                  : row.original.status === "closed"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }
            >
              <p className="text-sm text-white">{status}</p>
            </Tag>
            <Button
              onClick={() => handleEditTicket(row.original)}
              size="sm"
              variant="twoTone"
            >
              <HiPencil size={20} />
            </Button>
            <Button
              onClick={() => handleDeleteTicket(row.original._id)}
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
