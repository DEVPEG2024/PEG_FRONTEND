import {
  Button,
  Dialog,
  Notification,
  toast,
} from '@/components/ui';
import { t } from 'i18next';
import FieldCustom from './components/fileds';
import { useState } from 'react';
import useUniqueId from '@/components/ui/hooks/useUniqueId';
import { Project } from '@/@types/project';
import { apiPayProducer } from '@/services/ProjectServices';

function PayProducerModal({
  project,
  isPayProducerOpen,
  onClosePayProducer,
}: {
  project: Project;
  isPayProducerOpen: boolean;
  onClosePayProducer: () => void;
}) {
  const newId = useUniqueId('PAY-PRODUCER-', 10);
  const [formData, setFormData] = useState({
    ref: newId,
    amount: project.producerPrice,
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const response = await apiPayProducer({
      ref: formData.ref,
      projectId: project.documentId,
      producerId: '' /*project.producer._id*/,
      amount: formData.amount,
    });
    setFormData({
      ref: newId,
      amount: project.producerPrice,
    });
    if (response.status === 200) {
      toast.push(<Notification type="success" title="Paiement effectué" />);
    } else {
      toast.push(
        <Notification type="danger" title="Erreur lors du paiement" />
      );
    }
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

export default PayProducerModal;
