/* ============================================================
   ui.js — পুনরায় ব্যবহারযোগ্য UI কম্পোনেন্ট
   মডাল, কুইজ ইঞ্জিন, টাইমার, প্রগ্রেস বার ইত্যাদি
============================================================ */

import { $, el, formatTime, escapeHTML, shuffle, loadingHTML, showToast } from './utils.js';

/* ============================================================
   MODAL
============================================================ */
export function showModal(contentHTML) {
  const overlay = $('#modalOverlay');
  const content = $('#modalContent');
  content.innerHTML = contentHTML;
  overlay.classList.remove('hidden');

  // close button
  const closeBtn = content.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  // click outside to close
  overlay.addEventListener('click', function handler(e) {
    if (e.target === overlay) {
      closeModal();
      overlay.removeEventListener('click', handler);
    }
  });

  // ESC to close
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

export function closeModal() {
  $('#modalOverlay').classList.add('hidden');
  $('#modalContent').innerHTML = '';
}

/* ============================================================
   PROGRESS BAR
============================================================ */
export function progressBar(percent, label = '') {
  const pct = Math.min(100, Math.max(0, percent));
  return `
    <div>
      ${label ? `<div class="progress-text"><span>${label}</span><span>${Math.round(pct)}%</span></div>` : ''}
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

/* ============================================================
   CIRCLE PROGRESS (SVG)
============================================================ */
export function circleProgressSVG(percent, label = '') {
  const pct = Math.min(100, Math.max(0, percent));
  const circumference = 2 * Math.PI * 50; // r=50
  const offset = circumference - (pct / 100) * circumference;
  return `
    <div class="circle-progress">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6366f1"/>
            <stop offset="100%" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
        <circle class="track" cx="60" cy="60" r="50" stroke-width="8"/>
        <circle class="fill" cx="60" cy="60" r="50" stroke-width="8"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"/>
      </svg>
      <div class="circle-progress-text">${Math.round(pct)}%</div>
    </div>
  `;
}

/* ============================================================
   STAT CARD
============================================================ */
export function statCard(icon, value, label, color = '') {
  return `
    <div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

/* ============================================================
   TIMER
============================================================ */
export class Timer {
  constructor(durationMs, onTick, onEnd) {
    this.duration = durationMs;
    this.remaining = durationMs;
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.intervalId = null;
    this.startTime = null;
  }

  start() {
    this.startTime = Date.now();
    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      this.remaining = Math.max(0, this.duration - elapsed);
      if (this.onTick) this.onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        if (this.onEnd) this.onEnd();
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  pause() {
    this.stop();
    // adjust duration so remaining time is preserved
    this.duration = this.remaining;
  }

  resume() {
    if (this.remaining > 0) this.start();
  }

  getElapsed() {
    return this.duration - this.remaining;
  }

  static format(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

/* ============================================================
   QUIZ ENGINE
   ------------------------------------------------------------
   প্রশ্ন সেট রিসিভ করে, একটি কুইজ/টেস্ট সেশন পরিচালনা করে।
   প্রতিটি প্রশ্ন দেখায়, উত্তর রেকর্ড করে, শেষে রেজাল্ট দেয়।
   options: {
     questions: [...],
     title: string,
     showExplanation: bool,     // প্রতিটি প্রশ্নের পরে ব্যাখ্যা দেখাবে কিনা
     showAnswerImmediately: bool, // উত্তর সিলেক্ট করলেই সঠিক/ভুল দেখাবে
     timerMs: number,           // 0 = no timer
     onComplete: function(results),
     allowNav: bool             // প্রশ্ন নেভিগেশন গ্রিড দেখাবে কিনা
   }
============================================================ */
export class QuizEngine {
  constructor(options) {
    this.questions = options.questions || [];
    this.title = options.title || 'কুইজ';
    this.showExplanation = options.showExplanation !== false;
    this.showAnswerImmediately = options.showAnswerImmediately !== false;
    this.timerMs = options.timerMs || 0;
    this.onComplete = options.onComplete || (() => {});
    this.allowNav = options.allowNav !== false;

    this.currentIndex = 0;
    this.answers = {}; // { questionIndex: selectedOption }
    this.results = [];
    this.timer = null;
    this.startTime = null;
  }

  start() {
    this.startTime = Date.now();
    if (this.timerMs > 0) {
      this.timer = new Timer(this.timerMs,
        (remaining) => this.updateTimerDisplay(remaining),
        () => this.finish()
      );
      this.timer.start();
    }
    this.renderQuestion();
  }

  renderQuestion() {
    const q = this.questions[this.currentIndex];
    if (!q) return this.finish();

    const total = this.questions.length;
    const progressPct = ((this.currentIndex) / total) * 100;
    const instruction = q.instruction ? `<div class="question-instruction">${escapeHTML(q.instruction)}</div>` : '';

    // Timer HTML
    const timerHTML = this.timer ? `<div class="quiz-timer" id="quizTimer">⏱️ ${Timer.format(this.timerMs)}</div>` : '';

    // Navigation grid
    let navGridHTML = '';
    if (this.allowNav && total > 1) {
      navGridHTML = '<div class="question-nav-grid">';
      for (let i = 0; i < total; i++) {
        let cls = 'qnav-item';
        if (i === this.currentIndex) cls += ' current';
        else if (this.answers[i] !== undefined) cls += ' answered';
        navGridHTML += `<div class="${cls}" data-qidx="${i}">${i + 1}</div>`;
      }
      navGridHTML += '</div>';
    }

    // Options
    const options = q.options || {};
    const optionKeys = ['A', 'B', 'C', 'D'].filter(k => options[k] !== undefined);
    const isAnswered = this.answers[this.currentIndex] !== undefined;
    const userAnswer = this.answers[this.currentIndex];
    const hasAnswer = q.answer && q.answer in options;

    let optionsHTML = '<div class="options-list">';
    for (const key of optionKeys) {
      let cls = 'option-item';
      if (this.showAnswerImmediately && isAnswered) {
        if (hasAnswer) {
          if (key === q.answer) cls += ' correct';
          else if (key === userAnswer) cls += ' incorrect';
        } else {
          if (key === userAnswer) cls += ' selected';
        }
      } else if (isAnswered && key === userAnswer) {
        cls += ' selected';
      }
      optionsHTML += `
        <div class="${cls}" data-option="${key}">
          <div class="option-letter">${key}</div>
          <div class="option-text">${escapeHTML(options[key])}</div>
        </div>`;
    }
    optionsHTML += '</div>';

    // Explanation
    let explanationHTML = '';
    if (this.showExplanation && isAnswered && hasAnswer) {
      const isCorrect = userAnswer === q.answer;
      explanationHTML = `
        <div class="explanation-box">
          <strong>${isCorrect ? '✅ সঠিক!' : '❌ ভুল!'}</strong>
          সঠিক উত্তর: <strong>${q.answer}) ${escapeHTML(options[q.answer] || '')}</strong>
          ${q.explanation ? `<br><br>${escapeHTML(q.explanation)}` : ''}
        </div>
      `;
    }

    // Buttons
    const isFirst = this.currentIndex === 0;
    const isLast = this.currentIndex === total - 1;

    let navButtons = '<div class="quiz-nav">';
    if (!isFirst) navButtons += '<button class="btn btn-secondary" id="prevBtn">← আগের</button>';
    if (this.showAnswerImmediately && !isAnswered) {
      navButtons += '<span class="text-secondary" style="font-size:0.85rem;align-self:center;">উত্তর নির্বাচন করুন</span>';
    }
    if (isLast) {
      navButtons += '<button class="btn btn-primary" id="finishBtn">শেষ করুন ✓</button>';
    } else {
      navButtons += '<button class="btn btn-primary" id="nextBtn">পরবর্তী →</button>';
    }
    navButtons += '</div>';

    const html = `
      <div class="quiz-container">
        <div class="quiz-header">
          <div>
            <h2 style="font-size:1.1rem;">${escapeHTML(this.title)}</h2>
            <span class="quiz-progress-text">প্রশ্ন ${this.currentIndex + 1} / ${total}</span>
          </div>
          ${timerHTML}
        </div>
        <div class="progress-bar-container" style="margin-bottom:1rem;">
          <div class="progress-bar-fill" style="width:${progressPct}%"></div>
        </div>
        <div class="question-card">
          ${instruction}
          <div class="question-text">${escapeHTML(q.question)}</div>
          ${optionsHTML}
          ${explanationHTML}
        </div>
        ${navButtons}
        ${navGridHTML}
      </div>
    `;

    $('#modalContent').innerHTML = html + '<button class="modal-close" id="closeQuiz">×</button>';

    // Bind events
    $$('.option-item', $('#modalContent')).forEach(opt => {
      opt.addEventListener('click', () => {
        if (this.answers[this.currentIndex] !== undefined && this.showAnswerImmediately) return;
        this.answers[this.currentIndex] = opt.dataset.option;
        this.renderQuestion();
      });
    });

    const prevBtn = $('#prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      if (this.currentIndex > 0) { this.currentIndex--; this.renderQuestion(); }
    });

    const nextBtn = $('#nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', () => {
      if (this.currentIndex < total - 1) { this.currentIndex++; this.renderQuestion(); }
    });

    const finishBtn = $('#finishBtn');
    if (finishBtn) finishBtn.addEventListener('click', () => this.finish());

    // Nav grid clicks
    $$('.qnav-item', $('#modalContent')).forEach(item => {
      item.addEventListener('click', () => {
        this.currentIndex = parseInt(item.dataset.qidx);
        this.renderQuestion();
      });
    });

    const closeBtn = $('#closeQuiz');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (confirm('কুইজ ছেড়ে দিতে চান? আপনার উত্তর সেভ হবে না।')) {
        if (this.timer) this.timer.stop();
        import('./utils.js').then(m => m.clearModal());
      }
    });
  }

  updateTimerDisplay(remaining) {
    const timerEl = $('#quizTimer');
    if (!timerEl) return;
    timerEl.textContent = `⏱️ ${Timer.format(remaining)}`;
    if (remaining < 60000) {
      timerEl.classList.add('danger');
    } else if (remaining < 300000) {
      timerEl.classList.add('warning');
    }
  }

  finish() {
    if (this.timer) this.timer.stop();
    const timeTaken = Date.now() - this.startTime;

    // Calculate results
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    const details = [];

    this.questions.forEach((q, i) => {
      const userAns = this.answers[i];
      const hasAnswer = q.answer;
      if (userAns === undefined) {
        unanswered++;
      } else if (hasAnswer) {
        if (userAns === q.answer) correct++;
        else incorrect++;
      } else {
        unanswered++;
      }
      details.push({
        question: q.question,
        userAnswer: userAns,
        correctAnswer: q.answer,
        isCorrect: hasAnswer ? (userAns === q.answer) : null,
        options: q.options
      });
    });

    const total = this.questions.length;
    const score = correct;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    const result = {
      title: this.title,
      score,
      total,
      correct,
      incorrect,
      unanswered,
      percentage,
      timeTaken,
      details,
      date: new Date().toISOString()
    };

    this.showResult(result);
    this.onComplete(result);
  }

  showResult(result) {
    const passFail = result.percentage >= 40;
    const timeStr = Timer.format(result.timeTaken);

    // Review section
    let reviewHTML = '';
    if (result.details && result.details.length > 0) {
      reviewHTML = '<div style="margin-top:1.5rem;"><h3 style="margin-bottom:1rem;">📋 উত্তর পর্যালোচনা</h3>';
      result.details.forEach((d, i) => {
        const statusIcon = d.isCorrect === true ? '✅' : d.isCorrect === false ? '❌' : '⚪';
        const userAnsText = d.userAnswer ? `${d.userAnswer}) ${escapeHTML(d.options?.[d.userAnswer] || '')}` : 'উত্তর দেওয়া হয়নি';
        const correctAnsText = d.correctAnswer ? `${d.correctAnswer}) ${escapeHTML(d.options?.[d.correctAnswer] || '')}` : 'উত্তর উপলব্ধ নেই';
        reviewHTML += `
          <div class="question-card" style="margin-bottom:0.5rem;">
            <div class="question-text">${statusIcon} <strong>${i + 1}.</strong> ${escapeHTML(d.question)}</div>
            <div class="text-secondary" style="font-size:0.85rem;">
              আপনার উত্তর: ${escapeHTML(userAnsText)}<br>
              সঠিক উত্তর: <span class="text-success">${escapeHTML(correctAnsText)}</span>
            </div>
          </div>
        `;
      });
      reviewHTML += '</div>';
    }

    const html = `
      <div class="quiz-container">
        <div class="result-summary">
          <h2 style="margin-bottom:0.5rem;">${passFail ? '🎉 অভিনন্দন!' : 'আরও অনুশীলন দরকার'}</h2>
          <div class="result-score">${result.percentage}%</div>
          <p class="text-secondary" style="margin:0.5rem 0;">${result.score} / ${result.total} সঠিক</p>
          <div style="margin:1rem 0;">
            <span class="result-stat"><span class="result-stat-value text-success">${result.correct}</span><span class="result-stat-label">সঠিক</span></span>
            <span class="result-stat"><span class="result-stat-value text-danger">${result.incorrect}</span><span class="result-stat-label">ভুল</span></span>
            <span class="result-stat"><span class="result-stat-value text-muted">${result.unanswered}</span><span class="result-stat-label">বাদ</span></span>
            <span class="result-stat"><span class="result-stat-value">${timeStr}</span><span class="result-stat-label">সময়</span></span>
          </div>
        </div>
        <div class="quiz-nav">
          <button class="btn btn-secondary" id="reviewBtn">📋 উত্তর পর্যালোচনা</button>
          <button class="btn btn-primary" id="closeResultBtn">সম্পন্ন ✓</button>
        </div>
        <div id="reviewSection" class="hidden">
          ${reviewHTML}
        </div>
      </div>
    `;

    $('#modalContent').innerHTML = html + '<button class="modal-close" id="closeQuiz">×</button>';

    $('#closeResultBtn').addEventListener('click', () => {
      closeModal();
    });
    $('#closeQuiz').addEventListener('click', () => closeModal());
    const reviewBtn = $('#reviewBtn');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        $('#reviewSection').classList.toggle('hidden');
      });
    }
  }
}

/* ============================================================
   PAGINATION UI
============================================================ */
export function paginationHTML(page, totalPages, onPageChange) {
  if (totalPages <= 1) return '';
  const container = el('div', { class: 'pagination', style: 'display:flex;gap:0.5rem;justify-content:center;margin-top:1rem;flex-wrap:wrap;' });

  const addBtn = (text, pg, disabled = false, active = false) => {
    const btn = el('button', {
      class: `btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`,
      ...(disabled ? { disabled: 'true' } : {})
    }, text);
    if (!disabled) btn.addEventListener('click', () => onPageChange(pg));
    container.appendChild(btn);
  };

  addBtn('←', page - 1, page <= 1);

  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    addBtn('1', 1);
    if (start > 2) container.appendChild(el('span', { class: 'text-secondary' }, '...'));
  }
  for (let i = start; i <= end; i++) {
    addBtn(String(i), i, false, i === page);
  }
  if (end < totalPages) {
    if (end < totalPages - 1) container.appendChild(el('span', { class: 'text-secondary' }, '...'));
    addBtn(String(totalPages), totalPages);
  }

  addBtn('→', page + 1, page >= totalPages);
  return container;
}
