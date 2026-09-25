// Scenes 7–15: auto-configuration, starters, run() in slow motion, a request's journey, the proxy trap,
// config layers, the executable jar, the ending.
import { C, SANS, MONO, clamp, lerp, eo, eio, back, ramp, win, rand, rr, card, text, arrow, along, pill, tick, cross, stamp, bean, terminal, measure } from './draw.js';
import { LOGS } from './scenes1.js';

const P = (t, S) => (k, d = 0.7, o = 0) => eo(ramp(t, S.at(k) + o, d));

// ------------------------------------------------------------------ 7. auto-configuration
const AUTO_JAVA = `// sadeleştirilmiş
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
public class DataSourceAutoConfiguration {

  @Bean
  @ConditionalOnMissingBean
  DataSource dataSource(DataSourceProperties p) {
    return p.initializeDataSourceBuilder()
            .build();   // HikariDataSource
  }
}`;
const MY_JAVA = `@Configuration
public class MyDbConfig {

  @Bean
  DataSource dataSource() {
    return new HikariDataSource(myConfig);
  }
}
// → Boot'un dataSource() tanımı atlanır`;
const IMPORTS = `# AutoConfiguration.imports
…jdbc.DataSourceAutoConfiguration
…jackson.JacksonAutoConfiguration
…webmvc.WebMvcAutoConfiguration
…tomcat.TomcatServletWebServer…
…orm.jpa.HibernateJpaAutoConfiguration
…transaction.TransactionAutoConfiguration
…security.SecurityAutoConfiguration
…data.mongo.MongoAutoConfiguration
…kafka.KafkaAutoConfiguration
…`;
const GRID_R = rand(7);
const GRID = Array.from({ length: 108 }, () => GRID_R() < 0.24);
export const autoconfig = {
  code: [
    { at: 0, file: 'AutoConfiguration.imports', lang: 'props', code: IMPORTS, hl: null },
    { at: 'c1', file: 'DataSourceAutoConfiguration.java', lang: 'java', code: AUTO_JAVA, hl: [3, 3] },
    { at: 'c3', hl: [6, 8] },
    { at: 'mine', file: 'MyDbConfig.java', lang: 'java', code: MY_JAVA, hl: [4, 7] },
    { at: 'chain', file: 'DataSourceAutoConfiguration.java', lang: 'java', code: AUTO_JAVA, hl: [2, 7] },
  ],
  sfx: [['file', 'paper'], ['test', 'scan'], ['c1', 'tick'], ['c1x', 'buzz'], ['c2', 'click'], ['c3', 'tick'], ['back', 'whoosh'], ['chain', 'ding']],
  draw(g, t, S) {
    const p = P(t, S);
    // candidate grid, evaluated by a sweep
    const gl = p('list', 0.8);
    const sweep = ramp(t, S.at('test'), 2.6);
    const shrink = p('c1', 0.8);
    g.save();
    g.translate(lerp(0, 40, shrink), 0); g.scale(1, lerp(1, 0.62, shrink));
    card(g, 20, 20, 960, 260, { fill: C.sheet, alpha: p('file', 0.6), r: 10 });
    text(g, 'AutoConfiguration.imports', 44, 48, { size: 22, font: MONO, weight: 700, color: C.blue, alpha: p('file', 0.6) });
    text(g, '100+ aday', 956, 48, { size: 22, weight: 700, align: 'right', alpha: gl, color: C.ink2 });
    for (let i = 0; i < GRID.length; i++) {
      const c = i % 18, r = Math.floor(i / 18);
      const x = 44 + c * 51.5, y = 78 + r * 32;
      const a = clamp(gl * 3 - (i / GRID.length) * 2);
      if (a <= 0) continue;
      const done = sweep * GRID.length > i;
      const on = done && GRID[i];
      g.save(); g.globalAlpha *= a * (done && !on ? 0.35 : 1);
      rr(g, x, y, 44, 24, 5);
      g.fillStyle = on ? C.green : done ? C.shade : C.blueSoft; g.fill();
      g.strokeStyle = on ? '#1E6B43' : 'rgba(28,34,48,0.25)'; g.lineWidth = 1.5; g.stroke();
      g.restore();
    }
    g.restore();
    if (shrink <= 0) return;
    // three condition gates, each with its own example
    const cols = [
      { k: 'c1', x: 20, h1: '@ConditionalOnClass', h2: '(Tomcat.class)' },
      { k: 'c2', x: 350, h1: '@ConditionalOnProperty', h2: '(…enabled=true)' },
      { k: 'c3', x: 680, h1: '@ConditionalOnMissingBean', h2: '(DataSource)' },
    ];
    cols.forEach((c, i) => {
      const a = p(c.k, 0.6);
      if (a <= 0) return;
      card(g, c.x, 200, 300, 420, { fill: C.sheet, alpha: a, r: 12 });
      text(g, c.h1, c.x + 150, 234, { size: 20, font: MONO, weight: 700, color: C.amberDeep, align: 'center', alpha: a, max: 280 });
      text(g, c.h2, c.x + 150, 264, { size: 19, font: MONO, color: C.ink2, align: 'center', alpha: a, max: 280 });
      // gate bar
      let ok = true;
      if (i === 0) ok = !(win(t, S.at('c1x'), S.at('c2') - 0.2, 0.3) > 0.5);
      if (i === 2) ok = !(t > S.at('mine') + 0.6);
      const col = ok ? C.green : C.red;
      g.save(); g.globalAlpha *= a;
      g.fillStyle = col; rr(g, c.x + 30, 300, 240, 12, 6); g.fill();
      g.restore();
      text(g, ok ? '✓ devrede' : i === 2 ? '✗ geri çekildi' : '✗ devreye girmez', c.x + 150, 590, { size: 23, weight: 800, align: 'center', color: col, alpha: a });
    });
    // gate 1: the classpath
    const a1 = p('c1', 0.6);
    const gone = win(t, S.at('c1x'), S.at('c2') - 0.2, 0.3);
    ['spring-webmvc', 'tomcat-embed-core', 'jackson-databind'].forEach((j, i) => {
      const y = 350 + i * 62, isT = i === 1;
      const a = a1 * (isT ? 1 - 0.8 * gone : 1);
      card(g, 50, y, 240, 46, { fill: isT ? '#FCEBD9' : C.paper2, alpha: a, r: 6, dash: isT && gone > 0.5 ? [6, 5] : null, lift: 0.5 });
      text(g, j + '.jar', 170, y + 24, { size: 18, font: MONO, align: 'center', alpha: a, max: 220, weight: isT ? 700 : 500 });
    });
    text(g, 'classpath', 170, 540, { size: 19, weight: 700, color: C.ink2, align: 'center', alpha: a1 });
    // gate 2: a property switch
    const a2 = p('c2', 0.6);
    if (a2 > 0) {
      g.save(); g.globalAlpha *= a2;
      const on = ramp(t, S.at('c2') + 0.5, 0.3);
      rr(g, 440, 400, 120, 60, 30); g.fillStyle = on > 0.5 ? C.green : C.ink3; g.fill();
      g.beginPath(); g.arc(470 + 60 * eo(on), 430, 24, 0, 7); g.fillStyle = '#fff'; g.fill();
      g.restore();
      text(g, 'ayarlarda açık mı?', 500, 500, { size: 21, align: 'center', color: C.ink2, alpha: a2, weight: 600 });
    }
    // gate 3: your bean wins
    const a3 = p('c3', 0.6);
    if (a3 > 0) {
      const mine = p('mine', 0.6), bk = p('back', 0.8);
      card(g, 700, 330, 260, 110, { fill: 'rgba(233,226,212,0.8)', stroke: C.ink, alpha: a3 * mine, r: 10, lift: 0 });
      text(g, 'bağlam', 716, 348, { size: 16, weight: 700, color: C.ink2, alpha: a3 * mine });
      bean(g, 'DataSource', 725, 360, 210, 66, { alpha: a3 * mine, sub: 'senin', size: 19 });
      const bx = 725 + 30 * bk;
      bean(g, 'DataSource', bx, 460, 210, 66, { alpha: a3 * (1 - 0.6 * bk), ghost: true, sub: 'Boot varsayılanı', size: 19 });
      
    }
    // the chain
    const ch = p('chain', 0.8);
    if (ch > 0) {
      g.save(); g.globalAlpha *= ch;
      for (let i = 0; i < 2; i++) {
        const x = 320 + i * 330;
        g.strokeStyle = C.ink; g.lineWidth = 5;
        g.beginPath(); g.ellipse(x, 306, 18, 10, 0, 0, 7); g.stroke();
        g.beginPath(); g.ellipse(x + 20, 306, 18, 10, 0, 0, 7); g.stroke();
      }
      g.restore();
    }
  },
};

