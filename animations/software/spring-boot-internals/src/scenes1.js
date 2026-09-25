// Scenes 1–6: startup in real time, Spring vs Boot, the container, DI, a bean's birth, @SpringBootApplication.
// Each scene: { code: [code states keyed to markers], sfx: [[marker, sound, offset?]], draw(g, t, S) }.
// Native drawing box is 1000×640 (wide scenes 1400×640). S.at(marker) → seconds into the section.
import { C, SANS, MONO, clamp, lerp, eo, eio, back, ramp, win, rr, card, text, arrow, along, pill, tick, cross, stamp, bean, blueprint, terminal, measure } from './draw.js';

const P = (t, S) => (k, d = 0.7, o = 0) => eo(ramp(t, S.at(k) + o, d));

// ------------------------------------------------------------------ 1. intro
const LOGS = [
  [0.000, 'Starting ShopApplication using Java 21'],
  [0.182, 'No active profile set: "default"'],
  [0.941, 'Tomcat initialized with port 8080'],
  [0.963, 'Starting service [Tomcat]'],
  [1.210, 'WebApplicationContext initialized'],
  [1.482, 'HikariPool-1 - Start completed.'],
  [1.724, 'JPA EntityManagerFactory initialized'],
  [2.081, 'Tomcat started on port 8080 (http)'],
  [2.134, 'Started ShopApplication in 2.134 s'],
];
export { LOGS };
const MAIN_JAVA = `@SpringBootApplication
public class ShopApplication {

  public static void main(String[] args) {
    SpringApplication.run(
        ShopApplication.class, args);
  }
}`;

export const intro = {
  code: [
    { at: 0, file: 'ShopApplication.java', lang: 'java', code: MAIN_JAVA, hl: [5, 6] },
    { at: 'main', hl: [4, 4] },
    { at: 'go', hl: [5, 6] },
  ],
  sfx: [['code', 'tick'], ['go', 'whoosh'], ['started', 'ding'], ['q', 'stamp'], ['q', 'stamp', 1.2], ['slow', 'rewind']],
  draw(g, t, S) {
    const p = P(t, S);
    const go = S.at('go'), slow = S.at('slow');
    // real-time clock: runs 2.134 s from "go", rewinds to zero at "slow"
    let clock = clamp(t - go, 0, 2.134);
    const rw = ramp(t, slow, 1.3);
    if (rw > 0) clock = 2.134 * (1 - eio(rw));
    const fz = p('freeze', 0.8);
    text(g, clock.toFixed(3) + ' s', 500, 58, { size: 64, font: MONO, weight: 700, align: 'center', color: rw > 0 ? C.red : C.ink });
    text(g, rw > 0 ? 'ağır çekim ×1000' : 'gerçek zaman', 500, 108, { size: 22, align: 'center', color: C.ink2, weight: 600 });
    // console
    const ca = 1 - 0.6 * fz * (1 - eo(rw));
    terminal(g, 40, 140, 920, 440, { title: 'shop — java', alpha: 1 });
    g.save(); g.globalAlpha *= ca;
    const shown = t < go ? 0 : LOGS.filter(l => l[0] <= clamp(t - go, 0, 2.134) + 1e-6).length;
    LOGS.slice(0, shown).forEach((l, i) => {
      const y = 196 + i * 42;
      const hot = i === 7;
      if (hot && p('started') > 0) { g.fillStyle = `rgba(47,138,91,${0.35 * p('started')})`; g.fillRect(52, y - 18, 896, 36); }
      text(g, l[0].toFixed(3), 70, y, { size: 19, font: MONO, color: 'rgba(232,228,216,0.45)' });
      text(g, 'INFO', 160, y, { size: 19, font: MONO, color: '#7FC49B', weight: 700 });
      text(g, l[1], 226, y, { size: 20, font: MONO, color: hot ? '#FFFFFF' : C.termText, weight: hot ? 700 : 500 });
    });
    g.restore();
    // "no server set up, no new"
    stamp(g, 'sunucu kurulumu: yok', 730, 470, ramp(t, S.at('q'), 0.35), { color: C.red, size: 28 });
    stamp(g, 'new: yok', 790, 530, ramp(t, S.at('q') + 1.2, 0.35), { color: C.red, size: 28, rot: 0.05 });
    // the question
    const qa = fz * (1 - p('slow', 0.5));
    text(g, '?', 500, 360, { size: 220, weight: 800, align: 'center', color: C.red, alpha: qa * 0.9 });
    // slow-motion ruler
    const ra = p('slow', 0.8, 0.6);
    if (ra > 0) {
      g.save(); g.globalAlpha *= ra;
      card(g, 80, 590, 840, 44, { fill: C.sheet, r: 8, lift: 0.5 });
      for (let i = 0; i <= 20; i++) {
        const x = 110 + i * 39; const big = i % 5 === 0;
        g.strokeStyle = C.ink; g.lineWidth = big ? 2 : 1; g.beginPath(); g.moveTo(x, 598); g.lineTo(x, big ? 616 : 608); g.stroke();
      }
      text(g, '0 s', 110, 624, { size: 16, font: MONO, align: 'center', color: C.ink2 });
      text(g, '2,1 s', 890, 624, { size: 16, font: MONO, align: 'center', color: C.ink2 });
      g.fillStyle = C.red; g.beginPath(); g.arc(110, 603, 7, 0, 7); g.fill();
      g.restore();
    }
  },
};

