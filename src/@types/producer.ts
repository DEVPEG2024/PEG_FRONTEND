import { CompanyInformations } from "./customer";
import { Project } from "./project";

export type ProducerCategory = {
  documentId: string;
  name: string;
  producers: Producer[];
}

export type DeliveryZone = 'regional' | 'national' | 'international';
export type PriceRange = 'low' | 'medium' | 'premium';

export type Producer = {
  documentId: string;
  name: string;
  companyInformations: CompanyInformations;
  producerCategory: ProducerCategory;
  projects: Project[];
  // Compétences & Spécialités
  productCategories: string[] | null;
  strengths: string | null;
  weaknesses: string | null;
  certifications: string[] | null;
  // Capacité de production
  minOrderQuantity: number | null;
  maxMonthlyQuantity: number | null;
  averageDeliveryDays: number | null;
  expressDeliveryDays: number | null;
  deliveryZone: DeliveryZone | null;
  // Qualité & Fiabilité
  reliabilityScore: number | null;
  customerSatisfactionRate: number | null;
  completedOrdersCount: number | null;
  internalComments: string | null;
  // Tarification
  priceRange: PriceRange | null;
  volumeDiscountAvailable: boolean | null;
  volumeDiscountRate: number | null;
}
