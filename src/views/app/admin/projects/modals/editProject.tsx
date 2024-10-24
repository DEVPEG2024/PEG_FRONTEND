import { Button, DatePicker, Dialog, Input, Select } from "@/components/ui";
import { t } from "i18next";
import FieldCustom from "./components/fileds";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { updateProject } from "@/utils/hooks/projects/useCreateProject";
import { HiOutlineCalendar } from "react-icons/hi";
import {
  getList,
  setEditProjectDialog,
  setSelectedProject,
  useAppDispatch,
  useAppSelector,
} from "../store";
import useCustomer from "@/utils/hooks/customers/useCustomer";
import useProducer from "@/utils/hooks/producers/useProducer";
import _ from "lodash";
import { priorityData, statusData } from "../lists/constants";

type Option = {
  value: string;
  label: string;
};

function ModalEditProject() {
  const editProjectDialog = useAppSelector(
    (state) => state.projectList.data.editProjectDialog
  );
  const selectedProject = useAppSelector(
    (state) => state.projectList.data.selectedProject
  );
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    _id : selectedProject?._id ,
    title: selectedProject?.title,
    description: selectedProject?.description || "",
    priority: selectedProject?.priority || 'low',
    status: selectedProject?.status || 'pending',
    amount: selectedProject?.amount || 0,
    amountProducers: selectedProject?.amountProducers || 0,
    customer: selectedProject?.customer._id,
    producer: selectedProject?.producer?._id,
    startDate: dayjs(selectedProject?.startDate).toDate(),
    endDate: dayjs(selectedProject?.endDate).toDate(),
  });
  const [customers, setCustomers] = useState<Option[]>([]);
  const [producers, setProducers] = useState<Option[]>([]);
  const { getCustomers } = useCustomer();
  const { getProducers } = useProducer();
  useEffect(() => {
    getUsers();
  }, []);
  useEffect(() => {
    if (selectedProject) {
      setFormData({
        _id : selectedProject._id || '',
        title: selectedProject.title || '',
        description: selectedProject.description || '',
        priority: selectedProject.priority || 'low',
        status: selectedProject.status || 'pending',
        amount: selectedProject.amount || 0,
        amountProducers: selectedProject.amountProducers || 0,
        customer: selectedProject.customer?._id || '',
        producer: selectedProject.producer?._id || '',
        startDate: selectedProject.startDate ? dayjs(selectedProject.startDate).toDate() : new Date(),
        endDate: selectedProject.endDate ? dayjs(selectedProject.endDate).toDate() : new Date(),
      });
    }
  }, [selectedProject]);
  const getUsers = async () => {
    const res = await getCustomers(1, 10000, "");
    const resProducer = await getProducers(1, 10000, "");
    if (res && res.data) {
      setCustomers(
        res.data.map((item: any) => ({
          label: item.companyName + " - " + item.firstName + " " + item.lastName,
          value: item._id,
        }))
      );
    }
    if (resProducer && resProducer.data) {
      setProducers(
        resProducer.data.map((item: any) => ({
          label: item.companyName + " - " + item.firstName + " " + item.lastName,
          value: item._id,
        }))
      );
    }
  };
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    const resp = await updateProject(formData);
    if (resp.status === "success") {
      setIsLoading(false);
      handleClose();
      dispatch(getList({ page: 1, pageSize: 4, searchTerm: "" }));
      dispatch(setEditProjectDialog(false))
      dispatch(setSelectedProject(resp.data))
    } else {
      setIsLoading(false);
    }
  };
  const handleClose = () => {
    dispatch(setEditProjectDialog(false));
  };
  
  

  return (
    <div>
      <Dialog isOpen={editProjectDialog} onClose={handleClose} width={800}>
        <div className="flex flex-col h-full justify-between">
          <h5 className="mb-4">{t("projects.editProject")}</h5>
          <FieldCustom
            placeholder={t("projects.projectName")}
            value={formData.title as string}
            setValue={(e: any) => {
              setFormData({ ...formData, title: e });
            }}
          />
          <Input
            textArea
            rows={4}
            className="mt-4"
            placeholder={t("projects.projectDescription")}
            value={formData.description as string}
            onChange={(e) => {
              setFormData({ ...formData, description: e.target.value });
            }}
          />
          <div className="flex flex-row gap-2 mt-4">
            <div className="flex flex-col gap-2 w-1/2">
              <FieldCustom
                placeholder={t("projects.amount")}
                value={formData.amount as number}
                setValue={(e: any) => {
                  setFormData({ ...formData, amount: e });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <FieldCustom
                placeholder={t("projects.amountProducers")}
                value={formData.amountProducers as number}
                setValue={(e: any) => {
                  setFormData({ ...formData, amountProducers: e });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Client</p>
              <Select
                placeholder={t("projects.selectCustomer")}
                options={customers}
                noOptionsMessage={() => "Aucun client trouvé"}
                value={customers.find(
                  (customer) => customer.value == formData.customer
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, customer: e?.value || "" });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Producteur</p>
              <Select
                placeholder={t("projects.selectProducer")}
                options={producers}
                noOptionsMessage={() => "Aucun producteur trouvé"}
                value={producers.find(
                  (producer) => producer.value == formData.producer
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, producer: e?.value || "" });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Priorité</p>
              <Select
                placeholder="Choisir une priorité"
                options={priorityData}
                noOptionsMessage={() => "Aucune priorité trouvé"}
                value={priorityData.find(
                  (priority) => priority.value == formData.priority
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, priority: e?.value || "" });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Status</p>
              <Select
                placeholder={t("projects.selectProducer")}
                options={statusData}
                noOptionsMessage={() => "Aucun status trouvé"}
                value={statusData.find(
                  (status) => status.value == formData.status
                )}
                onChange={(e: any) => {
                  setFormData({ ...formData, status: e?.value || "" });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                {t("projects.projectStartDate")}
              </p>
              <DatePicker
                placeholder={t("projects.projectStartDate")}
                value={dayjs(formData.startDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                inputFormat="DD/MM/YYYY"
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, startDate: dayjs(date).toDate() });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                {t("projects.projectEndDate")}
              </p>
              <DatePicker
                placeholder={t("projects.projectEndDate")}
                value={dayjs(formData.endDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, endDate: dayjs(date).toDate() });
                }}
                inputFormat="DD/MM/YYYY"
              />
            </div>
          </div>
          <div className="text-right mt-6">
            <Button
              className="ltr:mr-2 rtl:ml-2"
              variant="plain"
              onClick={handleClose}
            >
              {t("cancel")}
            </Button>
            <Button variant="solid" onClick={handleSubmit} loading={isLoading}>
              {t("save")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalEditProject;
