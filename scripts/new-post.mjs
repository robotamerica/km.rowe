// scripts/new-post.mjs
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '..');
const POSTS_DIR  = path.join(repoRoot, 'posts');

function toSlug(s) {
  return s.toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function usage() {
  console.log('Usage: node scripts/new-post.mjs "Title here" [category] [description]');
  process.exit(1);
}

const [ , , titleArg, categoryArg = 'general', ...descParts ] = process.argv;
if (!titleArg) usage();
const descriptionArg = descParts.join(' ').trim();

const slug = toSlug(titleArg);
const mdPath = path.join(POSTS_DIR, `${slug}.md`);
const today = new Date().toISOString().slice(0,10);

const template = `---
title: "${titleArg.replace(/"/g, '\\"')}"
date: ${today}
category: "${categoryArg.replace(/"/g, '\\"')}"
description: "${descriptionArg.replace(/"/g, '\\"')}"
---

# ${titleArg}

Write your post in **Markdown** here.
`;

(async () => {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  if (fss.existsSync(mdPath)) {
    console.error(`Refusing to overwrite existing file: ${mdPath}`);
    process.exit(2);
  }
  await fs.writeFile(mdPath, template, 'utf8');
  console.log(`Created ${mdPath}`);
})();
