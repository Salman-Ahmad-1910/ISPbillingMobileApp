import apiClient from './client';
import {ApiResponse, Dealer, Area, Company} from '../types';

export async function getDealers(): Promise<Dealer[]> {
  const response = await apiClient.get<ApiResponse<Dealer[]>>('/dealers');
  return response.data.data || [];
}

export async function getDealer(id: string): Promise<Dealer> {
  const response = await apiClient.get<ApiResponse<Dealer>>(`/dealers/${id}`);
  return response.data.data!;
}

export async function createDealer(data: Partial<Dealer> & {companyId?: string}): Promise<Dealer> {
  const response = await apiClient.post<ApiResponse<Dealer>>('/dealers', data);
  return response.data.data!;
}

export async function updateDealer(id: string, data: Partial<Dealer>): Promise<Dealer> {
  const response = await apiClient.put<ApiResponse<Dealer>>(`/dealers/${id}`, data);
  return response.data.data!;
}

export async function deleteDealer(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/dealers/${id}`);
}

export async function getCompanies(): Promise<Company[]> {
  const response = await apiClient.get<ApiResponse<Company[]>>('/admin/companies');
  return response.data.data || [];
}

export async function getAreas(): Promise<Area[]> {
  const response = await apiClient.get<ApiResponse<Area[]>>('/network/areas');
  return response.data.data || [];
}
