// How a subtitle should be read aloud: brackets dropped or reworded, letters and symbols spelled out.
const WORDS = [
  [/\s*\|\s*/g, ' '],
  [/yarım ton \(raster\)/g, 'yarım ton ya da raster'],
  [/hare \(moiré\)/g, 'hare'],
  [/\s*\([^)]*\)/g, ''],
  [/Kısaca CMYK\./g, 'Kısaca bu dört renge ce me ye ka denir.'],
  [/CMYK/g, 'ce me ye ka'],
  [/çokgen/g, 'çok kenarlı'],
  [/Chester Carlson/g, 'Çester Karlson'],
  [/camgöbeği/g, 'cam göbeği'],
  [/\bA4\b/g, 'A dört'],
  [/[“”"]/g, ''],
  [/(\d+)\s*[–-]\s*(\d+)/g, '$1 ile $2'],
  [/−\s*(\d)/g, 'eksi $1'],
  [/°C/g, ' derece'],
  [/µm/g, ' mikrometre'],
];

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
// Turkish words for a whole number: 1938 → "bin dokuz yüz otuz sekiz"
export function numberWords(n) {
  if (n === 0) return 'sıfır';
  const out = [];
  for (const [v, name] of [[1e9, 'milyar'], [1e6, 'milyon'], [1e3, 'bin']]) {
    if (n >= v) { const q = Math.floor(n / v); n %= v; out.push(q === 1 && v === 1e3 ? name : `${numberWords(q)} ${name}`); }
  }
  if (n >= 100) { const q = Math.floor(n / 100); n %= 100; out.push(q === 1 ? 'yüz' : `${ONES[q]} yüz`); }
  if (n >= 10) { out.push(TENS[Math.floor(n / 10)]); n %= 10; }
  if (n) out.push(ONES[n]);
  return out.join(' ');
}

export function spoken(text) {
  let s = text;
  for (const [re, to] of WORDS) s = s.replace(re, to);
  // numbers as words; a suffix after an apostrophe joins the last word (1938'de → ...sekizde)
  s = s.replace(/(\d+)(?:'(\p{L}+))?/gu, (_, d, suf) => numberWords(Number(d)) + (suf || ''));
  return s.replace(/\s+/g, ' ').trim();
}
