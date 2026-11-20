import fs from 'node:fs';

const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('Missing APIFY_TOKEN GitHub secret');
const all = JSON.parse(fs.readFileSync('tiktok_videos.json', 'utf8'));
const test = process.env.TEST_MODE === 'true';
const selected = test ? all.slice(0, 5) : all;
const old = JSON.parse(fs.readFileSync('metrics.json', 'utf8'));
const oldMap = new Map((old.videos || []).filter(v => v.video_id).map(v => [String(v.video_id), v]));
const byId = new Map(all.map(v => [String(v.video_id), v]));
const results = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getId(v) {
  const raw = String(v.id ?? v.videoId ?? v.aweme_id ?? v.webVideoUrl ?? v.url ?? v.input ?? '');
  return raw.match(/\/video\/(\d+)/)?.[1] || raw.match(/^\d{15,22}$/)?.[0] || null;
}
function getViews(v) {
  const candidates = [v.playCount, v.stats?.playCount, v.stats?.play_count, v.statistics?.play_count, v.video?.stats?.playCount, v.views, v.viewCount];
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c >= 0) return c;
    if (typeof c === 'string' && /^\d+$/.test(c.trim())) return Number(c);
  }
  return null;
}
async function scrape(batch) {
  const resp = await fetch('https://api.apify.com/v2/acts/clockworks~tiktok-video-scraper/runs', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({postURLs: batch.map(v => v.url), scrapeRelatedVideos: false, shouldDownloadVideos: false, shouldDownloadCovers: false, downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES'})
  });
  if (!resp.ok) throw new Error(`Apify start failed: ${resp.status} ${await resp.text()}`);
  const run = (await resp.json()).data;
  let state = run.status;
  for (let i = 0; i < 100 && !['SUCCEEDED','FAILED','ABORTED','TIMED-OUT'].includes(state); i++) {
    await sleep(6000);
    const check = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}`, {headers: {'Authorization': `Bearer ${token}`}});
    if (!check.ok) throw new Error(`Apify status failed: ${check.status}`);
    state = (await check.json()).data.status;
  }
  if (state !== 'SUCCEEDED') throw new Error(`Apify run ${run.id}: ${state}`);
  const dataset = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?format=json&clean=true`, {headers: {'Authorization': `Bearer ${token}`}});
  if (!dataset.ok) throw new Error(`Apify dataset failed: ${dataset.status}`);
  return dataset.json();
}

for (let offset=0; offset<selected.length; offset+=25) {
  const batch=selected.slice(offset,offset+25);
  const items=await scrape(batch);
  let found=0;
  for (const item of items) {
    if (item.errorCode || item.error) continue;
    const id=getId(item);
    const views=getViews(item);
    if (id && byId.has(id) && views !== null) {
      results.set(id, {...byId.get(id), views}); found++;
    }
  }
  console.log(`Batch ${Math.floor(offset/25)+1}: ${found}/${batch.length} matched videos with views`);
}

// Keep older valid metrics for videos that could not be refreshed; never invent zero views.
for (const [id, video] of oldMap) {
  if (byId.has(id) && !results.has(id) && typeof video.views === 'number' && Number.isFinite(video.views)) {
    results.set(id, {...byId.get(id), views:video.views});
  }
}
if (!results.size) throw new Error('No valid views collected; metrics.json left unchanged');
const output={updated_at:new Date().toISOString(),videos:[...results.values()]};
fs.writeFileSync('metrics.json', JSON.stringify(output,null,2)+'\n');
console.log(`Saved ${results.size} videos; mode=${test?'TEST':'FULL'}`);
