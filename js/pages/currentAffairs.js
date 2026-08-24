/* ============================================================
   pages/currentAffairs.js — কারেন্ট অ্যাফেয়ার্স
   সাম্প্রতিক ঘটনাবলি — দৈনিক/সাপ্তাহিক আপডেট, মাস অনুযায়ী
============================================================ */

import { $, el, escapeHTML, fetchJSON, loadingHTML, emptyStateHTML, showToast, paginate } from '../utils.js';
import { paginationHTML } from '../ui.js';

let caIndex = null;
let currentMonth = null;
let currentItems = null;
let currentPage = 1;
const PER_PAGE = 15;

export async function renderCurrentAffairs(content) {
  content.innerHTML = `<h1 class="page-title">📰 কারেন্ট অ্যাফেয়ার্স</h1>
    <p class="page-subtitle">সাম্প্রতিক ঘটনাবলি — মাস নির্বাচন করুন</p>
    ${loadingHTML('লোড হচ্ছে...')}`;

  try {
    if (!caIndex) {
      caIndex = await fetchJSON('current_affairs_index.json');
    }

    // Month tabs
    let tabsHTML = '<div class="tabs" id="monthTabs">';
    caIndex.forEach((m, i) => {
      const [year, month] = m.month.split('-');
      const monthName = getMonthName(month);
      tabsHTML += `<button class="tab ${i === 0 ? 'active' : ''}" data-month="${escapeHTML(m.month)}">${monthName} ${year} (${m.count})</button>`;
    });
    tabsHTML += '</div>';

    content.innerHTML = `
      <h1 class="page-title">📰 কারেন্ট অ্যাফেয়ার্স</h1>
      <p class="page-subtitle">সাম্প্রতিক ঘটনাবলি</p>
      ${tabsHTML}
      <div id="caContent">${loadingHTML()}</div>
    `;

    // Tab events
    $$('#monthTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('#monthTabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        loadMonth(tab.dataset.month);
      });
    });

    if (caIndex.length > 0) {
      loadMonth(caIndex[0].month);
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${escapeHTML(e.message)}</p></div>`;
  }
}

function getMonthName(num) {
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  return months[parseInt(num) - 1] || num;
}

async function loadMonth(month) {
  currentMonth = month;
  currentPage = 1;

  const caContent = $('#caContent');
  caContent.innerHTML = loadingHTML(`${month} লোড হচ্ছে...`);

  try {
    const monthInfo = caIndex.find(m => m.month === month);
    currentItems = await fetchJSON(monthInfo.file);

    renderItems();
  } catch (e) {
    caContent.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${escapeHTML(e.message)}</p></div>`;
  }
}

function renderItems() {
  const page = paginate(currentItems, currentPage, PER_PAGE);

  let html = '<div id="caList">';
  page.items.forEach((item, i) => {
    const idx = (currentPage - 1) * PER_PAGE + i + 1;
    html += `
      <div class="ca-item">
        <div class="ca-question">${idx}. ${escapeHTML(item.title)}</div>
        ${item.answer ? `<div class="ca-answer">উত্তর: ${escapeHTML(item.answer)}</div>` : ''}
        ${item.detail ? `<div class="ca-detail">${escapeHTML(item.detail)}</div>` : ''}
        <div class="ca-meta">
          ${item.date ? `📅 ${escapeHTML(item.date)}` : ''}
          ${item.source ? ` · 📌 ${escapeHTML(item.source)}` : ''}
        </div>
      </div>
    `;
  });
  html += '</div>';

  // Pagination
  if (page.totalPages > 1) {
    const pagEl = paginationHTML(page.page, page.totalPages, (newPage) => {
      currentPage = newPage;
      renderItems();
    });
    if (pagEl) {
      html += '<div id="caPagination"></div>';
      setTimeout(() => {
        const target = $('#caPagination');
        if (target) target.innerHTML = pagEl.outerHTML;
      }, 0);
    }
  }

  $('#caContent').innerHTML = html;
}
