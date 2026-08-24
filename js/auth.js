/* ============================================================
   auth.js — Supabase অথেন্টিকেশন
   ------------------------------------------------------------
   রেজিস্ট্রেশন → OTP ভেরিফিকেশন → লগইন → ফরগট পাসওয়ার্ড
   Supabase Auth বিল্ট-ইন ইমেইল OTP ব্যবহার করে।
============================================================ */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config.js';
import { showToast } from './utils.js';

let supabaseClient = null;
let currentUser = null;

/* ---------- Supabase client (lightweight REST — no SDK needed) ---------- */
// আমরা Supabase JS SDK ব্যবহার না করে সরাসরি REST API কল করব,
// যাতে কোনো CDN নির্ভরতা না থাকে এবং সাইট সম্পূর্ণ স্ট্যাটিক থাকে।

async function supabaseRequest(endpoint, options = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase কনফিগার করা হয়নি। js/config.js ফাইলে URL ও Key বসান।');
  }
  const url = `${SUPABASE_URL}${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${options.accessToken || SUPABASE_ANON_KEY}`,
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error_description || data.msg || 'অথেন্টিকেশন ত্রুটি');
  }
  return data;
}

/* ---------- Auth API ---------- */

/**
 * নতুন রেজিস্ট্রেশন — OTP ইমেইলে পাঠানো হয়।
 * Supabase সরাসরি OTP সাপোর্ট করে (data: { otp }).
 */
