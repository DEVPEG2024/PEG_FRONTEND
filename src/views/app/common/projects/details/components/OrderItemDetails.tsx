import AdaptableCard from '@/components/shared/AdaptableCard';
import IconText from '@/components/shared/IconText';
import {
  HiAdjustments,
  HiOfficeBuilding,
  HiBookOpen,
  HiInformationCircle,
} from 'react-icons/hi';
import { OrderItem } from '@/@types/orderItem';
import { SizeAndColorSelection } from '@/@types/product';
import { Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';
import { Customer } from '@/@types/customer';

const OrderItemDetails = ({
  orderItem,
  customer,
}: {
  orderItem: OrderItem;
  customer: Customer;
}) => {
  const navigate = useNavigate();

  const productTitle: string = orderItem.product.name;
  const productSizes: SizeAndColorSelection[] = orderItem.sizeAndColorSelections;

  const handleShowOrderItem = (orderItem: OrderItem) => {
    navigate('/common/orderItem/' + orderItem.documentId);
  };

  return (
    <div>
      <AdaptableCard bodyClass="p-5">
        <h4 className="mb-6">Détails de la commande</h4>
        <IconText
          className="mb-4"
          icon={<HiOfficeBuilding className="text-lg opacity-70" />}
        >
          <span className="font-semibold">{customer.name}</span>
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
          onClick={() => handleShowOrderItem(orderItem)}
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
