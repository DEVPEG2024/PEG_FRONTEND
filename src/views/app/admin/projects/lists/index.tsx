import { Container, DataTable } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { useEffect, useState } from 'react';
import { Input, Pagination, Select } from '@/components/ui';
import { useTranslation } from 'react-i18next';

import ProjectListContent from './components/ProjectListContent';
import useDeleteProject from '@/utils/hooks/projects/useDeleteProject';
import reducer, {
  getProjects,
  setNewProjectDialog,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { injectReducer } from '@/store';


injectReducer('adminProjects', reducer);

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
const Projects = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [searchTerm, setSearchTerm] = useState('');
  const { deleteProject } = useDeleteProject();
  const dispatch = useAppDispatch();

  const { total, projects } = useAppSelector(
    (state) => state.adminProjects.data
  );

  useEffect(() => {
    fetchProjects();
  }, [currentPage, pageSize, searchTerm]);

  const fetchProjects = async () => {
    dispatch(getProjects({pagination: {page: currentPage, pageSize}, searchTerm }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    fetchProjects();
  };

  const onPageSelect = ({ value }: Option) => {
    setPageSize(value);
  };
  const setIsOpenNewProject = () => {
    dispatch(setNewProjectDialog(true));
  };

  return (
    <Container>
      <HeaderTitle
        title="projects.projects"
        buttonTitle="projects.add"
        description="projects.description"
        link={''}
        addAction={true}
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
        <ProjectListContent
          projects={projects}
          handleDeleteProject={handleDeleteProject}
        />
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
              defaultValue={options[4]}
              options={options}
              onChange={(selected) => onPageSelect(selected as Option)}
            />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Projects;
