import { Invoice } from '@/@types/invoice';
import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL, EXPRESS_BACKEND_URL } from '@/configs/api.config';
import { AxiosError, AxiosResponse } from 'axios';

// ─── Lignes de facture (`lines`) ─────────────────────────────────────────────
// Champ ajouté côté Strapi le 24/11/2026. Tant que le backend n'est pas
// redéployé, le demander fait échouer TOUTE la requête (champ inconnu → 400).
// On le demande donc ; si le serveur ne le connaît pas, on rejoue sans lui et
// on s'en souvient pour la session (même mécanique que `mobileImage` des
// bannières — l'introspection GraphQL est désactivée en prod). Sans le champ,
// l'affichage reconstitue les lignes (utils/invoiceLines.ts).
let invoiceLinesSupport: boolean | null = null;

/** `false` seulement quand le serveur a refusé le champ (pas encore déployé). */
export const isInvoiceLinesSupported = (): boolean => invoiceLinesSupport !== false;

const rejectsLines = (payload: unknown): boolean => {
    const errors = (payload as { errors?: { message?: string }[] } | undefined)?.errors;
    return Array.isArray(errors) && errors.some((e) => /"lines"/.test(e?.message ?? ''));
};

type GraphQLRequest = { query: string; variables?: Record<string, unknown> };

/**
 * Requête GraphQL qui mentionne `lines`. `build(false)` doit produire la même
 * requête sans ce champ (sélection ET données écrites). Une requête refusée
 * pour champ inconnu échoue à la validation : rien n'a été écrit, la rejouer
 * est sans risque (aucun numéro de facture consommé).
 */
async function fetchInvoiceGraphQL<T>(build: (withLines: boolean) => GraphQLRequest): Promise<AxiosResponse<T>> {
    const send = (withLines: boolean) =>
        ApiService.fetchData<T>({ url: API_GRAPHQL_URL, method: 'post', data: build(withLines) });

    if (invoiceLinesSupport !== false) {
        try {
            const res = await send(true);
            if (!rejectsLines(res.data)) {
                invoiceLinesSupport = true;
                return res;
            }
        } catch (err) {
            if (!rejectsLines((err as AxiosError)?.response?.data)) throw err;
        }
        invoiceLinesSupport = false;
    }
    return send(false);
}

const linesField = (withLines: boolean) => (withLines ? 'lines' : '');

/** Retire `lines` des données écrites quand le serveur ne le connaît pas. */
const withoutLines = <D extends object>(data: D, withLines: boolean): D => {
    if (withLines || !('lines' in data)) return data;
    const { lines: _ignored, ...rest } = data as D & { lines?: unknown };
    return rest as D;
};

/**
 * Le serveur conserve-t-il les lignes ? (Une seule requête par session ; sert
 * à prévenir l'admin avant l'émission d'une facture.)
 */
export async function probeInvoiceLinesSupport(): Promise<boolean> {
    if (invoiceLinesSupport !== null) return invoiceLinesSupport;
    try {
        await fetchInvoiceGraphQL((withLines) => ({
            query: `query ProbeInvoiceLines { invoices(pagination: { limit: 1 }) { documentId ${linesField(withLines)} } }`,
        }));
    } catch {
        return true; // réseau indisponible : ne rien conclure, l'écriture tranchera
    }
    return invoiceLinesSupport !== false;
}

// Tout ce qu'il faut pour imprimer ou éditer une facture : lignes, commandes,
// projet facturé (repli des factures sans lignes), client complet.
const invoiceDocumentFields = (withLines: boolean) => `
            documentId
            ${linesField(withLines)}
            orderItems (pagination: {limit: 100}){
                documentId
                product {
                    name
                }
                sizeAndColorSelections
                price
            }
            project {
                documentId
                name
                orderItem {
                    documentId
                    price
                    product {
                        name
                    }
                    sizeAndColorSelections
                }
            }
            customer {
                documentId
                name
                companyInformations {
                    email
                    phoneNumber
                    siretNumber
                    vatNumber
                    zipCode
                    city
                    country
                    address
                }
            }
            amount
            vatAmount
            totalAmount
            name
            state
            paymentDate
            paymentState
            paymentMethod
            paymentReference
            paymentAmount
            date
            dueDate
            file {
                documentId
                url
                name
            }
`;

