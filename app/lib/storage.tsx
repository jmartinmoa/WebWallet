import { AppData } from '../types';
import { DEFAULT_DATA } from '../constants';

const STORAGE_KEY  = 'financial_tracker_data';
const SESSION_KEY  = 'ft_encrypt_key';
const FALLBACK_KEY = 'FinTrackerDefault'; 


export function setEncryptKey(key: string): void {
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_KEY, key);
}

export function getEncryptKey(): string {
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(SESSION_KEY) || FALLBACK_KEY;
  }
  return FALLBACK_KEY;
}


function strToBytes(str: string): Uint8Array { return new TextEncoder().encode(str); }
function bytesToStr(bytes: Uint8Array): string { return new TextDecoder().decode(bytes); }

function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/\s+/g, '');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function encrypt(plaintext: string): string {
  const keyBytes = strToBytes(getEncryptKey());
  return bytesToHex(xorBytes(strToBytes(plaintext), keyBytes));
}

export function decrypt(cipherHex: string): string {
  const keyBytes = strToBytes(getEncryptKey());
  return bytesToStr(xorBytes(hexToBytes(cipherHex), keyBytes));
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
  } catch { return DEFAULT_DATA; }
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

// Safely fetch JSON from GAS — handles redirects, BOM, JSONP wrapping
async function gasGetJson(url: string): Promise<any> {
  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    redirect: 'follow',
  });

  const raw = await res.text();
  let clean = raw.trim().replace(/^[\uFEFF\u200B\u0000-\u001F]+/, '');

  const firstBrace = clean.search(/[{\[]/);
  const lastBrace = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));

  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }

  if (!clean) {
    // Si no hay llaves, quizás es el texto plano de Drive
    return raw; 
  }
  
  try {
    return JSON.parse(clean); // <--- ¡Esto es vital!
  } catch (e) {
    return clean; // Si no es JSON, devolver como texto
  }
}
export async function gasSignin(apiUrl: string, password: string): Promise<{ ok: boolean; key?: string }> {
  try {
    const base = apiUrl.trim();

    // 1. Verify password
    const authUrl = `${base}?action=signin&password=${encodeURIComponent(password)}&t=${Date.now()}`;
    console.log('[GAS signin] auth url:', authUrl);
    const authData = await gasGetJson(authUrl);
    console.log('[GAS signin] auth response:', authData);
    if (!authData.ok) return { ok: false };

    // 2. Fetch encryption key
    const keyUrl = `${base}?action=getKey&t=${Date.now()}`;
    const keyData = await gasGetJson(keyUrl);
    console.log('[GAS signin] key response:', keyData);
    const key = keyData.key || FALLBACK_KEY;

    return { ok: true, key };
  } catch (err) {
    console.error('[GAS signin] error:', err);
    throw err;
  }
}

export async function syncToGAS(apiUrl: string, data: AppData): Promise<boolean> {
  if (!apiUrl) return false;
  try {
    const payload = encrypt(JSON.stringify(data));
    await fetch(apiUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: payload, mode: 'no-cors',
    });
    return true;
  } catch (err) {
    console.error('[GAS push]', err);
    return false;
  }
}

export async function loadFromGAS(apiUrl: string): Promise<AppData | null> {
  if (!apiUrl) return null;
  const url = `${apiUrl}?t=${Date.now()}`;
  
  try {
    // Usamos nuestra función de limpieza en lugar de fetch directo
    const raw = await gasGetJson(url);
    
    if (!raw || typeof raw !== 'string') throw new Error('Contenido inválido');

    try {
      const decrypted = decrypt(raw);
      return safeMerge(JSON.parse(decrypted));
    } catch {
      // Si falla la desencriptación, intentar parsear directo (por si no estaba encriptado)
      return safeMerge(JSON.parse(raw));
    }
  } catch (err) {
    console.error('[GAS load]', err);
    throw new Error('No se pudo leer desde Drive.');
  }
}

// ── Backup ────────────────────────────────────────────────────────────────────
export function exportBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `fintracker_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
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