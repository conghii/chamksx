/**
 * ========================================================================
 * POSITIVE JAR — HRM & PRODUCTION MANAGEMENT API
 * Google Apps Script — Web App
 * Phục vụ cả Worker App + Admin App
 * ========================================================================
 */

// ==================== CONFIG ====================
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const TIMEZONE = 'Asia/Ho_Chi_Minh';

const TABS = {
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  SCHEDULES: 'schedules',
  PRODUCT_LINES: 'product_lines',
  PRODUCTION_ORDERS: 'production_orders',
  TASKS: 'tasks',
  SETTINGS: 'settings',
};

// ==================== MAIN HANDLERS ====================

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const params = method === 'GET' ? e.parameter : JSON.parse(e.postData.contents);
    const action = params.action;

    if (!action) {
      return jsonResponse(false, null, 'Missing action parameter');
    }

    const result = routeAction(action, params);
    return jsonResponse(true, result);
  } catch (err) {
    logError(err);
    return jsonResponse(false, null, err.message || 'Internal server error');
  }
}

function routeAction(action, params) {
  const routes = {
    // Employees
    getEmployees: () => getEmployees(),
    getEmployee: () => getEmployee(params.id),
    addEmployee: () => addEmployee(params.data || params),
    updateEmployee: () => updateEmployee(params.id, params.data || params),
    toggleEmployeeStatus: () => toggleEmployeeStatus(params.id),
    loginByPin: () => loginByPin(params.pin_code),
    checkPinExists: () => checkPinExists(params.pin_code),

    // Attendance
    checkIn: () => checkIn(params.employee_id, params.shift, params.custom_hours),
    checkOut: () => checkOut(params.attendance_id, parseInt(params.lunch_break_minutes)),
    getTodayAttendance: () => getTodayAttendance(),
    getEmployeeTodayStatus: () => getEmployeeTodayStatus(params.employee_id),
    getMonthlyAttendance: () => getMonthlyAttendance(parseInt(params.month), parseInt(params.year)),
    getEmployeeMonthly: () => getEmployeeMonthly(params.employee_id, parseInt(params.month), parseInt(params.year)),
    updateAttendance: () => updateAttendance(params.id, params.data || params),

    // Schedules
    getWeekSchedule: () => getWeekSchedule(params.start_date),
    getEmployeeSchedule: () => getEmployeeSchedule(params.employee_id, params.start_date),
    requestSchedule: () => requestSchedule(params.employee_id, params.date, params.shift, params.note),
    cancelScheduleRequest: () => cancelScheduleRequest(params.id),
    getPendingSchedules: () => getPendingSchedules(),
    approveSchedule: () => approveSchedule(params.id, params.approved_by),
    rejectSchedule: () => rejectSchedule(params.id, params.reason),
    bulkApproveSchedules: () => bulkApproveSchedules(params.ids, params.approved_by),

    // Task Assignments (Việc chung)
    getTodayTasks: () => getTodayTasks(),
    updateTaskProgress: () => updateTaskProgress(params.task_id, params.employee_id, parseInt(params.step_completed), parseInt(params.quantity_done) || 0, params.notes),
    addTaskQuantity: () => addTaskQuantity(params.task_id, params.employee_id, parseInt(params.quantity), params.notes),
    updateTaskStatus: () => updateTaskStatus(params.task_id, params.employee_id, params.status),
    getTaskHistory: () => getTaskHistory(params.order_id),
    assignTask: () => assignTask(params.data || params), // Giữ lại cho admin

    // Production
    getOrders: () => getOrders(),
    getOrder: () => getOrder(params.id),
    addOrder: () => addOrder(params.data || params),
    addOrderWithTasks: () => addOrderWithTasks(params.data || params),
    updateOrderStage: () => updateOrderStage(params.id, parseInt(params.new_stage)),
    updateOrderStatus: () => updateOrderStatus(params.id, params.status),
    getProductLines: () => getProductLines(),
    addProductLine: () => addProductLine(params.data || params),
    updateProductLine: () => updateProductLine(params.id, params.data || params),

    // Settings
    getSettings: () => getSettings(),
    updateSetting: () => updateSetting(params.key, params.value),
    updateMultipleSettings: () => updateMultipleSettings(params.data || params),

    // Dashboard
    getDashboardStats: () => getDashboardStats(),

    // Worker Home
    getWorkerHomeData: () => getWorkerHomeData(params.employee_id),
  };

  if (!routes[action]) {
    throw new Error('Unknown action: ' + action);
  }

  return routes[action]();
}

// ==================== RESPONSE HELPERS ====================

function jsonResponse(success, data, error) {
  const output = JSON.stringify({ success, data: data || null, error: error || null });
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function logError(err) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName('logs');
    if (!logSheet) {
      logSheet = ss.insertSheet('logs');
      logSheet.appendRow(['timestamp', 'error', 'stack']);
    }
    logSheet.appendRow([now(), err.message, err.stack]);
  } catch (e) {
    // Silent fail on log
  }
}

// ==================== UTILITY FUNCTIONS ====================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}

function now() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function today() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

function nowTime() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'HH:mm');
}

function getSheet(tabName) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabName);
}

function getSheetData(tabName) {
  const sheet = getSheet(tabName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(h => String(h).trim().toLowerCase());
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      // Convert Date objects to string
      if (val instanceof Date) {
        // Check if it looks like a time-only value (date part is default)
        const hours = val.getHours();
        const minutes = val.getMinutes();
        if (val.getFullYear() === 1899 || val.getFullYear() === 1900) {
          val = Utilities.formatDate(val, TIMEZONE, 'HH:mm');
        } else {
          val = Utilities.formatDate(val, TIMEZONE, 'yyyy-MM-dd');
        }
      }
      if (val === true) val = 'TRUE';
      if (val === false) val = 'FALSE';
      obj[h] = val;
    });
    return obj;
  }).filter(row => row.id && String(row.id).trim() !== '');
}

function findRowIndex(tabName, id) {
  const sheet = getSheet(tabName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      return i + 1; // 1-indexed row number
    }
  }
  return -1;
}

function getSettingValue(key) {
  const settings = getSheetData(TABS.SETTINGS);
  const setting = settings.find(s => s.key === key);
  return setting ? setting.value : null;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
}

// ==================== EMPLOYEES ====================

function getEmployees() {
  const data = getSheetData(TABS.EMPLOYEES);
  return data.filter(e => e.status === 'active').map(formatEmployee);
}

