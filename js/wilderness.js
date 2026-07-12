// Genererar den omgivande vildmarken (skog, berg, dammar, stigar, facklor)
// runt den centrala kart-bilden, så världen blir mycket större och scrollbar
// utan att röra själva bilden. Allt är deterministiskt (seedad slump).

import { makeRng, range } from './rng.js';

const SEED = 90210;

// Färger anpassade efter kartbildens mörka, fackelupplysta ton.
const PALETTE = {
  grassDark: '#1c2b10',
  grassMid: '#26380f',
  grassLight: '#324912',
  forestFloor: '#0f180a',
  pineDark: '#0c180d',
  pineMid: '#16261a',
  pineLight: '#233a26',
  trunk: '#2a1e12',
  rockDark: '#2b2620',
  rockMid: '#524a3e',
  rockLight: '#77705f',
  water: '#0d2a4a',
  waterLight: '#1c4a75',
  road: '#33363a',
  roadDark: '#232527',
  roadLine: '#c8a23a',
  torchWood: '#241a10',
};

export function buildWilderness(bitmapW, bitmapH) {
  const scaleFactor = 3.0;
  const worldW = Math.round(bitmapW * scaleFactor);
  const worldH = Math.round(bitmapH * scaleFactor);
  const offsetX = Math.round((worldW - bitmapW) / 2);
  const offsetY = Math.round((worldH - bitmapH) / 2);

  // Central-rektangeln (där kartbilden ligger) plus en liten marginal.
  const rect = { x0: offsetX - 20, y0: offsetY - 20, x1: offsetX + bitmapW + 20, y1: offsetY + bitmapH + 20 };
  const cx = offsetX + bitmapW / 2;
  const cy = offsetY + bitmapH / 2;

  const rng = makeRng(SEED);

  function insideRect(x, y, pad = 0) {
    return x > rect.x0 - pad && x < rect.x1 + pad && y > rect.y0 - pad && y < rect.y1 + pad;
  }

  // ---- Vandrande stignätverk genom vildmarken (oberoende av de centrala vägarna) ----
  const paths = [];
  const pathTorches = [];
  const numPaths = 9;
  for (let i = 0; i < numPaths; i++) {
    const ang = (i / numPaths) * Math.PI * 2 + range(rng, -0.25, 0.25);
    const startR = Math.max(bitmapW, bitmapH) * 0.62;
    let x = cx + Math.cos(ang) * startR;
    let y = cy + Math.sin(ang) * startR;
    const pts = [{ x, y }];
    const steps = 6 + Math.floor(rng() * 4);
    let dirAng = ang;
    for (let s = 0; s < steps; s++) {
      dirAng += range(rng, -0.5, 0.5);
      const len = range(rng, 140, 260);
      x += Math.cos(dirAng) * len;
      y += Math.sin(dirAng) * len;
      x = Math.max(60, Math.min(worldW - 60, x));
      y = Math.max(60, Math.min(worldH - 60, y));
      pts.push({ x, y });
      if (s % 2 === 1) pathTorches.push({ x: x + range(rng, -14, 14), y: y + range(rng, -14, 14) });
    }
    paths.push(pts);
  }

  // ---- Fortsättning av söder-vägen som faktiskt korsar bildkanten ----
  const southExitX = offsetX + 739; // uppmätt korsningspunkt i bildkoordinater
  const southExitY = offsetY + bitmapH;
  {
    const pts = [{ x: southExitX, y: southExitY }];
    let x = southExitX, y = southExitY, dirAng = Math.PI / 2;
    const steps = 5;
    for (let s = 0; s < steps; s++) {
      dirAng += range(rng, -0.3, 0.3);
      const len = range(rng, 160, 240);
      x += Math.cos(dirAng) * len;
      y += Math.sin(dirAng) * len;
      x = Math.max(60, Math.min(worldW - 60, x));
      y = Math.min(worldH - 60, y);
      pts.push({ x, y });
      if (s % 2 === 0) pathTorches.push({ x: x + range(rng, -12, 12), y: y + range(rng, -12, 12) });
    }
    paths.push(pts);
  }

  function distToPath(x, y, margin) {
    for (const pts of paths) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const vx = b.x - a.x, vy = b.y - a.y;
        const len2 = vx * vx + vy * vy;
        let t = len2 > 0 ? ((x - a.x) * vx + (y - a.y) * vy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + t * vx, py = a.y + t * vy;
        if (Math.hypot(x - px, y - py) < margin) return true;
      }
    }
    return false;
  }

  // ---- Dammar ----
  const ponds = [];
  let pondAttempts = 0;
  while (ponds.length < 7 && pondAttempts < 400) {
    pondAttempts++;
    const x = range(rng, 100, worldW - 100);
    const y = range(rng, 100, worldH - 100);
    if (insideRect(x, y, 160)) continue;
    const rx = range(rng, 55, 130);
    const ry = rx * range(rng, 0.6, 0.85);
    let ok = true;
    for (const p of ponds) if (Math.hypot(p.x - x, p.y - y) < p.rx + rx + 80) { ok = false; break; }
    if (!ok) continue;
    ponds.push({ x, y, rx, ry });
  }

  // ---- Bergskedja mot ytterkanten ----
  const rocks = [];
  const edgeMargin = 0.16;
  for (let i = 0; i < 260; i++) {
    const x = range(rng, 0, worldW);
    const y = range(rng, 0, worldH);
    const nearEdgeX = x < worldW * edgeMargin || x > worldW * (1 - edgeMargin);
    const nearEdgeY = y < worldH * edgeMargin || y > worldH * (1 - edgeMargin);
    if (!(nearEdgeX || nearEdgeY)) continue;
    if (insideRect(x, y, 40)) continue;
    rocks.push({ x, y, scale: range(rng, 0.9, 2.1), tone: rng() });
  }
  // Extra spridda stenblock lite längre in (inte bara ytterkant).
  for (let i = 0; i < 90; i++) {
    const x = range(rng, 0, worldW);
    const y = range(rng, 0, worldH);
    if (insideRect(x, y, 40)) continue;
    if (distToPath(x, y, 26)) continue;
    rocks.push({ x, y, scale: range(rng, 0.5, 1.1), tone: rng() });
  }

  // ---- Träd ----
  const trees = [];
  for (let i = 0; i < 1900; i++) {
    const x = range(rng, 0, worldW);
    const y = range(rng, 0, worldH);
    if (insideRect(x, y, 34)) continue;
    if (distToPath(x, y, 22)) continue;
    let tooCloseToPond = false;
    for (const p of ponds) if ((x - p.x) ** 2 / (p.rx + 20) ** 2 + (y - p.y) ** 2 / (p.ry + 20) ** 2 < 1) { tooCloseToPond = true; break; }
    if (tooCloseToPond) continue;
    trees.push({ x, y, scale: range(rng, 0.7, 1.5), tone: rng() });
  }
  // Tät, bred trädrand runt kartbildens kant (döljer övergången helt).
  const ringCount = 900;
  for (let i = 0; i < ringCount; i++) {
    const t = i / ringCount;
    const perim = 2 * (bitmapW + bitmapH);
    const d = t * perim;
    let x, y;
    if (d < bitmapW) { x = offsetX + d; y = offsetY; }
    else if (d < bitmapW + bitmapH) { x = offsetX + bitmapW; y = offsetY + (d - bitmapW); }
    else if (d < 2 * bitmapW + bitmapH) { x = offsetX + bitmapW - (d - bitmapW - bitmapH); y = offsetY + bitmapH; }
    else { x = offsetX; y = offsetY + bitmapH - (d - 2 * bitmapW - bitmapH); }
    const outward = range(rng, 8, 170);
    const ang = Math.atan2(y - cy, x - cx);
    x += Math.cos(ang) * outward;
    y += Math.sin(ang) * outward;
    if (x < 0 || y < 0 || x > worldW || y > worldH) continue;
    if (distToPath(x, y, 22)) continue;
    trees.push({ x, y, scale: range(rng, 0.85, 1.6), tone: rng() });
  }

  trees.sort((a, b) => a.y - b.y);
  rocks.sort((a, b) => a.y - b.y);

  // ---- Facklor i vildmarken (för det levande ljus-systemet) ----
  const torches = [];
  for (const t of pathTorches) {
    if (insideRect(t.x, t.y, 10)) continue;
    torches.push([t.x, t.y, 235, 140, 60]);
  }
  // Några extra spridda i skogen.
  const rng2 = makeRng(SEED ^ 0xabc123);
  for (let i = 0; i < 40; i++) {
    const x = range(rng2, 0, worldW);
    const y = range(rng2, 0, worldH);
    if (insideRect(x, y, 60)) continue;
    torches.push([x, y, 235, 140, 60]);
  }

  return {
    world: { w: worldW, h: worldH, offsetX, offsetY, bitmapW, bitmapH },
    paths, ponds, rocks, trees, torches,
    palette: PALETTE,
  };
}
