import { injectReducer } from '@/store';
import { useEffect } from 'react';
import reducer, {
  clearOrderItemState,
  getOrderItemById,
  setOrderItemFormDialog,
  useAppDispatch,
  useAppSelector,
} from './store';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui';
import ModalShowForm from './modal/ModalShowForm';
import { SizeAndColorSelection } from '@/@types/product';
import { useParams } from 'react-router-dom';
import ReactHtmlParser from 'html-react-parser';

injectReducer('showOrderItem', reducer);

type ShowOrderItemParams = {
  documentId: string;
};

const ShowOrderItem = () => {
  const { documentId } =
    useParams<ShowOrderItemParams>() as ShowOrderItemParams;
  const dispatch = useAppDispatch();
  const { orderItem, orderItemFormDialog: formDialog } = useAppSelector(
    (state) => state.showOrderItem.data
  );

  useEffect(() => {
    if (!orderItem) {
      dispatch(getOrderItemById(documentId));
    }

    return () => {
      dispatch(clearOrderItemState());
    };
  }, [dispatch]);

  const handleShowForm = () => {
    dispatch(setOrderItemFormDialog(true));
  };

  return (
    orderItem?.product && (
      <Container className="h-full">
        <Loading>
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="lg:w-1/2 w-full">
                <img
                  src={orderItem.product.images[0]?.url}
                  alt={orderItem.product.name}
                  className="w-full h-auto rounded-lg shadow-md object-cover"
                />
              </div>

              <div className="lg:w-1/2 w-full lg:pl-12 mt-6 lg:mt-0">
                <div className="flex flex-col justify-between">
                  <h1 className="text-3xl font-bold">
                    {orderItem.product.name}
                  </h1>
                  <p className="text-2xl font-semibold">
                    {orderItem.product.price.toFixed(2)} €
                  </p>
                </div>

                <div className="mt-4 leading-relaxed mb-8 prose dark:prose-invert max-w-none text-sm">
                  {ReactHtmlParser(orderItem.product.description || '')}
                </div>

                {orderItem.product.sizes.length > 0 ? (
                  <div className="grid grid-cols-7 gap-4 mb-6">
                    {
                      orderItem.sizeAndColorSelections.map((sizeAndColorSelected: SizeAndColorSelection) => (
                        <div key={sizeAndColorSelected.size.value + (sizeAndColorSelected.color?.value ?? '')} className="grid gap-4">
                          <span>{sizeAndColorSelected.size.name + (sizeAndColorSelected.color?.name ? ' ' + sizeAndColorSelected.color.name : '')}</span>
                          <Input
                            name={sizeAndColorSelected.size.value + (sizeAndColorSelected.color?.value ?? '')}
                            value={sizeAndColorSelected.quantity}
                            type="number"
                            autoComplete="off"
                            disabled={true}
                          />
                        </div>
                      ))
                    }
                  </div>
                ) : orderItem.product.colors.length > 0 ? (
                  <div className="grid grid-cols-7 gap-4 mb-6">
                    {
                      orderItem.sizeAndColorSelections.map((sizeAndColorSelected: SizeAndColorSelection) => (
                        <div key={sizeAndColorSelected.color.value} className="grid gap-4">
                          <span>{sizeAndColorSelected.color.name}</span>
                          <Input
                            name={sizeAndColorSelected.color.value}
                            value={sizeAndColorSelected.quantity}
                            type="number"
                            autoComplete="off"
                            disabled={true}
                          />
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div className="mt-4 flex flex-row gap-4 items-center">
                    <span>Quantité</span>
                    <Input
                      name="Default"
                      value={
                        orderItem.sizeAndColorSelections[0].quantity
                      }
                      type="number"
                      autoComplete="off"
                      disabled={true}
                    />
                  </div>
                )}

                {orderItem.formAnswer?.form && (
                  <Button
                    className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    onClick={() => handleShowForm()}
                  >
                    {'Voir les détails du produit'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Loading>
        {orderItem.formAnswer && formDialog && (
          <ModalShowForm
            formAnswer={orderItem.formAnswer}
            formDialog={formDialog}
          />
        )}
      </Container>
    )
  );
};

export default ShowOrderItem;
