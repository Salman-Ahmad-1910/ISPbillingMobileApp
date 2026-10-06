import apiClient from './client';
import {ApiResponse, DashboardData, ChartPoint} from '../types';

export type TimeRange = 'daily' | 'monthly' | 'yearly' | 'all';
export type PackageType = 'both' | 'internet' | 'tv_cable';

export async function getDashboardData(
  timeRange: TimeRange = 'monthly',
  packageType: PackageType = 'both',
): Promise<DashboardData> {
  const response = await apiClient.get<ApiResponse<DashboardData>>('/dashboard', {
    params: {range: timeRange, packageType},
  });
  return response.data.data!;
}

export async function getCollectionChart(
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily',
  month?: string,
): Promise<{period: string; data: ChartPoint[]; periodTotal: number}> {
  const params: Record<string, string> = {period};
  if (month) {
    params.month = month;
  }
  const response = await apiClient.get<ApiResponse<{period: string; data: ChartPoint[]; periodTotal: number}>>(
    '/dashboard/collection-chart',
    {params},
  );
  return response.data.data!;
}

export async function getSubscriberGrowthChart(
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly',
  month?: string,
): Promise<{period: string; data: ChartPoint[]}> {
  const params: Record<string, string> = {period};
  if (month) {
    params.month = month;
  }
  const response = await apiClient.get<ApiResponse<{period: string; data: ChartPoint[]}>>(
    '/dashboard/subscriber-growth-chart',
    {params},
  );
  return response.data.data!;
}