export async function register(email, password, name) {
  try {
    const data = await supabaseRequest('/auth/v1/signup', {
      method: 'POST',
      body: {
        email: email,
        password: password,
        data: { full_name: name }  // user metadata
      }
    });

    // Supabase সাধারণত কনফার্মেশন ইমেইল পাঠায়।
    // যদি email_confirm চালু থাকে, user এখন আনভেরিফাইড।
    if (data.user) {
      // OTP টাইপ কনফার্মেশন চালু থাকলে আলাদা OTP ইমেইল যায়
      await sendEmailOTP(email);
      return { success: true, email: email, message: 'OTP আপনার ইমেইলে পাঠানো হয়েছে।' };
    }
    return { success: false, message: 'রেজিস্ট্রেশন ব্যর্থ।' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * ইমেইলে OTP পাঠানো (Supabase OTP endpoint).
 * এটি ৬-সংখ্যার কোড ইমেইলে পাঠায়।
 */
export async function sendEmailOTP(email) {
  try {
    await supabaseRequest('/auth/v1/otp', {
      method: 'POST',
      body: {
        email: email,
        type: 'signup'  // 'signup' বা 'magiclink'
      }
    });
    return { success: true };
  } catch (error) {
    // কিছু ক্ষেত্রে signup-এই OTP চলে যায়, তাই error হলেও সমস্যা নেই
    console.warn('OTP send warning:', error.message);
    return { success: true };
  }
}

/**
 * OTP যাচাই করা ও অ্যাকাউন্ট অ্যাক্টিভেট করা।
 */
export async function verifyOTP(email, token) {
  try {
    const data = await supabaseRequest('/auth/v1/verify', {
      method: 'POST',
      body: {
        email: email,
        token: token,
        type: 'signup'
      }
    });

    if (data.access_token) {
      currentUser = {
        id: data.user?.id,
        email: data.user?.email || email,
        name: data.user?.user_metadata?.full_name || email,
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
      saveSession(currentUser);
      return { success: true, user: currentUser };
    }
    return { success: false, message: 'OTP যাচাই ব্যর্থ।' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * লগইন — ইমেইল + পাসওয়ার্ড।
 */
export async function login(email, password) {
  try {
    const data = await supabaseRequest('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: {
        email: email,
        password: password
      }
    });

    if (data.access_token) {
      // ইমেইল ভেরিফাইড কিনা চেক
      if (data.user && data.user.email_confirmed_at) {
        currentUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.email,
          accessToken: data.access_token,
          refreshToken: data.refresh_token
        };
        saveSession(currentUser);
        return { success: true, user: currentUser };
      } else {
        return { success: false, message: 'ইমেইল যাচাই করা হয়নি। আগে OTP যাচাই করুন।', needVerify: true, email: email };
      }
    }
    return { success: false, message: 'লগইন ব্যর্থ। ইমেইল ও পাসওয়ার্ড যাচাই করুন।' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * ফরগট পাসওয়ার্ড — রিসেট OTP ইমেইলে পাঠানো।
 */
export async function forgotPassword(email) {
  try {
    await supabaseRequest('/auth/v1/otp', {
      method: 'POST',
      body: {
        email: email,
        type: 'recovery'
      }
    });
    return { success: true, message: 'পাসওয়ার্ড রিসেট OTP আপনার ইমেইলে পাঠানো হয়েছে।' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * পাসওয়ার্ড রিসেট — OTP যাচাই করে নতুন পাসওয়ার্ড সেট করা।
 */
export async function resetPassword(email, token, newPassword) {
  try {
    // প্রথমে OTP যাচাই
    const verifyData = await supabaseRequest('/auth/v1/verify', {
      method: 'POST',
      body: {
        email: email,
        token: token,
        type: 'recovery'
      }
    });

    if (verifyData.access_token) {
      // নতুন পাসওয়ার্ড সেট করা
      const updateResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${verifyData.access_token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      if (updateResp.ok) {
        return { success: true, message: 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে। এখন লগইন করুন।' };
      }
      return { success: false, message: 'পাসওয়ার্ড আপডেট ব্যর্থ।' };
    }
    return { success: false, message: 'OTP যাচাই ব্যর্থ।' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * লগআউট।
 */
export async function logout() {
  currentUser = null;
  localStorage.removeItem('gp_session');
  localStorage.removeItem('gp_user_email');
}

/* ---------- Session Management ---------- */

function saveSession(user) {
  localStorage.setItem('gp_session', JSON.stringify({
    accessToken: user.accessToken,
    refreshToken: user.refreshToken,
    expiresAt: Date.now() + 3600 * 1000 // ~1 hour
  }));
  localStorage.setItem('gp_user_email', user.email);
  localStorage.setItem('gp_user_name', user.name);
}

export function getCurrentUser() {
  if (currentUser) return currentUser;

  try {
    const session = localStorage.getItem('gp_session');
    if (!session) return null;
    const parsed = JSON.parse(session);
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem('gp_session');
      return null;
    }
    currentUser = {
      email: localStorage.getItem('gp_user_email') || '',
      name: localStorage.getItem('gp_user_name') || 'User',
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken
    };
    return currentUser;
  } catch (e) {
    return null;
  }
}

export function isLoggedIn() {
  return getCurrentUser() !== null;
}

export function isAuthReady() {
  return isSupabaseConfigured();
}

/* ---------- Demo Mode (Supabase ছাড়া পরীক্ষা করার জন্য) ---------- */
// যদি Supabase কনফিগার না করা থাকে, একটি ডেমো মোডে চলবে যাতে
// সাইটের বাকি ফিচারগুলো পরীক্ষা করা যায়।
export function isDemoMode() {
  return !isSupabaseConfigured();
}

const DEMO_USERS_KEY = 'gp_demo_users';

export async function demoRegister(email, password, name) {
  let users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]');
  if (users.find(u => u.email === email)) {
    return { success: false, message: 'এই ইমেইল দিয়ে ইতিমধ্যে রেজিস্টার করা আছে।' };
  }
  // ডেমো OTP: 123456 (সবসময়)
  users.push({ email, password, name, verified: false, otp: '123456' });
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  return {
    success: true,
    email,
    message: 'ডেমো মোড: OTP হলো 123456 (Supabase কনফিগার করলে আসল ইমেইল OTP যাবে)'
  };
}

export async function demoVerifyOTP(email, token) {
  let users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]');
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' };
  if (user.otp !== token) return { success: false, message: 'ভুল OTP। ডেমো OTP: 123456' };
  user.verified = true;
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  currentUser = { email: user.email, name: user.name, accessToken: 'demo_token' };
  saveSession(currentUser);
  return { success: true, user: currentUser };
}

export async function demoLogin(email, password) {
  let users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { success: false, message: 'ভুল ইমেইল বা পাসওয়ার্ড।' };
  if (!user.verified) {
    return { success: false, message: 'ইমেইল যাচাই করা হয়নি। OTP যাচাই করুন।', needVerify: true, email };
  }
  currentUser = { email: user.email, name: user.name, accessToken: 'demo_token' };
  saveSession(currentUser);
  return { success: true, user: currentUser };
}

export async function demoForgotPassword(email) {
  let users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]');
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, message: 'এই ইমেইল রেজিস্টার করা নেই।' };
  user.otp = '123456';
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  return { success: true, message: 'ডেমো মোড: রিসেট OTP হলো 123456' };
}

export async function demoResetPassword(email, token, newPassword) {
  let users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || '[]');
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, message: 'ব্যবহারকারী পাওয়া যায়নি।' };
  if (token !== '123456') return { success: false, message: 'ভুল OTP। ডেমো OTP: 123456' };
  user.password = newPassword;
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
  return { success: true, message: 'পাসওয়ার্ড আপডেট হয়েছে। এখন লগইন করুন।' };
}
