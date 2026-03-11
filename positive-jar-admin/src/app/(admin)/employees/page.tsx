'use client';

import { useState } from 'react';
import { getEmployees, addEmployee, updateEmployee, toggleEmployeeStatus, checkPinExists, useAPI } from '@/lib/api';
import { Employee, EMPLOYEE_TYPES } from '@/types';
import { formatCurrency, getInitials, getEmployeeTypeColor } from '@/lib/utils';
import { Plus, X, Loader2, Search, Dice5, Check, AlertCircle } from 'lucide-react';

export default function EmployeesPage() {
  const { data: employees, loading, refetch } = useAPI<Employee[]>(() =>
    fetch(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL + '?action=getEmployees').then(r => r.json()).then(d => d.data || [])
  );
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', pin_code: '', type: 'fulltime', skills: '' as string, hourly_rate: '', notes: '' });
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'valid' | 'taken'>('idle');
  const [pinCheckTimeout, setPinCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  const filtered = employees?.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search) || (e.pin_code || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    return matchSearch && matchType;
  }) || [];

  const handlePinChange = (value: string) => {
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
    setForm({ ...form, pin_code: clean });

    if (pinCheckTimeout) clearTimeout(pinCheckTimeout);

    if (clean.length < 3) {
      setPinStatus('idle');
      return;
    }

    // Don't check if editing and PIN hasn't changed
    if (editEmp && editEmp.pin_code?.toUpperCase() === clean) {
      setPinStatus('valid');
      return;
    }

    setPinStatus('checking');
    const timeout = setTimeout(async () => {
      try {
        const result = await checkPinExists(clean);
        setPinStatus(result.exists ? 'taken' : 'valid');
      } catch {
        setPinStatus('idle');
      }
    }, 500);
    setPinCheckTimeout(timeout);
  };

  const autoGeneratePin = () => {
    const count = (employees?.length || 0) + 1;
    const pin = 'NV' + String(count).padStart(3, '0');
    setForm({ ...form, pin_code: pin });
    setPinStatus('valid');
  };

  const handleAdd = async () => {
    if (!form.name || !form.phone) { alert('Điền tên và SĐT'); return; }
    if (form.pin_code && form.pin_code.length < 3) { alert('Mã đăng nhập tối thiểu 3 ký tự'); return; }
    if (pinStatus === 'taken') { alert('Mã đăng nhập đã tồn tại'); return; }
    setSubmitting(true);
    try {
      await addEmployee({ ...form, hourly_rate: Number(form.hourly_rate), skills: form.skills.split(',').map(s => s.trim()) } as unknown as Partial<Employee>);
      setShowAdd(false);
      setForm({ name: '', phone: '', pin_code: '', type: 'fulltime', skills: '', hourly_rate: '', notes: '' });
      setPinStatus('idle');
      refetch();
    } catch (e) { alert('Lỗi: ' + (e instanceof Error ? e.message : 'Unknown')); }
    setSubmitting(false);
  };

  const handleUpdate = async () => {
    if (!editEmp) return;
    if (form.pin_code && form.pin_code.length < 3) { alert('Mã đăng nhập tối thiểu 3 ký tự'); return; }
    if (pinStatus === 'taken') { alert('Mã đăng nhập đã tồn tại'); return; }
    setSubmitting(true);
    try {
      await updateEmployee(editEmp.id, { ...form, hourly_rate: Number(form.hourly_rate), skills: form.skills.split(',').map(s => s.trim()) } as unknown as Partial<Employee>);
      setEditEmp(null);
      setPinStatus('idle');
      refetch();
    } catch (e) { alert('Lỗi: ' + (e instanceof Error ? e.message : 'Unknown')); }
    setSubmitting(false);
  };

  const handleToggle = async (id: string) => {
    try { await toggleEmployeeStatus(id); refetch(); } catch { alert('Lỗi'); }
  };

  const openEdit = (emp: Employee) => {
    setEditEmp(emp);
    setForm({ name: emp.name, phone: emp.phone, pin_code: emp.pin_code || '', type: emp.type, skills: emp.skills.join(', '), hourly_rate: String(emp.hourly_rate), notes: emp.notes });
    setPinStatus(emp.pin_code ? 'valid' : 'idle');
  };

  const EmpForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="admin-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{isEdit ? '✏️ Sửa nhân viên' : '➕ Thêm nhân viên mới'}</h3>
        <button onClick={() => { setShowAdd(false); setEditEmp(null); setPinStatus('idle'); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-muted)" /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Họ tên *</label>
          <input className="admin-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SĐT *</label>
          <input className="admin-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="09xxxxxxxx" />
        </div>

        {/* PIN Code field */}
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Mã đăng nhập *
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className="admin-input"
                value={form.pin_code}
                onChange={e => handlePinChange(e.target.value)}
                placeholder="VD: NV004"
                maxLength={10}
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontWeight: 600,
                  borderColor: pinStatus === 'valid' ? 'var(--success)' : pinStatus === 'taken' ? 'var(--danger)' : undefined,
                }}
              />
              {/* Pin status indicator */}
              {pinStatus === 'checking' && (
                <Loader2 size={14} className="animate-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              )}
              {pinStatus === 'valid' && (
                <Check size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--success)' }} />
              )}
              {pinStatus === 'taken' && (
                <AlertCircle size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--danger)' }} />
              )}
            </div>
            <button
              onClick={autoGeneratePin}
              className="admin-btn admin-btn-ghost"
              style={{ whiteSpace: 'nowrap', fontSize: 12, padding: '8px 12px' }}
              title="Tạo mã tự động"
            >
              🎲 Tạo mã
            </button>
          </div>
          {pinStatus === 'taken' && (
            <p style={{ fontSize: 11, color: 'var(--danger)', margin: '4px 0 0', fontWeight: 500 }}>✗ Mã đã tồn tại, vui lòng chọn mã khác</p>
          )}
          {pinStatus === 'valid' && form.pin_code.length >= 3 && (
            <p style={{ fontSize: 11, color: 'var(--success)', margin: '4px 0 0', fontWeight: 500 }}>✓ Mã hợp lệ</p>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Nhân viên dùng mã này để đăng nhập app. 3–10 ký tự, chữ + số.
          </p>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Loại NV</label>
          <select className="admin-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
            {EMPLOYEE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Lương/giờ (VNĐ)</label>
          <input type="number" className="admin-input" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} placeholder="50000" />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Kỹ năng (phân cách bằng dấu phẩy)</label>
          <input className="admin-input" value={form.skills} onChange={e => setForm({...form, skills: e.target.value})} placeholder="printing, cutting, assembly" />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ghi chú</label>
          <input className="admin-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
      </div>
      <button onClick={isEdit ? handleUpdate : handleAdd} disabled={submitting || pinStatus === 'taken'} className="admin-btn admin-btn-primary" style={{ marginTop: 12 }}>
        {submitting ? <Loader2 size={14} className="animate-spin" /> : null} {isEdit ? 'Cập nhật' : 'Thêm nhân viên'}
      </button>
    </div>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="admin-input" style={{ paddingLeft: 36 }} placeholder="Tìm tên, SĐT, hoặc mã NV..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="admin-tabs" style={{ marginBottom: 0, flex: 'none' }}>
          {[{ id: 'all', label: 'Tất cả' }, ...EMPLOYEE_TYPES].map(t => (
            <button key={t.id} onClick={() => setTypeFilter(t.id)} className={`admin-tab ${typeFilter === t.id ? 'active' : ''}`} style={{ padding: '6px 12px' }}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowAdd(true); setEditEmp(null); setForm({ name: '', phone: '', pin_code: '', type: 'fulltime', skills: '', hourly_rate: '', notes: '' }); setPinStatus('idle'); }} className="admin-btn admin-btn-primary">
          <Plus size={16} /> Thêm NV
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAdd || editEmp) && <EmpForm isEdit={!!editEmp} />}

      {/* Employee Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="admin-skeleton" style={{ height: 180 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtered.map((emp, idx) => {
            const typeInfo = EMPLOYEE_TYPES.find(t => t.id === emp.type);
            return (
              <div key={`${emp.id}-${idx}`} className="admin-card" style={{ position: 'relative', opacity: emp.status === 'inactive' ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: getEmployeeTypeColor(emp.type), color: 'white', fontWeight: 700, fontSize: 16, flexShrink: 0
                  }}>
                    {getInitials(emp.name)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{emp.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '2px 0 0' }}>
                      {emp.pin_code && (
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginRight: 6 }}>{emp.pin_code}</span>
                      )}
                      <span>· {typeInfo?.label}</span>
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '1px 0 0' }}>📱 {emp.phone}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span className="admin-badge" style={{ background: `${typeInfo?.color}20`, color: typeInfo?.color }}>{typeInfo?.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>💰 {formatCurrency(emp.hourly_rate)}/h</span>
                </div>
                {emp.skills.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {emp.skills.map(s => <span key={s} className="admin-badge" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: 10 }}>{s}</span>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                  <button onClick={() => openEdit(emp)} className="admin-btn admin-btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '6px' }}>✏️ Sửa</button>
                  <button onClick={() => handleToggle(emp.id)} className="admin-btn admin-btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '6px', color: emp.status === 'active' ? 'var(--danger)' : 'var(--success)' }}>
                    {emp.status === 'active' ? '🔴 Vô hiệu' : '🟢 Kích hoạt'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
