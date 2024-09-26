import {
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'
import { PRODUCER } from '@/constants/roles.constant';


const navigationProducteur: NavigationTree[] = [
  {
    key: "home",
    path: "/home",
    title: "Accueil",
    translateKey: "nav.home",
    icon: "home",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [PRODUCER],
    subMenu: [],
  },
  {
    key: "producer.projects",
    path: "/producer/projects",
    title: "Mes projets",
    translateKey: "nav.projects",
    icon: "projects",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [PRODUCER],
    subMenu: [],
  },
  {
    key: "producer.piscine",
    path: "/producer/piscine",
    title: "Piscine",
    translateKey: "nav.piscine",
    icon: "piscine",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [PRODUCER],
    subMenu: [],
  },
  {
    key: "producer.wallet",
    path: "/producer/wallet",
    title: "Mon Wallet",
    translateKey: "nav.wallet",
    icon: "wallet",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [PRODUCER],
    subMenu: [],
  },
  
  
]

export default navigationProducteur;