function getEmployee(id) {
  const data = getSheetData(TABS.EMPLOYEES);
  const emp = data.find(e => String(e.id) === String(id));
  if (!emp) throw new Error('Employee not found: ' + id);
  return formatEmployee(emp);
}

function getAllEmployees() {
  return getSheetData(TABS.EMPLOYEES).map(formatEmployee);
}

function formatEmployee(e) {
  return {
    id: String(e.id),
    name: String(e.name || ''),
    phone: String(e.phone || ''),
    pin_code: String(e.pin_code || ''),
    type: String(e.type || 'fulltime'),
    skills: String(e.skills || '').split(',').map(s => s.trim()).filter(Boolean),
    hourly_rate: Number(e.hourly_rate) || 0,
    status: String(e.status || 'active'),
    joined_date: String(e.joined_date || ''),
    notes: String(e.notes || ''),
  };
}

function addEmployee(data) {
  const sheet = getSheet(TABS.EMPLOYEES);
  const id = 'EMP' + generateId();
  
  // Auto-generate pin_code if not provided
  let pinCode = data.pin_code || '';
  if (!pinCode) {
    const existing = getSheetData(TABS.EMPLOYEES);
    const nextNum = existing.length + 1;
    pinCode = 'NV' + String(nextNum).padStart(3, '0');
  }
  
  // Validate pin uniqueness
  if (pinCode) {
    const exists = checkPinExists(pinCode);
    if (exists.exists) throw new Error('Mã đăng nhập đã tồn tại: ' + pinCode);
  }
  
  sheet.appendRow([
    id,
    data.name || '',
    data.phone || '',
    pinCode,
    data.type || 'fulltime',
    Array.isArray(data.skills) ? data.skills.join(',') : (data.skills || ''),
    Number(data.hourly_rate) || 0,
    'active',
    data.joined_date || today(),
    data.notes || '',
  ]);
  return { id, pin_code: pinCode, message: 'Employee added' };
}

