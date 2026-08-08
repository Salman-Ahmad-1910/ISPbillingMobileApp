import apiClient from './client';
import {ApiResponse, MessageTemplate, Message, Connection, Dealer, Staff, RecoveryOfficer} from '../types';

// --- Message Templates ---

export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const response = await apiClient.get<ApiResponse<MessageTemplate[]>>('/messages/templates');
  return response.data.data || [];
}

export async function createMessageTemplate(data: {
  title: string;
  message: string;
  parameters?: string;
}): Promise<MessageTemplate> {
  const response = await apiClient.post<ApiResponse<MessageTemplate>>('/messages/templates', data);
  return response.data.data!;
}

export async function updateMessageTemplate(id: string, data: Partial<MessageTemplate>): Promise<MessageTemplate> {
  const response = await apiClient.put<ApiResponse<MessageTemplate>>(`/messages/templates/${id}`, data);
  return response.data.data!;
}

export async function deleteMessageTemplate(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/messages/templates/${id}`);
}

// --- Messages ---

export async function getMessages(): Promise<Message[]> {
  const response = await apiClient.get<ApiResponse<Message[]>>('/messages');
  return response.data.data || [];
}

export async function createMessage(data: Partial<Message> & {companyId?: string}): Promise<Message> {
  const response = await apiClient.post<ApiResponse<Message>>('/messages', data);
  return response.data.data!;
}

export async function updateMessage(
  id: string,
  data: Partial<Message> & {companyId?: string},
): Promise<Message> {
  const response = await apiClient.put<ApiResponse<Message>>(`/messages/${id}`, data);
  return response.data.data!;
}

export async function deleteMessage(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/messages/${id}`);
}

// --- Entity data for sending messages ---

export async function getConnections(): Promise<Connection[]> {
  const response = await apiClient.get<ApiResponse<Connection[]>>('/admin/connections');
  return response.data.data || [];
}

export async function getDealers(): Promise<Dealer[]> {
  const response = await apiClient.get<ApiResponse<Dealer[]>>('/dealers');
  return response.data.data || [];
}

export async function getStaff(): Promise<Staff[]> {
  const response = await apiClient.get<ApiResponse<Staff[]>>('/hr/staff');
  return response.data.data || [];
}

export async function getRecoveryOfficers(): Promise<RecoveryOfficer[]> {
  const response = await apiClient.get<ApiResponse<RecoveryOfficer[]>>('/admin/recovery-officers');
  return response.data.data || [];
}
