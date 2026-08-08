import apiClient from './client';
import {ApiResponse, DealerCollection} from '../types';

export async function getDealerCollections(): Promise<DealerCollection[]> {
  const response = await apiClient.get<ApiResponse<DealerCollection[]>>('/dealers/collections');
  return response.data.data || [];
}

export async function getDealerCollection(id: string): Promise<DealerCollection> {
  const response = await apiClient.get<ApiResponse<DealerCollection>>(`/dealers/collections/${id}`);
  return response.data.data!;
}

export async function createDealerCollection(data: Partial<DealerCollection>): Promise<DealerCollection> {
  const response = await apiClient.post<ApiResponse<DealerCollection>>('/dealers/collections', data);
  return response.data.data!;
}

export async function updateDealerCollection(id: string, data: Partial<DealerCollection>): Promise<DealerCollection> {
  const response = await apiClient.put<ApiResponse<DealerCollection>>(`/dealers/collections/${id}`, data);
  return response.data.data!;
}

export async function deleteDealerCollection(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/dealers/collections/${id}`);
}
