/* ============================================================
   store.js — ব্যবহারকারীর প্রগতি সেভ/লোড
   ------------------------------------------------------------
   localStorage দ্রুত অ্যাক্সেসের জন্য, Supabase টেবিল
   সব ডিভাইসে সিঙ্কের জন্য। যদি Supabase কনফিগার না থাকে,
   শুধু localStorage ব্যবহৃত হয়।
============================================================ */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config.js';
import { getCurrentUser } from './auth.js';
import { todayStr } from './utils.js';

const LS_KEY = 'gp_progress';

/* ---------- Default progress structure ---------- */
function defaultProgress() {
  return {
    chaptersRead: {},        // { "subject_slug__chapter_slug": true }
    quizHistory: [],         // [{ id, subject, score, total, date, timeTaken }]
    mockTestHistory: [],     // [{ id, score, total, date, timeTaken, details }]
    practiceHistory: [],     // [{ id, subject, score, total, date }]
    studyPlan: null,         // { examDate, startDate, days, schedule: [] }
    dailyGoals: {},          // { "2026-01-15": { chapters: 2, quizzes: 1, done: false } }
    streak: {
      current: 0,
      best: 0,
      lastActive: null
    },
    lastUpdated: null
  };
}

/* ---------- Load from localStorage ---------- */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    // merge with defaults to handle new fields
    return { ...defaultProgress(), ...parsed };
  } catch (e) {
    return defaultProgress();
  }
}

/* ---------- Save to localStorage ---------- */
function saveLocal(progress) {
  progress.lastUpdated = new Date().toISOString();
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(progress));
  } catch (e) {
    // localStorage ফুল হলে পুরোনো quiz/practice history ছাঁটাও
    if (progress.quizHistory.length > 50) progress.quizHistory = progress.quizHistory.slice(-50);
    if (progress.practiceHistory.length > 50) progress.practiceHistory = progress.practiceHistory.slice(-50);
    try { localStorage.setItem(LS_KEY, JSON.stringify(progress)); } catch (e2) {}
  }
}

/* ---------- Save to Supabase (if configured) ---------- */
async function saveRemote(progress) {
  if (!isSupabaseConfigured()) return;
  const user = getCurrentUser();
  if (!user || !user.accessToken) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${user.accessToken}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_email: user.email,
        data: progress,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('Remote save failed:', e.message);
  }
}

/* ---------- Universal save ---------- */
export async function saveProgress(progress) {
  saveLocal(progress);
  // remote save হবে background-এ, await করার দরকার নেই
  saveRemote(progress);
}

