'use client';

import { useState, useMemo } from 'react';
import { getTodayAttendance, getMonthlyAttendance, getEmployees, updateAttendance, useAPI } from '@/lib/api';
import { Attendance, Employee } from '@/types';
import { formatHours, formatCurrency, toDateString } from '@/lib/utils';
import { Loader2, Edit2, Save, X } from 'lucide-react';

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'today' | 'monthly'>('today');
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Attendance>>({});
  const [saving, setSaving] = useState(false);

  const { data: todayAtt, loading: todayLoading, refetch: refetchToday } = useAPI<Attendance[]>(getTodayAttendance);
  const { data: monthlyAtt, loading: monthlyLoading, refetch: refetchMonthly } = useAPI<Attendance[]>(() => getMonthlyAttendance(month, year), [month, year]);
  const { data: employees } = useAPI<Employee[]>(getEmployees);

  const handleEdit = (att: Attendance) => {
    setEditingId(att.id);
    setEditData({ start_time: att.start_time, end_time: att.end_time, note: att.note });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await updateAttendance(id, editData);
      setEditingId(null);
      refetchToday();
      refetchMonthly();

    } catch (e) { alert('Lỗi cập nhật'); }
    setSaving(false);
  };

  // Monthly summary per employee
  const monthlySummary = useMemo(() => {
    if (!monthlyAtt || !employees) return [];
    return employees.map(emp => {
      const empAtt = monthlyAtt.filter(a => a.employee_id === emp.id);
      let totalH = 0, totalOT = 0, lateDays = 0, absentDays = 0;
      const dailyMap: Record<string, Attendance> = {};
      empAtt.forEach(a => {
        totalH += a.actual_hours;
        totalOT += a.overtime_hours;
        if (a.status === 'late') lateDays++;
        dailyMap[a.date] = a;
      });
      const salary = (totalH * emp.hourly_rate) + (totalOT * emp.hourly_rate * 1.5);
      return { emp, attendance: empAtt, totalH, totalOT, lateDays, days: empAtt.length, salary, dailyMap };
    }).filter(s => s.days > 0 || true);
  }, [monthlyAtt, employees]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const todaySummary = useMemo(() => {
    if (!todayAtt) return { total: 0, late: 0, hours: 0, ot: 0 };
    let hours = 0, ot = 0, late = 0;
    todayAtt.forEach(a => { hours += a.actual_hours; ot += a.overtime_hours; if (a.status === 'late') late++; });
    return { total: todayAtt.length, late, hours, ot };
  }, [todayAtt]);

  return (
    <div>
      {/* Tabs */}
      <div className="admin-tabs">
        {(['today', 'monthly'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`admin-tab ${activeTab === tab ? 'active' : ''}`}>
            {tab === 'today' ? '📋 Hôm nay' : '📊 Bảng công tháng'}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === 'today' && (
        <div className="admin-card">
          {todayLoading ? <div className="admin-skeleton" style={{ height: 200 }} /> : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Tổng NV: </span><strong>{todaySummary.total}</strong></div>
                <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Trễ: </span><strong style={{ color: 'var(--danger)' }}>{todaySummary.late}</strong></div>
                <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Tổng giờ: </span><strong>{formatHours(todaySummary.hours)}</strong></div>
                <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text-muted)' }}>Tổng OT: </span><strong style={{ color: 'var(--warning)' }}>{formatHours(todaySummary.ot)}</strong></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Nhân viên</th><th>Ca</th><th>Giờ vào</th><th>Giờ ra</th><th>Giờ làm</th><th>OT</th><th>TT</th><th>Sửa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAtt?.map((a, i) => (
                      <tr key={`${a.id}-${i}`} style={{ background: a.status === 'late' ? 'rgba(239,68,68,0.05)' : (!a.end_time && a.shift_type === 'custom') ? 'rgba(245,158,11,0.03)' : 'transparent' }}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{a.employee_name}</td>
                        <td>
                          {a.shift_type === 'morning' && <span className="admin-badge" style={{background:'var(--success-bg)',color:'var(--success)'}}>Sáng (3h)</span>}
                          {a.shift_type === 'afternoon' && <span className="admin-badge" style={{background:'var(--warning-bg)',color:'var(--warning)'}}>Chiều (4h)</span>}
                          {a.shift_type === 'fullday' && <span className="admin-badge" style={{background:'var(--brand-light)',color:'var(--brand)'}}>Full (7h)</span>}
                          {a.shift_type === 'custom' && <span className="admin-badge" style={{background:'var(--bg-subtle)',color:'var(--text-sub)'}}>Tùy chọn</span>}
                        </td>
                        <td>{editingId === a.id ? <input className="admin-input" style={{ width: 80, padding: '4px 8px' }} value={editData.start_time || ''} onChange={e => setEditData({...editData, start_time: e.target.value})} /> : a.start_time}</td>
                        <td>{editingId === a.id ? <input className="admin-input" style={{ width: 80, padding: '4px 8px' }} value={editData.end_time || ''} onChange={e => setEditData({...editData, end_time: e.target.value})} /> : (a.end_time || '—')}</td>
                        <td style={{ fontWeight: 600 }}>{formatHours(a.actual_hours)}</td>
                        <td style={{ color: a.overtime_hours > 0 ? '#E76F51' : 'var(--text-muted)' }}>{formatHours(a.overtime_hours)}</td>
                        <td>
                          <span className="admin-badge" style={{
                            background: a.status === 'on_time' ? 'var(--success-bg)' : a.status === 'late' ? 'var(--danger-bg)' : 'var(--bg-subtle)',
                            color: a.status === 'on_time' ? 'var(--success)' : a.status === 'late' ? 'var(--danger)' : 'var(--text-sub)'
                          }}>
                            {a.status === 'on_time' ? '✓' : a.status === 'late' ? 'Trễ' : a.status}
                          </span>
                        </td>
                        <td>
                          {editingId === a.id ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => handleSave(a.id)} disabled={saving} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                {saving ? <Loader2 size={14} className="animate-spin" color="var(--success)" /> : <Save size={14} color="var(--success)" />}
                              </button>
                              <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} color="var(--danger)" /></button>
                            </div>
                          ) : (
                            <button onClick={() => handleEdit(a)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={14} color="var(--text-muted)" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* MONTHLY TAB */}
      {activeTab === 'monthly' && (
        <div className="admin-card">
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <select className="admin-input" style={{ width: 120 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
            </select>
            <select className="admin-input" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {monthlyLoading ? <div className="admin-skeleton" style={{ height: 300 }} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: 'var(--bg-subtle)', zIndex: 2, minWidth: 120 }}>Nhân viên</th>
                    {Array.from({ length: daysInMonth }, (_, i) => (
                      <th key={i} style={{ textAlign: 'center', minWidth: 28, padding: '8px 2px' }}>{i + 1}</th>
                    ))}
                    <th style={{ position: 'sticky', right: 0, background: 'var(--bg-subtle)', zIndex: 2 }}>Ngày</th>
                    <th style={{ position: 'sticky', right: 0, background: 'var(--bg-subtle)', zIndex: 2 }}>Giờ</th>
                    <th style={{ position: 'sticky', right: 0, background: 'var(--bg-subtle)', zIndex: 2 }}>OT</th>
                    <th style={{ position: 'sticky', right: 0, background: 'var(--bg-subtle)', zIndex: 2, color: 'var(--brand)' }}>Lương</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.map(s => (
                    <tr key={s.emp.id}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1, fontWeight: 500 }}>{s.emp.name}</td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
                        const att = s.dailyMap[dateStr];
                        let symbol = '-', color = 'var(--text-main)';
                        if (att) {
                          if (att.status === 'on_time') { 
                            symbol = att.shift_type === 'morning' ? 'S(3)' : att.shift_type === 'afternoon' ? 'C(4)' : att.shift_type === 'fullday' ? 'F(7)' : `?(${att.actual_hours})`; 
                            color = 'var(--success)'; 
                          }
                          else if (att.status === 'late') { 
                            symbol = att.shift_type === 'morning' ? 'S(3)' : att.shift_type === 'afternoon' ? 'C(4)' : att.shift_type === 'fullday' ? 'F(7)' : `?(${att.actual_hours})`; 
                            color = 'var(--danger)'; 
                          }
                          else if (att.status === 'absent') { symbol = '✗'; color = 'var(--text-sub)'; }
                          else if (att.status === 'leave') { symbol = 'P'; color = 'var(--warning)'; }
                        }
                        return (
                          <td key={i}
                            style={{ textAlign: 'center', color, fontWeight: att ? 600 : 400, fontSize: 11, padding: '6px 2px' }}
                            title={att ? `${att.start_time} → ${att.end_time || '?'} | ${formatHours(att.actual_hours)} | ${att.status === 'late' ? 'Đi muộn' : 'Đúng giờ'}` : ''}
                          >
                            {symbol}
                          </td>
                        );
                      })}
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{s.days}</td>
                      <td style={{ textAlign: 'center' }}>{formatHours(s.totalH)}</td>
                      <td style={{ color: 'var(--warning)', textAlign: 'center' }}>{formatHours(s.totalOT)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--brand)', textAlign: 'right' }}>{formatCurrency(s.salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
