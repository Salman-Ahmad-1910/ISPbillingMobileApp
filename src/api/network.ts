import apiClient from './client';
import {ApiResponse, Area, POP, OLT, Splitter, DistributionBox} from '../types';

function makeCrud<T>(base: string) {
  return {
    list: async (): Promise<T[]> => {
      const response = await apiClient.get<ApiResponse<T[]>>(`/network/${base}`);
      return response.data.data || [];
    },
    create: async (data: Partial<T>): Promise<T> => {
      const response = await apiClient.post<ApiResponse<T>>(`/network/${base}`, data);
      return response.data.data!;
    },
    update: async (id: string, data: Partial<T>): Promise<T> => {
      const response = await apiClient.put<ApiResponse<T>>(`/network/${base}/${id}`, data);
      return response.data.data!;
    },
    remove: async (id: string): Promise<void> => {
      await apiClient.delete<ApiResponse>(`/network/${base}/${id}`);
    },
  };
}

export const areasApi = makeCrud<Area>('areas');
export const popsApi = makeCrud<POP>('pops');
export const oltsApi = makeCrud<OLT>('olts');
export const splittersApi = makeCrud<Splitter>('splitters');
export const boxesApi = makeCrud<DistributionBox>('boxes');
