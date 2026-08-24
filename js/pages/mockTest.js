/* ============================================================
   pages/mockTest.js — মক টেস্ট
   সম্পূর্ণ পরীক্ষার ধাঁচে টেস্ট — ৯০ মিনিট, ১০০ প্রশ্ন
============================================================ */

import { $, el, escapeHTML, fetchJSON, loadingHTML, emptyStateHTML, showToast, shuffle } from '../utils.js';
import { showModal, QuizEngine, Timer } from '../ui.js';
import { addMockTestResult, recordDailyActivity } from '../store.js';
import { MOCK_TEST_CONFIG } from '../config.js';

let mcqIndex = null;

export async function renderMockTest(content) {
  content.innerHTML = `<h1 class="page-title">📝 মক টেস্ট</h1>
    <p class="page-subtitle">সম্পূর্ণ পরীক্ষার ধাঁচে অনুশীলন</p>
    ${loadingHTML('প্রস্তুত হচ্ছে...')}`;

  try {
    if (!mcqIndex) {
      mcqIndex = await fetchJSON('mcq_index.json');
    }

    const totalAvailable = mcqIndex.reduce((s, m) => s + m.withAnswer, 0);

    content.innerHTML = `
      <h1 class="page-title">📝 মক টেস্ট</h1>
      <p class="page-subtitle">সম্পূর্ণ পরীক্ষার ধাঁচে অনুশীলন</p>

      <div class="card text-center mb-3">
        <div class="card-title">🎯 মক টেস্ট তথ্য</div>
        <div class="stat-grid" style="margin-top:1rem;">
          <div class="stat-card"><div class="stat-value">${MOCK_TEST_CONFIG.questionCount}</div><div class="stat-label">প্রশ্ন</div></div>
          <div class="stat-card"><div class="stat-value">${MOCK_TEST_CONFIG.duration / 60000}</div><div class="stat-label">মিনিট</div></div>
          <div class="stat-card"><div class="stat-value">${MOCK_TEST_CONFIG.passScore}%</div><div class="stat-label">পাশ মার্ক</div></div>
          <div class="stat-card"><div class="stat-value">${totalAvailable}</div><div class="stat-label">উপলব্ধ প্রশ্ন</div></div>
        </div>
        <p class="text-secondary" style="font-size:0.85rem;margin-top:1rem;">
          প্রতিটি বিষয় থেকে সমান সংখ্যক প্রশ্ন থাকবে। প্রশ্ন এলোমেলোভাবে নির্বাচিত হবে।
        </p>
        <button class="btn btn-primary mt-2" id="startMockBtn">মক টেস্ট শুরু করুন</button>
      </div>

      <div class="card">
        <div class="card-title">⚙️ কাস্টম মক টেস্ট</div>
        <p class="text-secondary" style="font-size:0.85rem;margin-bottom:1rem;">নিজের পছন্দমতো প্রশ্ন সংখ্যা ও সময় নির্বাচন করুন।</p>
        <div class="grid grid-3">
          <div class="form-group">
            <label>প্রশ্ন সংখ্যা</label>
            <select id="customQuestionCount">
              <option value="25">২৫</option>
              <option value="50">৫০</option>
              <option value="100" selected>১০০</option>
            </select>
          </div>
          <div class="form-group">
            <label>সময় (মিনিট)</label>
            <select id="customDuration">
              <option value="30">৩০</option>
              <option value="60">৬০</option>
              <option value="90" selected>৯০</option>
            </select>
          </div>
          <div class="form-group">
            <label>বিষয়</label>
            <select id="customSubject">
              <option value="all">সব বিষয় (মিক্সড)</option>
              ${mcqIndex.map(m => `<option value="${escapeHTML(m.slug)}">${escapeHTML(m.subject)} (${m.withAnswer})</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn btn-secondary" id="startCustomMockBtn">কাস্টম টেস্ট শুরু করুন</button>
      </div>
    `;

    $('#startMockBtn').addEventListener('click', () => startMockTest(content));
    $('#startCustomMockBtn').addEventListener('click', () => startMockTest(content, {
      custom: true
    }));
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>ডেটা লোড ব্যর্থ: ${escapeHTML(e.message)}</p></div>`;
  }
}

