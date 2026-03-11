'use client';

import { useState } from 'react';
import { getPendingSchedules, approveSchedule, rejectSchedule, bulkApproveSchedules, getWeekSchedule, getTodayTasks, assignTask, getOrders, getEmployees, useAPI } from '@/lib/api';
import { Schedule, TaskAssignment, ProductionOrder, Employee, SHIFTS, STAGES } from '@/types';
import { getMonday, toDateString } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2, Plus } from 'lucide-react';

export default function SchedulesPage() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'tasks' | 'reports'>('schedules');
  const monday = getMonday(new Date());
  const mondayStr = toDateString(monday);
  const todayStr = toDateString(new Date());

  const { data: pending, refetch: refetchPending } = useAPI<Schedule[]>(getPendingSchedules);
  const { data: weekSchedule } = useAPI<Schedule[]>(() => getWeekSchedule(mondayStr), [mondayStr]);
  const { data: todayTasks, refetch: refetchTasks } = useAPI<TaskAssignment[]>(getTodayTasks);
  const { data: orders } = useAPI<ProductionOrder[]>(getOrders);
  const { data: employees } = useAPI<Employee[]>(getEmployees);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isGeneralTask, setIsGeneralTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ order_id: '', description: '', total_steps: 5, notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async (id: string) => { setApproving(id); try { await approveSchedule(id, 'Admin'); refetchPending(); } catch {} setApproving(null); };
  const handleReject = async (id: string) => { const r = prompt('Lý do từ chối:'); if (!r) return; setApproving(id); try { await rejectSchedule(id, r); refetchPending(); } catch {} setApproving(null); };
  const handleBulkApprove = async () => { if (selectedIds.length === 0) return; setApproving('bulk'); try { await bulkApproveSchedules(selectedIds, 'Admin'); setSelectedIds([]); refetchPending(); } catch {} setApproving(null); };

  const handleAssignTask = async () => {
    if (!isGeneralTask && !taskForm.order_id) { alert('Vui lòng chọn đơn hàng hoặc chọn Việc khác'); return; }
    if (!taskForm.description) { alert('Vui lòng nhập mô tả việc'); return; }
    setSubmitting(true);
    try {
      const finalData = { 
        ...taskForm, 
        order_id: isGeneralTask ? '' : taskForm.order_id,
        total_steps: isGeneralTask ? 0 : Number(taskForm.total_steps) 
      };
      await assignTask(finalData);
      setShowTaskForm(false);
      setTaskForm({ order_id: '', description: '', total_steps: 5, notes: '' });
      setIsGeneralTask(false);
      refetchTasks();
    } catch (e) { alert('Lỗi'); }
    setSubmitting(false);
  };

  const activeOrders = orders?.filter(o => o.status === 'in_progress' || o.status === 'pending') || [];

  return (
    <div>
      <div className="admin-tabs">
        {[
          { id: 'schedules' as const, label: `📅 Duyệt lịch${pending?.length ? ` (${pending.length})` : ''}` },
          { id: 'tasks' as const, label: '📋 Việc cần làm chung' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {/* SCHEDULES TAB */}
      {activeTab === 'schedules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Yêu cầu chờ duyệt</h3>
              {selectedIds.length > 0 && (
                <button onClick={handleBulkApprove} disabled={approving === 'bulk'} className="admin-btn admin-btn-accent" style={{ fontSize: 13 }}>
                  {approving === 'bulk' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Duyệt {selectedIds.length} đã chọn
                </button>
              )}
            </div>
            {(!pending || pending.length === 0) ? <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Không có yêu cầu chờ duyệt 🎉</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pending.map((s, idx) => (
                  <div key={`${s.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', background: 'var(--bg-input)', borderRadius: 10 }}>
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={e => {
                      setSelectedIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(i => i !== s.id));
                    }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{s.employee_name}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 13 }}>
                        {new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })} —{' '}
                        {s.shift === 'morning' ? '🌅 Sáng' : s.shift === 'afternoon' ? '☀️ Chiều' : '🌙 Tối'}
                      </span>
                      {s.note && <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>({s.note})</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleApprove(s.id)} disabled={approving === s.id} style={{ background: 'var(--success-bg)', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                        {approving === s.id ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--success)' }} /> : <CheckCircle2 size={16} color="var(--success)" />}
                      </button>
                      <button onClick={() => handleReject(s.id)} style={{ background: 'var(--danger-bg)', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>
                        <XCircle size={16} color="var(--danger)" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Week overview grid */}
          <div className="admin-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Lịch tuần tổng quan</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 100 }}>Ngày</th>
                    {SHIFTS.map(s => (
                      <th key={s.id} style={{ textAlign: 'center', color: s.color }}>{s.icon} {s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date(monday); 
                    date.setDate(monday.getDate() + i);
                    const d = toDateString(date);
                    const dayLabels = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'];
                    
                    return (
                      <tr key={d}>
                        <td style={{ fontWeight: 600 }}>
                          {dayLabels[i]}<br/>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{date.getDate()}/{date.getMonth()+1}</span>
                        </td>
                        {SHIFTS.map(shift => {
                          const scheds = weekSchedule?.filter(s => s.date === d && s.shift === shift.id && s.status === 'approved') || [];
                          return (
                            <td key={shift.id} style={{ verticalAlign: 'top', minWidth: 140 }}>
                              {scheds.length === 0 ? <span style={{ color: 'var(--border)', fontSize: 12 }}>—</span> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {scheds.map((s, si) => (
                                    <div key={`${s.id}-${si}`} style={{ fontSize: 13, background: `${shift.color}10`, borderLeft: `3px solid ${shift.color}`, padding: '4px 8px', borderRadius: '0 6px 6px 0' }}>
                                      {s.employee_name} {s.note && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({s.note})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={() => setShowTaskForm(!showTaskForm)} className="admin-btn admin-btn-primary"><Plus size={16} /> Tạo việc mới</button>

          {showTaskForm && (
            <div className="admin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Giao việc chung</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--brand)' }}>
                  <input type="checkbox" checked={isGeneralTask} onChange={e => setIsGeneralTask(e.target.checked)} style={{ width: 16, height: 16 }} />
                  🧹 Việc khác (không theo đơn)
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {!isGeneralTask && (
                  <>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Đơn hàng (Bắt buộc)</label>
                      <select className="admin-input" value={taskForm.order_id} onChange={e => setTaskForm({...taskForm, order_id: e.target.value})}>
                        <option value="">-- Chọn đơn --</option>
                        {activeOrders.map(o => <option key={o.id} value={o.id}>{o.order_code} — {o.product_line_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Số sản phẩm cần làm</label>
                      <input type="number" className="admin-input" placeholder="300" value={taskForm.total_steps} onChange={e => setTaskForm({...taskForm, total_steps: Number(e.target.value)})} />
                    </div>
                  </>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mô tả việc cần làm</label>
                  <input className="admin-input" placeholder="Ví dụ: Lắp ráp 300 sản phẩm..." value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ghi chú thêm (Không bắt buộc)</label>
                  <input className="admin-input" placeholder="Notes..." value={taskForm.notes} onChange={e => setTaskForm({...taskForm, notes: e.target.value})} />
                </div>
              </div>
              <button onClick={handleAssignTask} disabled={submitting} className="admin-btn admin-btn-primary" style={{ marginTop: 12 }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : '📋'} Phân công
              </button>
            </div>
          )}

          <div className="admin-card">
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Danh sách việc hôm nay</h3>
            <table className="admin-table">
              <thead><tr><th>Đơn hàng</th><th>Mô tả</th><th>Tiến độ</th><th>Sản phẩm</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {(!todayTasks || todayTasks.length === 0) ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có việc nào</td></tr> :
                  todayTasks.map((t, i) => {
                    const isAuto = t.notes?.includes('Tự động tạo từ đơn');
                    return (
                    <tr key={`${t.id}-${i}`}>
                      <td style={{ fontWeight: 500 }}>
                        {t.order_code || '—'}
                        {isAuto && (
                          <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 9, background: 'var(--brand-light)', color: 'var(--brand)', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                            Tự động
                          </span>
                        )}
                      </td>
                      <td>{t.description}</td>
                      <td>{t.quantity_done > 0 && t.total_steps > 0 ? Math.round((t.quantity_done / t.total_steps) * 100) : 0}%</td>
                      <td>{t.quantity_done} / {t.total_steps}</td>
                      <td>
                        <span className="admin-badge" style={{
                          background: (t.status === '5' || t.status === 'completed') ? 'var(--success-bg)' : (t.status === '1' || t.status === 'open') ? 'var(--bg-subtle)' : 'var(--warning-bg)',
                          color: (t.status === '5' || t.status === 'completed') ? 'var(--success)' : (t.status === '1' || t.status === 'open') ? 'var(--text-sub)' : 'var(--warning)'
                        }}>
                          {['open', 'in_progress', 'completed'].includes(t.status) ? 
                            (t.status === 'completed' ? '✅ Xong' : t.status === 'in_progress' ? '⏳ Đang làm' : '○ Giao') :
                            `${STAGES.find(s => String(s.number) === t.status)?.icon || '⏳'} ${STAGES.find(s => String(s.number) === t.status)?.name || 'Chờ'}`
                          }
                        </span>
                      </td>
                    </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
