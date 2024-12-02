import AdaptableCard from '@/components/shared/AdaptableCard';
import IconText from '@/components/shared/IconText';
import {
  HiAdjustments,
  HiOfficeBuilding,
  HiBookOpen,
  HiInformationCircle,
} from 'react-icons/hi';
import { OrderItem } from '@/@types/order';
import { SizeSelection } from '@/@types/product';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { showOrder } from '../../../orders/store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Customer } from '@/@types/customer';

injectReducer('orders', reducer);

const OrderItemDetails = ({ orderItem, customer }: { orderItem: OrderItem, customer: Customer | undefined }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const productTitle: string = orderItem.product.name;
  const productSizes: SizeSelection[] = orderItem.sizeSelections;

  const handleShowProduct = (orderItem: OrderItem) => {
    dispatch(showOrder(orderItem));
    navigate('/common/order/show');
  };

  return (
    <div>
      <AdaptableCard bodyClass="p-5">
        <div>
          <h4 className="mb-6">Détails de la commande</h4>
        </div>
        <IconText
          className="mb-4"
          icon={<HiOfficeBuilding className="text-lg opacity-70" />}
        >
          <span className="font-semibold">{customer?.name}</span>
        </IconText>
        <IconText
          className="mb-4"
          icon={<HiBookOpen className="text-lg opacity-70" />}
        >
          <span className="font-semibold">{productTitle}</span>
        </IconText>
        <IconText
          className="mb-4"
          icon={<HiAdjustments className="text-lg opacity-70" />}
        >
          <span className="font-semibold flex-col justify-center gap-2">
            {productSizes.map((size) => (
              <p>
                {size.size.value === 'DEFAULT' ? 'Quantité' : size.size.value} :{' '}
                {size.quantity}
              </p>
            ))}
          </span>
        </IconText>
        <Button
          onClick={() => handleShowProduct(orderItem)}
          size="sm"
          variant="twoTone"
          icon={<HiInformationCircle size={20} />}
        >
          Voir la commande
        </Button>
      </AdaptableCard>
    </div>
  );
};

export default OrderItemDetails;
