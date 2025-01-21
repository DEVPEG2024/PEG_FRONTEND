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
    path: "/common/projects",
    title: "Mes projets",
    translateKey: "nav.projects",
    icon: "projects",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [PRODUCER],
    subMenu: [],
  },
  {
    key: "producer.pool",
    path: "/producer/pool",
    title: "Piscine",
    translateKey: "nav.pool",
    icon: "pool",
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
  // TODO SUITE: vérifier que accès OK à support + accès au support pour client ? car pas dans son NavigationTree
  {
    key: "producer.support",
    path: "/support",
    title: "Support",
    translateKey: "nav.support",
    icon: "support",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [PRODUCER],
    subMenu: [],
  },
  // TODO SUITE: vérifier que accès OK à paramètres
  {
    key: "producer.settings",
    path: "/settings/profile",
    title: "PARAMÈTRES",
    translateKey: "nav.settings",
    icon: "settings",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [PRODUCER],
    subMenu: [],
  },
  
  
]

export default navigationProducteur;
