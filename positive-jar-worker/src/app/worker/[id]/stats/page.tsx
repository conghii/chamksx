'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { getEmployee, getEmployeeMonthly, useAPI } from '@/lib/api';
import { Employee, Attendance, EMPLOYEE_TYPES } from '@/types';
import { formatCurrency, formatHours, getInitials, getEmployeeTypeColor } from '@/lib/utils';
import { BarChart2, CalendarDays } from 'lucide-react';

export default function WorkerStatsPage() {
  const params = useParams();
  const id = params.id as string;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: employee } = useAPI<Employee>(() => getEmployee(id), [id]);
  const { data: attendance, loading } = useAPI<Attendance[]>(() => getEmployeeMonthly(id, month, year), [id, month, year]);

  const summary = useMemo(() => {
    if (!attendance || !employee) return { days: 0, hours: 0, ot: 0, salary: 0 };
    let totalH = 0, totalOT = 0;
    attendance.forEach(a => { 
      totalH += (a.actual_hours || 0); 
      totalOT += (a.overtime_hours || 0); 
    });
    const salary = (totalH * employee.hourly_rate) + (totalOT * employee.hourly_rate * 1.5);
    return { days: attendance.filter(a => a.actual_hours > 0).length, hours: totalH, ot: totalOT, salary };
  }, [attendance, employee]);

  const sorted = useMemo(() => {
    if (!attendance) return [];
    return [...attendance].sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance]);

  const typeInfo = EMPLOYEE_TYPES.find(t => t.id === employee?.type);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={24} color="var(--brand)" /> Thống kê giờ làm
        </h1>
        <p style={{ color: 'var(--text-sub)', fontSize: 13, marginTop: 4 }}>Bảng kê chi tiết giờ làm, tăng ca và dự tính lương</p>
      </div>

      {employee && (
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar" style={{
            background: getEmployeeTypeColor(employee.type),
            width: 56, height: 56, fontSize: 18
          }}>
            {getInitials(employee.name)}
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{employee.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
               <span className="badge" style={{ background: `${typeInfo?.color}15`, color: typeInfo?.color, padding: '2px 8px' }}>
                 {typeInfo?.label}
               </span>
               <span style={{ color: 'var(--text-sub)', fontWeight: 600 }}>{formatCurrency(employee.hourly_rate)}/h</span>
            </div>
          </div>
        </div>
      )}

      {/* Month Selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', appearance: 'none', background: 'white' }}
          >
            {months.map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <CalendarDays size={16} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 12, pointerEvents: 'none' }} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', appearance: 'none', background: 'white' }}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <CalendarDays size={16} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 12, pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Month Summary */}
      <div className="card">
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 10px' }}>Tổng kết Tháng {month}/{year}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Ngày công', value: String(summary.days), color: 'var(--brand)' },
            { label: 'Tổng giờ làm', value: formatHours(summary.hours), color: 'var(--accent)' },
            { label: 'Tổng tăng ca', value: formatHours(summary.ot), color: 'var(--danger)' },
            { label: 'Dự tính thu nhập', value: formatCurrency(summary.salary), color: 'var(--success)' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg-subtle)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: item.color, margin: '2px 0 0' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance History */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Lịch sử chấm công chi tiết</h3>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>📭</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, margin: 0 }}>Không có dữ liệu trong tháng này</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((a, idx) => (
            <div key={`${a.id}-${idx}`} className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {new Date(a.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-subtle)', color: 'var(--text-sub)', fontSize: 11 }}>
                    {a.shift_type === 'morning' ? 'Sáng' : a.shift_type === 'afternoon' ? 'Chiều' : a.shift_type === 'fullday' ? 'Full' : 'Tùy chọn'}
                  </span>
                </div>
                <span className="badge" style={{
                  background: a.status === 'on_time' ? 'var(--success-bg)' : a.status === 'late' ? 'var(--danger-bg)' : 'var(--bg-subtle)',
                  color: a.status === 'on_time' ? 'var(--success)' : a.status === 'late' ? 'var(--danger)' : 'var(--text-sub)',
                  fontSize: 11
                }}>
                  {a.status === 'on_time' ? '✓ Đúng giờ' : a.status === 'late' ? '⚠️ Trễ' : a.status}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, auto) 1fr auto', alignItems: 'center', gap: 12, fontSize: 13, background: 'var(--bg-subtle)', padding: '8px 10px', borderRadius: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Vào - Ra</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{a.start_time || '--'} → {a.end_time || '--'}</span>
                </div>
                <div style={{ width: 1, height: '100%', background: 'var(--border)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tổng giờ</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--brand)' }}>{formatHours(a.actual_hours)}</span>
                    {a.overtime_hours > 0 && (
                      <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: 11, background: 'var(--danger-bg)', padding: '1px 4px', borderRadius: 4 }}>
                        +{formatHours(a.overtime_hours)} OT
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {a.note && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Ghi chú: {a.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
