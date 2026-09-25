// Where animations live: animations/<category>/<slug>/ (category folders in English).
// Every tool finds an animation by its slug alone; slugs stay unique across categories,
// and the published site keeps flat addresses (…/animasyon-studyo/<slug>/).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ANIM = path.join(ROOT, 'animations');

// category folder → label on the site and on YouTube covers
export const CATEGORIES = {
  biology: { tr: 'Biyoloji', cover: 'BİYOLOJİ' },
  history: { tr: 'Tarih', cover: 'TARİH' },
  geography: { tr: 'Coğrafya', cover: 'COĞRAFYA' },
  physics: { tr: 'Fizik', cover: 'FİZİK' },
  chemistry: { tr: 'Kimya', cover: 'KİMYA' },
  math: { tr: 'Matematik', cover: 'MATEMATİK' },
  space: { tr: 'Uzay', cover: 'UZAY' },
  technology: { tr: 'Teknoloji', cover: 'TEKNOLOJİ' },
  software: { tr: 'Yazılım', cover: 'YAZILIM' },
  documentary: { tr: 'Belgesel', cover: 'BELGESEL' },
  short: { tr: 'Kısa Film', cover: 'KISA FİLM' },
};

// all animations: [{ slug, category, dir }] (folders starting with "_" are skipped)
export function listAnimations() {
  const out = [];
  for (const cat of fs.readdirSync(ANIM, { withFileTypes: true })) {
    if (!cat.isDirectory() || cat.name.startsWith('_')) continue;
    const cdir = path.join(ANIM, cat.name);
    for (const a of fs.readdirSync(cdir, { withFileTypes: true })) {
      if (a.isDirectory() && !a.name.startsWith('_') && fs.existsSync(path.join(cdir, a.name, 'animation.json')))
        out.push({ slug: a.name, category: cat.name, dir: path.join(cdir, a.name) });
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

// the folder of one animation, by slug (or "category/slug"); exits with a clear message if missing
export function findAnimation(ref, { exit = true } = {}) {
  const slug = String(ref || '').split('/').pop();
  const hit = listAnimations().find(a => a.slug === slug);
  if (hit) return hit;
  if (exit) {
    console.log(`animasyon bulunamadı: ${ref}\nvar olanlar: ${listAnimations().map(a => `${a.category}/${a.slug}`).join(', ')}`);
    process.exit(1);
  }
  return null;
}
