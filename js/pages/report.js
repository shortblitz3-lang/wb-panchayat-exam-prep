/* ============================================================
   pages/report.js — রিপোর্ট ও বিশ্লেষণ
   পরিসংখ্যান, চার্ট, দুর্বল বিষয় চিহ্নিতকরণ
============================================================ */

import { $, el, escapeHTML, formatDate, formatPercent } from '../utils.js';
import { getStats, getQuizHistory, getMockTestHistory, getPracticeHistory } from '../store.js';
import { statCard, progressBar, circleProgressSVG } from '../ui.js';

export function renderReport(content) {
  const stats = getStats();
  const quizHistory = getQuizHistory();
  const mockHistory = getMockTestHistory();
  const practiceHistory = getPracticeHistory();

  // Overall summary
  const totalAttempts = stats.totalQuizzes + stats.totalMockTests;
  const avgPct = stats.avgScore;

  // Subject-wise analysis
  const subjectAnalysis = {};
  const allResults = [
    ...quizHistory.map(q => ({ subject: q.subject, score: q.score, total: q.total, date: q.date, type: 'কুইজ' })),
    ...practiceHistory.map(p => ({ subject: p.subject, score: p.score, total: p.total, date: p.date, type: 'প্র্যাকটিস' })),
    ...mockHistory.map(m => ({ subject: 'মক টেস্ট', score: m.score, total: m.total, date: m.date, type: 'মক' }))
  ];

  allResults.forEach(r => {
    if (!subjectAnalysis[r.subject]) {
      subjectAnalysis[r.subject] = { count: 0, totalScore: 0, totalMax: 0, recent: [] };
    }
    subjectAnalysis[r.subject].count++;
    subjectAnalysis[r.subject].totalScore += r.score;
    subjectAnalysis[r.subject].totalMax += r.total;
    subjectAnalysis[r.subject].recent.push(r);
  });

  // Identify weak subjects (below average)
  const subjectStats = Object.entries(subjectAnalysis).map(([subj, data]) => ({
    subject: subj,
    count: data.count,
    avg: data.totalMax > 0 ? (data.totalScore / data.totalMax) * 100 : 0,
    recent: data.recent.slice(-5)
  })).sort((a, b) => a.avg - b.avg);

  const weakSubjects = subjectStats.filter(s => s.avg < avgPct && s.subject !== 'মক টেস্ট');
  const strongSubjects = subjectStats.filter(s => s.avg >= avgPct && s.subject !== 'মক টেস্ট');

  // Timeline data (last 10 attempts)
  const timeline = [...allResults].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-10);

  // Mock test trend
  const mockTrend = [...mockHistory].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-5);

  content.innerHTML = `
    <h1 class="page-title">📊 রিপোর্ট ও বিশ্লেষণ</h1>
    <p class="page-subtitle">আপনার প্রস্তুতির বিস্তারিত বিশ্লেষণ</p>

    <!-- Overall Summary -->
    <div class="stat-grid mb-3">
      ${statCard('📚', totalAttempts, 'মোট অংশগ্রহণ')}
      ${statCard('🎯', avgPct + '%', 'গড় স্কোর')}
      ${statCard('📝', stats.totalMockTests, 'মক টেস্ট')}
      ${statCard('🔥', stats.streak, 'বর্তমান স্ট্রিক')}
    </div>

    <!-- Mock Test Performance Trend -->
    ${mockTrend.length > 0 ? `
      <div class="card mb-3">
        <div class="card-title">📈 মক টেস্ট ট্রেন্ড</div>
        ${mockTrend.map((m, i) => {
          const pct = m.total > 0 ? (m.score / m.total) * 100 : 0;
          return `
            <div style="margin-bottom:0.5rem;">
              <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.2rem;">
                <span>${escapeHTML(formatDate(m.date))}</span>
                <span class="${pct >= MOCK_PASS ? 'text-success' : 'text-danger'}">${m.score}/${m.total} (${formatPercent(pct)}%)</span>
              </div>
              ${progressBar(pct)}
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <!-- Subject Performance -->
    ${subjectStats.length > 0 ? `
      <div class="card mb-3">
        <div class="card-title">📋 বিষয়ভিত্তিক পারফরম্যান্স</div>
        ${subjectStats.map(s => `
          <div style="margin-bottom:0.8rem;">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.2rem;">
              <span>${escapeHTML(s.subject)}</span>
              <span class="${s.avg >= avgPct ? 'text-success' : 'text-danger'}">${formatPercent(s.avg)}% (${s.count} বার)</span>
            </div>
            ${progressBar(s.avg)}
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Weak & Strong Subjects -->
    ${weakSubjects.length > 0 ? `
      <div class="card mb-3" style="border-left:3px solid var(--danger);">
        <div class="card-title">⚠️ দুর্বল বিষয়</div>
        <p class="text-secondary" style="font-size:0.85rem;margin-bottom:0.5rem;">এই বিষয়গুলোতে আরও অনুশীলন দরকার।</p>
        ${weakSubjects.map(s => `
          <div class="list-item" style="cursor:default;">
            <div>
              <span class="list-item-title">${escapeHTML(s.subject)}</span>
              <span class="badge badge-danger" style="margin-left:0.5rem;">${formatPercent(s.avg)}%</span>
            </div>
            <div class="list-item-meta">${s.count} বার অংশগ্রহণ</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${strongSubjects.length > 0 ? `
      <div class="card mb-3" style="border-left:3px solid var(--success);">
        <div class="card-title">💪 শক্তিশালী বিষয়</div>
        ${strongSubjects.map(s => `
          <div class="list-item" style="cursor:default;">
            <div>
              <span class="list-item-title">${escapeHTML(s.subject)}</span>
              <span class="badge badge-success" style="margin-left:0.5rem;">${formatPercent(s.avg)}%</span>
            </div>
            <div class="list-item-meta">${s.count} বার অংশগ্রহণ</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Recent Activity Timeline -->
    ${timeline.length > 0 ? `
      <div class="card mb-3">
        <div class="card-title">🕒 সাম্প্রতিক কার্যকলাপ</div>
        ${timeline.map(t => {
          const pct = t.total > 0 ? (t.score / t.total) * 100 : 0;
          return `
            <div class="list-item" style="cursor:default;">
              <div>
                <span class="list-item-title">${escapeHTML(t.type)}</span>
                ${t.subject && t.subject !== 'মক টেস্ট' ? `<span class="badge badge-info" style="margin-left:0.5rem;">${escapeHTML(t.subject)}</span>` : ''}
              </div>
              <div class="list-item-meta">
                <span class="${pct >= 50 ? 'text-success' : 'text-danger'}">${t.score}/${t.total}</span> · ${escapeHTML(formatDate(t.date))}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    ${totalAttempts === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>রিপোর্ট দেখতে অন্তত একটি কুইজ বা মক টেস্ট দিন।</p>
      </div>
    ` : ''}
  `;
}

// Inline constant (avoid import cycle if config changes)
const MOCK_PASS = 40;
