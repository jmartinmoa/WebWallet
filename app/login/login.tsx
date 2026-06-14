'use client';
import React, { useState, useEffect } from 'react';
import { DollarSign, Eye, EyeOff, Lock, Link, Loader, CloudOff, AlertCircle } from 'lucide-react';
import { gasSignin, setEncryptKey, loadFromGAS, saveData } from '../lib/storage';
import { safeMerge } from '../lib/storage';

const GAS_URL_KEY = 'ft_gas_url';

interface LoginProps {
  onLogin: (gasUrl: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [gasUrl, setGasUrl]     = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [shaking, setShaking]   = useState(false);
  const [step, setStep]         = useState<'url' | 'password'>('url');

  // Restore saved URL
  useEffect(() => {
    const saved = localStorage.getItem(GAS_URL_KEY) || '';
    if (saved) { setGasUrl(saved); setStep('password'); }
  }, []);

  function shake(msg: string) {
    setError(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }

  // Step 1: validate URL format and move to password step
  function handleUrlNext(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = gasUrl.trim();
    if (!trimmed.startsWith('https://')) {
      shake('Enter a valid Google Apps Script URL (starts with https://)');
      return;
    }
    localStorage.setItem(GAS_URL_KEY, trimmed);
    setError('');
    setStep('password');
  }

  // Step 2: call GAS to verify password + get key + load data
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!password) { shake('Enter your password'); return; }
    setLoading(true);
    setError('');

    try {
      const result = await gasSignin(gasUrl.trim(), password);

      if (!result.ok) {
        setLoading(false);
        shake('Access denied — incorrect password.');
        return;
      }

      // Store the encryption key for this session
      if (result.key) setEncryptKey(result.key);

      // Pull data from Drive now that we have the right key
      try {
        const cloud = await loadFromGAS(gasUrl.trim());
        if (cloud) {
          const merged = { ...cloud, settings: { ...cloud.settings, gasApiUrl: gasUrl.trim() } };
          saveData(merged);
        }
      } catch {
        // If pull fails, continue with local data — not a blocker
      }

      sessionStorage.setItem('ft_auth', 'true');
      sessionStorage.setItem('ft_gas_url', gasUrl.trim());
      setLoading(false);
      onLogin(gasUrl.trim());

    } catch (err: any) {
      setLoading(false);
      shake('Could not reach Google Script. Check the URL and your connection.');
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.25rem', boxSizing: 'border-box',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-15%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
            <DollarSign size={32} color="#fff" />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.6rem, 5vw, 2rem)', fontWeight: 700, margin: '0 0 0.3rem', color: 'var(--text)' }}>
            WebWallet
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: 0 }}>Your personal finance companion</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 'clamp(1.25rem, 5vw, 2rem)' }}>

          {/* Step indicators */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
            {(['url', 'password'] as const).map((s, i) => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: step === s || (s === 'url' && step === 'password') ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>

          {/* ── Step 1: Script URL ── */}
          {step === 'url' && (
            <form onSubmit={handleUrlNext}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Link size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Google Apps Script URL</span>
              </div>
              <div className="form-group">
                <label>Script URL</label>
                <input
                  className={`input ${shaking ? 'shake' : ''}`}
                  type="url"
                  value={gasUrl}
                  onChange={(e) => { setGasUrl(e.target.value); setError(''); }}
                  placeholder="https://script.google.com/macros/s/..."
                  style={{ fontSize: '0.9rem' }}
                  autoFocus
                />
                {error && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertCircle size={13} /> {error}</p>}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text3)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                Deploy your Google Apps Script as a Web App and paste the URL here. This is used to authenticate and sync your data.
              </p>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem' }}>
                Continue →
              </button>
            </form>
          )}

          {/* ── Step 2: Password ── */}
          {step === 'password' && (
            <form onSubmit={handleSignIn}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Lock size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Enter your password</span>
              </div>

              {/* Show URL with option to change */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', background: 'var(--surface2)', borderRadius: 8, marginBottom: '1rem' }}>
                <CloudOff size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gasUrl}</span>
                <button type="button" onClick={() => { setStep('url'); setError(''); setPassword(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0, padding: 0 }}>
                  Change
                </button>
              </div>

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
                    style={{ paddingRight: '2.75rem', fontSize: '1rem' }}
                    autoFocus
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '0.25rem', WebkitTapHighlightColor: 'transparent' }}>
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {error && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: '0.4rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><AlertCircle size={13} /> {error}</p>}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '1rem', marginTop: '0.25rem', opacity: loading ? 0.75 : 1 }}>
                {loading
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                  : 'Sign In'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .shake { animation: shake 0.4s ease; }
      `}</style>
    </div>
  );
}