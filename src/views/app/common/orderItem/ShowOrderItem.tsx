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
import { ChecklistItem } from '@/@types/checklist';
import { getTotalPriceForCartItem } from '@/utils/productHelpers';
import { useParams } from 'react-router-dom';
import ReactHtmlParser from 'html-react-parser';
import { HiCheck, HiClock } from 'react-icons/hi';
import { MdChecklist } from 'react-icons/md';

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
    dispatch(getOrderItemById(documentId));

    return () => {
      dispatch(clearOrderItemState());
    };
  }, [dispatch, documentId]);

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
                    {getTotalPriceForCartItem(orderItem.product, orderItem.sizeAndColorSelections).toFixed(2)} €
                  </p>
                </div>

                <div className="mt-4 leading-relaxed mb-8 prose dark:prose-invert max-w-none text-sm">
                  {ReactHtmlParser(orderItem.product.description || '')}
                </div>

                {orderItem.product.sizes.length > 0 ? (
                  <div className="grid grid-cols-7 gap-4 mb-6">
                    {orderItem.sizeAndColorSelections.map(
                      (sizeAndColorSelected: SizeAndColorSelection) => (
                        <div
                          key={
                            sizeAndColorSelected.size.value +
                            (sizeAndColorSelected.color?.value ?? '')
                          }
                          className="grid gap-4"
                        >
                          <span>
                            {sizeAndColorSelected.size.name +
                              (sizeAndColorSelected.color?.name
                                ? ' ' + sizeAndColorSelected.color.name
                                : '')}
                          </span>
                          <Input
                            name={
                              sizeAndColorSelected.size.value +
                              (sizeAndColorSelected.color?.value ?? '')
                            }
                            value={sizeAndColorSelected.quantity}
                            type="number"
                            autoComplete="off"
                            disabled={true}
                          />
                        </div>
                      )
                    )}
                  </div>
                ) : orderItem.product.colors.length > 0 ? (
                  <div className="grid grid-cols-7 gap-4 mb-6">
                    {orderItem.sizeAndColorSelections.map(
                      (sizeAndColorSelected: SizeAndColorSelection) => (
                        <div
                          key={sizeAndColorSelected.color.value}
                          className="grid gap-4"
                        >
                          <span>{sizeAndColorSelected.color.name}</span>
                          <Input
                            name={sizeAndColorSelected.color.value}
                            value={sizeAndColorSelected.quantity}
                            type="number"
                            autoComplete="off"
                            disabled={true}
                          />
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex flex-row gap-4 items-center">
                    <span>Quantité</span>
                    <Input
                      name="Default"
                      value={orderItem.sizeAndColorSelections[0].quantity}
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

        {/* Checklist progression */}
        <OrderChecklist items={orderItem.project?.checklistItems ?? []} />
      </Container>
    )
  );
};

function OrderChecklist({ items }: { items: ChecklistItem[] }) {
  if (items.length === 0) return null;
  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);

  return (
    <div className="container mx-auto px-4 pb-10" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        marginTop: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MdChecklist size={20} style={{ color: '#818cf8' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 700, margin: 0 }}>
              Suivi de ma commande
            </p>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
            {doneCount} / {items.length} étape{doneCount > 1 ? 's' : ''} effectuée{doneCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: percent === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
            borderRadius: '100px',
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 14px', borderRadius: '10px',
                background: item.done ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${item.done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                background: item.done ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${item.done ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.15)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.done
                  ? <HiCheck size={12} style={{ color: '#4ade80' }} />
                  : <HiClock size={11} style={{ color: 'rgba(255,255,255,0.25)' }} />
                }
              </div>
              <span style={{
                flex: 1,
                color: item.done ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)',
                fontSize: '13px', fontWeight: 500,
                textDecoration: item.done ? 'line-through' : 'none',
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 600,
                color: item.done ? '#4ade80' : 'rgba(255,255,255,0.25)',
              }}>
                {item.done ? 'Effectuée' : 'En attente'}
              </span>
            </div>
          ))}
        </div>

        {percent === 100 && (
          <p style={{ color: '#4ade80', fontSize: '12px', textAlign: 'center', marginTop: '16px', fontWeight: 600 }}>
            Toutes les étapes ont été effectuées !
          </p>
        )}
      </div>
    </div>
  );
}

export default ShowOrderItem;