function updateEmployee(id, data) {
  const sheet = getSheet(TABS.EMPLOYEES);
  const rowIndex = findRowIndex(TABS.EMPLOYEES, id);
  if (rowIndex === -1) throw new Error('Employee not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

  headers.forEach((h, i) => {
    const key = String(h).trim().toLowerCase();
    if (key === 'id') return;
    if (data[key] !== undefined) {
      let val = data[key];
      if (key === 'skills' && Array.isArray(val)) val = val.join(',');
      row[i] = val;
    }
  });

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { id, message: 'Employee updated' };
}

function toggleEmployeeStatus(id) {
  const sheet = getSheet(TABS.EMPLOYEES);
  const rowIndex = findRowIndex(TABS.EMPLOYEES, id);
  if (rowIndex === -1) throw new Error('Employee not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.findIndex(h => String(h).trim().toLowerCase() === 'status') + 1;
  const currentStatus = sheet.getRange(rowIndex, statusCol).getValue();
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  sheet.getRange(rowIndex, statusCol).setValue(newStatus);

  return { id, status: newStatus };
}

// ==================== PIN LOGIN ====================

function loginByPin(pinCode) {
  if (!pinCode) throw new Error('Vui lòng nhập mã đăng nhập');
  const data = getSheetData(TABS.EMPLOYEES);
  const pinLower = String(pinCode).trim().toLowerCase();
  
  const emp = data.find(function(e) {
    return String(e.pin_code || '').trim().toLowerCase() === pinLower;
  });
  
  if (!emp) throw new Error('Mã không đúng hoặc tài khoản bị khóa');
  if (String(emp.status) !== 'active') throw new Error('Mã không đúng hoặc tài khoản bị khóa');
  
  return formatEmployee(emp);
}

function checkPinExists(pinCode) {
  if (!pinCode) return { exists: false };
  const data = getSheetData(TABS.EMPLOYEES);
  const pinLower = String(pinCode).trim().toLowerCase();
  const found = data.some(function(e) {
    return String(e.pin_code || '').trim().toLowerCase() === pinLower;
  });
  return { exists: found };
}

// ==================== ATTENDANCE ====================

function checkIn(employeeId, shiftType, customHours) {
  const sheet = getSheet(TABS.ATTENDANCE);
  const emp = getEmployee(employeeId);
  const todayStr = today();
  const currentTime = nowTime();
  const id = 'ATT' + generateId();

  let actualHours = 0;
  let isLate = false;
  let lateMinutes = 0;
  let endTime = '';

  // Handle fixed shifts
  if (['morning', 'afternoon', 'fullday'].includes(shiftType)) {
    const shiftStart = getSettingValue(`shift_${shiftType}_start`) || (shiftType === 'afternoon' ? '13:30' : '09:00');
    actualHours = Number(getSettingValue(`shift_${shiftType}_hours`)) || (shiftType === 'morning' ? 3 : (shiftType === 'afternoon' ? 4 : 7));
    const lateThreshold = Number(getSettingValue('late_threshold_minutes')) || 15;

    const checkInMinutes = parseTimeToMinutes(currentTime);
    const shiftStartMinutes = parseTimeToMinutes(shiftStart);
    
    if (checkInMinutes > shiftStartMinutes + lateThreshold) {
      isLate = true;
      lateMinutes = checkInMinutes - shiftStartMinutes;
    }
    endTime = getSettingValue(`shift_${shiftType}_end`) || '';
  } else if (shiftType === 'custom') {
    actualHours = Number(customHours) || 0;
    
    // Calculate estimated end time for custom shifts based on actualHours + 1 hour lunch break if spans over noon
    let endMin = parseTimeToMinutes(currentTime) + actualHours * 60;
    // VERY rough estimation for display purposes
    const endH = Math.floor(endMin / 60) % 24;
    const endM = Math.floor(endMin % 60);
    endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
  }

  const statusStr = isLate ? 'late' : 'on_time';

  sheet.appendRow([
    id,
    employeeId,
    emp.name,
    todayStr,
    shiftType,
    currentTime, // start_time
    endTime, // end_time
    actualHours, // actual_hours
    0, // overtime_hours
    statusStr,
    isLate ? `Trễ ${lateMinutes} phút` : '',
  ]);

  return {
    attendance_id: id,
    start_time: currentTime,
    shift_type: shiftType,
    is_late: isLate,
  };
}

function checkOut(attendanceId, end_time) {
  const sheet = getSheet(TABS.ATTENDANCE);
  const rowIndex = findRowIndex(TABS.ATTENDANCE, attendanceId);
  if (rowIndex === -1) throw new Error('Attendance record not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  const shiftType = String(row[hMap['shift_type']]);
  const startTimeStr = String(row[hMap['start_time']]);
  const currentTime = end_time || nowTime();

  let actualHours = Number(row[hMap['actual_hours']]) || 0;
  let overtimeHours = 0;
  const standardHours = Number(getSettingValue('standard_hours')) || 7;

  if (shiftType === 'custom') {
    const startMin = parseTimeToMinutes(startTimeStr);
    const endMin = parseTimeToMinutes(currentTime);
    let rawMin = endMin - startMin;
    if (rawMin < 0) rawMin += 24 * 60; // overnight
    
    // Check if overlaps lunch (12:00-13:30)
    const lunchStart = parseTimeToMinutes('12:00');
    const lunchEnd = parseTimeToMinutes('13:30');
    let overlapMinutes = 0;
    
    if (startMin < lunchEnd && endMin > lunchStart) {
        overlapMinutes = Math.min(endMin, lunchEnd) - Math.max(startMin, lunchStart);
    }
    
    let workMin = rawMin - Math.max(0, overlapMinutes);
    actualHours = Math.round(workMin / 60 * 100) / 100;
  } else if (shiftType === 'fullday') {
     actualHours = Number(getSettingValue(`shift_fullday_hours`)) || 7;
  } else {
     actualHours = Number(getSettingValue(`shift_${shiftType}_hours`)) || 0;
  }

  if (actualHours > standardHours) {
    overtimeHours = Math.round((actualHours - standardHours) * 100) / 100;
    actualHours = standardHours;
  }

  row[hMap['end_time']] = currentTime;
  row[hMap['actual_hours']] = actualHours;
  row[hMap['overtime_hours']] = overtimeHours;

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);

  return {
    actual_hours: actualHours,
    overtime_hours: overtimeHours,
    end_time: currentTime,
  };
}
function getTodayAttendance() {
  const todayStr = today();
  const data = getSheetData(TABS.ATTENDANCE);
  return data.filter(a => String(a.date) === todayStr).map(formatAttendance);
}

function getEmployeeTodayStatus(employeeId) {
  const todayStr = today();
  const data = getSheetData(TABS.ATTENDANCE);
  const record = data.find(a =>
    String(a.employee_id) === String(employeeId) && String(a.date) === todayStr
  );
  if (!record) return { checked_in: false };
  return {
    checked_in: true,
    checked_out: !!record.check_out && String(record.check_out).trim() !== '',
    attendance: formatAttendance(record),
  };
}

function getMonthlyAttendance(month, year) {
  const data = getSheetData(TABS.ATTENDANCE);
  return data.filter(a => {
    const d = String(a.date).split('-');
    return parseInt(d[1]) === month && parseInt(d[0]) === year;
  }).map(formatAttendance);
}

function getEmployeeMonthly(employeeId, month, year) {
  const data = getSheetData(TABS.ATTENDANCE);
  return data.filter(a => {
    const d = String(a.date).split('-');
    return String(a.employee_id) === String(employeeId) &&
      parseInt(d[1]) === month && parseInt(d[0]) === year;
  }).map(formatAttendance);
}

function updateAttendance(id, data) {
  const sheet = getSheet(TABS.ATTENDANCE);
  const rowIndex = findRowIndex(TABS.ATTENDANCE, id);
  if (rowIndex === -1) throw new Error('Attendance record not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  // Update fields
  ['shift_type', 'start_time', 'end_time', 'actual_hours', 'overtime_hours', 'status', 'note'].forEach(key => {
    if (data[key] !== undefined && hMap[key] !== undefined) {
      row[hMap[key]] = data[key];
    }
  });

  // Calculate actual hours if times changed and shift_type === 'custom'
  const shiftType = data.shift_type || String(row[hMap['shift_type']]);
  if ((data.start_time || data.end_time) && shiftType === 'custom') {
    const stStr = String(row[hMap['start_time']]);
    const etStr = String(row[hMap['end_time']]);
    if (stStr && etStr) {
      const startMin = parseTimeToMinutes(stStr);
      const endMin = parseTimeToMinutes(etStr);
      let rawMin = endMin - startMin;
      if (rawMin < 0) rawMin += 24 * 60;
      
      const lunchStart = parseTimeToMinutes('12:00');
      const lunchEnd = parseTimeToMinutes('13:30');
      let overlapMinutes = 0;
      if (startMin < lunchEnd && endMin > lunchStart) {
          overlapMinutes = Math.min(endMin, lunchEnd) - Math.max(startMin, lunchStart);
      }
      
      let workMin = rawMin - Math.max(0, overlapMinutes);
      let ah = Math.round(workMin / 60 * 100) / 100;
      
      const standardHours = Number(getSettingValue('standard_hours')) || 7;
      let ot = 0;
      if (ah > standardHours) { ot = Math.round((ah - standardHours) * 100) / 100; ah = standardHours; }
      
      row[hMap['actual_hours']] = ah;
      row[hMap['overtime_hours']] = ot;
    }
  }

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { id, message: 'Attendance updated' };
}

function formatAttendance(a) {
  return {
    id: String(a.id),
    employee_id: String(a.employee_id),
    employee_name: String(a.employee_name || ''),
    date: String(a.date),
    shift_type: String(a.shift_type || ''),
    start_time: String(a.start_time || ''),
    end_time: String(a.end_time || ''),
    actual_hours: Number(a.actual_hours) || 0,
    overtime_hours: Number(a.overtime_hours) || 0,
    status: String(a.status || ''),
    note: String(a.note || ''),
  };
}

// ==================== SCHEDULES ====================

function getWeekSchedule(startDate) {
  const data = getSheetData(TABS.SCHEDULES);
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = Utilities.formatDate(start, TIMEZONE, 'yyyy-MM-dd');
  const endStr = Utilities.formatDate(end, TIMEZONE, 'yyyy-MM-dd');

  return data.filter(s => {
    const d = String(s.date);
    return d >= startStr && d <= endStr;
  }).map(formatSchedule);
}

function getEmployeeSchedule(employeeId, startDate) {
  const data = getSheetData(TABS.SCHEDULES);
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = Utilities.formatDate(start, TIMEZONE, 'yyyy-MM-dd');
  const endStr = Utilities.formatDate(end, TIMEZONE, 'yyyy-MM-dd');

  return data.filter(s => {
    const d = String(s.date);
    return String(s.employee_id) === String(employeeId) && d >= startStr && d <= endStr;
  }).map(formatSchedule);
}

function requestSchedule(employeeId, date, shift, note) {
  const sheet = getSheet(TABS.SCHEDULES);
  const emp = getEmployee(employeeId);
  const id = 'SCH' + generateId();

  // Check duplicate
  const existing = getSheetData(TABS.SCHEDULES);
  const dup = existing.find(s =>
    String(s.employee_id) === String(employeeId) &&
    String(s.date) === String(date) &&
    String(s.shift) === String(shift) &&
    s.status !== 'rejected'
  );
  if (dup) throw new Error('Đã đăng ký ca này rồi');

  sheet.appendRow([
    id, employeeId, emp.name, date, shift, 'pending', '', '', note || '', now()
  ]);

  return { id, message: 'Schedule requested' };
}

function cancelScheduleRequest(id) {
  const sheet = getSheet(TABS.SCHEDULES);
  const rowIndex = findRowIndex(TABS.SCHEDULES, id);
  if (rowIndex === -1) throw new Error('Schedule not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  if (String(row[hMap['status']]) !== 'pending') {
    throw new Error('Chỉ có thể hủy đăng ký đang chờ duyệt');
  }

  sheet.deleteRow(rowIndex);
  return { message: 'Schedule cancelled' };
}

function getPendingSchedules() {
  const data = getSheetData(TABS.SCHEDULES);
  return data.filter(s => String(s.status) === 'pending').map(formatSchedule);
}

function approveSchedule(id, approvedBy) {
  const sheet = getSheet(TABS.SCHEDULES);
  const rowIndex = findRowIndex(TABS.SCHEDULES, id);
  if (rowIndex === -1) throw new Error('Schedule not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  row[hMap['status']] = 'approved';
  row[hMap['approved_by']] = approvedBy || 'Admin';
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);

  return { id, message: 'Schedule approved' };
}

function rejectSchedule(id, reason) {
  const sheet = getSheet(TABS.SCHEDULES);
  const rowIndex = findRowIndex(TABS.SCHEDULES, id);
  if (rowIndex === -1) throw new Error('Schedule not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  row[hMap['status']] = 'rejected';
  row[hMap['reject_reason']] = reason || '';
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);

  return { id, message: 'Schedule rejected' };
}

function bulkApproveSchedules(ids, approvedBy) {
  if (!Array.isArray(ids)) ids = JSON.parse(ids);
  const results = ids.map(id => {
    try {
      return approveSchedule(id, approvedBy);
    } catch (e) {
      return { id, error: e.message };
    }
  });
  return results;
}

function formatSchedule(s) {
  return {
    id: String(s.id),
    employee_id: String(s.employee_id),
    employee_name: String(s.employee_name || ''),
    date: String(s.date),
    shift: String(s.shift || ''),
    status: String(s.status || 'pending'),
    approved_by: String(s.approved_by || ''),
    reject_reason: String(s.reject_reason || ''),
    note: String(s.note || ''),
    created_at: String(s.created_at || ''),
  };
}

// ==================== TASKS (VIỆC CHUNG) ====================

function assignTask(data) {
  const sheet = getSheet(TABS.TASKS);
  const id = 'TASK' + generateId();
  
  let orderCode = data.order_code || '';
  let productLineName = data.product_line_name || '';
  if (data.order_id) {
    try {
      const order = getOrder(data.order_id);
      orderCode = order.order_code;
      productLineName = order.product_line_name;
    } catch (e) {}
  }

  sheet.appendRow([
    id,
    data.order_id || '',
    orderCode,
    productLineName,
    data.description || '',
    0, // current_step 
    data.total_steps !== undefined ? Number(data.total_steps) : 5, // total_steps
    data.assigned_date || today(),
    'open', // status
    '', // completed_by
    '', // completed_at
    0, // quantity_done
    data.notes || '',
  ]);

  return { id, message: 'Task assigned' };
}

function getTodayTasks() {
  const dateStr = today();
  const data = getSheetData(TABS.TASKS);
  return data.filter(t =>
    String(t.assigned_date) === dateStr
  ).map(formatTask);
}

function updateTaskProgress(taskId, employeeId, stepCompleted, quantityDone, notesStr) {
  const sheet = getSheet(TABS.TASKS);
  const rowIndex = findRowIndex(TABS.TASKS, taskId);
  if (rowIndex === -1) throw new Error('Task not found');
  const emp = getEmployee(employeeId);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  const totalSteps = Number(row[hMap['total_steps']]) || 0;
  
  row[hMap['current_step']] = stepCompleted;
  row[hMap['completed_by']] = emp.name;
  
  let currentQuantity = Number(row[hMap['quantity_done']]) || 0;
  if(quantityDone > 0){
     currentQuantity += quantityDone;
     const currentNotes = String(row[hMap['notes']] || '');
     const newLog = `${emp.name}: +${quantityDone} SP lúc ${nowTime()}`;
     row[hMap['notes']] = currentNotes ? `${currentNotes}\n${newLog}` : newLog;
  }
  row[hMap['quantity_done']] = currentQuantity;

  let newStatus = 'in_progress';
  if (stepCompleted >= totalSteps) {
    newStatus = 'completed';
    row[hMap['completed_at']] = now();
  }
  row[hMap['status']] = newStatus;

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { id: taskId, status: newStatus, message: 'Task progress updated' };
}

function addTaskQuantity(taskId, employeeId, quantity, notesStr) {
   const sheet = getSheet(TABS.TASKS);
   const rowIndex = findRowIndex(TABS.TASKS, taskId);
   if (rowIndex === -1) throw new Error('Task not found');
   const emp = getEmployee(employeeId);
   
   const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
   const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
   const hMap = {};
   headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });
   
   let currentQuantity = Number(row[hMap['quantity_done']]) || 0;
   currentQuantity += quantity;
   row[hMap['quantity_done']] = currentQuantity;
   
   const currentNotes = String(row[hMap['notes']] || '');
   const newLog = `${emp.name}: +${quantity} SP lúc ${nowTime()}${notesStr ? ` (${notesStr})` : ''}`;
   row[hMap['notes']] = currentNotes ? `${currentNotes}\n${newLog}` : newLog;
   
   sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
   return { id: taskId, quantity_done: currentQuantity, message: 'Quantity added' };
}

function updateTaskStatus(taskId, employeeId, status) {
   const sheet = getSheet(TABS.TASKS);
   const rowIndex = findRowIndex(TABS.TASKS, taskId);
   if (rowIndex === -1) throw new Error('Task not found');
   const emp = getEmployee(employeeId);
   
   const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
   const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
   const hMap = {};
   headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });
   
   row[hMap['status']] = status;
   
   if (status === 'completed' || String(status) === '5') {
     row[hMap['completed_by']] = emp.name;
     row[hMap['completed_at']] = now();
   } else {
     row[hMap['completed_by']] = '';
     row[hMap['completed_at']] = '';
   }
   
   const currentNotes = String(row[hMap['notes']] || '');
   const STAGES_MAP = {
     '1': 'Chờ', '2': 'Đang bóc', '3': 'Chia lọ', '4': 'Dán tem', '5': 'Đóng hộp',
     'open': 'Chờ', 'in_progress': 'Đang làm', 'completed': 'Xong'
   };
   const statusVN = STAGES_MAP[status] || status;
   const newLog = `${emp.name}: Đổi trạng thái -> ${statusVN} lúc ${nowTime()}`;
   row[hMap['notes']] = currentNotes ? `${currentNotes}\n${newLog}` : newLog;
   
   sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
   return { id: taskId, status: status, message: 'Status updated' };
}

