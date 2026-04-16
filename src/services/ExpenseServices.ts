import { Expense } from '@/@types/expense';
import ApiService from './ApiService';
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { AxiosResponse } from 'axios';

// Nettoie les données avant envoi : strings vides → null, retire les champs non attendus
function cleanExpenseInput(raw: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  const ALLOWED = ['label', 'description', 'amount', 'vatAmount', 'totalAmount', 'category', 'status', 'date', 'dueDate', 'paidDate', 'supplierName', 'project', 'receipt'];
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
      receipt: rec?.documentId ?? null,
    }),
  };
  return ApiService.fetchData<ApiResponse<{ createExpense: Expense }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables },
  });
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
  if (rec !== undefined) payload.receipt = rec?.documentId ?? null;
  return ApiService.fetchData<ApiResponse<{ updateExpense: Expense }>>({
    url: API_GRAPHQL_URL,
    method: 'post',
    data: { query, variables: { documentId, data: cleanExpenseInput(payload) } },
  });
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
