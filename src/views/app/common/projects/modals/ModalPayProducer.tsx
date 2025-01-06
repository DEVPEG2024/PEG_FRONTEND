import {
  Button,
  Dialog,
  Select
} from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from './components/fileds';
import { useState } from 'react';
import { Project } from '@/@types/project';
import { useAppDispatch } from '@/store';
import { payProducer } from '../store';
import { Transaction } from '@/@types/transaction';
import { paymentProducerProjectTypes } from '../lists/constants';
import { form } from '@formio/react';

type PayProducerFormModel = {
  amount: number;
  type: string;
}

function ModalPayProducer({
  project,
  isPayProducerOpen,
  onClosePayProducer,
}: {
  project: Project;
  isPayProducerOpen: boolean;
  onClosePayProducer: () => void;
}) {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState<PayProducerFormModel>({
    amount: project.producerPrice,
    type: 'projectPayment'
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const transaction: Omit<Transaction, 'documentId'> = {
      amount: formData.amount,
      project,
      producer: project.producer!.documentId,
      type: formData.type,
      date: new Date(),
      description: '',
    }
    dispatch(payProducer({ project, transaction }));
    handleClose();
  };
  const handleClose = () => {
    onClosePayProducer();
  };

  return (
    <div>
      <Dialog isOpen={isPayProducerOpen} onClose={handleClose}>
        <div className="flex flex-col h-full justify-between">
          <h5 className="mb-4">Payer le producteur</h5>
          <FieldCustom
            placeholder="Montant"
            value={formData.amount}
            setValue={(e: any) => {
              setFormData({ ...formData, amount: e });
            }}
          />
          <div className='mt-4'>
            <p className="text-sm text-gray-200 mb-2">Type de paiement</p>
            <Select
              placeholder="Type de paiement"
              options={paymentProducerProjectTypes}
              noOptionsMessage={() => 'Aucun type trouvé'}
              value={paymentProducerProjectTypes.find(
                (type) => type.value == formData.type
              )}
              onChange={(e: any) => {
                setFormData({ ...formData, type: e?.value || null });
              }}
            />
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

export default ModalPayProducer;