// ------------------------------------------------------------------ 8. starters
const POM = `<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>
  </dependency>
</dependencies>`;
const POM0 = `<dependencies>
  <!-- boş: web yok, Tomcat yok -->
</dependencies>`;
const DEBUG = `$ java -jar shop.jar --debug

# ya da application.properties:
debug=true`;
export const starters = {
  code: [
    { at: 0, file: 'pom.xml', lang: 'xml', code: POM0, hl: null },
    { at: 'pom', file: 'pom.xml', lang: 'xml', code: POM, hl: [2, 5], type: true },
    { at: 'debug', file: 'terminal', lang: 'sh', code: DEBUG, hl: [1, 1] },
  ],
  sfx: [['pom', 'tick'], ['fan', 'whoosh'], ['f1', 'pop'], ['f2', 'pop'], ['f3', 'pop'], ['cp', 'thunk'], ['flip', 'scan'], ['debug', 'tick'], ['report', 'paper']],
  draw(g, t, S) {
    const p = P(t, S);
    const dbg = p('debug', 0.6);
    const top = 1 - dbg;
    g.save(); g.globalAlpha *= top;
    // the starter box: nearly empty
    const sb = p('pom', 0.7);
    card(g, 30, 60, 380, 170, { fill: C.sheet, alpha: sb, r: 12 });
    text(g, 'spring-boot-starter-webmvc', 220, 96, { size: 20, font: MONO, weight: 700, align: 'center', alpha: sb, max: 350 });
    const em = p('empty', 0.6);
    card(g, 60, 124, 320, 84, { fill: 'transparent', stroke: C.ink3, dash: [7, 6], alpha: em, lift: 0, shadow: false, r: 8 });
    text(g, 'kod yok, yalnızca bağımlılık listesi', 220, 166, { size: 19, align: 'center', color: C.ink2, alpha: em, weight: 600, max: 300 });
    // the bundle it brings
    const deps = [['f1', 'spring-webmvc'], ['f2', 'tomcat-embed-core'], ['f3', 'jackson-databind']];
    deps.forEach(([k, name], i) => {
      const a = p(k, 0.6);
      const y = 40 + i * 78;
      arrow(g, [[410, 145], [470, 145], [470, y + 30], [540, y + 30]], { k: p('fan', 0.6, i * 0.15), color: C.ink2, lw: 2.2, head: 10 });
      card(g, 550, y, 330, 60, { fill: '#FFF8EA', alpha: a, r: 8 });
      g.save(); g.globalAlpha *= a; g.fillStyle = C.amber; g.fillRect(550, y + 8, 10, 44); g.restore();
      text(g, name + '.jar', 715, y + 30, { size: 21, font: MONO, weight: 700, align: 'center', alpha: a, max: 300 });
    });
    // classpath rail
    const cp = p('cp', 0.6);
    card(g, 20, 300, 960, 88, { fill: C.paper2, alpha: cp, r: 10 });
    text(g, 'classpath', 40, 322, { size: 18, weight: 700, color: C.ink2, alpha: cp });
    ['spring-core', 'spring-context', 'spring-boot', 'webmvc', 'tomcat', 'jackson'].forEach((j, i) => {
      const isNew = i >= 3;
      const k = isNew ? eo(ramp(t, S.at('cp') + 0.2 + (i - 3) * 0.2, 0.5)) : cp;
      const y = 340 + (isNew ? -40 * (1 - k) : 0);
      card(g, 40 + i * 155, y, 140, 38, { fill: isNew ? '#FFF1D2' : C.sheet, stroke: isNew ? C.amberDeep : C.ink, alpha: k, r: 6, lift: 0.4 });
      text(g, j, 110 + i * 155, y + 20, { size: 17, font: MONO, align: 'center', alpha: k, weight: isNew ? 700 : 500, max: 128 });
    });
    // conditions flipping in a wave
    const fl = p('flip', 0.5);
    if (fl > 0) {
      const wave = (t - S.at('flip')) * 700;
      const names = ['WebMvc', 'Tomcat', 'Jackson', 'Dispatcher', 'ErrorMvc', 'Multipart', 'HttpEncoding', 'Mongo', 'Kafka', 'Redis', 'Mail', 'Quartz'];
      const will = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
      names.forEach((n, i) => {
        const c = i % 6, r = Math.floor(i / 6);
        const x = 40 + c * 157, y = 420 + r * 62;
        const turned = will[i] && wave > x - 20;
        card(g, x, y, 140, 46, { fill: turned ? C.green : C.shade, stroke: turned ? '#1E6B43' : 'rgba(28,34,48,0.3)', alpha: fl * (turned ? 1 : 0.7), r: 6, lift: turned ? 0.5 : 0 });
        text(g, n, x + 70, y + 24, { size: 17, font: MONO, weight: 700, align: 'center', color: turned ? '#fff' : C.ink2, alpha: fl, max: 128 });
      });
      text(g, 'koşullar yeniden değerlendirildi', 500, 580, { size: 22, weight: 700, align: 'center', color: C.green, alpha: p('flip', 0.5, 1) });
    }
    g.restore();
    // the conditions evaluation report
    if (dbg > 0) {
      const rp = p('report', 0.6);
      terminal(g, 30, 30, 940, 590, { title: 'java -jar shop.jar --debug', alpha: dbg });
      g.save(); g.globalAlpha *= dbg * rp;
      const L = [
        ['============================', C.termText, 0],
        ['CONDITIONS EVALUATION REPORT', '#FFFFFF', 0],
        ['============================', C.termText, 0],
        ['Positive matches:', '#7FC49B', 'pos'],
        ['   WebMvcAutoConfiguration matched:', C.termText, 'pos'],
        ["      - @ConditionalOnClass found required", C.termText, 'pos'],
        ["        class 'DispatcherServlet'", '#7FC49B', 'pos'],
        ['Negative matches:', '#F29A7F', 'neg'],
        ['   MongoAutoConfiguration:', C.termText, 'neg'],
        ['      Did not match:', C.termText, 'neg'],
        ["      - @ConditionalOnClass did not find", C.termText, 'neg'],
        ["        required class 'MongoClient'", '#F29A7F', 'neg'],
      ];
      L.forEach(([s, c, k], i) => {
        const a = k ? p(k, 0.5, 0.05 * i) : 1;
        text(g, s, 60, 90 + i * 42, { size: 21, font: MONO, color: c, alpha: a, weight: i === 1 || i === 3 || i === 7 ? 700 : 500 });
      });
      g.restore();
    }
  },
};

