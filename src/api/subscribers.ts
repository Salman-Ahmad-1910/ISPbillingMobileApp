import apiClient from './client';
import {ApiResponse, Subscriber, Inquiry, CorporateCustomer, Customer, Guarantor, Package, InstallmentPlan} from '../types';

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

export async function getPackages(): Promise<Package[]> {
  const response = await apiClient.get<ApiResponse<Package[]>>('/billing/packages');
  return response.data.data || [];
}

export async function createPackage(data: Partial<Package>): Promise<Package> {
  const response = await apiClient.post<ApiResponse<Package>>('/billing/packages', data);
  return response.data.data!;
}

export async function updatePackage(id: string, data: Partial<Package>): Promise<Package> {
  const response = await apiClient.put<ApiResponse<Package>>(`/billing/packages/${id}`, data);
  return response.data.data!;
}

export async function deletePackage(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/billing/packages/${id}`);
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

// --- Customers ---

export async function getCustomers(): Promise<Customer[]> {
  const response = await apiClient.get<ApiResponse<Customer[]>>('/crm/customers');
  return response.data.data || [];
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  const response = await apiClient.post<ApiResponse<Customer>>('/crm/customers', data);
  return response.data.data!;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const response = await apiClient.put<ApiResponse<Customer>>(`/crm/customers/${id}`, data);
  return response.data.data!;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/crm/customers/${id}`);
}

// --- Guarantors ---

export async function getGuarantors(): Promise<Guarantor[]> {
  const response = await apiClient.get<ApiResponse<Guarantor[]>>('/crm/guarantors');
  return response.data.data || [];
}

export async function createGuarantor(data: Partial<Guarantor>): Promise<Guarantor> {
  const response = await apiClient.post<ApiResponse<Guarantor>>('/crm/guarantors', data);
  return response.data.data!;
}

export async function updateGuarantor(id: string, data: Partial<Guarantor>): Promise<Guarantor> {
  const response = await apiClient.put<ApiResponse<Guarantor>>(`/crm/guarantors/${id}`, data);
  return response.data.data!;
}

export async function deleteGuarantor(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/crm/guarantors/${id}`);
}

// --- Installment Plans ---

export async function getInstallmentPlans(): Promise<InstallmentPlan[]> {
  const response = await apiClient.get<ApiResponse<InstallmentPlan[]>>('/sales/installment-plans');
  return response.data.data || [];
}

export async function createInstallmentPlan(data: Partial<InstallmentPlan>): Promise<InstallmentPlan> {
  const response = await apiClient.post<ApiResponse<InstallmentPlan>>('/sales/installment-plans', data);
  return response.data.data!;
}

export async function updateInstallmentPlan(id: string, data: Partial<InstallmentPlan>): Promise<InstallmentPlan> {
  const response = await apiClient.put<ApiResponse<InstallmentPlan>>(`/sales/installment-plans/${id}`, data);
  return response.data.data!;
}

export async function deleteInstallmentPlan(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/sales/installment-plans/${id}`);
}
