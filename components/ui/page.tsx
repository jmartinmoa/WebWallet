'use client';
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// Modal
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem' }}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Confirm Dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-body" style={{ textAlign: 'center', paddingTop: '2rem' }}>
          <AlertTriangle size={40} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'DM Sans, sans-serif' }}>{title}</h3>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>{message}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast
let toastTimeout: ReturnType<typeof setTimeout>;
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    toastTimeout = setTimeout(onClose, 3000);
    return () => clearTimeout(toastTimeout);
  }, [onClose]);
  return <div className="toast">{message}</div>;
}

// Pagination
export function Pagination({ page, totalPages, onChange }: {
  page: number; totalPages: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
      {pages.map((p) => (
        <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className="page-btn" onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
    </div>
  );
}

// Color Picker
export function ColorPicker({ value, onChange, colors }: {
  value: string; onChange: (c: string) => void; colors: string[];
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{
            width: 28, height: 28, borderRadius: '50%', background: c,
            border: value === c ? '3px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer', outline: 'none',
            boxShadow: value === c ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)' : 'none',
          }}
        />
      ))}
      <input
        type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }}
        title="Custom color"
      />
    </div>
  );
}

// Empty State
export function EmptyState({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="empty-state">
      {icon || <div style={{ fontSize: '2.5rem' }}>📭</div>}
      <p>{message}</p>
    </div>
  );
}

// Amount Display
export function Amount({ value, hide, className, prefix = '', style }: {
  value: number; hide?: boolean; className?: string; prefix?: string; style?: React.CSSProperties;
}) {
  const formatted = hide ? '••••••' : `${prefix}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  return <span className={`${className || ''} ${hide ? 'amount-hidden' : ''}`} style={style}>{formatted}</span>;
}

export default function UIInternalPage() {
  return null; 
}