// ------------------------------------------------------------------ 9. run() in slow motion (wide)
const STAGES = [
  { k: 'e1', from: 0, to: 0.18, name: 'Environment' },
  { k: 'e2', from: 0.18, to: 0.24, name: 'tür' },
  { k: 'e3', from: 0.24, to: 2.08, name: 'refresh()' },
  { k: 'e4', from: 2.08, to: 2.134, name: 'runner' },
];
const REFRESH = [
  { k: 'r1', a: 'tarifler', b: 'BeanFactory-', c: 'PostProcessor', at: 0.30 },
  { k: 'r2', a: 'işlemciler', b: 'BeanPostProcessor', c: 'kaydı', at: 0.88 },
  { k: 'r3', a: 'onRefresh()', b: 'gömülü Tomcat', c: 'yaratılır', at: 0.94 },
  { k: 'r4', a: 'singleton\'lar', b: 'bean\'ler', c: 'üretilir', at: 1.21 },
  { k: 'r5', a: 'finishRefresh()', b: 'Tomcat portu', c: 'açar', at: 2.08 },
];
export const run = {
  wide: true,
  sfx: [['e1', 'tick'], ['e2', 'tick'], ['e3', 'thunk'], ['r1', 'click'], ['r2', 'click'], ['r3', 'click'], ['r4', 'click'], ['r5', 'ding'], ['e4', 'tick'], ['ready', 'ding']],
  draw(g, t, S) {
    const p = P(t, S);
    const X = s => 70 + s / 2.134 * 1260;
    // playhead time in the real startup
    const keys = [['start', 0], ['e1', 0], ['e2', 0.18], ['e3', 0.24], ['r1', 0.30], ['r2', 0.88], ['r3', 0.94], ['r4', 1.21], ['r5', 2.08], ['e4', 2.09], ['ready', 2.134]];
    let ph = 0;
    for (let i = 1; i < keys.length; i++) { const k = eio(ramp(t, S.at(keys[i][0]) - 0.2, 0.8)); if (k > 0) ph = lerp(keys[i - 1][1], keys[i][1], k); }
    const ra = p('start', 0.6);
    // ruler
    g.save(); g.globalAlpha *= ra;
    g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0), 80); g.lineTo(X(2.134), 80); g.stroke();
    for (let s = 0; s <= 2.1; s += 0.1) { const big = Math.abs(s * 10 % 5) < 0.01; g.lineWidth = big ? 2 : 1; g.beginPath(); g.moveTo(X(s), 80); g.lineTo(X(s), big ? 64 : 72); g.stroke(); if (big) text(g, s.toFixed(1).replace('.', ',') + ' s', X(s), 50, { size: 17, font: MONO, align: 'center', color: C.ink2 }); }
    g.restore();
    STAGES.forEach((st, i) => {
      const a = p(st.k, 0.5);
      const on = ph >= st.from - 1e-4;
      card(g, X(st.from), 96, Math.max(8, X(st.to) - X(st.from) - 3), 40, { fill: on ? (st.k === 'e3' ? C.blue : C.ink) : C.paper2, stroke: null, r: 5, alpha: a, lift: 0.4 });
      const lx = st.k === 'e3' ? (X(st.from) + X(st.to)) / 2 : i === 3 ? X(st.to) : X(st.from) + 4;
      text(g, st.name, lx, st.k === 'e3' ? 117 : i === 1 ? 186 : 156, { size: 20, font: MONO, weight: 700, align: st.k === 'e3' ? 'center' : i === 3 ? 'right' : 'left', color: st.k === 'e3' ? '#fff' : C.ink, alpha: a });
    });
    // playhead
    if (ra > 0) {
      g.save(); g.globalAlpha *= ra;
      g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.moveTo(X(ph), 60); g.lineTo(X(ph), 150); g.stroke();
      g.beginPath(); g.moveTo(X(ph) - 9, 58); g.lineTo(X(ph) + 9, 58); g.lineTo(X(ph), 70); g.fillStyle = C.red; g.fill();
      g.restore();
      pill(g, ph.toFixed(3) + ' s', clamp(X(ph), 120, 1280), 20, { size: 20, fill: C.red, alpha: ra });
    }
    // detail panel per stage
    const box = (k, until) => win(t, S.at(k), until, 0.45);
    // e1: sources merging into one Environment
    const d1 = box('e1', S.at('e2'));
    if (d1 > 0) {
      ['komut satırı', 'ortam değişkenleri', 'application.properties'].forEach((s, i) => {
        const k = eo(ramp(t, S.at('env') + i * 0.25, 0.5)) * d1;
        card(g, 120 + i * 260, 200, 230, 70, { fill: C.sheet, alpha: k, r: 8 });
        text(g, s, 235 + i * 260, 235, { size: 20, font: i === 2 ? MONO : SANS, weight: 700, align: 'center', alpha: k, max: 210 });
        arrow(g, [[235 + i * 260, 275], [235 + i * 260, 320], [1000, 360]], { k: eo(ramp(t, S.at('env') + 1 + i * 0.1, 0.6)), alpha: d1, color: C.ink2, lw: 2 });
      });
      const e = eo(ramp(t, S.at('env') + 1.5, 0.5)) * d1;
      card(g, 1010, 320, 280, 84, { fill: C.blueSoft, stroke: C.blue, lw: 3, alpha: e });
      text(g, 'Environment', 1150, 362, { size: 28, font: MONO, weight: 700, align: 'center', color: C.blue, alpha: e });
    }
    // e2: the application type
    const d2 = box('e2', S.at('e3'));
    if (d2 > 0) {
      ['SERVLET', 'REACTIVE', 'NONE'].forEach((s, i) => {
        const ok = i === 0 && t > S.at('servlet');
        card(g, 250 + i * 320, 250, 260, 90, { fill: ok ? C.greenSoft : C.sheet, stroke: ok ? C.green : C.ink3, lw: ok ? 3 : 2, alpha: d2 * (i && t > S.at('servlet') ? 0.45 : 1) });
        text(g, s, 380 + i * 320, 295, { size: 28, font: MONO, weight: 700, align: 'center', color: ok ? C.green : C.ink2, alpha: d2 });
      });
      text(g, 'WebApplicationType', 700, 210, { size: 24, font: MONO, weight: 700, align: 'center', alpha: d2, color: C.ink2 });
      text(g, 'classpath\'te Servlet API ve DispatcherServlet var', 700, 390, { size: 22, align: 'center', alpha: d2 * p('servlet', 0.5), weight: 600 });
    }
    // e3: refresh() opened into its steps
    const d3 = box('e3', S.at('e4'));
    if (d3 > 0) {
      text(g, 'AbstractApplicationContext.refresh()', 700, 190, { size: 22, font: MONO, weight: 700, align: 'center', color: C.blue, alpha: d3 * p('heart', 0.5) });
      REFRESH.forEach((r, i) => {
        const a = eo(ramp(t, S.at('heart') + i * 0.12, 0.5)) * d3;
        const on = t >= S.at(r.k) - 0.1;
        const cur = on && (i === 4 || t < S.at(REFRESH[i + 1].k) - 0.1);
        const x = 70 + i * 256, y = 220;
        card(g, x, y + (cur ? -8 : 0), 236, 170, { fill: cur ? '#FFF1EC' : on ? C.sheet : C.paper2, stroke: cur ? C.red : on ? C.ink : C.ink3, lw: cur ? 3 : 2, alpha: a, lift: cur ? 1.3 : 0.6 });
        g.save(); g.globalAlpha *= a;
        g.beginPath(); g.arc(x + 26, y + 28 + (cur ? -8 : 0), 15, 0, 7); g.fillStyle = on ? C.red : C.ink3; g.fill(); g.restore();
        text(g, String(i + 1), x + 26, y + 29 + (cur ? -8 : 0), { size: 17, weight: 800, align: 'center', color: '#fff', alpha: a });
        text(g, r.a, x + 50, y + 29 + (cur ? -8 : 0), { size: 21, font: MONO, weight: 700, alpha: a, max: 180 });
        text(g, r.b, x + 20, y + 90 + (cur ? -8 : 0), { size: 20, alpha: a, weight: 600, max: 200 });
        text(g, r.c, x + 20, y + 122 + (cur ? -8 : 0), { size: 20, alpha: a, color: C.ink2, max: 200 });
        if (i === 2 || i === 4) { // tomcat mini-icon
          const tk = i === 2 ? p('r3', 0.5) : p('r5', 0.5);
          pill(g, i === 2 ? 'Tomcat: hazır' : ':8080 açık', x + 118, y + 152 + (cur ? -8 : 0), { size: 16, fill: i === 4 ? C.green : C.ink2, alpha: tk * a });
        }
      });
      // bean count ticker while singletons are made
      const bk = ramp(t, S.at('r4'), Math.max(0.5, S.at('r5') - S.at('r4')));
      if (bk > 0) text(g, `${Math.round(eio(bk) * 312)} bean`, 70 + 3 * 256 + 118, 420, { size: 22, font: MONO, weight: 700, align: 'center', color: C.blue, alpha: d3 });
    }
    // e4: runners and ready
    const d4 = p('e4', 0.5);
    if (d4 > 0) {
      card(g, 200, 220, 420, 110, { fill: C.sheet, alpha: d4 });
      text(g, 'CommandLineRunner', 410, 258, { size: 22, font: MONO, weight: 700, align: 'center', alpha: d4 });
      text(g, 'ApplicationRunner', 410, 294, { size: 22, font: MONO, weight: 700, align: 'center', alpha: d4 });
      const rd = back(ramp(t, S.at('ready'), 0.7));
      card(g, 720, 200, 480, 150, { fill: C.greenSoft, stroke: C.green, lw: 3.5, alpha: clamp(rd), lift: 1.5 });
      text(g, 'ApplicationReadyEvent', 960, 250, { size: 26, font: MONO, weight: 700, align: 'center', color: C.green, alpha: clamp(rd) });
      text(g, 'hazır', 960, 305, { size: 40, weight: 800, align: 'center', color: C.green, alpha: clamp(rd) * p('up', 0.4) });
    }
    // console: the log lines of the real startup appear as the playhead passes them
    const ca = p('start', 0.6);
    terminal(g, 70, 470, 1260, 160, { alpha: ca, title: 'konsol' });
    const past = LOGS.filter(l => l[0] <= ph + 1e-4).slice(-3);
    past.forEach((l, i) => {
      const y = 516 + i * 36;
      text(g, l[0].toFixed(3), 100, y, { size: 19, font: MONO, color: 'rgba(232,228,216,0.45)', alpha: ca });
      text(g, l[1], 200, y, { size: 20, font: MONO, color: i === past.length - 1 ? '#fff' : C.termText, weight: i === past.length - 1 ? 700 : 500, alpha: ca });
    });
  },
};

