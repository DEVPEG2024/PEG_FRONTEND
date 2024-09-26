import { API_BASE_URL } from "@/configs/api.config"

export const TOKEN_TYPE = 'Bearer '
export const REQUEST_HEADER_AUTH_KEY = 'Authorization'

// AUTH
export const LOGIN_API_URL = API_BASE_URL + '/auth/login/'
export const REGISTER_API_URL = API_BASE_URL + '/auth/register/'
export const FORGOT_PASSWORD_API_URL = API_BASE_URL + '/auth/forgot-password/'
export const RESET_PASSWORD_API_URL = API_BASE_URL + '/auth/reset-password/'


// CUSTOMERS
export const GET_CUSTOMERS_API_URL = API_BASE_URL + '/customers/admin'
export const POST_CUSTOMERS_API_URL = API_BASE_URL + '/customers/admin/create'
export const PUT_CUSTOMERS_API_URL = API_BASE_URL + '/customers/admin/update'
export const PUT_CUSTOMERS_STATUS_API_URL = API_BASE_URL + '/customers/admin/update-status'
export const DELETE_CUSTOMERS_API_URL = API_BASE_URL + '/customers/admin/delete'


// CATEGORIES CUSTOMERS
export const GET_CATEGORIES_CUSTOMERS_API_URL = GET_CUSTOMERS_API_URL + '/category'
export const POST_CATEGORY_CUSTOMERS_API_URL = GET_CUSTOMERS_API_URL + '/category/create'
export const PUT_CATEGORY_CUSTOMERS_API_URL = GET_CUSTOMERS_API_URL + '/category/update'
export const DELETE_CATEGORY_CUSTOMERS_API_URL = GET_CUSTOMERS_API_URL + '/category/delete'


// PRODUCERS
export const GET_PRODUCERS_API_URL = API_BASE_URL + '/producers/admin'
export const POST_PRODUCERS_API_URL = API_BASE_URL + '/producers/admin/create'
export const PUT_PRODUCERS_API_URL = API_BASE_URL + '/producers/admin/update'
export const PUT_PRODUCERS_STATUS_API_URL = API_BASE_URL + '/producers/admin/update-status'
export const DELETE_PRODUCERS_API_URL = API_BASE_URL + '/producers/admin/delete'


// CATEGORIES PRODUCERS
export const GET_CATEGORIES_PRODUCERS_API_URL = GET_PRODUCERS_API_URL + '/category/'
export const POST_CATEGORY_PRODUCERS_API_URL = GET_PRODUCERS_API_URL + '/category/create'
export const PUT_CATEGORY_PRODUCERS_API_URL = GET_PRODUCERS_API_URL + '/category/update'
export const DELETE_CATEGORY_PRODUCERS_API_URL = GET_PRODUCERS_API_URL + '/category/delete'


// PROJECTS
export const GET_PROJECTS_API_URL = API_BASE_URL + '/projects/admin'
export const GET_PROJECTS_CUSTOMER_API_URL = API_BASE_URL + '/projects/customer'
export const GET_PROJECTS_PRODUCER_API_URL = API_BASE_URL + '/projects/producer'
export const POST_PROJECTS_API_URL = API_BASE_URL + '/projects/admin/create'
export const PUT_PROJECTS_API_URL = API_BASE_URL + '/projects/admin/edit'
export const PUT_PROJECTS_STATUS_API_URL = API_BASE_URL + '/projects/admin/update-status'
export const DELETE_PROJECTS_API_URL = API_BASE_URL + '/projects/admin/delete'
export const PAY_PRODUCER_API_URL = API_BASE_URL + '/wallets/admin/pay-producer'
export const UPLOAD_FILE_API_URL = API_BASE_URL + '/projects/admin/upload-file'
export const DELETE_FILE_API_URL = API_BASE_URL + '/projects/admin/delete-file'
// TASKS
export const POST_TASKS_API_URL = API_BASE_URL + '/projects/admin/task/create'
export const PUT_TASKS_API_URL = API_BASE_URL + '/projects/admin/task/update'
export const DELETE_TASKS_API_URL = API_BASE_URL + '/projects/admin/task/delete'
export const CHANGE_TASK_STATUS_API_URL = API_BASE_URL + '/projects/admin/task/update-status'

