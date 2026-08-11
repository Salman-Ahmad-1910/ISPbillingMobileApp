import apiClient from './client';
import {
  ApiResponse,
  Product,
  Brand,
  ProductType,
  UnitType,
  SerialNumberPoolEntry,
  PurchasedProduct,
  Purchase,
  Vendor,
  VendorInvoice,
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

export async function getPurchasedProducts(): Promise<PurchasedProduct[]> {
  const response = await apiClient.get<ApiResponse<PurchasedProduct[]>>(
    '/inventory/purchased-products',
  );
  return response.data.data || [];
}

export async function getBrands(): Promise<Brand[]> {
  const response = await apiClient.get<ApiResponse<Brand[]>>('/inventory/brands');
  return response.data.data || [];
}

export async function createBrand(data: Partial<Brand>): Promise<Brand> {
  const response = await apiClient.post<ApiResponse<Brand>>('/inventory/brands', data);
  return response.data.data!;
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
  const response = await apiClient.put<ApiResponse<Brand>>(`/inventory/brands/${id}`, data);
  return response.data.data!;
}

export async function deleteBrand(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/brands/${id}`);
}

export async function getProductTypes(): Promise<ProductType[]> {
  const response = await apiClient.get<ApiResponse<ProductType[]>>('/inventory/product-types');
  return response.data.data || [];
}

export async function createProductType(data: Partial<ProductType>): Promise<ProductType> {
  const response = await apiClient.post<ApiResponse<ProductType>>('/inventory/product-types', data);
  return response.data.data!;
}

export async function updateProductType(id: string, data: Partial<ProductType>): Promise<ProductType> {
  const response = await apiClient.put<ApiResponse<ProductType>>(`/inventory/product-types/${id}`, data);
  return response.data.data!;
}

export async function deleteProductType(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/product-types/${id}`);
}

export async function getUnitTypes(): Promise<UnitType[]> {
  const response = await apiClient.get<ApiResponse<UnitType[]>>('/inventory/unit-types');
  return response.data.data || [];
}

export async function createUnitType(data: Partial<UnitType>): Promise<UnitType> {
  const response = await apiClient.post<ApiResponse<UnitType>>('/inventory/unit-types', data);
  return response.data.data!;
}

export async function updateUnitType(id: string, data: Partial<UnitType>): Promise<UnitType> {
  const response = await apiClient.put<ApiResponse<UnitType>>(`/inventory/unit-types/${id}`, data);
  return response.data.data!;
}

export async function deleteUnitType(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/unit-types/${id}`);
}

// --- Vendors ---

export async function getVendors(): Promise<Vendor[]> {
  const response = await apiClient.get<ApiResponse<Vendor[]>>('/inventory/vendors');
  return response.data.data || [];
}

export async function createVendor(data: Partial<Vendor>): Promise<Vendor> {
  const response = await apiClient.post<ApiResponse<Vendor>>('/inventory/vendors', data);
  return response.data.data!;
}

export async function updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor> {
  const response = await apiClient.put<ApiResponse<Vendor>>(`/inventory/vendors/${id}`, data);
  return response.data.data!;
}

export async function deleteVendor(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/vendors/${id}`);
}

// --- Vendor Invoices ---

export async function getVendorInvoices(): Promise<VendorInvoice[]> {
  const response = await apiClient.get<ApiResponse<VendorInvoice[]>>('/inventory/vendor-invoices');
  return response.data.data || [];
}

export async function createVendorInvoice(data: Partial<VendorInvoice>): Promise<VendorInvoice> {
  const response = await apiClient.post<ApiResponse<VendorInvoice>>('/inventory/vendor-invoices', data);
  return response.data.data!;
}

export async function updateVendorInvoice(id: string, data: Partial<VendorInvoice>): Promise<VendorInvoice> {
  const response = await apiClient.put<ApiResponse<VendorInvoice>>(`/inventory/vendor-invoices/${id}`, data);
  return response.data.data!;
}

export async function deleteVendorInvoice(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/vendor-invoices/${id}`);
}

// --- Purchases ---

export async function getPurchases(): Promise<Purchase[]> {
  const response = await apiClient.get<ApiResponse<Purchase[]>>('/inventory/purchases');
  return response.data.data || [];
}

export async function createPurchase(data: Partial<Purchase>): Promise<Purchase> {
  const response = await apiClient.post<ApiResponse<Purchase>>('/inventory/purchases', data);
  return response.data.data!;
}

export async function updatePurchase(id: string, data: Partial<Purchase>): Promise<Purchase> {
  const response = await apiClient.put<ApiResponse<Purchase>>(`/inventory/purchases/${id}`, data);
  return response.data.data!;
}

export async function deletePurchase(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/inventory/purchases/${id}`);
}

export async function updatePurchaseStatus(id: string, status: string): Promise<void> {
  await apiClient.patch<ApiResponse>(`/inventory/purchases/${id}/status`, {status});
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
