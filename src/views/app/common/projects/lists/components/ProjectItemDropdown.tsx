import Dropdown from '@/components/ui/Dropdown';
import { HiExclamation, HiOutlineTrash, HiX } from 'react-icons/hi';
import EllipsisButton from '@/components/shared/EllipsisButton';
import { TbPigMoney } from 'react-icons/tb';
import { useState } from 'react';
import { Project } from '@/@types/project';

const ProjectItemDropdown = ({
  handleDeleteProject,
  project,
  setIsPayProducerOpen,
}: {
  handleDeleteProject: (project: Project) => void;
  project: Project;
  setIsPayProducerOpen: (value: boolean) => void;
}) => {
  const [isValidDeleteOpen, setIsValidDeleteOpen] = useState(false);
  const dropdownList = [
    {
      label: 'Supprimer',
      value: 'delete',
      icon: <HiOutlineTrash />,
      action: () => handleDelete(),
      condition: () => true,
    },
    {
      label: 'Payer le producteur',
      value: 'payProducer',
      icon: <TbPigMoney />,
      action: () => setIsPayProducerOpen(true),
      condition: (selectedProject: Project) => selectedProject.producer,
    },
  ];
  const handleDelete = () => {
    setIsValidDeleteOpen(true);
  };
  const handleConfirmDelete = () => {
    handleDeleteProject(project);
    setIsValidDeleteOpen(false);
  };
  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <Dropdown placement="bottom-end" renderTitle={<EllipsisButton />}>
        {dropdownList
          .filter((dropdownItem) => dropdownItem.condition(project))
          .map((item) => (
            <Dropdown.Item
              key={item.value}
              eventKey={item.value}
              onClick={() => item.action()}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="ml-2 rtl:mr-2">{item.label}</span>
            </Dropdown.Item>
          ))}
      </Dropdown>
      {isValidDeleteOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}
          onClick={() => setIsValidDeleteOpen(false)}
        >
          <div
            style={{ background: 'linear-gradient(160deg, #1a2d47, #0f1c2e)', borderRadius: '20px', padding: '28px', width: '420px', maxWidth: '95vw', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', border: '1.5px solid rgba(255,255,255,0.08)', animation: 'slideUp 0.25s ease', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                onClick={() => setIsValidDeleteOpen(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <HiX size={15} />
              </button>
            </div>
            {/* Warning icon */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiExclamation size={28} style={{ color: '#f87171' }} />
              </div>
            </div>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Suppression du projet</h3>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px', margin: '0 0 28px' }}>Voulez-vous vraiment supprimer ce projet ?</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => setIsValidDeleteOpen(false)}
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ padding: '10px 20px', background: 'linear-gradient(90deg, #ef4444, #dc2626)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 14px rgba(239,68,68,0.4)' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectItemDropdown;
