'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { getOrders, updateOrderStage, addOrderProgress, getProductLines, useAPI } from '@/lib/api';
import { ProductionOrder, ProductLine, PRIORITIES } from '@/types';
import { getDayOfWeekVN, formatDateVN } from '@/lib/utils';
import { Loader2, Plus, Check, ChevronDown, ChevronUp, Package, MoveRight, MoveLeft } from 'lucide-react';

const ORDER_PIPELINE = [
  { id: 'new', name: 'Chờ', icon: '⏳', color: '#64748b' },
  { id: 'manufacturing', name: 'Sản xuất', icon: '🏭', color: '#3b82f6' },
  { id: 'producing', name: 'Đang sản xuất', icon: '🔄', color: '#f59e0b' },
  { id: 'done', name: 'Hoàn thành', icon: '✅', color: '#10b981' },
];

export default function TasksPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: orders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useAPI<ProductionOrder[]>(getOrders);
  const { data: productLines } = useAPI<ProductLine[]>(getProductLines);
  
  const loading = ordersLoading;
  const errorMsg = ordersError;

  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{ order: ProductionOrder } | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [noteVal, setNoteVal] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const today = new Date();

  // Sort and filter active vs completed orders
  const { activeOrders, completedOrders } = useMemo(() => {
    if (!orders) return { activeOrders: [], completedOrders: [] };
    const active: ProductionOrder[] = [];
    const done: ProductionOrder[] = [];
    
    // Sort orders by deadline and priority
    const PRIORITY_SCORE: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    
    const sortedOrders = [...orders].sort((a, b) => {
      const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      
      if (deadlineA !== deadlineB) return deadlineA - deadlineB;
      
      const prioA = PRIORITY_SCORE[a.priority || 'medium'] || 0;
      const prioB = PRIORITY_SCORE[b.priority || 'medium'] || 0;
      return prioB - prioA;
    });

    sortedOrders.forEach(o => {
      if (o.status === 'completed' || o.status === 'cancelled') done.push(o);
      else active.push(o);
    });
    return { activeOrders: active, completedOrders: done };
  }, [orders]);

  const handleStage = async (orderId: string, newStage: number) => {
    if (newStage < 1 || newStage > 5) return;
    setUpdating(`stage-${orderId}`);
    try {
      await updateOrderStage(orderId, newStage);
      await refetchOrders();
    } catch (e) {
      alert('Lỗi khi chuyển trạng thái: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
    setUpdating(null);
  };

  const handleAddProgress = async () => {
    if (!activeModal) return;
    const qty = Number(inputVal);
    if (isNaN(qty) || qty <= 0) {
      alert('Vui lòng nhập số lượng hợp lệ lớn hơn 0');
      return;
    }
    setUpdating('modal');
    try {
      await addOrderProgress(activeModal.order.id, id, qty, noteVal);
      setActiveModal(null);
      await refetchOrders();
      alert('Đã ghi nhận báo cáo thành công!');
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setUpdating(null);
    }
  };

  const openProgressModal = (order: ProductionOrder) => {
    setActiveModal({ order });
    setInputVal('');
    setNoteVal('');
  };

  const renderOrderCard = (order: ProductionOrder, isCompleted: boolean = false) => {
    const isExpanded = expandedOrderId === order.id;
    const pl = productLines?.find(p => p.id === order.product_line_id);
    const daysLeft = Math.ceil((new Date(order.deadline).getTime() - Date.now()) / 86400000);
    const isUrgent = daysLeft <= 3;
    const pri = PRIORITIES.find(p => p.id === order.priority);
    
    // Determine the current stage from ORDER_PIPELINE
    let stageObj = ORDER_PIPELINE[0];
    if (order.current_stage === 2) stageObj = ORDER_PIPELINE[1];
    else if (order.current_stage >= 3 && order.current_stage < 5) stageObj = ORDER_PIPELINE[2];
    else if (order.current_stage >= 5 || isCompleted) stageObj = ORDER_PIPELINE[3];

    return (
      <div key={order.id} className={`card ${isExpanded ? 'card-active' : ''}`} style={{ padding: 0, overflow: 'hidden', border: isCompleted ? '1.5px solid var(--success)' : undefined, opacity: isCompleted ? 0.9 : 1 }}>
        <div onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{pl?.icon || '📦'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>
              {pl?.name || order.product_line_name}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{order.order_code}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>SL: {order.quantity}</span>
              
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                background: isCompleted ? 'var(--success-bg)' : `${stageObj.color}20`,
                color: isCompleted ? 'var(--success)' : stageObj.color,
              }}>
                {stageObj.icon} {stageObj.name}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              {pri && <span className="badge" style={{ background: `${pri.color}15`, color: pri.color, padding: '2px 6px', fontSize: 10 }}>{pri.label}</span>}
              <span style={{ fontSize: 11, color: isUrgent && !isCompleted ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isUrgent && !isCompleted ? 600 : 400 }}>
                 Hạn: {order.deadline}
              </span>
            </div>
          </div>
          {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
        </div>

        {isExpanded && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 12, animation: 'slideDown 0.2s ease-out' }}>
            {/* Stage Actions */}
            {!isCompleted && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {order.current_stage < 3 ? (
                  <button
                    disabled={updating === `stage-${order.id}`}
                    onClick={() => handleStage(order.id, 3)} // Move straight to "Đang sản xuất"
                    style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid var(--brand)', background: 'var(--brand-light)', color: 'var(--brand)', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Package size={16} /> Bắt đầu Sản Xuất
                  </button>
                ) : (
                  <button
                    disabled={updating === `stage-${order.id}`}
                    onClick={() => {
                       if (window.confirm('Bạn có chắc chắn muốn Hoàn thành đơn hàng này?')) {
                         handleStage(order.id, 5); // Move to "Hoàn thành"
                       }
                    }}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: 'var(--success)', color: 'white', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Check size={16} /> Hoàn Thành Đơn
                  </button>
                )}
              </div>
            )}

            {/* General Description/Notes */}
            {order.notes && (
              <div style={{ padding: 10, background: 'var(--bg-input)', borderRadius: 8, fontSize: 12, color: 'var(--text-sub)', marginBottom: 12 }}>
                <strong>Ghi chú đơn:</strong>
                <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{order.notes}</p>
              </div>
            )}

            {/* Report button */}
            {!isCompleted && (
              <button
                onClick={() => openProgressModal(order)}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: 'var(--brand)', color: 'white', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <Plus size={16} /> Báo Cáo Tiến Độ Lên Đơn
              </button>
            )}

            {isCompleted && (
              <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                ✅ Đơn hàng đã hoàn tất
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📦 Đơn Hàng</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: 14, margin: '4px 0 0' }}>{getDayOfWeekVN(today)}, {formatDateVN(today)}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Xem và tự cập nhật tiến độ các đơn hàng đang triển khai.</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: 16, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 12, fontSize: 13, fontWeight: 500 }}>
          ⚠️ Lỗi kết nối dữ liệu: {errorMsg}. (Vui lòng kiểm tra lại Google Apps Script đã deploy đúng bản mới nhất chưa)
        </div>
      )}

      {!loading && !errorMsg && activeOrders.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}><Package size={48} color="var(--border)" /></div>
          <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Không có Đơn Hàng</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Mọi đơn hàng đều đã hoàn thành hoặc chưa có đơn.</p>
        </div>
      )}

      {!loading && activeOrders.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            📌 Đơn đang làm
            <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 8px', borderRadius: 6 }}>
              {activeOrders.length} đơn
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeOrders.map(o => renderOrderCard(o, false))}
          </div>
        </div>
      )}

      {!loading && completedOrders.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            style={{
              fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 8, width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--success-bg)', border: 'none', cursor: 'pointer', padding: '12px 16px', borderRadius: 12, fontFamily: 'inherit',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              ✅ Đơn đã xong
              <span style={{ fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.5)', color: 'var(--success)', padding: '2px 8px', borderRadius: 6 }}>
                {completedOrders.length}
              </span>
            </div>
            {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showCompleted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {completedOrders.slice(0, 10).map(o => renderOrderCard(o, true))}
            </div>
          )}
        </div>
      )}

      {/* ========== ADD PROGRESS MODAL ========== */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-card" style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px 32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 -8px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                 <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--text-main)' }}>Báo cáo tiến độ</h3>
                 <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-sub)' }}>{activeModal.order.order_code} - {activeModal.order.product_line_name}</p>
              </div>
              <button onClick={() => setActiveModal(null)} style={{ background: 'var(--bg-subtle)', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-main)' }}>Số lượng bạn vừa làm xong</label>
              <input
                type="number"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Ví dụ: 100"
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 16, outline: 'none' }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-main)' }}>Ghi chú (như thiếu tem, lỗi nắp...)</label>
              <input
                type="text"
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                placeholder="VD: Chờ sấy khô..."
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 16, outline: 'none' }}
              />
            </div>
            <button
              onClick={handleAddProgress}
              disabled={updating === 'modal'}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--brand)', color: 'white', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: updating === 'modal' ? 0.7 : 1, fontFamily: 'inherit' }}
            >
              {updating === 'modal' ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />} Lưu Tiến Độ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
