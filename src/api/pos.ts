import apiClient from './client';
import {ApiResponse} from '../types';

export interface PosProduct {
  purchaseItemId?: string;
  id: string;
  name: string;
  price: number;
  stock: number;
  unitType?: string;
  taxPercent: number;
  purchasePrice?: number;
  serialNumber?: string;
  billId?: string;
  purchaseNumber?: string;
  vendorName?: string;
  purchaseDate?: string;
  batch?: string;
  image?: string;
}

export interface Dealer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cnic?: string;
  address?: string;
  companyId?: string;
}

export interface PosSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  taxPercent?: number;
  saleTax?: number;
  wthTax?: number;
  serialNumber?: string;
}

export async function getPurchasedProducts(): Promise<PosProduct[]> {
  const response = await apiClient.get<ApiResponse<PosProduct[]>>(
    '/inventory/purchased-products',
  );
  return response.data.data || [];
}

export async function getDealers(): Promise<Dealer[]> {
  const response = await apiClient.get<ApiResponse<Dealer[]>>('/dealers');
  return response.data.data || [];
}

export async function getInstallmentForCustomer(customerId: string): Promise<any> {
  const response = await apiClient.get(`/pos/installment/${customerId}`);
  return response.data?.data || response.data;
}

export async function createSale(data: {
  subscriberId: string;
  subscriberName: string;
  totalAmount: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  isInstallment?: boolean;
  status?: string;
  discount?: number;
  items: PosSaleItem[];
}): Promise<any> {
  const response = await apiClient.post('/pos/sales', data);
  return response.data;
}

export async function createInstallmentSale(data: {
  subscriberId: string;
  subscriberName: string;
  installmentPlanId: string;
  subtotal: number;
  taxAmount: number;
  paymentMethod: string;
  date: string;
  items: PosSaleItem[];
}): Promise<any> {
  const response = await apiClient.post('/pos/installment-sales', data);
  return response.data;
}

export async function payInstallment(
  id: string,
  data: {amount: number; date: string; method: string},
): Promise<any> {
  const response = await apiClient.put(`/pos/installment/${id}/pay`, data);
  return response.data;
}
