import apiClient from './client';
import {ApiResponse, AccountEntry, AccountHead, AccountSubHead, Staff} from '../types';

// --- Account Heads ---

export async function getHeads(): Promise<AccountHead[]> {
  const response = await apiClient.get<ApiResponse<AccountHead[]>>('/accounts/heads');
  return response.data.data || [];
}

export async function createHead(data: Partial<AccountHead>): Promise<AccountHead> {
  const response = await apiClient.post<ApiResponse<AccountHead>>('/accounts/heads', data);
  return response.data.data!;
}

export async function updateHead(id: string, data: Partial<AccountHead>): Promise<AccountHead> {
  const response = await apiClient.put<ApiResponse<AccountHead>>(`/accounts/heads/${id}`, data);
  return response.data.data!;
}

export async function deleteHead(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/accounts/heads/${id}`);
}

// --- Account Sub Heads ---

export async function getSubHeads(): Promise<AccountSubHead[]> {
  const response = await apiClient.get<ApiResponse<AccountSubHead[]>>('/accounts/sub-heads');
  return response.data.data || [];
}

export async function createSubHead(data: Partial<AccountSubHead>): Promise<AccountSubHead> {
  const response = await apiClient.post<ApiResponse<AccountSubHead>>('/accounts/sub-heads', data);
  return response.data.data!;
}

export async function updateSubHead(id: string, data: Partial<AccountSubHead>): Promise<AccountSubHead> {
  const response = await apiClient.put<ApiResponse<AccountSubHead>>(`/accounts/sub-heads/${id}`, data);
  return response.data.data!;
}

export async function deleteSubHead(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/accounts/sub-heads/${id}`);
}

// --- Account Entries ---

export async function getEntries(): Promise<AccountEntry[]> {
  const response = await apiClient.get<ApiResponse<AccountEntry[]>>('/accounts/entries');
  return response.data.data || [];
}

export async function createEntry(data: Partial<AccountEntry>): Promise<AccountEntry> {
  const response = await apiClient.post<ApiResponse<AccountEntry>>('/accounts/entries', data);
  return response.data.data!;
}

export async function updateEntry(id: string, data: Partial<AccountEntry>): Promise<AccountEntry> {
  const response = await apiClient.put<ApiResponse<AccountEntry>>(`/accounts/entries/${id}`, data);
  return response.data.data!;
}

export async function deleteEntry(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/accounts/entries/${id}`);
}

// --- Staff (for Add By / Edit By) ---

export async function getStaff(): Promise<Staff[]> {
  const response = await apiClient.get<ApiResponse<Staff[]>>('/hr/staff');
  return response.data.data || [];
}