function getTaskHistory(orderId) {
    const data = getSheetData(TABS.TASKS);
    return data.filter(t => String(t.order_id) === String(orderId)).map(formatTask);
}

function getAllTasksToday() {
  const todayStr = today();
  const data = getSheetData(TABS.TASKS);
  return data.filter(t => String(t.assigned_date) === todayStr).map(formatTask);
}

function formatTask(t) {
  return {
    id: String(t.id),
    order_id: String(t.order_id || ''),
    order_code: String(t.order_code || ''),
    product_line_name: String(t.product_line_name || ''),
    description: String(t.description || ''),
    current_step: Number(t.current_step) || 0,
    total_steps: Number(t.total_steps) || 0,
    assigned_date: String(t.assigned_date),
    status: String(t.status || 'open'),
    completed_by: String(t.completed_by || ''),
    completed_at: String(t.completed_at || ''),
    quantity_done: Number(t.quantity_done) || 0,
    notes: String(t.notes || ''),
  };
}



// ==================== PRODUCTION ORDERS ====================

function getOrders() {
  return getSheetData(TABS.PRODUCTION_ORDERS).map(formatOrder);
}

function getOrder(id) {
  const data = getSheetData(TABS.PRODUCTION_ORDERS);
  const order = data.find(o => String(o.id) === String(id));
  if (!order) throw new Error('Order not found: ' + id);
  return formatOrder(order);
}

