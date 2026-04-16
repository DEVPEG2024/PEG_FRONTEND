import { Expense } from '@/@types/expense';
import ApiService from './ApiService';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL, API_BASE_URL } from '@/configs/api.config';
import { AxiosResponse } from 'axios';

// Nettoie les données avant envoi : strings vides → null, retire les champs non attendus
// NOTE: 'receipt' (media) n'est PAS dans ALLOWED — les médias se lient via REST, pas GraphQL
function cleanExpenseInput(raw: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  const ALLOWED = ['label', 'description', 'amount', 'vatAmount', 'totalAmount', 'category', 'status', 'date', 'dueDate', 'paidDate', 'supplierName', 'project', 'recurring', 'recurrenceInterval', 'recurrenceEndDate'];
  for (const key of ALLOWED) {
    if (!(key in raw)) continue;
    const val = raw[key];
    // Strapi rejette "" pour les champs Date — envoyer null
    if (val === '' || val === undefined) {
      clean[key] = null;
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

// Lie un fichier média à un champ d'une entry Strapi via REST
async function linkMediaToExpense(expenseDocumentId: string, fileId: number | string): Promise<void> {
  await ApiService.fetchData({
    url: `${API_BASE_URL}/expenses/${expenseDocumentId}`,
    method: 'put',
    data: { data: { receipt: fileId } },
  });
}

// Supprime le lien média d'une expense
async function unlinkMediaFromExpense(expenseDocumentId: string): Promise<void> {
  await ApiService.fetchData({
    url: `${API_BASE_URL}/expenses/${expenseDocumentId}`,
    method: 'put',
    data: { data: { receipt: null } },
  });
}

// --- Fragment GraphQL commun ---
const EXPENSE_FIELDS = `
  documentId
  label
  description
  amount
  vatAmount
  totalAmount
  category
  status
  date
  dueDate
  paidDate
  supplierName
  project {
    documentId
    name
  }
  receipt {
    documentId
    url
    name
  }
  recurring
  recurrenceInterval
  recurrenceEndDate
  createdAt
  updatedAt
`;

// --- GET expenses ---
export type GetExpensesRequest = {
  pagination: PaginationRequest;
  searchTerm: string;
};

export type GetExpensesResponse = {
  nodes: Expense[];
  pageInfo: PageInfo;
};

export async function apiGetExpenses(
  data: GetExpensesRequest = { pagination: { page: 1, pageSize: 1000 }, searchTerm: '' }
): Promise<AxiosResponse<ApiResponse<{ expenses_connection: GetExpensesResponse }>>> {
  const query = `
    query GetExpenses($searchTerm: String, $pagination: PaginationArg) {
      expenses_connection(
        filters: {
          or: [
            { label: { containsi: $searchTerm } },
            { supplierName: { containsi: $searchTerm } }
          ]
        },
        pagination: $pagination,
        sort: ["date:desc"]
      ) {
        nodes {
          ${EXPENSE_FIELDS}
        }
        pageInfo {
          page
          pageCount
          pageSize
          total
        }
      }
    }
  `;
  return ApiService.fetchData<ApiResponse<{ expenses_connection: GetExpensesResponse }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { ...data } },
  });
}

// --- CREATE expense ---
export type CreateExpenseRequest = Omit<Expense, 'documentId' | 'createdAt' | 'updatedAt'>;

export async function apiCreateExpense(
  data: CreateExpenseRequest
): Promise<AxiosResponse<ApiResponse<{ createExpense: Expense }>>> {
  const query = `
    mutation CreateExpense($data: ExpenseInput!) {
      createExpense(data: $data) {
        ${EXPENSE_FIELDS}
      }
    }
  `;
  const { project: proj, receipt: rec, ...rest } = data;
  const variables = {
    data: cleanExpenseInput({
      ...rest,
      project: proj?.documentId ?? null,
    }),
  };
  const result = await ApiService.fetchData<ApiResponse<{ createExpense: Expense }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables },
  });

  // Lier le justificatif via REST après création (media ≠ relation)
  const created = result.data?.data?.createExpense;
  if (created?.documentId && rec?.documentId) {
    try {
      await linkMediaToExpense(created.documentId, rec.documentId);
    } catch (e) {
      console.warn('[Expense] Erreur liaison justificatif:', e);
    }
  }

  return result;
}

// --- UPDATE expense ---
export async function apiUpdateExpense(
  expense: Partial<Expense>
): Promise<AxiosResponse<ApiResponse<{ updateExpense: Expense }>>> {
  const query = `
    mutation UpdateExpense($documentId: ID!, $data: ExpenseInput!) {
      updateExpense(documentId: $documentId, data: $data) {
        ${EXPENSE_FIELDS}
      }
    }
  `;
  const { documentId, project: proj, receipt: rec, createdAt: _c, updatedAt: _u, ...rest } = expense;
  const payload: Record<string, unknown> = { ...rest };
  if (proj !== undefined) payload.project = proj?.documentId ?? null;

  const result = await ApiService.fetchData<ApiResponse<{ updateExpense: Expense }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { documentId, data: cleanExpenseInput(payload) } },
  });

  // Lier/délier le justificatif via REST
  if (rec !== undefined && documentId) {
    try {
      if (rec?.documentId) {
        await linkMediaToExpense(documentId, rec.documentId);
      } else {
        await unlinkMediaFromExpense(documentId);
      }
    } catch (e) {
      console.warn('[Expense] Erreur liaison justificatif:', e);
    }
  }

  return result;
}

// --- DELETE expense ---
export type DeleteExpenseResponse = { documentId: string };

export async function apiDeleteExpense(
  documentId: string
): Promise<AxiosResponse<ApiResponse<{ deleteExpense: DeleteExpenseResponse }>>> {
  const query = `
    mutation DeleteExpense($documentId: ID!) {
      deleteExpense(documentId: $documentId) {
        documentId
      }
    }
  `;
  return ApiService.fetchData<ApiResponse<{ deleteExpense: DeleteExpenseResponse }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { documentId } },
  });
}
