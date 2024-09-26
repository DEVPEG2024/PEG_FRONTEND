import { env } from "./env.config";

export const API_BASE_URL = env?.API_ENDPOINT_URL ?? ''
export const API_URL_IMAGE = API_BASE_URL+"/public/uploads/";
export const API_URL_IMAGE_RAYON = API_BASE_URL+"/public/uploads/rayons/";
export const API_URL_IMAGE_PRODUCT = API_BASE_URL+"/public/uploads/products/";

