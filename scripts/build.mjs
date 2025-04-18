import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const POSTS_DIR = './posts';
const OUTPUT_DIR = './posts';
const STYLE = '../style.css';

const template = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – km.rowe</title>
  <link rel="stylesheet" href="${STYLE}" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=VT323&display=swap" rel="stylesheet" />
</head>
<body class="alt-mode">
  <div class="scanlines"></div>
  <header>
    <div class="logo blinking-cursor">km.rowe</div>
    <nav>
      <a href="../index.html">home</a>
      <a href="../chapbooks.html">chapbooks</a>
      <a href="../blog.html">blog</a>
      <a href="../links.html">links</a>
    </nav>
    <button class="toggle-mode" onclick="toggleCRT()">green mode</button>
  </header>

  <main>
    <h1>${title}</h1>
    ${body}
  </main>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      const savedMode = localStorage.getItem('mode');
      const body = document.body;
      const modeBtn = document.querySelector('.toggle-mode');
      if (savedMode === 'crt-mode') {
        body.classList.remove('alt-mode');
        body.classList.add('crt-mode');
        if (modeBtn) modeBtn.textContent = 'blue mode';
      } else {
        body.classList.remove('crt-mode');
        body.classList.add('alt-mode');
        if (modeBtn) modeBtn.textContent = 'green mode';
      }
    });

    function toggleCRT() {
      const body = document.body;
      const btn = document.querySelector('.toggle-mode');
      const isAlt = body.classList.contains('alt-mode');
      if (isAlt) {
        body.classList.remove('alt-mode');
        body.classList.add('crt-mode');
        localStorage.setItem('mode', 'crt-mode');
        btn.textContent = 'blue mode';
      } else {
        body.classList.remove('crt-mode');
        body.classList.add('alt-mode');
        localStorage.setItem('mode', 'alt-mode');
        btn.textContent = 'green mode';
      }
    }
  </script>
</body>
</html>`;

const indexTemplate = (category, posts) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${category} – km.rowe</title>
  <link rel="stylesheet" href="${STYLE}" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=VT323&display=swap" rel="stylesheet" />
</head>
<body class="alt-mode">
  <div class="scanlines"></div>
  <header>
    <div class="logo blinking-cursor">km.rowe</div>
    <nav>
      <a href="../index.html">home</a>
      <a href="../chapbooks.html">chapbooks</a>
      <a href="../blog.html">blog</a>
      <a href="../links.html">links</a>
    </nav>
  </header>
  <main class="post-list" style="max-width: 700px; margin: auto; padding: 2rem;">
    <h2>${category}</h2>
    ${posts.map(p => `
      <article>
        <h3><a href="${p.file.replace('.md', '.html')}" target="_blank">${p.title}</a></h3>
        <p>${p.description}</p>
      </article>`).join('\n')}
  </main>
</body>
</html>`;

const posts = [];

const build = async () => {
  const files = await fs.readdir(POSTS_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  for (const file of mdFiles) {
    const filePath = path.join(POSTS_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data, content: body } = matter(content);

    if (!data.title || !data.date || !data.category || !data.description) {
      console.warn(`⚠️ Skipping ${file}: missing frontmatter`);
      continue;
    }

    const html = template(data.title, marked.parse(body));
    const outPath = path.join(OUTPUT_DIR, file.replace('.md', '.html'));
    await fs.writeFile(outPath, html, 'utf-8');

    posts.push({ ...data, file });
  }

  // Sort by date
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  await fs.writeFile(path.join(OUTPUT_DIR, 'posts.json'), JSON.stringify(posts, null, 2));

  // Generate category pages
  const byCategory = {};
  posts.forEach(post => {
    byCategory[post.category] ||= [];
    byCategory[post.category].push(post);
  });

  for (const [category, entries] of Object.entries(byCategory)) {
    const html = indexTemplate(category, entries);
    const filename = category.toLowerCase().replace(/ /g, '-') + '.html';
    await fs.writeFile(path.join(OUTPUT_DIR, filename), html, 'utf-8');
  }

  console.log("✅ Blog build complete.");
};

build();

build();
