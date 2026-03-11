'use client';

import { useState } from 'react';
import { getSettings, updateMultipleSettings, useAPI } from '@/lib/api';
import { Setting, STAGES } from '@/types';
import { Loader2, Save } from 'lucide-react';

export default function SettingsPage() {
  const { data: settings, loading, refetch } = useAPI<Setting[]>(getSettings);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize values from settings
  const getValue = (key: string) => {
    if (values[key] !== undefined) return values[key];
    return settings?.find(s => s.key === key)?.value || '';
  };

  const setValue = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = Object.entries(values).map(([key, value]) => ({ key, value }));
      if (data.length > 0) {
        await updateMultipleSettings(data);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      refetch();
    } catch (e) { alert('Lỗi lưu cài đặt'); }
    setSaving(false);
  };

  if (loading) return <div className="admin-skeleton" style={{ height: 400 }} />;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="admin-card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 14px', color: 'var(--brand)' }}>{title}</h3>
      {children}
    </div>
  );

  const Field = ({ label, settingKey, type = 'text', suffix = '' }: { label: string; settingKey: string; type?: string; suffix?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <label style={{ fontSize: 14 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          className="admin-input"
          type={type}
          value={getValue(settingKey)}
          onChange={(e) => setValue(settingKey, e.target.value)}
          style={{ width: type === 'number' ? 80 : type === 'time' ? 110 : 120, padding: '6px 10px', textAlign: 'right' }}
        />
        {suffix && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div>
      {/* Success Toast */}
      {saved && (
        <div style={{ padding: 12, borderRadius: 12, background: 'var(--success-bg)', marginBottom: 16, textAlign: 'center' }}>
          <span style={{ color: 'var(--success)', fontWeight: 600 }}>✅ Đã lưu cài đặt thành công!</span>
        </div>
      )}

      {/* Section 1: Shifts */}
      <Section title="🕐 Ca làm việc">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>🌅 Ca sáng</h4>
            <Field label="Bắt đầu" settingKey="shift_morning_start" type="time" />
            <Field label="Kết thúc" settingKey="shift_morning_end" type="time" />
            <Field label="Số giờ" settingKey="shift_morning_hours" type="number" suffix="giờ" />
          </div>
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>☀️ Ca chiều</h4>
            <Field label="Bắt đầu" settingKey="shift_afternoon_start" type="time" />
            <Field label="Kết thúc" settingKey="shift_afternoon_end" type="time" />
            <Field label="Số giờ" settingKey="shift_afternoon_hours" type="number" suffix="giờ" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
             <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Phụ trợ</h4>
             <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                 <div style={{ flex: 1, minWidth: 300 }}>
                   <Field label="Số giờ Full Ngày" settingKey="shift_fullday_hours" type="number" suffix="giờ" />
                   <Field label="Nghỉ trưa chung" settingKey="lunch_break_minutes" type="number" suffix="phút" />
                 </div>
             </div>
          </div>
        </div>
      </Section>

      {/* Section 2: Attendance */}
      <Section title="⏰ Chấm công">
        <Field label="Phút cho phép trễ" settingKey="late_threshold_minutes" type="number" suffix="phút" />
        <Field label="Giờ làm chuẩn/ca" settingKey="standard_hours" type="number" suffix="giờ" />
      </Section>

      {/* Section 3: Salary */}
      <Section title="💰 Lương">
        <Field label="Hệ số OT" settingKey="overtime_rate" type="number" />
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
          Lương/giờ từng NV cài ở trang Nhân sự
        </p>
      </Section>

      {/* Section 4: Production */}
      <Section title="🏭 Sản xuất">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px' }}>7 công đoạn sản xuất</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STAGES.map(s => (
            <span key={s.number} className="admin-badge" style={{ background: 'var(--bg-input)', color: 'var(--text)' }}>
              {s.icon} {s.name}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <Field label="Danh sách (cách bằng dấu phẩy)" settingKey="stages_list" />
        </div>
      </Section>

      {/* Section 5: System */}
      <Section title="⚙️ Hệ thống">
        <Field label="Tên công ty" settingKey="company_name" />
        <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>Google Sheets</span>
          <a href="#" target="_blank" style={{ color: 'var(--brand)', fontSize: 13, textDecoration: 'none' }}>
            Mở Google Sheets ↗
          </a>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '12px 0 0', fontStyle: 'italic' }}>
          💡 Bạn cũng có thể sửa trực tiếp trên Google Sheets tab &apos;settings&apos;
        </p>
      </Section>

      {/* Save Button */}
      <button onClick={handleSave} disabled={saving} className="admin-btn admin-btn-primary" style={{ width: '100%', height: 48, justifyContent: 'center', fontSize: 16 }}>
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} LƯU CÀI ĐẶT
      </button>
    </div>
  );
}
