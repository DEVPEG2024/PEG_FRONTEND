import { CartItem } from '@/@types/cart';
import { AdaptableCard, Container, Loading } from '@/components/shared';
import Empty from '@/components/shared/Empty';
import { Button } from '@/components/ui';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import {
  editItem,
  removeFromCart,
  clearCart,
} from '@/store/slices/base/cartSlice';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { MdShoppingCart } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiCreateOrderItem, PaymentInformations } from '@/services/OrderItemServices';
import { apiCreateFormAnswer } from '@/services/FormAnswerService';
import { apiCreateProject, apiUpdateProject } from '@/services/ProjectServices';
import { FormAnswer } from '@/@types/formAnswer';
import PaymentContent from './PaymentContent';
import { unwrapData } from '@/utils/serviceHelper';
import { OrderItem } from '@/@types/orderItem';
import { Project } from '@/@types/project';
import { User } from '@/@types/user';
import { apiCreateInvoice } from '@/services/InvoicesServices';
import { Invoice } from '@/@types/invoice';
import createUID from '@/components/ui/utils/createUid';

type OrderItemAndProject = {
  orderItem?: OrderItem;
  project?: Project;
}

function Cart() {
  const {user}: {user: User} = useAppSelector((state) => state.auth.user);
  const cart = useAppSelector((state: RootState) => state.base.cart.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleEdit = (item: CartItem) => {
    dispatch(editItem(item));
    navigate('/customer/product/' + item.product.documentId + '/edit');
  };

  const createFormAnswer = async (
    item: CartItem
  ): Promise<FormAnswer | null> => {
    if (item.product.form) {
      const {createFormAnswer} : {createFormAnswer: FormAnswer}= await unwrapData(apiCreateFormAnswer(item.formAnswer));
      
      return createFormAnswer
    }
    return null;
  };

  const createOrderItemAndProject = async (item: CartItem, paymentInformations: PaymentInformations) : Promise<OrderItemAndProject> => {
    try {
      const formAnswer: FormAnswer | null = await createFormAnswer(item),
        orderItem: Omit<OrderItem, 'documentId'> = {
          product: item.product,
          sizeSelections: item.sizes,
          formAnswer,
          price: item.sizes.reduce(
            (amount, size) => amount + size.quantity * item.product.price,
            0
          ),
          state: 'pending',
          customer: user.customer!
        };
      const {createOrderItem} : {createOrderItem: OrderItem}= await unwrapData(apiCreateOrderItem(orderItem));
      // TODO : envoyer mail création commande OK
      try {
        const project: Omit<Project, 'documentId'> = {
          name: 'Commande ' +
            item.product.name +
            ' pour ' +
            user.firstName +
            ' ' +
            user.lastName,
          description: 'Commande ' +
            item.product.name +
            ' pour ' +
            user.firstName +
            ' ' +
            user.lastName,
          startDate: dayjs().toDate(),
          endDate: dayjs().add(30, 'day').toDate(),
          state: 'pending',
          customer: user.customer!,
          price: orderItem.price,
          producerPrice: 0,
          paidPrice: paymentInformations.paymentMethod === 'manual' ? 0 : 0,
          paymentMethod: paymentInformations.paymentMethod,
          paymentState: paymentInformations.paymentStatus,
          paymentDate: paymentInformations.paymentDate,
          orderItem: createOrderItem,
          priority: 'medium',
          comments: [],
          tasks: [],
          invoices: [],
          images: []
        }
        const {createProject} : {createProject: Project} = await unwrapData(apiCreateProject(project));
        return {orderItem: createOrderItem, project: createProject}
      } catch (error) {
        // TODO: envoyer mail erreur création projet
      }
      return {orderItem: createOrderItem};
    } catch (error) {
      // TODO: envoyer mail erreur création commande
    }
    return {}
  };

  const createOrder = async (paymentInformations: PaymentInformations) => {
    try {
      const promises = await Promise.allSettled(cart.map((item) => createOrderItemAndProject(item, paymentInformations))),
        orderItemsAndProjects: OrderItemAndProject[] = promises.filter((result) => result.status === 'fulfilled').map((result) => (result as PromiseFulfilledResult<OrderItemAndProject>).value),
        orderItems: OrderItem[] = orderItemsAndProjects.filter(({orderItem}) => orderItem).map(({orderItem}) => orderItem as OrderItem),
        orderItemsAmount = orderItems.reduce((tempAmount, orderItem) => tempAmount + orderItem.price, 0)

      const invoice: Omit<Invoice, 'documentId' | 'paymentDate'> = {
        customer: user.customer!,
        orderItems,
        amount: orderItemsAmount,
        vatAmount: orderItemsAmount * 0.2,
        totalAmount: orderItemsAmount * 1.2,
        name: createUID(10).toUpperCase(),
        date: dayjs().toDate(),
        dueDate: dayjs().add(30, 'day').toDate(),
        state: 'pending',
        paymentMethod: 'transfer',
        paymentAmount: 0,
        paymentReference: '',
        paymentState: 'pending',
      }
      // TODO: Déplacer cette création côté backend dans une route personnalisée et retirer la permission de création de facture par le client (plugin user Strapi)
      const {createInvoice} : {createInvoice: Invoice}= await unwrapData(apiCreateInvoice(invoice));
      Promise.allSettled(orderItemsAndProjects.filter(({project}) => project).map(({project}) => addInvoiceToProject(project!, createInvoice)))
      return { status: 'success' };
    } catch (errors: any) {
      return {
        status: 'failed',
        message: errors?.response?.data?.message || errors.toString(),
      };
    }
  };

  const addInvoiceToProject = (project: Project, invoice: Invoice) => {
    apiUpdateProject({documentId: project.documentId, invoices: [...project.invoices.map(({documentId}) => documentId), invoice.documentId]})
  }

  const createOrderAndClearCart = async (paymentInformations: PaymentInformations) : Promise<void> => {
    const respOrderCreation = await createOrder(paymentInformations);
    if (respOrderCreation.status === 'success') {
      dispatch(clearCart());
      navigate('/customer/projects');
    }
  };

  if (cart.length === 0) {
    return (
      <Empty icon={<MdShoppingCart size={120} />}>Votre panier est vide</Empty>
    );
  }
  return (
    <Container className="h-full">
      <Loading>
        <div className="grid md:grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <AdaptableCard rightSideBorder bodyClass="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="mb-2 font-bold">Panier</h3>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mx-1 cursor-pointer">
                      Total : {cart?.length}
                    </span>
                  </p>
                </div>
              </div>
              <hr className="my-4" />
              <div className="py-4">
                {cart?.map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <img
                          src={item.product.images[0]?.url}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded-md bg-slate-50"
                        />
                        <p>{item.product.name}</p>
                      </div>
                      <p>{item.product.price} €</p>
                      <div className="flex-col justify-center gap-2">
                        {item.sizes.map((size) => (
                          <p key={size.size.value}>
                            {size.size.value === 'DEFAULT' ? 'Quantité' : size.size.name}{' '}
                            : {size.quantity}
                          </p>
                        ))}
                      </div>
                      <p>
                        {item.sizes.reduce(
                          (amount, size) =>
                            amount + size.quantity * item.product.price,
                          0
                        )}{' '}
                        €
                      </p>
                      <p className="flex gap-1">
                        <Button
                          onClick={() => handleEdit(item)}
                          size="sm"
                          icon={<HiPencil />}
                        />
                        <Button
                          onClick={() => dispatch(removeFromCart(item))}
                          size="sm"
                          icon={<HiTrash />}
                        />
                      </p>
                    </div>
                    <hr className="w-full my-4" />
                  </div>
                ))}
              </div>
            </AdaptableCard>
          </div>
          <PaymentContent cart={cart} createOrderAndClearCart={createOrderAndClearCart} />
        </div>
      </Loading>
    </Container>
  );
}

export default Cart;
