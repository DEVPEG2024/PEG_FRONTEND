import { API_GRAPHQL_URL } from '@/configs/api.config';
import ApiService from './ApiService'
import { IUser } from '@/@types/user'
import {
  GET_TEAMS_API_URL,
  POST_TEAMS_API_URL,
  PUT_TEAMS_API_URL,
} from "@/constants/api.constant";
import { ApiResponse, PageInfo, PaginationRequest } from '@/utils/serviceHelper';
import { AxiosResponse } from 'axios';

// TODO: Services

type TeamResponse = {
  teams: IUser[];
  total: number;
  result: string;
  message: string;
};



type TeamCreateResponse = {
    result: boolean
    message: string
    team: IUser
}

// get teams
export async function apiGetTeamsOld(page: number, pageSize: number, searchTerm: string = "") {
    return ApiService.fetchData<TeamResponse>({
        url: GET_TEAMS_API_URL,
        method: 'get',
        params: { page, pageSize, searchTerm }
    })
}

// create team
export async function apiCreateTeam(data: Record<string, unknown>) {
    return ApiService.fetchData<TeamCreateResponse>({
        url: POST_TEAMS_API_URL,
        method: 'post',
        data 
    })
}

// update team
export async function apiUpdateTeam(data: Record<string, unknown>) {
    return ApiService.fetchData<TeamResponse>({
        url: PUT_TEAMS_API_URL,
        method: 'put',
        data 
    })
}

// get teams
export type GetTeamsRequest = {
    pagination: PaginationRequest;
    searchTerm: string;
  };

export type GetTeamsResponse = {
    nodes: Team[]
    pageInfo: PageInfo
};

export async function apiGetTeams(data: GetTeamsRequest = {pagination: {page: 1, pageSize: 1000}, searchTerm: ''}): Promise<AxiosResponse<ApiResponse<{teams_connection: GetTeamsResponse}>>> {
    const query = `
    query getTeams($searchTerm: String, $pagination: PaginationArg) {
        teams_connection (filters: {name: {contains: $searchTerm}}, pagination: $pagination) {
            nodes {
                documentId
                name
                price
                images {
                    documentId
                    url
                }
                active
            }
            pageInfo {
                page
                pageSize
                pageCount
                total
            }
        }
    }
  `,
  variables = {
    data
  }
    return ApiService.fetchData<ApiResponse<{teams_connection: GetTeamsResponse}>>({
        url: API_GRAPHQL_URL,
        method: 'post',
        data: {
            query,
            variables
        }
    })
}