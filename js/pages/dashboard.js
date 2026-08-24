/* ============================================================
   pages/dashboard.js — ড্যাশবোর্ড পেজ
   ব্যবহারকারীর প্রগতি পরিসংখ্যান, ভিজ্যুয়াল প্রোগ্রেস
============================================================ */

import { $, el, escapeHTML, formatDate, formatPercent } from '../utils.js';
import { getStats, getStudyPlan, getTodayGoal } from '../store.js';
import { statCard, progressBar, circleProgressSVG } from '../ui.js';
import { SUBJECTS } from '../config.js';

export function renderDashboard(content) {
  const stats = getStats();
  const plan = getStudyPlan();
  const todayGoal = getTodayGoal();

  // Subject performance cards
  let subjectCardsHTML = '';
  if (stats.subjectPerf && Object.keys(stats.subjectPerf).length > 0) {
    subjectCardsHTML = '<div class="grid grid-auto mt-3">';
    for (const subj in stats.subjectPerf) {
      const perf = stats.subjectPerf[subj];
      subjectCardsHTML += `
        <div class="card">
          <div class="card-title">${escapeHTML(subj)}</div>
          ${progressBar(perf.avg, 'গড় স্কোর')}
          <p class="text-secondary" style="font-size:0.8rem;margin-top:0.5rem;">${perf.count} বার অংশগ্রহণ</p>
        </div>`;
    }
    subjectCardsHTML += '</div>';
  }

  // Study plan progress
  let planHTML = '';
  if (plan) {
    const daysLeft = Math.max(0, Math.ceil((new Date(plan.examDate) - new Date()) / (1000*60*60*24)));
    const totalDays = plan.schedule.length;
    const completedDays = plan.schedule.filter(d => d.completed).length;
    planHTML = `
      <div class="card mt-3">
        <div class="card-title">📅 পড়ার প্ল্যান</div>
        <p class="text-secondary" style="font-size:0.85rem;margin-bottom:0.5rem;">
          পরীক্ষার তারিখ: ${escapeHTML(formatDate(plan.examDate))} (${daysLeft} দিন বাকি)
        </p>
        ${progressBar((completedDays / totalDays) * 100, 'প্ল্যান অগ্রগতি')}
      </div>
    `;
  }

  // Recent activity
  let recentHTML = '';
  const allActivity = [
    ...stats.quizHistory.slice(-3).map(q => ({ type: '🧠 কুইজ', subject: q.subject, score: `${q.score}/${q.total}`, date: q.date })),
    ...stats.mockTestHistory.slice(-3).map(m => ({ type: '📝 মক টেস্ট', subject: '', score: `${m.score}/${m.total}`, date: m.date })),
    ...stats.practiceHistory.slice(-3).map(p => ({ type: '✏️ প্র্যাকটিস', subject: p.subject, score: `${p.score}/${p.total}`, date: p.date }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (allActivity.length > 0) {
    recentHTML = `
      <div class="card mt-3">
        <div class="card-title">🕒 সাম্প্রতিক কার্যকলাপ</div>
        ${allActivity.map(a => `
          <div class="list-item" style="cursor:default;">
            <div>
              <span class="list-item-title">${a.type}</span>
              ${a.subject ? `<span class="badge badge-info" style="margin-left:0.5rem;">${escapeHTML(a.subject)}</span>` : ''}
            </div>
            <div class="list-item-meta">
              <span class="text-success">${a.score}</span> · ${escapeHTML(formatDate(a.date))}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Daily goal completion
  const goalChaptersPct = todayGoal.chapters > 0 ? (todayGoal.chaptersDone / todayGoal.chapters) * 100 : 0;
  const goalQuizPct = todayGoal.quizzes > 0 ? (todayGoal.quizzesDone / todayGoal.quizzes) * 100 : 0;

  content.innerHTML = `
    <h1 class="page-title">📊 ড্যাশবোর্ড</h1>
    <p class="page-subtitle">আপনার প্রস্তুতির সারসংক্ষেপ</p>

    <!-- Stat Cards -->
    <div class="stat-grid">
      ${statCard('📚', stats.chaptersRead, 'অধ্যায় পড়া হয়েছে')}
      ${statCard('✏️', stats.totalQuizzes, 'প্র্যাকটিস/কুইজ')}
      ${statCard('📝', stats.totalMockTests, 'মক টেস্ট')}
      ${statCard('🎯', stats.avgScore + '%', 'গড় স্কোর')}
      ${statCard('🔥', stats.streak, 'দিনের স্ট্রিক')}
      ${statCard('🏆', stats.bestStreak, 'সেরা স্ট্রিক')}
    </div>

    <!-- Daily Goal & Overall Progress -->
    <div class="grid grid-2 mt-2">
      <div class="card text-center">
        <div class="card-title">🎯 আজকের লক্ষ্য</div>
        ${circleProgressSVG(stats.goalPercent)}
        <div class="mt-2">
          <div style="font-size:0.85rem;margin-bottom:0.3rem;">📖 অধ্যায়: ${todayGoal.chaptersDone}/${todayGoal.chapters || 2}</div>
          ${progressBar(goalChaptersPct)}
          <div style="font-size:0.85rem;margin:0.5rem 0 0.3rem;">🧠 কুইজ: ${todayGoal.quizzesDone}/${todayGoal.quizzes || 1}</div>
          ${progressBar(goalQuizPct)}
        </div>
      </div>
      <div class="card">
        <div class="card-title">📈 বিষয়ভিত্তিক পারফরম্যান্স</div>
        ${stats.subjectPerf && Object.keys(stats.subjectPerf).length > 0 ? subjectCardsHTML : '<p class="text-secondary" style="font-size:0.85rem;">এখনও কোনো কুইজ/টেস্ট দেওয়া হয়নি।</p>'}
      </div>
    </div>

    ${planHTML}

    ${recentHTML}

    ${allActivity.length === 0 && !plan ? `
      <div class="empty-state mt-3">
        <div class="empty-state-icon">🚀</div>
        <p>শুরু করতে <strong>পড়াশোনা</strong> বা <strong>প্র্যাকটিস</strong> পেজে যান।</p>
      </div>
    ` : ''}
  `;
}
