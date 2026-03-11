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
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [plForm, setPLForm] = useState({ name: '', icon: '📦', color: 'var(--brand)', amazon_sku_prefix: '' });
  const [orderForm, setOrderForm] = useState({ product_line_id: '', quantity: '', deadline: '', priority: 'medium', notes: '' });
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
    if (!orderForm.product_line_id || !orderForm.quantity || !orderForm.deadline) return;
    setSubmitting(true);
    try { await addOrder({ ...orderForm, quantity: Number(orderForm.quantity), priority: orderForm.priority as ProductionOrder['priority'] }); setShowAddOrder(false); refetchOrders(); } catch (e) { alert('Lỗi'); }
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
      <div className="admin-tabs">
        <button onClick={() => setActiveTab('products')} className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}>📦 Dòng sản phẩm</button>
        <button onClick={() => setActiveTab('orders')} className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}>📋 Đơn hàng ({orders?.length || 0})</button>
      </div>

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div>
          <button onClick={() => setShowAddPL(true)} className="admin-btn admin-btn-primary" style={{ marginBottom: 16 }}><Plus size={16} /> Thêm dòng SP</button>

          {showAddPL && (
            <div className="admin-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Thêm dòng sản phẩm</h3>
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

          {plLoading ? <div className="admin-skeleton" style={{ height: 200 }} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
              {productLines?.map((pl, idx) => {
                const orderCount = orders?.filter(o => o.product_line_id === pl.id && o.status !== 'cancelled').length || 0;
                const totalQty = orders?.filter(o => o.product_line_id === pl.id && o.status !== 'cancelled').reduce((sum, o) => sum + o.quantity, 0) || 0;
                return (
                  <div key={`${pl.id}-${idx}`} className="admin-card" style={{ borderTop: `3px solid ${pl.color}`, opacity: pl.is_active ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 32 }}>{pl.icon}</span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{pl.name}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>{pl.amazon_sku_prefix}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 13 }}>
                      <span>Đơn đang chạy: <strong>{orderCount}</strong></span>
                      <span>Tổng SL: <strong>{totalQty}</strong></span>
                    </div>
                    <button onClick={() => handleTogglePL(pl)} className="admin-btn admin-btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
                      {pl.is_active ? '🔴 Vô hiệu hóa' : '🟢 Kích hoạt'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <button onClick={() => setShowAddOrder(true)} className="admin-btn admin-btn-primary"><Plus size={16} /> Tạo đơn mới</button>
            <select className="admin-input" style={{ width: 140 }} value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
              <option value="deadline">Sort: Deadline</option>
              <option value="priority">Sort: Ưu tiên</option>
              <option value="created">Sort: Mới nhất</option>
            </select>
          </div>

          {showAddOrder && (
            <div className="admin-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sản phẩm *</label>
                  <select className="admin-input" value={orderForm.product_line_id} onChange={e => setOrderForm({...orderForm, product_line_id: e.target.value})}>
                    <option value="">Chọn SP</option>
                    {productLines?.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SL *</label>
                  <input type="number" className="admin-input" value={orderForm.quantity} onChange={e => setOrderForm({...orderForm, quantity: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Deadline *</label>
                  <input type="date" className="admin-input" value={orderForm.deadline} onChange={e => setOrderForm({...orderForm, deadline: e.target.value})} />
                </div>
              </div>
              <button onClick={handleAddOrder} disabled={submitting} className="admin-btn admin-btn-primary" style={{ marginTop: 12 }}>
                {submitting ? <Loader2 size={14} className="animate-spin" /> : null} Tạo đơn
              </button>
            </div>
          )}

          {oLoading ? <div className="admin-skeleton" style={{ height: 300 }} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr><th>Mã đơn</th><th>Sản phẩm</th><th>SL</th><th>Stage</th><th>Progress</th><th>Deadline</th><th>Ưu tiên</th><th>TT</th></tr>
                </thead>
                <tbody>
                  {sortedOrders.map((o, idx) => {
                    const pri = PRIORITIES.find(p => p.id === o.priority);
                    const daysLeft = Math.ceil((new Date(o.deadline).getTime() - Date.now()) / 86400000);
                    return (
                      <tr key={`${o.id}-${idx}`}>
                        <td style={{ fontWeight: 600 }}>{o.order_code}</td>
                        <td>{o.product_line_name}</td>
                        <td>{o.quantity}</td>
                        <td>{STAGES[o.current_stage - 1]?.icon} {STAGES[o.current_stage - 1]?.name}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 2, width: 84 }}>
                            {Array.from({ length: 7 }, (_, i) => (
                              <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < o.current_stage ? 'var(--brand)' : 'var(--bg-input)' }} />
                            ))}
                          </div>
                        </td>
                        <td style={{ color: daysLeft <= 3 ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: daysLeft <= 3 ? 600 : 400 }}>
                          {o.deadline} {daysLeft <= 3 && daysLeft > 0 ? `(${daysLeft}d)` : daysLeft <= 0 ? '⚠️' : ''}
                        </td>
                        <td><span className="admin-badge" style={{ background: `${pri?.color}20`, color: pri?.color }}>{pri?.label}</span></td>
                        <td>
                          <span className="admin-badge" style={{
                            background: o.status === 'completed' ? 'var(--success-bg)' : o.status === 'cancelled' ? 'var(--danger-bg)' : o.status === 'in_progress' ? 'var(--warning-bg)' : 'var(--bg-subtle)',
                            color: o.status === 'completed' ? 'var(--success)' : o.status === 'cancelled' ? 'var(--danger)' : o.status === 'in_progress' ? 'var(--warning)' : 'var(--text-sub)'
                          }}>
                            {o.status === 'completed' ? '✅ Xong' : o.status === 'cancelled' ? '❌ Hủy' : o.status === 'in_progress' ? '⏳ Đang SX' : '⏸ Chờ'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
