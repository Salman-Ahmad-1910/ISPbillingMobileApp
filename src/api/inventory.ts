import apiClient from './client';
import {
  ApiResponse,
  Product,
  Brand,
  ProductType,
  UnitType,
  SerialNumberPoolEntry,
} from '../types';

// --- Products ---

export async function getProducts(): Promise<Product[]> {
  const response = await apiClient.get<ApiResponse<Product[]>>('/inventory/products');
  return response.data.data || [];
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  const response = await apiClient.post<ApiResponse<Product>>('/inventory/products', data);
  return response.data.data!;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  const response = await apiClient.put<ApiResponse<Product>>(`/inventory/products/${id}`, data);
  return response.data.data!;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/products/${id}`);
}

// --- Lookups ---

export async function getBrands(): Promise<Brand[]> {
  const response = await apiClient.get<ApiResponse<Brand[]>>('/inventory/brands');
  return response.data.data || [];
}

export async function getProductTypes(): Promise<ProductType[]> {
  const response = await apiClient.get<ApiResponse<ProductType[]>>('/inventory/product-types');
  return response.data.data || [];
}

export async function getUnitTypes(): Promise<UnitType[]> {
  const response = await apiClient.get<ApiResponse<UnitType[]>>('/inventory/unit-types');
  return response.data.data || [];
}

// --- Serial Number Pool ---

export async function getSerialNumberPool(): Promise<SerialNumberPoolEntry[]> {
  const response = await apiClient.get<ApiResponse<SerialNumberPoolEntry[]>>(
    '/inventory/serial-number-pool',
  );
  return response.data.data || [];
}

export async function getNextSerialNumber(): Promise<string | null> {
  const response = await apiClient.get<ApiResponse<{serialNumber?: string}>>(
    '/inventory/serial-number-pool/next',
  );
  return response.data.data?.serialNumber ?? null;
}

export async function addSerialNumbers(numbers: string[]): Promise<void> {
  await apiClient.post<ApiResponse>('/inventory/serial-number-pool', {numbers});
}

export async function deleteSerialNumberEntry(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/serial-number-pool/${id}`);
}
