/* ============================================================
   pages/practice.js — প্র্যাকটিস মোড
   বিষয়ভিত্তিক চর্চা — সাথে সাথে উত্তর ও ব্যাখ্যা
============================================================ */

import { $, el, escapeHTML, fetchJSON, loadingHTML, emptyStateHTML, showToast } from '../utils.js';
import { QuizEngine } from '../ui.js';
import { addPracticeResult, recordDailyActivity } from '../store.js';

let mcqIndex = null;

export async function renderPractice(content) {
  content.innerHTML = `<h1 class="page-title">✏️ প্র্যাকটিস</h1>
    <p class="page-subtitle">বিষয়ভিত্তিক চর্চা</p>
    ${loadingHTML('বিষয়সমূহ লোড হচ্ছে...')}`;

  try {
    if (!mcqIndex) {
      mcqIndex = await fetchJSON('mcq_index.json');
    }

    const totalQuestions = mcqIndex.reduce((s, m) => s + m.withAnswer, 0);

    content.innerHTML = `
      <h1 class="page-title">✏️ প্র্যাকটিস</h1>
      <p class="page-subtitle">বিষয়ভিত্তিক চর্চা — সাথে সাথে সঠিক উত্তর ও ব্যাখ্যা দেখুন</p>

      <div class="card text-center mb-3">
        <div class="card-title">📊 মোট প্রশ্ন: ${totalQuestions}</div>
        <p class="text-secondary" style="font-size:0.85rem;">
          যেকোনো বিষয় নির্বাচন করে অনুশীলন শুরু করুন।
        </p>
      </div>

      <div class="grid grid-auto">
        ${mcqIndex.map(m => `
          <div class="card practice-card" data-slug="${escapeHTML(m.slug)}" style="cursor:pointer;">
            <div class="card-title">${escapeHTML(m.subject)}</div>
            <div class="stat-grid" style="margin:0.5rem 0;">
              <div class="stat-card" style="padding:0.5rem;">
                <div class="stat-value" style="font-size:1.2rem;">${m.withAnswer}</div>
                <div class="stat-label">উত্তরসহ</div>
              </div>
              <div class="stat-card" style="padding:0.5rem;">
                <div class="stat-value" style="font-size:1.2rem;">${m.withoutAnswer}</div>
                <div class="stat-label">উত্তরছাড়া</div>
              </div>
            </div>
            <button class="btn btn-primary btn-block">প্র্যাকটিস শুরু করুন</button>
          </div>
        `).join('')}
      </div>
    `;

    // Attach click handlers
    document.querySelectorAll('.practice-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.getAttribute('data-slug');
        startPractice(slug, content);
      });
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>ডেটা লোড ব্যর্থ: ${escapeHTML(e.message)}</p></div>`;
  }
}

async function startPractice(slug, content) {
  const meta = mcqIndex.find(m => m.slug === slug);
  if (!meta) return;

  content.innerHTML = `<h1 class="page-title">✏️ প্র্যাকটিস: ${escapeHTML(meta.subject)}</h1>
    ${loadingHTML('প্রশ্ন লোড হচ্ছে...')}`;

  try {
    const questions = await fetchJSON(`mcqs/${slug}.json`);
    const withAnswers = questions.filter(q => q.answer);

    if (withAnswers.length === 0) {
      showToast('এই বিষয়ে উত্তরসহ প্রশ্ন নেই।', 'warning');
      renderPractice(content);
      return;
    }

    // Practice options
    content.innerHTML = `
      <h1 class="page-title">✏️ প্র্যাকটিস: ${escapeHTML(meta.subject)}</h1>
      <p class="page-subtitle">${withAnswers.length} টি প্রশ্ন উপলব্ধ</p>

      <div class="card mb-3">
        <div class="card-title">⚙️ অপশন নির্বাচন</div>
        <div class="form-group">
          <label>প্রশ্ন সংখ্যা</label>
          <select id="practiceQuestionCount">
            <option value="10">১০ প্রশ্ন</option>
            <option value="20" selected>২০ প্রশ্ন</option>
            <option value="50">৫০ প্রশ্ন</option>
            <option value="${withAnswers.length}">সব (${withAnswers.length})</option>
          </select>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="practiceShuffle" checked> প্রশ্ন এলোমেলো করুন
          </label>
        </div>
        <button class="btn btn-primary" id="startPracticeBtn">শুরু করুন</button>
      </div>

      <button class="btn btn-secondary" id="backBtn">← বিষয় তালিকায় ফিরে যান</button>
    `;

    $('#backBtn').addEventListener('click', () => renderPractice(content));
    $('#startPracticeBtn').addEventListener('click', () => {
      const count = parseInt($('#practiceQuestionCount').value);
      const shuffleQs = $('#practiceShuffle').checked;

      let selected = [...withAnswers];
      if (shuffleQs) selected = selected.sort(() => Math.random() - 0.5);
      selected = selected.slice(0, count);

      const engine = new QuizEngine({
        questions: selected,
        title: `প্র্যাকটিস: ${meta.subject}`,
        showExplanation: true,
        showAnswerImmediately: true,
        allowNav: false,
        onComplete: async (result) => {
          await addPracticeResult({
            subject: meta.subject,
            score: result.score,
            total: result.total,
            timeTaken: result.timeTaken,
            details: result.details
          });
          await recordDailyActivity('practice');
          showToast(`প্র্যাকটিস সম্পন্ন! স্কোর: ${result.score}/${result.total}`, 'success');
        }
      });
      engine.start();
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>প্রশ্ন লোড ব্যর্থ: ${escapeHTML(e.message)}</p></div>`;
  }
}
