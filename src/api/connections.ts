import apiClient from './client';
import {ApiResponse, Connection} from '../types';

export async function getConnections(): Promise<Connection[]> {
  const response = await apiClient.get<ApiResponse<Connection[]>>('/admin/connections');
  return response.data.data || [];
}

export async function createConnection(data: Partial<Connection>): Promise<Connection> {
  const response = await apiClient.post<ApiResponse<Connection>>('/admin/connections', data);
  return response.data.data!;
}

export async function updateConnection(id: string, data: Partial<Connection>): Promise<Connection> {
  const response = await apiClient.put<ApiResponse<Connection>>(`/admin/connections/${id}`, data);
  return response.data.data!;
}

export async function deleteConnection(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/admin/connections/${id}`);
}
