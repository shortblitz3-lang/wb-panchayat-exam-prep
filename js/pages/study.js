/* ============================================================
   pages/study.js — পড়াশোনা পেজ
   বিষয়ভিত্তিক অধ্যায় তালিকা, স্টাডি কন্টেন্ট লেখক
   ------------------------------------------------------------
   ডেটা lazy load হয় — প্রতিটি অধ্যায় আলাদা JSON ফাইল থেকে।
============================================================ */

import { $, el, escapeHTML, fetchJSON, loadingHTML, emptyStateHTML, showToast } from '../utils.js';
import { isChapterRead, markChapterRead, recordDailyActivity } from '../store.js';
import { showModal, closeModal } from '../ui.js';

let studyIndex = null;

export async function renderStudy(content) {
  content.innerHTML = `<h1 class="page-title">📚 পড়াশোনা</h1>
    <p class="page-subtitle">বিষয় নির্বাচন করে অধ্যায় পড়ুন</p>
    ${loadingHTML('বিষয় তালিকা লোড হচ্ছে...')}`;

  try {
    if (!studyIndex) {
      studyIndex = await fetchJSON('study_index.json');
    }

    let html = '<div class="grid grid-auto">';

    for (const vol of studyIndex) {
      const chaptersDone = vol.chapters.filter(ch =>
        isChapterRead(vol.slug, ch.slug)
      ).length;

      html += `
        <div class="subject-card" data-slug="${escapeHTML(vol.slug)}">
          <div class="subject-card-header">
            <span class="subject-icon">${getSubjectIcon(vol.subject)}</span>
            <span class="subject-name">${escapeHTML(vol.subject)}</span>
          </div>
          <div class="subject-meta">
            ${escapeHTML(vol.volume)} · ${vol.chapterCount} অধ্যায়
            ${chaptersDone > 0 ? `· <span class="text-success">${chaptersDone} সম্পন্ন</span>` : ''}
          </div>
          ${progressBarMini(chaptersDone, vol.chapterCount)}
        </div>
      `;
    }
    html += '</div>';

    content.innerHTML = `
      <h1 class="page-title">📚 পড়াশোনা</h1>
      <p class="page-subtitle">বিষয় নির্বাচন করে অধ্যায় পড়ুন</p>
      ${html}
    `;

    // Bind click events
    $$('.subject-card', content).forEach(card => {
      card.addEventListener('click', () => {
        showChapters(card.dataset.slug);
      });
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>ডেটা লোড ব্যর্থ: ${escapeHTML(e.message)}</p></div>`;
  }
}

function getSubjectIcon(subject) {
  if (subject.includes('পঞ্চায়েত')) return '🏛️';
  if (subject.includes('বাংলা')) return '📖';
  if (subject.includes('English')) return '🔤';
  if (subject.includes('গণিত') || subject.includes('পাটিগণিত')) return '🔢';
  if (subject.includes('জ্ঞান')) return '🌍';
  return '📋';
}

function progressBarMini(done, total) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return `<div class="progress-bar-container" style="margin-top:0.5rem;height:6px;">
    <div class="progress-bar-fill" style="width:${pct}%"></div>
  </div>`;
}

async function showChapters(subjectSlug) {
  const vol = studyIndex.find(v => v.slug === subjectSlug);
  if (!vol) return;

  let html = `
    <div class="modal-content" style="max-width:700px;">
      <button class="modal-close" id="closeChapters">×</button>
      <h2 style="margin-bottom:0.3rem;">${getSubjectIcon(vol.subject)} ${escapeHTML(vol.subject)}</h2>
      <p class="text-secondary" style="font-size:0.85rem;margin-bottom:1rem;">${escapeHTML(vol.volume)} · ${vol.chapterCount} অধ্যায়</p>
      <div id="chapterList">
        ${loadingHTML('অধ্যায় তালিকা লোড হচ্ছে...')}
      </div>
    </div>
  `;

  showModal(html);

  // Render chapter list
  const listEl = $('#chapterList');
  let listHTML = '';
  for (const ch of vol.chapters) {
    const isDone = isChapterRead(vol.slug, ch.slug);
    listHTML += `
      <div class="chapter-item" data-file="${escapeHTML(ch.file)}" data-subject="${escapeHTML(vol.slug)}" data-chapter="${escapeHTML(ch.slug)}">
        <span class="chapter-title">${escapeHTML(ch.title)}</span>
        <span class="chapter-badge ${isDone ? 'badge-done' : 'badge-pending'}">${isDone ? '✓ সম্পন্ন' : 'পড়ুন'}</span>
      </div>
    `;
  }
  listEl.innerHTML = listHTML;

  // Bind chapter clicks
  $$('.chapter-item', listEl).forEach(item => {
    item.addEventListener('click', () => {
      readChapter(item.dataset.subject, item.dataset.chapter, item.dataset.file, vol);
    });
  });

  $('#closeChapters').addEventListener('click', closeModal);
}

async function readChapter(subjectSlug, chapterSlug, file, vol) {
  // Show loading in modal
  $('#modalContent').innerHTML = `
    <div class="modal-content study-reader">
      ${loadingHTML('অধ্যায় লোড হচ্ছে...')}
    </div>
    <button class="modal-close" id="closeReader">×</button>
  `;
  $('#closeReader').addEventListener('click', closeModal);

  try {
    const chapter = await fetchJSON(file);

    // Find chapter title from index
    const chInfo = vol.chapters.find(c => c.slug === chapterSlug);
    const title = chapter.title || (chInfo ? chInfo.title : 'অধ্যায়');
    const isDone = isChapterRead(subjectSlug, chapterSlug);

    $('#modalContent').innerHTML = `
      <div class="modal-content study-reader">
        <button class="modal-close" id="closeReader2">×</button>
        <div class="reader-toolbar">
          <h2 style="font-size:1.1rem;">${escapeHTML(title)}</h2>
          <div>
            <button class="btn btn-sm btn-ghost" id="backToList">← তালিকা</button>
            ${!isDone ? '<button class="btn btn-sm btn-success" id="markDoneBtn">✓ পড়া শেষ</button>' : '<span class="badge badge-success">✓ সম্পন্ন</span>'}
          </div>
        </div>
        <div class="study-reader-content">${escapeHTML(chapter.content)}</div>
      </div>
    `;

    $('#closeReader2').addEventListener('click', closeModal);
    $('#backToList').addEventListener('click', () => showChapters(subjectSlug));

    if (!isDone) {
      $('#markDoneBtn').addEventListener('click', async () => {
        await markChapterRead(subjectSlug, chapterSlug);
        await recordDailyActivity('chapter');
        showToast('অধ্যায় সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে! ✓', 'success');
        // Refresh the chapter list display
        showChapters(subjectSlug);
      });
    }
  } catch (e) {
    $('#modalContent').innerHTML = `
      <div class="modal-content">
        <button class="modal-close" id="closeErr">×</button>
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <p>অধ্যায় লোড ব্যর্থ: ${escapeHTML(e.message)}</p>
        </div>
      </div>
    `;
    $('#closeErr').addEventListener('click', closeModal);
  }
}
