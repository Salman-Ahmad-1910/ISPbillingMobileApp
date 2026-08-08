import apiClient from './client';
import {ApiResponse, Payment, PromiseEntry, TransactionType} from '../types';

// --- Payments ---

export async function getPayments(): Promise<Payment[]> {
  const response = await apiClient.get<ApiResponse<Payment[]>>('/billing/payments');
  return response.data.data || [];
}

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  const response = await apiClient.post<ApiResponse<Payment>>('/billing/payments', data);
  return response.data.data!;
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<Payment> {
  const response = await apiClient.put<ApiResponse<Payment>>(`/billing/payments/${id}`, data);
  return response.data.data!;
}

export async function deletePayment(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/billing/payments/${id}`);
}

// --- Promises ---

export async function getPromises(): Promise<PromiseEntry[]> {
  const response = await apiClient.get<ApiResponse<PromiseEntry[]>>('/billing/promises');
  return response.data.data || [];
}

export async function createPromise(data: Partial<PromiseEntry>): Promise<PromiseEntry> {
  const response = await apiClient.post<ApiResponse<PromiseEntry>>('/billing/promises', data);
  return response.data.data!;
}

export async function updatePromise(id: string, data: Partial<PromiseEntry>): Promise<PromiseEntry> {
  const response = await apiClient.put<ApiResponse<PromiseEntry>>(`/billing/promises/${id}`, data);
  return response.data.data!;
}

export async function deletePromise(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/billing/promises/${id}`);
}

// --- Transaction Types ---

export async function getTransactionTypes(): Promise<TransactionType[]> {
  const response = await apiClient.get<ApiResponse<TransactionType[]>>('/billing/transaction-types');
  return response.data.data || [];
}
