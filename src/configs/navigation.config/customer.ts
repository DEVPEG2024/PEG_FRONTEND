import {
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'
import { CUSTOMER } from '@/constants/roles.constant';


const navigationCustomer: NavigationTree[] = [
  {
    key: "customer.home",
    path: "/customer/home",
    title: "Accueil",
    translateKey: "nav.home",
    icon: "home",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "customer.products",
    path: "/customer/products",
    title: "Mes offres",
    translateKey: "nav.mesoffres",
    icon: "storeList",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "customer.projects",
    path: "/customer/projects",
    title: "Mes projets",
    translateKey: "nav.mesprojets",
    icon: "projects",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },

  {
    key: "customer.catalogue",
    path: "/customer/catalogue",
    title: "Catalogue",
    translateKey: "nav.catalogue",
    icon: "categories",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "customer.invoices",
    path: "/customer/invoices",
    title: "Mes factures",
    translateKey: "nav.mesfactures",
    icon: "invoices",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [CUSTOMER],
    subMenu: [],
  },
  {
    key: "customer.settings",
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
