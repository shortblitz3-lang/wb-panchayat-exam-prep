/* ============================================================
   pages/studyPlan.js — পড়ার প্ল্যান
   পরীক্ষার তারিখ অনুযায়ী দৈনিক পড়ার সূচি
============================================================ */

import { $, el, escapeHTML, todayStr, daysBetween, addDays, formatDate, loadingHTML, emptyStateHTML, showToast } from '../utils.js';
import { getStudyPlan, setStudyPlan, clearStudyPlan, getProgress, markChapterRead } from '../store.js';
import { fetchJSON, progressBar } from '../utils.js';

let studyIndex = null;

export async function renderStudyPlan(content) {
  const plan = getStudyPlan();

  content.innerHTML = `
    <h1 class="page-title">📅 পড়ার প্ল্যান</h1>
    <p class="page-subtitle">পরীক্ষার তারিখ অনুযায়ী দৈনিক সূচি তৈরি করুন</p>
    ${plan ? renderPlanView(plan) : renderCreateForm()}
  `;

  if (!plan) {
    $('#createPlanBtn').addEventListener('click', () => createPlan(content));
  } else {
    const clearBtn = $('#clearPlanBtn');
    if (clearBtn) clearBtn.addEventListener('click', async () => {
      if (confirm('পড়ার প্ল্যান মুছে ফেলতে চান?')) {
        await clearStudyPlan();
        showToast('প্ল্যান মুছে ফেলা হয়েছে।', 'info');
        renderStudyPlan(content);
      }
    });

    // Mark day complete buttons
    $$('.day-complete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const dayIdx = parseInt(btn.dataset.day);
        const p = getProgress();
        if (p.studyPlan && p.studyPlan.schedule[dayIdx]) {
          p.studyPlan.schedule[dayIdx].completed = true;
          await setStudyPlan(p.studyPlan);
          showToast('দিনের লক্ষ্য পূরণ! ✓', 'success');
          renderStudyPlan(content);
        }
      });
    });
  }
}

function renderCreateForm() {
  const today = todayStr();
  const defaultExam = addDays(today, 30);
  return `
    <div class="card" style="max-width:500px;margin:0 auto;">
      <div class="card-title">নতুন প্ল্যান তৈরি করুন</div>
      <div class="form-group">
        <label for="examDate">পরীক্ষার তারিখ</label>
        <input type="date" id="examDate" value="${defaultExam}" min="${today}">
      </div>
      <div class="form-group">
        <label for="startDate">শুরুর তারিখ</label>
        <input type="date" id="startDate" value="${today}" min="${today}">
      </div>
      <div class="form-group">
        <label for="dailyHours">প্রতিদিন কত ঘন্টা পড়বেন?</label>
        <select id="dailyHours">
          <option value="2">২ ঘন্টা (২ অধ্যায়/দিন)</option>
          <option value="3" selected>৩ ঘন্টা (৩ অধ্যায়/দিন)</option>
          <option value="4">৪ ঘন্টা (৪ অধ্যায়/দিন)</option>
          <option value="5">৫ ঘন্টা (৫ অধ্যায়/দিন)</option>
        </select>
      </div>
      <button class="btn btn-primary btn-block" id="createPlanBtn">প্ল্যান তৈরি করুন</button>
    </div>
  `;
}

