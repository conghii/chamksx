'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getWorkerHomeData, checkIn, useAPI } from '@/lib/api';
import { WorkerHomeData, TaskAssignment, STAGES, SHIFTS } from '@/types';
import { formatCurrency, formatHours, getDayOfWeekVN, formatDateVN, getInitials, getEmployeeTypeColor, getCurrentShift } from '@/lib/utils';
import { ClipboardList, Calendar, ChevronRight, TrendingUp, Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

function RealtimeClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return <span>{time}</span>;
}

export default function WorkerHomePage() {
  const params = useParams();
  const id = params.id as string;
  const { data, loading, error, refetch } = useAPI<WorkerHomeData>(() => getWorkerHomeData(id), [id]);

  const [selectedShift, setSelectedShift] = useState<string>(getCurrentShift());
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customHours, setCustomHours] = useState('');

  const handleSubmitAttendance = async (shiftId?: string) => {
    const shift = shiftId || selectedShift;
    if (shift === 'custom') {
      setShowCustomModal(true);
      return;
    }
    setIsActionLoading(true);
    try {
      await checkIn(id, shift);
      setSubmitted(true);
      await refetch();
    } catch (err) {
      alert('Lỗi gửi chấm công: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitCustom = async () => {
    const hours = parseFloat(customHours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      alert('Vui lòng nhập số giờ hợp lệ (1 - 24)');
      return;
    }
    setIsActionLoading(true);
    setShowCustomModal(false);
    try {
      await checkIn(id, 'custom', hours);
      setSubmitted(true);
      await refetch();
    } catch (err) {
      alert('Lỗi gửi chấm công: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setIsActionLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
    </div>
  );

  if (error || !data) return (
    <div className="card" style={{ textAlign: 'center', padding: 32 }}>
      <p style={{ fontSize: 32 }}>⚠️</p>
      <p style={{ fontWeight: 600, color: 'var(--danger)' }}>Không thể tải dữ liệu</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{error}</p>
    </div>
  );

  const { employee, today_attendance, today_tasks, week_schedule, this_month_summary } = data;
  const today = new Date();

  const alreadySubmitted = submitted || (!!today_attendance?.start_time && today_attendance.start_time.trim() !== '');
  const shiftInfo = SHIFTS.find(s => s.id === (today_attendance?.shift_type || selectedShift));
  const SHIFT_HOURS: Record<string, number> = { morning: 3, afternoon: 4, fullday: 7 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Greeting */}
      <div className="card glass-card" style={{ background: 'linear-gradient(135deg, var(--brand-light) 0%, #FFFFFF 100%)', border: 'none', padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="avatar glow-brand" style={{ background: getEmployeeTypeColor(employee.type), width: 52, height: 52, fontSize: 18 }}>
            {getInitials(employee.name)}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 18, margin: 0, color: 'var(--text-main)' }}>Chào {employee.name.split(' ').pop()}! 👋</p>
            <p style={{ color: 'var(--text-sub)', fontSize: 13, margin: '2px 0 0', fontWeight: 500 }}>
               {getDayOfWeekVN(today)}, {formatDateVN(today)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Attendance Module */}
      <div className="card" style={{ padding: 20 }}>
        {!alreadySubmitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--text)', letterSpacing: -2, lineHeight: 1 }}>
              <RealtimeClock />
            </div>
            
            {/* Shift Selection */}
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', margin: '24px 0 12px' }}>Ca làm việc hôm nay của bạn?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SHIFTS.map(shift => (
                <button
                  key={shift.id}
                  onClick={() => setSelectedShift(shift.id)}
                  className={`shift-btn ${selectedShift === shift.id ? 'active' : ''}`}
                  style={{ 
                    position: 'relative',
                    overflow: 'hidden',
                    borderColor: selectedShift === shift.id ? 'var(--brand)' : 'var(--border)',
                    boxShadow: selectedShift === shift.id ? '0 4px 12px rgba(196,118,78,0.12)' : 'none'
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{shift.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: selectedShift === shift.id ? 'var(--brand-dark)' : 'var(--text-main)' }}>{shift.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-sub)', marginTop: 2 }}>{shift.time}</div>
                </button>
              ))}
            </div>

            <button onClick={() => handleSubmitAttendance()} disabled={isActionLoading} className="btn-action btn-checkin" style={{ marginTop: 16 }}>
              {isActionLoading ? <Loader2 size={24} className="animate-spin" /> : <>📤 GỬI CHẤM CÔNG</>}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--success)' }}>Đã gửi chấm công!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: '0 0 16px' }}>
              Hôm nay bạn đăng ký <strong style={{ color: 'var(--brand)' }}>{shiftInfo?.label || selectedShift}</strong>
              {' '}— <strong>{formatHours(today_attendance?.actual_hours || SHIFT_HOURS[today_attendance?.shift_type || selectedShift] || 0)}</strong>
            </p>
            <div style={{ background: 'var(--success-bg)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Check size={18} color="var(--success)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>Đã ghi nhận thành công</span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Hours Modal */}
      {showCustomModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, animation: 'slideUp 0.3s ease-out' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>⏱️ Nhập giờ làm</h3>
            <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: '0 0 16px' }}>Bạn đã làm bao nhiêu giờ hôm nay?</p>
            <input
              type="number"
              value={customHours}
              onChange={e => setCustomHours(e.target.value)}
              placeholder="Ví dụ: 5.5"
              step="0.5"
              min="0.5"
              max="24"
              autoFocus
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 18, textAlign: 'center', fontWeight: 700, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowCustomModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>
                Huỷ
              </button>
              <button onClick={handleSubmitCustom} disabled={isActionLoading} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'var(--brand)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : '📤 Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Tasks Module */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {today_tasks.length > 0 ? `Danh sách Việc Chung` : 'Chưa có thông báo việc chung'}
            </span>
          </div>
          <Link href={`/worker/${id}/tasks`} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Chi tiết <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </Link>
        </div>
        {today_tasks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {today_tasks.slice(0, 3).map((task, idx) => {
              const taskStatus = task.status;
              const isTaskDone = taskStatus === '5' || taskStatus === 'completed';
              return (
                <div key={`${task.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: idx < 2 ? '1px solid var(--bg-subtle)' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isTaskDone ? 'var(--success-bg)' : 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {isTaskDone ? '✅' : '📌'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.description}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-sub)', margin: '2px 0 0', fontWeight: 500 }}>
                       Đơn: {task.order_code || 'Chung'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isTaskDone ? 'var(--success)' : 'var(--brand)' }}>
                      {task.quantity_done}/{task.total_steps}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Sản phẩm</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, textAlign: 'center', padding: '8px 0' }}>🎉 Không có task nào trong hôm nay</p>
        )}
      </div>

      {/* Week Schedule */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Lịch tuần này</span>
          </div>
          <Link href={`/worker/${id}/schedule`} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Đăng ký <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['T2','T3','T4','T5','T6','T7','CN'].map((day, idx) => {
            const d = new Date();
            const dayOfWeek = d.getDay() || 7;
            const monday = new Date(d);
            monday.setDate(d.getDate() - dayOfWeek + 1 + idx);
            const dateStr = monday.toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const daySchedule = week_schedule.filter(s => s.date === dateStr && s.status === 'approved');

            return (
              <div key={day} style={{
                flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: 10,
                background: isToday ? 'var(--brand-light)' : 'transparent',
                border: isToday ? '1.5px solid var(--brand)' : '1.5px solid transparent'
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: isToday ? 'var(--brand)' : 'var(--text-muted)', margin: 0 }}>{day}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 4px' }}>{monday.getDate()}/{monday.getMonth()+1}</p>
                {daySchedule.length > 0 ? daySchedule.map((s, i) => {
                  const shift = SHIFTS.find(sh => sh.id === s.shift);
                  return (
                    <div key={`${s.id}-${i}`} style={{
                      background: shift?.color, color: 'white', fontSize: 10, fontWeight: 700,
                      borderRadius: 4, padding: '1px 0', margin: '1px 0'
                    }}>
                      {s.shift === 'morning' ? 'S' : s.shift === 'afternoon' ? 'C' : s.shift === 'fullday' ? 'F' : 'T'}
                    </div>
                  );
                }) : <div style={{ height: 16 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Month Summary */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TrendingUp size={18} color="var(--success)" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Tổng kết tháng</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Ngày làm', value: this_month_summary.days_worked.toString(), color: 'var(--brand)' },
            { label: 'Tổng giờ', value: formatHours(this_month_summary.total_hours), color: 'var(--accent)' },
            { label: 'Tổng OT', value: formatHours(this_month_summary.total_overtime), color: 'var(--danger)' },
            { label: 'Dự tính', value: formatCurrency(this_month_summary.estimated_salary), color: 'var(--success)' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg-subtle)', borderRadius: 12, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: item.color, margin: '2px 0 0' }}>{item.value}</p>
            </div>
          ))}
        </div>
        <Link href={`/worker/${id}/stats`} style={{
          display: 'block', textAlign: 'center', color: 'var(--primary)', fontSize: 13,
          fontWeight: 600, textDecoration: 'none', marginTop: 8
        }}>
          Xem chi tiết thống kê →
        </Link>
      </div>
    </div>
  );
}
