import {
  Button,
  Dialog,
  Input,
  Select,
} from "@/components/ui";
import { t } from "i18next";
import { useEffect, useState } from "react";
import {
  useAppDispatch,
  useAppSelector,
} from "../store";
import { ticketPriorityData, ticketTypeData } from "../constants";
import { RichTextEditor } from "@/components/shared";
import { setEditTicketDialog, updateTicket } from "../store/ticketSlice";
import { ITicket } from "@/@types/ticket";
import FileUplaodCustom from "@/components/shared/Upload";

function ModalEditTicket() {
  const user = useAppSelector((state: any) => state.auth.user);
  const { editTicketDialog, selectedTicket } = useAppSelector((state) => state.tickets.data);
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    title: selectedTicket?.title || "",
    description: selectedTicket?.description || "",
    file: selectedTicket?.file || "",
    type: selectedTicket?.type || "bug",
    priority: selectedTicket?.priority || "low",
    status: selectedTicket?.status || "pending",
    user: user._id,
  });

  useEffect(() =>
    setFormData({
      title: selectedTicket?.title || "",
      description: selectedTicket?.description || "",
      file: selectedTicket?.file || "",
      type: selectedTicket?.type || "bug",
      priority: selectedTicket?.priority || "low",
      status: selectedTicket?.status || "pending",
      user: user._id,
    }), [selectedTicket]
  )

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(
      updateTicket({
        ticket: formData as unknown as ITicket,
        ticketId: selectedTicket?._id || "",
      })
    );
    setFormData({
      type: "bug",
      title: "",
      file: "",
      priority: "low",
      description: "",
      status: "pending",
      user: user._id,
    });
    handleClose();
  };
  const handleClose = () => {
    dispatch(setEditTicketDialog(false));
  };

  const onFileChange = (e: any) => {
    setFormData({ ...formData, file: e });
  };

  return (
    <div>
      <Dialog isOpen={editTicketDialog} onClose={handleClose} width={1200}>
        <div className="flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 ">
              <Input
                value={formData.title}
                placeholder="Titre"
                onChange={(e: any) => {
                  setFormData({ ...formData, title: e.target.value });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
              <Select
                placeholder="Priorité"
                options={ticketPriorityData}
                noOptionsMessage={() => "Aucune priorité trouvée"}
                value={ticketPriorityData.find(
                  (priority) => priority.value === formData.priority
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, priority: e?.value || "" });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Type du ticket
              </p>
              <Select
                placeholder="Type du ticket"
                options={ticketTypeData}
                noOptionsMessage={() => "Aucun type de ticket trouvé"}
                value={ticketTypeData.find(
                  (type) => type.value === formData.type
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, type: e?.value || "" });
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <RichTextEditor
              value={formData.description}
              onChange={(value: string, delta: any, source: string) => {
                if (source === 'user') {
                  setFormData({ ...formData, description: value });
                }
              }}
            />
          </div>
          <div className="text-right mt-6 flex flex-row items-center justify-end gap-2">
            <FileUplaodCustom
              image={formData.file}
              setImage={onFileChange}
              setFileType={() => { }}
            />
            <Button
              className="ltr:mr-2 rtl:ml-2"
              variant="plain"
              onClick={handleClose}
            >
              {t("cancel")}
            </Button>
            <Button variant="solid" onClick={handleSubmit}>
              {t("save")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalEditTicket;
