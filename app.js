'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Marked.js + DOMPurify setup
// ─────────────────────────────────────────────────────────────────────────────

const _renderer = new marked.Renderer();
_renderer.link = (href, title, text) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
marked.use({ renderer: _renderer, mangle: false, headerIds: false });

const SANITIZE_CONFIG = { FORBID_TAGS: ['script','iframe','object','embed','form'], FORCE_BODY: true };

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function renderMarkdown(body) {
  try {
    if (!body || !body.trim()) return '';
    return DOMPurify.sanitize(marked.parse(body), SANITIZE_CONFIG);
  } catch(e) { return escapeHtml(body); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config validation
// ─────────────────────────────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(msg) { super(msg); this.name = 'ValidationError'; }
}

function validateConfig(raw) {
  if (!raw?.owner?.name?.trim()) throw new ValidationError('owner.name is required.');
  if (typeof raw.owner.tagline !== 'string') throw new ValidationError('owner.tagline must be a string.');
  if (!raw?.footer?.attribution?.trim()) throw new ValidationError('footer.attribution is required.');
  if (!Array.isArray(raw.sections)) throw new ValidationError('sections must be an array.');

  const slugRe = /^[a-z0-9-]+$/;
  const seen = new Set();
  const sections = raw.sections
    .filter(s => s && typeof s === 'object' && typeof s.title === 'string' && s.title.trim())
    .map(s => {
      if (!slugRe.test(s.slug)) throw new ValidationError(`Invalid slug: "${s.slug}"`);
      if (seen.has(s.slug)) throw new ValidationError(`Duplicate slug: "${s.slug}"`);
      seen.add(s.slug);
      const items = Array.isArray(s.items) ? s.items.filter(i => typeof i === 'string' && i.trim()) : [];
      const c = { title: s.title, slug: s.slug, items };
      return c;    });

  return {
    owner: { name: raw.owner.name, tagline: raw.owner.tagline.slice(0, 150) },
    footer: { attribution: raw.footer.attribution },
    sections,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error display
// ─────────────────────────────────────────────────────────────────────────────

function showError(msg) {
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = `<div role="alert" class="error-banner"><strong>Error:</strong> ${escapeHtml(msg)}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config loader
// ─────────────────────────────────────────────────────────────────────────────

let _renderCalled = false;
const _watchdog = setTimeout(() => { if (!_renderCalled) showError('Content is taking too long to load.'); }, 3000);

async function loadConfig(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  let res;
  try { res = await fetch(url, { signal: ctrl.signal }); }
  catch { showError('Could not load content — check your connection.'); return; }
  finally { clearTimeout(t); }
  if (!res.ok) { showError(`Could not load ${url} (HTTP ${res.status})`); return; }
  let raw;
  try { raw = await res.json(); }
  catch { showError(`${url} contains invalid JSON.`); return; }
  let config;
  try { config = validateConfig(raw); }
  catch(e) { showError(e instanceof ValidationError ? e.message : 'Unexpected validation error.'); return; }
  renderPage(config);
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG helpers
// ─────────────────────────────────────────────────────────────────────────────

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// Circle path CW (outer rim, even-odd)
function circleCW(r) {
  return `M${r},0 A${r},${r} 0 1,1 ${-r},0 A${r},${r} 0 1,1 ${r},0 Z`;
}
// Circle path CCW (hole, even-odd)
function circleCCW(r) {
  return `M${r},0 A${r},${r} 0 1,0 ${-r},0 A${r},${r} 0 1,0 ${r},0 Z`;
}

// Gear teeth outline path centred at origin
function gearTeethPath(teeth, outerR, toothH, tipFrac = 0.42) {
  const rootR = outerR - toothH;
  const pitch = (2 * Math.PI) / teeth;
  const halfTip = pitch * tipFrac * 0.5;
  const halfRoot = pitch * 0.5 - halfTip * 0.7;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = pitch * i;
    pts.push(`${(rootR*Math.cos(a-halfRoot)).toFixed(2)},${(rootR*Math.sin(a-halfRoot)).toFixed(2)}`);
    pts.push(`${(outerR*Math.cos(a-halfTip)).toFixed(2)},${(outerR*Math.sin(a-halfTip)).toFixed(2)}`);
    pts.push(`${(outerR*Math.cos(a+halfTip)).toFixed(2)},${(outerR*Math.sin(a+halfTip)).toFixed(2)}`);
    pts.push(`${(rootR*Math.cos(a+halfRoot)).toFixed(2)},${(rootR*Math.sin(a+halfRoot)).toFixed(2)}`);
  }
  return 'M ' + pts.join(' L ') + ' Z';
}

// Spoke hole with curved ends that follow the hub and rim circles.
// The hole is a rectangle-ish shape but the inner end follows the hub arc
// and the outer end follows the root-circle arc.
function spokeHole(cx, cy, hl, hw, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  // Rotate a local point (lx, ly) into SVG space
  function r(lx, ly) {
    return [(cx + lx*cos - ly*sin).toFixed(2), (cy + lx*sin + ly*cos).toFixed(2)];
  }
  // Four corners — narrow width
  const [x0, y0] = r( hl,  hw);  // outer-right
  const [x1, y1] = r( hl, -hw);  // outer-left
  const [x2, y2] = r(-hl, -hw);  // inner-left
  const [x3, y3] = r(-hl,  hw);  // inner-right

  // Outer arc: curves along the rim (convex outward, sweep=0 for CCW hole)
  // Inner arc: curves along the hub (concave inward, sweep=1)
  // Arc radii approximate the circle at that distance from gear centre
  const outerArcR = (hl * 1.2).toFixed(2);
  const innerArcR = (hl * 0.9).toFixed(2);

  // Path: outer-right → outer-left (arc along rim) → inner-left → inner-right (arc along hub) → close
  return `M ${x0},${y0} A ${outerArcR},${outerArcR} 0 0,0 ${x1},${y1} L ${x2},${y2} A ${innerArcR},${innerArcR} 0 0,1 ${x3},${y3} Z`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gear body designs — 6 distinct visual styles matching the reference image
// ─────────────────────────────────────────────────────────────────────────────

// Style A: classic spoked wheel (4 spokes) — used on medium gears
function bodySpoked4(rootR, hubR) {
  const spokeW = (rootR - hubR) * 0.13;
  const hl = (rootR - hubR) * 0.72;
  const mid = (rootR + hubR * 1.2) / 2;
  const holes = [0, 1, 2, 3].map(i => {
    const a = (Math.PI / 2) * i;
    return spokeHole(mid * Math.cos(a), mid * Math.sin(a), hl, spokeW, a);
  });
  return [circleCW(rootR), circleCCW(hubR * 1.1), ...holes].join(' ');
}

// Style A+: 6-spoke version for large gears
function bodySpoked4Large(rootR, hubR) {
  const spokeW = (rootR - hubR) * 0.11;
  const hl = (rootR - hubR) * 0.72;
  const mid = (rootR + hubR * 1.2) / 2;
  const holes = [0,1,2,3,4,5].map(i => {
    const a = (Math.PI / 3) * i;
    return spokeHole(mid * Math.cos(a), mid * Math.sin(a), hl, spokeW, a);
  });
  return [circleCW(rootR), circleCCW(hubR * 1.1), ...holes].join(' ');
}

// Style B: 6-spoke wheel
function bodySpoked6(rootR, hubR) {
  const spokeW = (rootR - hubR) * 0.12;
  const hl = (rootR - hubR) * 0.68;
  const mid = (rootR + hubR * 1.2) / 2;
  const holes = [0,1,2,3,4,5].map(i => {
    const a = (Math.PI / 3) * i;
    return spokeHole(mid * Math.cos(a), mid * Math.sin(a), hl, spokeW, a);
  });
  return [circleCW(rootR), circleCCW(hubR * 1.1), ...holes].join(' ');
}

// Style C: concentric rings (like a mainspring barrel)
function bodyConcentricRings(rootR, hubR) {
  const r1 = rootR * 0.82;
  const r2 = rootR * 0.64;
  const r3 = rootR * 0.46;
  return [circleCW(rootR), circleCCW(r1), circleCW(r2), circleCCW(r3), circleCW(hubR * 1.1), circleCCW(hubR * 0.5)].join(' ');
}

// Style D: cross-cut — 5 spokes on large gears
function bodyCrossCut(rootR, hubR) {
  const armW = rootR * 0.13;
  const armL = (rootR - hubR) * 0.75;
  const mid = (rootR + hubR * 1.3) / 2;
  const count = rootR > 70 ? 5 : 4;
  const holes = Array.from({length: count}, (_, i) => {
    const a = (2 * Math.PI / count) * i;
    return spokeHole(mid * Math.cos(a), mid * Math.sin(a), armL, armW, a);
  });
  return [circleCW(rootR), circleCCW(hubR * 1.15), ...holes].join(' ');
}

// Style E: 3-spoke (like a small pinion)
function bodySpoked3(rootR, hubR) {
  const spokeW = (rootR - hubR) * 0.16;
  const hl = (rootR - hubR) * 0.70;
  const mid = (rootR + hubR * 1.2) / 2;
  const holes = [0,1,2].map(i => {
    const a = (2 * Math.PI / 3) * i;
    return spokeHole(mid * Math.cos(a), mid * Math.sin(a), hl, spokeW, a);
  });
  return [circleCW(rootR), circleCCW(hubR * 1.1), ...holes].join(' ');
}

// Style F: solid disc with just a hub hole (like a ratchet wheel)
function bodySolidDisc(rootR, hubR) {
  return [circleCW(rootR), circleCCW(hubR * 1.2)].join(' ');
}

// Assign a body style to each of the 12 gears
const GEAR_BODY_STYLES = [
  bodySpoked4Large,    // 0  large
  bodySpoked6,         // 1  medium
  bodySpoked3,         // 2  small
  bodyConcentricRings, // 3  large gold — mainspring barrel
  bodySpoked4Large,    // 4  large
  bodySolidDisc,       // 5  small
  bodyCrossCut,        // 6  medium-large
  bodySpoked6,         // 7  medium
  bodySpoked3,         // 8  medium
  bodyCrossCut,        // 9  large gold
  bodyConcentricRings, // 10 medium
  bodySolidDisc,       // 11 tiny
];

// ─────────────────────────────────────────────────────────────────────────────
// Watch layout — circular case, gears packed inside
// ViewBox: 500×500, watch centre: 250,250, watch radius: 230
// ─────────────────────────────────────────────────────────────────────────────

const W = 500, H = 500, CX = 250, CY = 250, WATCH_R = 232;

// Gear layout — more varied sizes, denser packing, closer to reference
// Large central gear dominates; mix of sizes around it
const GEARS = [
  { cx: 250, cy: 175, outerR: 78,  teeth: 56, toothH: 7, dur: 18, hubR: 18, gold: false }, // 0 top large
  { cx: 370, cy: 155, outerR: 52,  teeth: 38, toothH: 6, dur: 28, hubR: 12, gold: false }, // 1 top-right med
  { cx: 436, cy: 231, outerR: 34,  teeth: 24, toothH: 5, dur: 44, hubR:  8, gold: false }, // 2 right small
  { cx: 248, cy: 295, outerR: 112, teeth: 80, toothH: 9, dur: 13, hubR: 26, gold: true  }, // 3 centre GOLD dominant
  { cx: 128, cy: 155, outerR: 52,  teeth: 38, toothH: 6, dur: 28, hubR: 12, gold: false }, // 4 top-left med
  { cx:  64, cy: 231, outerR: 34,  teeth: 24, toothH: 5, dur: 44, hubR:  8, gold: false }, // 5 left small
  { cx: 380, cy: 344, outerR: 60,  teeth: 44, toothH: 6, dur: 24, hubR: 14, gold: false }, // 6 right-lower
  { cx: 120, cy: 344, outerR: 60,  teeth: 44, toothH: 6, dur: 24, hubR: 14, gold: false }, // 7 left-lower
  { cx: 248, cy: 427, outerR: 44,  teeth: 32, toothH: 5, dur: 36, hubR: 10, gold: false }, // 8 bottom-centre
  { cx: 368, cy: 400, outerR: 30,  teeth: 22, toothH: 4, dur: 52, hubR:  7, gold: false }, // 9 bottom-right
  { cx: 132, cy: 400, outerR: 30,  teeth: 22, toothH: 4, dur: 52, hubR:  7, gold: false }, // 10 bottom-left
  { cx: 437, cy: 312, outerR: 24,  teeth: 16, toothH: 4, dur: 62, hubR:  6, gold: false }, // 11 tiny right-mid
];

const MESH_PAIRS = [
  [0,1],[0,4],[0,3],[1,2],[4,5],[3,6],[3,7],[3,8],[6,9],[7,10],[8,9],[8,10],[6,11],[2,6]
];

function computeRotations() {
  const rot = new Array(GEARS.length).fill(null);
  rot[0] = { dir: 1, phase: 0 };
  const queue = [0], visited = new Set([0]);
  while (queue.length) {
    const a = queue.shift();
    for (const [ga, gb] of MESH_PAIRS) {
      let ref = -1, other = -1;
      if (ga === a && !visited.has(gb)) { ref = a; other = gb; }
      else if (gb === a && !visited.has(ga)) { ref = a; other = ga; }
      if (other === -1) continue;
      rot[other] = { dir: -rot[ref].dir, phase: rot[ref].phase + Math.PI / GEARS[other].teeth };
      visited.add(other); queue.push(other);
    }
  }
  for (let i = 0; i < GEARS.length; i++) if (!rot[i]) rot[i] = { dir: 1, phase: 0 };
  return rot;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gold plate bridge path — sweeping curved shapes behind the gears
// ─────────────────────────────────────────────────────────────────────────────

function goldPlatePath() {
  // Wide sweeping bridge shapes — organic, fills ~45% of watch face
  // Left bridge: broad sweep from top-left, narrows in middle, widens at bottom
  const b1 = `M 95,42 C 145,22 200,38 215,82
               C 228,118 185,148 162,178
               C 138,210 100,218 78,258
               C 56,298 62,355 88,392
               C 58,368 35,318 33,268
               C 30,208 50,158 62,118
               C 70,88 78,58 95,42 Z`;
  // Right bridge: mirror sweep
  const b2 = `M 405,42 C 355,22 300,38 285,82
               C 272,118 315,148 338,178
               C 362,210 400,218 422,258
               C 444,298 438,355 412,392
               C 442,368 465,318 467,268
               C 470,208 450,158 438,118
               C 430,88 422,58 405,42 Z`;
  return b1 + ' ' + b2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Render the watch SVG
// ─────────────────────────────────────────────────────────────────────────────

let _expandedIdx = -1;
let _sections = [];
let _svgEl = null;

function renderWatchCanvas(sections) {
  const main = document.getElementById('main');
  if (!main) return;
  _sections = sections;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rotations = computeRotations();

  const svg = el('svg', {
    class: 'watch-svg',
    viewBox: `0 0 ${W} ${H}`,
    'aria-label': 'Manual of Me watch movement — click a gear to read that section',
  });
  _svgEl = svg;

  // ── Outer watch case ──
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R + 6, fill: '#8a6520' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R, fill: 'url(#watch-bg-grad)' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R, fill: 'none', stroke: '#c9a84c', 'stroke-width': '12' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R - 16, fill: 'none', stroke: '#e8c870', 'stroke-width': '1.5' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R + 10, fill: 'none', stroke: '#5a4010', 'stroke-width': '3' }));

  // Clip everything inside the watch circle
  const clipId = 'watch-clip';
  const defs = el('defs');
  const clip = el('clipPath', { id: clipId });
  clip.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R - 7 }));
  defs.appendChild(clip);

  // Radial gradient for watch interior — dark centre, slightly lighter edge
  const grad = el('radialGradient', { id: 'watch-bg-grad', cx: '50%', cy: '40%', r: '60%' });
  grad.appendChild(el('stop', { offset: '0%', 'stop-color': '#1a1408', 'stop-opacity': '1' }));
  grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#080604', 'stop-opacity': '1' }));
  defs.appendChild(grad);

  svg.appendChild(defs);

  const clipped = el('g', { 'clip-path': `url(#${clipId})` });

  // Gold plate bridges behind gears
  const platePath = el('path', {
    d: goldPlatePath(),
    fill: '#c9a84c',
    opacity: '0.85',
    'aria-hidden': 'true',
  });
  clipped.appendChild(platePath);

  // Decorative screws on the plate
  const screwPts = [[80,80],[420,80],[80,420],[420,420],[250,45],[250,455],[45,250],[455,250]];
  for (const [sx, sy] of screwPts) {
    // Only draw screws inside the watch circle
    const dx = sx - CX, dy = sy - CY;
    if (Math.sqrt(dx*dx + dy*dy) > WATCH_R - 15) continue;
    const sg = el('g', { 'aria-hidden': 'true' });
    sg.appendChild(el('circle', { cx: sx, cy: sy, r: '5', fill: '#1c2a4a', stroke: '#3a5a9c', 'stroke-width': '0.8' }));
    sg.appendChild(el('line', { x1: sx-3, y1: sy, x2: sx+3, y2: sy, stroke: '#0d1a3a', 'stroke-width': '1.2' }));
    sg.appendChild(el('circle', { cx: sx-1.5, cy: sy-1.5, r: '1.2', fill: 'rgba(120,160,255,0.5)' }));
    clipped.appendChild(sg);
  }

  // 5 gears rendered as skeletal (outline only) so the gold plate shows through
  // Chosen to be spread across the layout, avoiding the gold gear (3)
  const SKELETAL_GEARS = new Set([1, 5, 6, 10, 11]);

  // Build each gear
  sections.forEach((section, i) => {
    const g = GEARS[i] || GEARS[0];
    const { dir, phase } = rotations[i];
    const rootR = g.outerR - g.toothH;
    const isSkeletal = SKELETAL_GEARS.has(i);
    const gearColor = g.gold ? '#f0d878' : (isSkeletal ? 'none' : '#f0f2f4');
    const bodyColor = g.gold ? '#d4a843' : (isSkeletal ? 'none' : '#e8eaed');
    const strokeCol = g.gold ? '#fff8d0' : (isSkeletal ? '#d8dce0' : '#ffffff');
    const strokeW   = isSkeletal ? '1.4' : '0.4';

    // Rotating group
    const rotGroup = el('g', { class: 'gear-rotate-group' });

    // Teeth
    const teethPath = el('path', {
      class: 'gear-teeth-path',
      d: gearTeethPath(g.teeth, g.outerR, g.toothH, 0.42),
      fill: gearColor,
      stroke: strokeCol,
      'stroke-width': strokeW,
    });
    rotGroup.appendChild(teethPath);

    // Body (skeletonised)
    const bodyFn = GEAR_BODY_STYLES[i] || bodySpoked4;
    const bodyPath = el('path', {
      class: 'gear-body-path',
      d: bodyFn(rootR, g.hubR),
      fill: bodyColor,
      'fill-rule': 'evenodd',
      stroke: strokeCol,
      'stroke-width': strokeW,
    });
    rotGroup.appendChild(bodyPath);

    // Hub — screw detail (outer ring + slot line, like reference image)
    const hubFill = isSkeletal ? 'none' : (g.gold ? '#d4a843' : '#c8ccd0');
    const hubStroke = g.gold ? '#fff8d0' : '#ffffff';
    rotGroup.appendChild(el('circle', { r: g.hubR * 0.62, fill: hubFill, stroke: hubStroke, 'stroke-width': '0.8', 'aria-hidden': 'true' }));
    // Screw slot line
    const slotLen = g.hubR * 0.45;
    rotGroup.appendChild(el('line', { x1: -slotLen, y1: '0', x2: slotLen, y2: '0', stroke: g.gold ? '#8a6520' : '#606870', 'stroke-width': '1.2', 'aria-hidden': 'true' }));
    // Centre dot
    rotGroup.appendChild(el('circle', { r: g.hubR * 0.15, fill: g.gold ? '#8a6520' : '#606870', 'aria-hidden': 'true' }));

    // Ham easter egg image — hidden by default, shown in ham mode

    const hamImg = el('image', {
      class: 'ham-image',
      href: 'jabugo-black-iberian-pig-bayonne-ham-jamon-iberico-jamon-png-7dda2dfa9bfea948af30f4b5d93d9bab.png',
      x: String(-g.outerR),
      y: String(-g.outerR),
      width: String(g.outerR * 2),
      height: String(g.outerR * 2),
      preserveAspectRatio: 'xMidYMid meet',
      'aria-hidden': 'true',
    });
    rotGroup.appendChild(hamImg);

    // For skeletal gears, add a transparent hit area so the whole gear is clickable
    if (isSkeletal) {
      const hitArea = el('circle', {
        r: String(g.outerR),
        fill: 'transparent',
        stroke: 'none',
        'aria-hidden': 'true',
      });
      rotGroup.appendChild(hitArea);
    }
    // transform-box: fill-box + transform-origin: 50% 50% rotates around the group's own centre
    if (!prefersReducedMotion) {
      const animClass = `gear-spin-${i}`;
      rotGroup.style.animation = `${animClass} ${g.dur}s linear infinite`;
      rotGroup.style.transformBox = 'fill-box';
      rotGroup.style.transformOrigin = '50% 50%';
      // Inject keyframe if not already present
      if (!document.getElementById(`kf-${animClass}`)) {
        const startDeg = (phase * 180 / Math.PI).toFixed(2);
        const endDeg = (parseFloat(startDeg) + dir * 360).toFixed(2);
        const styleEl = document.createElement('style');
        styleEl.id = `kf-${animClass}`;
        styleEl.textContent = `@keyframes ${animClass} { from { transform: rotate(${startDeg}deg); } to { transform: rotate(${endDeg}deg); } }`;
        document.head.appendChild(styleEl);
      }
    }

    // Wrapper at gear position (translate only — rotation is inside rotGroup)
    const wrapper = el('g', {
      class: 'gear-wrapper',
      'data-index': String(i),
      role: 'button',
      tabindex: '0',
      'aria-label': section.title,
      transform: `translate(${g.cx},${g.cy})`,
    });
    const titleSvg = el('title');
    titleSvg.textContent = section.title;
    wrapper.appendChild(titleSvg);
    wrapper.appendChild(rotGroup);

    wrapper.addEventListener('click', () => toggleGear(i));
    wrapper.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGear(i); }
    });
    wrapper.addEventListener('mouseenter', () => setHoverLabel(section));
    wrapper.addEventListener('mouseleave', () => clearHoverLabel());
    wrapper.addEventListener('focus', () => setHoverLabel(section));
    wrapper.addEventListener('blur', () => clearHoverLabel());

    section._gearIndex = i;
    clipped.appendChild(wrapper);
  });

  svg.appendChild(clipped);

  // Re-draw outer ring on top so it's crisp over the clipped content
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R, fill: 'none', stroke: '#c9a84c', 'stroke-width': '12' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R - 16, fill: 'none', stroke: '#e8c870', 'stroke-width': '1.5' }));
  svg.appendChild(el('circle', { cx: CX, cy: CY, r: WATCH_R + 10, fill: 'none', stroke: '#5a4010', 'stroke-width': '3' }));

  main.appendChild(svg);
}

