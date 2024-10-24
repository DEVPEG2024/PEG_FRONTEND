import AdaptableCard from '@/components/shared/AdaptableCard'
import IconText from '@/components/shared/IconText'
import {
    HiUser,
    HiAdjustments,
    HiHashtag,
    HiOfficeBuilding,
    HiBookOpen,
    HiInformationCircle,
} from 'react-icons/hi'
import { IOrder } from '@/@types/order'
import { SizeSelection } from '@/@types/product'
import { Button } from '@/components/ui'
import { injectReducer, useAppDispatch } from '@/store'
import { useNavigate } from 'react-router-dom'
import reducer, { showOrder } from '@/views/app/admin/orders/store' // TODO: A gérer différemment --> appel de admin depuis customer

injectReducer("orders", reducer);

const OrderDetails = ({order}: {order: IOrder}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

    const customer: string = order.customer.firstName + " " + order.customer.lastName
    const company: string = order.customer.companyName
    const orderNumber: string = order.orderNumber
    const productTitle: string = order.product.title
    const productSizes: SizeSelection[] = order.sizes

    const handleShowProduct = (order: IOrder) => {
      dispatch(showOrder(order))
      navigate("/common/order/show")
    };

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
                <Button
                    onClick={() => handleShowProduct(order)}
                    size="sm"
                    variant="twoTone"
                    icon={<HiInformationCircle size={20} />}
                >Voir la commande</Button>
              </AdaptableCard>
        </div>
    );
}

export default OrderDetails
