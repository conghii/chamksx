'use client';

import { useState } from 'react';
import { getOrders, getProductLines, addOrder, addProductLine, updateProductLine, updateOrderStage, updateOrderStatus, useAPI } from '@/lib/api';
import { ProductionOrder, ProductLine, STAGES, PRIORITIES } from '@/types';
import { Plus, X, Loader2 } from 'lucide-react';

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const { data: productLines, loading: plLoading, refetch: refetchPL } = useAPI<ProductLine[]>(getProductLines);
  const { data: orders, loading: oLoading, refetch: refetchOrders } = useAPI<ProductionOrder[]>(getOrders);
  const [showAddPL, setShowAddPL] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState<ProductLine | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [plForm, setPLForm] = useState({ name: '', icon: '📦', color: 'var(--brand)', amazon_sku_prefix: '' });
  const [orderForm, setOrderForm] = useState({ quantity: '', deadline: '', priority: 'medium', notes: '' });
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'created'>('deadline');

  const handleAddPL = async () => {
    if (!plForm.name) return;
    setSubmitting(true);
    try { await addProductLine(plForm); setShowAddPL(false); setPLForm({ name: '', icon: '📦', color: 'var(--brand)', amazon_sku_prefix: '' }); refetchPL(); } catch (e) { alert('Lỗi'); }
    setSubmitting(false);
  };

  const handleTogglePL = async (pl: ProductLine) => {
    try { await updateProductLine(pl.id, { is_active: !pl.is_active } as unknown as Partial<ProductLine>); refetchPL(); } catch (e) { alert('Lỗi'); }
  };

  const handleAddOrder = async () => {
    if (!showAddOrder || !orderForm.quantity || !orderForm.deadline) return;
    setSubmitting(true);
    try { 
      await addOrder({ 
        product_line_id: showAddOrder.id, 
        quantity: Number(orderForm.quantity), 
        deadline: orderForm.deadline,
        priority: orderForm.priority as ProductionOrder['priority'] 
      }); 
      setShowAddOrder(null); 
      setOrderForm({ quantity: '', deadline: '', priority: 'medium', notes: '' });
      refetchOrders(); 
    } catch (e) { alert('Lỗi'); }
    setSubmitting(false);
  };

  const sortedOrders = [...(orders || [])].sort((a, b) => {
    if (sortBy === 'deadline') return a.deadline.localeCompare(b.deadline);
    if (sortBy === 'priority') { const p = { urgent: 0, high: 1, medium: 2, low: 3 }; return (p[a.priority] || 2) - (p[b.priority] || 2); }
    return b.created_at.localeCompare(a.created_at);
  });

  const icons = ['📦','✨','🙏','🔥','💜','🧘','🌈','💎','🎁','🌸'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>Danh mục Sản phẩm ({productLines?.length || 0})</h2>
        <button onClick={() => setShowAddPL(true)} className="admin-btn admin-btn-primary"><Plus size={16} /> Thêm sản phẩm</button>
      </div>

      {showAddPL && (
        <div className="admin-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Thêm sản phẩm mới</h3>
            <button onClick={() => setShowAddPL(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-muted)" /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tên *</label>
              <input className="admin-input" value={plForm.name} onChange={e => setPLForm({...plForm, name: e.target.value})} placeholder="Positive Jar - ..." />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Icon</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {icons.map(i => (
                  <button key={i} onClick={() => setPLForm({...plForm, icon: i})}
                    style={{ padding: '4px 6px', borderRadius: 6, border: plForm.icon === i ? '2px solid var(--brand)' : '1px solid var(--border)', background: 'transparent', fontSize: 16, cursor: 'pointer' }}
                  >{i}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SKU Prefix</label>
              <input className="admin-input" value={plForm.amazon_sku_prefix} onChange={e => setPLForm({...plForm, amazon_sku_prefix: e.target.value})} placeholder="PJ-XXX" />
            </div>
          </div>
          <button onClick={handleAddPL} disabled={submitting} className="admin-btn admin-btn-primary" style={{ marginTop: 12 }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null} Thêm
          </button>
        </div>
      )}

      {showAddOrder && (
        <div className="admin-card" style={{ marginBottom: 16, borderLeft: `4px solid ${showAddOrder.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
              Sản xuất: {showAddOrder.icon} {showAddOrder.name}
            </h3>
            <button onClick={() => setShowAddOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-muted)" /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Số lượng *</label>
              <input type="number" className="admin-input" value={orderForm.quantity} onChange={e => setOrderForm({...orderForm, quantity: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Deadline *</label>
              <input type="date" className="admin-input" value={orderForm.deadline} onChange={e => setOrderForm({...orderForm, deadline: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Độ ưu tiên</label>
              <select className="admin-input" value={orderForm.priority} onChange={e => setOrderForm({...orderForm, priority: e.target.value})}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAddOrder} disabled={submitting} className="admin-btn admin-btn-primary" style={{ marginTop: 12 }}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null} Bắt đầu
          </button>
        </div>
      )}

      {plLoading ? <div className="admin-skeleton" style={{ height: 400 }} /> : (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Mã SKU</th>
                <th>Đang sản xuất</th>
                <th>Deadline gần nhất</th>
                <th>Tiến độ</th>
                <th>Đã HT (All-time)</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {productLines?.map((pl, idx) => {
                const activeBatchList = orders?.filter(o => o.product_line_id === pl.id && o.status !== 'cancelled' && o.status !== 'completed') || [];
                const orderCount = activeBatchList.length;
                const totalQty = activeBatchList.reduce((sum, o) => sum + o.quantity, 0);
                const allTimeCompleted = orders?.filter(o => o.product_line_id === pl.id && o.status === 'completed').reduce((sum, o) => sum + o.quantity, 0) || 0;
                
                const closestBatch = [...activeBatchList]
                  .filter(o => o.deadline && o.deadline !== 'pending')
                  .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0];
                
                const urgentCount = activeBatchList.filter(o => o.priority === 'urgent' || o.priority === 'high').length;
                const overdueCount = activeBatchList.filter(o => o.deadline && o.deadline !== 'pending' && new Date(o.deadline).getTime() < Date.now()).length;
                
                return (
                  <tr key={`${pl.id}-${idx}`} style={{ opacity: pl.is_active ? 1 : 0.5 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{pl.icon}</span>
                        <span style={{ fontWeight: 600, color: pl.color }}>{pl.name}</span>
                        {!pl.is_active && <span className="admin-badge" style={{ background: 'var(--text-muted)', color: 'white' }}>Ngừng SX</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pl.amazon_sku_prefix || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>
                          <strong style={{ color: orderCount > 0 ? 'var(--brand)' : 'inherit' }}>{orderCount} lô</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> ({totalQty} SP)</span>
                        </span>
                        {urgentCount > 0 && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>⚠️ {urgentCount} lô Gấp</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {closestBatch ? (
                          <span style={{ 
                            fontSize: 13,
                            fontWeight: new Date(closestBatch.deadline).getTime() - Date.now() <= 3*86400000 ? 600 : 400,
                            color: new Date(closestBatch.deadline).getTime() - Date.now() < 0 ? 'var(--danger)' : 
                                   new Date(closestBatch.deadline).getTime() - Date.now() <= 3*86400000 ? 'var(--warning-dark, #D97706)' : 'inherit'
                          }}>
                            {closestBatch.deadline}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 12 }}>Chưa có hạn</span>}
                        {overdueCount > 0 && <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>❗️ {overdueCount} lô trễ hạn</span>}
                      </div>
                    </td>
                    <td>
                      {activeBatchList.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 180 }}>
                          {activeBatchList.map(o => {
                            const stage = STAGES[o.current_stage - 1];
                            return (
                              <div 
                                key={o.id} 
                                title={`Lô ${o.order_code}: ${stage?.name || '?'}`} 
                                style={{ 
                                  padding: '2px 6px', borderRadius: 4, 
                                  background: 'var(--brand-10)', border: '1px solid var(--brand-30)', 
                                  color: 'var(--brand)', fontSize: 11, fontWeight: 600,
                                  display: 'flex', alignItems: 'center', gap: 4,
                                  cursor: 'help'
                                }}
                              >
                                <span>{stage?.icon || '⏱️'}</span>
                                <span>B{o.current_stage}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>}
                    </td>
                    <td><strong>{allTimeCompleted.toLocaleString()}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={() => {
                            setShowAddOrder(pl);
                            setOrderForm({ quantity: '', deadline: '', priority: 'medium', notes: '' });
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} 
                          disabled={!pl.is_active}
                          className="admin-btn admin-btn-primary" 
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          ▶ Sản Xuất
                        </button>
                        <button onClick={() => handleTogglePL(pl)} className="admin-btn admin-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
                          {pl.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
