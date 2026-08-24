/* ============================================================
   pages/pyq.js — পূর্ববর্তী বছরের প্রশ্ন (PYQ)
   বিগত পরীক্ষার প্রশ্ন ব্রাউজ ও অনুশীলন
============================================================ */

import { $, el, escapeHTML, fetchJSON, loadingHTML, emptyStateHTML, showToast } from '../utils.js';
import { QuizEngine } from '../ui.js';
import { addPracticeResult, recordDailyActivity } from '../store.js';

let pyqIndex = null;

export async function renderPYQ(content) {
  content.innerHTML = `<h1 class="page-title">📄 পূর্ববর্তী বছরের প্রশ্ন</h1>
    <p class="page-subtitle">বিগত পরীক্ষার প্রশ্ন</p>
    ${loadingHTML('লোড হচ্ছে...')}`;

  try {
    if (!pyqIndex) {
      pyqIndex = await fetchJSON('pyq_index.json');
    }

    if (!pyqIndex || pyqIndex.length === 0) {
      content.innerHTML = `
        <h1 class="page-title">📄 পূর্ববর্তী বছরের প্রশ্ন</h1>
        <p class="page-subtitle">বিগত পরীক্ষার প্রশ্ন</p>
        ${emptyStateHTML('📭', 'কোনো PYQ ডেটা পাওয়া যায়নি।', 'পরে আবার চেক করুন।')}
      `;
      return;
    }

    // Group by year
    const byYear = {};
    pyqIndex.forEach(p => {
      if (!byYear[p.year]) byYear[p.year] = [];
      byYear[p.year].push(p);
    });

    const years = Object.keys(byYear).sort((a, b) => b - a);
    const totalQuestions = pyqIndex.reduce((s, p) => s + (p.questionCount || 0), 0);

    content.innerHTML = `
      <h1 class="page-title">📄 পূর্ববর্তী বছরের প্রশ্ন</h1>
      <p class="page-subtitle">বিগত পরীক্ষার প্রশ্ন ব্রাউজ ও অনুশীলন</p>

      <div class="card text-center mb-3">
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value">${years.length}</div><div class="stat-label">বছর</div></div>
          <div class="stat-card"><div class="stat-value">${pyqIndex.length}</div><div class="stat-label">প্রশ্নপত্র</div></div>
          <div class="stat-card"><div class="stat-value">${totalQuestions}</div><div class="stat-label">মোট প্রশ্ন</div></div>
        </div>
      </div>

      ${years.map(year => `
        <div class="card mb-2">
          <div class="card-title">📅 ${escapeHTML(year)}</div>
          <div class="grid grid-auto">
            ${byYear[year].map(p => `
              <div class="list-item pyq-item" data-slug="${escapeHTML(p.slug)}" style="cursor:pointer;">
                <div>
                  <span class="list-item-title">${escapeHTML(p.title || p.subject)}</span>
                  ${p.subject ? `<span class="badge badge-info" style="margin-left:0.5rem;">${escapeHTML(p.subject)}</span>` : ''}
                </div>
                <div class="list-item-meta">
                  ${p.questionCount || '?'} প্রশ্ন · ${p.duration ? (p.duration/60000)+' মিনিট' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    `;

    // Attach handlers
    document.querySelectorAll('.pyq-item').forEach(item => {
      item.addEventListener('click', () => {
        const slug = item.getAttribute('data-slug');
        startPYQ(slug, content);
      });
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>ডেটা লোড ব্যর্থ: ${escapeHTML(e.message)}</p></div>`;
  }
}

async function startPYQ(slug, content) {
  const meta = pyqIndex.find(p => p.slug === slug);
  if (!meta) return;

  content.innerHTML = `<h1 class="page-title">📄 ${escapeHTML(meta.title || meta.subject)}</h1>
    ${loadingHTML('প্রশ্ন লোড হচ্ছে...')}`;

  try {
    const questions = await fetchJSON(`pyqs/${slug}.json`);
    const withAnswers = questions.filter(q => q.answer);

    if (withAnswers.length === 0) {
      showToast('এই প্রশ্নপত্রে উত্তরসহ প্রশ্ন নেই।', 'warning');
      renderPYQ(content);
      return;
    }

    content.innerHTML = `
      <h1 class="page-title">📄 ${escapeHTML(meta.title || meta.subject)}</h1>
      <p class="page-subtitle">${escapeHTML(meta.year)} · ${withAnswers.length} প্রশ্ন</p>

      <div class="card mb-3">
        <div class="card-title">ℹ️ তথ্য</div>
        <p class="text-secondary" style="font-size:0.85rem;">
          এই প্রশ্নপত্রে ${withAnswers.length} টি প্রশ্ন উপলব্ধ।
          প্রতিটি প্রশ্নের উত্তর ও ব্যাখ্যা সাথে সাথে দেখতে পাবেন।
        </p>
        <button class="btn btn-primary" id="startPYQBtn">অনুশীলন শুরু করুন</button>
        <button class="btn btn-secondary" id="backBtn" style="margin-left:0.5rem;">← ফিরে যান</button>
      </div>
    `;

    $('#backBtn').addEventListener('click', () => renderPYQ(content));
    $('#startPYQBtn').addEventListener('click', () => {
      const engine = new QuizEngine({
        questions: withAnswers,
        title: meta.title || meta.subject,
        showExplanation: true,
        showAnswerImmediately: true,
        allowNav: false,
        timerMs: meta.duration || null,
        onComplete: async (result) => {
          await addPracticeResult({
            subject: `PYQ ${meta.year}: ${meta.subject || ''}`.trim(),
            score: result.score,
            total: result.total,
            timeTaken: result.timeTaken,
            details: result.details
          });
          await recordDailyActivity('pyq');
          showToast(`অনুশীলন সম্পন্ন! স্কোর: ${result.score}/${result.total}`, 'success');
        }
      });
      engine.start();
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>প্রশ্ন লোড ব্যর্থ: ${escapeHTML(e.message)}</p></div>`;
  }
}
