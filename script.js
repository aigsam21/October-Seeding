
/* October 2026 report.
   Final KPI data.
   TikTok + Instagram views. */

const monthlyData = {
  '강미경': {
    '5월': [145,145],
    '6월': [106,106],
    '7월': [153,131],
    '8월': [108,98],
    '9월': [168,116],
    '10월': [117,117]
  },

  '신유': {
    '5월': [119,119],
    '6월': [108,107],
    '7월': [116,106],
    '8월': [106,95],
    '9월': [147,99],
    '10월': [120,118]
  },

  '유연식': {
    '5월': [100,100],
    '6월': [101,97],
    '7월': [171,134],
    '8월': [108,101],
    '9월': [99,98],
    '10월': [132,131]
  }
};

const months = [
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월'
];

const managers = [
  '강미경',
  '신유',
  '유연식'
];

const monthTable =
  document.getElementById('monthly-table');

function cell(s, cls = '') {
  return `<div${cls ? ` class="${cls}"` : ''}>${s}</div>`;
}

function monthCell(vals, month) {
  return cell(
    `<strong>${vals[0]}</strong><span> / ${vals[1]}</span>`,
    month === '10월' ? 'current-month' : ''
  );
}

let html =
  '<div class="monthly-row monthly-header">' +
  cell('담당자','monthly-person') +

  months.map(m =>
    cell(
      `<strong>${m}</strong><small>콘텐츠 / 크리에이터</small>`,
      m === '10월' ? 'current-month' : ''
    )
  ).join('') +

  '</div>';

for (const manager of managers) {
  html +=
    '<div class="monthly-row">' +
    cell(manager,'monthly-person') +

    months.map(m =>
      monthCell(monthlyData[manager][m],m)
    ).join('') +

    '</div>';
}

html +=
  '<div class="monthly-row monthly-total">' +
  cell('TOTAL','monthly-person') +

  months.map(m =>
    monthCell(
      managers.reduce(
        (a,n) => [
          a[0] + monthlyData[n][m][0],
          a[1] + monthlyData[n][m][1]
        ],
        [0,0]
      ),
      m
    )
  ).join('') +

  '</div>';

monthTable.innerHTML = html;

const number = n =>
  new Intl.NumberFormat('en-US').format(n);

const escapeHtml = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c])
  );

function normalizeUrl(url) {
  return String(url ?? '')
    .split(/[?#]/)[0]
    .replace(/\/+$/,'');
}

function getVideoKey(v, platform) {
  const url = String(v.url || '');

  if (platform === 'TikTok') {
    return url.match(/\/video\/(\d+)/)?.[1]
      || v.video_id
      || normalizeUrl(url);
  }

  return url.match(
    /\/(?:reels?|p|tv)\/([^/?#]+)/
  )?.[1]
    || v.video_id
    || normalizeUrl(url);
}

function sumViews(videos) {
  return videos.reduce(
    (sum,v) => sum + v.views,
    0
  );
}

async function loadMetrics(file, platform) {
  try {
    const response = await fetch(
      file + '?ts=' + Date.now(),
      {cache:'no-store'}
    );

    if (!response.ok) {
      throw new Error(file);
    }

    const data = await response.json();

    const videos = Array.isArray(data.videos)
      ? data.videos
      : [];

    const unique = new Map();

    for (const v of videos) {

      if (
        typeof v.views !== 'number' ||
        !Number.isFinite(v.views) ||
        v.views < 0
      ) continue;

      const key = getVideoKey(v, platform);

      if (!key) continue;

      unique.set(String(key), {
        ...v,
        manager: v.manager || v.owner || '',
        platform
      });
    }

    return {
      platform,
      videos: [...unique.values()]
    };

  } catch (error) {

    console.warn(
      platform + ' metrics unavailable',
      error
    );

    return {
      platform,
      videos: []
    };
  }
}

function videoLink(v) {
  try {
    const url = new URL(v.url);

    const validHost =
      v.platform === 'TikTok'
        ? /(^|\.)tiktok\.com$/.test(url.hostname)
        : /(^|\.)instagram\.com$/.test(url.hostname);

    if (
      url.protocol !== 'https:' ||
      !validHost
    ) return '—';

    return `<a href="${escapeHtml(url.href)}"
      target="_blank"
      rel="noopener noreferrer">
      ${escapeHtml(v.platform)} ↗
    </a>`;

  } catch {
    return '—';
  }
}

const groups = {
  TikTok: [],
  Instagram: []
};

function renderViews() {

  const tiktok = groups.TikTok;
  const instagram = groups.Instagram;

  const videos = [
    ...tiktok,
    ...instagram
  ];

  const total = sumViews(videos);

  document.getElementById(
    'total-views'
  ).textContent =
    videos.length
      ? number(total)
      : '—';

  document.getElementById(
    'tiktok-views'
  ).textContent =
    tiktok.length
      ? number(sumViews(tiktok))
      : '—';

  document.getElementById(
    'instagram-views'
  ).textContent =
    instagram.length
      ? number(sumViews(instagram))
      : '—';

  document.getElementById(
    'avg-views'
  ).textContent =
    videos.length
      ? number(Math.round(total / videos.length))
      : '—';

  // Update manager KPI table.

  document.querySelectorAll(
    '[data-manager]'
  ).forEach(el => {

    const manager = el.dataset.manager;

    const subset = videos.filter(
      v => v.manager === manager
    );

    el.textContent =
      manager === 'TOTAL'
        ? (
            videos.length
              ? number(total)
              : '—'
          )
        : subset.length
          ? number(sumViews(subset))
          : '—';
  });

  // Combined TikTok and Instagram TOP 10.

  const top = [...videos]
    .sort((a,b) => b.views - a.views)
    .slice(0,10);

  document.getElementById(
    'top-videos'
  ).innerHTML = top.length

    ? top.map((v,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${escapeHtml(v.platform)}</td>
        <td>${escapeHtml(v.manager)}</td>
        <td>${escapeHtml(v.creator)}</td>
        <td>${number(v.views)}</td>
        <td>${videoLink(v)}</td>
      </tr>
    `).join('')

    : '<tr><td colspan="6">집계 대기 중</td></tr>';
}

// Load TikTok metrics.

loadMetrics(
  'metrics.json',
  'TikTok'
).then(result => {
  groups.TikTok = result.videos;
  renderViews();
});

// Load Instagram metrics.

loadMetrics(
  'instagram_metrics.json',
  'Instagram'
).then(result => {
  groups.Instagram = result.videos;
  renderViews();
});
