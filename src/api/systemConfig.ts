import apiClient from './client';
import {ApiResponse, SystemConfig} from '../types';

export async function getSystemConfig(): Promise<SystemConfig | null> {
  const res = await apiClient.get<ApiResponse<SystemConfig[]>>('/admin/config');
  const list = res.data.data || [];
  return list.length > 0 ? list[0] : null;
}

export async function saveSystemConfig(
  config: Partial<SystemConfig>,
): Promise<SystemConfig | null> {
  if (config.id) {
    const res = await apiClient.put<ApiResponse<SystemConfig>>(
      `/admin/config/${config.id}`,
      config,
    );
    return res.data.data || null;
  }
  const res = await apiClient.post<ApiResponse<SystemConfig>>('/admin/config', config);
  return res.data.data || null;
}
