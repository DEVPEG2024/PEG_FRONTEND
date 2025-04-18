import { lazy } from "react";
import authRoute from "./authRoute";
import type { Routes } from "@/@types/routes";
import { SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER } from "@/constants/roles.constant";

export const publicRoutes: Routes = [...authRoute];

const protectedAdminRoutes = [
  // customers
  {
    key: "admin.customers.list",
    path: "/admin/customers/list",
    component: lazy(() => import("@/views/app/admin/customers/lists/CustomersList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.add",
    path: "/admin/customers/add",
    component: lazy(
      () => import("@/views/app/admin/customers/lists/EditCustomer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.edit",
    path: "/admin/customers/edit/:documentId",
    component: lazy(
      () => import("@/views/app/admin/customers/lists/EditCustomer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.customers.categories",
    path: "/admin/customers/categories",
    component: lazy(() => import("@/views/app/admin/customers/categories/CustomerCategoriesList")),
    authority: [SUPER_ADMIN],
  },
  // producers
  {
    key: "admin.producers.list",
    path: "/admin/producers/list",
    component: lazy(() => import("@/views/app/admin/producers/lists/ProducersList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.add",
    path: "/admin/producers/add",
    component: lazy(
      () => import("@/views/app/admin/producers/lists/EditProducer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.edit",
    path: "/admin/producers/edit/:documentId",
    component: lazy(
      () => import("@/views/app/admin/producers/lists/EditProducer")
    ),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.producers.categories",
    path: "/admin/producers/categories",
    component: lazy(() => import("@/views/app/admin/producers/categories/ProducerCategoriesList")),
    authority: [SUPER_ADMIN],
  },

  // products
  {
    key: "admin.products",
    path: "/admin/products",
    component: lazy(() => import("@/views/app/admin/products/ProductsList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.products.new",
    path: "/admin/products/new",
    component: lazy(() => import("@/views/app/admin/products/product/EditProduct")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.products.edit",
    path: "/admin/products/edit/:documentId",
    component: lazy(() => import("@/views/app/admin/products/product/EditProduct")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.products.categories",
    path: "/admin/products/categories",
    component: lazy(() => import("@/views/app/admin/products/categories/ProductCategories")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.products.categories.products",
    path: "/admin/products/categories/:documentId",
    component: lazy(() => import("@/views/app/admin/products/categories/AdminProductsOfCategory")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.products.sizes",
    path: "/admin/products/sizes",
    component: lazy(() => import("@/views/app/admin/products/sizes/SizesList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.products.colors",
    path: "/admin/products/colors",
    component: lazy(() => import("@/views/app/admin/products/colors/ColorsList")),
    authority: [SUPER_ADMIN],
  },
  //orders
  {
    key: "admin.store.orders",
    path: "/admin/store/orders",
    component: lazy(() => import("@/views/app/admin/orders/OrderItemsList")),
    authority: [SUPER_ADMIN],
  },
  //forms
  {
    key: "admin.forms",
    path: "/admin/forms",
    component: lazy(() => import("@/views/app/admin/forms/FormsList")),
    authority: [SUPER_ADMIN],
  },
  //users
  {
    key: "admin.users",
    path: "/admin/users",
    component: lazy(() => import("@/views/app/admin/users/UsersList")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.users.add",
    path: "/admin/users/add",
    component: lazy(() => import("@/views/app/admin/users/EditUser")),
    authority: [SUPER_ADMIN],
  },
  {
    key: "admin.users.edit",
    path: "/admin/users/edit/:documentId",
    component: lazy(() => import("@/views/app/admin/users/EditUser")),
    authority: [SUPER_ADMIN],
  },
  //invoices
  {
    key: "admin.invoices",
    path: "/admin/invoices",
    component: lazy(() => import("@/views/app/common/invoices/InvoicesList")),
    authority: [SUPER_ADMIN],
  },
  //banners
  {
    key: "admin.banners",
    path: "/admin/banners",
    component: lazy(() => import("@/views/app/admin/banners/BannersList")),
    authority: [SUPER_ADMIN],
  },
];
const protectedCustomersRoutes = [
  {
    key: "customer.products",
    path: "/customer/products",
    component: lazy(() => import("@/views/app/customer/products/lists")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.product",
    path: "/customer/product/:documentId",
    component: lazy(() => import("@/views/app/customer/products/show/ShowProduct")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.product",
    path: "/customer/product/:id/edit",
    component: lazy(() => import("@/views/app/customer/products/show/ShowProduct")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.catalogue",
    path: "/customer/catalogue",
    component: lazy(() => import("@/views/app/customer/catalogue")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.catalogue.categories.products",
    path: "/customer/catalogue/categories/:documentId",
    component: lazy(() => import("@/views/app/customer/catalogue/CustomerProductsOfCategory")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.cart",
    path: "/customer/cart",
    component: lazy(() => import("@/views/app/customer/cart/Cart")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.invoices",
    path: "/customer/invoices",
    component: lazy(() => import("@/views/app/common/invoices/InvoicesList")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.checkout.success",
    path: "/customer/checkout/success",
    component: lazy(() => import("@/views/app/customer/cart/Success")),
    authority: [CUSTOMER],
  },
  {
    key: "customer.checkout.cancel",
    path: "/customer/checkout/cancel",
    component: lazy(() => import("@/views/app/customer/cart/Cancel")),
    authority: [CUSTOMER],
  },
];
const protectedProducerRoutes = [
  {
    key: "producer.pool",
    path: "/producer/pool",
    component: lazy(() => import("@/views/app/producer/pool/PoolProjectsList")),
    authority: [PRODUCER],
  },
  {
    key: "producer.wallet",
    path: "/producer/wallet",
    component: lazy(() => import("@/views/app/producer/wallet/TransactionsList")),
    authority: [PRODUCER],
  },
];

const protectedCommonRoutes = [
  {
    key: "common.order.show",
    path: "/common/orderItem/:documentId",
    component: lazy(() => import("@/views/app/common/orderItem/ShowOrderItem")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, ADMIN],
    meta: {
      pageContainerType: "gutterless",
    },
  },
  {
    key: "common.projects.details",
    path: "/common/projects/details/:documentId",
    component: lazy(() => import("@/views/app/common/projects/details/ProjectDetails")),
    authority: [CUSTOMER, PRODUCER, ADMIN, SUPER_ADMIN],
    meta: {
      pageContainerType: "gutterless",
    },
  },
  {
    key: "common.projects",
    path: "/common/projects",
    component: lazy(() => import("@/views/app/common/projects/ProjectsList")),
    authority: [CUSTOMER, PRODUCER, ADMIN, SUPER_ADMIN],
  },
  {
    key: "default.support",
    path: "/support",
    component: lazy(() => import("@/views/app/common/tickets/TicketsList")),
    authority: [CUSTOMER, PRODUCER, ADMIN, SUPER_ADMIN],
  },
]

const protectedDefaultRoutes = [
  {
    key: "home",
    path: "/home",
    component: lazy(() => import("@/views/Home")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER],
    meta: {
      pageContainerType: "gutterless",
    },
  },
  {
    key: "default.settings",  
    path: "/settings/profile",
    component: lazy(() => import("@/views/app/account/Settings")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER],
  },
  {
    key: "default.settings.password",
    path: "/settings/password",
    component: lazy(() => import("@/views/app/account/Settings")),
    authority: [SUPER_ADMIN, CUSTOMER, PRODUCER, PUBLISHER, ADMIN, USER],
  },
];
export const protectedRoutes = [
  ...protectedAdminRoutes,
  ...protectedCustomersRoutes,
  ...protectedProducerRoutes,
  ...protectedCommonRoutes,
  ...protectedDefaultRoutes,
];