// INVOICES PROJECTS
export const GET_INVOICES_PROJECT_API_URL = API_BASE_URL + '/projects/admin/invoices'
export const POST_INVOICES_PROJECT_API_URL = API_BASE_URL + '/projects/admin/invoices/create'
export const DELETE_INVOICES_PROJECT_API_URL = API_BASE_URL + '/projects/admin/invoices/delete'
export const PUT_INVOICES_PROJECT_API_URL = API_BASE_URL + '/projects/admin/invoices/edit'

// COMMENTS PROJECTS
export const POST_COMMENT_API_URL = API_BASE_URL + '/projects/admin/comment/create'
export const GET_COMMENTS_API_URL = API_BASE_URL + '/projects/admin/comment'
export const DELETE_COMMENT_API_URL = API_BASE_URL + '/projects/admin/comment/delete'

// FILES
export const API_URL_IMAGE = API_BASE_URL + '/public/uploads/'

// PRODUCTS
export const GET_PRODUCTS_API_URL = API_BASE_URL + '/products/admin'
export const POST_PRODUCTS_API_URL = API_BASE_URL + '/products/admin/create'
export const PUT_PRODUCTS_API_URL = API_BASE_URL + '/products/admin/edit'
export const DELETE_PRODUCTS_API_URL = API_BASE_URL + '/products/admin/delete'

// CATEGORIES PRODUCTS
export const GET_CATEGORIES_PRODUCTS_API_URL = API_BASE_URL + '/products/admin/category-product'
export const POST_CATEGORY_PRODUCTS_API_URL = API_BASE_URL + '/products/admin/category-product/create'
export const PUT_CATEGORY_PRODUCTS_API_URL = API_BASE_URL + '/products/admin/category-product/edit'
export const DELETE_CATEGORY_PRODUCTS_API_URL = API_BASE_URL + '/products/admin/category-product/delete'



// TEAMS
export const GET_TEAMS_API_URL = API_BASE_URL + '/teams/admin'
export const POST_TEAMS_API_URL = API_BASE_URL + '/teams/admin/create'
export const PUT_TEAMS_API_URL = API_BASE_URL + '/teams/admin/edit'
export const DELETE_TEAMS_API_URL = API_BASE_URL + '/teams/admin/delete'
export const PUT_TEAMS_STATUS_API_URL = API_BASE_URL + '/teams/admin/update-status'

// INVOICES 
export const GET_INVOICES_API_URL = API_BASE_URL + '/invoices/admin'
export const POST_INVOICES_API_URL = API_BASE_URL + '/invoices/admin/create'
export const DELETE_INVOICES_API_URL = API_BASE_URL + '/invoices/admin/delete'
export const GET_INVOICES_BY_USER_ID_API_URL = API_BASE_URL + '/invoices/customer'
export const PUT_INVOICES_API_URL = API_BASE_URL + '/invoices/admin/edit'
export const PUT_INVOICES_STATUS_API_URL = API_BASE_URL + '/invoices/admin/update-status'

// TICKETS
export const GET_TICKETS_API_URL = API_BASE_URL + '/tickets'
export const POST_TICKETS_API_URL = API_BASE_URL + '/tickets/create'
export const DELETE_TICKETS_API_URL = API_BASE_URL + '/tickets/delete'
export const PUT_TICKETS_API_URL = API_BASE_URL + '/tickets/edit'
export const PUT_TICKETS_STATUS_API_URL = API_BASE_URL + '/tickets/update-status'


// BANNERS
export const GET_BANNERS_API_URL = API_BASE_URL + '/banners'
export const POST_BANNERS_API_URL = API_BASE_URL + '/banners/create'
export const DELETE_BANNERS_API_URL = API_BASE_URL + '/banners/delete'
export const PUT_BANNERS_API_URL = API_BASE_URL + '/banners/edit'
export const PUT_BANNERS_STATUS_API_URL = API_BASE_URL + '/banners/update-status'
