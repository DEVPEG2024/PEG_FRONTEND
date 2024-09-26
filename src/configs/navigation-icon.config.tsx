import {
    HiOutlineViewGrid,
    HiOutlineClipboardList,
    HiOutlineCog,
    HiUsers,
} from 'react-icons/hi'
import { MdOutlineMail, MdOutlineStorefront } from "react-icons/md";
import { FiUsers } from "react-icons/fi";
import { LuUsers } from "react-icons/lu";
import { RiHomeSmile2Line } from "react-icons/ri";
import { PiStorefront } from "react-icons/pi";
import { GoTasklist } from "react-icons/go";
import { SlSupport } from "react-icons/sl";
import { MdOutlineWorkOutline } from "react-icons/md";
import { GoPeople } from "react-icons/go";
import { IoWalletOutline } from "react-icons/io5";
import { AiOutlineProject } from "react-icons/ai";
import { RiTeamLine } from "react-icons/ri";
import { GoFileDiff } from "react-icons/go";
import { PiFlagBannerBold, PiSwimmingPoolBold } from "react-icons/pi";


export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    home: <RiHomeSmile2Line />,
    categories: <HiOutlineViewGrid />,
    products: <GoPeople />,
    orders: <HiOutlineClipboardList />,
    customers: <FiUsers />,
    settings: <HiOutlineCog />,
    markets: <MdOutlineStorefront />,
    users: <HiUsers />,
    producers: <LuUsers />,
    offers: <MdOutlineWorkOutline />,
    offersForms: <MdOutlineWorkOutline />,
    store: <PiStorefront />,
    storeOrders: <PiStorefront />,
    storeProducts: <PiStorefront />,
    storeAdd: <PiStorefront />,
    storeList: <PiStorefront />,
    tasks: <GoTasklist />,
    support: <SlSupport />,
    wallet: <IoWalletOutline />,
    projects: <AiOutlineProject />,
    teams: <RiTeamLine />,
    invoices: <GoFileDiff />,
    mail: <MdOutlineMail />,
    banners: <PiFlagBannerBold />,
    piscine: <PiSwimmingPoolBold />,
}

export default navigationIcon
