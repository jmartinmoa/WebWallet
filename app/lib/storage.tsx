import { AppData } from '../types';
import { DEFAULT_DATA } from '../constants';

const STORAGE_KEY = 'financial_tracker_data';
const ENCRYPT_KEY = 'MartinMorales';

// ── UTF-8 safe XOR encryption (NO base64) ────────────────────────────────────
// Instead of base64 (which GAS can corrupt), we use hex encoding.
// Hex is pure [0-9a-f] — GAS will never touch it.

function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToStr(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length];
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/\s+/g, ''); // strip any whitespace GAS may add
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function encrypt(plaintext: string): string {
  const dataBytes = strToBytes(plaintext);
  const keyBytes  = strToBytes(ENCRYPT_KEY);
  return bytesToHex(xorBytes(dataBytes, keyBytes)); // pure hex string
}

export function decrypt(cipherHex: string): string {
  const keyBytes  = strToBytes(ENCRYPT_KEY);
  const encrypted = hexToBytes(cipherHex);
  return bytesToStr(xorBytes(encrypted, keyBytes));
}

// ── Safe merge ────────────────────────────────────────────────────────────────
export function safeMerge(incoming: any): AppData {
  if (!incoming || typeof incoming !== 'object') return DEFAULT_DATA;
  return {
    ...DEFAULT_DATA,
    ...incoming,
    transactions:  Array.isArray(incoming.transactions)  ? incoming.transactions  : DEFAULT_DATA.transactions,
    investments:   Array.isArray(incoming.investments)   ? incoming.investments   : DEFAULT_DATA.investments,
    cards:         Array.isArray(incoming.cards)         ? incoming.cards         : DEFAULT_DATA.cards,
    debts:         Array.isArray(incoming.debts)         ? incoming.debts         : DEFAULT_DATA.debts,
    subscriptions: Array.isArray(incoming.subscriptions) ? incoming.subscriptions : DEFAULT_DATA.subscriptions,
    reminders:     Array.isArray(incoming.reminders)     ? incoming.reminders     : DEFAULT_DATA.reminders,
    categories:    Array.isArray(incoming.categories) && incoming.categories.length > 0
                     ? incoming.categories : DEFAULT_DATA.categories,
    settings: { ...DEFAULT_DATA.settings, ...(incoming.settings ?? {}) },
  };
}

// ── Local storage ─────────────────────────────────────────────────────────────
export function loadData(): AppData {
  if (typeof window === 'undefined') return DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    return safeMerge(JSON.parse(raw));
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

export function clearData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Google Apps Script ────────────────────────────────────────────────────────

export async function syncToGAS(apiUrl: string, data: AppData): Promise<boolean> {
  if (!apiUrl) return false;
  try {
    const payload = encrypt(JSON.stringify(data)); // hex string — safe for GAS
    await fetch(apiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    payload,
      mode:    'no-cors',
    });
    return true;
  } catch (err) {
    console.error('[GAS push]', err);
    return false;
  }
}

export async function loadFromGAS(apiUrl: string): Promise<AppData | null> {
  if (!apiUrl) return null;

  const url      = `${apiUrl}?t=${Date.now()}`;
  const response = await fetch(url, { method: 'GET', mode: 'cors' });

  if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);

  const raw = (await response.text()).trim();
  console.log('[GAS pull] raw length:', raw.length, '| first 80:', raw.slice(0, 80));

  if (!raw) throw new Error('Drive file is empty — push data first.');

  // 1. Try decrypt (hex → XOR → UTF-8)
  try {
    const decrypted = decrypt(raw);
    console.log('[GAS pull] decrypted OK, first 60:', decrypted.slice(0, 60));
    return safeMerge(JSON.parse(decrypted));
  } catch (e1) {
    console.warn('[GAS pull] decrypt failed:', e1);
  }

  // 2. Fallback — plain JSON (manual file or old push)
  try {
    return safeMerge(JSON.parse(raw));
  } catch (e2) {
    console.error('[GAS pull] plain JSON also failed:', e2);
    throw new Error('Could not read data from Drive. Push again with the latest version, then pull.');
  }
}

// ── Backup export / import ────────────────────────────────────────────────────
export function exportBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `fintracker_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => {
      try   { resolve(safeMerge(JSON.parse(e.target?.result as string))); }
      catch { reject(new Error('Invalid backup file')); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}