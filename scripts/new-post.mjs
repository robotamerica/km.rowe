// scripts/new-post.mjs
import fs from 'fs';
import path from 'path';

const titleSlug = process.argv[2];
if (!titleSlug) {
  console.error('Usage: node scripts/new-post.mjs "my-post-title"');
  process.exit(1);
}

const date = new Date().toISOString().split('T')[0];
const filename = `${titleSlug.toLowerCase().replace(/\\s+/g, '-')}.md`;
const filepath = path.join('posts', filename);

const template = `---
title: "${titleSlug.replace(/-/g, ' ')}"
date: "${date}"
category: "general"
description: "A short summary of what this post is about."
---

# ${titleSlug.replace(/-/g, ' ')}

Write your post content here.
`;

fs.writeFileSync(filepath, template);
console.log(`✅ Created ${filepath}`);