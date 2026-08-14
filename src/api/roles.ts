import apiClient from './client';
import {ApiResponse, Role, UserPermission, RecoveryOfficer, Dealer} from '../types';

export async function getRoles(): Promise<Role[]> {
  const res = await apiClient.get<ApiResponse<Role[]>>('/admin/roles');
  return res.data.data || [];
}

export async function getRecoveryOfficers(): Promise<RecoveryOfficer[]> {
  const res = await apiClient.get<ApiResponse<RecoveryOfficer[]>>('/admin/recovery-officers');
  return res.data.data || [];
}

export async function getDealers(): Promise<Dealer[]> {
  const res = await apiClient.get<ApiResponse<Dealer[]>>('/dealers');
  return res.data.data || [];
}

export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  const res = await apiClient.get<ApiResponse<UserPermission[]>>(
    `/admin/roles/users/${userId}/permissions`,
  );
  return res.data.data || [];
}

export async function updateUserPermissions(
  userId: string,
  permissions: {permissionId: string; webEnabled: boolean; mobileEnabled: boolean}[],
): Promise<void> {
  await apiClient.put<ApiResponse>(`/admin/roles/users/${userId}/permissions`, {permissions});
}
