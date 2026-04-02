import classNames from 'classnames';
import ProjectItem from './ProjectItem';
import { Project } from '@/@types/project';
import { useEffect, useState } from 'react';
import { RootState, useAppSelector } from '@/store';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';

const PEG_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';

const ProjectListContent = ({
  projects,
  handleDeleteProject,
}: {
  projects: Project[];
  handleDeleteProject?: (project: Project) => void;
}) => {
  const { user } = useAppSelector((state: RootState) => state.auth.user);
  const isAdmin = hasRole(user, [SUPER_ADMIN, ADMIN]);
  const [viewsMap, setViewsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin || projects.length === 0) return;
    const fetchViews = async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        projects.map((p) =>
          fetch(`${PEG_BACKEND_URL}/projects/view/${p.documentId}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.views?.length > 0) {
                map[p.documentId] = data.views[0].last_seen;
              }
            })
            .catch(() => {})
        )
      );
      setViewsMap(map);
    };
    fetchViews();
  }, [isAdmin, projects]);

  return (
    <div className={classNames('mt-6 h-full flex flex-col')}>
      <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {projects.map((project) => (
          <ProjectItem
            key={project.documentId}
            project={project}
            handleDeleteProject={handleDeleteProject}
            customerLastSeen={viewsMap[project.documentId]}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectListContent;