// ------------------------------------------------------------------ 10. a request's journey (wide, camera follows)
const ROUTES = [
  ['GET', '/orders/{id}', 'OrderController#getOrder'],
  ['POST', '/orders', 'OrderController#create'],
  ['GET', '/products', 'ProductController#list'],
];
const REQ = { client: 120, tomcat: 520, filt: 900, ds: 1260, hm: 1680, ctl: 2170 };
export const request = {
  wide: true,
  sfx: [['req', 'whoosh'], ['tomcat', 'thunk'], ['pool', 'click'], ['filt', 'tick'], ['ds', 'thunk'], ['hm', 'scan'], ['ans', 'ding'], ['arg', 'tick'], ['call', 'pop']],
  draw(g, t, S) {
    const p = P(t, S);
    // where the packet is
    const path = [['req', REQ.client], ['tomcat', REQ.tomcat], ['filt', REQ.filt], ['ds', REQ.ds], ['hm', REQ.hm], ['call', REQ.ctl]];
    let px = REQ.client;
    for (let i = 1; i < path.length; i++) { const k = eio(ramp(t, S.at(path[i][0]) - 0.5, 0.9)); if (k > 0) px = lerp(path[i - 1][1], path[i][1], k); }
    const cam = clamp(px - 520, 0, 2420 - 1400);
    g.save(); g.translate(-cam, 0);
    const Y = 560;
    // wire
    g.save(); g.strokeStyle = C.shade; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(REQ.client, Y); g.lineTo(REQ.ctl, Y); g.stroke(); g.restore();
    g.save(); g.strokeStyle = C.shade; g.lineWidth = 4; for (const x of [125, 525, 900, 1260, 1690, 2210]) { g.beginPath(); g.moveTo(x, x === 125 ? 340 : 480); g.lineTo(x, Y); g.stroke(); } g.restore();
    // client
    card(g, 20, 220, 210, 120, { fill: C.sheet });
    text(g, 'istemci', 125, 250, { size: 20, weight: 700, color: C.ink2, align: 'center' });
    text(g, 'GET /orders/42', 125, 300, { size: 21, font: MONO, weight: 700, align: 'center', max: 190 });
    // tomcat with its thread pool
    const tk = p('tomcat', 0.5);
    card(g, 360, 150, 330, 330, { fill: C.sheet, alpha: 0.4 + 0.6 * tk });
    text(g, 'Tomcat', 525, 186, { size: 30, weight: 800, align: 'center' });
    text(g, 'iş parçacığı havuzu', 525, 222, { size: 19, color: C.ink2, align: 'center', weight: 600 });
    for (let i = 0; i < 40; i++) {
      const c = i % 8, r = Math.floor(i / 8);
      const x = 405 + c * 34, y = 262 + r * 34;
      const ours = i === 13 && t > S.at('pool');
      g.beginPath(); g.arc(x, y, ours ? 11 : 9, 0, 7); g.fillStyle = ours ? C.red : (i * 7) % 5 === 0 ? C.ink2 : C.shade; g.fill();
    }
    text(g, 'en çok 200', 525, 450, { size: 20, font: MONO, weight: 700, align: 'center', alpha: p('max', 0.5), color: C.red });
    // filter chain
    const fk = p('filt', 0.5);
    ['Encoding', 'Security', 'CORS'].forEach((f, i) => {
      card(g, 780 + i * 80, 200 + i * 10, 70, 250 - i * 20, { fill: i === 1 && p('sec', 0.4) > 0.5 ? '#FFF1D2' : C.sheet, stroke: i === 1 && p('sec', 0.4) > 0.5 ? C.amberDeep : C.ink, r: 8, alpha: 0.4 + 0.6 * fk });
      g.save(); g.translate(815 + i * 80, 325); g.rotate(-Math.PI / 2);
      text(g, f + 'Filter', 0, 0, { size: 18, font: MONO, weight: 700, align: 'center', alpha: 0.5 + 0.5 * fk });
      g.restore();
    });
    text(g, 'filtre zinciri', 900, 510, { size: 21, weight: 700, align: 'center', color: C.ink2, alpha: 0.4 + 0.6 * fk });
    // DispatcherServlet: the one front door
    const dk = p('ds', 0.5);
    card(g, 1150, 150, 220, 340, { fill: dk > 0.5 ? '#EDF2FC' : C.sheet, stroke: C.blue, lw: 3.5, alpha: 0.4 + 0.6 * dk });
    g.save(); g.translate(1260, 320); g.rotate(-Math.PI / 2);
    text(g, 'DispatcherServlet', 0, 0, { size: 28, font: MONO, weight: 700, align: 'center', color: C.blue, alpha: 0.5 + 0.5 * dk });
    g.restore();
    text(g, 'ön kontrolcü', 1260, 512, { size: 21, weight: 700, align: 'center', color: C.blue, alpha: p('front', 0.5) });
    // handler mapping table
    const hk = p('hm', 0.5);
    card(g, 1440, 170, 500, 300, { fill: C.sheet, alpha: 0.35 + 0.65 * hk });
    text(g, 'HandlerMapping', 1690, 204, { size: 24, font: MONO, weight: 700, align: 'center', alpha: 0.4 + 0.6 * hk });
    ROUTES.forEach((r, i) => {
      const y = 262 + i * 66;
      const hit = i === 0 && t > S.at('ans');
      if (hit) { g.save(); g.fillStyle = 'rgba(47,138,91,0.16)'; rr(g, 1452, y - 26, 476, 52, 6); g.fill(); g.restore(); }
      text(g, r[0], 1466, y - 8, { size: 18, font: MONO, weight: 700, color: C.blue, alpha: 0.4 + 0.6 * hk });
      text(g, r[1], 1530, y - 8, { size: 18, font: MONO, weight: 700, alpha: 0.4 + 0.6 * hk });
      text(g, '→ ' + r[2], 1530, y + 14, { size: 17, font: MONO, color: hit ? C.green : C.ink2, weight: hit ? 700 : 500, alpha: 0.4 + 0.6 * hk });
    });
    // controller with argument resolving
    const ck = p('arg', 0.5);
    card(g, 2020, 170, 380, 300, { fill: C.sheet, alpha: 0.35 + 0.65 * p('ans', 0.5) });
    text(g, 'OrderController', 2210, 210, { size: 26, font: MONO, weight: 700, align: 'center', alpha: 0.4 + 0.6 * p('ans', 0.5) });
    text(g, 'getOrder(Long id)', 2210, 256, { size: 22, font: MONO, align: 'center', color: C.amberDeep, weight: 700, alpha: 0.4 + 0.6 * p('ans', 0.5) });
    if (ck > 0) {
      pill(g, '"42"', 2110, 340, { size: 22, fill: C.paper2, color: C.ink, alpha: ck });
      arrow(g, [[2150, 340], [2240, 340]], { k: p('long', 0.5), color: C.ink2 });
      pill(g, '42L', 2300, 340, { size: 22, fill: C.blue, alpha: p('long', 0.5) });
      text(g, 'argüman çözücü', 2210, 400, { size: 19, color: C.ink2, align: 'center', alpha: ck, weight: 600 });
    }
    const cl = p('call', 0.5);
    if (cl > 0) stamp(g, 'çağrıldı', 2210, 440, ramp(t, S.at('call'), 0.4), { color: C.green, size: 26 });
    // the packet and its thread
    const pa = p('req', 0.5);
    g.save(); g.globalAlpha *= pa;
    const bob = Math.sin(t * 6) * 2;
    rr(g, px - 18, Y - 18 + bob, 36, 36, 10); g.fillStyle = C.red; g.fill();
    g.restore();
    if (t > S.at('carry') - 0.3) pill(g, 'http-nio-8080-exec-7', px, Y + 44, { size: 16, fill: C.ink, alpha: p('carry', 0.5) * (1 - p('call', 0.4)) });
    g.restore();
  },
};

