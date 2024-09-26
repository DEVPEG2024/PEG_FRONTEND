
import { injectReducer } from '@/store'
import reducer, {

  getOffers,
  useAppDispatch,
  useAppSelector,
  setModalDeleteOpen,
  setModalDeleteClose,
  setOffer,
  putStatusOffer,
  deleteOffer,
  
} from "./store";
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Dialog, Notification, Switcher, Tooltip, toast } from '@/components/ui'
import { HiPencil, HiPlusCircle, HiTrash } from 'react-icons/hi'
import { isEmpty } from 'lodash'
import { AuthorityCheck, DoubleSidedImage } from '@/components/shared'
import { API_URL_IMAGE } from '@/configs/api.config';
import { IOffer } from '@/@types/offer';
import { truncatedText } from '@/utils/truncatedText';
import { SUPER_ADMIN } from '@/constants/roles.constant';


injectReducer("offers", reducer);

const OffersLists = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const [id, setId] = useState("")
    const {offers, modalDelete} = useAppSelector((state) => state.offers.data)
    useEffect(() => {
       dispatch(getOffers({page: 1, pageSize: 10, searchTerm: ""}))
       dispatch(setOffer(null))
    }, [dispatch])

    const onDeleted = () => {
        dispatch(deleteOffer({id}))
        dispatch(setModalDeleteClose());
    }
    const onEdit = (id: string) => {
        dispatch(setOffer(id))
        navigate(`/admin/offers/edit/${id}`)
    }
    const onModalOpen = (id: string) => {
        setId(id)
        dispatch(setModalDeleteOpen())
    }
    const onModalClose = () => {
        setId("")
        dispatch(setModalDeleteClose())
    }
    const onDetails = (id: string) => {
        dispatch(setOffer(id))
        navigate(`/admin/offers/details/${id}`)
    }
    const onActivate = (id: string, checked: boolean) => {
        dispatch(putStatusOffer({id}))
        if(!checked){
            toast.push(
                <Notification type="success" title="Activé">
                  Offre activée avec succès
                </Notification>
            )
        }else{
            toast.push(
              <Notification type="danger" title="Désactivé">
                Offre désactivée avec succès
              </Notification>
            );
        }
    }
    return (
      <>
        <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
          <h3 className="mb-4 lg:mb-0 col-span-1">Offres</h3>
          <div className="flex col-span-2 items-center justify-end">
            <Link className="ml-4" to="/admin/offers/new">
              <Button block variant="solid" size="sm" icon={<HiPlusCircle />}>
                Ajouter une offre
              </Button>
            </Link>
          </div>
        </div>

        {isEmpty(offers) && (
          <div className="h-full flex flex-col items-center justify-center">
            <DoubleSidedImage
              src="/img/others/img-2.png"
              darkModeSrc="/img/others/img-2-dark.png"
              alt="Aucun licencié trouvé"
            />
            <h3 className="mt-8">Aucune offre trouvée</h3>
          </div>
        )}
        {!isEmpty(offers) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer: IOffer) => (
              <Card
                key={offer._id}
                className="flex flex-col gap-4 bg-gray-900 rounded-lg project-card"
               
              >
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <img
                      src={API_URL_IMAGE + offer.images[0]}
                      alt={offer.title}
                      className=" h-40 w-40 rounded-lg bg-yellow-400 cursor-pointer"
                      onClick={() => onDetails(offer._id)}
                    />
                    <div  > 
                      <p className="text-lg font-bold">{offer.title}</p>
                      <p className="text-lg font-bold text-emerald-500">
                        {offer.price}€
                      </p>
                      <div className="text-sm text-gray-500 cursor-pointer" onClick={() => onDetails(offer._id)}>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: truncatedText(offer.description, 100),
                          }}
                        />
                      </div>
                      <p className="text-xs mt-4">
                        Client : {offer.customer?.firstName}{" "}
                        {offer.customer?.lastName}
                      </p>
                      <AuthorityCheck
                        userAuthority={["super_admin"]}
                        authority={[SUPER_ADMIN]}
                      >
                        <div className="flex gap-4 items-center ">
                          <Button
                            className="mt-4 "
                            variant="twoTone"
                            size="sm"
                            onClick={() => onEdit(offer._id)}
                            icon={<HiPencil />}
                          >
                            Modifier
                          </Button>
                          <Tooltip title="Activer/Désactiver le produit">
                            <Switcher
                              checked={offer.isAvailable}
                              onChange={(checked) =>
                                onActivate(offer._id, checked)
                              }
                              className="mt-4"
                            />
                          </Tooltip>
                          <Button
                            className="mt-4 "
                            variant="plain"
                            onClick={() => onModalOpen(offer._id)}
                            size="sm"
                            icon={<HiTrash />}
                          />
                        </div>
                      </AuthorityCheck>
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
                <p>Êtes-vous sûr de vouloir supprimer cette offre ?</p>
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

export default OffersLists