function addOrder(data) {
  const sheet = getSheet(TABS.PRODUCTION_ORDERS);
  const id = 'ORD' + generateId();
  const year = new Date().getFullYear();

  // Auto-generate order code
  const existing = getSheetData(TABS.PRODUCTION_ORDERS);
  const yearOrders = existing.filter(o => String(o.order_code).includes(String(year)));
  const nextNum = String(yearOrders.length + 1).padStart(3, '0');
  const orderCode = 'ORD-' + year + '-' + nextNum;

  // Get product line name
  let productLineName = data.product_line_name || '';
  if (data.product_line_id) {
    const pls = getSheetData(TABS.PRODUCT_LINES);
    const pl = pls.find(p => String(p.id) === String(data.product_line_id));
    if (pl) productLineName = pl.name;
  }

  sheet.appendRow([
    id,
    orderCode,
    data.product_line_id || '',
    productLineName,
    Number(data.quantity) || 0,
    1,  // current_stage
    5,  // total_stages
    'pending', // status
    data.deadline || '',
    data.priority || 'medium',
    data.notes || '',
    now(), // created_at
    '',  // completed_at
  ]);

  return { id, order_code: orderCode, message: 'Order created' };
}

function addOrderWithTasks(data) {
  // Step 1: Create the order
  const orderResult = addOrder(data);
  
  // Step 2: Create tasks if provided
  const tasksCreated = [];
  if (data.tasks && Array.isArray(data.tasks)) {
    data.tasks.forEach(function(taskDef) {
      if (!taskDef.enabled) return;
      const taskResult = assignTask({
        order_id: orderResult.id,
        order_code: orderResult.order_code,
        product_line_name: data.product_line_name || '',
        description: taskDef.description || taskDef.name || '',
        total_steps: Number(taskDef.quantity) || Number(data.quantity) || 0,
        assigned_date: data.assigned_date || today(),
        notes: 'Tự động tạo từ đơn ' + orderResult.order_code,
      });
      tasksCreated.push(taskResult);
    });
  }
  
  return {
    id: orderResult.id,
    order_code: orderResult.order_code,
    tasks_created: tasksCreated.length,
    message: 'Order created with ' + tasksCreated.length + ' tasks'
  };
}

