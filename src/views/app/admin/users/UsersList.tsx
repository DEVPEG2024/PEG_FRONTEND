import { Container, DataTable, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { useColumns } from './UserColumns';
import { Input } from '@/components/ui';
import { User } from '@/@types/user';
import { useNavigate } from 'react-router-dom';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteUser,
  getUsers,
  getUsersIdTable,
  updateUser,
  useAppSelector,
} from './store';

injectReducer('users', reducer);

const UsersList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { users, total, loading, usersId } = useAppSelector(
    (state) => state.users.data
  );

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize, searchTerm]);

  const fetchUsers = async () => {
    dispatch(
      getUsers({ pagination: { page: currentPage, pageSize }, searchTerm })
    );
    dispatch(getUsersIdTable());
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEditUser = (user: User) => {
    navigate(`/admin/users/edit/${user.documentId}`);
  };

  const handleBlockUser = async (user: User, id: number) => {
    dispatch(updateUser({ user: { blocked: !user.blocked }, id }));
  };

  const handleDeleteUser = (id: number) => {
    dispatch(deleteUser(id));
  };

  const columns = useColumns(
    handleEditUser,
    handleBlockUser,
    handleDeleteUser,
    usersId
  );
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
        title="Utilisateurs"
        buttonTitle="Ajouter un utilisateur"
        description="Gérer les utilisateurs"
        link={'/admin/users/add'}
        addAction
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={'Rechercher un utilisateur'}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <Loading loading={loading}>
          <DataTable
            columns={columns}
            data={users}
            onPaginationChange={onPaginationChange}
            onSelectChange={onSelectChange}
            pagingData={{
              total,
              pageIndex: currentPage,
              pageSize: pageSize,
            }}
          />
        </Loading>
      </div>
    </Container>
  );
};

export default UsersList;
