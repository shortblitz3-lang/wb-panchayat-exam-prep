/* ============================================================
   authUI.js — অথেন্টিকেশন UI কন্ট্রোলার
   ------------------------------------------------------------
   লগইন, রেজিস্ট্রেশন, OTP ভেরিফিকেশন, ফরগট পাসওয়ার্ড
   ফর্মগুলো পরিচালনা করে। Supabase কনফিগার না থাকলে
   ডেমো মোডে চলে।
============================================================ */

import { $, showToast, escapeHTML } from './utils.js';
import {
  register, verifyOTP, login, forgotPassword, resetPassword,
  sendEmailOTP, isDemoMode,
  demoRegister, demoVerifyOTP, demoLogin, demoForgotPassword, demoResetPassword,
  getCurrentUser, logout, isLoggedIn, isAuthReady
} from './auth.js';

let pendingEmail = null; // রেজিস্ট্রেশন/ফরগট-এর সময় ইমেইল মনে রাখা

export function initAuthUI(onLoginSuccess) {
  const _onSuccess = onLoginSuccess || (() => {});

  // ---------- Form switching ----------
  const showRegister = $('#showRegister');
  const showForgot = $('#showForgot');
  const showLoginFromReg = $('#showLoginFromReg');
  const showLoginFromOtp = $('#showLoginFromOtp');
  const showLoginFromForgot = $('#showLoginFromForgot');
  const showLoginFromReset = $('#showLoginFromReset');
  const resendOtp = $('#resendOtp');

  function showForm(formId) {
    $$('.auth-form').forEach(f => f.classList.add('hidden'));
    $(`#${formId}`).classList.remove('hidden');
    hideAuthMessages();
  }

  if (showRegister) showRegister.addEventListener('click', (e) => { e.preventDefault(); showForm('registerForm'); });
  if (showForgot) showForgot.addEventListener('click', (e) => { e.preventDefault(); showForm('forgotForm'); });
  if (showLoginFromReg) showLoginFromReg.addEventListener('click', (e) => { e.preventDefault(); showForm('loginForm'); });
  if (showLoginFromOtp) showLoginFromOtp.addEventListener('click', (e) => { e.preventDefault(); showForm('loginForm'); });
  if (showLoginFromForgot) showLoginFromForgot.addEventListener('click', (e) => { e.preventDefault(); showForm('loginForm'); });
  if (showLoginFromReset) showLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); showForm('loginForm'); });
  if (resendOtp) resendOtp.addEventListener('click', (e) => {
    e.preventDefault();
    if (pendingEmail) {
      handleResendOTP(pendingEmail);
    }
  });

  // ---------- Login ----------
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    setButtonLoading(e.target, true);

    let result;
    if (isDemoMode()) {
      result = await demoLogin(email, password);
    } else {
      result = await login(email, password);
    }

    setButtonLoading(e.target, false);

    if (result.success) {
      showToast('স্বাগতম! লগইন সফল হয়েছে।', 'success');
      _onSuccess();
    } else if (result.needVerify) {
      pendingEmail = result.email || email;
      showForm('otpForm');
      if (isDemoMode()) {
        showAuthSuccess('ডেমো মোড: OTP হলো 123456');
      }
    } else {
      showAuthError(result.message);
    }
  });

  // ---------- Register ----------
  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    setButtonLoading(e.target, true);

    let result;
    if (isDemoMode()) {
      result = await demoRegister(email, password, name);
    } else {
      result = await register(email, password, name);
    }

    setButtonLoading(e.target, false);

    if (result.success) {
      pendingEmail = result.email || email;
      showForm('otpForm');
      if (isDemoMode()) {
        showAuthSuccess('ডেমো মোড: OTP হলো 123456');
      } else {
        showAuthSuccess(result.message || 'OTP আপনার ইমেইলে পাঠানো হয়েছে।');
      }
    } else {
      showAuthError(result.message);
    }
  });

  // ---------- OTP Verification ----------
  $('#otpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = $('#otpCode').value.trim();
    setButtonLoading(e.target, true);

    let result;
    if (isDemoMode()) {
      result = await demoVerifyOTP(pendingEmail, otp);
    } else {
      result = await verifyOTP(pendingEmail, otp);
    }

    setButtonLoading(e.target, false);

    if (result.success) {
      showToast('ইমেইল যাচাই সফল! অ্যাকাউন্ট অ্যাক্টিভ হয়েছে।', 'success');
      _onSuccess();
    } else {
      showAuthError(result.message);
    }
  });

  // ---------- Forgot Password ----------
  $('#forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#forgotEmail').value.trim();
    setButtonLoading(e.target, true);

    let result;
    if (isDemoMode()) {
      result = await demoForgotPassword(email);
    } else {
      result = await forgotPassword(email);
    }

    setButtonLoading(e.target, false);

    if (result.success) {
      pendingEmail = email;
      showForm('resetForm');
      if (isDemoMode()) {
        showAuthSuccess('ডেমো মোড: রিসেট OTP হলো 123456');
      } else {
        showAuthSuccess(result.message || 'রিসেট OTP আপনার ইমেইলে পাঠানো হয়েছে।');
      }
    } else {
      showAuthError(result.message);
    }
  });

  // ---------- Reset Password ----------
  $('#resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = $('#resetOtp').value.trim();
    const newPassword = $('#resetPassword').value;
    setButtonLoading(e.target, true);

    let result;
    if (isDemoMode()) {
      result = await demoResetPassword(pendingEmail, otp, newPassword);
    } else {
      result = await resetPassword(pendingEmail, otp, newPassword);
    }

    setButtonLoading(e.target, false);

    if (result.success) {
      showToast(result.message || 'পাসওয়ার্ড আপডেট হয়েছে। এখন লগইন করুন।', 'success');
      showForm('loginForm');
      pendingEmail = null;
    } else {
      showAuthError(result.message);
    }
  });
}

async function handleResendOTP(email) {
  if (isDemoMode()) {
    showAuthSuccess('ডেমো মোড: OTP হলো 123456');
    return;
  }
  const result = await sendEmailOTP(email);
  if (result.success) {
    showAuthSuccess('OTP পুনরায় পাঠানো হয়েছে।');
  } else {
    showAuthError('OTP পাঠাতে সমস্যা। আবার চেষ্টা করুন।');
  }
}

/* ---------- Helper functions ---------- */
function showAuthError(message) {
  const el = $('#authError');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  const success = $('#authSuccess');
  if (success) success.classList.add('hidden');
}

function showAuthSuccess(message) {
  const el = $('#authSuccess');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  const error = $('#authError');
  if (error) error.classList.add('hidden');
}

function hideAuthMessages() {
  const err = $('#authError');
  const suc = $('#authSuccess');
  if (err) err.classList.add('hidden');
  if (suc) suc.classList.add('hidden');
}

function setButtonLoading(form, loading) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner-small"></span> অপেক্ষা করুন...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || btn.textContent;
  }
}
