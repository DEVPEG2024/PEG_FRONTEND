import { CartItem } from '@/@types/cart';
import { FormAnswer } from '@/@types/formAnswer';
import { OrderItem } from '@/@types/orderItem';
import { Project } from '@/@types/project';
import { User } from '@/@types/user';
import { Container, Loading } from '@/components/shared';
import { apiCreateFormAnswer } from '@/services/FormAnswerService';
import { apiCreateOrderItem, PaymentInformations } from '@/services/OrderItemServices';
import { RootState, useAppDispatch, useAppSelector } from '@/store';
import { clearCart } from '@/store/slices/base/cartSlice';
import { unwrapData } from '@/utils/serviceHelper';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiCreateProject, apiUpdateProject } from '@/services/ProjectServices';
import { Invoice } from '@/@types/invoice';
import createUID from '@/components/ui/utils/createUid';
import { apiCreateInvoice } from '@/services/InvoicesServices';
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/configs/api.config';
import { TOKEN_TYPE } from '@/constants/api.constant';
import { Button } from '@/components/ui';

type OrderItemAndProject = {
  orderItem?: OrderItem;
  project?: Project;
};

function Success() {
  const navigate = useNavigate();
  const { user }: { user: User } = useAppSelector((state) => state.auth.user);
  const { token } = useAppSelector((state: RootState) => state.auth.session)
  const cart = useAppSelector((state: RootState) => state.base.cart.cart);
  const [hasProcessed, setHasProcessed] = useState<boolean>(false);
  const [processingCreation, setProcessingCreation] = useState<boolean>(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const confirmPayment = async () => {
      const sessionId = new URLSearchParams(window.location.search).get('session_id');

      if (!sessionId || hasProcessed) return;

      setHasProcessed(true)
      // Vérifier le paiement auprès du backend
      const response = await fetch(API_BASE_URL + '/stripe/confirm-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `${TOKEN_TYPE}${token}`
        },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        const paymentInfo = await response.json();

        await createOrderAndClearCart(paymentInfo);
        setProcessingCreation(false);
        navigate('/common/projects');
        // TODO: Deux projets créés à chaque fois
      }
    };

    confirmPayment();
  }, [navigate, hasProcessed]);

  const createFormAnswer = async (
      item: CartItem
    ): Promise<FormAnswer | null> => {
      if (item.product.form) {
        const { createFormAnswer }: { createFormAnswer: FormAnswer } =
          await unwrapData(apiCreateFormAnswer(item.formAnswer));
  
        return createFormAnswer;
      }
      return null;
    };

  const createOrderItemAndProject = async (
    item: CartItem,
    paymentInformations: PaymentInformations
  ): Promise<OrderItemAndProject> => {
    try {
      const formAnswer: FormAnswer | null = await createFormAnswer(item),
        orderItem: Omit<OrderItem, 'documentId'> = {
          product: item.product,
          sizeAndColorSelections: item.sizeAndColors,
          formAnswer,
          price: item.sizeAndColors.reduce(
            (amount, size) => amount + size.quantity * item.product.price,
            0
          ),
          state: 'pending',
          customer: user.customer!,
        };
      const { createOrderItem }: { createOrderItem: OrderItem } =
        await unwrapData(apiCreateOrderItem(orderItem));
      // TODO : envoyer mail création commande OK
      try {
        const project: Omit<Project, 'documentId'> = {
          name:
            'Commande ' +
            item.product.name +
            ' pour ' +
            user.firstName +
            ' ' +
            user.lastName,
          description:
            'Commande ' +
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
          paidPrice: 0,
          producerPaidPrice: 0,
          orderItem: createOrderItem,
          priority: 'medium',
          comments: [],
          tasks: [],
          invoices: [],
          images: [],
          poolable: false,
        };
        const { createProject }: { createProject: Project } = await unwrapData(
          apiCreateProject(project)
        );
        return { orderItem: createOrderItem, project: createProject };
      } catch (error) {
        // TODO: envoyer mail erreur création projet
      }
      return { orderItem: createOrderItem };
    } catch (error) {
      // TODO: envoyer mail erreur création commande
    }
    return {};
  };

  const addInvoiceToProject = (project: Project, invoice: Invoice) => {
    apiUpdateProject({
      documentId: project.documentId,
      invoices: [...project.invoices, invoice],
    });
  };

  const createOrder = async (paymentInformations: PaymentInformations) => {
      try {
        const promises = await Promise.allSettled(
            cart.map((item) =>
              createOrderItemAndProject(item, paymentInformations)
            )
          ),
          orderItemsAndProjects: OrderItemAndProject[] = promises
            .filter((result) => result.status === 'fulfilled')
            .map(
              (result) =>
                (result as PromiseFulfilledResult<OrderItemAndProject>).value
            ),
          orderItems: OrderItem[] = orderItemsAndProjects
            .filter(({ orderItem }) => orderItem)
            .map(({ orderItem }) => orderItem as OrderItem),
          orderItemsAmount = orderItems.reduce(
            (tempAmount, orderItem) => tempAmount + orderItem.price,
            0
          );
  
        const invoice: Omit<Invoice, 'documentId'> = {
          customer: user.customer!,
          orderItems,
          amount: orderItemsAmount,
          vatAmount: orderItemsAmount * 0.2,
          totalAmount: orderItemsAmount * 1.2,
          name: createUID(10).toUpperCase(),
          date: dayjs().toDate(),
          dueDate: dayjs().add(30, 'day').toDate(),
          state: 'pending',
          paymentMethod: paymentInformations.paymentMethod ?? 'transfer',
          paymentAmount: 0,
          paymentReference: '',
          paymentState: paymentInformations.paymentState === 'paid' ? 'fulfilled' : 'pending',
          paymentDate: paymentInformations.paymentDate ?? new Date(0),
        };
        // TODO: Déplacer cette création côté backend dans une route personnalisée et retirer la permission de création de facture par le client (plugin user Strapi)
        const { createInvoice }: { createInvoice: Invoice } = await unwrapData(
          apiCreateInvoice(invoice)
        );
        Promise.allSettled(
          orderItemsAndProjects
            .filter(({ project }) => project)
            .map(({ project }) => addInvoiceToProject(project!, createInvoice))
        );
        return { status: 'success' };
      } catch (errors: any) {
        return {
          status: 'failed',
          message: errors?.response?.data?.message || errors.toString(),
        };
      }
    };

    const createOrderAndClearCart = async (
      paymentInformations: PaymentInformations
    ): Promise<void> => {
      const respOrderCreation = await createOrder(paymentInformations);
      if (respOrderCreation.status === 'success') {
        dispatch(clearCart());
      }
    };

  return (
    <Container className="h-full">
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold text-green-600">Paiement réussi !</h1>
        <p>Merci pour votre achat 🎉</p>
        {processingCreation && (
          <div>
            <p>Création des projets en cours</p>
            <Loading></Loading>
          </div>
        )}
        {!processingCreation && (
          <Button
            onClick={() => navigate('/common/projects')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            variant="solid"
          >
            Voir mes projets
          </Button>
        )}
      </div>
    </Container>
  );
}

export default Success;
