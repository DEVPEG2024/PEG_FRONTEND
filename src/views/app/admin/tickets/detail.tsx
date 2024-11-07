import AdaptableCard from '@/components/shared/AdaptableCard';
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import IconText from '@/components/shared/IconText';
import {
  HiClock,
  HiCalendar,
  HiCheckCircle,
  HiExclamationCircle,
} from 'react-icons/hi';
import ReactHtmlParser from 'html-react-parser';

import {
  updatePriorityTicket,
  updateStatusTicket,
  useAppDispatch,
  useAppSelector,
} from './store';
import { Button, Select } from '@/components/ui';
import { API_URL_IMAGE } from '@/configs/api.config';
import { useState } from 'react';
import { priorityData, priorityTextData } from './constants';

type OptionType = {
  value: string;
  label: string;
};

const DetailTicket = () => {
  const dispatch = useAppDispatch();
  const { selectedTicket } = useAppSelector((state) => state.tickets.data);
  const [priority, setPriority] = useState(selectedTicket?.priority || '');
  const status = selectedTicket?.status === 'open' ? 'Ouvert' : 'Fermé';
  const priorityText =
    selectedTicket?.priority === 'low'
      ? 'Faible'
      : selectedTicket?.priority === 'medium'
        ? 'Moyen'
        : 'Elevé';
  const handleCloseTicket = () => {
    const data = {
      ticketId: selectedTicket?._id || '',
      status: 'closed',
    };
    dispatch(updateStatusTicket(data));
  };
  const handleOpenTicket = () => {
    const data = {
      ticketId: selectedTicket?._id || '',
      status: 'open',
    };
    dispatch(updateStatusTicket(data));
  };
  return (
    <Container className="h-full">
      <Loading>
        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <AdaptableCard rightSideBorder bodyClass="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="mb-2 font-bold">{selectedTicket?.title}</h3>
                  <p>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 mx-1 cursor-pointer">
                      Ticket N° : {selectedTicket?.ref}
                    </span>
                    Par : {selectedTicket?.user.firstName} -
                    {selectedTicket?.user.lastName}
                  </p>
                </div>
              </div>
              <hr className="my-6" />
              <div className="text-base">
                <div className="prose dark:prose-invert max-w-none">
                  {ReactHtmlParser(selectedTicket?.description || '')}
                </div>
              </div>
            </AdaptableCard>
          </div>
          <div>
            <AdaptableCard bodyClass="p-5">
              <h4 className="mb-6">Détails</h4>
              <IconText
                className={`mb-4 ${
                  !selectedTicket?.status
                    ? 'text-yellow-500'
                    : selectedTicket?.status === 'closed'
                      ? 'text-red-500'
                      : 'text-emerald-500'
                }`}
                icon={<HiClock className="text-lg" />}
              >
                <span className="font-semibold">{status}</span>
              </IconText>
              <IconText
                className={`mb-4 ${
                  !priority
                    ? 'text-yellow-500'
                    : priority === 'low'
                      ? 'text-green-500'
                      : priority === 'medium'
                        ? 'text-orange-500'
                        : 'text-red-500'
                }`}
                icon={<HiExclamationCircle className="text-lg" />}
              >
                <span className="font-semibold">Priorité : {priorityText}</span>
              </IconText>

              <IconText
                className="mb-4"
                icon={<HiCalendar className="text-lg opacity-70" />}
              >
                <span className="font-semibold">
                  Créer le :{' '}
                  {selectedTicket?.createdAt
                    ? new Date(selectedTicket.createdAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </IconText>
              <hr className="my-6" />
              <div className="flex flex-col gap-2 mb-4">
                <Select
                  options={priorityData as OptionType[]}
                  value={priorityData.find((e) => e.value === priority)}
                  onChange={(e) => {
                    setPriority(e?.value || '');
                    const data = {
                      ticketId: selectedTicket?._id || '',
                      priority: e?.value || '',
                    };
                    dispatch(updatePriorityTicket(data));
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="solid"
                  color={selectedTicket?.status === 'closed' ? 'green' : 'red'}
                  className="flex items-center justify-center gap-2"
                  onClick={
                    selectedTicket?.status === 'closed'
                      ? handleOpenTicket
                      : handleCloseTicket
                  }
                >
                  <HiCheckCircle className="text-lg opacity-70" />
                  {selectedTicket?.status === 'closed' ? 'Ouvrir' : 'Fermer'}
                </Button>
              </div>
              <hr className="my-6" />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-4">
                  {selectedTicket?.file && (
                    <img
                      onClick={() =>
                        window.open(
                          API_URL_IMAGE + selectedTicket?.file,
                          '_blank'
                        )
                      }
                      src={API_URL_IMAGE + selectedTicket?.file}
                      alt={selectedTicket?.title}
                      className=" h-40 w-40 rounded-lg bg-gray-900 cursor-pointer"
                    />
                  )}
                </div>
              </div>
            </AdaptableCard>
          </div>
        </div>
      </Loading>
    </Container>
  );
};

export default DetailTicket;
