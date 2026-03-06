import HeaderTitle from '@/components/template/HeaderTitle';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  createChecklist,
  deleteChecklist,
  duplicateChecklist,
  getChecklists,
  setChecklist,
  setDialogOpen,
  updateChecklist,
  useAppSelector,
} from './store';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Dialog,
  Input,
  Pagination,
  Select,
  Tooltip,
} from '@/components/ui';
import { Checklist } from '@/@types/checklist';
import { HiDuplicate, HiPencil, HiPlus, HiTrash, HiX } from 'react-icons/hi';
import { MdChecklist } from 'react-icons/md';
import { Loading } from '@/components/shared';
import { toast } from 'react-toastify';

injectReducer('checklists', reducer);

function ChecklistsListContent() {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { checklists, total, loading, checklist, dialogOpen } = useAppSelector(
    (state) => state.checklists.data
  );

  // Form state for the dialog
  const [formName, setFormName] = useState('');
  const [formItems, setFormItems] = useState<string[]>(['']);

  useEffect(() => {
    dispatch(getChecklists({ pagination: { page: currentPage, pageSize }, searchTerm }));
  }, [currentPage, pageSize, searchTerm]);

  // Sync form with selected checklist
  useEffect(() => {
    if (checklist) {
      setFormName(checklist.name);
      setFormItems(checklist.items.length > 0 ? checklist.items : ['']);
    } else {
      setFormName('');
      setFormItems(['']);
    }
  }, [checklist]);

  const openNew = () => {
    dispatch(setChecklist(null));
    dispatch(setDialogOpen(true));
  };

  const openEdit = (c: Checklist) => {
    dispatch(setChecklist(c));
    dispatch(setDialogOpen(true));
  };

  const handleClose = () => {
    dispatch(setDialogOpen(false));
    dispatch(setChecklist(null));
  };

  const handleSave = () => {
    const items = formItems.filter((i) => i.trim() !== '');
    if (!formName.trim() || items.length === 0) {
      toast.error('Nom et au moins une tâche requis');
      return;
    }
    if (checklist?.documentId) {
      dispatch(updateChecklist({ documentId: checklist.documentId, name: formName, items }));
      toast.success('Modèle mis à jour');
    } else {
      dispatch(createChecklist({ name: formName, items }));
      toast.success('Modèle créé');
    }
    handleClose();
  };

  const handleDelete = (documentId: string) => {
    dispatch(deleteChecklist(documentId));
    toast.success('Modèle supprimé');
  };

  const handleDuplicate = (c: Checklist) => {
    dispatch(duplicateChecklist(c));
    toast.success('Modèle dupliqué');
  };

  const addItem = () => setFormItems([...formItems, '']);
  const removeItem = (index: number) =>
    setFormItems(formItems.filter((_, i) => i !== index));
  const updateItem = (index: number, value: string) => {
    const updated = [...formItems];
    updated[index] = value;
    setFormItems(updated);
  };

  const pageSizeOption = useMemo(
    () => [10, 25, 50].map((n) => ({ value: n, label: `${n} / page` })),
    []
  );

  return (
    <div className="h-full">
      <HeaderTitle
        title="Modèles de checklist"
        buttonTitle="Créer un modèle"
        description="Gérer les modèles de checklist associés aux produits"
        link=""
        addAction={true}
        action={openNew}
        total={total}
      />
      <div className="mb-4">
        <Input
          placeholder="Rechercher un modèle"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Loading loading={loading}>
        <div className="flex flex-col gap-2 mt-4">
          {checklists.map((c) => (
            <Card key={c.documentId} className="bg-gray-900">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <MdChecklist className="text-indigo-400 text-4xl" />
                  <div className="flex flex-col">
                    <span className="text-lg text-white font-bold">{c.name}</span>
                    <span className="text-sm text-gray-400">
                      {c.items.length} tâche{c.items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip title="Modifier">
                    <Button variant="plain" size="sm" onClick={() => openEdit(c)} icon={<HiPencil />} />
                  </Tooltip>
                  <Tooltip title="Dupliquer">
                    <Button variant="twoTone" size="sm" onClick={() => handleDuplicate(c)} icon={<HiDuplicate />} />
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <Button variant="twoTone" size="sm" onClick={() => handleDelete(c.documentId)} icon={<HiTrash />} />
                  </Tooltip>
                </div>
              </div>
              {c.items.length > 0 && (
                <ul className="mt-3 pl-2 flex flex-col gap-1">
                  {c.items.slice(0, 5).map((item, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                      <span className="w-4 h-4 rounded border border-gray-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                  {c.items.length > 5 && (
                    <li className="text-xs text-gray-500">
                      + {c.items.length - 5} tâche{c.items.length - 5 > 1 ? 's' : ''}
                    </li>
                  )}
                </ul>
              )}
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <Pagination
            pageSize={pageSize}
            currentPage={currentPage}
            total={total}
            onChange={setCurrentPage}
          />
          <div style={{ minWidth: 130 }}>
            <Select
              size="sm"
              menuPlacement="top"
              isSearchable={false}
              value={pageSizeOption.find((o) => o.value === pageSize)}
              options={pageSizeOption}
              onChange={(o) => { setPageSize(Number(o?.value)); setCurrentPage(1); }}
            />
          </div>
        </div>
      </Loading>

      {/* Dialog create / edit */}
      <Dialog isOpen={dialogOpen} onClose={handleClose} width={600}>
        <div className="flex flex-col gap-4">
          <h5>{checklist?.documentId ? 'Modifier le modèle' : 'Nouveau modèle de checklist'}</h5>
          <div>
            <p className="text-sm font-semibold mb-1">Nom du modèle</p>
            <Input
              placeholder="Ex: Checklist impression offset"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Tâches</p>
            <div className="flex flex-col gap-2">
              {formItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Tâche ${index + 1}`}
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                  />
                  {formItems.length > 1 && (
                    <Button
                      variant="plain"
                      size="sm"
                      icon={<HiX />}
                      onClick={() => removeItem(index)}
                    />
                  )}
                </div>
              ))}
            </div>
            <Button
              className="mt-2"
              variant="plain"
              size="sm"
              icon={<HiPlus />}
              onClick={addItem}
            >
              Ajouter une tâche
            </Button>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="plain" onClick={handleClose}>Annuler</Button>
            <Button variant="solid" onClick={handleSave} loading={loading}>
              {checklist?.documentId ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ChecklistsListContent;