async function startMockTest(content, options = {}) {
  let questionCount = MOCK_TEST_CONFIG.questionCount;
  let duration = MOCK_TEST_CONFIG.duration;
  let subjectFilter = null;

  if (options.custom) {
    questionCount = parseInt($('#customQuestionCount').value);
    duration = parseInt($('#customDuration').value) * 60 * 1000;
    const subjVal = $('#customSubject').value;
    if (subjVal !== 'all') subjectFilter = subjVal;
  }

  // Show loading
  showModal(`
    <div class="modal-content text-center">
      ${loadingHTML('প্রশ্ন নির্বাচন করা হচ্ছে...')}
    </div>
  `);

  try {
    // Determine subjects to pull from
    const subjects = subjectFilter
      ? mcqIndex.filter(m => m.slug === subjectFilter)
      : mcqIndex.filter(m => m.withAnswer > 0);

    // Distribute questions across subjects
    const perSubject = Math.ceil(questionCount / subjects.length);
    let allQuestions = [];

    for (const subj of subjects) {
      const subjQuestions = await fetchJSON(`mcqs/${subj.slug}.json`);
      const withAnswers = subjQuestions.filter(q => q.answer);
      const selected = shuffle(withAnswers).slice(0, perSubject);
      allQuestions.push(...selected);
    }

    // Shuffle and limit to exact count
    allQuestions = shuffle(allQuestions).slice(0, questionCount);

    if (allQuestions.length === 0) {
      showToast('পর্যাপ্ত প্রশ্ন নেই।', 'warning');
      return;
    }

    // Instructions modal
    showModal(`
      <div class="modal-content" style="max-width:500px;text-align:center;">
        <button class="modal-close" id="closeInstr">×</button>
        <h2>📝 মক টেস্ট</h2>
        <div class="stat-grid" style="margin:1.5rem 0;">
          <div class="stat-card"><div class="stat-value">${allQuestions.length}</div><div class="stat-label">প্রশ্ন</div></div>
          <div class="stat-card"><div class="stat-value">${duration / 60000}</div><div class="stat-label">মিনিট</div></div>
        </div>
        <div class="card text-left" style="background:var(--bg-input);margin:1rem 0;font-size:0.85rem;">
          <p><strong>নিয়মাবলী:</strong></p>
          <ul style="margin-left:1.5rem;margin-top:0.5rem;">
            <li>প্রতিটি প্রশ্নে ৪টি অপশন</li>
            <li>সঠিক উত্তরের জন্য ধনাত্মক, ভুলের জন্য কোনো নেগেটিভ নেই</li>
            <li>প্রশ্ন একাধিক বার দেখতে ও উত্তর পরিবর্তন করতে পারবেন</li>
            <li>সময় শেষ হলে স্বয়ংক্রিয়ভাবে টেস্ট শেষ হবে</li>
          </ul>
        </div>
        <button class="btn btn-primary btn-block" id="confirmStartBtn">শুরু করুন</button>
      </div>
    `);

    $('#closeInstr').addEventListener('click', () => import('../ui.js').then(m => m.closeModal()));

    $('#confirmStartBtn').addEventListener('click', () => {
      const engine = new QuizEngine({
        questions: allQuestions,
        title: 'মক টেস্ট',
        showExplanation: false,        // মক টেস্টে শেষে রিভিউ দেখাবে
        showAnswerImmediately: false,  // উত্তর সিলেক্ট করলে সাথে সাথে সঠিক/ভুল দেখাবে না
        timerMs: duration,
        allowNav: true,
        onComplete: async (result) => {
          await addMockTestResult({
            score: result.score,
            total: result.total,
            timeTaken: result.timeTaken,
            details: result.details
          });
          await recordDailyActivity('mock');
          showToast(`মক টেস্ট সম্পন্ন! স্কোর: ${result.score}/${result.total} (${result.percentage}%)`, 'success');
        }
      });
      engine.start();
    });
  } catch (e) {
    showToast('মক টেস্ট শুরু ব্যর্থ: ' + e.message, 'error');
  }
}