/* ---------- Load from Supabase (merge with local) ---------- */
export async function loadRemoteProgress() {
  if (!isSupabaseConfigured()) return null;
  const user = getCurrentUser();
  if (!user || !user.accessToken) return null;
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/progress?user_email=eq.${encodeURIComponent(user.email)}&select=data&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${user.accessToken}`
      }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.length > 0) return data[0].data;
    return null;
  } catch (e) {
    return null;
  }
}

/* ============================================================
   Progress API — specific operations
============================================================ */

let _progress = null;

export function getProgress() {
  if (!_progress) _progress = loadProgress();
  return _progress;
}

export async function updateProgress(updater) {
  const p = getProgress();
  updater(p);
  await saveProgress(p);
  return p;
}

/* ---------- Chapter progress ---------- */
export function markChapterRead(subjectSlug, chapterSlug) {
  const key = `${subjectSlug}__${chapterSlug}`;
  return updateProgress(p => {
    p.chaptersRead[key] = true;
    updateStreak(p);
  });
}

export function isChapterRead(subjectSlug, chapterSlug) {
  const key = `${subjectSlug}__${chapterSlug}`;
  return getProgress().chaptersRead[key] === true;
}

export function getChaptersReadCount() {
  return Object.keys(getProgress().chaptersRead).filter(k => getProgress().chaptersRead[k]).length;
}

/* ---------- Quiz / Test history ---------- */
export function addQuizResult(result) {
  return updateProgress(p => {
    p.quizHistory.push({ ...result, date: new Date().toISOString() });
    if (p.quizHistory.length > 100) p.quizHistory = p.quizHistory.slice(-100);
    updateStreak(p);
  });
}

export function addMockTestResult(result) {
  return updateProgress(p => {
    p.mockTestHistory.push({ ...result, date: new Date().toISOString() });
    if (p.mockTestHistory.length > 50) p.mockTestHistory = p.mockTestHistory.slice(-50);
    updateStreak(p);
  });
}

export function addPracticeResult(result) {
  return updateProgress(p => {
    p.practiceHistory.push({ ...result, date: new Date().toISOString() });
    if (p.practiceHistory.length > 100) p.practiceHistory = p.practiceHistory.slice(-100);
    updateStreak(p);
  });
}

/* ---------- Study Plan ---------- */
export function setStudyPlan(plan) {
  return updateProgress(p => {
    p.studyPlan = plan;
  });
}

export function getStudyPlan() {
  return getProgress().studyPlan;
}

export function clearStudyPlan() {
  return updateProgress(p => {
    p.studyPlan = null;
  });
}

/* ---------- Daily Goals ---------- */
export function getTodayGoal() {
  const today = todayStr();
  const p = getProgress();
  if (!p.dailyGoals[today]) {
    return { chapters: 0, quizzes: 0, mockTests: 0, chaptersDone: 0, quizzesDone: 0, mockTestsDone: 0 };
  }
  return p.dailyGoals[today];
}

export function recordDailyActivity(type) {
  const today = todayStr();
  return updateProgress(p => {
    if (!p.dailyGoals[today]) {
      p.dailyGoals[today] = { chapters: 2, quizzes: 1, mockTests: 0, chaptersDone: 0, quizzesDone: 0, mockTestsDone: 0 };
    }
    const goal = p.dailyGoals[today];
    if (type === 'chapter') goal.chaptersDone++;
    if (type === 'quiz') goal.quizzesDone++;
    if (type === 'mock') goal.mockTestsDone++;
  });
}

/* ---------- Streak ---------- */
function updateStreak(p) {
  const today = todayStr();
  if (p.streak.lastActive === today) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  if (p.streak.lastActive === yStr) {
    p.streak.current++;
  } else {
    p.streak.current = 1;
  }
  if (p.streak.current > p.streak.best) p.streak.best = p.streak.current;
  p.streak.lastActive = today;

  // daily goal init
  if (!p.dailyGoals[today]) {
    p.dailyGoals[today] = { chapters: 2, quizzes: 1, mockTests: 0, chaptersDone: 0, quizzesDone: 0, mockTestsDone: 0 };
  }
}

export function getStreak() {
  return getProgress().streak;
}

/* ---------- Stats for Dashboard ---------- */
export function getStats() {
  const p = getProgress();
  const chaptersRead = Object.values(p.chaptersRead).filter(v => v).length;
  const totalQuizzes = p.quizHistory.length + p.practiceHistory.length;
  const totalMockTests = p.mockTestHistory.length;
  const allScores = [
    ...p.quizHistory.map(q => ({ score: q.score, total: q.total, subject: q.subject })),
    ...p.practiceHistory.map(q => ({ score: q.score, total: q.total, subject: q.subject })),
    ...p.mockTestHistory.map(m => ({ score: m.score, total: m.total, subject: 'মক টেস্ট' }))
  ];
  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((s, x) => s + (x.score / x.total) * 100, 0) / allScores.length)
    : 0;

  // daily goal completion
  const today = todayStr();
  const todayGoal = p.dailyGoals[today] || { chapters: 2, quizzes: 1, chaptersDone: 0, quizzesDone: 0 };
  const goalTotal = (todayGoal.chapters || 0) + (todayGoal.quizzes || 0);
  const goalDone = (todayGoal.chaptersDone || 0) + (todayGoal.quizzesDone || 0);
  const goalPercent = goalTotal > 0 ? Math.round((goalDone / goalTotal) * 100) : 0;

  // subject-wise performance
  const subjectPerf = {};
  allScores.forEach(s => {
    if (!s.subject) return;
    if (!subjectPerf[s.subject]) subjectPerf[s.subject] = { scores: [], count: 0 };
    subjectPerf[s.subject].scores.push(s.total > 0 ? (s.score / s.total) * 100 : 0);
    subjectPerf[s.subject].count++;
  });
  for (const subj in subjectPerf) {
    const scores = subjectPerf[subj].scores;
    subjectPerf[subj].avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return {
    chaptersRead,
    totalQuizzes,
    totalMockTests,
    avgScore,
    goalPercent,
    streak: p.streak.current,
    bestStreak: p.streak.best,
    subjectPerf,
    quizHistory: p.quizHistory,
    mockTestHistory: p.mockTestHistory,
    practiceHistory: p.practiceHistory
  };
}

/* ---------- Reset all progress ---------- */
export function resetProgress() {
  _progress = defaultProgress();
  localStorage.removeItem(LS_KEY);
}
