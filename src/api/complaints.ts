import apiClient from './client';
import {ApiResponse, Complaint, ComplaintSubject, ComplaintType} from '../types';

export async function getComplaints(): Promise<Complaint[]> {
  const response = await apiClient.get<ApiResponse<Complaint[]>>('/support/complaints');
  return response.data.data || [];
}

export async function createComplaint(data: Partial<Complaint>): Promise<Complaint> {
  const response = await apiClient.post<ApiResponse<Complaint>>('/support/complaints', data);
  return response.data.data!;
}

export async function updateComplaint(id: string, data: Partial<Complaint>): Promise<Complaint> {
  const response = await apiClient.put<ApiResponse<Complaint>>(`/support/complaints/${id}`, data);
  return response.data.data!;
}

export async function deleteComplaint(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/support/complaints/${id}`);
}

// --- Complaint Subjects ---

export async function getComplaintSubjects(): Promise<ComplaintSubject[]> {
  const response = await apiClient.get<ApiResponse<ComplaintSubject[]>>('/support/complaint-subjects');
  return response.data.data || [];
}

export async function createComplaintSubject(data: Partial<ComplaintSubject>): Promise<ComplaintSubject> {
  const response = await apiClient.post<ApiResponse<ComplaintSubject>>('/support/complaint-subjects', data);
  return response.data.data!;
}

export async function updateComplaintSubject(id: string, data: Partial<ComplaintSubject>): Promise<ComplaintSubject> {
  const response = await apiClient.put<ApiResponse<ComplaintSubject>>(`/support/complaint-subjects/${id}`, data);
  return response.data.data!;
}

export async function deleteComplaintSubject(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/support/complaint-subjects/${id}`);
}

// --- Complaint Types ---

export async function getComplaintTypes(): Promise<ComplaintType[]> {
  const response = await apiClient.get<ApiResponse<ComplaintType[]>>('/support/complaint-types');
  return response.data.data || [];
}