/**
 * Une facture complète, relue au serveur (impression, édition) : le PDF reflète
 * toujours l'état enregistré, quel que soit l'écran qui l'ouvre.
 */
export async function apiGetInvoiceDocument(documentId: string): Promise<Invoice | null> {
    const res = await fetchInvoiceGraphQL<ApiResponse<{ invoice: Invoice | null }>>((withLines) => ({
        query: `
    query GetInvoiceDocument($documentId: ID!) {
        invoice(documentId: $documentId) {
            ${invoiceDocumentFields(withLines)}
        }
    }`,
        variables: { documentId },
    }));
    const errors = (res.data as { errors?: { message: string }[] }).errors;
    if (errors?.length && !res.data?.data?.invoice) throw new Error(errors[0]?.message ?? 'GraphQL error');
    return res.data?.data?.invoice ?? null;
}

// create invoice
// `name` = le numéro de facture. Il est attribué par le SERVEUR : ne pas le
// renseigner pour une facture émise par PEG. Seul cas où il est transmis (et
// conservé) : le téléversement d'un PDF externe, dont on garde le nom de
// fichier — ce document reste hors de la séquence FAC-XXXX.
export type CreateInvoiceRequest = Omit<Invoice, "documentId" | "name" | "project"> & {
    name?: string
    /** Projet facturé (documentId) : relie la facture et permet au serveur d'en déduire les lignes. */
    project?: string | null
}

export async function apiCreateInvoice(data: CreateInvoiceRequest): Promise<AxiosResponse<ApiResponse<{createInvoice: Invoice}>>> {
    const { customer: _c, orderItems: _o, project, ...invoiceData } = data;
    return fetchInvoiceGraphQL<ApiResponse<{createInvoice: Invoice}>>((withLines) => ({
        query: `
    mutation CreateInvoice($data: InvoiceInput!) {
        createInvoice(data: $data) {
            ${invoiceDocumentFields(withLines)}
        }
    }
  `,
        variables: {
            data: withoutLines({
                ...invoiceData,
                customer: data.customer?.documentId,
                orderItems: data.orderItems?.map(({documentId}) => documentId) ?? [],
                ...(project ? { project } : {}),
            }, withLines),
        },
    }));
}

// get invoices
export type GetInvoicesRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetInvoicesResponse = {
    nodes: Invoice[]
    pageInfo: PageInfo
};

