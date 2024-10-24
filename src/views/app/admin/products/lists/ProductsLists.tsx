
import { injectReducer } from '@/store'
import reducer, {
  getProducts,
  useAppDispatch,
  useAppSelector,
  setModalDeleteOpen,
  setModalDeleteClose,
  setProduct,
  putStatusProduct,
  deleteProduct,
  duplicateProduct,
} from "../store";
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Dialog, Notification, Switcher, Tooltip, toast } from '@/components/ui'
import { HiDuplicate, HiPencil, HiPlusCircle, HiTrash } from 'react-icons/hi'
import { isEmpty } from 'lodash'
import { IProduct } from '@/@types/product';

injectReducer("products", reducer);

const ProductsLists = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [productToDelete, setProductToDelete] = useState<IProduct>()
  const { products, modalDelete } = useAppSelector((state) => state.products.data)
  useEffect(() => {
    dispatch(getProducts({ page: 1, pageSize: 10, searchTerm: "" }))
    dispatch(setProduct(null))
  }, [dispatch])

  const onDeleted = () => {
    dispatch(deleteProduct({ product: productToDelete as IProduct }))
    dispatch(setModalDeleteClose());
  }
  const onEdit = (id: string) => {
    dispatch(setProduct(id))
    navigate(`/admin/store/edit/${id}`)
  }
  const onModalOpen = (product: IProduct) => {
    setProductToDelete(product)
    dispatch(setModalDeleteOpen())
  }
  const onModalClose = () => {
    setProductToDelete(undefined)
    dispatch(setModalDeleteClose())
  }

  const onActivate = (id: string, checked: boolean) => {
    dispatch(putStatusProduct({ id }))
    if (!checked) {
      toast.push(
        <Notification type="success" title="Activé">
          Produit activé avec succès
        </Notification>
      )
    } else {
      toast.push(
        <Notification type="danger" title="Désactivé">
          Produit désactivé avec succès
        </Notification>
      );
    }
  }

  const onDuplicate = async (product: IProduct) => {
    dispatch(duplicateProduct({ product }))
    toast.push(
      <Notification type="success" title="Activé">
        Produit dupliqué avec succès
      </Notification>
    )
  }

  return (
    <>
      <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
        <h3 className="mb-4 lg:mb-0 col-span-1">Produits</h3>
        <div className="flex col-span-2 items-center justify-end">
          <Link className="ml-4" to="/admin/store/new">
            <Button block variant="solid" size="sm" icon={<HiPlusCircle />}>
              Ajouter un produit
            </Button>
          </Link>
        </div>
      </div>

      {/* {isEmpty(products) && (
          <div className="h-full flex flex-col items-center justify-center">
            <DoubleSidedImage
              src="/img/others/img-2.png"
              darkModeSrc="/img/others/img-2-dark.png"
              alt="Aucun licencié trouvé"
            />
            <h3 className="mt-8">Aucun produit trouvé</h3>
          </div>
        )} */}
      {!isEmpty(products) && (
        <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <Card key={product._id}>
              <div className="flex flex-col gap-4">
                <img
                  src={product.images[0]?.fileNameBack}
                  alt={product.title}
                  className=" rounded-lg bg-yellow-400"
                  style={{
                    height: "250px",
                    width: "100%",
                    objectFit: "cover",
                  }}
                />
                <div className="flex flex-col justify-between">
                  <p className="text-lg font-bold">{product.title}</p>
                  <p className="text-lg font-bold text-white">
                    {product.amount}€
                  </p>
                  {product.stock > 0 ? (
                    <p className="text-sm text-emerald-500">En stock</p>
                  ) : (
                    <p className="text-sm text-red-500">Rupture de stock</p>
                  )}
                  <div className="flex gap-4 items-center ">
                    <Button
                      className="mt-4 "
                      variant="twoTone"
                      size="sm"
                      onClick={() => onEdit(product._id)}
                      icon={<HiPencil />}
                    >
                      Modifier
                    </Button>
                    <Tooltip title="Activer/Désactiver le produit">
                      <Switcher
                        checked={product.isActive}
                        onChange={(checked) => onActivate(product._id, checked)}
                        className="mt-4"
                      />
                    </Tooltip>
                    <Tooltip title="Dupliquer le produit">
                      <Button
                        className="mt-4 "
                        variant="plain"
                        onClick={() => onDuplicate(product)}
                        size="sm"
                        icon={<HiDuplicate />}
                      />
                    </Tooltip>
                    <Tooltip title="Supprimer le produit">
                      <Button
                        className="mt-4 "
                        variant="plain"
                        onClick={() => onModalOpen(product)}
                        size="sm"
                        icon={<HiTrash />}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <Dialog
            isOpen={modalDelete}
            onClose={onModalClose}
            onRequestClose={onModalClose}
          >
            <div className="flex flex-col  gap-4">
              <h3 className="text-xl font-bold">Suppression</h3>
              <p>Êtes-vous sûr de vouloir supprimer ce produit ?</p>
              <div className="flex justify-end gap-4">
                <Button
                  variant="plain"
                  onClick={() => {
                    dispatch(setModalDeleteClose());
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
    </>
  );
}

export default ProductsLists
