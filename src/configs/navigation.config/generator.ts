import {
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'
import { GENERATOR } from '@/constants/roles.constant';

/**
 * Menu du Générateur (apporteur d'affaires).
 *
 * Périmètre volontairement minimal : un tableau de bord (parrainage + suivi)
 * et un wallet (commissions et versements). Le générateur n'accède ni au
 * catalogue, ni aux projets, ni aux données des autres profils.
 */
const navigationGenerator: NavigationTree[] = [
  {
    key: "generator.home",
    path: "/home",
    title: "Tableau de bord",
    translateKey: "nav.home",
    icon: "home",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [GENERATOR],
    subMenu: [],
  },
  {
    key: "generator.wallet",
    path: "/generator/wallet",
    title: "Mon wallet",
    translateKey: "nav.wallet",
    icon: "wallet",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [GENERATOR],
    subMenu: [],
  },
  {
    key: "generator.settings",
    path: "/settings/profile",
    title: "Paramètres",
    translateKey: "nav.settings",
    icon: "settings",
    type: NAV_ITEM_TYPE_ITEM,
    authority: [GENERATOR],
    subMenu: [],
  },
]

export default navigationGenerator;