async function createPlan(content) {
  const examDate = $('#examDate').value;
  const startDate = $('#startDate').value;
  const chaptersPerDay = parseInt($('#dailyHours').value);

  if (!examDate || !startDate) {
    showToast('তারিখ নির্বাচন করুন।', 'error');
    return;
  }

  const totalDays = daysBetween(startDate, examDate);
  if (totalDays <= 0) {
    showToast('পরীক্ষার তারিখ শুরুর তারিখের পরে হতে হবে।', 'error');
    return;
  }

  // Load study index to get all chapters
  if (!studyIndex) {
    content.innerHTML += loadingHTML('প্ল্যান তৈরি হচ্ছে...');
    studyIndex = await fetchJSON('study_index.json');
  }

  // Collect all chapters in order
  const allChapters = [];
  for (const vol of studyIndex) {
    for (const ch of vol.chapters) {
      allChapters.push({
        subject: vol.subject,
        subjectSlug: vol.slug,
        chapter: ch.title,
        chapterSlug: ch.slug,
        file: ch.file
      });
    }
  }

  // Distribute chapters across days
  const schedule = [];
  let chapterIdx = 0;
  const totalChapters = allChapters.length;

  // Reserve last 3 days for revision
  const studyDays = Math.max(1, totalDays - 3);

  for (let day = 0; day < totalDays; day++) {
    const date = addDays(startDate, day);
    const isRevision = day >= studyDays;

    if (isRevision) {
      schedule.push({
        date,
        day: day + 1,
        type: 'revision',
        title: `রিভিশন দিন ${day - studyDays + 1}`,
        chapters: [],
        completed: false
      });
    } else {
      const dayChapters = [];
      for (let c = 0; c < chaptersPerDay && chapterIdx < totalChapters; c++) {
        dayChapters.push(allChapters[chapterIdx]);
        chapterIdx++;
      }
      schedule.push({
        date,
        day: day + 1,
        type: 'study',
        title: `দিন ${day + 1}`,
        chapters: dayChapters,
        completed: false
      });
    }
  }

  const plan = {
    examDate,
    startDate,
    totalDays,
    chaptersPerDay,
    schedule
  };

  await setStudyPlan(plan);
  showToast('পড়ার প্ল্যান তৈরি হয়েছে! 📅', 'success');
  renderStudyPlan(content);
}

function renderPlanView(plan) {
  const daysLeft = Math.max(0, daysBetween(todayStr(), plan.examDate));
  const completedDays = plan.schedule.filter(d => d.completed).length;
  const totalDays = plan.schedule.length;
  const today = todayStr();

  let scheduleHTML = '';
  plan.schedule.forEach((day, i) => {
    const isToday = day.date === today;
    const isPast = day.date < today;
    let chaptersHTML = '';

    if (day.type === 'study' && day.chapters.length > 0) {
      chaptersHTML = day.chapters.map(ch =>
        `<div style="font-size:0.8rem;padding:0.3rem 0;color:var(--text-secondary);">
          📖 ${escapeHTML(ch.subject)} — ${escapeHTML(ch.chapter)}
        </div>`
      ).join('');
    } else if (day.type === 'revision') {
      chaptersHTML = `<div style="font-size:0.8rem;padding:0.3rem 0;color:var(--warning);">🔄 আগের সব অধ্যায় রিভিশন করুন</div>`;
    }

    const cardClass = day.completed ? 'card' : (isToday ? 'card' : 'card');
    const borderStyle = day.completed ? 'border-color:var(--success);' : (isToday ? 'border-color:var(--accent-primary);box-shadow:var(--shadow-glow);' : '');

    scheduleHTML += `
      <div class="${cardClass}" style="margin-bottom:0.5rem;${borderStyle}">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-weight:600;">${escapeHTML(day.title)}</span>
            <span class="text-secondary" style="font-size:0.8rem;margin-left:0.5rem;">${escapeHTML(formatDate(day.date))}</span>
            ${isToday ? '<span class="badge badge-info" style="margin-left:0.5rem;">আজ</span>' : ''}
            ${day.completed ? '<span class="badge badge-success" style="margin-left:0.5rem;">✓ সম্পন্ন</span>' : ''}
          </div>
          ${!day.completed ? `<button class="btn btn-sm btn-ghost day-complete-btn" data-day="${i}">✓</button>` : ''}
        </div>
        ${chaptersHTML}
      </div>
    `;
  });

  return `
    <div class="card mb-3">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <div class="card-title">প্ল্যান সারসংক্ষেপ</div>
          <p class="text-secondary" style="font-size:0.85rem;">
            পরীক্ষা: ${escapeHTML(formatDate(plan.examDate))} · ${daysLeft} দিন বাকি ·
            ${completedDays}/${totalDays} দিন সম্পন্ন
          </p>
        </div>
        <button class="btn btn-sm btn-danger" id="clearPlanBtn">প্ল্যান মুছুন</button>
      </div>
      ${progressBar((completedDays / totalDays) * 100, 'সামগ্রিক অগ্রগতি')}
    </div>
    <div style="max-width:700px;">
      ${scheduleHTML}
    </div>
  `;
}