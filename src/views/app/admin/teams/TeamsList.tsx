import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './columns';
import { Input } from '@/components/ui';
import { IUser } from '@/@types/user';
import { useNavigate } from 'react-router-dom';
import { apiGetTeams } from '@/services/TeamServices';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { useAppSelector } from './store';

injectReducer('teams', reducer);
// TODO: à voir si à mettre en place.
const TeamsList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { teams, total, loading, selectedTeam } = useAppSelector((state) => state.teams.data);

  useEffect(() => {
    fetchTeams();
  }, [currentPage, pageSize, searchTerm]);

  const fetchTeams = async () => {
    dispatch(getTeams({pagination: {page: currentPage, pageSize}, searchTerm}))
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

export default TeamsList;
