import { injectReducer, RootState } from '@/store';
import reducer, {
  getProducts,
  useAppDispatch,
  useAppSelector,
  setModalDeleteProductOpen,
  setModalDeleteProductClose,
  deleteProduct,
  duplicateProduct,
  updateProduct
} from './store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  Input,
  Pagination,
  Select
} from '@/components/ui';
import { isEmpty } from 'lodash';
import { Product } from '@/@types/product';
import { Container, Loading } from '@/components/shared';
import HeaderTitle from '@/components/template/HeaderTitle';
import { User } from '@/@types/user';
import { hasRole } from '@/utils/permissions';
import { ADMIN, SUPER_ADMIN } from '@/constants/roles.constant';
import { OrderItem } from '@/@types/orderItem';
import { apiGetPendingOrderItemsLinkedToProduct } from '@/services/OrderItemServices';
import { unwrapData } from '@/utils/serviceHelper';
import { PegFile } from '@/@types/pegFile';
import { apiDeleteFiles, apiLoadPegFilesAndFiles } from '@/services/FileServices';
import { toast } from 'react-toastify';
import ProductCard from './ProductCard';

injectReducer('products', reducer);

const ProductsList = () => {
  const dispatch = useAppDispatch();
  const { user }: { user: User } = useAppSelector(
      (state: RootState) => state.auth.user
    );
  const isAdminOrSuperAdmin: boolean = hasRole(user, [ADMIN, SUPER_ADMIN]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isAdminOrSuperAdmin ? 100 : 10);
  const [searchTerm, setSearchTerm] = useState('');
  const [productToDelete, setProductToDelete] = useState<Product>();
  const {
    products,
    modalDeleteProduct,
    loading,
    total,
  } = useAppSelector((state) => state.products.data);
  useEffect(() => {
    dispatch(
      getProducts({ pagination: { page: currentPage, pageSize }, searchTerm })
    );
  }, [currentPage, pageSize, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const onDeleted = async () => {
    if (productToDelete) {
      dispatch(deleteProduct(productToDelete.documentId));
      
      const pegFilesToDelete: PegFile[] = await apiLoadPegFilesAndFiles(productToDelete.images);
    
      apiDeleteFiles(pegFilesToDelete.map((pegFileToDelete) => pegFileToDelete.id))
    }
    dispatch(setModalDeleteProductClose());
  };

  const onDeleteModalOpen = async (product: Product) => {
    const {orderItems: pendingOrderItemsLinkedToProduct}: {orderItems: OrderItem[]} = await unwrapData(apiGetPendingOrderItemsLinkedToProduct(product.documentId))

    if (pendingOrderItemsLinkedToProduct.length > 0) {
      toast.warn("Au moins une commande en cours est rattachée à ce produit")
    } else {
      setProductToDelete(product);
      dispatch(setModalDeleteProductOpen());
    }
  };

  const onDeleteModalClose = () => {
    setProductToDelete(undefined);
    dispatch(setModalDeleteProductClose());
  };

  const onActivate = (product: Product, checked: boolean) => {
    dispatch(
      updateProduct({ documentId: product.documentId, active: !checked })
    );
    if (!checked) {
      toast.success("Produit activé")
    } else {
      toast.success("Produit désactivé")
    }
  };

  const onDuplicate = async (product: Product) => {
    dispatch(duplicateProduct(product));
      toast.success("Produit dupliqué")
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

  const handleOnDeleteModalOpenSetProductToDelete = useCallback((product: Product) => {
    onDeleteModalOpen(product);
  }, []);

  const handleOnActivate = useCallback((product: Product, checked: boolean) => {
    onActivate(product, checked);
  }, []);

  const handleOnDuplicate = useCallback((product: Product) => {
    onDuplicate(product);
  }, []);

  return (
    <Container>
      <HeaderTitle
        title="Produits"
        description="Gérer les produits"
        total={total}
        buttonTitle="Ajouter un produit"
        link="/admin/products/new"
        addAction={true}
      />
      <div className="mb-4">
        <Input
          placeholder={'Rechercher un produit'}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      <Loading loading={loading} type='cover'>
        {/* {isEmpty(products) && (
          <div className="h-full flex flex-col items-center justify-center">
            <DoubleSidedImage
              src="/img/others/img-2.png"
              darkModeSrc="/img/others/img-2-dark.png"
              alt="Aucun produit trouvé"
            />
            <h3 className="mt-8">Aucun produit trouvé</h3>
          </div>
        )} */}
        {!isEmpty(products) && (
          <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mt-4">
            {products.map((product) => (<ProductCard key={product.documentId} product={product} onDeleteModalOpen={handleOnDeleteModalOpenSetProductToDelete} onActivate={handleOnActivate} onDuplicate={handleOnDuplicate}/>))}
            <Dialog
              isOpen={modalDeleteProduct}
              onClose={onDeleteModalClose}
              onRequestClose={onDeleteModalClose}
            >
              <div className="flex flex-col  gap-4">
                <h3 className="text-xl font-bold">Suppression</h3>
                <p>Êtes-vous sûr de vouloir supprimer ce produit ?</p>
                <div className="flex justify-end gap-4">
                  <Button
                    variant="plain"
                    onClick={() => {
                      dispatch(setModalDeleteProductClose());
                    }}
                  >
                    Annuler
                  </Button>
                  <Button variant="solid" onClick={onDeleted}>
                    Supprimer
                  </Button>
                </div>
              </div>
            </Dialog>
          </div>
        )}
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
      </Loading>
    </Container>
  );
};

export default ProductsList;
