'use client';

import { useState, useEffect } from 'react';
import { getDashboardStats, getTodayAttendance, getOrders, getPendingSchedules, getTodayTasks, approveSchedule, rejectSchedule, useAPI } from '@/lib/api';
import { DashboardStats, Attendance, ProductionOrder, Schedule, TaskAssignment, STAGES } from '@/types';
import { formatHours, toDateString } from '@/lib/utils';
import { Users, Clock, Calendar, Factory, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const todayStr = toDateString(new Date());
  const { data: stats, loading: statsLoading } = useAPI<DashboardStats>(getDashboardStats);
  const { data: todayAtt } = useAPI<Attendance[]>(getTodayAttendance);
  const { data: orders } = useAPI<ProductionOrder[]>(getOrders);
  const { data: pending, refetch: refetchPending } = useAPI<Schedule[]>(getPendingSchedules);
  const { data: todayTasks } = useAPI<TaskAssignment[]>(getTodayTasks);
  const [approving, setApproving] = useState<string | null>(null);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => { /* refetch would go here */ }, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeOrders = orders?.filter(o => o.status === 'in_progress' || o.status === 'pending')
    .sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5) || [];
  const issueTasks = todayTasks?.filter(t => t.notes && t.notes.trim() !== '') || [];

  const handleApprove = async (id: string) => {
    setApproving(id);
    try { await approveSchedule(id, 'Admin'); await refetchPending(); } catch (e) { alert('Lỗi'); }
    setApproving(null);
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Lý do từ chối:');
    if (!reason) return;
    setApproving(id);
    try { await rejectSchedule(id, reason); await refetchPending(); } catch (e) { alert('Lỗi'); }
    setApproving(null);
  };

  const statCards = [
    { label: 'Nhân sự hôm nay', value: `${stats?.employees_today || 0}/${stats?.total_employees || 0}`, icon: Users, color: stats && stats.employees_today >= stats.total_employees * 0.8 ? 'var(--success)' : 'var(--warning)', desc: 'đã check-in' },
    { label: 'Tổng giờ hôm nay', value: formatHours(stats?.total_work_hours_today || 0), icon: Clock, color: 'var(--text-main)', desc: `OT: ${formatHours(stats?.total_overtime_today || 0)}` },
    { label: 'Lịch chờ duyệt', value: String(stats?.pending_schedules || 0), icon: Calendar, color: (stats?.pending_schedules || 0) > 0 ? 'var(--warning)' : 'var(--text-sub)', desc: 'yêu cầu' },
    { label: 'Đơn sản xuất', value: String(stats?.active_orders || 0), icon: Factory, color: 'var(--brand)', desc: `${stats?.orders_near_deadline || 0} sắp trễ` },
    { label: 'Vấn đề hôm nay', value: String(stats?.issues_today || 0), icon: AlertTriangle, color: (stats?.issues_today || 0) > 0 ? 'var(--danger)' : 'var(--text-sub)', desc: 'báo cáo có issues' },
  ];

  if (statsLoading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
      {[1,2,3,4,5].map(i => <div key={i} className="admin-skeleton" style={{ height: 100 }} />)}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.label}</span>
                <Icon size={18} color={s.color} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Who's working today */}
          <div className="admin-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>👥 Ai đang làm hôm nay</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Ca</th>
                  <th>Giờ vào</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(!todayAtt || todayAtt.length === 0) && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Chưa có ai check-in</td></tr>
                )}
                {todayAtt?.map((a, idx) => (
                  <tr key={`${a.id}-${idx}`}>
                    <td style={{ fontWeight: 500 }}>{a.employee_name}</td>
                    <td>{a.shift_type === 'morning' ? '🌅 Sáng' : a.shift_type === 'afternoon' ? '☀️ Chiều' : a.shift_type === 'fullday' ? '☀️ Cả ngày' : '⏱️ Tùy chọn'}</td>
                    <td>{a.start_time}</td>
                    <td>
                      <span className="admin-badge" style={{
                        background: !a.end_time ? 'var(--warning-bg)' : 'var(--success-bg)',
                        color: !a.end_time ? 'var(--warning)' : 'var(--success)'
                      }}>
                        {!a.end_time ? '⏳ Đang làm' : '✅ Xong'}
                      </span>
                      {a.status === 'late' && (
                        <span className="admin-badge" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', marginLeft: 4 }}>Trễ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Production Progress */}
          <div className="admin-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>🏭 Tiến độ sản xuất</h3>
            {activeOrders.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Không có đơn đang chạy</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeOrders.map((o, idx) => {
                const deadlineDate = new Date(o.deadline);
                const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000);
                const isUrgent = daysLeft <= 3;
                return (
                  <div key={`${o.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{o.order_code}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{o.product_line_name}</span>
                      </div>
                      {/* 7-segment progress bar */}
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 7 }, (_, i) => (
                          <div key={i} style={{
                            flex: 1, height: 6, borderRadius: 3,
                            background: i < o.current_stage ? (isUrgent ? 'var(--danger)' : 'var(--brand)') : 'var(--border)'
                          }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, color: isUrgent ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isUrgent ? 600 : 400 }}>
                        {daysLeft > 0 ? `${daysLeft} ngày` : 'Quá hạn!'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pending schedules */}
          <div className="admin-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>📅 Yêu cầu đăng ký lịch</h3>
            {(!pending || pending.length === 0) && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Không có yêu cầu chờ duyệt</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending?.slice(0, 5).map((s, idx) => (
                <div key={`${s.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{s.employee_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>
                      {new Date(s.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} — {s.shift === 'morning' ? 'Sáng' : s.shift === 'afternoon' ? 'Chiều' : 'Tối'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleApprove(s.id)} disabled={approving === s.id}
                      style={{ background: 'var(--success-bg)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                      {approving === s.id ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--success)' }} /> : <CheckCircle2 size={16} color="var(--success)" />}
                    </button>
                    <button onClick={() => handleReject(s.id)}
                      style={{ background: 'var(--danger-bg)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                      <XCircle size={16} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Issues extracted from Task Notes */}
          <div className="admin-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>⚠️ Báo cáo có vấn đề / Ghi chú</h3>
            {issueTasks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Không có ghi chú nào hôm nay 🎉</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {issueTasks.slice(0, 5).map((t, idx) => (
                <div key={`${t.id}-${idx}`} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <AlertTriangle size={14} color="var(--warning)" />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>Phân công: {t.description}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.order_code || 'Việc chung'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.notes}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
