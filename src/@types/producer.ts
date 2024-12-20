import { CompanyInformations } from "./customer";

export type ProducerCategory = {
  documentId: string;
  name: string;
  producers: Producer[];
}

export type Producer = {
  documentId: string;
  name: string;
  companyInformations: CompanyInformations;
  producerCategory: ProducerCategory;
}