function updateOrderStage(id, newStage) {
  const sheet = getSheet(TABS.PRODUCTION_ORDERS);
  const rowIndex = findRowIndex(TABS.PRODUCTION_ORDERS, id);
  if (rowIndex === -1) throw new Error('Order not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  row[hMap['current_stage']] = newStage;

  if (newStage >= 5) {
    row[hMap['status']] = 'completed';
    row[hMap['completed_at']] = now();
  } else if (newStage > 1) {
    row[hMap['status']] = 'in_progress';
  }

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { id, current_stage: newStage, message: 'Stage updated' };
}

function updateOrderStatus(id, status) {
  const sheet = getSheet(TABS.PRODUCTION_ORDERS);
  const rowIndex = findRowIndex(TABS.PRODUCTION_ORDERS, id);
  if (rowIndex === -1) throw new Error('Order not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hMap = {};
  headers.forEach((h, i) => { hMap[String(h).trim().toLowerCase()] = i; });

  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  row[hMap['status']] = status;
  if (status === 'completed') row[hMap['completed_at']] = now();

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { id, status, message: 'Order status updated' };
}

function formatOrder(o) {
  return {
    id: String(o.id),
    order_code: String(o.order_code || ''),
    product_line_id: String(o.product_line_id || ''),
    product_line_name: String(o.product_line_name || ''),
    quantity: Number(o.quantity) || 0,
    current_stage: Number(o.current_stage) || 1,
    total_stages: Number(o.total_stages) || 5,
    deadline: String(o.deadline || ''),
    priority: String(o.priority || 'medium'),
    status: String(o.status || 'pending'),
    notes: String(o.notes || ''),
    created_at: String(o.created_at || ''),
    completed_at: String(o.completed_at || ''),
  };
}

// ==================== PRODUCT LINES ====================

function getProductLines() {
  return getSheetData(TABS.PRODUCT_LINES).map(formatProductLine);
}

function addProductLine(data) {
  const sheet = getSheet(TABS.PRODUCT_LINES);
  const existing = getSheetData(TABS.PRODUCT_LINES);
  const nextNum = String(existing.length + 1).padStart(3, '0');
  const id = 'PL' + nextNum;

  sheet.appendRow([
    id,
    data.name || '',
    data.icon || '📦',
    data.color || '#999999',
    data.amazon_sku_prefix || '',
    'TRUE',
  ]);

  return { id, message: 'Product line added' };
}

function updateProductLine(id, data) {
  const sheet = getSheet(TABS.PRODUCT_LINES);
  const rowIndex = findRowIndex(TABS.PRODUCT_LINES, id);
  if (rowIndex === -1) throw new Error('Product line not found');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

  headers.forEach((h, i) => {
    const key = String(h).trim().toLowerCase();
    if (key === 'id') return;
    if (data[key] !== undefined) row[i] = data[key];
  });

  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  return { id, message: 'Product line updated' };
}

function formatProductLine(p) {
  return {
    id: String(p.id),
    name: String(p.name || ''),
    icon: String(p.icon || ''),
    color: String(p.color || ''),
    amazon_sku_prefix: String(p.amazon_sku_prefix || ''),
    is_active: String(p.is_active) === 'TRUE',
  };
}

// ==================== SETTINGS ====================

function getSettings() {
  return getSheetData(TABS.SETTINGS).map(s => ({
    key: String(s.key),
    value: String(s.value),
    description: String(s.description || ''),
  }));
}

function updateSetting(key, value) {
  const sheet = getSheet(TABS.SETTINGS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      sheet.getRange(i + 1, 2).setValue(value);
      return { key, value, message: 'Setting updated' };
    }
  }

  // Add new setting if not found
  sheet.appendRow([key, value, '']);
  return { key, value, message: 'Setting added' };
}

function updateMultipleSettings(data) {
  if (typeof data === 'string') data = JSON.parse(data);
  const results = [];

  if (Array.isArray(data)) {
    data.forEach(item => {
      results.push(updateSetting(item.key, item.value));
    });
  } else {
    Object.keys(data).forEach(key => {
      if (key !== 'action') {
        results.push(updateSetting(key, data[key]));
      }
    });
  }

  return results;
}

// ==================== DASHBOARD ====================

function getDashboardStats() {
  const todayStr = today();
  const employees = getSheetData(TABS.EMPLOYEES).filter(e => e.status === 'active');
  const todayAttendance = getSheetData(TABS.ATTENDANCE).filter(a => String(a.date) === todayStr);
  const pendingSchedules = getSheetData(TABS.SCHEDULES).filter(s => String(s.status) === 'pending');
  const orders = getSheetData(TABS.PRODUCTION_ORDERS);
  const activeOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'pending');
  const todayTasks = getSheetData(TABS.TASKS).filter(t => String(t.assigned_date) === todayStr);

  // Orders near deadline (< 3 days)
  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const threeDaysStr = Utilities.formatDate(threeDaysLater, TIMEZONE, 'yyyy-MM-dd');
  const nearDeadline = activeOrders.filter(o => String(o.deadline) <= threeDaysStr && String(o.deadline) >= todayStr);

  // Issues today (Can check tasks with issues in notes if needed, simplified for now)
  const issuesToday = todayTasks.filter(t => String(t.notes).toLowerCase().includes('lỗi') || String(t.notes).toLowerCase().includes('vấn đề'));

  // Total work hours today
  let totalWorkHours = 0;
  let totalOvertime = 0;
  todayAttendance.forEach(a => {
    totalWorkHours += Number(a.actual_hours) || 0;
    totalOvertime += Number(a.overtime_hours) || 0;
  });

  // Attendance rate this week
  const startOfWeek = new Date();
  const dayOfWeek = startOfWeek.getDay() || 7;
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);
  const weekStart = Utilities.formatDate(startOfWeek, TIMEZONE, 'yyyy-MM-dd');
  const allAttendance = getSheetData(TABS.ATTENDANCE);
  const weekAttendance = allAttendance.filter(a => String(a.date) >= weekStart && String(a.date) <= todayStr);
  const workDaysThisWeek = Math.min(dayOfWeek, 5); // Max 5 work days
  const expectedAttendance = employees.length * workDaysThisWeek;
  const attendanceRate = expectedAttendance > 0
    ? Math.round(weekAttendance.length / expectedAttendance * 100)
    : 0;

  return {
    total_employees: employees.length,
    employees_today: todayAttendance.length,
    pending_schedules: pendingSchedules.length,
    active_orders: activeOrders.length,
    orders_near_deadline: nearDeadline.length,
    total_reports_today: todayTasks.length, // Aliased for compatibility if needed
    issues_today: issuesToday.length,
    attendance_rate_this_week: Math.min(attendanceRate, 100),
    total_work_hours_today: Math.round(totalWorkHours * 100) / 100,
    total_overtime_today: Math.round(totalOvertime * 100) / 100,
  };
}

// ==================== WORKER HOME ====================

function getWorkerHomeData(employeeId) {
  const emp = getEmployee(employeeId);
  const todayStr = today();

  // Today's attendance
  const allAttendance = getSheetData(TABS.ATTENDANCE);
  const todayAtt = allAttendance.find(a =>
    String(a.employee_id) === String(employeeId) && String(a.date) === todayStr
  );

  // Today's tasks (SHARED)
  const allTasks = getSheetData(TABS.TASKS);
  const todayTasks = allTasks.filter(t =>
    String(t.assigned_date) === todayStr && String(t.status) !== 'completed'
  ).map(formatTask);

  // Week schedule
  const startOfWeek = new Date();
  const dayOfWeek = startOfWeek.getDay() || 7;
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);
  const weekStartStr = Utilities.formatDate(startOfWeek, TIMEZONE, 'yyyy-MM-dd');
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  const weekEndStr = Utilities.formatDate(endOfWeek, TIMEZONE, 'yyyy-MM-dd');

  const allSchedules = getSheetData(TABS.SCHEDULES);
  const weekSchedule = allSchedules.filter(s =>
    String(s.employee_id) === String(employeeId) &&
    String(s.date) >= weekStartStr && String(s.date) <= weekEndStr
  ).map(formatSchedule);

  // Pending requests
  const pendingRequests = allSchedules.filter(s =>
    String(s.employee_id) === String(employeeId) && String(s.status) === 'pending'
  ).map(formatSchedule);

  // This month summary
  const now = new Date();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = String(now.getFullYear());
  const monthPrefix = yearStr + '-' + monthStr;

  const monthAttendance = allAttendance.filter(a =>
    String(a.employee_id) === String(employeeId) && String(a.date).startsWith(monthPrefix)
  );

  let totalHours = 0;
  let totalOvertime = 0;
  monthAttendance.forEach(a => {
    totalHours += Number(a.actual_hours) || 0;
    totalOvertime += Number(a.overtime_hours) || 0;
  });

  const overtimeRate = Number(getSettingValue('overtime_rate')) || 1.5;
  const estimatedSalary = (totalHours * emp.hourly_rate) + (totalOvertime * emp.hourly_rate * overtimeRate);

  return {
    employee: emp,
    today_attendance: todayAtt ? formatAttendance(todayAtt) : null,
    today_tasks: todayTasks,
    week_schedule: weekSchedule,
    pending_requests: pendingRequests,
    this_month_summary: {
      days_worked: monthAttendance.length,
      total_hours: Math.round(totalHours * 100) / 100,
      total_overtime: Math.round(totalOvertime * 100) / 100,
      estimated_salary: Math.round(estimatedSalary),
    },
  };
}
// ==================== INITIALIZATION ====================