// ------------------------------------------------------------------ 11. service → database → JSON (wide)
export const data = {
  wide: true,
  sfx: [['px', 'thunk'], ['tx', 'ding'], ['repo', 'click'], ['gen', 'pop'], ['hib', 'tick'], ['hik', 'click'], ['db', 'thunk'], ['ret', 'click'], ['commit', 'ding'], ['json', 'paper'], ['back', 'whoosh']],
  draw(g, t, S) {
    const p = P(t, S);
    const Y = 100, Y2 = 596;
    // outbound then back along the lower lane
    const pts = [
      ['px', [130, Y]], ['tx', [360, Y]], ['real', [560, Y]], ['repo', [960, Y]], ['hib', [1400, Y]], ['hik', [1820, Y]], ['db', [2180, Y]],
      ['row', [2180, Y2]], ['commit', [560, Y2]], ['json', [300, Y2]], ['back', [40, Y2]],
    ];
    let pos = pts[0][1];
    for (let i = 1; i < pts.length; i++) { const k = eio(ramp(t, S.at(pts[i][0]) - 0.45, 0.9)); if (k > 0) pos = [lerp(pts[i - 1][1][0], pts[i][1][0], k), lerp(pts[i - 1][1][1], pts[i][1][1], k)]; }
    const zo = eio(ramp(t, S.at('ms'), 1.2));
    const scale = lerp(1, 1400 / 2380, zo);
    const cam = lerp(clamp(pos[0] - 560, 0, 2380 - 1400), 0, zo);
    g.save(); g.translate(0, lerp(0, 120, zo)); g.scale(scale, scale); g.translate(-cam, 0);
    // lanes
    g.save(); g.strokeStyle = C.shade; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, Y); g.lineTo(2180, Y); g.lineTo(2180, Y2); g.lineTo(40, Y2); g.stroke(); g.restore();
    g.save(); g.strokeStyle = C.shade; g.lineWidth = 4; for (const x of [130, 540, 980, 1410, 1825]) { g.beginPath(); g.moveTo(x, Y); g.lineTo(x, 146); g.stroke(); } g.restore();
    // controller
    card(g, 20, 190, 220, 120, { fill: C.sheet });
    text(g, 'OrderController', 130, 250, { size: 20, font: MONO, weight: 700, align: 'center', max: 200 });
    // proxy shell around the service
    const pk = p('px', 0.6);
    card(g, 330, 140, 420, 230, { fill: 'rgba(220,158,31,0.16)', stroke: C.amber, lw: 3.5, r: 20, alpha: pk, lift: 0.6 });
    text(g, 'proxy', 350, 162, { size: 19, font: MONO, weight: 700, color: C.amberDeep, alpha: pk });
    bean(g, 'OrderService', 480, 200, 240, 100, { sub: 'gerçek nesne', size: 21, alpha: pk });
    const txk = win(t, S.at('tx'), S.at('commit') + 1.5, 0.3);
    if (txk > 0) pill(g, t > S.at('commit') ? 'COMMIT ✓' : 'BEGIN', 400, 330, { size: 18, fill: t > S.at('commit') ? C.green : C.amberDeep, alpha: txk });
    // repository: an interface, and the class Spring Data made
    const rk = p('repo', 0.6), gk = p('gen', 0.6);
    card(g, 830, 150, 300, 210, { fill: C.sheet, stroke: C.blue, alpha: rk * gk, lift: gk });
    bean(g, 'OrderRepository', 850, 170, 260, 70, { ghost: true, sub: 'arayüz (senin)', size: 19, alpha: rk });
    text(g, 'SimpleJpaRepository', 980, 280, { size: 19, font: MONO, weight: 700, align: 'center', color: C.blue, alpha: gk });
    text(g, 'Spring Data üretti', 980, 316, { size: 18, align: 'center', color: C.ink2, alpha: gk, weight: 600 });
    // hibernate → SQL
    const hb = p('hib', 0.6);
    card(g, 1230, 150, 360, 210, { fill: C.sheet, alpha: 0.3 + 0.7 * hb });
    text(g, 'Hibernate', 1410, 186, { size: 26, weight: 800, align: 'center', alpha: 0.3 + 0.7 * hb });
    text(g, 'findById(42)', 1410, 232, { size: 20, font: MONO, align: 'center', color: C.amberDeep, weight: 700, alpha: hb });
    arrow(g, [[1410, 250], [1410, 278]], { k: hb, color: C.ink2, lw: 2, head: 8 });
    text(g, 'select … from orders', 1410, 300, { size: 19, font: MONO, align: 'center', color: C.blue, alpha: hb });
    text(g, 'where id = ?', 1410, 328, { size: 19, font: MONO, align: 'center', color: C.blue, alpha: hb });
    // Hikari pool: one connection borrowed and given back
    const hk = p('hik', 0.6);
    card(g, 1660, 150, 330, 230, { fill: C.sheet, alpha: 0.3 + 0.7 * hk });
    text(g, 'HikariCP', 1825, 184, { size: 24, weight: 800, align: 'center', alpha: 0.3 + 0.7 * hk });
    const out = t > S.at('hik') + 0.3 && t < S.at('ret') + 0.3;
    for (let i = 0; i < 10; i++) {
      const c = i % 5, r = Math.floor(i / 5);
      const x = 1700 + c * 58, y = 226 + r * 58;
      const borrowed = i === 0 && out;
      card(g, x, y, 44, 40, { fill: borrowed ? 'transparent' : C.blueSoft, stroke: borrowed ? C.red : C.blue, dash: borrowed ? [5, 4] : null, r: 6, lift: 0, alpha: 0.4 + 0.6 * hk });
    }
    text(g, '10 bağlantı', 1825, 356, { size: 19, font: MONO, align: 'center', color: C.ink2, alpha: p('ten', 0.5), weight: 700 });
    // database
    const dbk = p('db', 0.5);
    g.save(); g.globalAlpha *= 0.4 + 0.6 * dbk;
    g.fillStyle = C.sheet; g.strokeStyle = C.ink; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(2180, 330, 90, 26, 0, 0, 7); g.fill(); g.stroke();
    g.fillRect(2090, 330, 180, 120); g.beginPath(); g.moveTo(2090, 330); g.lineTo(2090, 450); g.moveTo(2270, 330); g.lineTo(2270, 450); g.stroke();
    g.beginPath(); g.ellipse(2180, 450, 90, 26, 0, 0, Math.PI); g.fill(); g.stroke();
    g.restore();
    text(g, 'veritabanı', 2180, 395, { size: 22, weight: 700, align: 'center', alpha: 0.4 + 0.6 * dbk });
    // Jackson on the way back
    const jk = p('json', 0.6);
    card(g, 180, 400, 460, 170, { fill: C.sheet, alpha: jk });
    text(g, 'Jackson', 210, 428, { size: 20, weight: 800, alpha: jk, color: C.ink2 });
    text(g, 'Order{id=42, status=PAID}', 410, 470, { size: 19, font: MONO, align: 'center', alpha: jk * (1 - 0.5 * p('json', 0.5, 0.8)) });
    arrow(g, [[410, 488], [410, 516]], { k: p('json', 0.5, 0.6), color: C.ink2, lw: 2, head: 8 });
    text(g, '{"id":42,"status":"PAID"}', 410, 542, { size: 19, font: MONO, weight: 700, align: 'center', color: C.green, alpha: p('json', 0.5, 0.8) });
    // the packet: red going out, green JSON coming back
    const back = t > S.at('row') - 0.4;
    g.save();
    rr(g, pos[0] - 18, pos[1] - 18, 36, 36, 10); g.fillStyle = back ? C.green : C.red; g.fill();
    g.restore();
    if (t > S.at('back')) pill(g, '200 OK', pos[0] + 70, pos[1] - 40, { size: 18, fill: C.green, alpha: p('back', 0.4) });
    g.restore();
    if (zo > 0) text(g, 'bütün yol: çoğu zaman birkaç milisaniye', 700, 600, { size: 26, weight: 700, align: 'center', alpha: zo, color: C.ink });
  },
};

