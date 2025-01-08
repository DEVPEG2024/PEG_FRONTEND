import { CompanyInformations } from "./customer";
import { Project } from "./project";

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
  projects: Project[]
}