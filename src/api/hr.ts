import apiClient from './client';
import {ApiResponse, Staff, StaffDepartment, Attendance, AdvanceLoan} from '../types';

// --- Staff ---

export async function getStaff(): Promise<Staff[]> {
  const response = await apiClient.get<ApiResponse<Staff[]>>('/hr/staff');
  return response.data.data || [];
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  const response = await apiClient.post<ApiResponse<Staff>>('/hr/staff', data);
  return response.data.data!;
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
  const response = await apiClient.put<ApiResponse<Staff>>(`/hr/staff/${id}`, data);
  return response.data.data!;
}

export async function deleteStaff(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/hr/staff/${id}`);
}

// --- Staff Departments ---

export async function getDepartments(): Promise<StaffDepartment[]> {
  const response = await apiClient.get<ApiResponse<StaffDepartment[]>>('/hr/departments');
  return response.data.data || [];
}

export async function createDepartment(name: string): Promise<StaffDepartment> {
  const response = await apiClient.post<ApiResponse<StaffDepartment>>('/hr/departments', {
    name,
  });
  return response.data.data!;
}

// --- Attendance ---

export async function getAttendance(date?: string): Promise<Attendance[]> {
  const response = await apiClient.get<ApiResponse<Attendance[]>>('/hr/attendance', {
    params: date ? {date} : {},
  });
  return response.data.data || [];
}

export async function createAttendance(data: Partial<Attendance>): Promise<Attendance> {
  const response = await apiClient.post<ApiResponse<Attendance>>('/hr/attendance', data);
  return response.data.data!;
}

export async function updateAttendance(id: string, data: Partial<Attendance>): Promise<Attendance> {
  const response = await apiClient.put<ApiResponse<Attendance>>(`/hr/attendance/${id}`, data);
  return response.data.data!;
}

// --- Advances & Loans ---

export async function getAdvances(): Promise<AdvanceLoan[]> {
  const response = await apiClient.get<ApiResponse<AdvanceLoan[]>>('/hr/advances');
  return response.data.data || [];
}

export async function createAdvance(data: Partial<AdvanceLoan>): Promise<AdvanceLoan> {
  const response = await apiClient.post<ApiResponse<AdvanceLoan>>('/hr/advances', data);
  return response.data.data!;
}

export async function updateAdvance(id: string, data: Partial<AdvanceLoan>): Promise<AdvanceLoan> {
  const response = await apiClient.put<ApiResponse<AdvanceLoan>>(`/hr/advances/${id}`, data);
  return response.data.data!;
}

export async function deleteAdvance(id: string): Promise<void> {
  await apiClient.delete<ApiResponse>(`/hr/advances/${id}`);
}