// ------------------------------------------------------------------ 12. the self-invocation trap
const SELF_JAVA = `@Service
public class OrderService {

  public void placeOrder(Order o) {
    // …
    this.saveAudit(o);   // proxy'ye uğramaz
  }

  @Transactional
  public void saveAudit(Order o) { … }
}`;
const FIX_JAVA = `@Service
public class OrderService {
  private final AuditService audit;

  public void placeOrder(Order o) {
    // …
    audit.save(o);       // proxy üzerinden ✓
  }
}

@Service
class AuditService {
  @Transactional
  public void save(Order o) { … }
}`;
export const selfcall = {
  code: [
    { at: 0, file: 'OrderService.java', lang: 'java', code: SELF_JAVA, hl: null },
    { at: 'out', hl: [9, 10] },
    { at: 'self', hl: [4, 7] },
    { at: 'skip', hl: [6, 6] },
    { at: 'fix', file: 'OrderService.java', lang: 'java', code: FIX_JAVA, hl: [7, 7] },
  ],
  sfx: [['out', 'whoosh'], ['begin', 'ding'], ['self', 'whoosh'], ['none', 'buzz'], ['gate', 'click'], ['fix', 'pop']],
  draw(g, t, S) {
    const p = P(t, S);
    const fx = p('fix', 0.7);
    const sh = lerp(1, 0.78, fx);
    g.save(); g.translate(lerp(0, 30, fx), 0); g.scale(sh, sh);
    // proxy shell and the gate on its left wall
    card(g, 300, 90, 600, 440, { fill: 'rgba(220,158,31,0.14)', stroke: C.amber, lw: 4, r: 24, lift: 0.8 });
    text(g, 'proxy', 330, 116, { size: 22, font: MONO, weight: 700, color: C.amberDeep });
    card(g, 360, 150, 500, 340, { fill: C.sheet, r: 12 });
    text(g, 'OrderService (gerçek nesne)', 610, 180, { size: 21, font: MONO, weight: 700, align: 'center', color: C.ink2 });
    const gateLit = win(t, S.at('begin') - 0.2, S.at('self') - 0.2, 0.3);
    g.save(); g.fillStyle = gateLit > 0.3 ? C.green : C.amberDeep; rr(g, 288, 200, 24, 240, 8); g.fill(); g.restore();
    text(g, 'işlem kapısı', 300, 470, { size: 19, weight: 700, align: 'center', color: C.amberDeep });
    // methods
    card(g, 400, 230, 420, 70, { fill: C.paper2, r: 8, lift: 0.4 });
    text(g, 'placeOrder()', 430, 265, { size: 24, font: MONO, weight: 700 });
    card(g, 400, 380, 420, 70, { fill: '#FFF8EA', r: 8, lift: 0.4 });
    text(g, '@Transactional', 430, 402, { size: 17, font: MONO, weight: 700, color: C.amberDeep });
    text(g, 'saveAudit()', 430, 430, { size: 24, font: MONO, weight: 700 });
    // caller
    bean(g, 'Controller', 20, 290, 200, 70, { size: 21 });
    const o = p('out', 0.9) * (1 - p('self', 0.4));
    arrow(g, [[220, 325], [300, 325], [340, 415], [395, 415]], { k: o, color: C.green, lw: 4, alpha: o > 0 ? 1 : 0 });
    if (gateLit > 0) pill(g, 'BEGIN ✓', 300, 172, { size: 18, fill: C.green, alpha: gateLit });
    // self call
    const s1 = p('self', 0.8);
    if (s1 > 0) {
      arrow(g, [[220, 325], [300, 325], [340, 265], [395, 265]], { k: s1, color: C.ink, lw: 4 });
      arrow(g, [[820, 265], [870, 265], [870, 415], [825, 415]], { k: p('self', 0.8, 0.9), color: C.red, lw: 4 });
      text(g, 'this.saveAudit()', 830, 340, { size: 20, font: MONO, weight: 700, color: C.red, alpha: p('self', 0.5, 1.2) * (1 - fx), align: 'right' });
      stamp(g, 'işlem yok', 610, 530, ramp(t, S.at('none'), 0.4) * (1 - fx), { color: C.red, size: 28 });
      const gp = win(t, S.at('gate'), S.at('fix'), 0.3);
      if (gp > 0) { g.save(); g.globalAlpha *= gp * (0.5 + 0.5 * Math.sin(t * 8)); g.strokeStyle = C.red; g.lineWidth = 4; rr(g, 280, 192, 40, 256, 10); g.stroke(); g.restore(); text(g, 'atlandı', 300, 560, { size: 22, weight: 800, align: 'center', color: C.red, alpha: gp }); }
    }
    g.restore();
    // the fix: another bean with its own proxy
    if (fx > 0) {
      g.save(); g.globalAlpha *= fx;
      card(g, 560, 470, 400, 150, { fill: 'rgba(220,158,31,0.14)', stroke: C.amber, lw: 4, r: 20, lift: 0.8 });
      g.fillStyle = ramp(t, S.at('fix') + 1.2, 0.3) > 0.5 ? C.green : C.amberDeep; rr(g, 550, 505, 20, 80, 6); g.fill();
      bean(g, 'AuditService', 610, 505, 320, 80, { sub: '@Transactional save()', size: 21 });
      arrow(g, [[680, 285], [700, 285], [700, 390], [520, 390], [520, 545], [548, 545]], { k: ramp(t, S.at('fix') + 0.4, 1), color: C.green, lw: 4 });
      if (ramp(t, S.at('fix') + 1.2, 0.3) > 0.5) pill(g, 'BEGIN ✓', 480, 600, { size: 18, fill: C.green });
      g.restore();
      text(g, 'ya da işlemi dışarıdaki metotta başlat', 640, 36, { size: 20, align: 'center', color: C.ink2, weight: 600, alpha: p('fix2', 0.5) });
    }
  },
};

// ------------------------------------------------------------------ 13. config layers
const LAYERS = [
  { k: 'l1', name: 'application.properties', sub: 'jar içinde', col: '#6B7080', vals: ['8080', 'h2:mem', '5'] },
  { k: 'l2', name: 'application-prod', sub: 'profil', col: C.blue, vals: [null, 'postgres', null] },
  { k: 'l3', name: 'ortam değişkeni', sub: 'SERVER_PORT', col: C.green, vals: ['9090', null, null] },
  { k: 'l4', name: 'komut satırı', sub: '--shop.discount', col: C.red, vals: [null, null, '10'] },
];
const KEYS = ['server.port', 'spring.datasource.url', 'shop.discount'];
const CONF_JAVA = `@ConfigurationProperties("shop")
@Validated
public record ShopProps(
    @Min(0) @Max(50) int discount) { }

// application.properties
// shop.discount=5`;
const PROPS = `# application.properties (jar içi)
server.port=8080
spring.datasource.url=jdbc:h2:mem:shop
shop.discount=5

# application-prod.properties
spring.datasource.url=jdbc:postgresql://db/shop`;
const CMDS = `$ export SERVER_PORT=9090
$ java -jar shop.jar \\
    --spring.profiles.active=prod \\
    --shop.discount=10`;
