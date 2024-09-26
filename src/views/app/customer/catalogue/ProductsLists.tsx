
import { injectReducer } from '@/store'
import reducer, {
  useAppDispatch,
  useAppSelector,
  setModalDeleteOpen,
  setModalDeleteClose,
  setProduct,
  putStatusProduct,
  deleteProduct,
  getProductsByCategory,
  
} from "./store";
import { Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Dialog, Notification, Switcher, Tooltip, toast } from '@/components/ui'
import { HiPencil, HiTrash } from 'react-icons/hi'
import { isEmpty } from 'lodash'
import { API_URL_IMAGE } from '@/configs/api.config';
import { useParams } from 'react-router-dom';
import { DoubleSidedImage } from '@/components/shared';
injectReducer("products", reducer);

const ProductsLists = () => {
    const {id} = useParams();
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [productId, setProductId] = useState("")
    const {products, modalDelete} = useAppSelector((state) => state.products.data)
    useEffect(() => {
       dispatch(getProductsByCategory(id as string))
       dispatch(setProduct(null))
    }, [dispatch])

    const onDeleted = () => {
        dispatch(deleteProduct({id: productId}))
        dispatch(setModalDeleteClose());
    }
    const onEdit = (id: string) => {
        dispatch(setProduct(id))
        navigate(`/admin/store/edit/${id}`)
    }
    const onModalOpen = (id: string) => {
        setProductId(id)
        dispatch(setModalDeleteOpen())
    }
    const onModalClose = () => {
        setProductId("")
        dispatch(setModalDeleteClose())
    }
    
    const onActivate = (id: string, checked: boolean) => {
        dispatch(putStatusProduct({id: productId}))
        if(!checked){
            toast.push(
                <Notification type="success" title="Activé">
                  Produit activé avec succès
                </Notification>
            )
        }else{
            toast.push(
              <Notification type="danger" title="Désactivé">
                Produit désactivé avec succès
              </Notification>
            );
        }
    }
    
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
          <h3 className="mb-4 lg:mb-0 col-span-1">Produits</h3>
        </div>

        {isEmpty(products) && (
          <div className="h-full flex flex-col items-center justify-center">
            <DoubleSidedImage
              src="/img/others/img-2.png"
              darkModeSrc="/img/others/img-2-dark.png"
              alt="Aucun licencié trouvé"
            />
            <h3 className="mt-8">Aucun produit trouvé</h3>
          </div>
        )}
        {!isEmpty(products) && (
          <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <Card key={product._id}>
                <div className="flex flex-col gap-4">
                  <img
                    src={API_URL_IMAGE + product.images[0]}
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
                      <Button
                        className="mt-4 "
                        variant="plain"
                        onClick={() => onModalOpen(product._id)}
                        size="sm"
                        icon={<HiTrash />}
                      />
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
      </Suspense>
    );
}

export default ProductsLists
