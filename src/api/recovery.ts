import apiClient from './client';
import {ApiResponse, Area, RecoveryOfficer} from '../types';

// --- Recovery Officers ---

export async function getRecoveryOfficers(): Promise<RecoveryOfficer[]> {
  const response = await apiClient.get<ApiResponse<RecoveryOfficer[]>>('/admin/recovery-officers');
  return response.data.data || [];
}

export async function createRecoveryOfficer(data: Partial<RecoveryOfficer>): Promise<RecoveryOfficer> {
  const response = await apiClient.post<ApiResponse<RecoveryOfficer>>('/admin/recovery-officers', data);
  return response.data.data!;
}

export async function updateRecoveryOfficer(id: string, data: Partial<RecoveryOfficer>): Promise<RecoveryOfficer> {
  const response = await apiClient.put<ApiResponse<RecoveryOfficer>>(`/admin/recovery-officers/${id}`, data);
  return response.data.data!;
}

export async function deleteRecoveryOfficer(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/admin/recovery-officers/${id}`);
}

// --- Areas (for recovery officer assignment) ---

export async function getAreas(): Promise<Area[]> {
  const response = await apiClient.get<ApiResponse<Area[]>>('/network/areas');
  return response.data.data || [];
}

export async function updateArea(id: string, data: Partial<Area>): Promise<Area> {
  const response = await apiClient.put<ApiResponse<Area>>(`/network/areas/${id}`, data);
  return response.data.data!;
}

export async function deleteArea(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/network/areas/${id}`);
}
