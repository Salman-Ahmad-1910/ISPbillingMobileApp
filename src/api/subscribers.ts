import apiClient from './client';
import {ApiResponse, Subscriber, Inquiry, CorporateCustomer} from '../types';

// --- Subscribers ---

export async function getSubscribers(status?: string): Promise<Subscriber[]> {
  const params: Record<string, string> = {};
  if (status) {
    params.status = status;
  }
  const response = await apiClient.get<ApiResponse<Subscriber[]>>('/subscribers', {params});
  return response.data.data || [];
}

export async function getSubscriber(id: string): Promise<Subscriber> {
  const response = await apiClient.get<ApiResponse<Subscriber>>(`/subscribers/${id}`);
  return response.data.data!;
}

export async function createSubscriber(data: Partial<Subscriber>): Promise<Subscriber> {
  const response = await apiClient.post<ApiResponse<Subscriber>>('/subscribers', data);
  return response.data.data!;
}

export async function updateSubscriber(id: string, data: Partial<Subscriber>): Promise<Subscriber> {
  const response = await apiClient.put<ApiResponse<Subscriber>>(`/subscribers/${id}`, data);
  return response.data.data!;
}

export async function deleteSubscriber(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/subscribers/${id}`);
}

// --- Inquiries ---

export async function getInquiries(): Promise<Inquiry[]> {
  const response = await apiClient.get<ApiResponse<Inquiry[]>>('/subscribers/inquiries');
  return response.data.data || [];
}

export async function createInquiry(data: Partial<Inquiry>): Promise<Inquiry> {
  const response = await apiClient.post<ApiResponse<Inquiry>>('/subscribers/inquiries', data);
  return response.data.data!;
}

export async function updateInquiry(id: string, data: Partial<Inquiry>): Promise<Inquiry> {
  const response = await apiClient.put<ApiResponse<Inquiry>>(`/subscribers/inquiries/${id}`, data);
  return response.data.data!;
}

export async function deleteInquiry(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/subscribers/inquiries/${id}`);
}

// --- Corporate Customers ---

export async function getCorporateCustomers(): Promise<CorporateCustomer[]> {
  const response = await apiClient.get<ApiResponse<CorporateCustomer[]>>('/subscribers/corporate');
  return response.data.data || [];
}

export async function createCorporateCustomer(data: Partial<CorporateCustomer>): Promise<CorporateCustomer> {
  const response = await apiClient.post<ApiResponse<CorporateCustomer>>('/subscribers/corporate', data);
  return response.data.data!;
}

export async function updateCorporateCustomer(id: string, data: Partial<CorporateCustomer>): Promise<CorporateCustomer> {
  const response = await apiClient.put<ApiResponse<CorporateCustomer>>(`/subscribers/corporate/${id}`, data);
  return response.data.data!;
}

export async function deleteCorporateCustomer(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/subscribers/corporate/${id}`);
}
