import {
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'
import { CUSTOMER } from '@/constants/roles.constant';


const navigationCustomer: NavigationTree[] = [
  {
    key: "home",
    path: "/home",
    title: "Accueil",
    translateKey: "nav.home",
    icon: "home",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "products",
    path: "/products",
    title: "Mes offres",
    translateKey: "nav.mesoffres",
    icon: "storeList",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "projects",
    path: "/projects",
    title: "Mes projets",
    translateKey: "nav.mesprojets",
    icon: "projects",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },

  {
    key: "catalogue",
    path: "/catalogue",
    title: "Catalogue",
    translateKey: "nav.catalogue",
    icon: "categories",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "invoices",
    path: "/invoices",
    title: "Mes factures",
    translateKey: "nav.mesfactures",
    icon: "invoices",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "default.settings",
    path: "/settings/profile",
    title: "PARAMÈTRES",
    translateKey: "nav.settings",
    icon: "settings",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },

];

export default navigationCustomer;
