import Avatar from '@/components/ui/Avatar'
import AdaptableCard from '@/components/shared/AdaptableCard'
import IconText from '@/components/shared/IconText'
import {
    HiClock,
    HiCalendar,
    HiUserCircle,
    HiLightningBolt,
} from 'react-icons/hi'
import { IProject } from '@/@types/project'
import dayjs from 'dayjs'
import { priorityColorText, statusColorText, statusTextData } from '../../lists/constants'
import { IoFileTrayFull } from 'react-icons/io5'
import { LuCalendarCheck, LuCalendarClock, LuCalendarPlus } from 'react-icons/lu'
import { FaEuroSign, FaPercent } from 'react-icons/fa'

const DetailsRight = ({project}: {project: IProject}) => {

    const status = statusTextData[project.status as keyof typeof statusTextData]
    const statusColor = statusColorText[project.status as keyof typeof statusColorText]
    const priorityColor = priorityColorText[project.priority as keyof typeof priorityColorText]
    const duration = dayjs(project.endDate).diff(project.startDate, 'day')
    const durationText = duration > 0 ? `${duration} jours restant` : "Délais dépassé"
    const priority = project.priority === "low" ? "faible" : project.priority === "medium" ? "moyenne" : "haute"

    return (
          <div>
              <AdaptableCard bodyClass="p-5">
                <h4 className="mb-6">Détails</h4>
                <IconText
                  className={`mb-4 ${statusColor}`}
                  icon={<HiClock className="text-lg" />}
                >
                  <span className="font-semibold">{status}</span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<HiCalendar className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    {durationText}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<IoFileTrayFull className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    {project.files.length} fichiers
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<FaEuroSign className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Montant total : {project.amount.toFixed(2)} €
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<FaPercent className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Commission producteur : {project.amountProducers} €
                  </span>
                </IconText>
                <IconText
                  className={`mb-4 ${priorityColor}`}
                  icon={<HiLightningBolt className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Priorité {priority}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<LuCalendarCheck className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Démarre {dayjs(project.startDate).format("DD/MM/YYYY")}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<LuCalendarClock className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Fini le {dayjs(project.endDate).format("DD/MM/YYYY")}
                  </span>
                </IconText>
                <IconText
                  className="mb-4"
                  icon={<LuCalendarPlus className="text-lg opacity-70" />}
                >
                  <span className="font-semibold">
                    Crée le {dayjs(project.createdAt).format("DD/MM/YYYY")}
                  </span>
                </IconText>
                <hr className="my-6" />
                <p className="font-semibold mb-4">Client</p>
                <IconText
                  key={project.customer._id}
                  className="mb-4"
                  icon={
                    <Avatar size={20} shape="circle" icon={<HiUserCircle />} />
                  }
                >
                  <span className="font-semibold text-gray-700 dark:text-gray-100">
                    {project.customer.firstName +
                      " " +
                      project.customer.lastName}
                  </span>
                </IconText>
                <p className="font-semibold mb-4 mt-8">Producteur</p>
                <IconText
                  key={project.producer._id}
                  className="mb-4"
                  icon={
                    <Avatar size={20} shape="circle" icon={<HiUserCircle />} />
                  }
                >
                  <span className="font-semibold text-gray-700 dark:text-gray-100">
                    {project.producer.firstName +
                      " " +
                      project.producer.lastName}
                  </span>
                </IconText>
              </AdaptableCard>
        </div>
    );
}

export default DetailsRight
