import apiClient from './client';
import {ApiResponse, SystemLogEntry, ConnectionLog, User} from '../types';

export type SystemLogsParams = {
  fromDate?: string;
  toDate?: string;
  userId?: string;
  action?: string;
  module?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type SystemLogsResponse = {
  logs: SystemLogEntry[];
  summary: {
    totalLogs: number;
    successCount: number;
    errorCount: number;
    warningCount: number;
  };
  users: {id: string; name: string}[];
  actions: string[];
  modules: string[];
};

export async function getSystemLogs(params: SystemLogsParams): Promise<SystemLogsResponse> {
  const res = await apiClient.get<ApiResponse<SystemLogsResponse>>('/admin/logs', {params});
  const body = res.data?.data as any;
  return {
    logs: Array.isArray(body?.data) ? body.data : [],
    summary: body?.summary || {totalLogs: 0, successCount: 0, errorCount: 0, warningCount: 0},
    users: body?.users || [],
    actions: body?.actions || [],
    modules: body?.modules || [],
  };
}

export async function restoreDeletedLog(id: string): Promise<void> {
  await apiClient.post<ApiResponse>(`/admin/logs/${id}/restore`);
}

export type ConnectionLogsParams = {
  search?: string;
  actionType?: string;
  updatedBy?: string;
  connectionType?: string;
  from?: string;
  to?: string;
};

export async function getConnectionLogs(params: ConnectionLogsParams): Promise<ConnectionLog[]> {
  const res = await apiClient.get<ApiResponse<ConnectionLog[]>>('/admin/connections/logs', {
    params,
  });
  return res.data.data || [];
}

export async function getUsers(): Promise<User[]> {
  const res = await apiClient.get<ApiResponse<User[]>>('/admin/users', {
    params: {includeAdmin: true},
  });
  return res.data.data || [];
}
