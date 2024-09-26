
import AdaptableCard from '@/components/shared/AdaptableCard'
import Loading from '@/components/shared/Loading'
import Container from '@/components/shared/Container'
import IconText from '@/components/shared/IconText'
import {
    HiClock,
    HiCalendar,
    HiTag,
    HiTicket,
    HiCheckCircle,
    HiXCircle,
    HiCurrencyEuro,
} from 'react-icons/hi'
import ReactHtmlParser from 'html-react-parser'

import { useAppSelector } from '../lists/store'
import { Button } from '@/components/ui'
import { API_URL_IMAGE } from '@/configs/api.config'
import FormOffer from './forms'
import {  IFormList } from '@/@types/forms'


const DetailOffer = () => {
    const { offer } = useAppSelector((state) => state.offers.data)
  
    const isAccepted = offer?.isAccepted 
    const isRejected = offer?.isRejected
    const isAvailable = offer?.isAvailable
    const Amount = offer?.price
    return (
      <Container className="h-full">
        <Loading>
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AdaptableCard rightSideBorder bodyClass="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="mb-2 font-bold">{offer?.title}</h3>
                    <p>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 mx-1 cursor-pointer">
                        Offre N° : {offer?.ref}
                      </span>
                      pour : {offer?.customer.companyName} |{" "}
                      {offer?.customer.firstName} - {offer?.customer.lastName}
                    </p>
                  </div>
                </div>
                <hr className="my-6" />
                <div className="text-base">
                  <div className="prose dark:prose-invert max-w-none">
                    {ReactHtmlParser(offer?.description || "")}
                  </div>
                </div>

                <hr className="my-6" />
                <FormOffer
                  fields={offer?.form as IFormList}
                  isAccepted={isAccepted || false}
                  isRejected={isRejected || false}
                  isAvailable={isAvailable || false}
                />
              </AdaptableCard>
            </div>
            <div>
              <AdaptableCard bodyClass="p-5">
                <h4 className="mb-6">Détails</h4>
                <IconText
                  className={`mb-4 ${
                    !isAvailable ? "text-yellow-500" : "text-emerald-500"
                  }`}
                  icon={<HiClock className="text-lg" />}
                >
                  <span className="font-semibold">
                    {!isAvailable ? "Non Disponible" : "Disponible"}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiTag className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Accepté : {isAccepted ? "Oui" : "Non"}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiTicket className="text-lg opacity-70" />}
                >
                  <span className="font-semibold cursor-pointer">
                    Rejeté : {isRejected ? "Oui" : "Non"}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiCurrencyEuro className="text-lg opacity-70" />}
                >
                  <span className="font-semibold text-emerald-500">
                    Montant : {Amount ? Amount.toFixed(2) : 0} €
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiCalendar className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Créer le :{" "}
                    {offer?.createdAt
                      ? new Date(offer.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </IconText>
                <hr className="my-6" />
                <div className="flex flex-col gap-2">
                  <Button
                    variant="solid"
                    color="green"
                    className="flex items-center justify-center gap-2"
                  >
                    <HiCheckCircle className="text-lg opacity-70" />
                    Accepter
                  </Button>
                  <Button
                    variant="solid"
                    color="red"
                    className="flex items-center justify-center gap-2"
                  >
                    <HiXCircle className="text-lg opacity-70" />
                    Rejeter
                  </Button>
                </div>
                <hr className="my-6" />
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-4">
                    {offer?.images.map((image, index) => (
                      <img
                        key={index}
                        src={API_URL_IMAGE + image}
                        alt={offer?.title}
                        className=" h-40 w-40 rounded-lg bg-yellow-400 cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              </AdaptableCard>
            </div>
          </div>
        </Loading>
      </Container>
    );
}

export default DetailOffer
