import { injectReducer } from '@/store';
import { useEffect } from 'react';
import reducer, {
  clearState,
  getOrderItemById,
  setFormDialog,
  useAppDispatch,
  useAppSelector,
} from './store';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import Input from '@/components/ui/Input';
import { Button } from '@/components/ui';
import ModalShowForm from './modal/ModalShowForm';
import { Size, SizeSelection } from '@/@types/product';
import { useParams } from 'react-router-dom';

injectReducer('showOrderItem', reducer);

type ShowOrderItemParams = {
  documentId: string;
};

const ShowOrderItem = () => {
  const { documentId } = useParams<ShowOrderItemParams>() as ShowOrderItemParams;
  const dispatch = useAppDispatch();
  const { orderItem, formDialog } = useAppSelector(
    (state) => state.showOrderItem.data
  );

  useEffect(() => {
    if (!orderItem) {
      dispatch(getOrderItemById(documentId));
    }

    return () => {
      dispatch(clearState())
    }
  }, [dispatch]);

  const handleShowForm = () => {
    dispatch(setFormDialog(true));
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
                  <h1 className="text-3xl font-bold">{orderItem.product.name}</h1>
                  <p className="text-2xl font-semibold">
                    {orderItem.product.price.toFixed(2)} €
                  </p>
                </div>

                <p className="mt-4 leading-relaxed">
                  {orderItem.product.description?.replace('<p>', '').replace('</p>', '')}
                </p>

                {orderItem.product.sizes && (
                  <div>
                    <p className="font-bold text-yellow-500 mb-4">
                      Choix des tailles
                    </p>
                    <div className="grid grid-cols-7 gap-4 mb-6">
                      {orderItem.product.sizes.map((size: Size) => (
                        <div key={size.value} className="grid gap-4">
                          <span>{size.name}</span>
                          <Input
                            name={size.value}
                            value={
                              orderItem.sizeSelections.find(
                                (sizeSelected: SizeSelection) =>
                                  sizeSelected.size.value === size.value
                              )?.quantity
                            }
                            type="number"
                            autoComplete="off"
                            disabled={true}
                          />
                        </div>
                      ))}
                    </div>
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
        {orderItem.formAnswer && formDialog && <ModalShowForm formAnswer={orderItem.formAnswer} formDialog={formDialog} />}
      </Container>
    )
  );
};

export default ShowOrderItem;
