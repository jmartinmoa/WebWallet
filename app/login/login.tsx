'use client';
import React, { useState } from 'react';
import { DollarSign, Eye, EyeOff, Lock } from 'lucide-react';
import { DEFAULT_PASSWORD } from '@/app/constants';


interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEFAULT_PASSWORD) {
      onLogin();
    } else {
      setError('Incorrect password. Try again.');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'fixed', top: '-20%', right: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '-15%', left: '-5%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
          }}>
            <DollarSign size={30} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '1.8rem', fontWeight: 700,
            margin: '0 0 0.3rem', color: 'var(--text)',
          }}>
            FinTracker
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: 0 }}>
            Your personal finance companion
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: '1.5rem',
          }}>
            <Lock size={16} style={{ color: 'var(--text2)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Enter your password</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  className={`input ${shaking ? 'shake' : ''}`}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter password..."
                  autoFocus
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text3)', padding: 0,
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: '0.4rem 0 0' }}>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.7rem' }}
            >
              Sign In
            </button>
          </form>

          <p style={{
            textAlign: 'center', marginTop: '1.25rem',
            fontSize: '0.75rem', color: 'var(--text3)',
          }}>
            Default password: <code style={{ background: 'var(--surface2)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>admin</code>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake { animation: shake 0.4s ease; }
      `}</style>
    </div>
  );
}