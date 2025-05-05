import { API_GRAPHQL_URL } from '@/configs/api.config'
import ApiService from './ApiService'
import { ApiResponse } from '@/utils/serviceHelper'
import { AxiosResponse } from 'axios'
import { Comment } from '@/@types/project'

// Create comment
export type CreateCommentRequest = Omit<Comment, 'documentId'>

export async function apiCreateComment(data: CreateCommentRequest): Promise<AxiosResponse<ApiResponse<{createComment: Comment}>>> {
    const query = `
    mutation CreateComment($data: CommentInput!) {
        createComment(data: $data) {
            documentId
            content
            user {
                avatar {
                    documentId
                }
                firstName
                lastName
                customer {
                    name
                }
                producer {
                    name
                }
                role {
                    name
                }
            }
            images {
                url
            }
            visibility
        }
    }
  `,
  variables = {
    data: {
        ...data,
        user: data.user.documentId
    }
  }
    return ApiService.fetchData<ApiResponse<{createComment: Comment}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}

// delete comment
export type DeleteCommentResponse = {
    documentId: string
}

export async function apiDeleteComment(documentId: string): Promise<AxiosResponse<ApiResponse<{deleteComment: DeleteCommentResponse}>>> {
    const query = `
    mutation DeleteComment($documentId: ID!) {
        deleteComment(documentId: $documentId) {
            documentId
        }
    }
  `,
  variables = {
    documentId
  }
    return ApiService.fetchData<ApiResponse<{deleteComment: DeleteCommentResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}