import ApiService from './ApiService'
import { IUser } from '@/@types/user'
import {
  DELETE_TEAMS_API_URL,
  GET_TEAMS_API_URL,
  POST_TEAMS_API_URL,
  PUT_TEAMS_API_URL,
  PUT_TEAMS_STATUS_API_URL,
} from "@/constants/api.constant";

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
export async function apiGetTeams(page: number, pageSize: number, searchTerm: string = "") {
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

// update status team
export async function apiUpdateStatusTeam(data: Record<string, unknown>) {
    return ApiService.fetchData<TeamResponse>({
        url: PUT_TEAMS_STATUS_API_URL,
        method: 'put',
        data 
    })
}

// delete team
export async function apiDeleteTeam(data: Record<string, unknown>) {
    return ApiService.fetchData<TeamResponse>({
        url: DELETE_TEAMS_API_URL,
        method: 'delete',
        data 
    })
}
