'use client';
import React, { useState } from 'react';
import { DollarSign, Eye, EyeOff, Lock } from 'lucide-react';
import { DEFAULT_PASSWORD } from '../constants';

interface LoginProps { onLogin: () => void; }

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [shaking, setShaking]   = useState(false);

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
      minHeight: '100dvh', // dvh fixes mobile browser chrome/address bar
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      boxSizing: 'border-box',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-15%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            <DollarSign size={32} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 700, margin: '0 0 0.3rem', color: 'var(--text)' }}>
            FinTracker
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: 0 }}>
            Your personal finance companion
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 'clamp(1.25rem, 5vw, 2rem)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
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
                  autoComplete="current-password"
                  style={{ paddingRight: '2.75rem', fontSize: '1rem' /* prevents iOS zoom on focus */ }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text3)', padding: '0.25rem',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  ⚠ {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem', marginTop: '0.25rem' }}
            >
              Sign In
            </button>
          </form>

   
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        .shake { animation: shake 0.4s ease; }
      `}</style>
    </div>
  );
}