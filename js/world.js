import { makeRng, range } from './rng.js';

// Världen mäts i pixlar med (0,0) i mitten — där huvudslottet kommer stå.
export const WORLD = {
  seed: 20250711,
  extent: 1600,            // halva världens bredd/höjd i pixlar
  ring: {
    radius: 250,           // rondellens mittradie
    roadWidth: 60,         // körbanans bredd
  },
  road: {
    width: 56,             // utfartsvägarnas bredd
  },
  stone: {
    size: 6,               // kullerstenarnas radie i vägkanten
    step: 17,              // avstånd mellan stenar
  },
};

// Sex utfartsvägar: rakt upp/ner + fyra diagonaler (matchar referensbilden).
const SPOKE_ANGLES = [30, 90, 150, 210, 270, 330];

// Floder (lodräta, lätt slingrande) som diagonalvägarna korsar via broar.
export const RIVERS = [
  { x: -1180, width: 180, amp: 34, wl: 260 },
  { x: 1210, width: 180, amp: 30, wl: 300 },
];

// En damm uppe till vänster för variation.
export const PONDS = [
  { x: -1230, y: -1240, rx: 300, ry: 200 },
];

// Bygger listan av vägsegment. Varje utfart börjar vid rondellens ytterkant
// och går rakt ut förbi världens kant.
export function buildRoads() {
  const ringOuter = WORLD.ring.radius;
  return SPOKE_ANGLES.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const length = WORLD.extent * 1.25;
    return {
      angle: deg,
      dx,
      dy,
      x1: dx * ringOuter,
      y1: dy * ringOuter,
      x2: dx * length,
      y2: dy * length,
      width: WORLD.road.width,
    };
  });
}

// Räknar ut var diagonalvägarna korsar floderna → där ritas broar.
export function buildBridges(roads) {
  const bridges = [];
  for (const r of roads) {
    if (Math.abs(r.dx) < 0.2) continue; // hoppa över de lodräta vägarna
    for (const river of RIVERS) {
      const s = (river.x - r.x1) / r.dx;
      if (s <= 0) continue;
      const x = river.x;
      const y = r.y1 + r.dy * s;
      if (Math.hypot(x, y) > WORLD.extent * 1.2) continue;
      bridges.push({ x, y, angle: r.angle, width: r.width, span: river.width });
    }
  }
  return bridges;
}

// Små trästolpar som flankerar varje väg där den möter rondellen.
export function buildPosts() {
  const posts = [];
  const r = WORLD.ring.radius + WORLD.ring.roadWidth / 2 + 16;
  for (const deg of SPOKE_ANGLES) {
    const rad = (deg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const nx = -dy;
    const ny = dx;
    const off = WORLD.road.width / 2 + 12;
    posts.push({ x: dx * r + nx * off, y: dy * r + ny * off });
    posts.push({ x: dx * r - nx * off, y: dy * r - ny * off });
  }
  return posts;
}

// Avstånd från punkt till linjesegment.
function distToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
}

function inRiver(x, y, margin) {
  for (const r of RIVERS) {
    if (Math.abs(x - r.x) < r.width / 2 + r.amp + margin) return true;
  }
  return false;
}

function inPond(x, y, margin) {
  for (const p of PONDS) {
    const dx = (x - p.x) / (p.rx + margin);
    const dy = (y - p.y) / (p.ry + margin);
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
}

// Är punkten fri från vägar, rondell och vatten?
function isClear(x, y, roads, margin) {
  const distCenter = Math.hypot(x, y);
  // Håll hela rondellen (inkl. gräsmitten där slottet ska stå) fri.
  if (distCenter < WORLD.ring.radius + WORLD.ring.roadWidth / 2 + margin) return false;
  for (const r of roads) {
    if (distToSegment(x, y, r.x1, r.y1, r.x2, r.y2) < r.width / 2 + margin) return false;
  }
  if (inRiver(x, y, margin) || inPond(x, y, margin)) return false;
  return true;
}

// Genererar all natur (träd, buskar, stenblock, blommor) utspridd över gräset.
export function buildProps(roads) {
  const rng = makeRng(WORLD.seed);
  const e = WORLD.extent;
  const props = [];

  function scatter(count, margin, make) {
    for (let i = 0; i < count; i++) {
      const x = range(rng, -e, e);
      const y = range(rng, -e, e);
      if (!isClear(x, y, roads, margin)) continue;
      props.push(make(x, y));
    }
  }

  // Träd (ekar och tallar).
  scatter(360, 30, (x, y) => ({
    type: rng() < 0.6 ? 'oak' : 'pine',
    x, y,
    scale: range(rng, 0.8, 1.4),
    tone: rng(),
  }));
  // Buskar.
  scatter(150, 22, (x, y) => ({ type: 'bush', x, y, scale: range(rng, 0.7, 1.2), tone: rng() }));
  // Stenblock.
  scatter(80, 22, (x, y) => ({ type: 'rock', x, y, scale: range(rng, 0.7, 1.5), tone: rng() }));
  // Blomklasar.
  scatter(220, 18, (x, y) => ({ type: 'flower', x, y, scale: range(rng, 0.7, 1.1), tone: rng() }));

  // Rita bakre objekt först för naturlig överlappning.
  props.sort((a, b) => a.y - b.y);
  return props;
}

// Små grästofsar/strån för textur på marken.
export function buildGrassDetail() {
  const rng = makeRng(WORLD.seed ^ 0x9e3779b9);
  const details = [];
  const e = WORLD.extent;
  for (let i = 0; i < 3200; i++) {
    details.push({
      x: range(rng, -e, e),
      y: range(rng, -e, e),
      len: range(rng, 3, 8),
      lean: range(rng, -2, 2),
      shade: rng(),
    });
  }
  return details;
}
