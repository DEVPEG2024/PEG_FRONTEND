import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
import { useTranslation } from 'react-i18next';
import { IUser } from '@/@types/user';
import useCustomer from '@/utils/hooks/customers/useCustomer';
import { CUSTOMERS_NEW, PRODUCERS_NEW } from '@/constants/navigation.constant';
import { useNavigate } from 'react-router-dom';
import useProducer from '@/utils/hooks/producers/useProducer';
import { apiGetTeams } from '@/services/TeamServices';

const Teams = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [teams, setTeams] = useState<IUser[]>([]);

  useEffect(() => {
    fetchTeams();
  }, [currentPage, pageSize, searchTerm]);

  const fetchTeams = async () => {
    const result = await apiGetTeams(currentPage, pageSize, searchTerm);
    setTeams(result.data.teams || []);
    setTotalItems(result.data.total || 0);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditTeam = (team: IUser) => {
    navigate(`/admin/teams/edit/${team._id}`, {
      state: { teamData: team },
    });
  };

  const columns = useColumns(fetchTeams, handleEditTeam);
  const onPaginationChange = (page: number) => {
    setCurrentPage(page);
  };

  const onSelectChange = (value = 10) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Reset to first page when changing page size
  };
  return (
    <Container>
      <HeaderTitle
        title="Equipe"
        buttonTitle="Ajouter un membre d'équipe"
        description="Gérer les membres de l'équipe"
        link={'/admin/teams/add'}
        addAction
        total={totalItems}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={"Rechercher un membre d'équipe"}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={teams}
          onPaginationChange={onPaginationChange}
          onSelectChange={onSelectChange}
          pagingData={{
            total: totalItems,
            pageIndex: currentPage,
            pageSize: pageSize,
          }}
        />
      </div>
    </Container>
  );
};

export default Teams;