// ─────────────────────────────────────────────────────────────────────────────
// Content panel
// ─────────────────────────────────────────────────────────────────────────────

function toggleGear(idx) {
  if (_expandedIdx === idx) { closePanel(); return; }
  openPanel(idx);
}

function openPanel(idx) {
  const section = _sections[idx];
  if (!section) return;
  _expandedIdx = idx;

  // Pause CSS animations on all rotating groups
  document.querySelectorAll('.gear-rotate-group').forEach(g => {
    g.style.animationPlayState = 'paused';
  });

  // Highlight gear
  document.querySelectorAll('.gear-wrapper').forEach(w => w.classList.remove('is-expanded'));
  const wrapper = document.querySelector(`.gear-wrapper[data-index="${idx}"]`);
  if (wrapper) wrapper.classList.add('is-expanded');

  const panel = document.getElementById('content-panel');
  const title = document.getElementById('panel-title');
  const body = document.getElementById('panel-body');

  title.textContent = section.title;
  body.innerHTML = '';
  if (section.items && section.items.length) {
    const ul = document.createElement('ul');
    section.items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }
  panel.removeAttribute('hidden');
  panel.focus();
}

function closePanel() {
  _expandedIdx = -1;

  // Resume CSS animations
  document.querySelectorAll('.gear-rotate-group').forEach(g => {
    g.style.animationPlayState = 'running';
  });

  document.querySelectorAll('.gear-wrapper').forEach(w => w.classList.remove('is-expanded'));
  const panel = document.getElementById('content-panel');
  panel.setAttribute('hidden', '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Hover label
// ─────────────────────────────────────────────────────────────────────────────

function setHoverLabel(section) {
  const box = document.getElementById('hover-label');
  const icon = document.getElementById('hover-label-icon');
  const text = document.getElementById('hover-label-text');
  if (!box || !text) return;
  icon.textContent = '';
  text.textContent = section.title;
  box.classList.add('is-active');
}

function clearHoverLabel() {
  const box = document.getElementById('hover-label');
  const icon = document.getElementById('hover-label-icon');
  const text = document.getElementById('hover-label-text');
  if (!box || !text) return;
  icon.textContent = '';
  text.textContent = 'Hover over a gear to explore';
  box.classList.remove('is-active');
}

// ─────────────────────────────────────────────────────────────────────────────
// Easter egg — ham mode + cheese rain
// ─────────────────────────────────────────────────────────────────────────────

let _hamMode = false;
let _cheeseContainers = [];

function createCheeseRain() {
  ['left', 'right'].forEach(side => {
    const container = document.createElement('div');
    container.className = `cheese-rain-container ${side}`;

    // 14 drops per side, staggered positions and timings
    for (let i = 0; i < 14; i++) {
      const img = document.createElement('img');
      img.src = 'brie.png';
      img.className = 'cheese-drop';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');

      // Random horizontal position within the container
      const leftPct = Math.random() * 100;
      img.style.left = `${leftPct}%`;

      // Random fall duration 2.5–5s, random delay so they're staggered
      const dur = 2.5 + Math.random() * 2.5;
      const delay = -(Math.random() * dur); // negative delay = already mid-fall on load
      img.style.animationDuration = `${dur.toFixed(2)}s`;
      img.style.animationDelay = `${delay.toFixed(2)}s`;

      container.appendChild(img);
    }

    document.body.appendChild(container);
    _cheeseContainers.push(container);
  });
}

function removeCheeseRain() {
  _cheeseContainers.forEach(c => c.remove());
  _cheeseContainers = [];
}

function toggleHamMode() {
  _hamMode = !_hamMode;
  document.body.classList.toggle('ham-mode', _hamMode);
  document.title = _hamMode ? 'Hamual of Brie' : 'Manual of Me';

  const nameEl = document.getElementById('watch-owner-name');
  if (nameEl) {
    if (_hamMode) {
      nameEl.dataset.realName = nameEl.textContent;
      nameEl.textContent = 'Hamual of Brie';
    } else {
      nameEl.textContent = nameEl.dataset.realName || nameEl.textContent;
    }
  }

  const btn = document.getElementById('easter-egg-btn');
  if (btn) btn.textContent = _hamMode ? '⚙️' : '🐷';

  if (_hamMode) {
    createCheeseRain();
  } else {
    removeCheeseRain();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// renderPage — entry point after config loads
// ─────────────────────────────────────────────────────────────────────────────

function renderPage(config) {
  clearTimeout(_watchdog);
  _renderCalled = true;

  // Set owner name + tagline
  const nameEl = document.getElementById('watch-owner-name');
  const tagEl = document.getElementById('watch-tagline');
  if (nameEl) nameEl.textContent = config.owner.name;
  if (tagEl) tagEl.textContent = config.owner.tagline;

  renderWatchCanvas(config.sections);

  // Wire up close button and Escape
  const closeBtn = document.getElementById('panel-close');
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _expandedIdx !== -1) closePanel();
  });

  // Wire up easter egg button
  const easterBtn = document.getElementById('easter-egg-btn');
  if (easterBtn) easterBtn.addEventListener('click', toggleHamMode);
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => loadConfig('content.json'));