/**
 * Hàm này dùng để tạo tất cả các bảng và tiêu đề cột tự động.
 * Người dùng chỉ cần chạy hàm này 1 lần duy nhất để bắt đầu.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const setupTabs = [
    { 
      name: TABS.EMPLOYEES, 
      headers: ['id', 'name', 'phone', 'type', 'skills', 'hourly_rate', 'status', 'joined_date', 'notes'],
      sample: ['EMP001', 'Admin Test', '0900000000', 'fulltime', 'management', 50000, 'active', today(), 'Tài khoản test']
    },
    { 
      name: TABS.ATTENDANCE, 
      headers: ['id', 'employee_id', 'employee_name', 'date', 'shift_type', 'start_time', 'end_time', 'actual_hours', 'overtime_hours', 'status', 'note'] 
    },
    { 
      name: TABS.SCHEDULES, 
      headers: ['id', 'employee_id', 'employee_name', 'date', 'shift', 'status', 'approved_by', 'reject_reason', 'note', 'created_at'] 
    },
    { 
      name: TABS.PRODUCT_LINES, 
      headers: ['id', 'name', 'icon', 'color', 'amazon_sku_prefix', 'is_active'],
      samples: [
        ['PL001', 'Positive Jars - Standard', '📦', '#E8A87C', 'PJ-STD', 'TRUE'],
        ['PL002', 'Soulful Spark - Mini', '✨', '#457B9D', 'SS-MIN', 'TRUE']
      ]
    },
    { 
      name: TABS.PRODUCTION_ORDERS, 
      headers: ['id', 'order_code', 'product_line_id', 'product_line_name', 'quantity', 'current_stage', 'total_stages', 'status', 'deadline', 'priority', 'notes', 'created_at', 'completed_at'] 
    },
    { 
      name: TABS.TASKS, 
      headers: ['id', 'order_id', 'order_code', 'product_line_name', 'description', 'current_step', 'total_steps', 'assigned_date', 'status', 'completed_by', 'completed_at', 'quantity_done', 'notes'] 
    },
    { 
      name: TABS.SETTINGS, 
      headers: ['key', 'value', 'description'],
      samples: [
        ['shift_morning_start', '09:00', 'Bắt đầu ca sáng'],
        ['shift_morning_end', '12:00', 'Kết thúc ca sáng'],
        ['shift_morning_hours', '3', 'Số giờ ca sáng'],
        ['shift_afternoon_start', '13:30', 'Bắt đầu ca chiều'],
        ['shift_afternoon_end', '17:30', 'Kết thúc ca chiều'],
        ['shift_afternoon_hours', '4', 'Số giờ ca chiều'],
        ['shift_fullday_hours', '7', 'Số giờ full ngày'],
        ['lunch_break_minutes', '90', 'Nghỉ trưa 12:00-13:30'],
        ['late_threshold_minutes', '15', 'Phút cho phép trễ'],
        ['overtime_rate', '1.5', 'Hệ số lương OT'],
        ['standard_hours', '7', 'Giờ chuẩn full ngày'],
      ]
    }
  ];


  setupTabs.forEach(tab => {
    let sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      sheet = ss.insertSheet(tab.name);
    }
    sheet.clear();
    sheet.appendRow(tab.headers);
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, tab.headers.length);
    headerRange.setBackground('#2D3348').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Add samples if any
    if (tab.sample) sheet.appendRow(tab.sample);
    if (tab.samples) tab.samples.forEach(s => sheet.appendRow(s));

    // Auto-resize columns
    sheet.autoResizeColumns(1, tab.headers.length);
  });

  // Remove default sheet
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log('🎉 Đã thiết lập cơ sở dữ liệu thành công!');
}

/**
 * Hàm này dùng để cập nhật các cột tiêu đề lên bản mới nhất (V2) 
 * MÀ KHÔNG LÀM MẤT DỮ LIỆU CŨ. Người dùng có thể an tâm nhấn Run.
 */
function migrateToV2() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const setupTabs = [
    { 
      name: TABS.EMPLOYEES, 
      headers: ['id', 'name', 'phone', 'type', 'skills', 'hourly_rate', 'status', 'joined_date', 'notes']
    },
    { 
      name: TABS.ATTENDANCE, 
      headers: ['id', 'employee_id', 'employee_name', 'date', 'shift_type', 'start_time', 'end_time', 'actual_hours', 'overtime_hours', 'status', 'note'] 
    },
    { 
      name: TABS.SCHEDULES, 
      headers: ['id', 'employee_id', 'employee_name', 'date', 'shift', 'status', 'approved_by', 'reject_reason', 'note', 'created_at'] 
    },
    { 
      name: TABS.PRODUCT_LINES, 
      headers: ['id', 'name', 'icon', 'color', 'amazon_sku_prefix', 'is_active']
    },
    { 
      name: TABS.PRODUCTION_ORDERS, 
      headers: ['id', 'order_code', 'product_line_id', 'product_line_name', 'quantity', 'current_stage', 'total_stages', 'status', 'deadline', 'priority', 'notes', 'created_at', 'completed_at'] 
    },
    { 
      name: TABS.TASKS, 
      headers: ['id', 'order_id', 'order_code', 'product_line_name', 'description', 'current_step', 'total_steps', 'assigned_date', 'status', 'completed_by', 'completed_at', 'quantity_done', 'notes'] 
    },
    { 
      name: TABS.SETTINGS, 
      headers: ['key', 'value', 'description']
    }
  ];

  setupTabs.forEach(tab => {
    let sheet = ss.getSheetByName(tab.name);
    if (!sheet) {
      // Nếu chưa có tab này thì tạo mới
      sheet = ss.insertSheet(tab.name);
      sheet.appendRow(tab.headers);
    } else {
      // Nếu đã có tab thì chỉ cập nhật dòng 1 (Header)
      const maxCols = Math.max(sheet.getLastColumn(), tab.headers.length);
      const headersRowRange = sheet.getRange(1, 1, 1, tab.headers.length);
      
      // Clear old headers up to max column just in case old headers were longer
      if (maxCols > tab.headers.length) {
        sheet.getRange(1, tab.headers.length + 1, 1, maxCols - tab.headers.length).clearContent();
      }
      
      // Set new headers
      headersRowRange.setValues([tab.headers]);
    }
    
    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, tab.headers.length);
    headerRange.setBackground('#2D3348').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, tab.headers.length);
  });

  // Rename "Daily Reports" to "Order Reports (Deprecated)" if it exists
  const oldReportsTab = ss.getSheetByName('Daily Reports');
  if (oldReportsTab) {
    oldReportsTab.setName(TABS.ORDER_REPORTS || 'Order Reports (Deprecated)');
  }

  Logger.log('✅ Đã cập nhật tiêu đề các cột lên V2 thành công. Dữ liệu cũ được giữ nguyên!');
}