// ------------------------------------------------------------------ 2. Spring and Boot
const XML = `<beans>
  <bean id="orderService"
        class="shop.OrderService">
    <constructor-arg
        ref="orderRepository"/>
  </bean>
  <bean id="orderRepository"
        class="shop.JdbcOrderRepo">
    <property name="dataSource"
              ref="dataSource"/>
  </bean>
  <!-- … yüzlerce satır … -->
</beans>`;

export const spring = {
  code: [
    { at: 0, file: 'ShopApplication.java', lang: 'java', code: MAIN_JAVA, hl: null },
    { at: 'xml', file: 'applicationContext.xml', lang: 'xml', code: XML, hl: [1, 13] },
    { at: 'boot', file: 'ShopApplication.java', lang: 'java', code: MAIN_JAVA, hl: [1, 1] },
  ],
  sfx: [['spring', 'thunk'], ['xml', 'paper'], ['server', 'thunk'], ['boot', 'whoosh'], ['defaults', 'click']],
  draw(g, t, S) {
    const p = P(t, S);
    const gone = p('boot', 0.9);
    // Spring Framework base
    const b = p('spring', 0.8);
    card(g, 80, 440 + 30 * (1 - b), 840, 130, { fill: C.sheet, alpha: b, lift: 1.2 });
    text(g, 'Spring Framework', 110, 488 + 30 * (1 - b), { size: 38, weight: 800, alpha: b });
    text(g, 'IoC konteyneri · bean\'ler · AOP · olaylar', 110, 532 + 30 * (1 - b), { size: 22, color: C.ink2, alpha: b * p('core') });
    const same = p('same', 0.6);
    if (same > 0) { g.save(); g.globalAlpha *= same * (0.5 + 0.5 * Math.sin((t - S.at('same')) * 5) ** 2); rr(g, 74, 434, 852, 142, 14); g.strokeStyle = C.red; g.lineWidth = 3; g.stroke(); g.restore(); }
    // modules
    ['Web MVC', 'Veri erişimi', 'Güvenlik', 'Test'].forEach((m, i) => {
      const k = p('mods', 0.6, i * 0.18);
      card(g, 80 + i * 216, 340 + 20 * (1 - k), 192, 80, { fill: C.paper2, alpha: k, r: 8 });
      text(g, m, 176 + i * 216, 381 + 20 * (1 - k), { size: 24, weight: 700, align: 'center', alpha: k });
    });
    // the old way: XML piles and a separately installed server
    const xa = p('xml', 0.7) * (1 - gone);
    ['applicationContext.xml', 'web.xml', 'dispatcher-servlet.xml'].forEach((f, i) => {
      const k = p('xml', 0.6, i * 0.25) * (1 - gone);
      g.save(); g.translate(170 + i * 34, 150 + i * 26 - 40 * gone); g.rotate(-0.08 + i * 0.07);
      card(g, -120, -90, 250, 170, { fill: '#FFFDF8', alpha: k, r: 4 });
      g.globalAlpha *= k;
      text(g, f, -105, -64, { size: 18, font: MONO, weight: 700, color: C.blue });
      for (let l = 0; l < 5; l++) { g.fillStyle = C.faint; g.fillRect(-105, -40 + l * 22, 150 + ((l * 37 + i * 13) % 70), 8); }
      g.restore();
    });
    const sa = p('server', 0.7) * (1 - gone);
    card(g, 640, 70, 290, 150, { fill: C.sheet, alpha: sa, dash: [8, 6] });
    text(g, 'Tomcat', 785, 118, { size: 30, weight: 800, align: 'center', alpha: sa });
    text(g, 'ayrı kurulur, ayrı ayarlanır', 785, 158, { size: 20, align: 'center', color: C.ink2, alpha: sa });
    arrow(g, [[460, 145], [630, 145]], { color: C.ink2, k: sa, dash: [6, 6], alpha: sa });
    pill(g, 'shop.war', 545, 118, { size: 18, fill: C.ink2, alpha: sa });
    text(g, 'bolca elle ayar', 280, 300, { size: 24, italic: true, color: C.red, alpha: xa, weight: 600 });
    // Spring Boot band
    const bb = back(ramp(t, S.at('boot'), 0.9));
    if (bb > 0) {
      const y = lerp(120, 230, clamp(bb));
      card(g, 80, y, 840, 90, { fill: '#F8E6BE', stroke: C.amberDeep, lw: 2.5, alpha: clamp(bb * 2), lift: 1.4 });
      g.save(); g.globalAlpha *= clamp(bb * 2);
      text(g, 'Spring Boot', 110, y + 45, { size: 34, weight: 800, color: '#5C3F05' });
      text(g, 'otomatik yapılandırma · starter · gömülü sunucu · dış ayarlar', 330, y + 45, { size: 20, color: '#5C3F05', max: 570 });
      g.restore();
    }
    // "underneath, still Spring"
    arrow(g, [[500, 322], [500, 432]], { color: C.red, k: same, lw: 3 });
    text(g, 'altta yine aynı Spring', 520, 300 + 0 * same, { size: 22, weight: 700, color: C.red, alpha: same * (1 - p('defaults', 0.4)) });
    // defaults you can change
    const d = p('defaults', 0.6);
    if (d > 0) {
      const items = ['port 8080', 'Jackson', 'Hikari'];
      items.forEach((s, i) => {
        const x = 150 + i * 260, y = 110, on = ramp(t, S.at('defaults') + 0.3 + i * 0.25, 0.3);
        card(g, x - 20, y - 36, 230, 72, { fill: C.sheet, alpha: d, r: 36, lift: 0.6 });
        g.save(); g.globalAlpha *= d;
        rr(g, x, y - 16, 56, 32, 16); g.fillStyle = on > 0.5 ? C.green : C.ink3; g.fill();
        g.beginPath(); g.arc(x + 16 + 24 * eo(on), y, 12, 0, 7); g.fillStyle = '#fff'; g.fill();
        g.restore();
        text(g, s, x + 72, y, { size: 22, font: MONO, weight: 600, alpha: d });
      });
      text(g, 'varsayılan, ama değiştirilebilir', 500, 182, { size: 22, align: 'center', color: C.ink2, alpha: d, weight: 600 });
    }
  },
};

