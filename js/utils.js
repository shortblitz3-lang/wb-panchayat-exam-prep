/* ============================================================
   utils.js — সাধারণ ইউটিলিটি ফাংশন
   ডেটা লোডিং, ক্যাশিং, DOM হেল্পার, ফর্ম্যাটিং
============================================================ */

import { CACHE_ENABLED, CACHE_PREFIX, CACHE_TTL, DATA_PATH } from './config.js';

/* ---------- DOM Helpers ---------- */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') node.className = val;
    else if (key === 'html') node.innerHTML = val;
    else if (key === 'text') node.textContent = val;
    else if (key.startsWith('data-')) node.setAttribute(key, val);
    else if (key === 'onclick') node.addEventListener('click', val);
    else node.setAttribute(key, val);
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}

/* ---------- Toast Notifications ---------- */
export function showToast(message, type = 'info', duration = 3000) {
  const container = $('#toastContainer');
  if (!container) return;
  const toast = el('div', { class: `toast ${type}` });
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ---------- Data Fetching with Cache ---------- */
const memoryCache = new Map();

/**
 * JSON ফাইল fetch করে — localStorage ও মেমরিতে ক্যাশ করে।
 * আগের সাইটের ক্র্যাশ এড়াতে: বড় ফাইল একবারে লোড না করে
 * প্রয়োজনে আলাদা ফাইল থেকে lazy load করা হয়।
 */
export async function fetchJSON(path, { useCache = true } = {}) {
  const fullPath = `${DATA_PATH}/${path}`;
  const cacheKey = CACHE_PREFIX + path;

  // মেমরি ক্যাশ
  if (useCache && memoryCache.has(fullPath)) {
    return memoryCache.get(fullPath);
  }

  // localStorage ক্যাশ
  if (useCache && CACHE_ENABLED) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed._ts < CACHE_TTL) {
          memoryCache.set(fullPath, parsed.data);
          return parsed.data;
        }
        localStorage.removeItem(cacheKey); // expired
      }
    } catch (e) { /* ignore cache errors */ }
  }

  // ফেচ
  const response = await fetch(fullPath);
  if (!response.ok) {
    throw new Error(`ফাইল লোড ব্যর্থ: ${path} (${response.status})`);
  }
  const data = await response.json();

  // ক্যাশে সেভ
  if (useCache && CACHE_ENABLED) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ _ts: Date.now(), data }));
    } catch (e) {
      // localStorage ফুল হলে পুরোনো ক্যাশ মুছে দাও
      clearOldCache();
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ _ts: Date.now(), data }));
      } catch (e2) { /* যদি এখনও না হয়, ক্যাশ ছাড়াই চালাও */ }
    }
  }
  memoryCache.set(fullPath, data);
  return data;
}

/* পুরোনো ক্যাশ মুছে ফেলা */
function clearOldCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  // অর্ধেক মুছে দাও
  const toRemove = keys.slice(0, Math.ceil(keys.length / 2));
  toRemove.forEach(k => localStorage.removeItem(k));
}

/* মেমরি ক্যাশ পরিষ্কার */
export function clearMemoryCache() {
  memoryCache.clear();
}

/* ---------- Pagination ---------- */
export function paginate(array, page = 1, perPage = 10) {
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    items: array.slice(start, end),
    total: array.length,
    page,
    perPage,
    totalPages: Math.ceil(array.length / perPage),
    hasMore: end < array.length
  };
}

/* ---------- Array Shuffle (for random question selection) ---------- */
export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------- Formatting ---------- */
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPercent(value, total) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

/* ---------- Date helpers ---------- */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/* ---------- HTML escape ---------- */
export function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- Loading indicator ---------- */
export function loadingHTML(text = 'লোড হচ্ছে...') {
  return `<div class="loading-inline"><div class="spinner-small" style="margin-bottom:0.5rem;"></div><p>${text}</p></div>`;
}

export function emptyStateHTML(icon, message) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><p>${message}</p></div>`;
}

/* ---------- Deep clone (for safety) ---------- */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ---------- Debounce ---------- */
export function debounce(fn, delay = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