export const config = {
  code: [
    { at: 0, file: 'application.properties', lang: 'props', code: PROPS, hl: [1, 4] },
    { at: 'l2', hl: [6, 7] },
    { at: 'l3', file: 'terminal', lang: 'sh', code: CMDS, hl: [1, 1] },
    { at: 'l4', hl: [4, 4] },
    { at: 'cp', file: 'ShopProps.java', lang: 'java', code: CONF_JAVA, hl: [1, 4] },
  ],
  sfx: [['l1', 'paper'], ['l2', 'paper'], ['l3', 'paper'], ['l4', 'paper'], ['win', 'scan'], ['env', 'tick'], ['cp', 'pop']],
  draw(g, t, S) {
    const p = P(t, S);
    const W = 460, D = 60, SK = 90;
    const base = (i) => 560 - i * 108;
    const cell = (i, c) => [60 + SK * 0.5 + 70 + c * 150, base(i) - D / 2];
    const wn = p('win', 0.8);
    // column headers
    KEYS.forEach((k, c) => {
      const [x] = cell(3, c);
      text(g, ['port', 'db', 'discount'][c], x, 110, { size: 20, font: MONO, weight: 700, align: 'center', alpha: p('l1', 0.5), color: C.ink2 });
    });
    LAYERS.forEach((L, i) => {
      const a = eo(ramp(t, S.at(L.k), 0.7));
      if (a <= 0) return;
      const y = base(i) - 60 * (1 - a);
      g.save(); g.globalAlpha *= a;
      g.beginPath(); g.moveTo(60, y); g.lineTo(60 + W, y); g.lineTo(60 + W + SK, y - D); g.lineTo(60 + SK, y - D); g.closePath();
      g.fillStyle = 'rgba(251,248,242,0.78)'; g.fill();
      g.strokeStyle = L.col; g.lineWidth = 3; g.stroke();
      g.restore();
      const la = a * (1 - p('cp', 0.5));
      text(g, L.name, 60 + W + SK + 16, y - 36, { size: 20, font: i < 2 ? MONO : SANS, weight: 700, color: L.col, alpha: la, max: 260 });
      text(g, L.sub, 60 + W + SK + 16, y - 10, { size: 18, font: MONO, color: C.ink2, alpha: la, max: 260 });
      L.vals.forEach((v, c) => {
        if (!v) return;
        const [cx] = cell(i, c);
        // is a higher layer hiding this value?
        const hidden = LAYERS.some((M, j) => j > i && M.vals[c] && t > S.at(M.k) + 0.5);
        pill(g, v, cx - (i * 0) , y - D / 2 - 60 * 0, { size: 19, fill: hidden ? C.paper2 : L.col, color: hidden ? C.ink3 : '#fff', alpha: a * (hidden ? 0.8 : 1) });
      });
    });
    // looking down through the stack: the first value from the top wins
    if (wn > 0) {
      KEYS.forEach((k, c) => {
        const top = [3, 2, 1, 0].find(i => LAYERS[i].vals[c]);
        const [x] = cell(3, c);
        const [, y] = cell(top, c);
        arrow(g, [[x, 130], [x, y - 20]], { k: eo(ramp(t, S.at('win') + c * 0.2, 0.6)), color: LAYERS[top].col, lw: 3, head: 10 });
      });
    }
    // the resolved Environment
    const ra = p('win', 0.6, 0.8);
    if (ra > 0) {
      card(g, 690, 20, 300, 170, { fill: C.sheet, alpha: ra });
      text(g, 'sonuç', 710, 44, { size: 18, weight: 700, color: C.ink2, alpha: ra });
      KEYS.forEach((k, c) => {
        const top = [3, 2, 1, 0].find(i => LAYERS[i].vals[c]);
        text(g, k.replace('spring.datasource.', '…'), 710, 80 + c * 38, { size: 18, font: MONO, alpha: ra, max: 170 });
        text(g, LAYERS[top].vals[c], 970, 80 + c * 38, { size: 19, font: MONO, weight: 700, color: LAYERS[top].col, align: 'right', alpha: ra });
      });
    }
    // relaxed binding
    const en = win(t, S.at('env'), S.at('cp'), 0.4);
    if (en > 0) {
      pill(g, 'SERVER_PORT', 180, 612, { size: 20, fill: C.green, alpha: en });
      arrow(g, [[270, 612], [360, 612]], { k: en, color: C.ink2 });
      pill(g, 'server.port', 450, 612, { size: 20, fill: C.ink, alpha: en });
      text(g, 'gevşek bağlama', 560, 612, { size: 20, weight: 700, color: C.ink2, alpha: en * p('relax', 0.5) });
    }
    // typed properties
    const cp = p('cp', 0.6);
    if (cp > 0) {
      card(g, 640, 470, 350, 150, { fill: C.sheet, stroke: C.amberDeep, lw: 2.5, alpha: cp });
      text(g, 'ShopProps', 815, 504, { size: 24, font: MONO, weight: 700, align: 'center', alpha: cp });
      text(g, 'discount: int = 10', 815, 546, { size: 21, font: MONO, align: 'center', color: C.red, weight: 700, alpha: cp });
      text(g, '@Min(0) @Max(50) ✓', 815, 590, { size: 19, font: MONO, align: 'center', color: C.green, weight: 700, alpha: p('safe', 0.5) });
      arrow(g, [[970, 196], [970, 460]], { k: cp, color: C.amberDeep, lw: 2.5 });
    }
  },
};

// ------------------------------------------------------------------ 14. the jar and Actuator
const MANIFEST = `Manifest-Version: 1.0
Main-Class: org.springframework.boot
  .loader.launch.JarLauncher
Start-Class: com.example.shop
  .ShopApplication
Spring-Boot-Classes: BOOT-INF/classes/
Spring-Boot-Lib: BOOT-INF/lib/`;
const ACT = `# pom.xml
spring-boot-starter-actuator

$ curl localhost:8080/actuator/health
{"status":"UP"}`;
const LIBS = ['spring-core', 'spring-context', 'spring-webmvc', 'spring-boot', 'tomcat-embed-core', 'jackson-databind', 'hibernate-core', 'HikariCP'];
export const jar = {
  code: [
    { at: 0, file: 'META-INF/MANIFEST.MF', lang: 'props', code: MANIFEST, hl: null },
    { at: 'man', hl: [2, 3] },
    { at: 'start', hl: [4, 5] },
    { at: 'act', file: 'terminal', lang: 'sh', code: ACT, hl: [4, 5] },
  ],
  sfx: [['jar', 'thunk'], ['cls', 'tick'], ['lib', 'tick'], ['ldr', 'tick'], ['man', 'whoosh'], ['start', 'ding'], ['notom', 'ding'], ['health', 'ding']],
  draw(g, t, S) {
    const p = P(t, S);
    const j = back(ramp(t, S.at('jar'), 0.8));
    const a = clamp(j);
    // the jar as an open box
    g.save(); g.globalAlpha *= a;
    g.fillStyle = C.shade; g.beginPath(); g.moveTo(40, 60); g.lineTo(80, 24); g.lineTo(640, 24); g.lineTo(600, 60); g.closePath(); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = C.paper2; g.beginPath(); g.moveTo(600, 60); g.lineTo(640, 24); g.lineTo(640, 580); g.lineTo(600, 616); g.closePath(); g.fill(); g.stroke();
    g.restore();
    card(g, 40, 60, 560, 556, { fill: C.sheet, r: 6, alpha: a });
    text(g, 'shop.jar', 320, 44, { size: 22, font: MONO, weight: 700, align: 'center', alpha: a });
    const sec = (y, h, title, k, hot) => {
      const on = k ? p(k, 0.5) : 1;
      card(g, 60, y, 520, h, { fill: hot ? '#FFF1EC' : C.paper, stroke: hot ? C.red : C.ink3, lw: hot ? 3 : 1.5, r: 8, lift: 0, alpha: a * (0.35 + 0.65 * on) });
      text(g, title, 78, y + 22, { size: 18, font: MONO, weight: 700, alpha: a * (0.35 + 0.65 * on), color: hot ? C.red : C.ink });
      return on;
    };
    const manHot = win(t, S.at('man'), S.at('nest'), 0.3) > 0.5;
    sec(76, 96, 'META-INF/MANIFEST.MF', 'man', manHot);
    text(g, 'Main-Class: …JarLauncher', 78, 118, { size: 17, font: MONO, alpha: a * p('man', 0.5), color: C.ink2 });
    text(g, 'Start-Class: …ShopApplication', 78, 146, { size: 17, font: MONO, alpha: a * p('man', 0.5), color: C.ink2 });
    const clsHot = win(t, S.at('cls'), S.at('lib'), 0.3) > 0.5 || win(t, S.at('start'), S.at('notom'), 0.3) > 0.5;
    sec(184, 96, 'BOOT-INF/classes/', 'cls', clsHot);
    text(g, 'ShopApplication · OrderService · …', 78, 244, { size: 18, font: MONO, alpha: a * p('cls', 0.5), max: 490 });
    sec(292, 230, 'BOOT-INF/lib/', 'lib', win(t, S.at('lib'), S.at('ldr'), 0.3) > 0.5);
    LIBS.forEach((l, i) => {
      const c = i % 2, r = Math.floor(i / 2);
      const k = eo(ramp(t, S.at('lib') + i * 0.08, 0.4));
      const isT = l === 'tomcat-embed-core';
      const glow = isT ? p('notom', 0.5) : 0;
      const nest = p('nest', 0.5, 0.05 * i);
      card(g, 78 + c * 252, 320 + r * 48, 236, 38, { fill: glow > 0.5 ? '#FFE3B0' : nest > 0.5 ? C.blueSoft : C.sheet, stroke: glow > 0.5 ? C.amberDeep : C.ink3, r: 5, lift: 0.3 + glow, alpha: a * k });
      text(g, l + '.jar', 196 + c * 252, 339 + r * 48, { size: 16, font: MONO, align: 'center', weight: isT ? 700 : 500, alpha: a * k, max: 220 });
    });
    const ldrHot = win(t, S.at('ldr'), S.at('man') + 1.5, 0.3) > 0.5;
    sec(534, 70, 'org/springframework/boot/loader/', 'ldr', ldrHot);
    text(g, 'JarLauncher', 78, 584, { size: 18, font: MONO, alpha: a * p('ldr', 0.5), color: C.ink2 });
    // java -jar
    const mk = p('man', 0.5);
    terminal(g, 680, 30, 300, 90, { alpha: mk * (1 - p('act', 0.4)) });
    text(g, '$ java -jar shop.jar', 700, 84, { size: 19, font: MONO, color: C.termText, alpha: mk * (1 - p('act', 0.4)), weight: 700 });
    arrow(g, [[680, 90], [640, 110]], { k: mk * (1 - p('act', 0.4)), color: C.red, lw: 3 });
    const nk = p('nest', 0.8);
    if (nk > 0 && p('act', 0.4) < 1) text(g, 'iç içe jar\'lar → classpath', 810, 380, { size: 21, weight: 700, align: 'center', color: C.blue, alpha: nk * (1 - p('act', 0.4)) });
    const st = p('start', 0.6) * (1 - p('act', 0.4));
    if (st > 0) {
      pill(g, 'ShopApplication.main()', 810, 240, { size: 20, fill: C.red, alpha: st });
      arrow(g, [[600, 232], [680, 240]], { k: st, color: C.red, lw: 3 });
    }
    const nt = p('notom', 0.5) * (1 - p('act', 0.4));
    if (nt > 0) { text(g, 'sunucu burada', 810, 440, { size: 24, weight: 800, align: 'center', color: C.amberDeep, alpha: nt }); arrow(g, [[700, 440], [590, 420]], { k: nt, color: C.amberDeep, lw: 3 }); }
    // actuator
    const ac = p('act', 0.6);
    if (ac > 0) {
      card(g, 670, 60, 320, 540, { fill: C.sheet, alpha: ac });
      text(g, 'Actuator', 830, 98, { size: 28, weight: 800, align: 'center', alpha: ac });
      const hh = p('health', 0.6);
      pill(g, 'GET /actuator/health', 830, 160, { size: 18, fill: C.ink, alpha: hh });
      const up = back(ramp(t, S.at('health') + 0.6, 0.6));
      card(g, 700, 200, 260, 110, { fill: C.greenSoft, stroke: C.green, lw: 3, alpha: clamp(up) });
      text(g, '{"status":"UP"}', 830, 256, { size: 24, font: MONO, weight: 700, align: 'center', color: C.green, alpha: clamp(up) });
      ['/actuator/metrics', '/actuator/info', '/actuator/env'].forEach((s, i) => text(g, s, 700, 360 + i * 44, { size: 19, font: MONO, alpha: p('health', 0.5, 1 + i * 0.3), color: C.ink2 }));
      text(g, 'sağlık ve ölçümler', 830, 540, { size: 20, weight: 700, align: 'center', color: C.ink2, alpha: p('health', 0.5, 2) });
    }
  },
};

