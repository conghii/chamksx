'use client';

import { useState, useMemo } from 'react';
import { getOrders, getProductLines, addOrderWithTasks, updateOrderStage, updateOrderStatus, getTaskHistory, useAPI } from '@/lib/api';
import { ProductionOrder, ProductLine, TaskAssignment, STAGES, PRIORITIES } from '@/types';
import { Loader2, Plus, ChevronLeft, ChevronRight, X, Package, AlertTriangle, Eye } from 'lucide-react';

// Order-level pipeline statuses
const ORDER_PIPELINE = [
  { id: 'new', name: 'Mới tạo', icon: '📋', color: 'var(--text-sub)' },
  { id: 'producing', name: 'Đang sản xuất', icon: '🏭', color: 'var(--warning)' },
  { id: 'almost', name: 'Gần xong', icon: '📊', color: 'var(--brand)' },
  { id: 'done', name: 'Hoàn thành', icon: '✅', color: 'var(--success)' },
];

// Checklist stages for auto-task creation (skip "Chờ")
const TASK_STAGES = STAGES.filter(s => s.number >= 2);

export default function ProductionPage() {
  const { data: orders, loading, refetch } = useAPI<ProductionOrder[]>(getOrders);
  const { data: productLines } = useAPI<ProductLine[]>(getProductLines);

  // State for create order flow
  const [showNew, setShowNew] = useState(false);
  const [createStep, setCreateStep] = useState(1); // 1 = order info, 2 = tasks
  const [newOrder, setNewOrder] = useState({
    product_line_id: '', quantity: '', deadline: '', priority: 'medium', notes: '',
  });
  const [autoTasks, setAutoTasks] = useState(true);
  const [taskDefs, setTaskDefs] = useState(
    TASK_STAGES.map(s => ({ number: s.number, name: s.name, icon: s.icon, enabled: true, quantity: '' }))
  );
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // State for detail panel
  const [detailOrder, setDetailOrder] = useState<ProductionOrder | null>(null);
  const [detailTasks, setDetailTasks] = useState<TaskAssignment[]>([]);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);

  // State for quick-create tasks on existing order
  const [quickTaskOrder, setQuickTaskOrder] = useState<ProductionOrder | null>(null);

  const activeOrders = orders?.filter(o => o.status !== 'cancelled') || [];

  // Compute order-level pipeline status from tasks
  const getOrderPipelineStatus = (order: ProductionOrder): string => {
    if (order.status === 'completed') return 'done';
    if (order.status === 'pending' && order.current_stage <= 1) return 'new';
    // Use current_stage as a proxy for progress
    const progress = order.current_stage / order.total_stages;
    if (progress >= 1) return 'done';
    if (progress > 0.8) return 'almost';
    if (progress > 0 || order.status === 'in_progress') return 'producing';
    return 'new';
  };

  // Group orders by pipeline status
  const pipelineGroups = useMemo(() => {
    const groups: Record<string, ProductionOrder[]> = { new: [], producing: [], almost: [], done: [] };
    activeOrders.forEach(o => {
      const status = getOrderPipelineStatus(o);
      groups[status]?.push(o);
    });
    return groups;
  }, [activeOrders]);

  const handleStage = async (id: string, newStage: number) => {
    setUpdatingStage(id);
    try { await updateOrderStage(id, newStage); refetch(); } catch { alert('Lỗi'); }
    setUpdatingStage(null);
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Hoàn thành đơn hàng này?')) return;
    try { await updateOrderStatus(id, 'completed'); refetch(); } catch { alert('Lỗi'); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Hủy đơn hàng này?')) return;
    try { await updateOrderStatus(id, 'cancelled'); refetch(); } catch { alert('Lỗi'); }
  };

  const handleCreate = async () => {
    if (!newOrder.product_line_id || !newOrder.quantity || !newOrder.deadline) {
      alert('Điền đầy đủ thông tin');
      return;
    }
    setSubmitting(true);
    try {
      const pl = productLines?.find(p => p.id === newOrder.product_line_id);
      const data: Record<string, unknown> = {
        product_line_id: newOrder.product_line_id,
        product_line_name: pl?.name || '',
        quantity: Number(newOrder.quantity),
        deadline: newOrder.deadline,
        priority: newOrder.priority,
        notes: newOrder.notes,
      };

      if (autoTasks) {
        data.tasks = taskDefs.map(td => ({
          enabled: td.enabled,
          name: `${td.icon} ${td.name}`,
          description: td.name,
          quantity: Number(td.quantity) || Number(newOrder.quantity),
        }));
        data.assigned_date = assignedDate;
      }

      const result = await addOrderWithTasks(data);

      setShowNew(false);
      setCreateStep(1);
      setNewOrder({ product_line_id: '', quantity: '', deadline: '', priority: 'medium', notes: '' });
      setTaskDefs(TASK_STAGES.map(s => ({ number: s.number, name: s.name, icon: s.icon, enabled: true, quantity: '' })));
      refetch();

      const tasksMsg = result.tasks_created > 0 ? ` và ${result.tasks_created} việc` : '';
      alert(`✅ Đã tạo đơn ${result.order_code}${tasksMsg}`);
    } catch (e) {
      alert('Lỗi: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
    setSubmitting(false);
  };

  const openDetail = async (order: ProductionOrder) => {
    setDetailOrder(order);
    try {
      const history = await getTaskHistory(order.id);
      setDetailTasks(history);
    } catch {}
  };

  // Get task completion stats for an order using current_stage as proxy
  const getOrderTaskSummary = (order: ProductionOrder) => {
    const done = Math.max(0, order.current_stage - 1);
    const total = TASK_STAGES.length;
    return { done: Math.min(done, total), total };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ========== PIPELINE OVERVIEW ========== */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>🏭 Tiến độ đơn hàng</h3>
          <button onClick={() => { setShowNew(true); setCreateStep(1); }} className="admin-btn admin-btn-primary"><Plus size={16} /> Tạo đơn mới</button>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {ORDER_PIPELINE.map((p, i) => {
            const count = pipelineGroups[p.id]?.length || 0;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 4 }}>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10,
                  background: count > 0 ? `${p.color}10` : 'var(--bg-input)',
                  border: `1px solid ${count > 0 ? p.color : 'var(--border)'}`,
                }}>
                  <div style={{ fontSize: 18 }}>{p.icon}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: count > 0 ? p.color : 'var(--text-muted)' }}>{count}</div>
                </div>
                {i < 3 && <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========== CREATE ORDER MODAL (2-step) ========== */}
      {showNew && (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              {createStep === 1 ? '📦 Bước 1: Thông tin đơn hàng' : '📋 Bước 2: Tạo việc cho đơn'}
            </h3>
            <button onClick={() => { setShowNew(false); setCreateStep(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-muted)" /></button>
          </div>

          {/* Step 1: Order info */}
          {createStep === 1 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Dòng sản phẩm *</label>
                  <select className="admin-input" value={newOrder.product_line_id} onChange={e => setNewOrder({...newOrder, product_line_id: e.target.value})}>
                    <option value="">Chọn SP</option>
                    {productLines?.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Số lượng *</label>
                  <input type="number" className="admin-input" placeholder="500" value={newOrder.quantity} onChange={e => setNewOrder({...newOrder, quantity: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Deadline *</label>
                  <input type="date" className="admin-input" value={newOrder.deadline} onChange={e => setNewOrder({...newOrder, deadline: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ưu tiên</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {PRIORITIES.map(p => (
                      <button key={p.id} onClick={() => setNewOrder({...newOrder, priority: p.id})}
                        style={{
                          flex: 1, padding: '6px', borderRadius: 8, border: `1.5px solid ${newOrder.priority === p.id ? p.color : 'var(--border)'}`,
                          background: newOrder.priority === p.id ? `${p.color}15` : 'transparent', color: newOrder.priority === p.id ? p.color : 'var(--text-muted)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer'
                        }}
                      >{p.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ghi chú</label>
                <input className="admin-input" placeholder="Ghi chú..." value={newOrder.notes} onChange={e => setNewOrder({...newOrder, notes: e.target.value})} />
              </div>
              <button
                onClick={() => {
                  if (!newOrder.product_line_id || !newOrder.quantity || !newOrder.deadline) { alert('Điền đầy đủ thông tin'); return; }
                  setCreateStep(2);
                  // Reset task quantities to match order quantity
                  setTaskDefs(TASK_STAGES.map(s => ({ number: s.number, name: s.name, icon: s.icon, enabled: true, quantity: newOrder.quantity })));
                }}
                className="admin-btn admin-btn-primary" style={{ marginTop: 12 }}
              >
                Tiếp theo →
              </button>
            </>
          )}

          {/* Step 2: Auto-create tasks */}
          {createStep === 2 && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={autoTasks} onChange={e => setAutoTasks(e.target.checked)} style={{ width: 18, height: 18 }} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Tạo tasks tự động từ quy trình sản xuất</span>
              </label>

              {autoTasks && (
                <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Tasks sẽ được tạo:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {taskDefs.map((td, i) => (
                      <div key={td.number} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={td.enabled}
                          onChange={e => {
                            const arr = [...taskDefs];
                            arr[i] = { ...arr[i], enabled: e.target.checked };
                            setTaskDefs(arr);
                          }}
                          style={{ width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 500, minWidth: 100, color: td.enabled ? 'var(--text)' : 'var(--text-muted)' }}>
                          {td.icon} {td.name}
                        </span>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>SL mục tiêu</label>
                          <input
                            type="number"
                            className="admin-input"
                            value={td.quantity}
                            onChange={e => {
                              const arr = [...taskDefs];
                              arr[i] = { ...arr[i], quantity: e.target.value };
                              setTaskDefs(arr);
                            }}
                            disabled={!td.enabled}
                            style={{ opacity: td.enabled ? 1 : 0.4 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ngày giao việc</label>
                    <input type="date" className="admin-input" value={assignedDate} onChange={e => setAssignedDate(e.target.value)} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                    Bạn có thể bỏ tick bước chưa cần, hoặc sửa số lượng mục tiêu cho từng bước.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCreateStep(1)} className="admin-btn" style={{ flex: 1, justifyContent: 'center' }}>
                  ← Quay lại
                </button>
                <button onClick={handleCreate} disabled={submitting} className="admin-btn admin-btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
                  {autoTasks ? `Tạo đơn + ${taskDefs.filter(t => t.enabled).length} việc` : 'Tạo đơn hàng'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== KANBAN ========== */}
      {loading ? <div className="admin-skeleton" style={{ height: 300 }} /> : (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {ORDER_PIPELINE.map(pipelineStatus => {
            const statusOrders = pipelineGroups[pipelineStatus.id] || [];
            return (
              <div key={pipelineStatus.id} className="kanban-col">
                <div style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '10px 10px 0 0', textAlign: 'center', borderBottom: `2px solid ${pipelineStatus.color}` }}>
                  <span style={{ fontSize: 16 }}>{pipelineStatus.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 4 }}>{pipelineStatus.name}</span>
                  <span className="admin-badge" style={{ background: `${pipelineStatus.color}20`, color: pipelineStatus.color, marginLeft: 6 }}>{statusOrders.length}</span>
                </div>
                <div style={{ padding: 4, minHeight: 100 }}>
                  {statusOrders.map((order, idx) => {
                    const pl = productLines?.find(p => p.id === order.product_line_id);
                    const daysLeft = Math.ceil((new Date(order.deadline).getTime() - Date.now()) / 86400000);
                    const isUrgent = daysLeft <= 3;
                    const pri = PRIORITIES.find(p => p.id === order.priority);
                    const taskSummary = getOrderTaskSummary(order);
                    const orderStage = order.current_stage;
                    const isCompleted = pipelineStatus.id === 'done';

                    return (
                      <div key={`${order.id}-${idx}`} className="kanban-card" style={{ border: isCompleted ? '1px solid var(--success)' : undefined }}>
                        <div style={{ fontSize: 12, color: pl?.color || 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                          {pl?.icon} {order.product_line_name}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{order.order_code}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SL: {order.quantity}</div>

                        {/* Task mini icons */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, marginBottom: 4 }}>
                          {TASK_STAGES.map(s => {
                            const isDone = orderStage > s.number;
                            const isCurrent = orderStage === s.number;
                            return (
                              <span key={s.number} style={{
                                fontSize: 10,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                padding: '1px 4px',
                                borderRadius: 4,
                                background: isDone ? 'var(--success-bg)' : isCurrent ? 'var(--warning-bg)' : 'var(--bg-input)',
                                color: isDone ? 'var(--success)' : isCurrent ? 'var(--warning)' : 'var(--text-muted)',
                              }}>
                                {isDone ? '✅' : isCurrent ? '⬤' : '○'} {s.name}
                              </span>
                            );
                          })}
                        </div>

                        {/* Task progress summary */}
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Tasks: {taskSummary.done}/{taskSummary.total} hoàn thành
                        </div>

                        {/* Priority + deadline */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                          <span className="admin-badge" style={{ background: `${pri?.color}20`, color: pri?.color, fontSize: 10 }}>{pri?.label}</span>
                          <span style={{ fontSize: 11, color: isUrgent ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isUrgent ? 600 : 400 }}>
                            {daysLeft > 0 ? `${daysLeft}d` : '⚠️ Quá hạn'}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                          {!isCompleted && (
                            <>
                              <button disabled={order.current_stage <= 1 || updatingStage === order.id}
                                onClick={() => handleStage(order.id, order.current_stage - 1)}
                                style={{ flex: 1, padding: '4px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'Be Vietnam Pro' }}>
                                ← Lùi
                              </button>
                              <button onClick={() => openDetail(order)}
                                style={{ flex: 1, padding: '4px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                <Eye size={11} /> Chi tiết
                              </button>
                              <button disabled={order.current_stage >= 5 || updatingStage === order.id}
                                onClick={() => handleStage(order.id, order.current_stage + 1)}
                                style={{ flex: 1, padding: '4px', borderRadius: 6, border: '1px solid var(--primary)', background: 'var(--brand-light)', color: 'var(--brand)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                {updatingStage === order.id ? '...' : 'Tiến →'}
                              </button>
                            </>
                          )}
                          {isCompleted && (
                            <button onClick={() => openDetail(order)}
                              style={{ flex: 1, padding: '4px', borderRadius: 6, border: '1px solid var(--success)', background: 'var(--success-bg)', color: 'var(--success)', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <Eye size={11} /> Xem chi tiết
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== DETAIL PANEL ========== */}
      {detailOrder && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: 420, height: '100vh', background: 'var(--bg-card)', borderLeft: '1px solid var(--border)', zIndex: 60, overflowY: 'auto', padding: 24, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{detailOrder.order_code}</h3>
            <button onClick={() => setDetailOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-muted)" /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, fontSize: 14 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Sản phẩm: </span><strong>{detailOrder.product_line_name}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Số lượng: </span><strong>{detailOrder.quantity}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Deadline: </span><strong>{detailOrder.deadline}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Trạng thái: </span><strong>{ORDER_PIPELINE.find(p => p.id === getOrderPipelineStatus(detailOrder))?.name}</strong></div>
          </div>

          {/* Stage Timeline */}
          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Quy trình sản xuất</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
            {STAGES.map((s, i) => {
              const isDone = s.number < detailOrder.current_stage;
              const isCurrent = s.number === detailOrder.current_stage;
              return (
                <div key={s.number} style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                  {i < STAGES.length - 1 && (
                    <div style={{ position: 'absolute', left: 11, top: 28, bottom: -4, width: 2, background: isDone ? 'var(--success)' : 'var(--border)' }} />
                  )}
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
                    zIndex: 1,
                    background: isDone ? 'var(--success)' : isCurrent ? 'var(--brand)' : 'var(--bg-input)',
                    color: isDone || isCurrent ? 'white' : 'var(--text-muted)',
                  }}>
                    {isDone ? '✓' : s.number}
                  </span>
                  <span style={{ fontSize: 13, color: isDone ? 'var(--success)' : isCurrent ? 'var(--text)' : 'var(--text-muted)', fontWeight: isCurrent ? 600 : 400, padding: '6px 0' }}>
                    {s.icon} {s.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Task History */}
          <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Danh sách việc ({detailTasks.length})</h4>
          {detailTasks.length === 0 && (
            <div style={{ padding: '12px', background: 'var(--warning-bg)', borderRadius: 10, fontSize: 13, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <AlertTriangle size={14} /> Chưa có việc được giao cho đơn này
            </div>
          )}
          {detailTasks.map((t, idx) => {
            const stageInfo = STAGES.find(s => String(s.number) === t.status);
            const isTaskDone = t.status === '5' || t.status === 'completed';
            return (
              <div key={`${t.id}-${idx}`} style={{ fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <strong>{t.description}</strong>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: isTaskDone ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: isTaskDone ? 'var(--success)' : 'var(--warning)',
                    fontWeight: 600,
                  }}>
                    {isTaskDone ? '✅ Xong' : stageInfo ? `${stageInfo.icon} ${stageInfo.name}` : t.status}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {t.quantity_done}/{t.total_steps} SP
                  {t.completed_by && <span> — Hoàn thành bởi {t.completed_by}</span>}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {detailOrder.status !== 'completed' && (
              <button onClick={() => { handleComplete(detailOrder.id); setDetailOrder(null); }} className="admin-btn admin-btn-accent" style={{ flex: 1, justifyContent: 'center' }}>✅ Hoàn thành</button>
            )}
            {detailOrder.status !== 'cancelled' && (
              <button onClick={() => { handleCancel(detailOrder.id); setDetailOrder(null); }} className="admin-btn admin-btn-danger" style={{ flex: 1, justifyContent: 'center' }}>❌ Hủy</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
