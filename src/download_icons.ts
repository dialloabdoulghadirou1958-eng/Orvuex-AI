import fs from 'fs';
import path from 'path';

const providers = [
  { id: 'openai', domain: 'openai.com' },
  { id: 'deepseek', domain: 'deepseek.com' },
  { id: 'groq', domain: 'groq.com' },
  { id: 'mistral', domain: 'mistral.ai' },
  { id: 'openrouter', domain: 'openrouter.ai' },
  { id: 'gemini', domain: 'gemini.google.com' },
  { id: 'cerebras', domain: 'cerebras.ai' }
];

async function download() {
  fs.mkdirSync('public/icons', { recursive: true });
  for (const p of providers) {
    const url = `https://www.google.com/s2/favicons?sz=64&domain=${p.domain}`;
    try {
      const res = await fetch(url);
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(`public/icons/${p.id}.png`, Buffer.from(buffer));
      console.log(`Downloaded ${p.id}.png`);
    } catch (e) {
      console.error(`Failed ${p.id}`, e);
    }
  }
}
download();