// ------------------------------------------------------------------ 3. container
const SERVICE_JAVA = `@Service
public class OrderService {

  private final OrderRepository repo;
  private final PaymentClient payment;

  public OrderService(OrderRepository repo,
                      PaymentClient payment) {
    this.repo = repo;
    this.payment = payment;
  }
}`;
const NEW_JAVA = `// Spring olmadan: her şeyi sen kurarsın
var ds = new HikariDataSource(cfg);
var repo = new JdbcOrderRepository(ds);
var pay = new PaymentClient(http);
var service = new OrderService(repo, pay);
var controller = new OrderController(service);`;

const DEFS = [
  { name: 'OrderController', rows: ['OrderController', 'scope: singleton', 'deps: OrderService'], x: 330, y: 110 },
  { name: 'OrderService', rows: ['OrderService', 'scope: singleton', 'deps: repo, payment'], x: 660, y: 110 },
  { name: 'OrderRepository', rows: ['OrderRepository', 'scope: singleton', 'deps: —'], x: 330, y: 360 },
  { name: 'PaymentClient', rows: ['PaymentClient', 'scope: singleton', 'deps: —'], x: 660, y: 360 },
];
export const container = {
  code: [
    { at: 0, file: 'OrderService.java', lang: 'java', code: SERVICE_JAVA, hl: null },
    { at: 'new', file: 'Spring olmadan', lang: 'java', code: NEW_JAVA, hl: [2, 6] },
    { at: 'ioc', file: 'OrderService.java', lang: 'java', code: SERVICE_JAVA, hl: [1, 1] },
    { at: 'def', hl: [2, 2] },
    { at: 'd3', hl: [7, 8] },
  ],
  sfx: [['ctx', 'thunk'], ['new', 'tick'], ['ioc', 'stamp'], ['bean', 'pop'], ['def', 'paper'], ['bd', 'stamp'], ['make', 'pop'], ['make', 'pop', 0.5], ['make', 'pop', 1], ['make', 'pop', 1.5]],
  draw(g, t, S) {
    const p = P(t, S);
    // the context frame
    const f = p('ctx', 0.8);
    card(g, 305, 40, 675, 580, { fill: 'rgba(233,226,212,0.7)', stroke: C.ink, lw: 3, r: 18, alpha: f, lift: 0.8 });
    g.save(); g.globalAlpha *= f;
    rr(g, 325, 22, 330, 40, 8); g.fillStyle = C.ink; g.fill();
    text(g, 'ApplicationContext', 490, 43, { size: 23, font: MONO, weight: 700, color: '#fff', align: 'center' });
    g.restore();
    // doing it by hand, then handing it over
    const n = p('new', 0.6) * (1 - p('bean', 0.6, 1.2));
    ['OrderController', 'OrderService', 'OrderRepository', 'DataSource'].forEach((s, i) => {
      bean(g, s, 20, 120 + i * 100, 250, 64, { alpha: n * p('new', 0.5, i * 0.2), size: 19 });
      if (i) arrow(g, [[145, 120 + i * 100 - 36], [145, 120 + i * 100]], { k: n, lw: 2, head: 9, alpha: n });
    });
    text(g, 'new … new … new', 145, 540, { size: 22, font: MONO, weight: 700, align: 'center', alpha: n, color: C.ink2 });
    cross(g, 145, 330, 180, C.red, ramp(t, S.at('ioc'), 0.5) * n, 6);
    arrow(g, [[250, 590], [330, 590]], { k: p('ioc', 0.6, 0.3) * n, color: C.red, lw: 3, alpha: n });
    text(g, 'konteyner yapar', 150, 590, { size: 22, weight: 700, color: C.red, align: 'center', alpha: p('ioc', 0.5, 0.3) * n });
    // "a bean = an object the container manages"
    const bn = p('bean', 0.6) * (1 - p('def', 0.5));
    bean(g, 'orderService', 510, 260, 260, 80, { alpha: bn, sub: 'bean' });
    text(g, 'konteynerin yönettiği nesne', 640, 390, { size: 24, weight: 600, align: 'center', color: C.ink2, alpha: bn });
    // recipes, then objects printed from them
    const df = S.at('def'), mk = S.at('make');
    const hl = t > S.at('d3') ? 2 : t > S.at('d2') ? 1 : t > S.at('d1') ? 0 : -1;
    const order = [2, 3, 1, 0];
    DEFS.forEach((d, i) => {
      const a = eo(ramp(t, df + i * 0.2, 0.6));
      if (a <= 0) return;
      const fk = ramp(t, mk + order.indexOf(i) * 0.5, 0.5);        // flip: blueprint → bean
      const sx = Math.abs(Math.cos(fk * Math.PI));
      g.save(); g.translate(d.x + 150, d.y + 100); g.scale(Math.max(0.02, sx), 1); g.translate(-(d.x + 150), -(d.y + 100));
      if (fk < 0.5) blueprint(g, d.x, d.y + 12 * (1 - a), 300, 190, d.rows, { alpha: a, hl, k: 1 });
      else {
        bean(g, d.name, d.x, d.y + 40, 300, 110, { sub: 'singleton · hazır' });
      }
      g.restore();
    });
    const bd = ramp(t, S.at('bd'), 0.4) * (1 - p('make', 0.4));
    stamp(g, 'tarif ≠ nesne', 645, 330, bd, { color: C.blue, size: 30 });
  },
};