// ------------------------------------------------------------------ 15. no magic (wide)
const RECAP = [
  { k: 'rec', f: 0.00, s: 'Environment', at: 0.05 },
  { k: 'rec', f: 0.25, s: 'tarama', at: 0.35 },
  { k: 'rec', f: 0.5, s: 'koşullar', at: 0.6 },
  { k: 'rec', f: 0.75, s: 'tarifler', at: 0.85 },
  { k: 'rec2', f: 0.0, s: 'bean\'ler', at: 1.3 },
  { k: 'rec2', f: 0.5, s: 'proxy', at: 1.6 },
  { k: 'rec3', f: 0.0, s: 'Tomcat', at: 2.0 },
  { k: 'rec3', f: 0.5, s: 'hazır', at: 2.134 },
];
export const outro = {
  wide: true,
  sfx: [['rec', 'whoosh'], ['p1', 'thunk'], ['p2', 'thunk'], ['p3', 'thunk'], ['over', 'click'], ['end', 'ding']],
  draw(g, t, S) {
    const p = P(t, S);
    const X = s => 90 + s / 2.134 * 1220;
    const ra = p('rec', 0.6);
    const lift = p('p1', 0.8);
    const ty = lerp(170, 80, lift);
    g.save(); g.globalAlpha *= ra;
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), ty); g.lineTo(X(2.134), ty); g.stroke();
    g.restore();
    const spans = { rec: [S.at('rec'), S.at('rec2')], rec2: [S.at('rec2'), S.at('rec3')], rec3: [S.at('rec3'), S.at('rec3') + 3] };
    RECAP.forEach((r, i) => {
      const [a, b] = spans[r.k];
      const k = eo(ramp(t, a + (b - a) * r.f, 0.5));
      if (k <= 0) return;
      const x = X(r.at);
      g.save(); g.globalAlpha *= k; g.beginPath(); g.arc(x, ty, 9, 0, 7); g.fillStyle = i === 7 ? C.green : C.red; g.fill(); g.restore();
      text(g, r.s, x, ty + (i % 2 ? 40 : -34), { size: 22, weight: 700, align: 'center', alpha: k, font: i === 0 ? MONO : SANS });
    });
    text(g, '0 s', X(0), ty + 40, { size: 17, font: MONO, color: C.ink2, align: 'center', alpha: ra * (1 - 0.0) });
    // three pillars
    const PIL = [
      { k: 'p1', h: 'Konteyner', d: 'nesneleri kurar ve bağlar' },
      { k: 'p2', h: 'Koşullar', d: 'classpath + ayar + mevcut bean\'ler' },
      { k: 'p3', h: 'Varsayılanlar', d: 'hepsi ezilebilir' },
    ];
    PIL.forEach((pl, i) => {
      const k = back(ramp(t, S.at(pl.k), 0.8));
      if (k <= 0) return;
      const x = 110 + i * 410, y = lerp(560, 170, clamp(k));
      card(g, x, y, 360, 330, { fill: C.sheet, alpha: clamp(k * 2), lift: 1.3 });
      g.save(); g.globalAlpha *= clamp(k * 2);
      text(g, pl.h, x + 180, y + 50, { size: 38, weight: 800, align: 'center' });
      text(g, pl.d, x + 180, y + 96, { size: 20, align: 'center', color: C.ink2, weight: 600, max: 330 });
      // icons
      const cx = x + 180, cy = y + 210;
      if (i === 0) {
        rr(g, cx - 110, cy - 70, 220, 140, 14); g.strokeStyle = C.ink; g.lineWidth = 3; g.stroke();
        for (let b = 0; b < 6; b++) { rr(g, cx - 90 + (b % 3) * 64, cy - 50 + Math.floor(b / 3) * 54, 52, 40, 6); g.fillStyle = b === 1 ? C.amber : C.blueSoft; g.fill(); g.strokeStyle = C.ink; g.lineWidth = 1.5; g.stroke(); }
      } else if (i === 1) {
        for (let b = 0; b < 3; b++) { g.fillStyle = b < 2 ? C.green : C.red; rr(g, cx - 100 + b * 80, cy - 60, 40, 120, 8); g.fill(); }
        tick(g, cx - 80, cy - 90, 22, C.green, 1, 3.5); tick(g, cx, cy - 90, 22, C.green, 1, 3.5); cross(g, cx + 80, cy - 90, 18, C.red, 1, 3.5);
      } else {
        const ov = p('over', 0.6);
        text(g, 'server.port', cx - 100, cy - 40, { size: 22, font: MONO });
        text(g, '8080', cx + 90, cy - 40, { size: 26, font: MONO, weight: 700, color: ov > 0.5 ? C.ink3 : C.ink, align: 'right' });
        if (ov > 0) { arrow(g, [[cx + 20, cy - 40], [cx + 96, cy - 40]], { k: ov, color: C.red, lw: 3.5, head: 0 }); text(g, '9090', cx + 90, cy + 10, { size: 30, font: MONO, weight: 800, color: C.red, align: 'right', alpha: ov }); }
        rr(g, cx - 100, cy + 50, 64, 34, 17); g.fillStyle = C.green; g.fill(); g.beginPath(); g.arc(cx - 52, cy + 67, 13, 0, 7); g.fillStyle = '#fff'; g.fill();
      }
      g.restore();
    });
    const e = p('end', 1);
    if (e > 0) {
      g.save(); g.globalAlpha *= e; g.fillStyle = 'rgba(242,237,227,0.86)'; g.fillRect(0, 0, 1400, 640); g.restore();
      text(g, 'Spring Boot\'un İçi', 700, 280, { size: 76, weight: 800, align: 'center', alpha: e });
      text(g, 'konteyner · koşullar · varsayılanlar', 700, 360, { size: 30, align: 'center', color: C.red, weight: 700, alpha: e });
    }
  },
};
