import HeaderTitle from '@/components/template/HeaderTitle';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, {
  deleteForm,
  duplicateForm,
  getForms,
  setForm,
  setNewFormDialog,
  useAppSelector,
} from './store';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Notification, Pagination, Select, toast, Tooltip } from '@/components/ui';
import { Form } from '@/@types/form';
import { HiDuplicate, HiPencil, HiTrash } from 'react-icons/hi';
import { TbForms } from 'react-icons/tb';
import { Loading } from '@/components/shared';

injectReducer('forms', reducer);

function FormsListContent() {
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { forms, total, loading } = useAppSelector((state) => state.forms.data);

  useEffect(() => {
    dispatch(
      getForms({ pagination: { page: currentPage, pageSize }, searchTerm })
    );
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePaginationChange = (page: number) => {
    if (!loading) {
      setCurrentPage(page);
    }
  };

  const pageSizeOption = useMemo(
    () =>
      [10, 25, 50, 100].map((number) => ({
        value: number,
        label: `${number} / page`,
      })),
    [10, 25, 50, 100]
  );

  const handleSelectChange = (value?: number) => {
    if (!loading) {
      setPageSize(Number(value));
      setCurrentPage(1);
    }
  };
  
  const handleEdit = (form: Form) => {
    dispatch(setForm(form));
    setIsOpenNewForm();
  };
  
  const handleDelete = (documentId: string) => {
    dispatch(deleteForm(documentId));
  };
  
  const setIsOpenNewForm = () => {
    dispatch(setNewFormDialog(true));
  };

  const handleDuplicate = (form: Form) => {
    dispatch(duplicateForm(form));
    toast.push(
      <Notification type="success" title="Dupliqué">
        Formulaire dupliqué avec succès
      </Notification>
    );
  };
  return (
    <div className="h-full">
      <HeaderTitle
        title="Formulaires"
        buttonTitle="Créer un formulaire"
        description="Tous les formulaires"
        link={''}
        addAction={true}
        action={setIsOpenNewForm}
        total={total}
      />
      <div className="mb-4">
        <Input
          placeholder={'Rechercher un formulaire'}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <Loading loading={loading}>
        <div className="flex flex-col gap-2 h-full mt-4">
          {forms.map((form) => (
            <Card key={form.documentId} className="bg-gray-900">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TbForms className="text-red-400 text-4xl" />
                  <div className="flex flex-col">
                    <span className="text-lg text-white font-bold">
                      {form.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip title="Modifier le formulaire">
                    <Button
                      variant="plain"
                      size="sm"
                      onClick={() => handleEdit(form)}
                      icon={<HiPencil />}
                    />
                  </Tooltip>
                  <Tooltip title="Dupliquer le formulaire">
                    <Button
                      variant="twoTone"
                      size="sm"
                      onClick={() => handleDuplicate(form)}
                      icon={<HiDuplicate />}
                    />
                  </Tooltip>
                  <Tooltip title="Supprimer le formulaire">
                    <Button
                      variant="twoTone"
                      size="sm"
                      onClick={() => handleDelete(form.documentId)}
                      icon={<HiTrash />}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          ))}
          <div className="flex items-center justify-between mt-4">
          <Pagination
            pageSize={pageSize}
            currentPage={currentPage}
            total={total}
            onChange={handlePaginationChange}
          />
          <div style={{ minWidth: 130 }}>
            <Select
              size="sm"
              menuPlacement="top"
              isSearchable={false}
              value={pageSizeOption.filter(
                (option) => option.value === pageSize
              )}
              options={pageSizeOption}
              onChange={(option) => handleSelectChange(option?.value)}
            />
          </div>
        </div>
        </div>
      </Loading>
    </div>
  );
}

export default FormsListContent;
