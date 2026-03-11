'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, BarChart2, ClipboardList, Calendar, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '', icon: Home, label: 'Home' },
  { href: '/stats', icon: BarChart2, label: 'Giờ làm' },
  { href: '/tasks', icon: ClipboardList, label: 'Việc' },
  { href: '/schedule', icon: Calendar, label: 'Lịch' },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = params.id as string;
  const basePath = `/worker/${id}`;
  const [empName, setEmpName] = useState('');
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    setEmpName(localStorage.getItem('pj_employee_name') || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pj_employee_id');
    localStorage.removeItem('pj_employee_name');
    localStorage.removeItem('pj_employee_type');
    localStorage.removeItem('pj_employee_pin');
    router.push('/');
  };

  return (
    <div className="mobile-container" style={{ background: 'var(--bg-page, var(--bg))' }}>
      {/* Top Header */}
      <header style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card, white)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏺</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--brand, var(--primary))' }}>Positive Jar</span>
        </div>
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowLogout(!showLogout)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '4px 10px', borderRadius: 20,
              background: 'var(--bg-subtle, #F3F4F6)',
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'var(--brand, var(--primary))', color: 'white',
              fontWeight: 700, fontSize: 11,
            }}>
              {empName.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-main, #374151)', fontWeight: 500 }}>
              {empName || 'Tôi'}
            </span>
          </div>

          {/* Logout dropdown */}
          {showLogout && (
            <div style={{
              position: 'absolute', right: 0, top: 40, zIndex: 50,
              background: 'white', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              border: '1px solid var(--border)',
              overflow: 'hidden', minWidth: 160,
            }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 500, color: '#C4553A',
                  fontFamily: 'inherit',
                }}
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Overlay to close logout dropdown */}
      {showLogout && (
        <div
          onClick={() => setShowLogout(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 35 }}
        />
      )}

      {/* Content */}
      <main style={{ padding: '16px', paddingBottom: 80, minHeight: 'calc(100vh - 52px - 64px)' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map(item => {
          const href = basePath + item.href;
          const isActive = item.href === ''
            ? pathname === basePath
            : pathname.startsWith(href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span>{item.label}</span>
              {isActive && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--brand, var(--primary))',
                  marginTop: 1,
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
