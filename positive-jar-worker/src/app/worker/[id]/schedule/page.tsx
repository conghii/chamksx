'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { getEmployeeSchedule, requestSchedule, cancelScheduleRequest, useAPI } from '@/lib/api';
import { Schedule, SHIFTS } from '@/types';
import { getMonday, toDateString, getDayOfWeekVN, formatDateVN } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, Plus, X } from 'lucide-react';

export default function SchedulePage() {
  const params = useParams();
  const id = params.id as string;

  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formDates, setFormDates] = useState<string[]>([]);
  const [formShift, setFormShift] = useState('morning');
  const [formNote, setFormNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const monday = useMemo(() => {
    const m = getMonday(new Date());
    m.setDate(m.getDate() + weekOffset * 7);
    return m;
  }, [weekOffset]);

  const startDate = toDateString(monday);
  const { data: schedules, loading, refetch } = useAPI<Schedule[]>(() => getEmployeeSchedule(id, startDate), [id, startDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [monday]);

  const handleSubmit = async () => {
    if (formDates.length === 0 || !formShift) return;
    setSubmitting(true);
    try {
      await Promise.all(formDates.map(date => requestSchedule(id, date, formShift, formNote)));
      setShowForm(false);
      setFormDates([]);
      setFormNote('');
      await refetch();
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (scheduleId: string) => {
    if (!confirm('Bạn muốn hủy đăng ký này?')) return;
    setCancelling(scheduleId);
    try {
      await cancelScheduleRequest(scheduleId);
      await refetch();
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setCancelling(null);
    }
  };

  const allSchedules = schedules || [];
  const pendingList = allSchedules.filter(s => s.status === 'pending');
  const approvedList = allSchedules.filter(s => s.status === 'approved');
  const rejectedList = allSchedules.filter(s => s.status === 'rejected');

  const tabData = { pending: pendingList, approved: approvedList, rejected: rejectedList };
  const tabLabels = { pending: `Chờ duyệt (${pendingList.length})`, approved: `Đã duyệt (${approvedList.length})`, rejected: `Từ chối (${rejectedList.length})` };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📅 Đăng ký lịch làm việc</h1>

      {/* Week Navigator */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {formatDateVN(weekDays[0])} — {formatDateVN(weekDays[6])}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week Grid */}
        <div style={{ display: 'flex', gap: 4 }}>
          {weekDays.map((day, idx) => {
            const dayStr = toDateString(day);
            const isToday = dayStr === toDateString(new Date());
            const dayLabels = ['T2','T3','T4','T5','T6','T7','CN'];
            const daySchedules = allSchedules.filter(s => s.date === dayStr);

            return (
              <div key={idx} style={{
                flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: 10,
                background: isToday ? 'var(--brand-light)' : 'transparent',
                border: isToday ? '1.5px solid var(--brand)' : '1.5px solid transparent',
                cursor: 'pointer'
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: isToday ? 'var(--brand)' : 'var(--text-muted)', margin: 0 }}>{dayLabels[idx]}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 4px' }}>{day.getDate()}/{day.getMonth()+1}</p>
                {daySchedules.map((s, si) => {
                  const shift = SHIFTS.find(sh => sh.id === s.shift);
                  const isApproved = s.status === 'approved';
                  const isPending = s.status === 'pending';
                  return (
                    <div key={`${s.id}-${si}`} style={{
                      background: isApproved ? shift?.color : 'transparent',
                      color: isApproved ? 'white' : shift?.color,
                      border: isPending ? `1.5px dashed ${shift?.color}` : 'none',
                      fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '1px 0', margin: '1px 0'
                    }}>
                      {s.shift === 'morning' ? 'S' : s.shift === 'afternoon' ? 'C' : s.shift === 'fullday' ? 'F' : 'T'}
                    </div>
                  );
                })}
                {daySchedules.length === 0 && <div style={{ height: 16 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Register Button */}
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          padding: '12px', borderRadius: 12, border: '2px dashed var(--brand)', background: 'var(--brand-light)',
          color: 'var(--brand)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit'
        }}
      >
        <Plus size={18} /> Đăng ký ca mới
      </button>

      {/* Registration Form */}
      {showForm && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              📝 Đăng ký ca mới
            </h3>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>Chọn ngày (có thể chọn nhiều)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {weekDays.map(day => {
                const dayStr = toDateString(day);
                const isSelected = formDates.includes(dayStr);
                const dayName = getDayOfWeekVN(day);
                return (
                  <div key={dayStr} onClick={() => {
                    if (isSelected) setFormDates(formDates.filter(d => d !== dayStr));
                    else setFormDates([...formDates, dayStr]);
                  }} style={{
                    padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--brand-light)' : 'white'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--brand)' : 'var(--text-main)' }}>
                      {dayName === 'Chủ Nhật' ? 'CN' : dayName.replace('Thứ ', 'T')}
                    </div>
                    <div style={{ fontSize: 11, color: isSelected ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {day.getDate()}/{day.getMonth()+1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>Ca làm</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SHIFTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setFormShift(s.id)}
                  className={`shift-btn ${formShift === s.id ? 'active' : ''}`}
                  style={formShift === s.id ? { borderColor: 'var(--brand)', background: 'var(--brand-light)' } : {}}
                >
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.time}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>Ghi chú</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="VD: Có thể làm cả ngày"
              rows={2}
              style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || formDates.length === 0}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: 'var(--brand)',
              color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : '📤 Gửi đăng ký'}
          </button>
        </div>
      )}

      {/* Schedule Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', borderRadius: 10, padding: 3 }}>
        {(['pending', 'approved', 'rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600,
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? 'var(--text-main)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      {loading ? (
        <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tabData[activeTab].length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 16 }}>Không có đăng ký</p>
          )}
          {tabData[activeTab].map((s, idx) => {
            const shift = SHIFTS.find(sh => sh.id === s.shift);
            return (
              <div key={`${s.id}-${idx}`} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="badge" style={{ background: `${shift?.color}20`, color: shift?.color }}>
                      {shift?.icon} {shift?.label}
                    </span>
                  </div>
                  {s.reject_reason && (
                    <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 0 0' }}>Lý do: {s.reject_reason}</p>
                  )}
                  {s.note && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{s.note}</p>}
                </div>
                {s.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(s.id)}
                    disabled={cancelling === s.id}
                    style={{
                      background: 'var(--danger-bg)', border: 'none', borderRadius: 8, padding: '6px 10px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--danger)',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit'
                    }}
                  >
                    {cancelling === s.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Hủy
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
