import {
  Button,
  DatePicker,
  Dialog,
  Input,
  Select,
  Switcher,
} from '@/components/ui';
import { t } from 'i18next';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { HiMinus, HiOutlineCalendar, HiPlus } from 'react-icons/hi';
import {
  createInvoice,
  setNewInvoiceDialog,
  useAppDispatch,
  useAppSelector,
} from '../store';
import useUniqueId from '@/components/ui/hooks/useUniqueId';
import { paymentModeData, paymentStatusData } from '../constants';
import { apiGetCustomers } from '@/services/CustomerServices';
import { IUser } from '@/@types/user';
import { apiGetProjects } from '@/services/ProjectServices';
import { IProject } from '@/@types/project';
import { apiGetOffers } from '@/services/OfferServices';
import { IOffer } from '@/@types/offer';
import { Invoice } from '@/@types/invoice';

function ModalNewInvoice() {
  const user = useAppSelector((state: any) => state.auth.user);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const { newInvoiceDialog } = useAppSelector((state) => state.invoices.data);
  const newId = useUniqueId('INV-', 2).toUpperCase();
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    invoiceNumber: newId,
    amount: 0,
    vatAmount: 0,
    vat: 0,
    vatEnabled: false,
    totalAmount: 0,
    status: 'unpaid',
    items: [
      {
        name: '',
        quantity: 1,
        price: 0,
        total: 0,
      },
    ],
    invoiceDate: new Date(),
    dueDate: new Date(),
    paymentMethod: '',
    paymentStatus: '',
    projectId: null,
    offerId: null,
    customerId: '',
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    dispatch(
      createInvoice({
        invoice: {
          ...(formData as unknown as Invoice),
          offerId: formData.offerId === '' ? null : formData.offerId,
          projectId: formData.projectId === '' ? null : formData.projectId,
        },
        sellerId: user._id,
      })
    );
    setFormData({
      invoiceNumber: newId,
      amount: 0,
      vatAmount: 0,
      vat: 0,
      vatEnabled: false,
      totalAmount: 0,
      status: 'unpaid',
      items: [
        {
          name: '',
          quantity: 0,
          price: 0,
          total: 0,
        },
      ],
      invoiceDate: new Date(),
      dueDate: new Date(),
      paymentMethod: '',
      paymentStatus: '',
      projectId: null,
      offerId: null,
      customerId: '',
    });
    handleClose();
  };
  const handleClose = () => {
    dispatch(setNewInvoiceDialog(false));
  };

  const fetchCustomers = async () => {
    const response = await apiGetCustomers(1, 1000, '');
    const customersList = response.data.customers || [];
    const customers = customersList.map((customer: IUser) => ({
      value: customer._id || '',
      label: customer.firstName + ' ' + customer.lastName,
    }));
    setCustomers(customers);
  };
  const fetchProjects = async () => {
    const response = await apiGetProjects(1, 1000, '');
    const projectsList = response.data.projects || [];
    const projects = projectsList.map((project: IProject) => ({
      value: project._id || '',
      label: project.title || '',
    }));
    setProjects(projects);
  };

  const fetchOffers = async () => {
    const response = await apiGetOffers(1, 1000, '');
    const offersList = response.data.offers || [];
    const offers = offersList.map((offer: IOffer) => ({
      value: offer._id || '',
      label: offer.title || '',
    }));
    setOffers(offers);
  };

  useEffect(() => {
    fetchCustomers();
    fetchProjects();
    fetchOffers();
  }, []);

  const addProductLine = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 0, price: 0, total: 0 }],
    });
  };

  const removeProductLine = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      items: newItems,
    });
  };

  const updateProductLine = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'price') {
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }

    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = formData.vatEnabled ? subtotal * (formData.vat / 100) : 0;
    const totalAmount = subtotal + vatAmount;

    setFormData({
      ...formData,
      items: newItems,
      amount: subtotal,
      vatAmount: vatAmount,
      totalAmount: totalAmount,
    });
  };

  const handleVATToggle = (checked: boolean) => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = checked ? subtotal * (formData.vat / 100) : 0;
    const totalAmount = subtotal + vatAmount;

    setFormData({
      ...formData,
      vatEnabled: checked,
      vatAmount: vatAmount,
      totalAmount: totalAmount,
    });
  };

  const handleVATChange = (value: number) => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = formData.vatEnabled ? subtotal * (value / 100) : 0;
    const totalAmount = subtotal + vatAmount;

    setFormData({
      ...formData,
      vat: value,
      vatAmount: vatAmount,
      totalAmount: totalAmount,
    });
  };
  return (
    <div>
      <Dialog isOpen={newInvoiceDialog} onClose={handleClose} width={1200}>
        <div className="flex flex-col justify-between">
          <h5 className="mb-4">REF : {formData.invoiceNumber}</h5>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Client</p>
              <Select
                placeholder="Client"
                options={customers}
                noOptionsMessage={() => 'Aucun client trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, customerId: e?.value || '' });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Lier un projet</p>
              <Select
                placeholder="Projet"
                options={projects}
                noOptionsMessage={() => 'Aucun projet trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, projectId: e?.value || '' });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Lier une offre</p>
              <Select
                placeholder="Offre"
                options={offers}
                noOptionsMessage={() => 'Aucune offre trouvée'}
                onChange={(e: any) => {
                  setFormData({ ...formData, offerId: e?.value || '' });
                }}
              />
            </div>
          </div>
          <div className="flex flex-row gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Date facturation
              </p>
              <DatePicker
                placeholder="Date de début"
                value={dayjs(formData.invoiceDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                inputFormat="DD/MM/YYYY"
                onChange={(date: Date | null) => {
                  setFormData({
                    ...formData,
                    invoiceDate: dayjs(date).toDate(),
                  });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">Date d'échéance</p>
              <DatePicker
                placeholder="Date d'échéance"
                value={dayjs(formData.dueDate).toDate()}
                inputPrefix={<HiOutlineCalendar className="text-lg" />}
                onChange={(date: Date | null) => {
                  setFormData({ ...formData, dueDate: dayjs(date).toDate() });
                }}
                inputFormat="DD/MM/YYYY"
              />
            </div>

            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Mode de paiement
              </p>
              <Select
                placeholder="Mode de paiement"
                options={paymentModeData}
                noOptionsMessage={() => 'Aucun mode de paiement trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, paymentMethod: e?.value || '' });
                }}
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <p className="text-sm text-gray-200 mb-2 mt-4">
                Statut de paiement
              </p>
              <Select
                placeholder="Statut de paiement"
                options={paymentStatusData}
                noOptionsMessage={() => 'Aucun statut de paiement trouvé'}
                onChange={(e: any) => {
                  setFormData({ ...formData, paymentStatus: e?.value || '' });
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-200 mb-2 mt-4">Produits</p>
            {formData.items.map((item, index) => (
              <div
                key={index}
                className="flex flex-row gap-2 items-center w-full"
              >
                <Input
                  className="w-3/6"
                  placeholder="Nom du produit"
                  value={item.name}
                  onChange={(e) =>
                    updateProductLine(index, 'name', e.target.value)
                  }
                />
                <Input
                  className="w-1/6"
                  placeholder="Quantité"
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    updateProductLine(
                      index,
                      'quantity',
                      parseFloat(e.target.value)
                    )
                  }
                />
                <Input
                  className="w-1/6"
                  placeholder="Prix unitaire"
                  type="number"
                  value={item.price}
                  onChange={(e) =>
                    updateProductLine(
                      index,
                      'price',
                      parseFloat(e.target.value)
                    )
                  }
                />
                <Input
                  className="w-1/6"
                  placeholder="Total"
                  value={item.total}
                  disabled
                />
                <Button
                  className="w-1/6"
                  icon={<HiMinus />}
                  variant="twoTone"
                  size="sm"
                  onClick={() => removeProductLine(index)}
                  disabled={formData.items.length === 1}
                />
              </div>
            ))}
            <Button
              className="self-start mt-2"
              icon={<HiPlus />}
              variant="twoTone"
              size="sm"
              onClick={addProductLine}
            >
              Ajouter un produit
            </Button>
          </div>
          <div className="grid grid-cols-12 gap-2 mt-4">
            <div className="flex justify-start items-center gap-2 mt-4 col-span-8">
              <span className="text-sm text-gray-200">TVA</span>
              <Switcher
                checked={formData.vatEnabled}
                onChange={(e) => handleVATToggle(!formData.vatEnabled)}
              />
              {formData.vatEnabled && (
                <div className="flex flex-row gap-2 items-center">
                  <Input
                    type="number"
                    value={formData.vat}
                    onChange={(e) =>
                      handleVATChange(parseFloat(e.target.value))
                    }
                    suffix="%"
                    className="w-20"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 justify-end text-right col-span-2">
              <span className="text-sm text-gray-200">Sous-total: </span>
              <span className="text-sm text-gray-200">
                TVA ({formData.vatEnabled ? formData.vat : 0}%):{' '}
              </span>
              <span className="text-sm text-gray-200">Total:</span>
            </div>
            <div className="flex flex-col items-end gap-2 justify-end text-right col-span-2">
              <span className="text-sm text-gray-200">
                {formData.amount.toFixed(2)} €
              </span>
              <span className="text-sm text-gray-200">
                {formData.vatAmount.toFixed(2)} €
              </span>
              <span className="text-sm text-gray-200">
                {formData.totalAmount.toFixed(2)} €
              </span>
            </div>
          </div>
          <div className="text-right mt-6">
            <Button
              className="ltr:mr-2 rtl:ml-2"
              variant="plain"
              onClick={handleClose}
            >
              {t('cancel')}
            </Button>
            <Button variant="solid" onClick={handleSubmit}>
              {t('save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export default ModalNewInvoice;