/**
 * Hàm này dùng để thêm một số dữ liệu test mẫu vào các bảng.
 * Giúp người dùng dễ dàng xem thử giao diện và chức năng của ứng dụng.
 */
function addTestData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Employees
  const empSheet = ss.getSheetByName(TABS.EMPLOYEES);
  if (empSheet && empSheet.getLastRow() <= 1) {
    empSheet.appendRow(['EMP001', 'Nguyễn Văn Cường', '0901234567', 'fulltime', 'chia lọ, đóng hộp', 50000, 'active', today(), 'NV Cứng']);
    empSheet.appendRow(['EMP002', 'Lê Thị Oanh', '0987654321', 'parttime', 'dán tem', 35000, 'active', today(), 'Sinh viên']);
    empSheet.appendRow(['EMP003', 'Trần Bảo Anh', '0912345678', 'fulltime', 'bóc, đóng hộp', 45000, 'active', today(), '']);
  }

  // 2. Product Lines
  const plSheet = ss.getSheetByName(TABS.PRODUCT_LINES);
  if (plSheet && plSheet.getLastRow() <= 1) {
    plSheet.appendRow(['PL001', 'Mật ong nguyên chất 500ml', '🍯', '#E8A87C', 'MO-500', 'TRUE']);
    plSheet.appendRow(['PL002', 'Tinh dầu tràm trà 30ml', '🌿', '#2A9D8F', 'TDT-30', 'TRUE']);
    plSheet.appendRow(['PL003', 'Sáp nến thơm', '🕯️', '#E76F51', 'SNT-01', 'TRUE']);
  }

  // 3. Current Date Context
  const todayStr = today();
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 2);
  const deadlineStr = Utilities.formatDate(tmr, TIMEZONE, 'yyyy-MM-dd');

  // 4. Production Orders ('id', 'order_code', 'product_line_id', 'product_line_name', 'quantity', 'current_stage', 'total_stages', 'status', 'deadline', 'priority', 'notes', 'created_at', 'completed_at')
  const orderSheet = ss.getSheetByName(TABS.PRODUCTION_ORDERS);
  if (orderSheet) {
    orderSheet.appendRow(['ORD1001', 'ORD-2026-001', 'PL001', 'Mật ong nguyên chất 500ml', 1000, 2, 5, 'in_progress', deadlineStr, 'high', 'Sản xuất gấp giao thứ 7', todayStr, '']);
    orderSheet.appendRow(['ORD1002', 'ORD-2026-002', 'PL002', 'Tinh dầu tràm trà 30ml', 500, 1, 5, 'pending', deadlineStr, 'medium', '', todayStr, '']);
  }

  // 5. Tasks ('id', 'order_id', 'order_code', 'product_line_name', 'description', 'current_step', 'total_steps', 'assigned_date', 'status', 'completed_by', 'completed_at', 'quantity_done', 'notes')
  const taskSheet = ss.getSheetByName(TABS.TASKS);
  if (taskSheet) {
    // Stage choices: '1' (Chờ), '2' (Đang bóc), '3' (Chia lọ), '4' (Dán tem), '5' (Đóng hộp)
    taskSheet.appendRow(['TSK1001', 'ORD1001', 'ORD-2026-001', 'Mật ong nguyên chất 500ml', 'Bóc thùng nguyên liệu', 0, 1000, todayStr, '2', '', '', 450, 'Nguyễn Văn Cường: +450 SP lúc 09:30']);
    taskSheet.appendRow(['TSK1002', 'ORD1001', 'ORD-2026-001', 'Mật ong nguyên chất 500ml', 'Chia lọ mẻ đầu', 0, 300, todayStr, '3', '', '', 100, 'Lê Thị Oanh: Đổi trạng thái -> Chia lọ lúc 10:00']);
    taskSheet.appendRow(['TSK1003', 'ORD1002', 'ORD-2026-002', 'Tinh dầu tràm trà 30ml', 'Chuẩn bị tem nhãn', 0, 500, todayStr, '1', '', '', 0, '']);
  }
  
  // 6. Schedules ('id', 'employee_id', 'employee_name', 'date', 'shift', 'status', 'approved_by', 'reject_reason', 'note', 'created_at')
  const schedSheet = ss.getSheetByName(TABS.SCHEDULES);
  if (schedSheet) {
    schedSheet.appendRow(['SCH1001', 'EMP001', 'Nguyễn Văn Cường', todayStr, 'fullday', 'approved', 'admin', '', '', todayStr]);
    schedSheet.appendRow(['SCH1002', 'EMP002', 'Lê Thị Oanh', todayStr, 'morning', 'approved', 'admin', '', '', todayStr]);
    schedSheet.appendRow(['SCH1003', 'EMP003', 'Trần Bảo Anh', deadlineStr, 'afternoon', 'pending', '', '', '', todayStr]);
  }

  // 7. Attendance
  const attSheet = ss.getSheetByName(TABS.ATTENDANCE);
  if (attSheet) {
    attSheet.appendRow(['ATT1001', 'EMP001', 'Nguyễn Văn Cường', todayStr, 'fullday', '08:50', '17:35', 7, 0, 'on_time', '']);
    attSheet.appendRow(['ATT1002', 'EMP002', 'Lê Thị Oanh', todayStr, 'morning', '09:15', '12:00', 3, 0, 'late', 'Trễ 15 phút do bão']);
  }

  Logger.log('✅ Đã thêm dữ liệu test mẫu thành công!');
}
