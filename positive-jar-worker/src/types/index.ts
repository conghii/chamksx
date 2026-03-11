// ==================== TYPES ====================

// Nhân viên
export interface Employee {
  id: string;
  name: string;
  phone: string;
  pin_code: string;
  type: 'fulltime' | 'parttime' | 'seasonal';
  skills: string[];
  hourly_rate: number;
  status: 'active' | 'inactive';
  joined_date: string;
  notes: string;
}

// Chấm công
export interface Attendance {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  shift_type: 'morning' | 'afternoon' | 'fullday' | 'custom';
  start_time: string;
  end_time: string;
  actual_hours: number;
  overtime_hours: number;
  status: 'on_time' | 'late' | 'absent' | 'leave';
  note: string;
}

// Lịch làm việc
export interface Schedule {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  shift: 'morning' | 'afternoon' | 'fullday';
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  reject_reason: string | null;
  note: string;
  created_at: string;
}

// Phân công việc (Shared Tasks)
export interface TaskAssignment {
  id: string;
  order_id: string;
  order_code: string;
  product_line_name: string;
  description: string;
  current_step: number;
  total_steps: number;
  assigned_date: string;
  status: string;
  completed_by: string;
  completed_at: string;
  quantity_done: number;
  notes: string;
}

// Dòng sản phẩm
export interface ProductLine {
  id: string;
  name: string;
  icon: string;
  color: string;
  amazon_sku_prefix: string;
  is_active: boolean;
}

// Đơn hàng
export interface ProductionOrder {
  id: string;
  order_code: string;
  product_line_id: string;
  product_line_name: string;
  quantity: number;
  current_stage: number;
  total_stages: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  completed_at: string | null;
}

// Data trang chủ nhân viên
export interface WorkerHomeData {
  employee: Employee;
  today_attendance: Attendance | null;
  today_tasks: TaskAssignment[];
  week_schedule: Schedule[];
  pending_requests: Schedule[];
  this_month_summary: {
    days_worked: number;
    total_hours: number;
    total_overtime: number;
    estimated_salary: number;
  };
}

// Dashboard stats cho admin
export interface DashboardStats {
  total_employees: number;
  employees_today: number;
  pending_schedules: number;
  active_orders: number;
  orders_near_deadline: number;
  total_reports_today: number;
  issues_today: number;
  attendance_rate_this_week: number;
  total_work_hours_today: number;
  total_overtime_today: number;
}

// Settings
export interface Setting {
  key: string;
  value: string;
  description: string;
}

// Check-in response
export interface CheckInResponse {
  attendance_id: string;
  start_time: string;
  shift_type: string;
  is_late: boolean;
}

// Check-out response
export interface CheckOutResponse {
  actual_hours: number;
  overtime_hours: number;
  end_time: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string | null;
}

// ==================== CONSTANTS ====================

export const SHIFTS = [
  { id: 'morning' as const, label: 'Ca sáng', time: '09:00 - 12:00', icon: '🌅', color: '#6A994E' }, // Greenish
  { id: 'afternoon' as const, label: 'Ca chiều', time: '13:30 - 17:30', icon: '☀️', color: '#E76F51' }, // Orange
  { id: 'fullday' as const, label: 'Full ngày', time: '09:00 - 17:30', icon: '📅', color: '#118AB2' }, // Blue
  { id: 'custom' as const, label: 'Tùy chọn', time: 'Tự nhập', icon: '⏱️', color: '#9D4EDD' }, // Purple
];

export const STAGES = [
  { number: 1, name: 'Chờ', icon: '⏳' },
  { number: 2, name: 'Đang bóc', icon: '📦' },
  { number: 3, name: 'Chia lọ', icon: '🧴' },
  { number: 4, name: 'Dán tem', icon: '🏷️' },
  { number: 5, name: 'Đóng hộp', icon: '📮' },
];

export const EMPLOYEE_TYPES = [
  { id: 'fulltime' as const, label: 'Chính thức', color: '#2D6A4F' },
  { id: 'parttime' as const, label: 'Bán thời gian', color: '#E76F51' },
  { id: 'seasonal' as const, label: 'Thời vụ', color: '#457B9D' },
];

export const PRIORITIES = [
  { id: 'low' as const, label: 'Thấp', color: '#6B7280' },
  { id: 'medium' as const, label: 'Trung bình', color: '#F59E0B' },
  { id: 'high' as const, label: 'Cao', color: '#EF4444' },
  { id: 'urgent' as const, label: 'Khẩn cấp', color: '#DC2626' },
];
