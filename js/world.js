import { makeRng, range } from './rng.js';

// Världen mäts i pixlar med (0,0) i mitten — där huvudslottet kommer stå.
export const WORLD = {
  seed: 1337,
  extent: 1600,          // halva världens bredd/höjd i pixlar
  ring: {
    radius: 210,         // rondellens mittradie
    roadWidth: 46,       // körbanans bredd
  },
  plaza: {
    radius: 150,         // stenlagd platå i mitten (där slottet placeras)
  },
  road: {
    width: 40,           // utfartsvägarnas bredd
  },
};

// Riktningar (i grader) som utfartsvägarna strålar ut i från rondellen.
// Ett medvetet mönster: fyra huvudvägar + fyra kortare diagonaler.
const SPOKE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

// Bygger listan av vägsegment. Varje utfart börjar vid rondellens ytterkant
// och går rakt ut mot världens kant.
export function buildRoads() {
  const ringOuter = WORLD.ring.radius;
  const segments = SPOKE_ANGLES.map((deg, i) => {
    const rad = (deg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    // Diagonalerna görs lite kortare för variation.
    const length = deg % 90 === 0 ? WORLD.extent : WORLD.extent * 0.62;
    return {
      angle: deg,
      x1: dx * ringOuter,
      y1: dy * ringOuter,
      x2: dx * length,
      y2: dy * length,
      width: WORLD.road.width,
    };
  });
  return segments;
}

// Avstånd från punkt till linjesegment (för att hålla träd borta från vägar).
function distToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * vx;
  const cy = y1 + t * vy;
  return Math.hypot(px - cx, py - cy);
}

// Är punkten fri från vägar, rondell och mittplatå?
function isClearForNature(x, y, roads, margin) {
  const distCenter = Math.hypot(x, y);

  // Håll ren yta runt rondellen och platån i mitten.
  if (distCenter < WORLD.ring.radius + WORLD.ring.roadWidth + margin) return false;

  // Håll avstånd till själva ringvägen.
  if (Math.abs(distCenter - WORLD.ring.radius) < WORLD.ring.roadWidth / 2 + margin) {
    return false;
  }

  // Håll avstånd till varje utfartsväg.
  for (const r of roads) {
    if (distToSegment(x, y, r.x1, r.y1, r.x2, r.y2) < r.width / 2 + margin) {
      return false;
    }
  }
  return true;
}

// Genererar träd utspridda över gräset, men aldrig på vägarna.
export function buildTrees(roads) {
  const rng = makeRng(WORLD.seed);
  const trees = [];
  const count = 520;
  const e = WORLD.extent;

  for (let i = 0; i < count; i++) {
    const x = range(rng, -e, e);
    const y = range(rng, -e, e);

    // Tätheten avtar en aning mot mitten så byn känns öppnare där.
    if (!isClearForNature(x, y, roads, 26)) continue;

    trees.push({
      x,
      y,
      scale: range(rng, 0.75, 1.35),
      kind: rng() < 0.62 ? 'oak' : 'pine',
      tone: rng(),           // liten färgvariation
    });
  }

  // Rita bakre träd först (lägre y) för naturlig överlappning.
  trees.sort((a, b) => a.y - b.y);
  return trees;
}

// Små grästofsar/fläckar för textur på marken.
export function buildGrassDetail() {
  const rng = makeRng(WORLD.seed ^ 0x9e3779b9);
  const details = [];
  const e = WORLD.extent;
  const count = 2600;

  for (let i = 0; i < count; i++) {
    const x = range(rng, -e, e);
    const y = range(rng, -e, e);
    details.push({
      x,
      y,
      len: range(rng, 3, 8),
      lean: range(rng, -2, 2),
      shade: rng(),
    });
  }
  return details;
}
