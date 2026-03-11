'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginByPin } from '@/lib/api';
import { Loader2, LogIn, ChevronRight, Clock } from 'lucide-react';

function RealtimeClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);
  return <span>{time}</span>;
}

export default function HomePage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [savedUser, setSavedUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('pj_employee_id');
    const name = localStorage.getItem('pj_employee_name');
    if (id && name) {
      setSavedUser({ id, name });
    }
  }, []);

  const handleLogin = async () => {
    if (!pin.trim()) {
      setError('Vui lòng nhập mã nhân viên');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const emp = await loginByPin(pin.trim());
      // Save to localStorage
      localStorage.setItem('pj_employee_id', emp.id);
      localStorage.setItem('pj_employee_name', emp.name);
      localStorage.setItem('pj_employee_type', emp.type);
      localStorage.setItem('pj_employee_pin', emp.pin_code);
      // Redirect
      router.push(`/worker/${emp.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mã không đúng hoặc tài khoản bị khóa');
      triggerShake();
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleContinue = () => {
    if (savedUser) {
      router.push(`/worker/${savedUser.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="mobile-container" style={{
      background: 'var(--bg-page, #FAFAF8)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🏺</div>
        <h1 style={{
          fontSize: 30, fontWeight: 800, margin: '0 0 4px',
          color: 'var(--brand, #C4764E)', letterSpacing: -0.8,
        }}>
          Positive Jar
        </h1>
        <p style={{ color: 'var(--text-sub, #7A7A72)', fontSize: 14, margin: '4px 0 0' }}>
          Chấm công & Quản lý việc
        </p>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 10, color: 'var(--text-muted, #B0AFA8)', fontSize: 13,
        }}>
          <Clock size={14} />
          <RealtimeClock />
        </div>
      </div>

      {/* Returning user */}
      {savedUser && (
        <div
          onClick={handleContinue}
          style={{
            width: '100%', maxWidth: 380, padding: '14px 16px',
            borderRadius: 14, cursor: 'pointer', marginBottom: 20,
            background: 'var(--brand-light, #F7E8DC)',
            border: '1.5px solid var(--brand, #C4764E)',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'transform 0.15s',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--brand, #C4764E)', color: 'white',
            fontWeight: 700, fontSize: 16,
          }}>
            {savedUser.name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: 'var(--brand-dark, #A35D38)', fontWeight: 600, margin: 0 }}>
              Chào lại bạn! 👋
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-main, #2C2C2C)' }}>
              {savedUser.name}
            </p>
          </div>
          <div style={{
            background: 'var(--brand, #C4764E)', color: 'white',
            padding: '8px 14px', borderRadius: 10, fontWeight: 600, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            Tiếp tục <ChevronRight size={14} />
          </div>
        </div>
      )}

      {/* Login card */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'white', borderRadius: 20,
        padding: '28px 24px', boxShadow: '0 4px 24px rgba(44,44,44,0.08)',
        border: '1px solid var(--border, #E8E6E1)',
      }}>
        <h2 style={{
          fontSize: 16, fontWeight: 700, margin: '0 0 16px',
          color: 'var(--text-main, #2C2C2C)', textAlign: 'center',
        }}>
          {savedUser ? 'Đăng nhập người khác' : 'Nhập mã nhân viên'}
        </h2>

        {/* PIN Input */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={pin}
            onChange={e => {
              setPin(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="VD: NV001"
            autoFocus={!savedUser}
            maxLength={10}
            style={{
              width: '100%',
              height: 56,
              fontSize: 24,
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: 3,
              borderRadius: 14,
              border: `2px solid ${error ? 'var(--danger, #C4553A)' : 'var(--border, #E8E6E1)'}`,
              background: 'var(--bg-subtle, #F5F3EF)',
              outline: 'none',
              fontFamily: 'inherit',
              color: 'var(--text-main, #2C2C2C)',
              transition: 'border-color 0.2s, transform 0.1s',
              textTransform: 'uppercase',
              animation: shake ? 'shake 0.4s ease' : 'none',
            }}
            onFocus={(e) => { if (!error) e.target.style.borderColor = 'var(--brand, #C4764E)'; }}
            onBlur={(e) => { if (!error) e.target.style.borderColor = 'var(--border, #E8E6E1)'; }}
          />
        </div>

        {/* Error message */}
        {error && (
          <p style={{
            fontSize: 13, color: 'var(--danger, #C4553A)', fontWeight: 500,
            margin: '10px 0 0', textAlign: 'center',
          }}>
            ⚠️ {error}
          </p>
        )}

        {/* Login button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', height: 54, marginTop: 16,
            borderRadius: 14, border: 'none',
            background: 'var(--brand, #C4764E)',
            color: 'white', fontWeight: 700, fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
            boxShadow: '0 4px 14px rgba(196,118,78,0.25)',
            opacity: loading ? 0.7 : 1,
            transition: 'transform 0.1s, opacity 0.2s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
          ĐĂNG NHẬP
        </button>
      </div>

      {/* Footer */}
      <p style={{
        marginTop: 24, fontSize: 12,
        color: 'var(--text-muted, #B0AFA8)', textAlign: 'center',
      }}>
        Quên mã? Liên hệ quản lý
      </p>

      <p style={{
        marginTop: 32, fontSize: 11,
        color: 'var(--text-muted, #B0AFA8)', textAlign: 'center',
      }}>
        Positive Jar Production © 2024
      </p>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  );
}