// ------------------------------------------------------------------ 4. dependency injection
const CYCLE_JAVA = `@Service
class A {
  A(B b) { }
}

@Service
class B {
  B(A a) { }
}`;
const SERVICE_AUTO = SERVICE_JAVA.replace('  public OrderService(', '  // tek kurucu: @Autowired gerekmez\n  public OrderService(');
const NODES = {
  ctl: { name: 'OrderController', x: 240, y: 50 },
  svc: { name: 'OrderService', x: 240, y: 250 },
  repo: { name: 'OrderRepository', x: 30, y: 450 },
  pay: { name: 'PaymentClient', x: 450, y: 450 },
};
const NW = 280, NH = 74;
export const di = {
  code: [
    { at: 0, file: 'OrderService.java', lang: 'java', code: SERVICE_JAVA, hl: null },
    { at: 'ctor', hl: [7, 8] },
    { at: 'auto', code: SERVICE_AUTO, hl: [7, 7] },
    { at: 'cyc', file: 'Cycle.java', lang: 'java', code: CYCLE_JAVA, hl: [3, 3] },
    { at: 'err', hl: [8, 8] },
  ],
  sfx: [['b1', 'pop'], ['b2', 'thunk'], ['b3', 'thunk'], ['plug', 'click'], ['auto', 'stamp'], ['cyc', 'whoosh'], ['err', 'buzz']],
  draw(g, t, S) {
    const p = P(t, S);
    const out = 1 - p('cyc', 0.7);
    const built = { repo: S.at('b1'), pay: S.at('b1') + 0.35, svc: S.at('b2'), ctl: S.at('b3') };
    const cx = n => n.x + NW / 2;
    // edges: "needs"
    const edges = [['ctl', 'svc', 'g1'], ['svc', 'repo', 'g2'], ['svc', 'pay', 'g2']];
    g.save(); g.globalAlpha *= out;
    for (const [a, b, m] of edges) {
      const A = NODES[a], B = NODES[b];
      const k = p(m, 0.7, b === 'pay' ? 0.4 : 0);
      const pts = [[cx(A), A.y + NH], [cx(B), B.y]];
      arrow(g, pts, { k, color: C.blue, dash: [8, 7], lw: 2.5 });
      if (k > 0.9 && a === 'ctl') text(g, 'ister', cx(A) + 14, (A.y + NH + B.y) / 2, { size: 20, color: C.blue, weight: 600 });
      // injection: the built dependency travels up into the consumer's socket
      const inj = ramp(t, built[a] - 0.55, 0.55);
      if (inj > 0 && inj < 1) {
        const q = along([[cx(B), B.y], [cx(A), A.y + NH]], eio(inj));
        g.beginPath(); g.arc(q[0], q[1], 11, 0, 7); g.fillStyle = C.red; g.fill();
      }
    }
    for (const [key, n] of Object.entries(NODES)) {
      const shown = p(key === 'ctl' ? 'g1' : 'g2', 0.6, key === 'pay' ? 0.4 : 0);
      const b = ramp(t, built[key], 0.5);
      bean(g, n.name, n.x, n.y, NW, NH, { alpha: shown, ghost: b < 0.5, lift: b, size: 21 });
      if (b > 0) {
        const num = { repo: 1, pay: 2, svc: 3, ctl: 4 }[key];
        g.save(); g.globalAlpha *= eo(b);
        g.beginPath(); g.arc(n.x + NW, n.y, 17, 0, 7); g.fillStyle = C.red; g.fill();
        text(g, String(num), n.x + NW, n.y + 1, { size: 20, weight: 800, color: '#fff', align: 'center' });
        g.restore();
      }
      // sockets glow at "plug"
      const pl = win(t, S.at('plug'), S.at('plug') + 2.2, 0.3);
      if (pl > 0 && key !== 'repo' && key !== 'pay') {
        g.save(); g.globalAlpha *= pl;
        g.beginPath(); g.arc(cx(n), n.y + NH, 9, 0, 7); g.fillStyle = C.red; g.fill();
        g.restore();
      }
    }
    // build order list
    const L = p('b1', 0.6);
    text(g, 'kurulum sırası', 790, 200, { size: 22, weight: 700, alpha: L, color: C.ink2 });
    ['OrderRepository', 'PaymentClient', 'OrderService', 'OrderController'].forEach((s, i) => {
      const k = ramp(t, [built.repo, built.pay, built.svc, built.ctl][i], 0.4);
      text(g, `${i + 1}  ${s}`, 790, 240 + i * 38, { size: 20, font: MONO, alpha: eo(k) * L, weight: 600, max: 200 });
    });
    // @Autowired not needed
    const au = p('auto', 0.5);
    if (au > 0) {
      pill(g, '@Autowired', 850, 440, { size: 22, fill: C.sheet, color: C.amberDeep, stroke: C.amberDeep, alpha: au });
      arrow(g, [[770, 440], [930, 440]], { k: ramp(t, S.at('auto') + 0.4, 0.4), color: C.red, lw: 4, head: 0 });
      text(g, 'tek kurucu → gerekmez', 850, 490, { size: 20, align: 'center', color: C.ink2, alpha: au, weight: 600 });
    }
    g.restore();
    // the cycle
    const cy = p('cyc', 0.7);
    if (cy > 0) {
      g.save(); g.globalAlpha *= cy;
      bean(g, 'A', 200, 140, 180, 90, { size: 34 });
      bean(g, 'B', 620, 140, 180, 90, { size: 34 });
      arrow(g, [[380, 165], [500, 120], [620, 165]], { color: C.blue, lw: 3, dash: [8, 7] });
      arrow(g, [[620, 205], [500, 250], [380, 205]], { color: C.blue, lw: 3, dash: [8, 7] });
      text(g, 'A, B\'yi ister', 500, 96, { size: 20, align: 'center', color: C.blue, weight: 600 });
      text(g, 'B, A\'yı ister', 500, 280, { size: 20, align: 'center', color: C.blue, weight: 600 });
      const r = (t - S.at('cyc')) * 1.2 % 1;
      const loop = [[380, 165], [500, 120], [620, 165], [620, 205], [500, 250], [380, 205], [380, 165]];
      const q = along(loop, r);
      g.beginPath(); g.arc(q[0], q[1], 9, 0, 7); g.fillStyle = C.red; g.fill();
      g.restore();
    }
    const er = p('err', 0.5);
    if (er > 0) {
      card(g, 110, 350 + 20 * (1 - er), 780, 230, { fill: '#FFF5F1', stroke: C.red, lw: 2.5, alpha: er });
      g.save(); g.globalAlpha *= er;
      const y = 350 + 20 * (1 - er);
      text(g, 'APPLICATION FAILED TO START', 140, y + 42, { size: 26, font: MONO, weight: 800, color: C.red });
      text(g, 'The dependencies of some of the beans', 140, y + 94, { size: 21, font: MONO });
      text(g, 'in the application context form a cycle:', 140, y + 126, { size: 21, font: MONO });
      text(g, 'a → b → a → …', 140, y + 180, { size: 24, font: MONO, weight: 700, color: C.red });
      g.restore();
    }
  },
};

