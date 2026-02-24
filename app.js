/* Savills URL Builder (Demo)
 * Front-end only, safe for corporate PCs and GitHub Pages.
 */


function safeLower(s) {
  return (s ?? '').toString().trim().toLowerCase();
}

function stripDiacritics(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function slugify(title, config) {
  const stopWords = new Set((config.slug?.stopWords || []).map(w => w.toLowerCase()));
  const amp = config.slug?.normalizeAmpersandTo || 'and';
  let s = stripDiacritics(title || '');
  s = s.replace(/&/g, ` ${amp} `);
  s = s.replace(/['’]/g, '');
  s = s.replace(/[^a-zA-Z0-9\s-]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  const tokens = s.split(' ')
    .map(t => safeLower(t))
    .filter(t => t && !stopWords.has(t));

  let slug = tokens.join('-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const maxLen = config.slug?.maxLength || 90;
  if (slug.length > maxLen) slug = slug.slice(0, maxLen).replace(/-+[^-]*$/, '');
  return slug || 'untitled';
}

function buildBasePath({ contentType, industry, year }, config) {
  const ct = config.contentTypes.find(x => x.code === contentType);
  if (!ct) throw new Error('Unknown content type');
  const root = ct.rootPath.replace(/\/$/, '');
  const ind = industry.replace(/^\//, '').replace(/\/$/, '');

  if (config.includeYearInPath) {
    return `${root}/${ind}/${year}`;
  }
  return `${root}/${ind}`;
}

function normalizePath(path) {
  let p = (path || '').trim();
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/+/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function getRegistry(config) {
  const key = config.registry.localStorageKey;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveRegistry(config, rows) {
  localStorage.setItem(config.registry.localStorageKey, JSON.stringify(rows));
}

function findExistingPaths(registry) {
  const set = new Set();
  registry.forEach(r => set.add(r.url_path));
  return set;
}

function generateUniqueUrlPath(basePath, slug, contentId, registry, config) {
  const existing = findExistingPaths(registry);

  // Preferred: append stable contentId for uniqueness
  let finalSlug = slug;
  if (contentId && contentId.trim()) {
    finalSlug = `${slug}-${contentId.trim()}`;
  }

  let candidate = normalizePath(`${basePath}/${finalSlug}`);
  if (!existing.has(candidate)) {
    return { urlPath: candidate, status: contentId ? 'Unique (using Content ID)' : 'Unique' };
  }

  // If contentId was provided and still collides, suffix anyway
  let i = 2;
  while (true) {
    const withSuffix = normalizePath(`${basePath}/${finalSlug}-${i}`);
    if (!existing.has(withSuffix)) {
      return { urlPath: withSuffix, status: `Duplicate found. Suggested unique variant (-${i}).` };
    }
    i += 1;
    if (i > 9999) throw new Error('Too many duplicates. Registry might be corrupted.');
  }
}

function baseUrlForMarket(config, marketCode) {
  const m = config.markets.find(x => x.code === marketCode);
  return m ? m.baseUrl.replace(/\/$/, '') : '';
}

function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

function formatISO(dt = new Date()) {
  return dt.toISOString().slice(0, 19) + 'Z';
}

function renderRegistryTable(registry) {
  const tbody = document.querySelector('#registryTable tbody');
  tbody.innerHTML = '';
  const rows = [...registry].sort((a,b) => (b.created_at || '').localeCompare(a.created_at || ''));
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${(r.created_at || '').replace('T',' ').replace('Z','')}</td>
      <td>${r.status || ''}</td>
      <td>${r.market || ''}</td>
      <td>${r.content_type || ''}</td>
      <td>${r.industry || ''}</td>
      <td>${r.publish_year || ''}</td>
      <td>${escapeHtml(r.title || '')}</td>
      <td><code>${escapeHtml(r.url_path || '')}</code></td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeHtml(s) {
  return (s ?? '').toString()
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function buildRulesText(config) {
  const ctLines = config.contentTypes.map(ct => `- ${ct.label}: rootPath = ${ct.rootPath}`).join('\n');
  const indLines = config.industries.map(i => `- ${i.label} → ${i.code}`).join('\n');
  const mLines = config.markets.map(m => `- ${m.label} → ${m.baseUrl}`).join('\n');
  return [
    `Convention: /insights/{content_type}/{industry}/${config.includeYearInPath ? '{year}/' : ''}{slug}{-content_id?}`,
    '',
    'Content types:',
    ctLines,
    '',
    'Industries:',
    indLines,
    '',
    'Markets:',
    mLines,
    '',
    'Uniqueness:',
    '- Prefer appending CMS Content ID (stable) to the slug.',
    '- Otherwise auto-increment duplicates (-2, -3, ...).'
  ].join('\n');
}

function parseCsv(text) {
  // Minimal CSV parser supporting quoted fields
  const rows = [];
  let cur = [];
  let val = '';
  let inQuotes = false;
  for (let i=0; i<text.length; i++) {
    const c = text[i];
    const next = text[i+1];

    if (inQuotes) {
      if (c === '"' && next === '"') { val += '"'; i++; continue; }
      if (c === '"') { inQuotes = false; continue; }
      val += c; continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { cur.push(val); val=''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && next === '\n') i++;
      cur.push(val); val='';
      // avoid pushing empty trailing line
      if (cur.some(x => x !== '')) rows.push(cur);
      cur = [];
      continue;
    }
    val += c;
  }
  // last row
  cur.push(val);
  if (cur.some(x => x !== '')) rows.push(cur);
  return rows;
}

// --- Smartsheet-friendly CSV import helpers ---
// Smartsheet exports use human column names (e.g., "URL Path", "Content Title").
// The tool internally uses snake_case canonical fields (e.g., url_path, title).
// These helpers normalize and map headers so the same CSV can be round-tripped.
function normalizeHeader(h) {
  return (h ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, '')            // remove parenthetical notes
    .replace(/[^a-z0-9]+/g, '_')          // spaces/punct -> underscore
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function canonicalFieldFromHeader(norm) {
  // Tool canonical fields
  if (norm === 'content_title') return 'title';
  if (norm === 'title') return 'title';

  if (norm === 'content_type') return 'content_type';
  if (norm === 'type') return 'content_type';

  if (norm === 'industry') return 'industry';
  if (norm === 'sector') return 'industry';

  if (norm === 'market') return 'market';
  if (norm === 'country') return 'market';

  if (norm === 'year') return 'publish_year';
  if (norm === 'publish_year') return 'publish_year';
  if (norm === 'publish_date') return 'publish_year';
  if (norm === 'publishdate') return 'publish_year';

  if (norm === 'content_id') return 'content_id';
  if (norm === 'contentid') return 'content_id';
  if (norm === 'id') return 'content_id';

  if (norm === 'slug') return 'slug';
  if (norm === 'slug_base') return 'slug';
  if (norm === 'slugbase') return 'slug';

  if (norm === 'url_path') return 'url_path';
  if (norm === 'urlpath') return 'url_path';
  if (norm === 'path') return 'url_path';

  if (norm === 'full_url') return 'full_url';
  if (norm === 'fullurl') return 'full_url';
  if (norm === 'url') return 'full_url';

  if (norm === 'created_at') return 'created_at';
  if (norm === 'created') return 'created_at';
  if (norm === 'createdat') return 'created_at';

  if (norm === 'status') return 'status';

  if (norm === 'notes') return 'notes';
  if (norm === 'note') return 'notes';

  return null;
}

function toCsv(rows, columns) {
  const escape = (v) => {
    const s = (v ?? '').toString();
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replaceAll('"','""') + '"';
    }
    return s;
  };
  const lines = [];
  lines.push(columns.join(','));
  for (const r of rows) {
    lines.push(columns.map(c => escape(r[c])).join(','));
  }
  return lines.join('\n');
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sampleRegistry(config) {
  const y = config.defaultYear;
  return [
    {
      created_at: formatISO(new Date()),
      status: 'Published',
      title: 'Q4 2025 Retail Market Update',
      market: 'US',
      content_type: 'research',
      industry: 'retail',
      publish_year: y,
      content_id: '386797',
      slug: 'q4-2025-retail-market-update',
      url_path: normalizePath(`/insights/research/retail/${y}/q4-2025-retail-market-update-386797`),
      full_url: baseUrlForMarket(config,'US') + normalizePath(`/insights/research/retail/${y}/q4-2025-retail-market-update-386797`),
      notes: ''
    }
  ];
}

function wireUp(config) {
  document.querySelector('#appTitle').textContent = config.appName;
  document.querySelector('#version').textContent = `v${config.version}`;

  const market = document.querySelector('#market');
  const contentType = document.querySelector('#contentType');
  const industry = document.querySelector('#industry');
  const publishYear = document.querySelector('#publishYear');

  config.markets.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.code; opt.textContent = `${m.code} — ${m.label}`;
    market.appendChild(opt);
  });
  config.contentTypes.forEach(ct => {
    const opt = document.createElement('option');
    opt.value = ct.code; opt.textContent = ct.label;
    contentType.appendChild(opt);
  });
  config.industries.forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.code; opt.textContent = i.label;
    industry.appendChild(opt);
  });

  publishYear.value = config.defaultYear;

  document.querySelector('#rulesBlock').textContent = buildRulesText(config);

  const state = {
    registry: getRegistry(config),
    current: null
  };

  function recompute() {
    const title = document.querySelector('#title').value.trim();
    const ct = contentType.value;
    const ind = industry.value;
    const m = market.value;
    const year = parseInt(publishYear.value || config.defaultYear, 10);
    const contentId = document.querySelector('#contentId').value.trim();
    const notes = document.querySelector('#notes').value.trim();

    const btnSave = document.querySelector('#saveToRegistry');
    const btnCopyPath = document.querySelector('#copyPath');
    const btnCopyFull = document.querySelector('#copyFull');

    if (!title) {
      document.querySelector('#urlPath').textContent = '—';
      document.querySelector('#fullUrl').textContent = '—';
      document.querySelector('#uniqueStatus').textContent = 'Enter a title to generate a URL.';
      btnSave.disabled = true; btnCopyPath.disabled = true; btnCopyFull.disabled = true;
      state.current = null;
      return;
    }

    const slug = slugify(title, config);
    const basePath = buildBasePath({ contentType: ct, industry: ind, year }, config);

    const { urlPath, status } = generateUniqueUrlPath(basePath, slug, contentId, state.registry, config);
    const full = baseUrlForMarket(config, m) + urlPath;

    document.querySelector('#urlPath').textContent = urlPath;
    document.querySelector('#fullUrl').textContent = full;
    document.querySelector('#uniqueStatus').textContent = status;

    btnSave.disabled = false; btnCopyPath.disabled = false; btnCopyFull.disabled = false;

    state.current = {
      created_at: formatISO(new Date()),
      status: 'Draft',
      title,
      market: m,
      content_type: ct,
      industry: ind,
      publish_year: year,
      content_id: contentId || '',
      slug,
      url_path: urlPath,
      full_url: full,
      notes
    };
  }

  // events
  ['title','contentId','notes'].forEach(id => {
    document.querySelector('#'+id).addEventListener('input', recompute);
  });
  [market, contentType, industry, publishYear].forEach(el => el.addEventListener('change', recompute));

  document.querySelector('#copyPath').addEventListener('click', async () => {
    const v = document.querySelector('#urlPath').textContent;
    await copyToClipboard(v);
  });

  document.querySelector('#copyFull').addEventListener('click', async () => {
    const v = document.querySelector('#fullUrl').textContent;
    await copyToClipboard(v);
  });

  document.querySelector('#saveToRegistry').addEventListener('click', () => {
    if (!state.current) return;
    state.registry.push(state.current);
    saveRegistry(config, state.registry);
    renderRegistryTable(state.registry);
    recompute();
  });

  document.querySelector('#clearForm').addEventListener('click', () => {
    document.querySelector('#title').value = '';
    document.querySelector('#contentId').value = '';
    document.querySelector('#notes').value = '';
    publishYear.value = config.defaultYear;
    recompute();
  });

  document.querySelector('#loadSample').addEventListener('click', () => {
    state.registry = sampleRegistry(config);
    saveRegistry(config, state.registry);
    renderRegistryTable(state.registry);
    recompute();
  });

  document.querySelector('#resetRegistry').addEventListener('click', () => {
    if (!confirm('Reset registry? This clears localStorage for this tool.')) return;
    state.registry = [];
    saveRegistry(config, state.registry);
    renderRegistryTable(state.registry);
    recompute();
  });

  document.querySelector('#exportCsv').addEventListener('click', () => {
    const cols = config.registry.csvColumns;
    const csvText = toCsv(state.registry, cols);
    const fname = `savills_url_registry_${new Date().toISOString().slice(0,10)}.csv`;
    download(fname, csvText);
  });

  document.querySelector('#importCsv').addEventListener('change', (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result?.toString() || '';
      const rows = parseCsv(text);
      if (rows.length < 2) { alert('CSV looks empty.'); return; }

      const headerRaw = rows[0].map(h => (h ?? '').toString().trim());
      const headerNorm = headerRaw.map(h => normalizeHeader(h));
      const expected = config.registry.csvColumns;

      // Build a canonical field → column index map so we can import both:
      // - Tool-native CSV headers (snake_case)
      // - Smartsheet exports (Title Case / spaces)
      const canonicalIdx = {};
      headerNorm.forEach((hn, idx) => {
        const canonical = canonicalFieldFromHeader(hn) || (expected.includes(hn) ? hn : null);
        if (!canonical) return;
        // first match wins
        if (canonicalIdx[canonical] === undefined) canonicalIdx[canonical] = idx;
      });

      if (canonicalIdx.url_path === undefined) {
        alert('CSV must include a URL Path column (tool header: url_path, Smartsheet header: URL Path).');
        return;
      }

      const mapped = [];
      for (let i=1;i<rows.length;i++) {
        const r = rows[i];
        const clean = {};
        expected.forEach(c => clean[c] = '');

        // Pull known fields
        Object.entries(canonicalIdx).forEach(([field, idx]) => {
          clean[field] = (r[idx] ?? '').toString().trim();
        });

        // Normalize & enrich
        if (clean.url_path) clean.url_path = normalizePath(clean.url_path);

        // Year might be a date string (e.g., 2026-02-01). Extract year best-effort.
        if (clean.publish_year && !/^\d{4}$/.test(clean.publish_year)) {
          const m = clean.publish_year.match(/(\d{4})/);
          if (m) clean.publish_year = m[1];
        }

        // Slug: if missing but title exists, generate from title.
        if (!clean.slug && clean.title) {
          clean.slug = slugify(clean.title, config);
        }

        // Full URL: if missing but we have market + url_path, build it.
        if (!clean.full_url && clean.market && clean.url_path) {
          clean.full_url = baseUrlForMarket(config, clean.market) + clean.url_path;
        }

        // Created_at: if missing, set now.
        if (!clean.created_at) clean.created_at = formatISO(new Date());
        if (!clean.status) clean.status = 'Imported';

        if (clean.url_path) mapped.push(clean);
      }

      state.registry = mapped;
      saveRegistry(config, state.registry);
      renderRegistryTable(state.registry);
      recompute();
    };
    reader.readAsText(file);
  });

  // initial render
  renderRegistryTable(state.registry);
  recompute();
}

try {
  const cfg = window.SAVILLS_URL_CONFIG;
  if (!cfg) throw new Error('Missing SAVILLS_URL_CONFIG. Check config.js');
  wireUp(cfg);
} catch (err) {
  document.body.innerHTML = `<div style="padding:24px;color:#fff;font-family:system-ui">Failed to load tool config: ${err.message}</div>`;
  console.error(err);
}

