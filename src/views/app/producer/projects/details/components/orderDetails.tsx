import AdaptableCard from '@/components/shared/AdaptableCard'
import IconText from '@/components/shared/IconText'
import {
    HiUser,
    HiAdjustments,
    HiHashtag,
    HiOfficeBuilding,
    HiBookOpen,
} from 'react-icons/hi'
import { IOrder } from '@/@types/order'
import { SizeSelection } from '@/@types/product'

const OrderDetails = ({order}: {order: IOrder}) => {

    const customer: string = order.customer.firstName + " " + order.customer.lastName
    const company: string = order.customer.companyName
    const orderNumber: string = order.orderNumber
    const productTitle: string = order.product.title
    const productSizes: SizeSelection[] = order.sizes

    return (
          <div>
              <AdaptableCard bodyClass="p-5">
                <h4 className="mb-6">Détails de la commande</h4>
                <IconText
                  className="mb-4"
                  icon={<HiUser className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">{customer}</span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiOfficeBuilding className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    {company}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiHashtag className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    {orderNumber}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiBookOpen className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    {productTitle}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiAdjustments className="text-lg opacity-70" />}
                >
                  <span className="font-semibold flex-col justify-center gap-2">
                  {productSizes.map((size) => (
                          <p>{size.value === "DEFAULT" ? "Quantité" : size.value} : {size.quantity}</p>
                        ))}
                  </span>
                </IconText>
              </AdaptableCard>
        </div>
    );
}

export default OrderDetails
