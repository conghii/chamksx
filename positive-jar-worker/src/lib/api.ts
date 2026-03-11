'use client';

import {
  Employee, Attendance, Schedule, TaskAssignment,
  ProductLine, ProductionOrder, WorkerHomeData, DashboardStats,
  Setting, CheckInResponse, CheckOutResponse, ApiResponse,
} from '@/types';
import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

// ==================== CORE API CALLER ====================

async function callGet<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'text/plain' },
  });

  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

async function callPost<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...data }),
  });

  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error || 'API error');
  return json.data;
}

// ==================== EMPLOYEE APIs ====================

export const getEmployees = () => callGet<Employee[]>('getEmployees');
export const getEmployee = (id: string) => callGet<Employee>('getEmployee', { id });
export const addEmployee = (data: Partial<Employee>) => callPost<{ id: string }>('addEmployee', { data });
export const updateEmployee = (id: string, data: Partial<Employee>) => callPost<{ id: string }>('updateEmployee', { id, data });
export const toggleEmployeeStatus = (id: string) => callPost<{ id: string; status: string }>('toggleEmployeeStatus', { id });
export const loginByPin = (pin_code: string) => callPost<Employee>('loginByPin', { pin_code });

// ==================== ATTENDANCE APIs ====================

export const checkIn = (employee_id: string, shift: string, custom_hours?: number) =>
  callPost<CheckInResponse>('checkIn', { employee_id, shift, custom_hours: custom_hours?.toString() });

export const checkOut = (attendance_id: string, lunch_break_minutes: number) =>
  callPost<CheckOutResponse>('checkOut', { attendance_id, lunch_break_minutes: String(lunch_break_minutes) });

export const getTodayAttendance = () => callGet<Attendance[]>('getTodayAttendance');

export const getEmployeeTodayStatus = (employee_id: string) =>
  callGet<{ checked_in: boolean; checked_out?: boolean; attendance?: Attendance }>('getEmployeeTodayStatus', { employee_id });

export const getMonthlyAttendance = (month: number, year: number) =>
  callGet<Attendance[]>('getMonthlyAttendance', { month: String(month), year: String(year) });

export const getEmployeeMonthly = (employee_id: string, month: number, year: number) =>
  callGet<Attendance[]>('getEmployeeMonthly', { employee_id, month: String(month), year: String(year) });

export const updateAttendance = (id: string, data: Partial<Attendance>) =>
  callPost<{ id: string }>('updateAttendance', { id, data });

// ==================== SCHEDULE APIs ====================

export const getWeekSchedule = (start_date: string) =>
  callGet<Schedule[]>('getWeekSchedule', { start_date });

export const getEmployeeSchedule = (employee_id: string, start_date: string) =>
  callGet<Schedule[]>('getEmployeeSchedule', { employee_id, start_date });

export const requestSchedule = (employee_id: string, date: string, shift: string, note: string) =>
  callPost<{ id: string }>('requestSchedule', { employee_id, date, shift, note });

export const cancelScheduleRequest = (id: string) =>
  callPost<{ message: string }>('cancelScheduleRequest', { id });

export const getPendingSchedules = () => callGet<Schedule[]>('getPendingSchedules');

export const approveSchedule = (id: string, approved_by: string) =>
  callPost<{ id: string }>('approveSchedule', { id, approved_by });

export const rejectSchedule = (id: string, reason: string) =>
  callPost<{ id: string }>('rejectSchedule', { id, reason });

export const bulkApproveSchedules = (ids: string[], approved_by: string) =>
  callPost<unknown[]>('bulkApproveSchedules', { ids, approved_by });

// ==================== TASK ASSIGNMENT APIs ====================

export const getTodayTasks = () => callGet<TaskAssignment[]>('getTodayTasks');

export const updateTaskProgress = (taskId: string, employeeId: string, stepCompleted: number, quantityDone: number, notesStr: string) =>
  callPost<{ id: string; status: string }>('updateTaskProgress', { task_id: taskId, employee_id: employeeId, step_completed: String(stepCompleted), quantity_done: String(quantityDone), notes: notesStr });

export const addTaskQuantity = (taskId: string, employeeId: string, quantity: number, notesStr: string) =>
  callPost<{ id: string; quantity_done: number }>('addTaskQuantity', { task_id: taskId, employee_id: employeeId, quantity: String(quantity), notes: notesStr });

export const updateTaskStatus = (taskId: string, employeeId: string, status: string) =>
  callPost<{ id: string; status: string }>('updateTaskStatus', { task_id: taskId, employee_id: employeeId, status });

export const getTaskHistory = (order_id: string) =>
  callGet<TaskAssignment[]>('getTaskHistory', { order_id });



// ==================== PRODUCTION APIs ====================

export const getOrders = () => callGet<ProductionOrder[]>('getOrders');
export const getOrder = (id: string) => callGet<ProductionOrder>('getOrder', { id });

export const addOrder = (data: Partial<ProductionOrder>) =>
  callPost<{ id: string; order_code: string }>('addOrder', { data });

export const updateOrderStage = (id: string, new_stage: number) =>
  callPost<{ id: string }>('updateOrderStage', { id, new_stage: String(new_stage) });

export const updateOrderStatus = (id: string, status: string) =>
  callPost<{ id: string }>('updateOrderStatus', { id, status });

export const getProductLines = () => callGet<ProductLine[]>('getProductLines');

export const addProductLine = (data: Partial<ProductLine>) =>
  callPost<{ id: string }>('addProductLine', { data });

export const updateProductLine = (id: string, data: Partial<ProductLine>) =>
  callPost<{ id: string }>('updateProductLine', { id, data });

// ==================== SETTINGS APIs ====================

export const getSettings = () => callGet<Setting[]>('getSettings');

export const updateSetting = (key: string, value: string) =>
  callPost<{ key: string }>('updateSetting', { key, value });

export const updateMultipleSettings = (data: { key: string; value: string }[]) =>
  callPost<unknown[]>('updateMultipleSettings', { data });

// ==================== DASHBOARD APIs ====================

export const getDashboardStats = () => callGet<DashboardStats>('getDashboardStats');

// ==================== WORKER HOME ====================

export const getWorkerHomeData = (employee_id: string) =>
  callGet<WorkerHomeData>('getWorkerHomeData', { employee_id });

// ==================== CUSTOM HOOK ====================

export function useAPI<T>(fetchFn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
