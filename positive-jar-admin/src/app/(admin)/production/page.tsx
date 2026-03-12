'use client';

import { useState, useMemo } from 'react';
import { getOrders, getProductLines, addOrder, updateOrderStage, updateOrderStatus, getTaskHistory, useAPI } from '@/lib/api';
import { ProductionOrder, ProductLine, TaskAssignment, STAGES, PRIORITIES } from '@/types';
import { Loader2, Plus, ChevronLeft, ChevronRight, ChevronDown, Check, Search, X, Package, AlertTriangle, Eye } from 'lucide-react';

// Order-level pipeline statuses
const ORDER_PIPELINE = [
  { id: 'new', name: 'Chờ', icon: '📋', color: 'var(--text-sub)' },
  { id: 'manufacturing', name: 'Sản xuất', icon: '🏭', color: '#118AB2' }, // custom blue
  { id: 'producing', name: 'Đang sản xuất', icon: '⚙️', color: 'var(--warning)' },
  { id: 'done', name: 'Hoàn thành', icon: '✅', color: 'var(--success)' },
];

export default function ProductionPage() {
  const { data: orders, loading, refetch } = useAPI<ProductionOrder[]>(getOrders);
  const { data: productLines } = useAPI<ProductLine[]>(getProductLines);

  const [showNew, setShowNew] = useState(false);
  const [newOrder, setNewOrder] = useState({
    product_line_id: '', quantity: '', deadline: '', priority: 'medium', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // State for detail panel
  const [detailOrder, setDetailOrder] = useState<ProductionOrder | null>(null);
  const [detailTasks, setDetailTasks] = useState<TaskAssignment[]>([]);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);

  // State for quick-create tasks on existing order
  const [quickTaskOrder, setQuickTaskOrder] = useState<ProductionOrder | null>(null);

  const activeOrders = orders?.filter(o => o.status !== 'cancelled') || [];

  // Compute order-level pipeline status
  const getOrderPipelineStatus = (order: ProductionOrder): string => {
    if (order.status === 'completed' || order.current_stage >= 4) return 'done';
    if (order.current_stage === 3) return 'producing';
    if (order.current_stage === 2) return 'manufacturing';
    return 'new';
  };

  // Group orders by pipeline status
  const pipelineGroups = useMemo(() => {
    const groups: Record<string, ProductionOrder[]> = { new: [], manufacturing: [], producing: [], done: [] };
    activeOrders.forEach(o => {
      const status = getOrderPipelineStatus(o);
      groups[status]?.push(o);
    });
    return groups;
  }, [activeOrders]);

  const handleStage = async (id: string, newStage: number) => {
    if (newStage >= 4) {
      handleComplete(id);
      return;
    }
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
      const data: Partial<ProductionOrder> = {
        product_line_id: newOrder.product_line_id,
        product_line_name: pl?.name || '',
        quantity: Number(newOrder.quantity) as any, // using any because Partial might not map cleanly if quantity was not number, but it is in ProductionOrder type
        deadline: newOrder.deadline,
        priority: newOrder.priority as "medium" | "low" | "high" | "urgent",
        notes: newOrder.notes,
      };

      const result = await addOrder(data);

      setShowNew(false);
      setNewOrder({ product_line_id: '', quantity: '', deadline: '', priority: 'medium', notes: '' });
      setProductSearch('');
      setShowProductDropdown(false);
      refetch();

      alert(`✅ Đã tạo đơn ${result.order_code}`);
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



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ========== PIPELINE OVERVIEW ========== */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>🏭 Tiến độ đơn hàng</h3>
          <button onClick={() => setShowNew(true)} className="admin-btn admin-btn-primary"><Plus size={16} /> Tạo đơn mới</button>
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
              📦 Tạo đơn mới
            </h3>
            <button onClick={() => setShowNew(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-muted)" /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Dòng sản phẩm *</label>
              <div 
                onClick={() => setShowProductDropdown(!showProductDropdown)}
                className="admin-input" 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40, border: showProductDropdown ? '1px solid var(--brand)' : '1px solid var(--border)' }}
              >
                {newOrder.product_line_id ? (
                  <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {productLines?.find(p => p.id === newOrder.product_line_id)?.icon} 
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                      {productLines?.find(p => p.id === newOrder.product_line_id)?.name}
                    </span>
                  </span>
                ) : <span style={{ color: 'var(--text-muted)' }}>Chọn SP...</span>}
                <ChevronDown size={14} color="var(--text-muted)" style={{ transform: showProductDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {showProductDropdown && (
                <>
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} onClick={() => setShowProductDropdown(false)} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, width: '200%', zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Search size={14} color="var(--text-muted)" />
                      <input 
                        autoFocus
                        placeholder="Tìm sản phẩm (tên, mã)..." 
                        value={productSearch} 
                        onChange={e => setProductSearch(e.target.value)} 
                        style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: 13, padding: '4px 0', color: 'var(--text)' }}
                      />
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: 240, padding: 6 }}>
                      {productLines?.filter(p => p.is_active && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.id.toLowerCase().includes(productSearch.toLowerCase()))).map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            setNewOrder({...newOrder, product_line_id: p.id});
                            setShowProductDropdown(false);
                            setProductSearch('');
                          }}
                          style={{ 
                            padding: '10px 12px', cursor: 'pointer', borderRadius: 8, fontSize: 13, 
                            display: 'flex', gap: 10, alignItems: 'center', 
                            background: newOrder.product_line_id === p.id ? 'var(--brand-light)' : 'transparent',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = newOrder.product_line_id === p.id ? 'var(--brand-light)' : 'var(--bg-input)'}
                          onMouseLeave={e => e.currentTarget.style.background = newOrder.product_line_id === p.id ? 'var(--brand-light)' : 'transparent'}
                        >
                          <span style={{ fontSize: 16 }}>{p.icon}</span> 
                          <span style={{ flex: 1, fontWeight: newOrder.product_line_id === p.id ? 600 : 500, color: newOrder.product_line_id === p.id ? 'var(--brand)' : 'var(--text)' }}>{p.name}</span>
                          {newOrder.product_line_id === p.id && <Check size={16} color="var(--brand)" />}
                        </div>
                      ))}
                      {productLines?.filter(p => p.is_active && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.id.toLowerCase().includes(productSearch.toLowerCase()))).length === 0 && (
                        <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                          Không tìm thấy sản phẩm "{productSearch}"
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
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
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowNew(false)} className="admin-btn" style={{ flex: 1, justifyContent: 'center' }}>
              Hủy
            </button>
            <button onClick={handleCreate} disabled={submitting} className="admin-btn admin-btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />}
              Tạo đơn hàng
            </button>
          </div>
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
                    const isCompleted = pipelineStatus.id === 'done';

                    return (
                      <div key={`${order.id}-${idx}`} className="kanban-card" style={{ border: isCompleted ? '1px solid var(--success)' : undefined }}>
                        <div style={{ fontSize: 12, color: pl?.color || 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                          {pl?.icon} {order.product_line_name}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{order.order_code}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SL: {order.quantity}</div>

                        {/* Priority + deadline */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                          <span className="admin-badge" style={{ background: `${pri?.color}20`, color: pri?.color, fontSize: 10 }}>{pri?.label}</span>
                          <span style={{ fontSize: 11, color: isUrgent ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isUrgent ? 600 : 400 }}>
                            Hạn: {order.deadline}
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
                              <button disabled={updatingStage === order.id}
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