export async function apiGetInvoices(data: GetInvoicesRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{invoices_connection: GetInvoicesResponse}>>> {
    const query = `
    query GetInvoices($searchTerm: String, $pagination: PaginationArg) {
        invoices_connection(filters: {name: {containsi: $searchTerm}}, pagination: $pagination, sort: ["createdAt:desc"]) {
            nodes {
                documentId
                orderItems (pagination: {limit: 100}){
                    documentId
                    product {
                        name
                    }
                    sizeAndColorSelections
                    price
                }
                customer {
                    documentId
                    name
                    companyInformations {
                        email
                        phoneNumber
                        siretNumber
                        vatNumber
                        zipCode
                        city
                        country
                        address
                    }
                }
                amount
                vatAmount
                totalAmount
                name
                state
                paymentDate
                paymentState
                paymentMethod
                date
                dueDate
                file {
                    documentId
                    url
                    name
                }
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
  variables = {
    ...data
  }
    return ApiService.fetchData<ApiResponse<{invoices_connection: GetInvoicesResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// Factures d'un client, version légère pour son accueil (montant à régler,
// « À faire », activité). La page Factures garde apiGetCustomerInvoices.
export type CustomerInvoiceSummary = Pick<Invoice, 'documentId' | 'name' | 'state' | 'paymentState' | 'totalAmount' | 'date' | 'dueDate'>;

export async function apiGetCustomerInvoiceSummaries(customerDocumentId: string): Promise<CustomerInvoiceSummary[]> {
    const query = `
    query CustomerInvoiceSummaries($customerDocumentId: ID!) {
        invoices_connection(
            filters: { customer: { documentId: { eq: $customerDocumentId } } }
            pagination: { page: 1, pageSize: 200 }
            sort: ["date:desc"]
        ) {
            nodes { documentId name state paymentState totalAmount date dueDate }
        }
    }
  `;
    const res = await ApiService.fetchData<ApiResponse<{ invoices_connection: { nodes: CustomerInvoiceSummary[] } }>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: { query, variables: { customerDocumentId } },
    });
    return res.data?.data?.invoices_connection?.nodes ?? [];
}

// get customer invoices
export type GetCustomerInvoicesRequest = {
    customerDocumentId: string;
    pagination: PaginationRequest;
    searchTerm: string;
  };

export async function apiGetCustomerInvoices(data: GetCustomerInvoicesRequest = {customerDocumentId: '', pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{invoices_connection: GetInvoicesResponse}>>> {
    const query = `
    query GetCustomerInvoices($customerDocumentId: ID!, $searchTerm: String, $pagination: PaginationArg) {
        invoices_connection(filters: {
            and: [
            {
                customer: {
                documentId: {eq: $customerDocumentId}
                }
            },
            {
                name: {containsi: $searchTerm}
            }
            ]
            }, pagination: $pagination, sort: ["createdAt:desc"]) {
            nodes {
                documentId
                orderItems (pagination: {limit: 100}){
                    documentId
                    product {
                        name
                        # Économie Premium : catalogue public seulement
                        inCatalogue
                    }
                    sizeAndColorSelections
                    price
                }
                customer {
                    documentId
                    name
                    companyInformations {
                        email
                        phoneNumber
                        siretNumber
                        vatNumber
                        zipCode
                        city
                        country
                        address
                    }
                }
                amount
                vatAmount
                totalAmount
                name
                state
                paymentDate
                paymentState
                paymentMethod
                date
                dueDate
                file {
                    documentId
                    url
                    name
                }
            }
            pageInfo {
                page
                pageCount
                pageSize
                total
            }
        }
    }
  `,
  variables = {
    ...data
  }
    return ApiService.fetchData<ApiResponse<{invoices_connection: GetInvoicesResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// update invoice
export async function apiUpdateInvoice(invoice: Partial<Invoice>): Promise<AxiosResponse<ApiResponse<{updateInvoice: Invoice}>>> {
    // `project` est une relation en lecture seule ici : jamais réécrite par l'édition.
    const { documentId, project: _p, ...data } = invoice;
    return fetchInvoiceGraphQL<ApiResponse<{updateInvoice: Invoice}>>((withLines) => ({
        query: `
    mutation UpdateInvoice($documentId: ID!, $data: InvoiceInput!) {
        updateInvoice(documentId: $documentId, data: $data) {
            ${invoiceDocumentFields(withLines)}
        }
    }
  `,
        variables: { documentId, data: withoutLines(data, withLines) },
    }));
}

// Contrôle de cohérence de la séquence (admins).
// Répond à « comment sait-on que la numérotation est saine ? » autrement que
// par la confiance : doublons, trous, ruptures de chronologie.
export type NumberingReport = {
    series: string
    lastNumber: string | null
    counts: { inSeries: number; legacySeries: number; externalDocuments: number }
    duplicates: { name: string; count: number }[]
    missing: string[]
    chronologyIssues: { previous: string; current: string }[]
    allocatedUnused: { number: string; allocated_at: string; source: string }[]
    healthy: boolean
}

export async function apiGetNumberingReport(): Promise<NumberingReport> {
    const res = await ApiService.fetchData<NumberingReport>({
        url: `${EXPRESS_BACKEND_URL}/invoices/numbering-report`,
        method: 'get',
    })
    return res.data
}

// ⚠️ Le numéro de facture n'est PLUS calculé côté navigateur.
//
// Il l'était par un MAX()+1 sur les factures existantes, en même temps que NOVA
// faisait le même calcul de son côté : deux créations rapprochées lisaient le
// même maximum et produisaient le même numéro. Depuis, la séquence FAC-XXXX est
// attribuée de façon atomique par Strapi à l'insertion, pour TOUTES les sources
// (admin PEG, NOVA, Stripe, devis, paiement différé).
//
// Conséquence : ne jamais renseigner `name` à la création — le numéro réel est
// dans la réponse de `apiCreateInvoice`.
// Voir peg_strapi/src/services/invoice-numbering.service.ts.

// delete invoice
export type DeleteInvoiceResponse = {
    documentId: string
}

export async function apiDeleteInvoice(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteInvoice: DeleteInvoiceResponse}>>> {
    const query = `
    mutation DeleteInvoice($documentId: ID!) {
        deleteInvoice(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteInvoice: DeleteInvoiceResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}