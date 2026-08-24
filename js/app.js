/* ============================================================
   app.js — মূল অ্যাপ্লিকেশন এন্ট্রি পয়েন্ট
   ------------------------------------------------------------
   অথেন্টিকেশন গার্ড → রাউটার → পেজ রেন্ডারিং
   লগইন না করা পর্যন্ত শুধু অথ স্ক্রিন দেখায়।
============================================================ */

import { $, $$, showToast } from './utils.js';
import { isLoggedIn, getCurrentUser, logout, isAuthReady, isDemoMode } from './auth.js';
import { initAuthUI } from './authUI.js';
import { loadRemoteProgress } from './store.js';

// Page modules (lazy loaded — প্রয়োজনেই import হয়)
const pageLoaders = {
  'dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard),
  'study': () => import('./pages/study.js').then(m => m.renderStudy),
  'study-plan': () => import('./pages/studyPlan.js').then(m => m.renderStudyPlan),
  'practice': () => import('./pages/practice.js').then(m => m.renderPractice),
  'mock-test': () => import('./pages/mockTest.js').then(m => m.renderMockTest),
  'quiz': () => import('./pages/quiz.js').then(m => m.renderQuiz),
  'current-affairs': () => import('./pages/currentAffairs.js').then(m => m.renderCurrentAffairs),
  'pyq': () => import('./pages/pyq.js').then(m => m.renderPYQ),
  'report': () => import('./pages/report.js').then(m => m.renderReport)
};

let currentPage = null;

/* ============================================================
   INIT
============================================================ */
async function init() {
  // Supabase কনফিগার করা আছে কিনা যাচাই
  if (!isAuthReady()) {
    // ডেমো মোডে চলবে — কনফিগ পেজ দেখাবে
    showDemoNotice();
  }

  // লোকাল সেশন চেক
  if (isLoggedIn()) {
    await onAuthSuccess();
  } else {
    showAuthScreen();
  }
}

function showDemoNotice() {
  console.log('%c⚠️ ডেমো মোড চলছে — js/config.js এ Supabase URL ও Key বসান। ডেমো OTP: 123456', 'color:#f59e0b;font-size:14px;font-weight:bold;');
}

/* ============================================================
   AUTH SCREEN
============================================================ */
function showAuthScreen() {
  $('#loadingScreen').classList.add('hidden');
  $('#app').classList.add('hidden');
  $('#authScreen').classList.remove('hidden');

  // ডেমো মোড নোটিশ
  if (isDemoMode()) {
    const note = document.createElement('div');
    note.style.cssText = 'text-align:center;margin-top:1rem;padding:0.8rem;background:rgba(245,158,11,0.1);border-radius:8px;font-size:0.8rem;color:#f59e0b;';
    note.innerHTML = '⚠️ <strong>ডেমো মোড</strong>: Supabase কনফিগার করা নেই।<br>যেকোনো ইমেইল/পাসওয়ার্ড দিয়ে রেজিস্টার করুন।<br>OTP: <strong>123456</strong>';
    const authCard = $('.auth-card');
    if (authCard && !$('#demoNotice')) {
      note.id = 'demoNotice';
      authCard.appendChild(note);
    }
  }

  initAuthUI(onAuthSuccess);
}

/* ============================================================
   AUTH SUCCESS — অ্যাপ দেখানো শুরু
============================================================ */
async function onAuthSuccess() {
  const user = getCurrentUser();
  if (!user) return;

  // রিমোট প্রগতি লোড (যদি Supabase কনফিগার থাকে)
  await loadRemoteProgress();

  // স্ক্রিন সুইচ
  $('#loadingScreen').classList.add('hidden');
  $('#authScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');

  // ইউজার নাম দেখানো
  $('#userName').textContent = user.name || user.email;

  // লগআউট বাটন
  $('#logoutBtn').addEventListener('click', handleLogout);

  // সাইডবার টগল
  initSidebar();

  // রাউটার শুরু
  initRouter();
}

/* ============================================================
   LOGOUT
============================================================ */
async function handleLogout() {
  if (!confirm('লগআউট করতে চান?')) return;
  await logout();
  showToast('লগআউট সফল।', 'info');
  $('#app').classList.add('hidden');
  showAuthScreen();
}

/* ============================================================
   SIDEBAR (mobile)
============================================================ */
function initSidebar() {
  const menuToggle = $('#menuToggle');
  const sidebar = $('#sidebar');
  const overlay = $('#sidebarOverlay');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }

  // Close sidebar on nav click (mobile)
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      }
    });
  });
}

/* ============================================================
   ROUTER — hash-based SPA routing
============================================================ */
function initRouter() {
  // প্রাথমিক রুট
  handleRoute();

  // hash পরিবর্তনে রুট হ্যান্ডেল
  window.addEventListener('hashchange', handleRoute);
}

async function handleRoute() {
  const hash = window.location.hash || '#/dashboard';
  const route = hash.replace('#/', '').split('?')[0];

  // ডিফল্ট ড্যাশবোর্ড
  const page = route || 'dashboard';

  // active nav আপডেট
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // পেজ লোড
  const content = $('#content');
  if (!content) return;

  // স্ক্রল টপ
  content.scrollTop = 0;
  window.scrollTo(0, 0);

  const loader = pageLoaders[page];
  if (loader) {
    try {
      const renderFn = await loader();
      await renderFn(content);
    } catch (e) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>পেজ লোড ব্যর্থ: ${e.message}</p></div>`;
      console.error('Page load error:', e);
    }
  } else {
    // অজানা রুট — ড্যাশবোর্ডে পাঠাও
    window.location.hash = '#/dashboard';
  }

  currentPage = page;
}

/* ============================================================
   START
============================================================ */
// DOM ready হলে শুরু
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