// ------------------------------------------------------------------ 5. a bean's birth
const LIFE_JAVA = `@Service
public class OrderService {

  public OrderService(OrderRepository repo) {
    this.repo = repo;
  }

  @PostConstruct
  void init() { warmUpCache(); }

  @Transactional
  public Order place(Cart cart) { … }
}`;
const ST = [
  { x: 110, a: 'new', b: 'kurucu' },
  { x: 290, a: 'bağımlılık', b: 'enjekte' },
  { x: 470, a: 'BPP', b: 'önce' },
  { x: 650, a: '@PostConstruct', b: 'init()' },
  { x: 830, a: 'BPP', b: 'sonra' },
];
export const lifecycle = {
  code: [
    { at: 0, file: 'OrderService.java', lang: 'java', code: LIFE_JAVA, hl: null },
    { at: 's1', hl: [4, 6] },
    { at: 's4', hl: [8, 9] },
    { at: 's5', hl: [11, 12] },
  ],
  sfx: [['belt', 'whoosh'], ['s1', 'pop'], ['s2', 'click'], ['s3', 'click'], ['s4', 'ding'], ['proxy', 'thunk'], ['reg', 'thunk'], ['ann', 'tick'], ['single', 'ding']],
  draw(g, t, S) {
    const p = P(t, S);
    const bl = p('belt', 0.8);
    const beltY = 300;
    // belt with moving rollers
    g.save(); g.globalAlpha *= bl;
    card(g, 20, beltY, 960, 30, { fill: C.ink, stroke: null, r: 15, lift: 0.8 });
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2;
    const off = (t * 40) % 40;
    for (let x = 30 + off; x < 975; x += 40) { g.beginPath(); g.moveTo(x, beltY + 6); g.lineTo(x - 8, beltY + 24); g.stroke(); }
    g.restore();
    // stations
    const stT = ['s1', 's2', 's3', 's4', 's5'].map(k => S.at(k));
    ST.forEach((s, i) => {
      const k = p('belt', 0.5, 0.15 * i);
      const act = win(t, stT[i], (stT[i + 1] ?? S.at('reg')) + 0.1, 0.25);
      g.save(); g.globalAlpha *= k;
      g.strokeStyle = act > 0.1 ? C.red : C.ink; g.lineWidth = 3;
      g.beginPath(); g.moveTo(s.x - 75, beltY); g.lineTo(s.x - 75, 150); g.lineTo(s.x + 75, 150); g.lineTo(s.x + 75, beltY); g.stroke();
      g.beginPath(); g.arc(s.x, 150, 16, 0, 7); g.fillStyle = act > 0.1 ? C.red : C.ink; g.fill();
      text(g, String(i + 1), s.x, 151, { size: 19, weight: 800, color: '#fff', align: 'center' });
      text(g, s.a, s.x, beltY + 62, { size: s.a.length > 10 ? 18 : 22, font: MONO, weight: 700, align: 'center', color: act > 0.1 ? C.red : C.ink });
      text(g, s.b, s.x, beltY + 92, { size: 20, align: 'center', color: C.ink2 });
      g.restore();
    });
    // registry shelf
    const sh = p('reg', 0.6);
    card(g, 560, 420, 420, 210, { fill: C.sheet, alpha: sh, r: 10 });
    text(g, 'singleton kayıt defteri', 580, 446, { size: 20, weight: 700, alpha: sh, color: C.ink2 });
    // the object travelling along the belt
    let x = -120;
    for (let i = 0; i < 5; i++) { const k = eio(ramp(t, stT[i] - 0.1, 0.7)); if (k > 0) x = lerp(i ? ST[i - 1].x : -120, ST[i].x, k); }
    const rg = eio(ramp(t, S.at('reg'), 0.9));
    const ox = lerp(x, 870, rg), oy = lerp(beltY - 80, 478, rg);
    const bw = 150, bh = 72;
    const px = ramp(t, S.at('proxy') - 0.2, 0.8);
    if (t > stT[0] - 0.2) {
      const filled = ramp(t, stT[1] + 0.3, 0.4);
      bean(g, 'OrderService', ox - bw / 2, oy, bw, bh, { size: 17, proxy: px, sub: filled > 0.5 ? 'repo ✓' : 'repo: ∅' });
      // BPP touches and init spark
      const w3 = win(t, stT[2], stT[3], 0.2);
      if (w3 > 0) for (let j = 0; j < 3; j++) { const a = t * 6 + j * 2.1; g.save(); g.globalAlpha *= w3; g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath(); g.arc(ox + Math.cos(a) * 95, oy + 36 + Math.sin(a) * 55, 8, 0, 7); g.stroke(); g.restore(); }
      const sp = win(t, stT[3] + 0.2, stT[4], 0.2);
      if (sp > 0) pill(g, 'init() ✓', ox, oy - 26, { size: 18, fill: C.green, alpha: sp });
      if (px > 0.3) pill(g, 'proxy', ox, oy - 40, { size: 19, fill: C.amber, color: '#3A2800', alpha: clamp(px * 2 - 0.6) });
    }
    const sg = p('single', 0.6);
    if (sg > 0) {
      text(g, 'orderService →', 580, 604, { size: 17, font: MONO, alpha: sg, color: C.ink2 });
      text(g, 'OrderService$$SpringCGLIB$$0', 730, 604, { size: 17, font: MONO, alpha: sg, color: C.amberDeep, weight: 700, max: 235 });
      ['OrderController', 'CheckoutJob', 'AdminApi'].forEach((c, i) => {
        const k = p('single', 0.5, 0.2 + i * 0.2);
        pill(g, c, 150 + i * 150, 575, { size: 16, fill: C.paper2, color: C.ink, alpha: k });
        arrow(g, [[150 + i * 150, 555], [150 + i * 150, 500 + i * 14], [780, 500 + i * 14]], { k, color: C.ink2, lw: 2, head: 9, alpha: k });
      });
      text(g, 'hepsi aynı tek örneği alır', 400, 620, { size: 19, align: 'center', color: C.ink2, alpha: sg, weight: 600 });
    }
    // annotations that work through this gate
    const an = p('ann', 0.5) * (1 - sg);
    if (an > 0) {
      text(g, 'bu kapıdan çalışanlar:', 40, 474, { size: 20, weight: 700, color: C.ink2, alpha: an });
      ['@Transactional', '@Async', '@Cacheable'].forEach((s, i) => {
        const k = back(ramp(t, S.at('ann') + i * 0.3, 0.5));
        pill(g, s, 40, 520 + i * 40, { size: 20, align: 'left', fill: '#F8E6BE', color: C.amberDeep, stroke: C.amber, alpha: clamp(k) * an });
      });
    }
  },
};

