// scripts/build.mjs
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '..');
const POSTS_DIR  = path.join(repoRoot, 'posts');
const JSON_PATH  = path.join(POSTS_DIR, 'posts.json');

// ---------- Utilities ----------
const exists = async (p) => !!(await fs.stat(p).catch(() => null));

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

function parseFrontMatter(src) {
  // very small YAML-ish front matter: key: value, first block between --- lines
  if (!src.startsWith('---')) return [{}, src];
  const end = src.indexOf('\n---', 3);
  if (end === -1) return [{}, src];
  const head = src.slice(3, end).trim();
  const body = src.slice(end + 4).replace(/^\r?\n/, '');
  const meta = {};
  for (const line of head.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (!m) continue;
    let [, k, v] = m;
    v = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    meta[k] = v;
  }
  return [meta, body];
}

function toSlug(s) {
  return s.toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Minimal Markdown → HTML (headings, lists, code fences, links, emphasis, paras)
function mdToHtml(md) {
  // protect fenced code first
  const fenceRe = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks = [];
  md = md.replace(fenceRe, (_, lang = '', code) => {
    const idx = codeBlocks.push({ lang, code }) - 1;
    return `§§CODEBLOCK_${idx}§§`;
  });

  // headings
  md = md.replace(/^######\s+(.*)$/gm, (_, t) => `<h6>${t}</h6>`);
  md = md.replace(/^#####\s+(.*)$/gm,  (_, t) => `<h5>${t}</h5>`);
  md = md.replace(/^####\s+(.*)$/gm,   (_, t) => `<h4>${t}</h4>`);
  md = md.replace(/^###\s+(.*)$/gm,    (_, t) => `<h3>${t}</h3>`);
  md = md.replace(/^##\s+(.*)$/gm,     (_, t) => `<h2>${t}</h2>`);
  md = md.replace(/^#\s+(.*)$/gm,      (_, t) => `<h1>${t}</h1>`);

  // unordered lists (consecutive - / * lines)
  md = md.replace(
    /(^|\n)(?:[-*]\s+.+(?:\n|$))+?/g,
    (block) => {
      const items = block.trim().split('\n').map(l => l.replace(/^[-*]\s+/, '').trim());
      const li = items.map(i => `<li>${i}</li>`).join('');
      return `\n<ul>${li}</ul>\n`;
    }
  );

  // inline code
  md = md.replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`);

  // links [text](url)
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safe = escapeHtml(url);
    return `<a href="${safe}">${text}</a>`;
  });

  // emphasis **bold** and *italics*
  md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // paragraphs: split on blank lines, avoid wrapping block tags
  const blocks = md.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  const html = blocks.map(b => {
    if (/^<(h\d|ul|pre|blockquote)/i.test(b)) return b;
    return `<p>${b.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  // restore code fences
  return html.replace(/§§CODEBLOCK_(\d+)§§/g, (_, i) => {
    const { lang, code } = codeBlocks[+i];
    return `<pre><code class="lang-${lang}">${escapeHtml(code)}</code></pre>`;
  });
}

function postTemplate({ title, htmlBody }) {
  // Root-absolute assets so paths work from /posts/*
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – km.rowe</title>
  <link rel="stylesheet" href="/style.css" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=VT323&display=swap" rel="stylesheet" />
  <link rel="icon" type="image/png" href="/favicon.png" />
</head>
<body class="alt-mode">
  <div class="scanlines"></div>
  <header>
    <div class="logo blinking-cursor">km.rowe</div>
    <nav>
      <a href="/index.html">home</a>
      <a href="/chapbooks.html">chapbooks</a>
      <a href="/blog.html">blog</a>
      <a href="/links.html">links</a>
    </nav>
    <button class="toggle-mode" id="modeToggle">green mode</button>
  </header>

  <main style="max-width: 720px; margin: 2rem auto; padding: 0 1rem;">
    <h1>${title}</h1>
    ${htmlBody}
  </main>

  <script src="/mode.js"></script>
</body>
</html>`;
}

// ---------- Build pipeline ----------
async function getMarkdownFiles() {
  if (!(await exists(POSTS_DIR))) await fs.mkdir(POSTS_DIR, { recursive: true });
  const entries = await fs.readdir(POSTS_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && /\.md$/i.test(e.name))
    .map(e => path.join(POSTS_DIR, e.name));
}

async function buildOne(mdPath) {
  const raw = await fs.readFile(mdPath, 'utf8');
  const [meta, md] = parseFrontMatter(raw);
  const base = path.basename(mdPath).replace(/\.md$/i, '');
  const title = meta.title?.trim() || base.replace(/[-_]+/g, ' ');
  const date  = meta.date?.trim() || new Date(fss.statSync(mdPath).mtime).toISOString().slice(0,10);
  const category = meta.category?.trim() || 'general';
  const description = meta.description?.trim() || md.split('\n').find(Boolean)?.slice(0, 160) || '';

  const htmlBody = mdToHtml(md);
  const htmlName = base + '.html';
  const htmlPath = path.join(POSTS_DIR, htmlName);
  const page = postTemplate({ title, htmlBody });

  await fs.writeFile(htmlPath, page, 'utf8');

  return { title, date, category, description, file: htmlName };
}

async function build() {
  const files = await getMarkdownFiles();
  const items = [];
  for (const f of files) {
    const entry = await buildOne(f);
    items.push(entry);
  }
  // sort newest first
  items.sort((a,b) => new Date(b.date) - new Date(a.date));
  await fs.writeFile(JSON_PATH, JSON.stringify(items, null, 2), 'utf8');
  console.log(`Built ${items.length} posts → posts/*.html and posts/posts.json`);
}

// Run
build().catch(err => {
  console.error(err);
  process.exit(1);
});
