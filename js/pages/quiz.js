/* ============================================================
   pages/quiz.js — কুইজ মোড
   দ্রুত কুইজ — সীমিত সময়, সীমিত প্রশ্ন
============================================================ */

import { $, el, escapeHTML, fetchJSON, loadingHTML, emptyStateHTML, showToast, shuffle } from '../utils.js';
import { QuizEngine } from '../ui.js';
import { addQuizResult, recordDailyActivity } from '../store.js';
import { QUIZ_CONFIG } from '../config.js';

let mcqIndex = null;

export async function renderQuiz(content) {
  content.innerHTML = `<h1 class="page-title">🧠 কুইজ</h1>
    <p class="page-subtitle">দ্রুত কুইজ</p>
    ${loadingHTML('বিষয়সমূহ লোড হচ্ছে...')}`;

  try {
    if (!mcqIndex) {
      mcqIndex = await fetchJSON('mcq_index.json');
    }

    const totalAvailable = mcqIndex.reduce((s, m) => s + m.withAnswer, 0);

    content.innerHTML = `
      <h1 class="page-title">🧠 কুইজ</h1>
      <p class="page-subtitle">দ্রুত কুইজ — সীমিত সময়ে পরীক্ষা দিন</p>

      <div class="card text-center mb-3">
        <div class="card-title">🎯 কুইজ তথ্য</div>
        <div class="stat-grid" style="margin-top:1rem;">
          <div class="stat-card"><div class="stat-value">${QUIZ_CONFIG.questionCount}</div><div class="stat-label">প্রশ্ন</div></div>
          <div class="stat-card"><div class="stat-value">${QUIZ_CONFIG.duration / 60000}</div><div class="stat-label">মিনিট</div></div>
          <div class="stat-card"><div class="stat-value">${totalAvailable}</div><div class="stat-label">উপলব্ধ প্রশ্ন</div></div>
        </div>
        <p class="text-secondary" style="font-size:0.85rem;margin-top:1rem;">
          দ্রুত কুইজে ${QUIZ_CONFIG.questionCount} টি প্রশ্ন থাকবে, সময় ${QUIZ_CONFIG.duration / 60000} মিনিট।
          বিষয় নির্বাচন করুন অথবা মিক্সড কুইজ দিন।
        </p>
      </div>

      <div class="card mb-3">
        <div class="card-title">⚙️ কুইজ কনফিগারেশন</div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>বিষয়</label>
            <select id="quizSubject">
              <option value="all">🔀 মিক্সড (সব বিষয়)</option>
              ${mcqIndex.map(m => `<option value="${escapeHTML(m.slug)}">${escapeHTML(m.subject)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>প্রশ্ন সংখ্যা</label>
            <select id="quizCount">
              <option value="5">৫</option>
              <option value="10" selected>১০</option>
              <option value="20">২০</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" id="startQuizBtn">কুইজ শুরু করুন</button>
      </div>

      <div class="card">
        <div class="card-title">⚡ দ্রুত কুইজ</div>
        <p class="text-secondary" style="font-size:0.85rem;margin-bottom:1rem;">
          এক ক্লিকে মিক্সড কুইজ শুরু করুন — ${QUIZ_CONFIG.questionCount} প্রশ্ন, ${QUIZ_CONFIG.duration / 60000} মিনিট।
        </p>
        <button class="btn btn-secondary" id="quickQuizBtn">⚡ দ্রুত কুইজ</button>
      </div>
    `;

    $('#startQuizBtn').addEventListener('click', () => startQuiz(content, { custom: true }));
    $('#quickQuizBtn').addEventListener('click', () => startQuiz(content, { quick: true }));
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>ডেটা লোড ব্যর্থ: ${escapeHTML(e.message)}</p></div>`;
  }
}

async function startQuiz(content, options = {}) {
  let questionCount = QUIZ_CONFIG.questionCount;
  let duration = QUIZ_CONFIG.duration;
  let subjectFilter = null;

  if (options.custom) {
    questionCount = parseInt($('#quizCount').value);
    const subjVal = $('#quizSubject').value;
    if (subjVal !== 'all') subjectFilter = subjVal;
  }

  showModalLoading('প্রশ্ন নির্বাচন করা হচ্ছে...');

  try {
    const subjects = subjectFilter
      ? mcqIndex.filter(m => m.slug === subjectFilter)
      : mcqIndex.filter(m => m.withAnswer > 0);

    const perSubject = Math.ceil(questionCount / subjects.length);
    let allQuestions = [];

    for (const subj of subjects) {
      const subjQuestions = await fetchJSON(`mcqs/${subj.slug}.json`);
      const withAnswers = subjQuestions.filter(q => q.answer);
      const selected = shuffle(withAnswers).slice(0, perSubject);
      allQuestions.push(...selected);
    }

    allQuestions = shuffle(allQuestions).slice(0, questionCount);

    if (allQuestions.length === 0) {
      showToast('পর্যাপ্ত প্রশ্ন নেই।', 'warning');
      return;
    }

    const engine = new QuizEngine({
      questions: allQuestions,
      title: 'কুইজ',
      showExplanation: true,
      showAnswerImmediately: false,
      timerMs: duration,
      allowNav: true,
      onComplete: async (result) => {
        await addQuizResult({
          subject: subjectFilter ? (mcqIndex.find(m => m.slug === subjectFilter)?.subject || 'মিক্সড') : 'মিক্সড',
          score: result.score,
          total: result.total,
          timeTaken: result.timeTaken,
          details: result.details
        });
        await recordDailyActivity('quiz');
        showToast(`কুইজ সম্পন্ন! স্কোর: ${result.score}/${result.total} (${result.percentage}%)`, 'success');
      }
    });
    engine.start();
  } catch (e) {
    showToast('কুইজ শুরু ব্যর্থ: ' + e.message, 'error');
  }
}

function showModalLoading(msg) {
  // Lightweight inline loader using existing modal infra
  import('../ui.js').then(m => {
    m.showModal(`
      <div class="modal-content text-center">
        ${loadingHTML(msg)}
      </div>
    `);
  });
}