// ------------------------------------------------------------------ 6. @SpringBootApplication
const META_JAVA = `// sadeleştirilmiş kaynak
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan
public @interface SpringBootApplication {
}`;
const TREE = `com/example/
├─ shop/
│  ├─ ShopApplication.java  ★
│  ├─ order/
│  │  ├─ OrderService.java
│  │  └─ OrderController.java
│  └─ payment/
│     └─ PaymentClient.java
└─ common/
   └─ AuditService.java`;
const PLATES = [
  { k: 'a1', name: '@SpringBootConfiguration', d: 'bu bir yapılandırma sınıfı' },
  { k: 'a2', name: '@ComponentScan', d: 'bu paketten aşağıyı tara' },
  { k: 'a3', name: '@EnableAutoConfiguration', d: 'gerisini Boot kursun' },
];
export const annotation = {
  code: [
    { at: 0, file: 'ShopApplication.java', lang: 'java', code: MAIN_JAVA, hl: [1, 1] },
    { at: 'open', file: 'SpringBootApplication.java', lang: 'java', code: META_JAVA, hl: [2, 4] },
    { at: 'a1', hl: [2, 2] }, { at: 'a2', hl: [4, 4] }, { at: 'a3', hl: [3, 3] },
    { at: 'down', file: 'src/main/java', lang: 'sh', code: TREE, hl: [2, 8] },
    { at: 'miss', hl: [9, 10] },
  ],
  sfx: [['open', 'whoosh'], ['a1', 'tick'], ['a2', 'tick'], ['a3', 'tick'], ['down', 'scan'], ['miss', 'buzz']],
  draw(g, t, S) {
    const p = P(t, S);
    const dn = p('down', 0.8);
    // exploded view of the annotation, shrinking away when the scan starts
    const ex = back(ramp(t, S.at('open'), 0.9));
    g.save();
    g.translate(lerp(0, 20, dn), lerp(0, 10, dn)); g.scale(lerp(1, 0.001, dn), lerp(1, 0.001, dn));
    g.globalAlpha *= 1 - dn;
    card(g, 180, 50, 640, 96, { fill: '#F8E6BE', stroke: C.amberDeep, lw: 2.5, alpha: p('ann', 0.6) });
    text(g, '@SpringBootApplication', 500, 98, { size: 38, font: MONO, weight: 700, align: 'center', color: '#5C3F05', alpha: p('ann', 0.6) });
    PLATES.forEach((pl, i) => {
      const y = lerp(60, 220 + i * 128, clamp(ex));
      const a = clamp(ex * 1.5 - i * 0.15);
      if (a <= 0) return;
      const on = win(t, S.at(pl.k), S.at(pl.k) + 999, 0.3);
      arrow(g, [[180, 98], [140, 98], [140, y + 48], [180, y + 48]], { color: C.amberDeep, lw: 2, head: 9, dash: [6, 5], alpha: a });
      card(g, 180, y, 640, 96, { fill: on > 0.5 ? '#FFF1D2' : C.sheet, stroke: on > 0.5 ? C.red : C.ink, lw: on > 0.5 ? 3 : 2, alpha: a });
      text(g, pl.name, 206, y + 36, { size: 28, font: MONO, weight: 700, color: C.amberDeep, alpha: a });
      text(g, pl.d, 206, y + 72, { size: 22, color: C.ink2, alpha: a * on, weight: 600 });
    });
    g.restore();
    if (dn <= 0) return;
    // package tree with a scan beam from the main class downwards
    const rows = [
      { d: 0, s: 'com.example.shop', main: true },
      { d: 1, s: 'ShopApplication', star: true },
      { d: 1, s: 'order' }, { d: 2, s: 'OrderService', cls: true }, { d: 2, s: 'OrderController', cls: true },
      { d: 1, s: 'payment' }, { d: 2, s: 'PaymentClient', cls: true },
      { d: 0, s: 'com.example.common', out: true }, { d: 1, s: 'AuditService', cls: true, out: true },
    ];
    const x0 = 80, y0 = 70, lh = 58;
    const sc = eio(ramp(t, S.at('down') + 0.5, 2.2));
    const scanY = y0 - 26 + sc * (lh * 7 - 8);
    // beam
    g.save(); g.globalAlpha *= dn;
    const grd = g.createLinearGradient(0, y0 - 30, 0, scanY);
    grd.addColorStop(0, 'rgba(40,86,184,0.04)'); grd.addColorStop(1, 'rgba(40,86,184,0.20)');
    g.fillStyle = grd; rr(g, x0 - 20, y0 - 30, 620, Math.max(0, scanY - y0 + 30), 12); g.fill();
    g.strokeStyle = C.blue; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - 20, scanY); g.lineTo(x0 + 600, scanY); g.stroke();
    g.restore();
    // boundary of the scan
    g.save(); g.globalAlpha *= dn * p('down', 0.5, 2.6);
    g.setLineDash([10, 8]); g.strokeStyle = C.blue; g.lineWidth = 2.5; rr(g, x0 - 20, y0 - 30, 620, lh * 7 - 8 + 4, 12); g.stroke();
    text(g, 'tarama alanı', x0 + 590, y0 - 12, { size: 20, color: C.blue, weight: 700, align: 'right' });
    g.restore();
    rows.forEach((r, i) => {
      const y = y0 + i * lh + (r.out ? 30 : 0);
      const a = dn * p('down', 0.5, 0.1 * i);
      const x = x0 + r.d * 44;
      if (r.d) { g.save(); g.globalAlpha *= a; g.strokeStyle = C.ink3; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 30, y - lh + 18); g.lineTo(x - 30, y); g.lineTo(x - 10, y); g.stroke(); g.restore(); }
      const isPkg = !r.cls && !r.star;
      const covered = !r.out && scanY > y;
      const miss = r.out && r.cls ? p('miss', 0.5) : 0;
      text(g, r.s + (isPkg ? '/' : ''), x, y, { size: 24, font: MONO, weight: isPkg ? 700 : 500, alpha: a * (r.out ? 1 - 0.5 * miss : 1), color: r.out ? C.ink2 : C.ink });
      const w = measure(g, r.s + (isPkg ? '/' : ''), 24, MONO, isPkg ? 700 : 500);
      if (r.star) pill(g, '★ ana sınıf', x + w + 80, y, { size: 17, fill: C.red, alpha: a });
      if (r.cls && covered) tick(g, x + w + 26, y, 24, C.green, ramp(scanY, y, 30), 4);
      if (r.cls && r.out && miss > 0) cross(g, x + w + 26, y, 22, C.red, miss, 4);
    });
    const ms = p('miss', 0.5, 0.4);
    if (ms > 0) {
      const y = 470;
      card(g, 560, y, 420, 150, { fill: '#FFF5F1', stroke: C.red, lw: 2.5, alpha: ms });
      g.save(); g.globalAlpha *= ms;
      text(g, 'APPLICATION FAILED TO START', 580, y + 34, { size: 18, font: MONO, weight: 800, color: C.red });
      text(g, '…required a bean of type', 580, y + 72, { size: 18, font: MONO });
      text(g, "'AuditService' that could", 580, y + 100, { size: 18, font: MONO });
      text(g, 'not be found.', 580, y + 128, { size: 18, font: MONO });
      g.restore();
    }
  },
};
