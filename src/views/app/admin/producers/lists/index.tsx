import {  Container, DataTable } from "@/components/shared";
import HeaderTitle from "@/components/template/HeaderTitle";
import { useEffect, useState } from "react";
import { useColumns } from "./columns";
import { Input } from "@/components/ui";
import { useTranslation } from "react-i18next";
import { IUser } from "@/@types/user";
import useCustomer from "@/utils/hooks/customers/useCustomer";
import { CUSTOMERS_NEW, PRODUCERS_NEW } from "@/constants/navigation.constant";
import { useNavigate } from "react-router-dom";
import useProducer from "@/utils/hooks/producers/useProducer";


const Producers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const { getProducers } = useProducer()
  const [producers, setProducers] = useState<IUser[]>([])

  useEffect(() => {
    fetchProducers();
  }, [currentPage, pageSize, searchTerm]);

  const fetchProducers = async () => {
    const result = await getProducers(currentPage, pageSize, searchTerm);
    setProducers(result.data || []);
    setTotalItems(result.total || 0);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditProducer = (producer: IUser) => {
    navigate(`/admin/producers/edit/${producer._id}`, {
      state: { producerData: producer }
    });
  }

  const columns = useColumns(fetchProducers, handleEditProducer);
const onPaginationChange = (page: number) => {
  setCurrentPage(page);
}

const onSelectChange = (value = 10) => {
  setPageSize(Number(value));
  setCurrentPage(1); // Reset to first page when changing page size
}
  return (
    <Container>
      <HeaderTitle
        title="p.producers"
        buttonTitle="p.add"
        description="p.description"
        link={PRODUCERS_NEW}
        addAction
        total={totalItems}
      />
        <div className="mt-4">
          <div className="mb-4">
            <Input
              placeholder={t("p.search")}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <DataTable
            columns={columns}
            data={producers}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            pagingData={{
              total: totalItems,
              pageIndex: currentPage ,
              pageSize: pageSize,
            }}
          />
        </div>
   
    </Container>
  );
}

export default Producers
