import ApiService from './ApiService'
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { API_GRAPHQL_URL } from '@/configs/api.config';
import { AxiosResponse } from 'axios';
import { Transaction } from '@/@types/transaction';

// create transaction
export type CreateTransactionRequest = Omit<Transaction, "documentId">

export async function apiCreateTransaction(data: CreateTransactionRequest): Promise<AxiosResponse<ApiResponse<{createTransaction: Transaction}>>> {
    const query = `
    mutation CreateTransaction($data: TransactionInput!) {
        createTransaction(data: $data) {
            documentId
            description
            amount
            type
            date
            project {
                documentId
                name
            }
            producer {
                documentId
                name
            }
        }
    }
  `,
  variables = {
    data: {
        ...data,
        producer: data.producer.documentId,
        project: data.project.documentId,
    }
  }
    return ApiService.fetchData<ApiResponse<{createTransaction: Transaction}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// get transactions
export type GetTransactionsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetTransactionsResponse = {
    nodes: Transaction[]
    pageInfo: PageInfo
};

export async function apiGetTransactions(data: GetTransactionsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}, userDocumentId: string): Promise<AxiosResponse<ApiResponse<{transactions_connection: GetTransactionsResponse}>>> {
    const query = `
    query GetTransactions($searchTerm: String, $userDocumentId: ID, $pagination: PaginationArg) {
        transactions_connection(filters:
        {
            and: [
                {producer: {documentId: {eq: $userDocumentId}}},
                {project: {name : {contains: $searchTerm}}},
            ]
        }
        , pagination: $pagination) {
            nodes {
                documentId
                description
                amount
                type
                date
                project {
                    documentId
                    name
                }
                producer {
                    documentId
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
    return ApiService.fetchData<ApiResponse<{transactions_connection: GetTransactionsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}