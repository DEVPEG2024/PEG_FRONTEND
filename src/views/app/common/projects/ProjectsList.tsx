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
import { Customer } from '@/@types/customer';

injectReducer('projects', reducer);

type PageSelection = {
  value: number;
  label: string;
};
const pageSelections: PageSelection[] = [
  { value: 6, label: '6 / page' },
  { value: 12, label: '12 / page' },
  { value: 18, label: '18 / page' },
  { value: 24, label: '24 / page' },
  { value: 30, label: '30 / page' },
];
const ProjectsList = () => {
  const { t } = useTranslation();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const isAdminOrSuperAdmin: boolean = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSelections[4].value);

  const [searchTerm, setSearchTerm] = useState('');
  const [customersSelected, setCustomersSelected] = useState<string[]>([]);
  const dispatch = useAppDispatch();

  const { total, projects, loading, newProjectDialog } = useAppSelector(
    (state) => state.projects.data
  );

  const customerOptions = Array.from(
    projects
      .reduce((map, { customer }) => {
        if (customer && !map.has(customer.documentId)) {
          map.set(customer.documentId, {
            value: customer.documentId,
            label: customer.name,
          });
        }
        return map;
      }, new Map<string, { value: string; label: string }>())
      .values()
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
          pageSize,
        },
        searchTerm,
      })
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterByCustomers = (customerDocumentIds: string[]) => {
    setCustomersSelected(customerDocumentIds);
    setCurrentPage(1);
  };

  const handleDeleteProject = async (project: Project) => {
    dispatch(deleteProject(project.documentId));
  };

  const onPageSelect = ({ value }: PageSelection) => {
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
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <Input
              className="w-full"
              placeholder={t('projects.search')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Select
              className="w-full"
              isMulti
              size="md"
              placeholder="Client"
              isSearchable={true}
              options={customerOptions}
              onChange={(selectedCustomers) =>
                handleFilterByCustomers(
                  selectedCustomers.map((customer) => customer.value)
                )
              }
            />
          </div>
        </div>
        {/*List view *Project*/}
        <Loading loading={loading}>
          <ProjectListContent
            projects={
              customersSelected.length > 0
                ? projects.filter((project) =>
                    customersSelected.includes(
                      project.customer?.documentId || ''
                    )
                  )
                : projects
            }
            handleDeleteProject={handleDeleteProject}
          />
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
              options={customerOptions}
              onChange={(selected) =>
                onPageSelect(selected?.value as PageSelection)
              }
            />
          </div>
        </div>
      </div>
      {newProjectDialog && <ModalNewProject />}
    </Container>
  );
};

export default ProjectsList;
