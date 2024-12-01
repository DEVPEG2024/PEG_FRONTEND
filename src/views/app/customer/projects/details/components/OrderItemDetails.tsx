import AdaptableCard from '@/components/shared/AdaptableCard';
import IconText from '@/components/shared/IconText';
import {
  HiUser,
  HiAdjustments,
  HiHashtag,
  HiOfficeBuilding,
  HiBookOpen,
  HiInformationCircle,
} from 'react-icons/hi';
import { IOrder, OrderItem } from '@/@types/order';
import { SizeSelection } from '@/@types/product';
import { Button } from '@/components/ui';
import { injectReducer, useAppDispatch } from '@/store';
import { useNavigate } from 'react-router-dom';
import reducer, { showOrder } from '@/views/app/admin/orders/store'; // TODO: A gérer différemment --> appel de admin depuis customer
import { Customer } from '@/@types/customer';

injectReducer('orders', reducer);

const OrderItemDetails = ({ orderItem, customer }: { orderItem: OrderItem, customer: Customer }) => {
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
        <h4 className="mb-6">Détails de la commande</h4>
        <IconText
          className="mb-4"
          icon={<HiOfficeBuilding className="text-lg opacity-70" />}
        >
          <span className="font-semibold">{customer.companyName}</span>
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
              <p key={size.size.value}>
                {size.size.value === 'DEFAULT' ? 'Quantité' : size.size.name} :{' '}
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
