// Opens an empty folder for a new animation: animations/<category>/<slug>/ with animation.json and README.md only.
//   node tools/new-animation.mjs <category>/<slug> "<Başlık>"      e.g. biology/heartbeat "Kalbin Bir Atımı"
// category: an English folder name (biology, history, geography, physics, chemistry, math, space, technology, software…)
// slug: lowercase letters, digits and dashes, unique across all categories (the site address is …/<slug>/)
// Nothing is copied from other animations on purpose: every animation chooses its own technique,
// packages, engine and visual style for what it has to show. Fill in "tech" and "build" once decided.
import fs from 'fs';
import path from 'path';
import { ANIM, CATEGORIES, findAnimation } from './lib/animations.mjs';

const [ref, ...titleParts] = process.argv.slice(2);
const title = titleParts.join(' ').trim();
const [category, slug] = String(ref || '').includes('/') ? ref.split('/') : [null, ref];
const okName = s => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || '');
if (!category || !okName(category) || !okName(slug) || !title) {
  console.log('usage: npm run new -- <kategori>/<slug> "<Başlık>"   (ör. biology/heartbeat "Kalbin Bir Atımı")');
  console.log('kategoriler: ' + Object.keys(CATEGORIES).join(', ') + ' (yeni bir İngilizce ad da olur)');
  process.exit(1);
}
if (findAnimation(slug, { exit: false })) { console.log(`"${slug}" adında bir animasyon zaten var (slug bütün kategorilerde tek olmalı).`); process.exit(1); }
if (!CATEGORIES[category]) console.log(`not: "${category}" yeni bir kategori; tools/lib/animations.mjs → CATEGORIES listesine Türkçe adını ekleyin.`);
const dir = path.join(ANIM, category, slug);
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'animation.json'), JSON.stringify({
  slug,
  title,
  description: '',
  tech: '',
  build: '',
  output: 'dist',
}, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'README.md'), `# ${title}

Ne anlattığı, bölümleri, nasıl derlendiği ve (varsa) video ya da model adımları.
`);
console.log(`animations/${category}/${slug} oluşturuldu (boş).
  animation.json → description, tech ve build alanlarını doldurun; build komutu output klasörüne index.html üretmeli.`);
