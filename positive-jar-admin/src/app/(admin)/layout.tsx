'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ClipboardList, CalendarCheck, Factory, Users, Package, Settings, Clock, Menu, X, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/attendance', icon: ClipboardList, label: 'Bảng công' },
  { href: '/schedules', icon: CalendarCheck, label: 'Lịch & Phân công' },
  { href: '/production', icon: Factory, label: 'Sản xuất' },
  { href: '/employees', icon: Users, label: 'Nhân sự' },
  { href: '/products', icon: Package, label: 'Sản phẩm' },
  { href: '/settings', icon: Settings, label: 'Cài đặt' },
];

function SidebarClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--bg-subtle)', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
        <Clock size={14} color="var(--text-muted)" />
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-sub)' }}>{time}</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{date}</p>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentPage = menuItems.find(item => pathname.startsWith(item.href));

  return (
    <div>
      {/* Sidebar */}
      <aside className="sidebar" style={mobileOpen ? { display: 'flex', position: 'fixed', width: '240px', zIndex: 100 } : undefined}>
        {/* Logo */}
        <div style={{ padding: '4px 10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🏺</span>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: 'var(--brand)' }}>Positive Jar</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Admin</p>
          </div>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Clock */}
        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <SidebarClock />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 90 }}
        />
      )}

      {/* Main */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none' }}
              className="mobile-menu-btn"
            >
              <Menu size={20} color="var(--text-muted)" />
            </button>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)' }}>
              {currentPage?.label || 'Admin'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="#" target="_blank" style={{
              display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13,
              textDecoration: 'none', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
            }}>
              <ExternalLink size={14} />
              Google Sheets
            </a>
            <span className="admin-badge" style={{ background: 'var(--brand-light)', color: 'var(--brand-dark)' }}>
              Admin
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="admin-content">
          {children}
        </main>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
