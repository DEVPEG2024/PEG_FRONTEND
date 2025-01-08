import { Container, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { Input, Pagination, Select } from '@/components/ui';
import { useTranslation } from 'react-i18next';

import ProjectListContent from './lists/components/ProjectListContent';
import reducer, {
  deleteProject,
  getProjects,
  setNewProjectDialog,
  useAppDispatch,
  useAppSelector,
} from './store';
import { injectReducer } from '@/store';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { Project } from '@/@types/project';
import ModalNewProject from './modals/ModalNewProject';

injectReducer('projects', reducer);

type Option = {
  value: number;
  label: string;
};
const options: Option[] = [
  { value: 6, label: '6 / page' },
  { value: 12, label: '12 / page' },
  { value: 18, label: '18 / page' },
  { value: 24, label: '24 / page' },
  { value: 30, label: '30 / page' },
];
const ProjectsList = () => {
  const { t } = useTranslation();
  const {user}: {user: User} = useAppSelector((state) => state.auth.user);
  const isAdminOrSuperAdmin: boolean = hasRole(user, [SUPER_ADMIN, ADMIN])
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [searchTerm, setSearchTerm] = useState('');
  const dispatch = useAppDispatch();

  const { total, projects, loading, newProjectDialog } = useAppSelector(
    (state) => state.projects.data
  );

  useEffect(() => {
    fetchProjects();
  }, [currentPage, pageSize, searchTerm]);

  const fetchProjects = async () => {
    dispatch(
      getProjects({
        user,
        pagination: {
          page: currentPage,
          pageSize
        },
        searchTerm
      })
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteProject = async (project: Project) => {
    dispatch(deleteProject(project.documentId));
  };

  const onPageSelect = ({ value }: Option) => {
    setPageSize(value);
  };
  const setIsOpenNewProject = () => {
    dispatch(setNewProjectDialog(true));
  };

  return (
    <Container className="h-full">
      <HeaderTitle
        title="projects.projects"
        buttonTitle="projects.add"
        description="projects.description"
        link={''}
        addAction={isAdminOrSuperAdmin}
        action={setIsOpenNewProject}
        total={total}
      />
      <div className="mt-4">
        <div className="mb-4">
          <Input
            placeholder={t('projects.search')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        {/*List view *Project*/}
        <Loading loading={loading}>
          <ProjectListContent projects={projects} handleDeleteProject={handleDeleteProject} />
        </Loading>
        <div className="flex justify-end mt-10">
          <Pagination
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
          />
          <div style={{ minWidth: 120 }}>
            <Select
              size="sm"
              isSearchable={false}
              defaultValue={options[0]}
              options={options}
              onChange={(selected) => onPageSelect(selected as Option)}
            />
          </div>
        </div>
      </div>
      {newProjectDialog && <ModalNewProject />}
    </Container>
  );
};

export default ProjectsList;
