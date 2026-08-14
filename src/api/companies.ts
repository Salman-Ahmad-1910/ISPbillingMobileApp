import apiClient from './client';
import {getApiBaseUrl} from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {uploadFiles} from '@dr.pogodin/react-native-fs';
import {ApiResponse, Company} from '../types';

export async function getCompanies(): Promise<Company[]> {
  const response = await apiClient.get<ApiResponse<Company[]>>('/companies');
  return response.data.data || [];
}

export async function getCompany(id: string): Promise<Company> {
  const response = await apiClient.get<ApiResponse<Company>>(`/admin/companies/${id}`);
  return response.data.data!;
}

export async function createCompany(
  data: Partial<Company> & {password?: string; role?: string},
): Promise<Company> {
  const response = await apiClient.post<ApiResponse<Company>>('/companies', data);
  return response.data.data!;
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<Company> {
  const response = await apiClient.put<ApiResponse<Company>>(`/admin/companies/${id}`, data);
  return response.data.data!;
}

export async function deleteCompany(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/admin/companies/${id}`);
}

async function uploadCompanyFile(
  endpoint: string,
  filePath: string,
  fileType: string,
  fileName: string,
): Promise<string> {
  const token = await AsyncStorage.getItem('auth_token');
  const baseUrl = await getApiBaseUrl();
  const {promise} = uploadFiles({
    toUrl: `${baseUrl}${endpoint}`,
    method: 'POST',
    files: [{name: 'image', filename: fileName, filepath: filePath, filetype: fileType}],
    headers: token ? {Authorization: `Bearer ${token}`} : {},
    fields: {},
  });
  const res = await promise;
  let body: any = {};
  try {
    body = JSON.parse(res.body || '{}');
  } catch {
    body = {};
  }
  if (res.statusCode >= 200 && res.statusCode < 300 && body?.data?.imageUrl) {
    return body.data.imageUrl;
  }
  throw new Error(body?.message || `Upload failed (${res.statusCode})`);
}

export async function uploadCompanyImage(
  filePath: string,
  fileType: string,
  fileName: string,
): Promise<string> {
  return uploadCompanyFile('/upload/company-image', filePath, fileType, fileName);
}

export async function uploadCompanyStamp(
  filePath: string,
  fileType: string,
  fileName: string,
): Promise<string> {
  return uploadCompanyFile('/upload/company-stamp', filePath, fileType, fileName);
}

async function deleteCompanyFile(endpoint: string): Promise<void> {
  const token = await AsyncStorage.getItem('auth_token');
  const baseUrl = await getApiBaseUrl();
  await fetch(`${baseUrl}${endpoint}`, {
    method: 'DELETE',
    headers: token ? {Authorization: `Bearer ${token}`} : {},
  });
}

export async function deleteCompanyImage(): Promise<void> {
  await deleteCompanyFile('/upload/company-image');
}

export async function deleteCompanyStamp(): Promise<void> {
  await deleteCompanyFile('/upload/company-stamp');
}
