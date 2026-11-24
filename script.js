/* =====================================================
   BUILDWISE — GUIDED HOUSE PLANNER
   Questions on the left, 3D house on top, estimate below
===================================================== */

const WALL_H = 2.7; // wall height per floor (m)

const $ = id => document.getElementById(id);
const peso = n => "₱" + Math.round(n).toLocaleString("en-US");
const num = n => Math.round(n).toLocaleString("en-US");
const r1 = n => Math.round(n * 10) / 10;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));


/* =========================
   DATA
========================= */

const WALLS = {
  chb:  { name: "Concrete Hollow Block", icon: "🧱", desc: 'Standard 8"×16" (20 × 40 cm) hollow blocks between reinforced concrete columns, plastered both sides. The standard, strong and affordable choice.' },
  wood: { name: "Wood",                  icon: "🪵", desc: "Light and fast to build. Needs treatment against termites and moisture." }
};

// walls that divide the rooms inside the house
const PARTITIONS = {
  chb4:    { name: "Concrete Hollow Block", icon: "🧱", desc: 'Standard 8"×16" (20 × 40 cm) hollow blocks, plastered both sides. Strongest, quiet and fire-resistant, but heavier and slower to build.' },
  plywood: { name: "Plywood on wood studs",    icon: "🪵", desc: "Light, quick and cheaper. Weaker against moisture, termites and fire." },
  gypsum:  { name: "Gypsum board on metal studs", icon: "🧰", desc: "Flat, clean finish and fast to install. Good for upper floors. Not for wet areas." }
};

/* perimeter fence types (S.fence is false for none, or one of these ids; old plans saved `true`, which means concrete block) */
const FENCES = {
  chb:      { name: "Concrete block wall",         icon: "🧱", h: 1.8, desc: "Solid hollow-block wall (1.8 m) with a steel gate. Most private and secure." },
  chbsteel: { name: "Concrete base + steel bars",  icon: "🏛️", h: 1.8, desc: "Low block wall (0.6 m) topped with steel bars. Private enough, lets air and light through." },
  steel:    { name: "Metal / wrought-iron fence",  icon: "⛓️", h: 1.5, desc: "Steel posts and pickets (1.5 m) on concrete footings, with a steel gate. Neat and durable." },
  wire:     { name: "Wire (chain-link) fence",     icon: "🕸️", h: 1.5, desc: "GI wire mesh on steel pipe posts (1.5 m). Cheapest solid boundary, good for big lots and gardens." },
  bamboo:   { name: "Bamboo fence",                icon: "🎍", h: 1.5, desc: "Bamboo poles on sturdy posts (1.5 m). Natural look and low cost, needs upkeep every few years." },
  wood:     { name: "Wood picket fence",           icon: "🪵", h: 1.2, desc: "Treated lumber pickets (1.2 m) with a wooden gate. Friendly and decorative." }
};
const fenceKind = v => (v === true ? "chb" : (FENCES[v] ? v : null));

// SAMPLE PRICES ONLY — editable in the Materials breakdown
const DEFAULT_PRICES = {
  chb: 18, cement: 290, sand: 900, gravel: 1500, rebar: 55, tiewire: 85,
  roofsheet: 650, truss: 5500, purlin: 480, ridge: 450, screws: 650,
  plywood: 750, lumber: 80, nails: 90, varnish: 1100,
  glass: 4500, aluminum: 850,
  tile: 480, adhesive: 380, paint: 900, door: 4500, sealant: 280, tubesteel: 650, lintel: 450,
  plywood6: 380, gypsum: 450, metalstud: 95, drywallscrew: 220, compound: 650,
  fixture: 12000, outtile: 520, garagedoor: 7500, railing: 2800, slidingdoor: 14000,
  elec: 850, plumb: 700, gate: 18000,
  fencepanel: 1100, wirepost: 420, gimesh: 190, bamboo: 60, woodpost: 300, bgate: 4500, woodgate: 7500,
  stair_straight: 45000, stair_L: 60000, stair_U: 75000, stair_spiral: 85000,
  ...(window.Elec ? Elec.priceKeys() : {}),
  room_vanity: 18000, room_closet: 30000, room_island: 35000, room_galley: 22000, room_bar: 12000, room_tub: 25000, room_bunk: 16000, room_ensuite: 65000,
  ...(window.LotItems ? LotItems.priceKeys() : {})
};
let prices = { ...DEFAULT_PRICES };

// factor = share of the total project duration this trade is on site
function defaultPay() {
  let fee = 10;
  try { const v = parseFloat(localStorage.getItem("bw_default_fee")); if (v >= 0 && v <= 100) fee = v; } catch (e) {}
  return { type: "arawan", feeMode: "percent", feePct: fee, feeFixed: 0, pakyawan: null, showFee: true };
}

/* a brand-new plan starts with the pay type that fits the account: contractor -> contractor fee, foreman -> pakyawan */
function initialPay() {
  const p = defaultPay();
  try { const t = localStorage.getItem("bw_pro_type"); if (t === "contractor") p.type = "contractor"; else if (t === "foreman") p.type = "pakyawan"; } catch (e) {}
  return p;
}

function defaultCrew() {
  return [
    { id: "foreman",     name: "Foreman",            tier: "Supervisor", rate: 1100, count: 1, factor: 1.00, days: null },
    { id: "mason",       name: "Mason",              tier: "Skilled",    rate: 850,  count: 2, factor: 0.55, days: null },
    { id: "carpenter",   name: "Carpenter",          tier: "Skilled",    rate: 850,  count: 1, factor: 0.45, days: null },
    { id: "steelman",    name: "Steelman (rebar)",   tier: "Skilled",    rate: 850,  count: 1, factor: 0.25, days: null },
    { id: "electrician", name: "Electrician",        tier: "Skilled",    rate: 950,  count: 1, factor: 0.20, days: null },
    { id: "plumber",     name: "Plumber",            tier: "Skilled",    rate: 900,  count: 1, factor: 0.20, days: null },
    { id: "roofer",      name: "Roofer / Welder",    tier: "Skilled",    rate: 900,  count: 1, factor: 0.15, days: null },
    { id: "tiler",       name: "Tile setter",        tier: "Skilled",    rate: 800,  count: 1, factor: 0.12, days: null },
    { id: "painter",     name: "Painter",            tier: "Skilled",    rate: 750,  count: 1, factor: 0.15, days: null },
    { id: "glazier",     name: "Glazier / Aluminum installer", tier: "Skilled", rate: 900, count: 1, factor: 0.15, days: null },
    { id: "helper",      name: "Laborer / Helper",   tier: "Helper",     rate: 650,  count: 4, factor: 1.00, days: null }
  ];
}

const STEPS = [
  { id: "lot",       title: "Land & house size", q: "Tell us about your lot, then how big the house should be." },
  { id: "floorArea", title: "Floor area",        q: "How big should the house be? (total floor area)", host: "lot" },
  { id: "floors",    title: "Number of floors",  q: "How many floors will the house have?", host: "lot" },
  { id: "rooms",     title: "Rooms & layout",    q: "Which rooms do you want, and where should they go?" },
  { id: "partitions", title: "Room dividers",    q: "What should the walls between rooms be made of?" },
  { id: "walls",     title: "Walls, glass & windows", q: "What should the outside of the house be made of?" },
  { id: "glass",     title: "Glass walls",       q: "How much of the exterior walls should be glass?", host: "walls" },
  { id: "windows",   title: "Windows",           q: "How many windows, and what size?", host: "walls" },
  { id: "fence",     title: "Perimeter fence",   q: "What kind of perimeter fence do you want?" },
  { id: "elec",      title: "Electrical & utilities", q: "How many lights, outlets, aircons and water points should we plan for?" },
  { id: "budget",    title: "Budget",            q: "What is your total budget?" },
  { id: "labor",     title: "Labor / workers",   q: "Who will build it? Set your crew and their daily rates." }
];

/* some questions are shown together on one card: a "host" step carries its "guest" steps (guests have host:"<id>") */
const stepIdx = id => STEPS.findIndex(s => s.id === id);
const guestsOf = id => STEPS.filter(s => s.host === id);
const hostIdx = i => (STEPS[i] && STEPS[i].host ? stepIdx(STEPS[i].host) : i);
const visibleSteps = () => STEPS.map((s, i) => i).filter(i => !STEPS[i].host);
const stepDone = i => !!answered[i] && guestsOf(STEPS[i].id).every(g => answered[stepIdx(g.id)]);
const nextOpen = () => { const v = visibleSteps().find(i => !stepDone(i)); return v === undefined ? -1 : v; };

const LABOR_STEP = STEPS.findIndex(s => s.id === "labor");

const S = {
  lotArea: 200,
  aspect: 4 / 3,       // house width : depth
  layout: null,       // rooms and outdoor spaces placed on the floor plan
  garageOut: false,
  placement: null,    // manual position of the house on the lot {ox, oy} (lot-frame coordinates of the house's front-left corner); null = automatic
  garageA: 0,
  floorArea: 65,
  floors: 1,
  rooms: { bed: 2, master: 1, cr: 1 },
  garage: 0,          // 0 = none, 1 = one car, 2 = two cars
  terrace: 0,         // sqm, 0 = none
  balcony: false,
  partitions: "chb4",
  walls: "chb",
  glass: 0,
  windows: { count: 8, w: 1.2, h: 1.1 },
  fence: true,
  budget: 1500000,
  crew: defaultCrew(),
  pay: initialPay(),  // how the job is paid: arawan (daily crew), pakyawan (fixed labor price) or contractor (labor + materials + fee)
  interior: { style: "modern", furniture: true },   // look of the inside view
  look: { facade: "plain", roof: "gable", cladding: "amakan", finish: "plain" },   // outside look: set by house templates
  elec: null,         // electrical & utilities plan (see electrical.js)
  lotItems: [],       // other buildings and features on the lot: {id, type, name, u, t, w, d}
  extraItems: []      // extra materials the owner asked for in the reference chat: {id, name, qty, unit, price}
};

let answered = STEPS.map(() => false);
/* plans saved before the electrical question existed have one answer fewer */
const migrateAnswered = a => { a = a.slice(); if (a.length === STEPS.length - 1) a.splice(stepIdx("elec"), 0, false); return a; };
let editing = 0;
let snapshot = null;
let advisorNote = "";


/* =========================
   LOT SHAPE TOOLS
   The lot is a polygon of corner points (x, y in meters, y = up).
========================= */

const MAX_CORNERS = 16;
const cornerName = i => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));

const polySigned = p => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; } return a / 2; };
const polyArea = p => Math.abs(polySigned(p));
const polyPerim = p => p.reduce((a, q, i) => a + Math.hypot(p[(i + 1) % p.length].x - q.x, p[(i + 1) % p.length].y - q.y), 0);

function polyCentroid(p) {
  const A = polySigned(p);
  if (Math.abs(A) < 1e-9) return { x: p.reduce((a, q) => a + q.x, 0) / p.length, y: p.reduce((a, q) => a + q.y, 0) / p.length };
  let cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length], f = p[i].x * q.y - q.x * p[i].y;
    cx += (p[i].x + q.x) * f; cy += (p[i].y + q.y) * f;
  }
  return { x: cx / (6 * A), y: cy / (6 * A) };
}

function segCross(a, b, c, d) {
  const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return o(a, b, c) * o(a, b, d) < -1e-9 && o(c, d, a) * o(c, d, b) < -1e-9;
}

function selfIntersects(p) {
  const n = p.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i + 1 || (i === 0 && j === n - 1)) continue;
    if (segCross(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return true;
  }
  return false;
}

function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < (b.x - a.x) * (pt.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/* side lengths (and diagonals from corner A) of a polygon */
function measureLot(pts) {
  const n = pts.length;
  const sides = pts.map((p, i) => Math.hypot(pts[(i + 1) % n].x - p.x, pts[(i + 1) % n].y - p.y));
  const diags = [];
  for (let k = 2; k <= n - 2; k++) diags.push(Math.hypot(pts[k].x - pts[0].x, pts[k].y - pts[0].y));
  return { sides, diags };
}

/* Rebuild the exact shape from side lengths + diagonals from corner A (triangle fan).
   3 sides fix a triangle; every extra corner needs one extra diagonal. */
function solveFan(lens, prev) {
  const n = lens.sides.length;
  const e = new Array(n + 1).fill(0);
  e[1] = lens.sides[0]; e[n - 1] = lens.sides[n - 1];
  for (let k = 2; k <= n - 2; k++) e[k] = lens.diags[k - 2];
  for (let i = 0; i < n; i++) if (!(lens.sides[i] > 0)) return { error: `Side ${cornerName(i)}–${cornerName((i + 1) % n)} needs a length above 0.` };
  for (let k = 2; k <= n - 2; k++) if (!(e[k] > 0)) return { error: `Diagonal ${cornerName(0)}–${cornerName(k)} needs a length above 0.` };
  const pts = [{ x: 0, y: 0 }, { x: e[1], y: 0 }];
  let phi = 0;
  for (let t = 1; t <= n - 2; t++) {
    const a = e[t], b = e[t + 1], c = lens.sides[t];
    const cos = (a * a + b * b - c * c) / (2 * a * b);
    if (cos > 1 + 1e-9 || cos < -1 - 1e-9) {
      return { error: `Corners ${cornerName(0)}, ${cornerName(t)} and ${cornerName(t + 1)} can't meet with these lengths (${r2(a)}, ${r2(c)} and ${r2(b)} m). Check the measurements: each length must be shorter than the other two added together.` };
    }
    const th = Math.acos(Math.max(-1, Math.min(1, cos)));
    let sgn = 1;
    if (prev && prev.length === n) {
      const cr = (prev[t].x - prev[0].x) * (prev[t + 1].y - prev[0].y) - (prev[t].y - prev[0].y) * (prev[t + 1].x - prev[0].x);
      if (cr < 0) sgn = -1;
    }
    phi += sgn * th;
    pts.push({ x: b * Math.cos(phi), y: b * Math.sin(phi) });
  }
  // keep the old position and rotation so the plan doesn't jump around
  if (prev && prev.length === n) {
    const ang = Math.atan2(prev[1].y - prev[0].y, prev[1].x - prev[0].x), c = Math.cos(ang), s = Math.sin(ang);
    return { pts: pts.map(p => ({ x: prev[0].x + p.x * c - p.y * s, y: prev[0].y + p.x * s + p.y * c })) };
  }
  return { pts };
}

const r2 = n => Math.round(n * 100) / 100;

/* clean up a list of corners: no duplicates, counter-clockwise, starting at 0,0 */
function cleanPts(raw) {
  let p = raw.map(q => ({ x: Number(q.x), y: Number(q.y) })).filter(q => Number.isFinite(q.x) && Number.isFinite(q.y));
  p = p.filter((q, i) => i === 0 || Math.hypot(q.x - p[i - 1].x, q.y - p[i - 1].y) > 1e-6);
  while (p.length > 1 && Math.hypot(p[0].x - p[p.length - 1].x, p[0].y - p[p.length - 1].y) < 1e-6) p.pop();
  return p;
}

function dropStraightCorners(p, tol) {
  let out = p.slice(), changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const len = Math.hypot(c.x - a.x, c.y - a.y) || 1;
      const dev = Math.abs((c.x - a.x) * (a.y - b.y) - (a.x - b.x) * (c.y - a.y)) / len;
      if (dev < tol) { out.splice(i, 1); changed = true; break; }
    }
  }
  return out;
}

function newLotFrom(rawPts, road) {
  let p = cleanPts(rawPts);
  let rd = road || 0;
  if (polySigned(p) < 0) {                     // make it counter-clockwise
    p = p.slice().reverse();
    rd = (p.length - 2 - rd + 2 * p.length) % p.length;
  }
  const minx = Math.min(...p.map(q => q.x)), miny = Math.min(...p.map(q => q.y));
  p = p.map(q => ({ x: q.x - minx, y: q.y - miny }));
  return { pts: p, road: Math.min(rd, p.length - 1), lens: measureLot(p), err: "", note: "", name: "" };
}

function syncLot() {
  S.lotArea = r2(polyArea(S.lot.pts));
}

/* a few starting shapes, scaled to the wanted area */
const LOT_PRESETS = {
  rect:      { name: "Rectangle",       pts: [[0, 0], [1, 0], [1, 2], [0, 2]] },
  square:    { name: "Square",          pts: [[0, 0], [1, 0], [1, 1], [0, 1]] },
  triangle:  { name: "Triangle",        pts: [[0, 0], [1.6, 0], [0.5, 1.3]] },
  trapezoid: { name: "Trapezoid",       pts: [[0, 0], [2, 0], [1.6, 1.2], [0.4, 1.2]] },
  lshape:    { name: "L-shape",         pts: [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]] },
  quad:      { name: "Irregular 4-side", pts: [[0, 0], [2, 0.1], [1.7, 1.6], [0.15, 1.2]] },
  pentagon:  { name: "5-sided",         pts: [[0, 0], [2, 0], [2.2, 1.2], [1, 2], [-0.2, 1.1]] }
};

function presetPts(key, area) {
  const u = LOT_PRESETS[key].pts.map(a => ({ x: a[0], y: a[1] }));
  const k = Math.sqrt(area / polyArea(u));
  return u.map(q => ({ x: q.x * k, y: q.y * k }));
}

function setLot(rawPts, road, note, name) {
  S.placement = null;
  const lot = newLotFrom(rawPts, road);
  lot.note = note || "";
  lot.name = name || "";
  S.lot = lot;
  syncLot();
}

function addCorner(i) {
  const L = S.lot, n = L.pts.length;
  if (n >= MAX_CORNERS) return;
  const a = L.pts[i], b = L.pts[(i + 1) % n];
  L.pts.splice(i + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  if (L.road > i) L.road++;
  L.lens = measureLot(L.pts); L.err = ""; L.name = "";
  syncLot();
}

function removeCorner(i) {
  const L = S.lot;
  if (L.pts.length <= 3) return;
  L.pts.splice(i, 1);
  if (L.road >= L.pts.length) L.road = L.pts.length - 1;
  L.lens = measureLot(L.pts); L.err = ""; L.name = "";
  syncLot();
}

function scaleLotToArea(target) {
  const L = S.lot, a = polyArea(L.pts);
  if (!(target > 0) || !(a > 0)) return;
  const k = Math.sqrt(target / a);
  L.pts = L.pts.map(q => ({ x: q.x * k, y: q.y * k }));
  L.lens = measureLot(L.pts); L.err = "";
  syncLot();
}

function lotProblems(lot) {
  const probs = [];
  if (lot.err) probs.push(lot.err);
  if (selfIntersects(lot.pts)) probs.push("Some sides cross each other. Move a corner so the outline doesn't cross itself.");
  if (polyArea(lot.pts) < 5) probs.push("The lot is too small (under 5 sqm). Check the lengths.");
  return probs;
}

/* ---------- frame of the lot: origin at the road side's midpoint ----------
   u = along the road side (to the right as seen from the road), t = distance into the lot */
function lotFrame(lot) {
  const pts = lot.pts, n = pts.length;
  const i = Math.min(lot.road || 0, n - 1);
  const a = pts[i], b = pts[(i + 1) % n];
  const ex = b.x - a.x, ey = b.y - a.y, len = Math.hypot(ex, ey) || 1;
  const sg = polySigned(pts) >= 0 ? 1 : -1;
  const nrm = { x: -sg * ey / len, y: sg * ex / len };      // points into the lot
  const rgt = { x: nrm.y, y: -nrm.x };
  const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return {
    i, a, b, len, nrm, rgt, m,
    toLocal: p => ({ u: (p.x - m.x) * rgt.x + (p.y - m.y) * rgt.y, t: (p.x - m.x) * nrm.x + (p.y - m.y) * nrm.y }),
    toMap: (u, t) => ({ x: m.x + u * rgt.x + t * nrm.x, y: m.y + u * rgt.y + t * nrm.y })
  };
}

/* ---------- where the house fits inside the lot ----------
   Usual setbacks: 3 m front, 1.5 m sides, 2 m rear (rules differ by city, so check yours). */
const SETBACK = { front: 3, side: 1.5, rear: 2 };
const placeCache = {};

/* usual setback for each side of the lot: road side 3 m, the side opposite the road 2 m, the others 1.5 m */
function lotSetbacks(lot) {
  const pts = lot.pts, n = pts.length, fr = lotFrame(lot), sg = polySigned(pts) >= 0 ? 1 : -1;
  return pts.map((a, j) => {
    if (j === fr.i) return SETBACK.front;
    const b = pts[(j + 1) % n], ex = b.x - a.x, ey = b.y - a.y, len = Math.hypot(ex, ey) || 1;
    const inx = -sg * ey / len, iny = sg * ex / len;
    return inx * fr.nrm.x + iny * fr.nrm.y < -0.8 ? SETBACK.rear : SETBACK.side;
  });
}

const segDist = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + dx * k), p.y - (a.y + dy * k));
};

/* sample points around a shape (a little inside it) so we can test it against the lot */
function shapeSamples(shape) {
  const c = polyCentroid(shape), out = [];
  const pull = p => { const d = Math.hypot(c.x - p.x, c.y - p.y) || 1; return { x: p.x + (c.x - p.x) / d * 0.03, y: p.y + (c.y - p.y) / d * 0.03 }; };
  shape.forEach((a, i) => {
    const b = shape[(i + 1) % shape.length], len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / 0.5));
    for (let k = 0; k < n; k++) out.push(pull({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }));
  });
  return out;
}

/* do all shapes (house, garage, terrace...) sit inside the lot polygon (in the u/t frame) at this offset? */
function shapesFit(shapes, lotPoly, sbs, ox, oy, useSetback) {
  for (const sh of shapes) {
    for (const s0 of sh.samples) {
      const p = { x: s0.x + ox, y: s0.y + oy };
      if (!pointInPoly(p, lotPoly)) return false;
      if (useSetback) for (let j = 0; j < lotPoly.length; j++) if (segDist(p, lotPoly[j], lotPoly[(j + 1) % lotPoly.length]) < sbs[j] - 1e-6) return false;
    }
    const moved = sh.pts.map(q => ({ x: q.x + ox, y: q.y + oy }));
    if (lotPoly.some(v => pointInPoly(v, moved) && !moved.some(q => Math.hypot(q.x - v.x, q.y - v.y) < 0.05) && sh.pts.length > 0 &&
      moved.every((q, i) => segDist(v, q, moved[(i + 1) % moved.length]) > 0.05))) return false;
  }
  return true;
}

function houseModel(st) {
  const g = geometry(st), L = st.layout;
  const W = g.w, D = g.d;
  const shapes = [{ pts: g.poly }];
  let x0 = 0, x1 = W, tf = 0, tb = D;        // bounding box of the house plus garage / terrace / balcony
  if (L) L.spaces.forEach(s => {
    if (!isOutdoor(s) || (s.type === "balcony" && st.floors < 2) || spaceInside(s)) return;
    x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x + s.w); tf = Math.min(tf, s.t); tb = Math.max(tb, s.t + s.h);
    shapes.push({ pts: [{ x: s.x, y: s.t }, { x: s.x + s.w, y: s.t }, { x: s.x + s.w, y: s.t + s.h }, { x: s.x, y: s.t + s.h }] });
  });
  shapes.forEach(sh => { sh.samples = shapeSamples(sh.pts); });
  const Wb = x1 - x0, Db = tb - tf;
  const fr = lotFrame(st.lot);
  const lotPoly = st.lot.pts.map(p => { const q = fr.toLocal(p); return { x: q.u, y: q.t }; });   // x = u, y = t
  const sbs = lotSetbacks(st.lot);
  return { g, W, D, shapes, x0, x1, tf, tb, Wb, Db, lotPoly, sbs };
}

/* is the whole house (with garage, terrace...) inside the lot if its front-left corner is at (ox, oy)? */
function houseFitsAt(ox, oy, useSetback) {
  const m = houseModel(S);
  return shapesFit(m.shapes, m.lotPoly, m.sbs, ox, oy, !!useSetback);
}

function placeHouse(st) {
  const { g, W, D, shapes, x0, x1, tf, tb, Wb, Db, lotPoly, sbs } = houseModel(st);
  const done = (res, manual) => ({ fits: res.fits, tight: res.tight, manual, ox: res.ox, oy: res.oy, u0: res.ox + W / 2, hf: res.oy, W, D, Wb, Db, td: 0 });

  if (st.placement) {   // the owner dragged the house somewhere: it only has to stay inside the lot
    const { ox, oy } = st.placement;
    const ok = shapesFit(shapes, lotPoly, sbs, ox, oy, false);
    return done({ fits: ok, tight: ok && shapesFit(shapes, lotPoly, sbs, ox, oy, true), ox, oy }, true);
  }

  const key = JSON.stringify([st.lot.pts.map(p => [r2(p.x), r2(p.y)]), st.lot.road, shapes.map(sh => sh.pts.map(q => [r2(q.x), r2(q.y)]))]);
  let res = placeCache[key];
  if (!res) {
    const us = lotPoly.map(p => p.x), ts = lotPoly.map(p => p.y);
    const umin = Math.min(...us), umax = Math.max(...us), tmax = Math.max(...ts);
    const cen = polyCentroid(lotPoly), cxu = (x0 + x1) / 2;
    const kmax = Math.ceil((umax - umin) / 0.5) + 1;
    for (let ty = 0; ty + Db <= tmax + 1e-9 && !res; ty += 0.5) {
      for (let k = 0; k <= kmax && !res; k++) {
        for (const sg of (k === 0 ? [1] : [1, -1])) {
          const ox = cen.x + sg * k * 0.5 - cxu, oy = ty - tf;
          if (shapesFit(shapes, lotPoly, sbs, ox, oy, true)) { res = { fits: true, tight: true, ox, oy }; break; }
        }
      }
    }
    if (!res) res = { fits: false, tight: false, ox: Math.min(Math.max(cen.x, umin), umax) - W / 2, oy: SETBACK.front - tf };
    placeCache[key] = res;
  }
  return done(res, false);
}


/* =========================
   READING A LOT FILE
========================= */

function lonLatToLocal(list) {
  const lat0 = list.reduce((a, p) => a + p.lat, 0) / list.length;
  const lon0 = list.reduce((a, p) => a + p.lon, 0) / list.length;
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  return list.map(p => ({ x: (p.lon - lon0) * kx, y: (p.lat - lat0) * ky }));
}

const looksLonLat = pts => pts.every(p => Math.abs(p.x) <= 180 && Math.abs(p.y) <= 90) &&
  (Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x))) < 1 && (Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y))) < 1 &&
  pts.some(p => Math.abs(p.x) > 1 || Math.abs(p.y) > 1);

function azimuth(ns, deg, min, sec, ew) {
  const a = deg + (min || 0) / 60 + (sec || 0) / 3600;
  if (a > 90 + 1e-9) throw new Error(`A bearing can't be more than 90° (${ns} ${deg}° ${ew}).`);
  const E = ew.toUpperCase() === "E", N = ns.toUpperCase() === "N";
  return N ? (E ? a : 360 - a) : (E ? 180 - a : 180 + a);
}

/* "N 45°30' E 25.00 m" style courses, like in a land title's technical description */
function parseCourses(text) {
  const t = text.replace(/[°º˚]/g, "°").replace(/[′’‘]/g, "'").replace(/[″”“]/g, '"')
    .replace(/\bdeg(?:rees?)?\b\.?/gi, "°").replace(/\bmin(?:utes?)?\b\.?/gi, "'").replace(/\bsec(?:onds?)?\b\.?/gi, '"');
  const chunks = t.split(/;|\n|\bthence\b|,(?=\s*(?:due\s+)?(?:[NS]\b|north\b|south\b|east\b|west\b))/i);
  const out = [];
  for (const c of chunks) {
    let m = c.match(/\b([NS])\b\.?\s*([0-9][0-9°'"\.\-\s:]*?)\s*\b([EW])\b\.?[\s,]*(?:a\s+distance\s+of\s*)?(\d+(?:\.\d+)?)/i);
    if (m) {
      const nums = m[2].match(/\d+(?:\.\d+)?/g).map(Number);
      out.push({ az: azimuth(m[1], nums[0], nums[1], nums[2], m[3]), d: Number(m[4]) });
      continue;
    }
    m = c.match(/\b(?:due\s+)?(north|south|east|west)\b[\s,]*(?:a\s+distance\s+of\s*)?(\d+(?:\.\d+)?)/i);
    if (m) out.push({ az: { north: 0, east: 90, south: 180, west: 270 }[m[1].toLowerCase()], d: Number(m[2]) });
  }
  return out;
}

function polyFromCourses(cs) {
  const pts = [{ x: 0, y: 0 }];
  cs.forEach(c => {
    const p = pts[pts.length - 1], r = c.az * Math.PI / 180;
    pts.push({ x: p.x + c.d * Math.sin(r), y: p.y + c.d * Math.cos(r) });
  });
  const per = cs.reduce((a, c) => a + c.d, 0);
  const gap = Math.hypot(pts[pts.length - 1].x - pts[0].x, pts[pts.length - 1].y - pts[0].y);
  let note = `Read ${cs.length} lines (bearings and distances).`;
  if (gap < Math.max(0.3, per * 0.005)) pts.pop();
  else note += ` The description doesn't close exactly (gap of ${r2(gap)} m), so the last corner was joined straight back to the first.`;
  return { pts, note };
}

function parseCoordRows(lines) {
  const rows = lines.map(l => l.replace(/^[A-Za-z_]+\s*[:=]?\s*(?=[-\d])/, ""))
    .map(l => l.split(/[,;\t ]+/).map(s => s.trim()).filter(Boolean));
  let header = null;
  const first = rows[0] || [];
  if (first.length && first.every(s => !/^-?\d/.test(s))) header = first.map(s => s.toLowerCase());
  const body = rows.slice(header ? 1 : 0).map(r => r.filter(s => /^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)).map(Number)).filter(r => r.length >= 2);
  if (body.length < 3) return null;
  let xi = 0, yi = 1, lonLat = false, latFirst = false;
  if (body.every((r, i) => r.length >= 3 && r[0] === i + 1)) { xi = 1; yi = 2; }      // leading point numbers
  if (header) {
    const idx = re => header.findIndex(h => re.test(h));
    const ix = idx(/^(x|e|east|easting)$/), iy = idx(/^(y|n|north|northing)$/);
    const ilat = idx(/^(lat|latitude)$/), ilon = idx(/^(lon|lng|long|longitude)$/);
    if (ilat >= 0 && ilon >= 0) { lonLat = true; xi = ilon; yi = ilat; }
    else if (ix >= 0 && iy >= 0) { xi = ix; yi = iy; }
  }
  let pts = body.map(r => ({ x: r[xi], y: r[yi] }));
  if (!lonLat && !header && looksLonLat(pts)) {
    lonLat = true;
    if (pts.some(p => Math.abs(p.x) > 90)) { /* x is longitude */ } else latFirst = true;
  }
  if (lonLat) pts = lonLatToLocal(pts.map(p => (latFirst ? { lat: p.x, lon: p.y } : { lat: p.y, lon: p.x })));
  return { pts, note: `Read ${pts.length} corner coordinates${lonLat ? " (latitude/longitude converted to meters)" : ""}.` };
}

/* only side lengths: 3 numbers = triangle, 4 sides + 1 diagonal = 4-sided, and so on */
function parseSideList(lines) {
  const nums = lines.map(l => { const m = l.match(/-?\d+(?:\.\d+)?/g); return m ? Number(m[m.length - 1]) : null; }).filter(v => v !== null && v > 0);
  const N = nums.length;
  if (N < 3) return null;
  let n = null;
  if (N === 3) n = 3;
  else if (N >= 5 && N % 2 === 1) n = (N + 3) / 2;
  if (n) {
    const r = solveFan({ sides: nums.slice(0, n), diags: nums.slice(n) }, null);
    if (r.error) throw new Error(r.error);
    return { pts: r.pts, note: `Built a ${n}-sided lot from ${n} side lengths${n > 3 ? ` and ${n - 3} diagonal${n > 4 ? "s" : ""}` : ""}.` };
  }
  if (N === 4 && Math.abs(nums[0] - nums[2]) < 0.05 && Math.abs(nums[1] - nums[3]) < 0.05) {
    return { pts: [{ x: 0, y: 0 }, { x: nums[0], y: 0 }, { x: nums[0], y: nums[1] }, { x: 0, y: nums[1] }], note: "Opposite sides are equal, so the lot was drawn as a rectangle." };
  }
  throw new Error(`I found ${N} side lengths, but side lengths alone can't fix a ${N}-sided shape. Add the diagonals (a 4-sided lot needs 1, a 5-sided lot needs 2, ...) as extra numbers, or use corner coordinates or bearings.`);
}

function parseLotPlain(text) {
  const courses = parseCourses(text);
  if (courses.length >= 3) return polyFromCourses(courses);
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(s => s && !/^(#|\/\/)/.test(s));
  const multi = lines.filter(l => (l.match(/-?\d+(?:\.\d+)?/g) || []).length >= 2).length;
  const r = (multi >= lines.length * 0.6 ? parseCoordRows(lines) : null) || parseSideList(lines);
  if (!r) throw new Error("I couldn't find a lot outline in that text. See the examples below for the formats I can read.");
  return r;
}

function parseLotJSON(text) {
  let j;
  try { j = JSON.parse(text); } catch (e) { throw new Error("That file isn't valid JSON."); }
  const asPts = arr => arr.map(a => (Array.isArray(a) ? { x: Number(a[0]), y: Number(a[1]) } : { x: Number(a.x ?? a.lon ?? a.lng), y: Number(a.y ?? a.lat) }));
  // GeoJSON
  const findRing = o => {
    if (!o) return null;
    if (o.type === "FeatureCollection") { for (const f of o.features || []) { const r = findRing(f); if (r) return r; } return null; }
    if (o.type === "Feature") return findRing(o.geometry);
    if (o.type === "Polygon") return o.coordinates[0];
    if (o.type === "MultiPolygon") return o.coordinates[0][0];
    return null;
  };
  const ring = findRing(j);
  if (ring) {
    const pts = asPts(ring);
    return looksLonLat(pts)
      ? { pts: lonLatToLocal(pts.map(p => ({ lon: p.x, lat: p.y }))), note: `Read ${pts.length} GeoJSON corners (converted to meters).` }
      : { pts, note: `Read ${pts.length} GeoJSON corners.` };
  }
  const list = j.points || j.corners || j.vertices || (Array.isArray(j) ? j : null);
  if (list) {
    const pts = asPts(list);
    if (looksLonLat(pts)) return { pts: lonLatToLocal(pts.map(p => ({ lon: p.y > 90 ? p.y : p.x, lat: p.y > 90 ? p.x : p.y }))), note: `Read ${pts.length} corners (converted to meters).` };
    return { pts, note: `Read ${pts.length} corners.` };
  }
  const calls = j.courses || j.bearings || j.calls;
  if (calls) {
    const cs = calls.map(c => {
      if (typeof c === "string") return parseCourses(c)[0];
      const m = parseCourses(String(c.bearing || c.direction || ""))[0];
      return m ? { az: m.az, d: Number(c.distance ?? c.length ?? c.d) } : null;
    }).filter(Boolean);
    if (cs.length >= 3) return polyFromCourses(cs);
  }
  if (j.sides) return parseSideList([...j.sides, ...(j.diagonals || [])].map(String));
  throw new Error("I couldn't find corners, bearings or side lengths in that JSON file.");
}

function parseKML(text) {
  const m = text.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
  if (!m) throw new Error("No outline (coordinates) found in that KML file.");
  const pts = m[1].trim().split(/\s+/).map(s => s.split(",").map(Number)).filter(a => a.length >= 2 && a.every(Number.isFinite));
  if (pts.length < 3) throw new Error("The KML outline has fewer than 3 corners.");
  return { pts: lonLatToLocal(pts.map(a => ({ lon: a[0], lat: a[1] }))), note: `Read ${pts.length} KML corners (converted to meters).` };
}

function parseDXF(text) {
  const L = text.split(/\r?\n/).map(s => s.trim());
  const pairs = [];
  for (let i = 0; i + 1 < L.length; i += 2) pairs.push([parseInt(L[i], 10), L[i + 1]]);
  let ins = null, section = "", expect = false, cur = null;
  const ents = [];
  pairs.forEach(([c, v], i) => {
    if (c === 9 && v === "$INSUNITS" && pairs[i + 1]) ins = Number(pairs[i + 1][1]);
    if (c === 0 && v === "SECTION") expect = true;
    else if (c === 2 && expect) { section = v; expect = false; }
    else if (c === 0 && v === "ENDSEC") { if (cur) ents.push(cur); cur = null; section = ""; }
    else if (section === "ENTITIES") {
      if (c === 0) { if (cur) ents.push(cur); cur = { type: v, codes: [] }; }
      else if (cur) cur.codes.push([c, v]);
    }
  });
  const xy = codes => { const out = []; let x = null; codes.forEach(([c, v]) => { if (c === 10) x = Number(v); else if (c === 20 && x !== null) { out.push({ x, y: Number(v) }); x = null; } }); return out; };
  const loops = [], lines = [];
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (e.type === "LWPOLYLINE") loops.push(xy(e.codes));
    else if (e.type === "POLYLINE") {
      const v = []; let j = i + 1;
      while (j < ents.length && ents[j].type === "VERTEX") { v.push(...xy(ents[j].codes)); j++; }
      loops.push(v);
    } else if (e.type === "LINE") {
      const g = c => Number((e.codes.find(a => a[0] === c) || [0, 0])[1]);
      lines.push([{ x: g(10), y: g(20) }, { x: g(11), y: g(21) }]);
    }
  }
  let pts = loops.filter(l => l.length >= 3).sort((a, b) => polyArea(b) - polyArea(a))[0];
  if (!pts && lines.length >= 3) {                       // chain separate LINEs into a loop
    const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-3;
    const rest = lines.slice(); const chain = [rest[0][0], rest[0][1]]; rest.shift();
    while (rest.length) {
      const end = chain[chain.length - 1];
      const k = rest.findIndex(s => near(s[0], end) || near(s[1], end));
      if (k < 0) break;
      const s = rest.splice(k, 1)[0];
      chain.push(near(s[0], end) ? s[1] : s[0]);
    }
    if (rest.length === 0 && near(chain[0], chain[chain.length - 1])) pts = chain;
  }
  if (!pts) throw new Error("I couldn't find a closed lot outline in that DXF file. Draw the lot as one closed polyline and try again.");
  const unit = { 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1 }[ins];
  const ext = Math.max(...pts.map(p => Math.abs(p.x)), ...pts.map(p => Math.abs(p.y)));
  let k = unit || 1, note = `Read a ${pts.length}-corner outline from the DXF file.`;
  if (!unit && ext > 3000) { k = 0.001; note += " The numbers were very large, so I assumed millimeters."; }
  else if (!unit) note += " No units were set, so I assumed meters.";
  else if (unit !== 1) note += " Units converted to meters.";
  return { pts: pts.map(p => ({ x: p.x * k, y: p.y * k })), note };
}

/* read a lot file's text; returns { pts, note } or throws an Error with a plain message */
function parseLotFile(name, raw) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["pdf", "png", "jpg", "jpeg", "gif", "webp", "bmp", "heic", "tif", "tiff"].includes(ext))
    throw new Error("I can't read pictures or PDFs reliably. Type the side lengths from the document into the boxes, or paste its technical description (the “N 45°30' E, 25.00 m” lines) below.");
  if (["dwg", "xls", "xlsx", "doc", "docx", "shp"].includes(ext))
    throw new Error(`.${ext} files can't be read here. Export the lot outline as DXF, KML, GeoJSON or CSV and upload that instead.`);
  const text = raw.replace(/^﻿/, "");
  if (ext === "dxf") return parseDXF(text);
  if (ext === "kml") return parseKML(text);
  if (ext === "json" || ext === "geojson" || /^\s*[\[{]/.test(text)) return parseLotJSON(text);
  return parseLotPlain(text);
}

/* turn a parse result into the current lot */
function importLot(res, label) {
  let p = cleanPts(res.pts);
  if (p.length < 3) throw new Error("The file has fewer than 3 distinct corners.");
  const before = p.length;
  p = dropStraightCorners(p, 0.05);
  if (p.length > 24) throw new Error(`The outline has ${before} corners. The planner handles up to 24; please simplify the outline (keep only the real corners).`);
  const note = `${label ? label + ": " : ""}${res.note}${p.length < before ? ` ${before - p.length} points on straight lines were merged.` : ""}`;
  setLot(p, 0, note, "imported");
}




/* =========================
   LOT PLAN (top view) + LOT QUESTION
========================= */

let viewMode = "plan";      // "plan" = flat lot plan, "3d" = rotatable 3D view
let lotSnap = true;
let planView = null;        // current SVG viewBox
let planDrag = null;        // corner being dragged
let lastEditId = undefined;

const isLotEditing = () => editing !== null && STEPS[editing].id === "lot";

function setViewMode(mode) {
  viewMode = mode;
  const card = $("viewerCard");
  card.classList.toggle("mode-plan", mode === "plan");
  card.classList.toggle("mode-floor", mode === "floor");
  document.querySelectorAll("#viewTabs button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  renderActiveView();
}

const renderActiveView = () => (viewMode === "plan" ? renderPlan() : viewMode === "floor" ? renderFloor() : renderHouse());

/* lot plan while answering the lot question, floor plan while planning the rooms, 3D house afterwards */
const prefMode = id => (id === "lot" ? "plan" : id === "rooms" ? "floor" : "3d");
function modeForEdit() {
  const cur = editing === null ? null : STEPS[editing].id;
  if (lastEditId !== cur && prefMode(cur) !== prefMode(lastEditId)) setViewMode(prefMode(cur));
  lastEditId = cur;
}

function fitPlanView() {
  const pts = S.lot.pts;
  const xs = pts.map(p => p.x), ys = pts.map(p => -p.y);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const w = Math.max(maxx - minx, 4), h = Math.max(maxy - miny, 4);
  const padX = Math.max(w * 0.22, 3.5), padY = Math.max(h * 0.22, 3.5);
  planView = { x: minx - padX, y: miny - padY, w: w + 2 * padX, h: h + 2 * padY };
}

function renderPlan() {
  const svg = $("planSvg");
  if (!svg) return;
  const L = S.lot, pts = L.pts, n = pts.length;
  const editingLot = isLotEditing();
  if (!planView || !planDrag) fitPlanView();
  const vb = planView;
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const rect = svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
  const ppm = rect && rect.width > 0 ? Math.min(rect.width / vb.w, rect.height / vb.h) : 15;
  const px = v => v / ppm;                                   // screen pixels -> plan meters
  const P = p => `${p.x.toFixed(3)},${(-p.y).toFixed(3)}`;
  const halo = `paint-order:stroke;stroke:#ffffff;stroke-width:${px(3).toFixed(3)}px;stroke-linejoin:round`;
  const sg = polySigned(pts) >= 0 ? 1 : -1;
  const fr = lotFrame(L);
  let h = "";

  /* grid */
  const steps = [1, 2, 5, 10, 20, 50, 100, 200];
  const gs = steps.find(v => v * ppm >= 38) || 200;
  let g = "";
  for (let x = Math.floor(vb.x / gs) * gs; x <= vb.x + vb.w; x += gs) g += `<line x1="${x}" y1="${vb.y}" x2="${x}" y2="${vb.y + vb.h}"/>`;
  for (let y = Math.floor(vb.y / gs) * gs; y <= vb.y + vb.h; y += gs) g += `<line x1="${vb.x}" y1="${y}" x2="${vb.x + vb.w}" y2="${y}"/>`;
  h += `<g stroke="#dfe5df" stroke-width="${px(1).toFixed(3)}">${g}</g>`;

  /* road strip outside the road side */
  const out = { x: -fr.nrm.x, y: -fr.nrm.y };
  const rd = [fr.a, fr.b, { x: fr.b.x + out.x * 3.2, y: fr.b.y + out.y * 3.2 }, { x: fr.a.x + out.x * 3.2, y: fr.a.y + out.y * 3.2 }];
  const rmid = { x: fr.m.x + out.x * 1.6, y: fr.m.y + out.y * 1.6 };
  let ang = Math.atan2(-(fr.b.y - fr.a.y), fr.b.x - fr.a.x) * 180 / Math.PI;
  if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
  h += `<polygon points="${rd.map(P).join(" ")}" fill="#c5ccc5" opacity="0.95"/>`;
  h += `<text x="${rmid.x.toFixed(3)}" y="${(-rmid.y).toFixed(3)}" transform="rotate(${ang.toFixed(2)} ${rmid.x.toFixed(3)} ${(-rmid.y).toFixed(3)})" text-anchor="middle" dominant-baseline="middle" fill="#46524c" font-size="${px(11).toFixed(3)}" font-weight="700" letter-spacing="${px(3).toFixed(3)}">ROAD</text>`;

  /* lot outline */
  h += `<polygon points="${pts.map(P).join(" ")}" fill="#e7efe9" stroke="#0f7b6c" stroke-width="${px(3).toFixed(3)}" stroke-linejoin="round"/>`;
  if (L.road >= 0) h += `<line x1="${fr.a.x}" y1="${-fr.a.y}" x2="${fr.b.x}" y2="${-fr.b.y}" stroke="#1f2d28" stroke-width="${px(5).toFixed(3)}" stroke-linecap="round"/>`;

  /* house footprint (while editing the lot it is shown but can't be dragged) */
  let houseInfo = "";
  if (true) {
    const pl = placeHouse(S);
    const hp = (x, t) => P(fr.toMap(pl.ox + x, pl.oy + t));
    const rc = (x, t, w, h) => [[x, t], [x + w, t], [x + w, t + h], [x, t + h]].map(([a, b]) => hp(a, b)).join(" ");
    const body = geometry(S).poly.map(q => hp(q.x, q.y)).join(" ");
    S.layout.spaces.filter(s => isOutdoor(s) && s.type !== "balcony" && !spaceInside(s)).forEach(s => {
      h += `<polygon ${editingLot ? "" : `data-house="1"`} style="cursor:${editingLot ? "default" : "move"};pointer-events:${editingLot ? "none" : "auto"}" points="${rc(s.x, s.t, s.w, s.h)}" fill="${SPACE_TYPES[s.type].color}" stroke="#b89a62" stroke-width="${px(1.5).toFixed(3)}"/>`;
      const c = fr.toMap(pl.ox + s.x + s.w / 2, pl.oy + s.t + s.h / 2);
      h += `<text x="${c.x.toFixed(3)}" y="${(-c.y).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(10).toFixed(3)}" font-weight="600" fill="#7a5b1f" style="pointer-events:none">${s.type === "garage" ? "Garage" : "Terrace"}</text>`;
    });
    const bodyC = fr.toMap(pl.ox + polyCentroid(geometry(S).poly).x, pl.oy + polyCentroid(geometry(S).poly).y);
    h += `<polygon ${editingLot ? "" : `data-house="1"`} style="cursor:${editingLot ? "default" : "move"};pointer-events:${editingLot ? "none" : "auto"}" points="${body}" fill="${pl.fits || editingLot ? "#1f2d28" : "#cf4436"}" fill-opacity="0.12" stroke="${pl.fits || editingLot ? "#1f2d28" : "#cf4436"}" stroke-width="${px(2).toFixed(3)}" ${pl.fits ? "" : `stroke-dasharray="${px(6).toFixed(2)} ${px(4).toFixed(2)}"`}/>`;
    h += `<text x="${bodyC.x.toFixed(3)}" y="${(-bodyC.y).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(12).toFixed(3)}" font-weight="700" fill="${pl.fits || editingLot ? "#1f2d28" : "#cf4436"}" style="${halo};pointer-events:none">HOUSE ${r1(geometry(S).fp)} sqm / floor</text>`;
    houseInfo = !pl.fits ? "nofit" : (pl.tight ? "" : "tight");
  }
  if (window.LotItems) h += LotItems.svg(P, fr, px, halo, editingLot);

  /* side lengths */
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const o = { x: sg * dy / len, y: -sg * dx / len };       // outward
    const off = px(i === L.road ? -17 : 17);
    const mx = (a.x + b.x) / 2 + o.x * off, my = (a.y + b.y) / 2 + o.y * off;
    h += `<text x="${mx.toFixed(3)}" y="${(-my).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(12).toFixed(3)}" font-weight="700" fill="${i === L.road ? "#1f2d28" : "#0f7b6c"}" style="${halo};pointer-events:none">${r2(len)} m</text>`;
    if (editingLot) h += `<line x1="${a.x}" y1="${-a.y}" x2="${b.x}" y2="${-b.y}" stroke="transparent" stroke-width="${px(16).toFixed(3)}" data-edge="${i}" style="cursor:pointer"><title>Tap to make this the road side</title></line>`;
  });

  /* area label */
  if (editingLot) {
    const c = polyCentroid(pts);
    h += `<text x="${c.x.toFixed(3)}" y="${(-c.y).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(15).toFixed(3)}" font-weight="800" fill="#1f2d28" style="${halo};pointer-events:none">${r1(polyArea(pts))} sqm</text>`;
  }

  /* add-corner handles and corners */
  if (editingLot && n < MAX_CORNERS) {
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % n], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      h += `<g><circle cx="${mx.toFixed(3)}" cy="${(-my).toFixed(3)}" r="${px(8).toFixed(3)}" fill="#ffffff" stroke="#0f7b6c" stroke-width="${px(1.5).toFixed(3)}" data-add="${i}" style="cursor:copy"><title>Add a corner here</title></circle>` +
        `<text x="${mx.toFixed(3)}" y="${(-my).toFixed(3)}" text-anchor="middle" dominant-baseline="central" font-size="${px(12).toFixed(3)}" font-weight="700" fill="#0f7b6c" style="pointer-events:none">+</text></g>`;
    });
  }
  pts.forEach((p, i) => {
    h += `<g><circle cx="${p.x.toFixed(3)}" cy="${(-p.y).toFixed(3)}" r="${px(editingLot ? 11 : 8).toFixed(3)}" fill="#0f7b6c" stroke="#ffffff" stroke-width="${px(2).toFixed(3)}" ${editingLot ? `data-i="${i}" style="cursor:grab"` : ""}/>` +
      `<text x="${p.x.toFixed(3)}" y="${(-p.y).toFixed(3)}" text-anchor="middle" dominant-baseline="central" font-size="${px(editingLot ? 12 : 10).toFixed(3)}" font-weight="800" fill="#ffffff" style="pointer-events:none">${cornerName(i)}</text></g>`;
  });

  /* scale bar */
  const bars = [1, 2, 5, 10, 20, 50, 100, 200];
  const bl = bars.find(v => v * ppm >= 60) || 200;
  const bx = vb.x + px(18), by = vb.y + px(26);
  h += `<g stroke="#1f2d28" stroke-width="${px(2).toFixed(3)}"><line x1="${bx}" y1="${by}" x2="${bx + bl}" y2="${by}"/><line x1="${bx}" y1="${by - px(5)}" x2="${bx}" y2="${by + px(5)}"/><line x1="${bx + bl}" y1="${by - px(5)}" x2="${bx + bl}" y2="${by + px(5)}"/></g>` +
    `<text x="${bx + bl / 2}" y="${by - px(9)}" text-anchor="middle" font-size="${px(11).toFixed(3)}" font-weight="600" fill="#1f2d28" style="${halo}">${bl} m</text>`;

  $("planContent").innerHTML = h;

  const area = polyArea(pts), per = polyPerim(pts);
  const probs = lotProblems(L);
  let leg = `<span><b>${r1(area)} sqm</b> lot</span><span>${n} sides · ${r1(per)} m around</span><span>Road side: <b>${cornerName(L.road)}–${cornerName((L.road + 1) % n)}</b></span>`;
  if (!editingLot) {
    const man = S.placement;
    leg += houseInfo === "nofit" ? `<span class="bad">⚠ The house ${man ? "sticks out of" : "doesn't fit inside"} this lot${man ? " — drag it back inside" : " with the usual setbacks"}</span>`
      : houseInfo === "tight" ? `<span class="bad">⚠ Closer to the boundary than the usual setbacks (3 m front, 1.5 m sides, 2 m rear) — check your local rules</span>`
      : `<span>${man ? "House placed by you" : "House shown with 3 m front, 1.5 m side and 2 m rear setbacks"}</span>`;
    leg += `<span><b>Drag the house</b> to place it anywhere in the lot</span>`;
    if (man) leg += `<button type="button" class="outline-btn small" data-autoplace="1">↺ Auto-place</button>`;
  }
  if (editingLot) leg += `<span>Drag the green corners · tap ＋ on a side to add a corner · tap a side to mark it as the road</span>`;
  if (probs.length) leg += `<span class="bad">⚠ ${probs[0]}</span>`;
  if (window.LotItems && !editingLot) { const lp = LotItems.problems(); if (lp.length) leg += `<span class="bad">⚠ ${lp[0]}</span>`; else if (LotItems.count()) leg += `<span><b>Drag</b> the extras to move them</span>`; }
  $("planLegend").innerHTML = leg;
  $("viewerTitle").textContent = "Your Lot & House";
  $("viewerSub").textContent = editingLot ? "Drag the corners to match your lot. The house outline follows the floor area." : `${num(S.floorArea)} sqm house on a ${r1(area)} sqm lot`;
}

function bindPlan() {
  const svg = $("planSvg");
  const toPlan = e => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: q.x, y: -q.y };
  };
  let houseDrag = null, itemDrag = false;
  svg.addEventListener("pointerdown", e => {
    const d = e.target.dataset || {};
    if (window.LotItems) {   // the extras can be moved and resized any time, also while the lot is being edited
      if (d.item !== undefined || d.lih !== undefined || d.lirot !== undefined || d.lidel !== undefined) {
        itemDrag = LotItems.down(d, lotFrame(S.lot).toLocal(toPlan(e)));
        if (itemDrag) { svg.setPointerCapture(e.pointerId); e.preventDefault(); }
        renderPlan(); LotItems.renderBox();
        return;
      }
      if (LotItems.sel()) { LotItems.deselect(); renderPlan(); }   // tapping elsewhere un-selects
    }
    if (d.house !== undefined && !isLotEditing()) {
      const pl = placeHouse(S), q = lotFrame(S.lot).toLocal(toPlan(e));
      houseDrag = { du: q.u - pl.ox, dt: q.t - pl.oy };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (!isLotEditing()) return;
    if (d.i !== undefined) {
      planDrag = { i: Number(d.i) };
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (d.add !== undefined) {
      addCorner(Number(d.add));
      lotChanged(true);
    } else if (d.edge !== undefined) {
      S.lot.road = Number(d.edge);
      lotChanged(true);
    }
  });
  svg.addEventListener("pointermove", e => {
    if (itemDrag) { if (LotItems.move(lotFrame(S.lot).toLocal(toPlan(e)))) renderPlan(); return; }
    if (houseDrag) {
      const q = lotFrame(S.lot).toLocal(toPlan(e));
      const want = { ox: Math.round((q.u - houseDrag.du) / 0.25) * 0.25, oy: Math.round((q.t - houseDrag.dt) / 0.25) * 0.25 };
      /* the house can't leave the lot: slide it to the nearest spot that still fits */
      if (houseFitsAt(want.ox, want.oy, false)) S.placement = want;
      else {
        const prev = S.placement || want;
        let best = null, bd = 1e9;
        for (let r = 0.25; r <= 3 && !best; r += 0.25) {
          for (let a = 0; a < 24; a++) {
            const c = { ox: want.ox + r * Math.cos(a * Math.PI / 12), oy: want.oy + r * Math.sin(a * Math.PI / 12) };
            const d = Math.hypot(c.ox - prev.ox, c.oy - prev.oy) * 0.3 + r;
            if (d < bd && houseFitsAt(c.ox, c.oy, false)) { best = c; bd = d; }
          }
        }
        if (best) S.placement = best;
      }
      renderPlan();
      return;
    }
    if (!planDrag) return;
    let q = toPlan(e);
    if (lotSnap) q = { x: Math.round(q.x / 0.25) * 0.25, y: Math.round(q.y / 0.25) * 0.25 };
    S.lot.pts[planDrag.i] = q;
    S.lot.lens = measureLot(S.lot.pts);
    S.lot.err = ""; S.lot.name = "";
    syncLot();
    updateLotPanelValues();
    renderPlan();
    renderSidebar();
  });
  const end = () => {
    if (itemDrag) { itemDrag = false; LotItems.up(); LotItems.renderBox(); liveUpdate(); return; }
    if (houseDrag) { houseDrag = null; liveUpdate(); return; }
    if (!planDrag) return;
    planDrag = null;
    lotChanged(false);
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  $("planLegend").addEventListener("click", e => {
    if (e.target.dataset && e.target.dataset.autoplace) { S.placement = null; liveUpdate(); }
  });
}

/* ---------- lot question (side panel under the plan) ---------- */

function lotPanelHTML() {
  const presets = Object.keys(LOT_PRESETS).map(k => `<button type="button" class="opt" data-preset="${k}">${LOT_PRESETS[k].name}</button>`).join("");
  return `<div class="lot-panel">
    <div class="lot-stats" id="lotStats"></div>

    <div class="lot-area-main">
      <label class="field"><span>Total lot area <small>(from your title, if you have it)</small></span>
        <div class="input-suffix"><input id="lotAreaIn" type="number" min="5" step="1"><em>sqm</em></div></label>
      <div class="chips">${[100, 150, 200, 300, 500, 1000].map(v => `<button type="button" class="opt" data-lotarea="${v}">${v} sqm</button>`).join("")}</div>
      <p class="hint">Type your lot size here, or set the shape and sides below and the area is worked out for you. Changing the area resizes the whole shape in proportion.</p>
    </div>

    <h4 class="lot-h">1 · Start with the closest shape</h4>
    <div class="opts" id="lotPresets">${presets}</div>

    <h4 class="lot-h">2 · Length of every side <small>in meters. If you only know them roughly, drag the corners in the plan above.</small></h4>
    <div class="table-wrap"><table class="data-table lot-table">
      <thead><tr><th>Side</th><th>Length (m)</th><th>Faces the road</th><th></th></tr></thead>
      <tbody id="lotSides"></tbody>
    </table></div>
    <details class="lot-more" id="lotDiagBox"><summary>Diagonals <small>— measure straight between two corners to lock the exact shape (4+ sided lots)</small></summary>
      <div class="table-wrap"><table class="data-table lot-table"><tbody id="lotDiags"></tbody></table></div>
    </details>
    <div class="lot-tools">
      <button type="button" class="outline-btn" id="lotAddBtn">＋ Add a corner</button>
      <label class="snap"><input type="checkbox" id="lotSnapCb" ${lotSnap ? "checked" : ""}> Snap dragging to 0.25 m</label>
    </div>
    <p class="hint" id="lotMsg"></p>

    <details class="lot-more lot-extra"><summary>More lot options: upload a lot file, paste a title description</summary>

    <h4 class="lot-h">3 · Do you have a file or description of the lot?</h4>
    <div class="lot-import">
      <label class="outline-btn filebtn">📎 Upload lot file
        <input type="file" id="lotFile" accept=".csv,.txt,.tsv,.json,.geojson,.kml,.dxf,.pdf,.png,.jpg,.jpeg,.dwg" hidden>
      </label>
      <span class="hint">CSV · TXT · JSON · GeoJSON · KML · DXF</span>
    </div>
    <details class="lot-more"><summary>Or paste the technical description from the title, or corner coordinates</summary>
      <textarea id="lotPaste" rows="5" placeholder="Beginning at point 1; thence N 45°30' E, 25.00 m; thence S 44°30' E, 20.00 m; thence S 45°30' W, 25.00 m; thence N 44°30' W, 20.00 m."></textarea>
      <button type="button" class="outline-btn" id="lotPasteBtn">Build my lot from this text</button>
    </details>
    <details class="lot-more"><summary>Which file formats can I use?</summary>
      <div class="formats">
        <p><b>Corner coordinates (CSV / TXT)</b> in meters, one corner per line — or latitude,longitude:</p>
        <pre>x,y
0,0
12.5,0
14,18.2
0,16</pre>
        <p><b>Bearings and distances</b> (the technical description in a land title), one line per side:</p>
        <pre>N 45°30' E  25.00
S 44°30' E  20.00
S 45°30' W  25.00
N 44°30' W  20.00</pre>
        <p><b>Side lengths only</b>: 3 numbers make a triangle. For 4 sides, add 1 diagonal (5 numbers); for 5 sides add 2 diagonals (7 numbers).</p>
        <p><b>JSON / GeoJSON / KML / DXF</b>: a polygon or closed polyline of the lot outline. DXF units are read from the file (millimeters are detected).</p>
        <p>Pictures and PDFs can't be read automatically. Type the lengths from them into the boxes above.</p>
      </div>
    </details>
    <p class="hint" id="lotImportMsg"></p>
    </details>
  </div>`;
}

function renderLotTable() {
  const L = S.lot, n = L.pts.length;
  $("lotSides").innerHTML = L.lens.sides.map((len, j) => `
    <tr><td><strong>${cornerName(j)} → ${cornerName((j + 1) % n)}</strong></td>
    <td><input type="number" step="0.01" min="0.1" data-side="${j}" value="${r2(len)}"></td>
    <td><label class="roadpick"><input type="radio" name="lotRoad" data-road="${j}" ${L.road === j ? "checked" : ""}> Road side</label></td>
    <td><button type="button" class="x" data-rm="${j}" title="Remove corner ${cornerName(j)}" ${n <= 3 ? "disabled" : ""}>✕</button></td></tr>`).join("");
  $("lotDiags").innerHTML = L.lens.diags.map((len, k) => `
    <tr><td><strong>${cornerName(0)} ↔ ${cornerName(k + 2)}</strong></td>
    <td><input type="number" step="0.01" min="0.1" data-diag="${k}" value="${r2(len)}"></td></tr>`).join("");
  const box = $("lotDiagBox");
  box.style.display = n > 3 ? "" : "none";
  if (box.setAttribute && n <= 6) box.setAttribute("open", "");
}

function updateLotPanelValues() {
  if (!$("lotStats")) return;
  const L = S.lot, n = L.pts.length, active = document.activeElement;
  const setVal = (sel, val) => { const el = document.querySelector(sel); if (el && el !== active) el.value = val; };
  L.lens.sides.forEach((v, j) => setVal(`[data-side="${j}"]`, r2(v)));
  L.lens.diags.forEach((v, k) => setVal(`[data-diag="${k}"]`, r2(v)));
  if ($("lotAreaIn") !== active) $("lotAreaIn").value = r2(polyArea(L.pts));
  $("lotStats").innerHTML = `<span><b>${r1(polyArea(L.pts))}</b> sqm</span><span><b>${n}</b> sides</span><span><b>${r1(polyPerim(L.pts))}</b> m around</span>` +
    (L.name && L.name !== "imported" ? `<span>${L.name}</span>` : "");
  const probs = lotProblems(L);
  const msg = $("lotMsg");
  msg.textContent = probs.length ? "⚠ " + probs.join(" ") : (n > 3 ? "Side lengths alone don't fix a 4+ sided shape — drag the corners, or also enter the diagonals, to match your lot exactly." : "With 3 sides the triangle is fixed exactly by the lengths.");
  msg.className = "hint" + (probs.length ? " warn" : "");
  const im = $("lotImportMsg");
  if (L.note) { im.textContent = L.note; im.className = "hint"; }
}

function applyLens() {
  const r = solveFan(S.lot.lens, S.lot.pts);
  if (r.error) { S.lot.err = r.error; return; }
  S.lot.err = ""; S.lot.pts = r.pts; S.lot.name = "";
  syncLot();
}

function lotChanged(rebuildTable) {
  syncLot();
  if (rebuildTable && $("lotSides")) renderLotTable();
  updateLotPanelValues();
  fitPlanView();
  renderPlan();
  renderSidebar();
  renderResults();
}

function lotValid() {
  return S.lot.pts.length >= 3 && lotProblems(S.lot).length === 0;
}

function bindLot() {
  renderLotTable();
  updateLotPanelValues();

  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    setLot(presetPts(b.dataset.preset, Math.max(S.lotArea, 30)), 0, "", LOT_PRESETS[b.dataset.preset].name);
    lotChanged(true);
  }));

  $("lotSides").addEventListener("input", e => {
    const j = e.target.dataset.side;
    if (j === undefined) return;
    const v = parseFloat(e.target.value);
    S.lot.lens.sides[Number(j)] = v > 0 ? v : 0;
    applyLens();
    lotChanged(false);
  });
  $("lotSides").addEventListener("change", e => {
    if (e.target.dataset.road === undefined) return;
    S.lot.road = Number(e.target.dataset.road);
    lotChanged(true);
  });
  $("lotSides").addEventListener("click", e => {
    const b = e.target.closest ? e.target.closest("button") : null;
    if (!b || b.dataset.rm === undefined) return;
    removeCorner(Number(b.dataset.rm));
    lotChanged(true);
  });
  $("lotDiags").addEventListener("input", e => {
    const k = e.target.dataset.diag;
    if (k === undefined) return;
    const v = parseFloat(e.target.value);
    S.lot.lens.diags[Number(k)] = v > 0 ? v : 0;
    applyLens();
    lotChanged(false);
  });

  $("lotAddBtn").addEventListener("click", () => {
    const sides = S.lot.lens.sides;
    addCorner(sides.indexOf(Math.max(...sides)));
    lotChanged(true);
  });
  $("lotSnapCb").addEventListener("change", e => { lotSnap = e.target.checked; });
  document.querySelectorAll("[data-lotarea]").forEach(b => b.addEventListener("click", () => { scaleLotToArea(Number(b.dataset.lotarea)); lotChanged(false); $("lotAreaIn").value = b.dataset.lotarea; }));
  $("lotAreaIn").addEventListener("input", e => {
    const v = parseFloat(e.target.value);
    if (v >= 5) { scaleLotToArea(v); lotChanged(false); }
  });

  const tryImport = (name, text, label) => {
    const im = $("lotImportMsg");
    try {
      importLot(parseLotFile(name, text), label);
      lotChanged(true);
    } catch (err) {
      im.textContent = "⚠ " + err.message;
      im.className = "hint warn";
    }
  };
  $("lotFile").addEventListener("change", e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (["pdf", "png", "jpg", "jpeg", "dwg"].includes(ext)) { tryImport(f.name, "", f.name); return; }
    const rd = new FileReader();
    rd.onload = () => tryImport(f.name, String(rd.result), f.name);
    rd.onerror = () => { $("lotImportMsg").textContent = "⚠ I couldn't open that file."; $("lotImportMsg").className = "hint warn"; };
    rd.readAsText(f);
    e.target.value = "";
  });
  $("lotPasteBtn").addEventListener("click", () => tryImport("pasted.txt", $("lotPaste").value, "Pasted text"));
}

/* start with a 10 m × 20 m rectangle, road at the bottom */
setLot(presetPts("rect", 200), 0, "", "Rectangle");



/* =========================
   FLOOR LAYOUT (rooms placed on a floor plan)
   House-local frame: x runs left→right along the front wall, t runs from the front wall (t = 0) toward the rear.
   Rooms live inside 0..W × 0..D. A garage, terrace or balcony may sit outside (t < 0 = in front, x < 0 or x > W = beside).
========================= */

const SPACE_TYPES = {
  living:  { name: "Living room",      color: "#fde68a" },
  kitchen: { name: "Kitchen & dining", color: "#fdba74" },
  dining:  { name: "Dining room",      color: "#fed7aa" },
  master:  { name: "Master bedroom",   color: "#c4b5fd" },
  bed:     { name: "Bedroom",          color: "#bfdbfe" },
  cr:      { name: "Common CR",        color: "#99f6e4" },
  other:   { name: "Other room",       color: "#e5e7eb" },
  garage:  { name: "Garage",           color: "#d1d5db", outdoor: true },
  terrace: { name: "Terrace",          color: "#e7d5b8", outdoor: true },
  balcony: { name: "Balcony",          color: "#bbf7d0", outdoor: true },
  stairs:  { name: "Stairs",           color: "#d6c7a1" }
};
/* kinds of room the owner can choose, per room type: they change the furniture, the plan label and sometimes the cost */
const ROOM_KINDS = {
  bed:     [["std", "Standard"], ["boy", "Boy's room · PC desk", "🖥"], ["girl", "Girl's room · vanity", "💄"], ["kid", "Kid's room · bunk bed & play mat", "🧸"], ["study", "Bedroom + study desk", "📚"], ["guest", "Guest room", "🛎"]],
  master:  [["std", "Standard"], ["closet", "With walk-in closet", "👗"], ["work", "With work corner", "💻"], ["lounge", "With sitting area", "🛋"]],
  living:  [["std", "Standard · sofa & TV"], ["family", "Family lounge · big sofa", "📺"], ["formal", "Formal sitting · two sofas", "🪑"], ["office", "With home-office corner", "💻"]],
  kitchen: [["std", "Standard"], ["island", "Island kitchen", "🍳"], ["galley", "Galley · two counters", "🍳"], ["bar", "Breakfast bar", "☕"]],
  dining:  [["four", "4-seater"], ["six", "6-seater", "🍽"], ["bench", "Bench & breakfast table", "🍽"]],
  cr:      [["shower", "Shower"], ["tub", "With bathtub", "🛁"]]
};
/* a room can have several kinds at once (e.g. walk-in closet and work corner); the first kind in each list is the plain "standard" one */
const kindSet = s => (Array.isArray(s.styles) ? s.styles : (s.style && s.style !== "std" ? [s.style] : [])).filter(k => (ROOM_KINDS[s.type] || []).some(o => o[0] === k) && k !== (ROOM_KINDS[s.type][0] || [])[0]);
const toggleKind = (cur, k, first) => k === first ? [] : cur.includes(k) ? cur.filter(x => x !== k) : [...cur, k];
const hasEnsuite = s => s.type === "bed" && !!s.ensuite;
const mT = R => (R.masterT == null ? R.master : R.masterT);   // masters that have their own T&B
const kindIcons = s => kindSet(s).map(k => (ROOM_KINDS[s.type].find(o => o[0] === k) || [])[2] || "").join("") + (hasEnsuite(s) ? "🚿" : "");
/* extra cost of the choices (key, name, unit price) */
const KIND_COSTS = { "bed:girl": ["room_vanity", "Built-in vanity table with mirror", 18000], "master:closet": ["room_closet", "Walk-in closet (shelving and doors)", 30000], "kitchen:island": ["room_island", "Kitchen island counter", 35000], "kitchen:galley": ["room_galley", "Second kitchen counter (galley)", 22000], "kitchen:bar": ["room_bar", "Breakfast bar counter", 12000], "cr:tub": ["room_tub", "Bathtub", 25000], "bed:kid": ["room_bunk", "Built-in bunk bed", 16000] };
const ENSUITE_COST = ["room_ensuite", "Own CR inside the bedroom (toilet, lavatory, shower, tiles, partition)", 65000];
function roomChoiceCats(st, item) {
  const sp = (st.layout && st.layout.spaces) || [], out = [], cnt = {};
  sp.forEach(x => { kindSet(x).forEach(k => { const c = KIND_COSTS[x.type + ":" + k]; if (c) cnt[c[0]] = (cnt[c[0]] || 0) + 1; }); if (hasEnsuite(x)) cnt[ENSUITE_COST[0]] = (cnt[ENSUITE_COST[0]] || 0) + 1; });
  [...Object.values(KIND_COSTS), ENSUITE_COST].forEach(c => { if (cnt[c[0]]) out.push(item(c[0], c[1], cnt[c[0]], "pc")); });
  return out.length ? [{ name: "Room choices", icon: "🛏", items: out }] : [];
}
const OTHER_ROOMS = [["Store / shop", 12], ["Study / office", 8], ["Laundry", 3.5], ["Storage", 3], ["Pantry", 3], ["Prayer room", 4], ["Maid's room", 6], ["Home gym", 10], ["Family / media room", 14]];
const CAR_W = [0, 3, 5.6], CAR_D = 5;          // garage footprint per number of cars (15 / 28 sqm)
/* a store / shop belongs on the ground floor, at the front (customers walk in from the road) */
const isShop = s => s.type === "other" && /\b(store|shop)\b/i.test(s.name || "");
const hasGroundShop = (except) => S.layout.spaces.some(o => o !== except && isShop(o) && o.fl === 0);
const upperShop = s => isShop(s) && s.upperOk && hasGroundShop(s);   // an extra store upstairs the person agreed to
/* ---- staircase: 2+ floors always get one, in the same spot on every floor, in the rear corner (the hall leads to it) ---- */
const STAIR_TYPES = {
  straight: { name: "Straight",             w: 1.2, d: 3.4, note: "One straight run. Simplest and cheapest, but needs a long, narrow space." },
  L:        { name: "L-shaped",             w: 2.2, d: 2.6, note: "Turns a corner halfway on a small landing. Fits in a corner and feels open." },
  U:        { name: "U-shaped (switchback)", w: 2.3, d: 2.9, note: "Two runs side by side with a landing. Compact length, a bit wider." },
  spiral:   { name: "Spiral",               w: 1.8, d: 1.8, note: "Smallest footprint, steel or concrete. Steep, hard for carrying furniture." }
};
/* size of the staircase for the chosen type (turned 90° when the owner rotated it) */
function stairDims() {
  const L = S.layout || {}, t = STAIR_TYPES[L.stairType] || STAIR_TYPES.straight;
  return L.stairRot && t.w !== t.d ? { w: t.d, d: t.w } : { w: t.w, d: t.d };
}
const isStair = s => s.type === "stairs";
/* walls between rooms: only rooms that need privacy are closed off by default; living, kitchen, dining, store etc. stay open unless the person asks */
const isPrivate = s => ["master", "bed", "cr", "garage"].includes(s.type) || /maid|guest|prayer|bath|toilet|\bcr\b|bedroom/i.test(s.name || "");
const isWalled = s => !isStair(s) && (s.walled === true || (s.walled !== false && isPrivate(s)));
function stairRect() {
  const g = geometry(S), d = stairDims(), w = Math.min(d.w, g.w), h = Math.min(d.d, g.d), pos = S.layout && S.layout.stairPos;
  const clamp = (v, hi) => Math.min(Math.max(v, 0), Math.max(0, hi));
  return pos ? { x: clamp(pos.x, g.w - w), t: clamp(pos.t, g.d - h), w, h } : { x: Math.max(0, g.w - w), t: Math.max(0, g.d - h), w, h };   // default: the rear corner
}
/* returns true when stairs were added (so the rooms must make way) */
/* stairs only exist when the house has 2 or more floors, and never on a floor that isn't there */
const wantStairs = () => S.floors > 1 && !(S.layout && S.layout.noStairs);   // false when the owner took the staircase out
function pruneStairs() {
  const L = S.layout; if (!L || !L.spaces) return;
  if (S.floors <= 1 && (L.noStairs || L.stairAsked || L.stairPos)) { L.noStairs = false; L.stairAsked = false; L.stairPos = null; L.stairLocked = false; }   // a new multi-floor house starts fresh
  const keep = L.spaces.filter(s => !isStair(s) || (wantStairs() && s.fl < S.floors));
  if (keep.length !== L.spaces.length) L.spaces = keep;
}
function ensureStairs() {
  const L = S.layout, F = S.floors;
  const before = L.spaces.length;
  L.spaces = L.spaces.filter(s => !isStair(s) || (wantStairs() && s.fl < F));
  let added = false;
  if (wantStairs()) {
    const r = stairRect();
    for (let f = 0; f < F; f++) {
      const have = L.spaces.find(s => isStair(s) && s.fl === f);
      if (have) { Object.assign(have, r, { locked: !!L.stairLocked }); continue; }
      const sp = mkSpace("stairs"); Object.assign(sp, r, { fl: f, locked: !!L.stairLocked }); L.spaces.push(sp); added = true;
    }
  }
  return added || L.spaces.length !== before;
}
const FRONT_TYPES = ["living", "kitchen", "dining", "garage"];
const REAR_RANK = { master: 0, cr: 1, bed: 2, other: 3 };

let layFloor = 0, laySel = null, layDrag = null, layView = null, layNote = "";

const spaceMinArea = type => ({ living: ROOM_MIN.living, kitchen: ROOM_MIN.kitchen, dining: 8, master: ROOM_MIN.master + ROOM_MIN.masterTB, bed: ROOM_MIN.bed, cr: ROOM_MIN.cr, other: 4 }[type] || 4);
const isOutdoor = s => !!SPACE_TYPES[s.type].outdoor;
const spaceInside = s => { const g = geometry(S); return clipArea(g.poly, s.x, s.t, s.w, s.h) >= 0.9 * s.w * s.h; };
const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.t + a.h, b.t + b.h) - Math.max(a.t, b.t));
const roundTo = (v, q) => Math.round(v / q) * q;
const layoutFootprint = () => { const g = geometry(S); return { W: g.w, D: g.d, F: S.floors }; };

function mkSpace(type, o) {
  o = o || {};
  const sp = { id: "s" + (S.layout.nextId++), type, name: o.name || SPACE_TYPES[type].name, x: 0, t: 0, w: 3, h: 3, fl: 0 };
  const g = geometry(S);
  if (type === "garage") { sp.cars = o.cars || 1; sp.w = CAR_W[sp.cars]; sp.h = CAR_D; sp.pos = o.pos || "right"; }
  else if (type === "terrace") { const d = dims(o.area || 12, g.w); sp.w = d.w; sp.h = d.d; }
  else if (type === "balcony") { const d = dims(o.area || 6, g.w); sp.w = d.w; sp.h = d.d; sp.fl = 1; }
  else { const a = o.area || spaceMinArea(type) * 1.1, w = Math.sqrt(a * 1.2); sp.w = w; sp.h = a / w; }
  return sp;
}

/* ---- sample layout: slice each floor into rooms, front rooms first ---- */
function findSplit(poly, x, t, w, h, alongX, frac) {
  const total = clipArea(poly, x, t, w, h), len = alongX ? w : h;
  if (total < 0.3) return len * frac;
  let lo = 0, hi = len;
  for (let i = 0; i < 20; i++) {
    const m = (lo + hi) / 2, a = alongX ? clipArea(poly, x, t, m, h) : clipArea(poly, x, t, w, m);
    if (a / total < frac) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

function sliceRects(items, x, t, w, h, out, poly) {
  if (!items.length) return;
  if (items.length === 1) { out.push([items[0].sp, x, t, w, h]); return; }
  const tot = items.reduce((a, i) => a + i.a, 0);
  let acc = 0, k = 1, best = 1e9;
  for (let i = 1; i < items.length; i++) {
    acc += items[i - 1].a;
    const dl = Math.abs(acc - tot / 2);
    if (dl < best) { best = dl; k = i; }
  }
  const left = items.slice(0, k), right = items.slice(k);
  const f = left.reduce((a, i) => a + i.a, 0) / tot;
  if (w >= h) { const sw = findSplit(poly, x, t, w, h, true, f); sliceRects(left, x, t, sw, h, out, poly); sliceRects(right, x + sw, t, w - sw, h, out, poly); }
  else { const sh = findSplit(poly, x, t, w, h, false, f); sliceRects(left, x, t, w, sh, out, poly); sliceRects(right, x, t + sh, w, h - sh, out, poly); }
}

function autoLayoutCore() {
  ensureStairs();
  const L = S.layout, g = geometry(S), W = g.w, D = g.d, F = S.floors, poly = g.poly;
  if (!(S.layout.stairLocked)) S.layout.stairPos = null;   // a fresh arrangement puts the stairs back in the corner, unless they are locked
  const SW = wantStairs() ? stairDims().w : 0, SDp = wantStairs() ? stairDims().d : 0;
  const rooms = L.spaces.filter(s => !isStair(s) && (!isOutdoor(s) || (s.type === "garage" && s.pos === "inside")));
  const wt = s => (s.type === "garage" ? s.w * s.h : Math.max(spaceMinArea(s.type), 5.5));   // small rooms get a floor weight so they never become slivers
  const per = Array.from({ length: F }, () => []);
  const fa = new Array(F).fill(0);
  const put = (s, f) => { s.fl = f; per[f].push(s); fa[f] += wt(s); };

  rooms.filter(s => isShop(s) && !upperShop(s)).forEach(s => put(s, 0));
  rooms.filter(s => FRONT_TYPES.includes(s.type)).forEach(s => put(s, 0));
  const rest = rooms.filter(s => !FRONT_TYPES.includes(s.type) && !(isShop(s) && !upperShop(s))).sort((a, b) => (a.type === "cr" ? -1 : 0) - (b.type === "cr" ? -1 : 0) || REAR_RANK[a.type] - REAR_RANK[b.type]);
  let firstCr = true;
  rest.forEach(s => {
    let cands = [...Array(F).keys()];
    if (F > 1 && s.type === "master") cands = cands.filter(f => f > 0);
    if (F > 1 && upperShop(s)) cands = cands.filter(f => f > 0);
    if (F > 1 && s.type === "cr" && firstCr) { firstCr = false; cands = [0]; }
    put(s, cands.reduce((b, f) => (fa[f] < fa[b] ? f : b), cands[0]));
  });

  per.forEach(list => {
    const isFront = s => FRONT_TYPES.includes(s.type) || (isShop(s) && !upperShop(s));
    const fr = s => (isShop(s) ? -1 : FRONT_TYPES.indexOf(s.type));
    const front = list.filter(isFront).sort((a, b) => fr(a) - fr(b));
    const rear = list.filter(s => !isFront(s)).sort((a, b) => REAR_RANK[a.type] - REAR_RANK[b.type]);
    const fa2 = front.reduce((a, s) => a + wt(s), 0), ra = rear.reduce((a, s) => a + wt(s), 0);
    const out = [];
    const it = a => a.map(s => ({ sp: s, a: wt(s) }));
    const share = fa2 / Math.max(fa2 + ra, 0.01);
    const hf0 = front.length && rear.length && share > 0.22 && share < 0.78 ? findSplit(poly, 0, 0, W, D, false, fa2 / (fa2 + ra)) : 0;
    if (hf0 && D - hf0 >= SDp + 0.6) {   // front rooms run the full width; the stairs tuck into the rear corner
      sliceRects(it(front), 0, 0, W, hf0, out, poly);
      sliceRects(it(rear), 0, hf0, W - SW, D - hf0, out, poly);
    } else sliceRects(it(front.concat(rear)), 0, 0, W - SW, D, out, poly);
    out.forEach(([s, x, t, w, h]) => {   // round the edges, not the sizes, so neighbours share exact edges
      const x1 = roundTo(x, 0.05), t1 = roundTo(t, 0.05);
      Object.assign(s, { x: x1, t: t1, w: roundTo(x + w, 0.05) - x1, h: roundTo(t + h, 0.05) - t1 });
    });
  });
  const sr = stairRect();
  L.spaces.filter(isStair).forEach(s => Object.assign(s, sr));
  carveHalls();
  L.custom = false;
}

/* ---- walkway: rooms shouldn't be wall-to-wall, people need a hall to reach every door ----
   finds the horizontal seam where one row of rooms meets another and opens a corridor there */
const HALL_W = 1.0;
function carveHall(fl) {
  const g = geometry(S), W = g.w, D = g.d;
  const rs = S.layout.spaces.filter(s => s.fl === fl && isRoomLike(s));
  if (rs.length < 3) return false;
  const near = (a, b) => Math.abs(a - b) < 0.08;
  let best = null;
  [["t", "h", "x", "w", D, W], ["x", "w", "t", "h", W, D]].forEach(([p, ps, q, qs, Lp, Lq], ax) => {
    [...new Set(rs.map(s => roundTo(s[p] + s[ps], 0.05)))].filter(v => v > 1.5 && v < Lp - 1.5).forEach(v => {
      const a = rs.filter(s => near(s[p] + s[ps], v)), b = rs.filter(s => near(s[p], v));
      if (!a.length || !b.length) return;
      const cov = list => list.reduce((t, s) => t + s[qs], 0) / Lq;
      const sc = Math.min(cov(a), cov(b), 1) - ax * 0.05;   // a front-to-back hall only if a sideways one doesn't fit
      if (cov(a) >= 0.55 && cov(b) >= 0.55 && (!best || sc > best.sc)) best = { p, ps, a, b, sc };
    });
  });
  if (!best) return false;
  const capA = Math.min(...best.a.map(s => s[best.ps])) - 1.9, capB = Math.min(...best.b.map(s => s[best.ps])) - 1.9;
  const hall = Math.min(HALL_W, capA + capB);
  if (hall < 0.7 || capA < 0 || capB < 0) return false;
  let la = Math.min(capA, hall / 2), lb = hall - la;
  if (lb > capB) { lb = capB; la = hall - lb; }
  best.a.forEach(s => { if (!s.locked) s[best.ps] = roundTo(s[best.ps] - la, 0.05); });
  best.b.forEach(s => { if (!s.locked) { s[best.p] = roundTo(s[best.p] + lb, 0.05); s[best.ps] = roundTo(s[best.ps] - lb, 0.05); } });
  return true;
}
const carveHalls = () => { for (let f = 0; f < S.floors; f++) carveHall(f); };

/* garage / terrace / balcony go around the house */
function placeOutdoor(only) {
  const L = S.layout, g = geometry(S), W = g.w;
  const find = k => L.spaces.find(s => s.type === k);
  const gar = find("garage"), ter = find("terrace"), bal = find("balcony");
  const go = s => !only || only === s;
  if (gar && gar.pos !== "inside" && go(gar)) {
    gar.fl = 0; gar.w = CAR_W[gar.cars]; gar.h = CAR_D;
    if (gar.pos === "left") { gar.x = -gar.w; gar.t = 0; }
    else if (gar.pos === "front") { gar.x = Math.max(0, W - gar.w); gar.t = -gar.h; }
    else { gar.x = W; gar.t = 0; }
  }
  if (ter && go(ter)) {
    const area = ter.w * ter.h, d = dims(area, W);
    let w = d.w, h = d.d, x = (W - w) / 2;
    if (gar && gar.pos === "front") { x = 0; if (w > W - gar.w - 0.2) { w = Math.max(2, W - gar.w - 0.2); h = area / w; } }
    Object.assign(ter, { fl: 0, x, t: -h, w, h });
  }
  if (bal && go(bal)) {
    const area = bal.w * bal.h;
    if (ter) Object.assign(bal, { fl: 1, x: ter.x, t: ter.t, w: ter.w, h: ter.h });
    else { const d = dims(area, W); Object.assign(bal, { fl: 1, x: (gar && gar.pos === "front") ? 0 : (W - d.w) / 2, t: -d.d, w: d.w, h: d.d }); }
  }
}

function placeFree(sp) {
  const g = geometry(S), W = g.w, D = g.d, L = S.layout;
  if (isOutdoor(sp) && !(sp.type === "garage" && sp.pos === "inside")) { placeOutdoor(sp); return; }
  const same = L.spaces.filter(s => s !== sp && s.fl === sp.fl && !isOutdoor(s) || (s !== sp && s.fl === sp.fl && s.type === "garage" && spaceInside(s)));
  sp.w = Math.min(sp.w, W); sp.h = Math.min(sp.h, D);
  for (let t = 0; t <= D - sp.h + 1e-6; t += 0.5)
    for (let x = 0; x <= W - sp.w + 1e-6; x += 0.5) {
      const cand = { x, t, w: sp.w, h: sp.h };
      if (same.every(s => overlapArea(cand, s) < 0.05)) { sp.x = x; sp.t = t; return; }
    }
  sp.x = 0; sp.t = 0;   // nowhere free: overlaps, and the plan says so
}

/* locked rooms stay exactly where they are; the others arrange themselves around them */
function autoLayout() {
  const locked = S.layout.spaces.filter(s => s.locked).map(s => [s, s.x, s.t, s.w, s.h, s.fl, s.pos]);
  autoLayoutCore();
  if (locked.length) {
    locked.forEach(([s, x, t, w, h, fl, pos]) => { s.x = x; s.t = t; s.w = w; s.h = h; s.fl = fl; if (pos) s.pos = pos; });
    resolveRooms(null);
  }
}

/* ---- keep rooms from overlapping or leaving the house: the other rooms move out of the way ---- */
const isRoomLike = s => !isOutdoor(s) || (s.type === "garage" && s.pos === "inside");

const isFixed = s => s.locked || isStair(s);
function resolveRooms(pin) {
  const g = geometry(S), W = g.w, D = g.d, poly = g.poly, cen = polyCentroid(poly);
  const floors = pin ? [pin.fl] : [...Array(S.floors).keys()];
  const MIN = 1.4;
  floors.forEach(f => {
    const rs = S.layout.spaces.filter(s => s.fl === f && isRoomLike(s));
    const free = rs.filter(s => !isFixed(s));
    const settle = s => {
      if (isFixed(s)) return;
      s.w = Math.min(Math.max(s.w, MIN), W); s.h = Math.min(Math.max(s.h, MIN), D);
      for (let k = 0; k < 40; k++) {   // keep most of the room inside the walls
        s.x = Math.min(Math.max(s.x, 0), W - s.w); s.t = Math.min(Math.max(s.t, 0), D - s.h);
        if (clipArea(poly, s.x, s.t, s.w, s.h) >= 0.7 * s.w * s.h) break;
        s.x += (cen.x - (s.x + s.w / 2)) * 0.1; s.t += (cen.y - (s.t + s.h / 2)) * 0.1;
      }
    };
    if (pin && pin.fl === f) {   // a room can't take the space the other rooms need
      const others = rs.filter(s => s !== pin).reduce((a, s) => isFixed(s) ? a + s.w * s.h : a, 0) + free.filter(s => s !== pin).reduce((a, s) => a + Math.max(spaceMinArea(s), 4) * 1.1, 0);
      const cap = Math.max(spaceMinArea(pin), Math.min(polyArea(poly) * 0.6, polyArea(poly) * 0.92 - others));
      if (pin.w * pin.h > cap) { const k = Math.sqrt(cap / (pin.w * pin.h)); pin.w = Math.max(MIN, pin.w * k); pin.h = Math.max(MIN, pin.h * k); }
    }
    free.forEach(settle);
    const ov = (a, b) => ({ x: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), y: Math.min(a.t + a.h, b.t + b.h) - Math.max(a.t, b.t) });
    const clash = (s, list) => list.some(o => { const q = ov(s, o); return q.x > 0.02 && q.y > 0.02 && q.x * q.y > 0.12; });
    const inside = s => s.x >= -0.01 && s.t >= -0.01 && s.x + s.w <= W + 0.01 && s.t + s.h <= D + 0.01 && clipArea(poly, s.x, s.t, s.w, s.h) >= 0.85 * s.w * s.h;
    /* the dragged room stays; every other room keeps its place if it can, otherwise moves to the nearest free spot (smaller if the floor is full) */
    const orig = free.map(s => [s, s.x, s.t, s.w, s.h]);
    for (let attempt = 0; attempt < 8; attempt++) {
    let failed = false;
    orig.forEach(([s, x, t, w, h]) => { if (s !== pin) { s.x = x; s.t = t; s.w = w; s.h = h; } });
    const placed = rs.filter(s => isFixed(s) && s !== pin).concat(pin && pin.fl === f ? [pin] : []);
    free.filter(s => s !== pin).sort((p, q) => q.w * q.h - p.w * p.h).forEach(s => {
      if (!clash(s, placed) && clipArea(poly, s.x, s.t, s.w, s.h) >= 0.7 * s.w * s.h) { placed.push(s); return; }
      const cx = s.x + s.w / 2, cy = s.t + s.h / 2, w0 = s.w, h0 = s.h;
      for (const sc of [1, 0.85, 0.7, 0.58, 0.48, 0.4]) {
        const w = Math.max(MIN, w0 * sc), h = Math.max(MIN, h0 * sc);
        let best = null, bd = 1e9;
        for (let x = 0; x <= W - w + 1e-6; x += 0.5) for (let t = 0; t <= D - h + 1e-6; t += 0.5) {
          const d = Math.hypot(x + w / 2 - cx, t + h / 2 - cy);
          if (d >= bd) continue;
          const c = { x, t, w, h };
          if (clash(c, placed) || clipArea(poly, x, t, w, h) < 0.85 * w * h) continue;
          best = c; bd = d;
        }
        if (best) { s.x = best.x; s.t = best.t; s.w = best.w; s.h = best.h; return void placed.push(s); }
      }
      failed = true; placed.push(s);
    });
    if (!failed || !pin || pin.fl !== f || pin.w * pin.h <= spaceMinArea(pin) * 1.05) break;
    pin.w = Math.max(MIN, pin.w * 0.88); pin.h = Math.max(MIN, pin.h * 0.88); settle(pin);
    }
  });
}

/* garage / terrace / balcony: never half inside the house, never on top of each other */
function resolveOutdoor(s) {
  const g = geometry(S), W = g.w, D = g.d, area = s.w * s.h;
  const vis = clipArea(g.poly, s.x, s.t, s.w, s.h);
  if (vis > 0.05 * area && vis < 0.9 * area) {
    const cand = [[-s.w, s.t], [W, s.t], [s.x, -s.h], [s.x, D]];
    const best = cand.reduce((b, c) => (Math.hypot(c[0] - s.x, c[1] - s.t) < Math.hypot(b[0] - s.x, b[1] - s.t) ? c : b), cand[0]);
    s.x = best[0]; s.t = best[1];
  }
  S.layout.spaces.filter(o => o !== s && isOutdoor(o) && !isRoomLike(o) && o.fl === s.fl).forEach(o => {
    const ox = Math.min(s.x + s.w, o.x + o.w) - Math.max(s.x, o.x), oy = Math.min(s.t + s.h, o.t + o.h) - Math.max(s.t, o.t);
    if (ox <= 0.05 || oy <= 0.05) return;
    if (ox <= oy) s.x += (s.x + s.w / 2 >= o.x + o.w / 2 ? 1 : -1) * (ox + 0.01); else s.t += (s.t + s.h / 2 >= o.t + o.h / 2 ? 1 : -1) * (oy + 0.01);
  });
}

function resolveSpace(s) {
  if (!s) return;
  if (isRoomLike(s)) resolveRooms(s); else resolveOutdoor(s);
}

/* floor area / floors / shape changed */
function layoutFootprintChanged(old) {
  const L = S.layout, g = geometry(S);
  if (!L.counted) { seedSample(); return; }
  if (!L.custom || old.F !== S.floors) {
    autoLayout(); placeOutdoor(); layoutSync(); return;
  }
  /* scale from the layout as it was before this run of size changes, so typing 1 -> 12 -> 120 can't squash the rooms for good */
  const sig = () => JSON.stringify(L.spaces.map(s => [s.id, +s.x.toFixed(2), +s.t.toFixed(2), +s.w.toFixed(2), +s.h.toFixed(2), s.fl, !!s.locked]));
  if (!L.base || L.baseSig !== sig()) L.base = { W: old.W, D: old.D, sp: L.spaces.map(s => ({ id: s.id, x: s.x, t: s.t, w: s.w, h: s.h })) };
  const bW = L.base.W, bD = L.base.D, sw = wantStairs() ? stairDims().w : 0, kx = (g.w - sw) / Math.max(bW - sw, 1), kt = g.d / bD;
  L.spaces.forEach(s => {
    if (isStair(s)) return;   // the staircase keeps its size; ensureStairs puts it back in the corner
    const b = L.base.sp.find(q => q.id === s.id);
    if (b) { s.x = b.x; s.t = b.t; s.w = b.w; s.h = b.h; }
    const inside = !isOutdoor(s) || (s.type === "garage" && s.pos === "inside");
    if (s.locked) return;
    if (inside) { s.x *= kx; s.w *= kx; s.t *= kt; s.h *= kt; return; }
    s.x = s.x < -0.01 ? s.x : (s.x >= bW - 0.01 ? s.x - bW + g.w : s.x * kx);
    s.t = s.t < -0.01 ? s.t : (s.t >= bD - 0.01 ? s.t - bD + g.d : s.t * kt);
  });
  ensureStairs();
  resolveRooms(null);
  layoutSync();
  L.baseSig = sig();
}

/* ---- editing the house footprint ---- */
function startFootprintEdit() { S.fp = geometry(S).poly.map(p => ({ x: p.x, y: p.y })); }

function normalizeFootprint() {
  const g = geometry(S);
  const pts = g.poly.map(p => ({ x: p.x - g.x0, y: p.y - g.t0 }));
  if (polySigned(pts) < 0) pts.reverse();
  if (Math.abs(g.x0) > 1e-9 || Math.abs(g.t0) > 1e-9) {
    S.layout.spaces.forEach(s => { s.x -= g.x0; s.t -= g.t0; });
    if (S.placement) S.placement = { ox: S.placement.ox + g.x0, oy: S.placement.oy + g.t0 };
  }
  S.fp = pts;
}

function updateFloorAreaInput() { const el = $("inNum"); if (el && editing !== null && STEPS[editing].id === "floorArea" && document.activeElement !== el) el.value = r1(S.floorArea); }

function footprintChanged(old) {
  normalizeFootprint();
  layoutFootprintChanged(old);
  layView = null;
  updateFloorAreaInput();
}

function setRectFootprint(aspect) {
  const old = layoutFootprint();
  S.aspect = aspect; S.fp = null;
  footprintChanged(old);
}

/* the biggest house the usual setbacks allow: the lot pulled in from every side */
function fitFootprintToLot(whole) {
  const lot = S.lot, fr = lotFrame(lot), pts = lot.pts, n = pts.length, sbs = whole ? pts.map(() => 0) : lotSetbacks(lot), sg = polySigned(pts) >= 0 ? 1 : -1;
  let poly = pts.map(p => ({ x: p.x, y: p.y }));
  for (let j = 0; j < n && poly.length >= 3; j++) {
    const a = pts[j], b = pts[(j + 1) % n], ex = b.x - a.x, ey = b.y - a.y, len = Math.hypot(ex, ey) || 1;
    const nx = -sg * ey / len, ny = sg * ex / len, sb = sbs[j];
    const f = p => nx * (p.x - a.x) + ny * (p.y - a.y) - sb;
    const inp = poly; poly = [];
    for (let i = 0; i < inp.length; i++) {
      const p = inp[i], q = inp[(i + 1) % inp.length], fp = f(p), fq = f(q);
      if (fp >= 0) poly.push(p);
      if ((fp >= 0) !== (fq >= 0)) { const k = fp / (fp - fq); poly.push({ x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k }); }
    }
  }
  poly = cleanPts(poly);
  if (whole && polyArea(pts) < 8) return "This lot is too small.";
  if (poly.length < 3 || polyArea(poly) < 8) return "This lot is too small for the usual setbacks (3 m front, 1.5 m sides, 2 m rear).";
  let loc = poly.map(p => { const q = fr.toLocal(p); return { x: q.u, y: q.t }; });
  if (polySigned(loc) < 0) loc.reverse();
  loc = dropStraightCorners(cleanPts(loc), 0.04);
  if (loc.length > 12 || selfIntersects(loc)) return "That lot shape is too complex to fit automatically. Drag the corners of the house instead.";
  const old = layoutFootprint();
  const minU = Math.min(...loc.map(p => p.x)), minT = Math.min(...loc.map(p => p.y));
  S.fp = loc.map(p => ({ x: p.x - minU, y: p.y - minT }));
  S.floorArea = Math.max(20, Math.round(polyArea(S.fp) * S.floors * 10) / 10);
  S.placement = { ox: minU, oy: minT };
  footprintChanged(old);
  return "";
}

function seedSample() {
  const L = S.layout;
  const keep = L.spaces.filter(isOutdoor);
  const rec = recommendRooms(S);
  const list = [mkSpace("living"), mkSpace("kitchen")];
  for (let i = 0; i < rec.master; i++) list.push(mkSpace("master"));
  for (let i = 0; i < rec.bed; i++) list.push(mkSpace("bed"));
  for (let i = 0; i < rec.cr; i++) list.push(mkSpace("cr"));
  L.spaces = list.concat(keep);
  L.custom = false;
  autoLayout(); placeOutdoor(); layoutSync();
}

function resetLayout() {
  S.layout = { spaces: [], counted: false, custom: false, nextId: 1 };
  laySel = null; layFloor = 0; layNote = "";
  seedSample();
}

/* counts and outdoor facts that the cost model reads */
function layoutSync() {
  if (ensureStairs()) { if (!S.layout.custom) autoLayout(); else resolveRooms(null); }
  const L = S.layout, g = geometry(S);
  L.spaces.forEach(s => {
    if (!isOutdoor(s)) {
      s.w = Math.max(0.6, Math.min(s.w, g.w)); s.h = Math.max(0.6, Math.min(s.h, g.d));
      s.x = Math.min(Math.max(s.x, 0), g.w - s.w); s.t = Math.min(Math.max(s.t, 0), g.d - s.h);
    }
  });
  const cnt = k => L.spaces.filter(s => s.type === k).length;
  S.rooms = {
    masterT: L.spaces.filter(x => x.type === "master" && x.ensuite !== false).length,
    bed: cnt("bed"), master: cnt("master"), cr: cnt("cr"), living: cnt("living"), kitchen: cnt("kitchen"), dining: cnt("dining"),
    otherA: L.spaces.filter(s => s.type === "other").reduce((a, s) => a + s.w * s.h, 0)
  };
  const gar = L.spaces.find(s => s.type === "garage");
  S.garage = gar ? gar.cars : 0;
  S.garageOut = !!gar && !spaceInside(gar);
  S.garageA = gar ? gar.w * gar.h : 0;
  const ter = L.spaces.find(s => s.type === "terrace");
  S.terrace = ter ? r1(ter.w * ter.h) : 0;
  S.balcony = !!L.spaces.find(s => s.type === "balcony");
  Object.keys(placeCache).forEach(k => delete placeCache[k]);
}

function addSpace(type, o) {
  const L = S.layout;
  if (["garage", "terrace", "balcony"].includes(type) && L.spaces.some(s => s.type === type)) return null;
  const sp = mkSpace(type, o);
  L.spaces.push(sp);
  L.counted = true;
  if (!L.custom) { autoLayout(); placeOutdoor(); } else { placeFree(sp); resolveSpace(sp); }
  if (type === "balcony" && S.floors < 2) layNote = "A balcony needs 2 or more floors, so it is ignored for now.";
  layoutSync();
  laySel = sp.id;
  if (!isOutdoor(sp) || sp.pos === "inside") layFloor = Math.min(sp.fl, S.floors - 1);
  else if (type === "balcony") layFloor = Math.min(1, S.floors - 1);
  return sp;
}

function removeSpace(id) {
  const L = S.layout;
  if (L.spaces.some(s => s.id === id && isStair(s))) { removeStairs(); return; }
  L.spaces = L.spaces.filter(s => s.id !== id);
  L.counted = true;
  if (laySel === id) laySel = null;
  if (!L.custom) { autoLayout(); placeOutdoor(); }
  layoutSync();
}

/* tread lines and an arrow showing how each stair type runs (the arrow points up) */
function stairArt(s, px) {
  const type = (S.layout && S.layout.stairType) || "straight", sw = "#7a8a80";
  const rot = s.w > s.h + 0.05 && type !== "spiral", nw = rot ? s.h : s.w, nd = rot ? s.w : s.h;
  const P = (a, b) => `${(rot ? s.x + b : s.x + a).toFixed(3)},${(-(rot ? s.t + a : s.t + nd - b)).toFixed(3)}`;   // b is measured from the rear end, where the climb starts
  const ln = (a1, b1, a2, b2) => { const [x1, y1] = P(a1, b1).split(","), [x2, y2] = P(a2, b2).split(","); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; };
  let t = "";
  if (type === "spiral") {
    const cx = s.x + s.w / 2, cy = -(s.t + s.h / 2), r = Math.min(s.w, s.h) / 2 - 0.05;
    t += `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${r.toFixed(3)}" fill="none"/>`;
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; t += `<line x1="${cx.toFixed(3)}" y1="${cy.toFixed(3)}" x2="${(cx + r * Math.cos(a)).toFixed(3)}" y2="${(cy + r * Math.sin(a)).toFixed(3)}"/>`; }
    t += `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${(r * 0.18).toFixed(3)}" fill="${sw}"/>`;
    return `<g stroke="${sw}" stroke-width="${px(1).toFixed(3)}" fill="none" style="pointer-events:none">${t}</g>`;
  }
  let path = "";
  const stepH = 0.28;
  if (type === "L") {
    const rw = nw * 0.45;
    for (let b = stepH; b < nd - rw; b += stepH) t += ln(0, b, rw, b);
    for (let a = rw + stepH; a < nw; a += stepH) t += ln(a, nd - rw, a, nd);
    t += ln(0, nd - rw, rw, nd - rw) + `<polyline points="${P(rw, nd - rw)} ${P(rw, nd)}" />`;
    path = `${P(rw / 2, 0.25)} ${P(rw / 2, nd - rw / 2)} ${P(nw - 0.25, nd - rw / 2)}`;
  } else if (type === "U") {
    const rw = (nw - 0.12) / 2, land = rw * 0.95;
    for (let b = stepH; b < nd - land; b += stepH) t += ln(0, b, rw, b) + ln(nw - rw, b, nw, b);
    t += ln(0, nd - land, nw, nd - land) + ln(nw / 2, 0, nw / 2, nd - land);
    path = `${P(rw / 2, 0.25)} ${P(rw / 2, nd - land / 2)} ${P(nw - rw / 2, nd - land / 2)} ${P(nw - rw / 2, 0.45)}`;
  } else {
    for (let b = stepH; b < nd; b += stepH) t += ln(0, b, nw, b);
    path = `${P(nw / 2, 0.25)} ${P(nw / 2, nd - 0.3)}`;
  }
  return `<g stroke="${sw}" stroke-width="${px(1).toFixed(3)}" fill="none" style="pointer-events:none">${t}<polyline points="${path}" stroke="#0f7b6c" stroke-width="${px(2).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}

function toggleStairLock() {
  const L = S.layout; L.stairLocked = !L.stairLocked;
  L.spaces.filter(isStair).forEach(x => { x.locked = L.stairLocked; });
  if (L.stairLocked) { L.custom = true; L.counted = true; }
}
function restackAfterStairChange() {
  const L = S.layout;
  if (!L.custom) { ensureStairs(); autoLayout(); placeOutdoor(); } else { ensureStairs(); resolveRooms(null); }
  layoutSync();
}
function setStairType(type) {
  const L = S.layout; if (!STAIR_TYPES[type]) return;
  L.stairType = type; L.stairAsked = true; L.noStairs = false;
  restackAfterStairChange();
}
function rotateStairs() {
  const L = S.layout, t = STAIR_TYPES[L.stairType] || STAIR_TYPES.straight; if (t.w === t.d) return;
  L.stairRot = !L.stairRot; restackAfterStairChange();
}

/* "What type of stairs?": asked when the house gets a second floor */
function askStairType(after) {
  const L = S.layout;
  if (S.floors <= 1 || L.noStairs) return;
  document.getElementById("rmAsk") && document.getElementById("rmAsk").remove();
  const box = document.createElement("div"); box.id = "rmAsk"; box.className = "rm-ask";
  const cur = L.stairType || "straight";
  box.innerHTML = `<div class="rm-card st-card" role="dialog" aria-label="Type of stairs">
    <h3>What type of stairs do you want?</h3>
    <p>A house with ${S.floors} floors needs a staircase. You can change this later, move it, rotate it or lock it in the floor plan.</p>
    <div class="st-opts">${Object.entries(STAIR_TYPES).map(([k, t]) => `<button type="button" class="st-opt ${k === cur ? "on" : ""}" data-st="${k}">
      <svg viewBox="0 0 60 60" width="46" height="46">${stairIcon(k)}</svg><strong>${t.name}</strong><small>${t.w} × ${t.d} m · about ${r1(t.w * t.d)} sqm per floor</small><em>${t.note}</em></button>`).join("")}</div>
    <div class="rm-btns"><button type="button" class="outline-btn" data-st="">Decide later</button></div></div>`;
  document.body.appendChild(box);
  const close = () => { box.remove(); if (after) after(); };
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-st]"); if (!b && e.target !== box) return;
    if (b && b.dataset.st) { setStairType(b.dataset.st); close(); refreshAll(); }
    else { L.stairAsked = true; close(); }
  });
}
/* tiny drawings for the picker */
function stairIcon(k) {
  const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#7a8a80" stroke-width="1.2"/>`;
  const frame = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f2ead6" stroke="#1f2d28" stroke-width="1.6" rx="1.5"/>`;
  const arrow = d => `<path d="${d}" fill="none" stroke="#0f7b6c" stroke-width="2" stroke-linecap="round" marker-end="url(#ah)"/>`;
  const defs = `<defs><marker id="ah" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6z" fill="#0f7b6c"/></marker></defs>`;
  if (k === "straight") return defs + frame(21, 6, 18, 48) + [12, 18, 24, 30, 36, 42, 48].map(y => line(21, y, 39, y)).join("") + arrow("M30 50L30 12");
  if (k === "L") return defs + frame(10, 6, 40, 48) + frame(10, 6, 16, 16) + [30, 36, 42, 48].map(y => line(10, y, 26, y)).join("") + [32, 38, 44].map(x => line(x, 6, x, 22)).join("") + arrow("M18 50L18 26M18 14L46 14");
  if (k === "U") return defs + frame(10, 6, 40, 48) + [20, 26, 32, 38, 44, 50].map(y => line(10, y, 28, y) + line(32, y, 50, y)).join("") + line(10, 14, 50, 14) + arrow("M19 50L19 18Q19 10 30 10Q41 10 41 18L41 46");
  return `<circle cx="30" cy="30" r="22" fill="#f2ead6" stroke="#1f2d28" stroke-width="1.6"/>` + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return line(30, 30, (30 + 22 * Math.cos(a)).toFixed(1), (30 + 22 * Math.sin(a)).toFixed(1)); }).join("") + `<circle cx="30" cy="30" r="3.5" fill="#7a8a80"/>`;
}

function removeStairs() {
  const L = S.layout;
  L.noStairs = true; L.spaces = L.spaces.filter(s => !isStair(s)); L.counted = true;
  if (laySel && !L.spaces.some(s => s.id === laySel)) laySel = null;
  if (!L.custom) { autoLayout(); placeOutdoor(); } else resolveRooms(null);
  layoutSync();
}
function addStairsBack() {
  const L = S.layout; L.noStairs = false;
  if (ensureStairs()) { if (!L.custom) autoLayout(); else resolveRooms(null); }
  layoutSync();
}

document.addEventListener("click", e => {
  if (e.target.closest && e.target.closest("[data-stairtype]")) { askStairType(() => refreshAll()); return; }
  if (e.target.closest && e.target.closest("[data-stairrot]")) { rotateStairs(); refreshAll(); return; }
  if (e.target.closest && e.target.closest("[data-addstairs]")) { addStairsBack(); liveUpdate(); refreshAll(); }
});

/* ask first, so a slip of the finger doesn't delete a room */
function askRemoveSpace(id) {
  const sp = S.layout.spaces.find(s => s.id === id);
  if (!sp) return;
  const stair = isStair(sp);
  document.getElementById("rmAsk") && document.getElementById("rmAsk").remove();
  const box = document.createElement("div");
  box.id = "rmAsk"; box.className = "rm-ask";
  box.innerHTML = `<div class="rm-card" role="alertdialog" aria-label="Remove room">
    <h3>Remove ${stair ? "the staircase" : esc(sp.name)}?</h3>
    <p>${stair ? `Without a staircase there is no way to reach the upper floor${S.floors > 2 ? "s" : ""}. Only remove it if you plan something else, such as an outside stair or a lift. You can add it back any time.`
      : `This takes out the ${esc(sp.name.toLowerCase())} (${r1(sp.w * sp.h)} sqm) from the plan, and the cost estimate updates. You can add it back later from the Rooms list.`}</p>
    <div class="rm-btns"><button type="button" class="outline-btn" data-rm="keep">Keep it</button><button type="button" class="primary-btn danger" data-rm="yes">Yes, remove</button></div></div>`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.addEventListener("click", e => {
    const a = e.target.dataset && e.target.dataset.rm;
    if (a === "yes") { close(); removeSpace(id); liveUpdate(); refreshAll(); }
    else if (a === "keep" || e.target === box) close();
  });
  document.addEventListener("keydown", function esc1(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc1); } });
  const k = box.querySelector('[data-rm="keep"]'); if (k) k.focus();
}

/* asks what kind of room to add (shown when the + button is pressed) */
function askRoomKind(type, done) {
  const kinds = ROOM_KINDS[type]; if (!kinds) { done({}); return; }
  document.getElementById("rmAsk") && document.getElementById("rmAsk").remove();
  const label = SPACE_TYPES[type].name.toLowerCase(), st = { styles: [], ensuite: type === "master" };
  const box = document.createElement("div"); box.id = "rmAsk"; box.className = "rm-ask";
  const draw = () => {
    box.innerHTML = `<div class="rm-card kind-card kc-modern" role="dialog" aria-modal="true" aria-label="Kind of ${label}"><div class="kc-head"><span class="kc-ico"><svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 36V16m0 14h36v6M6 24h14a4 4 0 0 1 4 4v2M42 30v-6a6 6 0 0 0-6-6H24"/></svg></span><div><h3>What kind of ${label}?</h3>
      <p>Pick one or more that fit. You can change it later by tapping the room in the plan.</p></div></div>
      <div class="opts kind-opts cardy"><span class="sub-l">Kind</span>${kinds.map(o => `<button type="button" class="opt ${(o === kinds[0] ? !st.styles.length : st.styles.includes(o[0])) ? "on" : ""}" data-k="${o[0]}" aria-pressed="${o === kinds[0] ? !st.styles.length : st.styles.includes(o[0])}"><i class="tick" aria-hidden="true"></i>${o[1]}</button>`).join("")}</div>
      ${type === "bed" || type === "master" ? `<div class="opts kind-opts cardy"><span class="sub-l">Bathroom</span><button type="button" class="opt ${st.ensuite ? "on" : ""}" data-e="1"><i class="tick"></i>Own CR inside${type === "master" ? " (T&B)" : ""}</button><button type="button" class="opt ${st.ensuite ? "" : "on"}" data-e="0"><i class="tick"></i>${type === "master" ? "No own CR" : "Shared CR outside"}</button></div>` : ""}
      <div class="rm-btns"><button type="button" class="outline-btn" data-rk="cancel">Cancel</button><button type="button" class="primary-btn" data-rk="add">Add ${label}</button></div></div>`;
  };
  draw(); document.body.appendChild(box);
  const close = () => box.remove();
  box.addEventListener("click", e => {
    const t = e.target.closest("button");
    if (t && t.dataset.k) { st.styles = toggleKind(st.styles, t.dataset.k, kinds[0][0]); draw(); }
    else if (t && t.dataset.e !== undefined) { st.ensuite = t.dataset.e === "1"; draw(); }
    else if (t && t.dataset.rk === "add") { close(); done({ styles: st.styles.slice(), ensuite: st.ensuite }); }
    else if ((t && t.dataset.rk === "cancel") || e.target === box) close();
  });
  document.addEventListener("keydown", function k1(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k1); } });
}

function removeOne(type) {
  const L = S.layout, list = L.spaces.filter(s => s.type === type);
  if (!list.length) return;
  const pick = list.find(s => s.id === laySel) || list[list.length - 1];
  removeSpace(pick.id);
}

/* ---- checks ---- */
function layoutProblems() {
  const L = S.layout, g = geometry(S), out = [];
  const body = { x: 0, t: 0, w: g.w, h: g.d };   // bounding box of the footprint
  const bad = new Set();
  const vis = L.spaces.filter(s => !(s.type === "balcony" && S.floors < 2));
  vis.forEach((a, i) => vis.slice(i + 1).forEach(b => {
    if (a.fl !== b.fl) return;
    if (overlapArea(a, b) > 0.15) { bad.add(a.id); bad.add(b.id); out.push(`${a.name} overlaps ${b.name}.`); }
  }));
  vis.filter(s => !isOutdoor(s)).forEach(s => {
    if (clipArea(g.poly, s.x, s.t, s.w, s.h) < Math.min(0.55 * spaceMinArea(s.type), 0.6 * s.w * s.h)) { bad.add(s.id); out.push(`${s.name} is mostly outside the house walls — drag it inside or make it smaller.`); }
  });
  vis.filter(isOutdoor).forEach(s => {
    if (spaceInside(s)) return;
    if (clipArea(g.poly, s.x, s.t, s.w, s.h) > 0.15) { bad.add(s.id); out.push(`${s.name} is half inside the house — move it fully inside or fully outside.`); }
  });
  return { list: out.slice(0, 3), bad };
}

function sampleText() {
  const R = S.rooms, p = (n, w) => (n ? `${n} ${w}${n > 1 && !w.endsWith("room") && !w.endsWith("CR") ? "s" : ""}` : "");
  const parts = [];
  if (R.bed) parts.push(`${R.bed} bedroom${R.bed > 1 ? "s" : ""}`);
  if (R.master) parts.push(`${R.master} master bedroom${R.master > 1 ? "s" : ""}${mT(R) === R.master ? " with T&B" : ""}`);
  if (R.cr) parts.push(`${R.cr} common CR`);
  if (R.living) parts.push("living room");
  if (R.kitchen) parts.push("kitchen & dining");
  if (R.dining) parts.push("dining room");
  return parts.join(" · ");
}

/* =========================
   FLOOR PLAN (SVG) + editing
========================= */

const spacesOnFloor = f => S.layout.spaces.filter(s => s.fl === f && !(s.type === "balcony" && S.floors < 2));

function layBounds() {
  const g = geometry(S);
  let x0 = 0, x1 = g.w, t0 = 0, t1 = g.d;
  S.layout.spaces.forEach(s => { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x + s.w); t0 = Math.min(t0, s.t); t1 = Math.max(t1, s.t + s.h); });
  const px = Math.max((x1 - x0) * 0.12, 1.5), pt = Math.max((t1 - t0) * 0.12, 1.5);
  return { x: x0 - px, y: -(t1 + pt), w: x1 - x0 + 2 * px, h: t1 - t0 + 2 * pt + 2.2 };
}

function renderFloor() {
  pruneStairs();
  const svg = $("floorSvg");
  if (!svg || !S.layout) return;
  const L = S.layout, g = geometry(S), W = g.w, D = g.d, F = S.floors;
  layFloor = Math.min(layFloor, F - 1);
  if (!layView || !layDrag) layView = layBounds();
  const vb = layView;
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const rc = svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
  const ppm = rc && rc.width > 0 ? Math.min(rc.width / vb.w, rc.height / vb.h) : 30;
  const px = v => v / ppm;
  const halo = `paint-order:stroke;stroke:#ffffff;stroke-width:${px(3).toFixed(3)}px;stroke-linejoin:round`;
  const pb = layoutProblems();
  let h = "";

  /* grid every metre */
  let gr = "";
  for (let x = Math.floor(vb.x); x <= vb.x + vb.w; x++) gr += `<line x1="${x}" y1="${vb.y}" x2="${x}" y2="${vb.y + vb.h}"/>`;
  for (let y = Math.floor(vb.y); y <= vb.y + vb.h; y++) gr += `<line x1="${vb.x}" y1="${y}" x2="${vb.x + vb.w}" y2="${y}"/>`;
  h += `<g stroke="#e3e8e2" stroke-width="${px(1).toFixed(3)}">${gr}</g>`;

  /* road side (front) */
  const ry = vb.y + vb.h - 1.1;
  h += `<rect x="${vb.x}" y="${ry}" width="${vb.w}" height="2" fill="#c5ccc5" opacity="0.95"/>`;
  h += `<text x="${vb.x + vb.w / 2}" y="${ry + 0.55}" text-anchor="middle" dominant-baseline="middle" fill="#46524c" font-size="${px(11).toFixed(3)}" font-weight="700" letter-spacing="${px(3).toFixed(3)}">FRONT · ROAD SIDE</text>`;

  /* house outline: a polygon you can reshape */
  const poly = g.poly, n = poly.length;
  const P = q => `${q.x.toFixed(3)},${(-q.y).toFixed(3)}`;
  h += `<defs><clipPath id="fpClip"><polygon points="${poly.map(P).join(" ")}"/></clipPath></defs>`;
  h += `<polygon points="${poly.map(P).join(" ")}" fill="#ffffff"/>`;

  /* ghost of the ground floor terrace under a balcony */
  if (layFloor === 1) L.spaces.filter(s => s.type === "terrace").forEach(s => {
    h += `<rect x="${s.x}" y="${-(s.t + s.h)}" width="${s.w}" height="${s.h}" fill="none" stroke="#b89a62" stroke-dasharray="${px(5)} ${px(4)}" stroke-width="${px(1.5).toFixed(3)}"/>`;
  });

  const list = spacesOnFloor(layFloor);
  const roomLike = s => !isOutdoor(s) || (s.type === "garage" && spaceInside(s));
  const drawSpace = s => {
    const t = SPACE_TYPES[s.type], sel = laySel === s.id, bad = pb.bad.has(s.id), out = isOutdoor(s) && !roomLike(s);
    const stroke = bad ? "#cf4436" : (sel ? "#0f7b6c" : "#8fa89d");
    let shape = roomLike(s) ? clipRectPoly(poly, s.x, s.t, s.w, s.h) : null;
    if (shape && shape.length < 3) shape = null;
    const a = shape ? polyArea(shape) : s.w * s.h;
    const c = shape ? polyCentroid(shape) : { x: s.x + s.w / 2, y: s.t + s.h / 2 };
    const wpx = (shape ? Math.max(...shape.map(q => q.x)) - Math.min(...shape.map(q => q.x)) : s.w) * ppm;
    const hpx = (shape ? Math.max(...shape.map(q => q.y)) - Math.min(...shape.map(q => q.y)) : s.h) * ppm;
    let g2 = `<g>` +
      `<rect data-sp="${s.id}" x="${s.x.toFixed(3)}" y="${(-(s.t + s.h)).toFixed(3)}" width="${s.w.toFixed(3)}" height="${s.h.toFixed(3)}" fill="${t.color}" fill-opacity="${out ? 0.4 : 0.3}" stroke="${stroke}" stroke-width="${px(sel ? 3 : 1.6).toFixed(3)}" ${out ? `stroke-dasharray="${px(6)} ${px(3)}"` : ""} style="cursor:${s.locked ? "not-allowed" : "move"}"/>` +
      "";
    let lk = "";
    if ((!out || roomLike(s)) && !isStair(s)) {
      let lx = c.x, ly = c.y; const r = px(10);
      if (hpx >= 70) ly = c.y - (hpx / 2 - 15) / ppm; else if (wpx >= 90) lx = c.x - (wpx / 2 - 15) / ppm; else ly = c.y + Math.max(0, hpx / 2 - 14) / ppm;
      lk = `<g data-lock="${s.id}" style="cursor:pointer"><circle data-lock="${s.id}" cx="${lx.toFixed(3)}" cy="${(-ly).toFixed(3)}" r="${r.toFixed(3)}" fill="${s.locked ? "#0f7b6c" : "#ffffff"}" fill-opacity="${s.locked || sel ? 1 : 0.8}" stroke="#1f2d28" stroke-width="${px(1.2).toFixed(3)}"/><text data-lock="${s.id}" x="${lx.toFixed(3)}" y="${(-ly).toFixed(3)}" text-anchor="middle" dominant-baseline="central" font-size="${px(11).toFixed(3)}">${s.locked ? "🔒" : "🔓"}</text><title>${s.locked ? "Locked — tap to unlock" : "Tap to lock this room in place"}</title></g>`;
      const dx = lx + px(25);
      lk += `<g data-del="${s.id}" style="cursor:pointer"><circle data-del="${s.id}" cx="${dx.toFixed(3)}" cy="${(-ly).toFixed(3)}" r="${r.toFixed(3)}" fill="#ffffff" fill-opacity="${sel ? 1 : 0.8}" stroke="#cf4436" stroke-width="${px(1.2).toFixed(3)}"/><text data-del="${s.id}" x="${dx.toFixed(3)}" y="${(-ly).toFixed(3)}" text-anchor="middle" dominant-baseline="central" font-size="${px(13).toFixed(3)}" font-weight="800" fill="#cf4436">✕</text><title>Remove this room (asks first)</title></g>`;
    }
    if (isStair(s)) {
      const gap = Math.min(px(13), s.h / 3.2), rr = px(9);
      const mk2 = (kind, cy2, fill, stroke, txt, ttl, extra) => `<g ${kind}="${s.id}" style="cursor:pointer"><circle ${kind}="${s.id}" cx="${c.x.toFixed(3)}" cy="${(-cy2).toFixed(3)}" r="${rr.toFixed(3)}" fill="${fill}" fill-opacity="0.92" stroke="${stroke}" stroke-width="${px(1.2).toFixed(3)}"/><text ${kind}="${s.id}" x="${c.x.toFixed(3)}" y="${(-cy2).toFixed(3)}" text-anchor="middle" dominant-baseline="central" font-size="${px(extra ? 11 : 12).toFixed(3)}" font-weight="800" fill="${txt === "✕" ? "#cf4436" : "#1f2d28"}">${txt}</text><title>${ttl}</title></g>`;
      lk = mk2("data-lock", c.y + gap, s.locked ? "#0f7b6c" : "#ffffff", "#1f2d28", s.locked ? "🔒" : "🔓", s.locked ? "Locked — tap to unlock" : "Tap to lock the stairs in place", true) +
        mk2("data-del", c.y - gap, "#ffffff", "#cf4436", "✕", "Remove the staircase (asks first)", false);
      g2 += stairArt(s, px);
    }
    return { lock: lk, rect: g2 + `</g>`, label: (wpx < (isStair(s) ? 24 : 38) || hpx < 22 ? "" :
      `<text x="${c.x.toFixed(3)}" y="${(-c.y - (wpx > 90 && hpx > 40 ? px(6) : 0)).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(Math.min(12, Math.max(8, wpx / 9))).toFixed(3)}" font-weight="700" fill="#1f2d28" style="pointer-events:none">${esc(s.name.length * Math.min(12, Math.max(8, wpx / 9)) * 0.58 <= wpx ? s.name : s.name.split(" ")[0])}${s.type === "garage" && wpx > 90 ? ` (${s.cars} car${s.cars > 1 ? "s" : ""})` : ""}${wpx > 60 ? " " + kindIcons(s) : ""}</text>` +
      (wpx > 90 && hpx > 40 ? `<text x="${c.x.toFixed(3)}" y="${(-c.y + px(7)).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(10).toFixed(3)}" fill="#66736c" style="pointer-events:none">${r1(a)} sqm</text>` : "")), sel };
  };
  const drawn = list.map(s => ({ s, d: drawSpace(s) }));
  h += `<g clip-path="url(#fpClip)">${drawn.filter(o => roomLike(o.s)).map(o => o.d.rect).join("")}</g>`;
  h += `<g style="pointer-events:none">${drawn.filter(o => roomLike(o.s)).map(o => o.d.label).join("")}</g>`;
  h += drawn.filter(o => !roomLike(o.s)).map(o => o.d.rect + o.d.label).join("");
  h += `<polygon points="${poly.map(P).join(" ")}" fill="none" stroke="#1f2d28" stroke-width="${px(4).toFixed(3)}" stroke-linejoin="round" style="pointer-events:none"/>`;

  /* side lengths */
  const sgn = polySigned(poly) >= 0 ? 1 : -1;
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % n], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 0.8) return;
    const o = { x: sgn * dy / len, y: -sgn * dx / len }, off = px(15);
    h += `<text x="${((a.x + b.x) / 2 + o.x * off).toFixed(3)}" y="${(-((a.y + b.y) / 2 + o.y * off)).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(11).toFixed(3)}" font-weight="700" fill="#1f2d28" style="${halo};pointer-events:none">${r1(len)} m</text>`;
  });

  h += drawn.map(o => o.d.lock || "").join("");

  /* resize handle of the selected room */
  drawn.filter(o => o.d.sel && !o.s.locked && !isStair(o.s)).forEach(o => {
    const s = o.s;
    const hd = (edge, cx, cy, cur, tip) => `<circle data-rs="${s.id}" data-edge="${edge}" cx="${cx.toFixed(3)}" cy="${(-cy).toFixed(3)}" r="${px(edge === "c" ? 8 : 7).toFixed(3)}" fill="#0f7b6c" stroke="#ffffff" stroke-width="${px(2).toFixed(3)}" style="cursor:${cur}"><title>${tip}</title></circle>`;
    h += hd("c", s.x + s.w, s.t + s.h, "nesw-resize", "Drag to resize (right and rear sides)") +
      hd("r", s.x + s.w, s.t + s.h / 2, "ew-resize", "Drag to move the right side") + hd("l", s.x, s.t + s.h / 2, "ew-resize", "Drag to move the left side") +
      hd("t", s.x + s.w / 2, s.t + s.h, "ns-resize", "Drag to move the rear side") + hd("b", s.x + s.w / 2, s.t, "ns-resize", "Drag to move the front side");
  });

  /* footprint handles: drag a corner to reshape the house, tap + to add a corner */
  if (n < 12) poly.forEach((a, i) => {
    const b = poly[(i + 1) % n], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    h += `<circle data-fadd="${i}" cx="${mx.toFixed(3)}" cy="${(-my).toFixed(3)}" r="${px(6).toFixed(3)}" fill="#ffffff" stroke="#1f2d28" stroke-width="${px(1.5).toFixed(3)}" style="cursor:copy"><title>Add a corner to the house here</title></circle>` +
      `<text x="${mx.toFixed(3)}" y="${(-my).toFixed(3)}" text-anchor="middle" dominant-baseline="central" font-size="${px(10).toFixed(3)}" font-weight="700" fill="#1f2d28" style="pointer-events:none">+</text>`;
  });
  poly.forEach((p, i) => {
    h += `<circle data-fc="${i}" cx="${p.x.toFixed(3)}" cy="${(-p.y).toFixed(3)}" r="${px(7.5).toFixed(3)}" fill="#1f2d28" stroke="#ffffff" stroke-width="${px(2).toFixed(3)}" style="cursor:grab"><title>Drag to reshape the house · double-tap to remove this corner</title></circle>`;
  });

  $("floorContent").innerHTML = h;

  /* floor tabs */
  const tabs = $("floorTabs");
  tabs.style.display = "";
  tabs.innerHTML = Array.from({ length: F > 1 ? F : 0 }, (_, i) => `<button type="button" data-fl="${i}" class="${i === layFloor ? "active" : ""}">${i === 0 ? "Ground floor" : (i === 1 ? "2nd floor" : i === 2 ? "3rd floor" : (i + 1) + "th floor")}</button>`).join("") +
    `<span class="fl-set">House has ${[1, 2, 3].map(n => `<button type="button" data-setfl="${n}" class="${n === F ? "on" : ""}">${n} floor${n > 1 ? "s" : ""}</button>`).join("")}</span>`;

  /* legend */
  const pl = placeHouse(S);
  let leg = `<span><b>${r1(g.fp)} sqm</b> per floor · ${n} sides · ${r1(g.perim)} m of walls</span><span>${num(r1(S.floorArea))} sqm total</span>`;
  const garage = L.spaces.find(s => s.type === "garage");
  if (garage) leg += `<span>Garage is ${S.garageOut ? "<b>outside</b> the house (not in the floor area)" : "<b>inside</b> the house"}</span>`;
  leg += `<span>Drag a room to move it · the green dots on each side resize it · <b>tap the 🔓 on a room to lock it in place</b> · <b>tap the ✕ to remove it (it asks first)</b> · <b>dark corners reshape the house</b> (tap + to add a corner, double-tap a corner to remove it)</span>`;
  pb.list.forEach(m => { leg += `<span class="bad">⚠ ${m}</span>`; });
  if (!pl.fits) leg += `<span class="bad">⚠ With these rooms the house doesn't fit your lot</span>`;
  if (S.floors > 1 && !S.layout.noStairs) leg += `<span>Stairs: <b>${STAIR_TYPES[S.layout.stairType || "straight"].name}</b> <button type="button" class="outline-btn small" data-stairtype="1">change</button>${(() => { const t = STAIR_TYPES[S.layout.stairType || "straight"]; return t.w !== t.d ? ` <button type="button" class="outline-btn small" data-stairrot="1">⟳ rotate</button>` : ""; })()}</span>`;
  if (S.floors > 1 && S.layout.noStairs) leg += `<span class="bad">⚠ No staircase, so the upper floor can't be reached</span><button type="button" class="outline-btn small" data-addstairs="1">＋ Add staircase</button>`;
  if (layNote) leg += `<span>${layNote}</span>`;
  $("floorLegend").innerHTML = leg;
  if ($("floorSvg") && !isLotEditing()) { $("viewerTitle").textContent = "Your Floor Plan"; $("viewerSub").textContent = `${num(S.floorArea)} sqm house · ${sampleText() || "no rooms yet"}`; }
}

function bindFloor() {
  const svg = $("floorSvg");
  const toLocal = e => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: q.x, t: -q.y };
  };
  const snapAxis = (v, w, edges) => {
    let best = roundTo(v, 0.25), bd = 0.3;
    edges.forEach(e => {
      if (Math.abs(e - v) < bd) { bd = Math.abs(e - v); best = e; }
      if (Math.abs(e - (v + w)) < bd) { bd = Math.abs(e - (v + w)); best = e - w; }
    });
    return best;
  };
  svg.addEventListener("pointerdown", e => {
    const d = e.target.dataset || {};
    const sp = id => S.layout.spaces.find(s => s.id === id);
    if (d.del !== undefined) { e.preventDefault(); askRemoveSpace(d.del); return; }
    if (d.lock !== undefined) {
      const s = sp(d.lock);
      if (s && isStair(s)) toggleStairLock(); else if (s) { s.locked = !s.locked; if (s.locked) { S.layout.custom = true; S.layout.counted = true; } }
      if (s) laySel = s.id;
      e.preventDefault(); renderFloor(); updateSelBox(); return;
    }
    if (d.fc !== undefined) {
      startFootprintEdit();
      layDrag = { mode: "fc", i: Number(d.fc), old: layoutFootprint(), moved: false };
    } else if (d.fadd !== undefined) {
      const old = layoutFootprint();
      startFootprintEdit();
      const i = Number(d.fadd), a = S.fp[i], b = S.fp[(i + 1) % S.fp.length];
      S.fp.splice(i + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      layDrag = { mode: "fc", i: i + 1, old, moved: true };
    } else if (d.rs) {
      laySel = d.rs; layDrag = { mode: "rs", sp: sp(d.rs), edge: d.edge || "c" };
    } else if (d.sp) {
      const s = sp(d.sp), p = toLocal(e);
      laySel = s.id;
      if (s.locked) { renderFloor(); updateSelBox(); return; }   // locked: select only
      layDrag = { mode: isStair(s) ? "mvs" : "mv", sp: s, dx: p.x - s.x, dt: p.t - s.t };
    } else { laySel = null; renderFloor(); updateSelBox(); return; }
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    renderFloor(); updateSelBox();
  });
  svg.addEventListener("pointermove", e => {
    if (!layDrag) return;
    if (layDrag.mode === "fc") {
      const p = toLocal(e), i = layDrag.i, prev = S.fp[i];
      S.fp[i] = { x: roundTo(p.x, 0.25), y: roundTo(p.t, 0.25) };
      if (selfIntersects(S.fp) || polyArea(S.fp) < 8) { S.fp[i] = prev; return; }
      S.floorArea = Math.max(20, Math.round(polyArea(S.fp) * S.floors * 10) / 10);
      layDrag.moved = true;
      updateFloorAreaInput();
      renderFloor();
      return;
    }
    const s = layDrag.sp, p = toLocal(e), g = geometry(S), L = S.layout;
    if (layDrag.mode === "mvs") {   /* the staircase moves on every floor at once, and the rooms make way */
      const others2 = spacesOnFloor(s.fl).filter(o => o !== s);
      const ex2 = [0, g.w, ...others2.flatMap(o => [o.x, o.x + o.w])], et2 = [0, g.d, ...others2.flatMap(o => [o.t, o.t + o.h])];
      const nx = Math.min(Math.max(snapAxis(p.x - layDrag.dx, s.w, ex2), 0), g.w - s.w), nt = Math.min(Math.max(snapAxis(p.t - layDrag.dt, s.h, et2), 0), g.d - s.h);
      L.stairPos = { x: roundTo(nx, 0.05), t: roundTo(nt, 0.05) }; L.custom = true; L.counted = true;
      ensureStairs(); resolveRooms(null); layoutSync(); renderFloor(); return;
    }
    const before = { x: s.x, t: s.t, w: s.w, h: s.h };
    const others = spacesOnFloor(s.fl).filter(o => o !== s);
    const ex = [0, g.w, ...others.flatMap(o => [o.x, o.x + o.w])], et = [0, g.d, ...others.flatMap(o => [o.t, o.t + o.h])];
    if (layDrag.mode === "mv") {
      s.x = snapAxis(p.x - layDrag.dx, s.w, ex);
      s.t = snapAxis(p.t - layDrag.dt, s.h, et);
      if (!isOutdoor(s)) { s.x = Math.min(Math.max(s.x, 0), g.w - s.w); s.t = Math.min(Math.max(s.t, 0), g.d - s.h); }
    } else {
      /* drag any side (or the corner); the opposite side stays put. Sides snap to the walls and to neighbouring rooms. */
      const ed = layDrag.edge, near = (v, arr) => { const m = arr.find(a => Math.abs(a - v) < 0.2); return m === undefined ? v : m; };
      const r0 = s.x + s.w, b0 = s.t + s.h, inH = !isOutdoor(s);
      const wantR = ed === "c" || ed === "r", wantL = ed === "l", wantT = ed === "c" || ed === "t", wantB = ed === "b";
      if (wantR) { let r = near(roundTo(p.x, 0.25), ex); if (inH) r = Math.min(r, g.w); s.w = Math.max(1, r - s.x); }
      if (wantL) { let l = near(roundTo(p.x, 0.25), ex); if (inH) l = Math.max(l, 0); l = Math.min(l, r0 - 1); s.x = l; s.w = r0 - l; }
      if (wantT) { let t2 = near(roundTo(p.t, 0.25), et); if (inH) t2 = Math.min(t2, g.d); s.h = Math.max(1, t2 - s.t); }
      if (wantB) { let f = near(roundTo(p.t, 0.25), et); if (inH) f = Math.max(f, 0); f = Math.min(f, b0 - 1); s.t = f; s.h = b0 - f; }
      if (s.type === "garage") { s.cars = s.w > 4.2 ? 2 : 1; }
    }
    if (isRoomLike(s) && L.spaces.some(o => o !== s && o.locked && o.fl === s.fl && isRoomLike(o) && overlapArea(s, o) > 0.02)) {
      Object.assign(s, before); layNote = "That spot is taken by a locked room."; return;   // can't go through a locked room
    }
    L.custom = true;
    layNote = "";
    if (s.type === "garage") s.pos = spaceInside(s) ? "inside" : (s.x >= g.w - 0.01 ? "right" : (s.x + s.w <= 0.01 ? "left" : (s.t + s.h <= 0.01 ? "front" : s.pos)));
    resolveSpace(s);
       layoutSync();
    renderFloor();
    updateSelValues();
  });
  const end = () => {
    if (!layDrag) return;
    const fc = layDrag.mode === "fc" ? layDrag : null;
    layDrag = null;
    layView = null;
    if (fc) { if (fc.moved) footprintChanged(fc.old); else normalizeFootprint(); }
    afterLayoutEdit();
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("dblclick", e => {
    const d = e.target.dataset || {};
    if (d.fc === undefined || geometry(S).poly.length <= 3) return;
    const old = layoutFootprint();
    startFootprintEdit();
    S.fp.splice(Number(d.fc), 1);
    S.floorArea = Math.max(20, Math.round(polyArea(S.fp) * S.floors * 10) / 10);
    footprintChanged(old);
    afterLayoutEdit();
  });
  $("floorTabs").addEventListener("click", e => {
    const b = e.target.closest ? e.target.closest("button") : null;
    if (!b) return;
    if (b.dataset.setfl) {   /* change how many floors the house has, right from the plan */
      const n = Number(b.dataset.setfl);
      if (n !== S.floors) {
        const old = layoutFootprint(); S.floors = n; layoutFootprintChanged(old); layView = null; layFloor = Math.min(layFloor, n - 1); laySel = null; refreshAll();
        if (old.F <= 1 && n > 1 && !S.layout.stairAsked) askStairType(() => refreshAll());
      }
      return;
    }
    layFloor = Number(b.dataset.fl); laySel = null;
    renderFloor(); updateSelBox();
  });
}

/* after any layout change: recompute everything that depends on it */
function afterLayoutEdit() {
  layoutSync();
  layView = null;
  if ($("planBox")) updateRoomsUI();
  updateSelBox();
  if ($("sampleBox")) updateSampleBox();
  updateHint();
  liveUpdate();
}

/* ---------- panels ---------- */

function sampleBoxHTML() {
  const g = geometry(S), plan = roomPlan(S);
  return `<div class="sample-head">✨ Sample layout for ${num(S.floorArea)} sqm${S.floors > 1 ? ` over ${S.floors} floors` : ""}</div>
    <p class="sample-line">${sampleText()}</p>
    <p class="hint">Each floor is about <b>${r1(g.w)} × ${r1(g.d)} m</b>. ${plan.fits ? "These rooms fit comfortably." : "⚠ The rooms are a tight squeeze — see the next question."} Drag the rooms in the plan above to try other arrangements, or add more rooms in the <b>Rooms &amp; layout</b> question.</p>`;
}
function updateSampleBox() { const el = $("sampleBox"); if (el) el.innerHTML = sampleBoxHTML(); }

const ASPECTS = [[2, "Wide 2:1"], [4 / 3, "Wide 4:3"], [1, "Square"], [0.75, "Deep 3:4"]];
function floorAreaPanelHTML(merged) {
  const g = geometry(S);
  return numberField("inNum", "Total floor area of the house", "sqm", r1(S.floorArea), 20, 5) +
    chipsHTML("inNum", [40, 65, 90, 120, 160], v => v + " sqm") +
    (merged ? `<details class="lot-more"><summary>House shape &amp; fit to my lot</summary>` : "") +
    `<h4 class="lot-h">House shape <small>— the front (road side) is the bottom of the plan</small></h4>
     <div class="opts" id="aspectOpts">${ASPECTS.map(a => `<button type="button" class="opt ${g.isRect && !S.fp && Math.abs(S.aspect - a[0]) < 0.01 ? "on" : ""}" data-aspect="${a[0]}">▭ ${a[1]}</button>`).join("")}
       <button type="button" class="opt" id="fitLotBtn">⬚ Fit the house to my lot</button>
       <button type="button" class="opt" id="wholeLotBtn" title="The house covers the entire lot, with no setbacks">⬛ Occupy the whole lot</button></div>
     <p class="hint" id="fitMsg">Your lot isn't a rectangle? Use <b>Fit the house to my lot</b> to follow its shape, or drag the dark corners of the house in the plan above. Tap a <b>+</b> on a wall to add a corner, double-tap a corner to remove it. The floor area follows the shape you draw.</p>
     <div class="sample-box" id="sampleBox">${sampleBoxHTML()}</div>` + (merged ? `</details>` : "") + (window.LotItems ? LotItems.panelHTML() : "") + `
     <p class="hint" id="hint"></p>`;
}

function roomsPanelHTML() {
  const row = t => `
    <div class="room-row">
      <div class="room-info"><strong>${t.name}</strong><small>${t.note}</small></div>
      <div class="stepper big">
        <button type="button" data-room="${t.key}" data-d="-1">−</button>
        <span class="room-n" id="n_${t.key}">0</span>
        <button type="button" data-room="${t.key}" data-d="1">+</button>
      </div>
      <div class="room-max" id="max_${t.key}"></div>
    </div>`;
  return `<h4 class="lot-h">Rooms</h4>
    <div class="room-list">${ROOM_TYPES.map(row).join("")}</div>
    <div id="otherBox"></div>
    <h4 class="lot-h">Garage, terrace &amp; balcony <small>— a garage can sit beside or in front of the house, it doesn't have to be inside</small></h4>
    <div id="outBox"></div>
    <h4 class="lot-h">Outside the house, inside your lot <small>— a store, basketball court, pool, second house, garden…</small></h4>
    ${window.LotItems ? LotItems.panelHTML() : ""}
    <div class="room-actions">
      <button type="button" class="outline-btn" id="suggestBtn">✨ Suggest rooms for my floor area</button>
      <button type="button" class="outline-btn" id="autoBtn">↺ Auto-arrange the layout</button>
    </div>
    <div id="selBox"></div>
    <div id="planBox"></div>
    <p class="hint" id="hint"></p>`;
}

function outBoxHTML() {
  const L = S.layout, gar = L.spaces.find(s => s.type === "garage"), ter = L.spaces.find(s => s.type === "terrace"), bal = L.spaces.find(s => s.type === "balcony");
  const opt = (act, attrs, label, on, off) => `<button type="button" class="opt ${on ? "on" : ""}" data-act="${act}" ${attrs} ${off ? "disabled" : ""}>${label}</button>`;
  const pos = gar ? gar.pos : "";
  return `<div class="extra-group"><h4>🚗 Garage</h4><div class="opts">
      ${opt("garage", 'data-cars="0"', "None", !gar)}${opt("garage", 'data-cars="1"', `1 car · ${GARAGE_AREA[1]} sqm`, gar && gar.cars === 1)}${opt("garage", 'data-cars="2"', `2 cars · ${GARAGE_AREA[2]} sqm`, gar && gar.cars === 2)}</div>
      ${gar ? `<div class="opts sub"><span class="sub-l">Where:</span>
        ${opt("gpos", 'data-pos="right"', "Beside (right)", pos === "right")}${opt("gpos", 'data-pos="left"', "Beside (left)", pos === "left")}${opt("gpos", 'data-pos="front"', "In front", pos === "front")}${opt("gpos", 'data-pos="inside"', "Inside the house", pos === "inside")}</div>` : ""}</div>
    <div class="extra-group"><h4>🌿 Terrace <small>covered, at ground level, in front of the house</small></h4><div class="opts">
      ${opt("terrace", 'data-area="0"', "None", !ter)}${[8, 12, 18].map(a => opt("terrace", `data-area="${a}"`, `${a} sqm`, ter && Math.round(ter.w * ter.h) === a)).join("")}</div></div>
    <div class="extra-group"><h4>🏙 Balcony <small>${S.floors < 2 ? "needs 2 or more floors" : "on the 2nd floor"}</small></h4><div class="opts">
      ${opt("balcony", 'data-v="0"', "No balcony", !bal, S.floors < 2)}${opt("balcony", 'data-v="1"', "Add balcony", !!bal && S.floors >= 2, S.floors < 2)}</div></div>`;
}

function otherBoxHTML() {
  const L = S.layout, others = L.spaces.filter(s => s.type === "other");
  return `<div class="room-row other-row">
      <div class="room-info"><strong>Other rooms</strong><small>study, laundry, storage, prayer room…</small></div>
      <div class="other-add"><select id="otherSel">${OTHER_ROOMS.map((o, i) => `<option value="${i}">${o[0]} · ${o[1]} sqm</option>`).join("")}</select>
      <button type="button" class="outline-btn" data-act="addOther">+ Add</button></div>
    </div>
    ${others.length ? `<div class="chips other-list">${others.map(s => `<span class="tag" data-act="pick" data-id="${s.id}">${esc(s.name)} · ${r1(s.w * s.h)} sqm <button type="button" data-act="rm" data-id="${s.id}" title="Remove">✕</button></span>`).join("")}</div>` : ""}`;
}

function selBoxHTML() {
  const s = S.layout.spaces.find(x => x.id === laySel);
  if (!s) return `<p class="hint">Tip: tap a room in the plan to rename, resize or remove it. Only bedrooms and bathrooms get walls by default; living room, kitchen and dining stay open.</p>`;
  if (isStair(s)) {
    const L = S.layout, cur = L.stairType || "straight", t = STAIR_TYPES[cur];
    return `<div class="sel-box"><div class="sel-head"><strong>Staircase</strong><span class="sel-btns"><button type="button" class="outline-btn ${s.locked ? "on" : ""}" data-act="lock" data-id="${s.id}" title="A locked staircase stays where it is, and the rooms arrange around it">${s.locked ? "🔓 Unlock" : "🔒 Lock in place"}</button> ${t.w !== t.d ? `<button type="button" class="outline-btn" data-act="srot">⟳ Rotate</button> ` : ""}<button type="button" class="outline-btn" data-act="rm" data-id="${s.id}">Remove</button></span></div>
      <div class="opts sub"><span class="sub-l">Type:</span>${Object.entries(STAIR_TYPES).map(([k, v]) => `<button type="button" class="opt ${k === cur ? "on" : ""}" data-act="stype" data-v="${k}">${v.name}</button>`).join("")}</div>
      <p class="hint">${t.note} About ${r1(s.w * s.h)} sqm on each floor. It sits in the same spot on every floor, so people can go upstairs. ${s.locked ? "🔒 Locked, so it stays here." : "Drag it in the plan to move it, or rotate it."}</p></div>`;
  }
  const g = geometry(S);
  const rn = ["other"].includes(s.type) ? `<label class="field"><span>Name</span><input id="selName" type="text" value="${esc(s.name)}"></label>` : `<strong>${esc(s.name)}</strong>`;
  const flr = S.floors > 1 && !isOutdoor(s) ? `<div class="opts sub"><span class="sub-l">Floor:</span>${Array.from({ length: S.floors }, (_, i) => `<button type="button" class="opt ${s.fl === i ? "on" : ""}" data-act="floor" data-f="${i}">${i === 0 ? "Ground" : i + 1 + (i === 1 ? "nd" : i === 2 ? "rd" : "th")}</button>`).join("")}</div>` : "";
  const kinds = ROOM_KINDS[s.type], curSet = kindSet(s);
  const kindRow = kinds ? `<div class="opts sub kinds"><span class="sub-l">Kind of ${s.type === "bed" ? "bedroom" : s.type === "cr" ? "bathroom" : "room"} <small>(pick any)</small>:</span>${kinds.map(o => `<button type="button" class="opt ${(o === kinds[0] ? !curSet.length : curSet.includes(o[0])) ? "on" : ""}" data-act="rkind" data-v="${o[0]}">${o[2] ? o[2] + " " : ""}${o[1]}</button>`).join("")}</div>` : "";
  const ensRow = s.type === "master" ? `<div class="opts sub kinds"><span class="sub-l">Bathroom:</span><button type="button" class="opt ${s.ensuite !== false ? "on" : ""}" data-act="rens" data-v="1">🚿 Own CR inside (T&B)</button><button type="button" class="opt ${s.ensuite === false ? "on" : ""}" data-act="rens" data-v="0">No own CR</button></div>` : s.type === "bed" ? `<div class="opts sub kinds"><span class="sub-l">Bathroom:</span><button type="button" class="opt ${s.ensuite ? "" : "on"}" data-act="rens" data-v="0">Shared CR outside</button><button type="button" class="opt ${s.ensuite ? "on" : ""}" data-act="rens" data-v="1">🚿 Own CR inside</button></div>${s.ensuite && s.w * s.h < 10 ? `<p class="hint bad">A bedroom with its own CR needs about 10 sqm or more. Make this room bigger so it isn't cramped.</p>` : ""}` : "";
  const wl = isWalled(s), priv = isPrivate(s);
  const wallRow = !isOutdoor(s) || s.type === "garage" ? `<div class="opts sub"><span class="sub-l">Walls:</span><button type="button" class="opt ${wl ? "" : "on"}" data-act="wall" data-v="0">Open (no walls)</button><button type="button" class="opt ${wl ? "on" : ""}" data-act="wall" data-v="1">Walled off</button></div>${!wl && !priv ? `<p class="hint">Left open, like most living rooms and kitchens. Choose "Walled off" if you want it closed.</p>` : ""}` : "";
  return `<div class="sel-box"><div class="sel-head">${rn}<span class="sel-btns"><button type="button" class="outline-btn ${s.locked ? "on" : ""}" data-act="lock" data-id="${s.id}" title="A locked room never moves, resizes or gets pushed by other rooms">${s.locked ? "🔓 Unlock" : "🔒 Lock in place"}</button> <button type="button" class="outline-btn" data-act="rm" data-id="${s.id}">Remove</button></span></div>
    ${s.locked ? `<p class="hint">🔒 Locked — this room stays here, and other rooms arrange themselves around it. Unlock it to move or resize.</p>` : ""}
    <div class="size-row"><label class="field"><span>Width (m)</span><input id="selW" type="number" step="0.1" min="1" value="${r1(s.w)}" ${s.locked ? "disabled" : ""}></label>
    <label class="field"><span>Depth (m)</span><input id="selH" type="number" step="0.1" min="1" value="${r1(s.h)}" ${s.locked ? "disabled" : ""}></label>
    <label class="field"><span>Area</span><b id="selA">${r1(s.w * s.h)} sqm</b></label></div>${kindRow}${ensRow}${flr}${wallRow}</div>`;
}

function updateSelBox() { const el = $("selBox"); if (el) el.innerHTML = selBoxHTML(); }
function updateSelValues() {
  const s = S.layout.spaces.find(x => x.id === laySel);
  if (!s || !$("selW")) return;
  if (document.activeElement !== $("selW")) $("selW").value = r1(s.w);
  if (document.activeElement !== $("selH")) $("selH").value = r1(s.h);
  $("selA").textContent = r1(s.w * s.h) + " sqm";
}

function bindRoomsPanel() {
  const root = $("qBody");
  const L = () => S.layout;
  document.querySelectorAll("[data-room]").forEach(b => b.addEventListener("click", () => {
    const k = b.dataset.room, d = Number(b.dataset.d);
    if (d > 0) {
      if (S.rooms[k] >= maxRooms(S, k)) return;
      if (ROOM_KINDS[k]) { askRoomKind(k, o => { const sp = addSpace(k, o); if (sp) { sp.styles = o.styles; if (k === "bed") sp.ensuite = !!o.ensuite; if (k === "master") sp.ensuite = o.ensuite !== false; } afterLayoutEdit(); }); return; }
      addSpace(k);
    } else removeOne(k);
    afterLayoutEdit();
  }));
  $("suggestBtn").addEventListener("click", () => {
    L().counted = false;
    const keep = L().spaces.filter(isOutdoor);
    L().spaces = keep;
    seedSample();
    afterLayoutEdit();
  });
  $("autoBtn").addEventListener("click", () => { autoLayout(); placeOutdoor(); layoutSync(); layNote = ""; afterLayoutEdit(); });

  root.addEventListener("click", e => {
    const b = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!b) return;
    const act = b.dataset.act, Ls = L();
    const gar = Ls.spaces.find(s => s.type === "garage");
    const relayout = sp => {
      if (!Ls.custom) { autoLayout(); placeOutdoor(); }
      else if (sp) { (isOutdoor(sp) && sp.pos !== "inside") ? placeOutdoor(sp) : placeFree(sp); }
    };
    if (act === "garage") {
      const n = Number(b.dataset.cars);
      if (!n) { if (gar) removeSpace(gar.id); }
      else if (gar) { gar.cars = n; gar.w = CAR_W[n]; gar.h = CAR_D; relayout(gar); }
      else addSpace("garage", { cars: n, pos: "right" });
      Ls.counted = true;
    } else if (act === "gpos" && gar) {
      gar.pos = b.dataset.pos; Ls.counted = true;
      gar.w = CAR_W[gar.cars]; gar.h = CAR_D;
      relayout(gar);
      laySel = gar.id;
    } else if (act === "terrace") {
      const a = Number(b.dataset.area), ter = Ls.spaces.find(s => s.type === "terrace");
      if (!a) { if (ter) removeSpace(ter.id); }
      else if (ter) { const d = dims(a, geometry(S).w); ter.w = d.w; ter.h = d.d; placeOutdoor(ter); const bl = Ls.spaces.find(s => s.type === "balcony"); if (bl) placeOutdoor(bl); Ls.counted = true; }
      else addSpace("terrace", { area: a });
    } else if (act === "balcony") {
      const bl = Ls.spaces.find(s => s.type === "balcony");
      if (b.dataset.v === "0") { if (bl) removeSpace(bl.id); } else if (!bl) addSpace("balcony");
    } else if (act === "addOther") {
      const o = OTHER_ROOMS[Number($("otherSel").value)];
      const need = o[1];
      if (!roomPlan({ ...S, rooms: { ...S.rooms, otherA: S.rooms.otherA + need } }).fits) { layNote = "That room doesn't fit in your floor area. Increase the floor area or remove a room."; renderFloor(); return; }
      const ns = addSpace("other", { name: o[0], area: o[1] });
      if (ns && isShop(ns)) {
        if (hasGroundShop(ns)) {
          if (S.floors > 1 && confirm("You already have a store on the ground floor.\n\nPut this extra store on the upper floor? (Cancel keeps it on the ground floor.)")) { ns.upperOk = true; ns.fl = 1; placeFree(ns); resolveSpace(ns); layFloor = 1; }
        }
        if (!ns.upperOk) { ns.fl = 0; if (!S.layout.custom) { autoLayout(); placeOutdoor(); } else { placeFree(ns); resolveSpace(ns); } layFloor = 0; }
        layoutSync();
      }
    } else if (act === "lock") {
      const sp = Ls.spaces.find(s => s.id === b.dataset.id);
      if (sp && isStair(sp)) toggleStairLock(); else if (sp) { sp.locked = !sp.locked; if (sp.locked) { Ls.custom = true; Ls.counted = true; } }
    } else if (act === "rkind") {
      const sp = Ls.spaces.find(s => s.id === laySel); if (sp) sp.styles = toggleKind(kindSet(sp), b.dataset.v, ROOM_KINDS[sp.type][0][0]);
    } else if (act === "rens") {
      const sp = Ls.spaces.find(s => s.id === laySel); if (sp) sp.ensuite = b.dataset.v === "1";
    } else if (act === "stype") {
      setStairType(b.dataset.v);
    } else if (act === "srot") {
      rotateStairs();
    } else if (act === "rm") { askRemoveSpace(b.dataset.id); }
    else if (act === "pick") { laySel = b.dataset.id; const sp = Ls.spaces.find(s => s.id === laySel); if (sp) layFloor = Math.min(sp.fl, S.floors - 1); }
    else if (act === "wall") {
      const sp = Ls.spaces.find(s => s.id === laySel);
      if (sp) {
        const want = b.dataset.v === "1";
        if (want && !isPrivate(sp) && !confirm(`Wall off the ${sp.name.toLowerCase()}?\n\nRooms like this usually stay open to the rest of the house. Walls add cost and block the view and airflow. Wall it off anyway?`)) { /* stay open */ }
        else sp.walled = want;
      }
    }
    else if (act === "floor") {
      const sp = Ls.spaces.find(s => s.id === laySel);
      if (sp) {
        let f = Number(b.dataset.f);
        if (isShop(sp) && f > 0) {
          if (!hasGroundShop(sp)) { f = 0; layNote = "A store always stays on the ground floor, at the front. Add a second store first if you want one upstairs."; }
          else if (confirm("You already have a store on the ground floor.\n\nPut this extra store on the upper floor?")) sp.upperOk = true;
          else f = 0;
        } else if (isShop(sp)) sp.upperOk = false;
        sp.fl = f; Ls.counted = true; placeFree(sp); resolveSpace(sp); layFloor = sp.fl;
      }
    }
    layNote = layNote && act === "addOther" ? layNote : "";
    afterLayoutEdit();
  });
  root.addEventListener("input", e => {
    const s = S.layout.spaces.find(x => x.id === laySel);
    if (!s) return;
    const g = geometry(S);
    if (e.target.id === "selName") { s.name = e.target.value || SPACE_TYPES[s.type].name; renderFloor(); return; }
    if (e.target.id === "selW" || e.target.id === "selH") {
      const v = parseFloat(e.target.value);
      if (!(v >= 1) || s.locked) return;
      const before = { x: s.x, t: s.t, w: s.w, h: s.h };
      if (e.target.id === "selW") s.w = isOutdoor(s) ? v : Math.min(v, g.w); else s.h = isOutdoor(s) ? v : Math.min(v, g.d);
      if (s.type === "garage") s.cars = s.w > 4.2 ? 2 : 1;
      if (!isOutdoor(s)) { s.x = Math.min(s.x, g.w - s.w); s.t = Math.min(s.t, g.d - s.h); }
      if (isRoomLike(s) && S.layout.spaces.some(o => o !== s && o.locked && o.fl === s.fl && isRoomLike(o) && overlapArea(s, o) > 0.02)) { Object.assign(s, before); return; }
      S.layout.custom = true; resolveSpace(s); layoutSync(); renderFloor(); $("selA").textContent = r1(s.w * s.h) + " sqm";
      if ($("planBox")) updateRoomsUI();
      liveUpdate();
    }
  });
  updateOutBoxes();
}

function updateOutBoxes() {
  if ($("outBox")) $("outBox").innerHTML = outBoxHTML();
  if ($("otherBox")) $("otherBox").innerHTML = otherBoxHTML();
}


/* =========================
   CALCULATION (pure)
========================= */

/* minimum comfortable room sizes (sqm) used for the room planner */
const ROOM_MIN = { living: 10, kitchen: 10, bed: 7.5, master: 11, masterTB: 2.8, cr: 2.2, stairs: 4, circ: 0.08 };
const GARAGE_AREA = [0, 15, 28];     // none, 1 car, 2 cars (sqm)
const GARAGE_DOOR_W = [0, 2.8, 5];   // door width (m)

/* The house footprint is a polygon in house-local metres: x along the front, y ("t") from the front toward the rear.
   st.fp = null means a plain rectangle (from the floor area and the shape chip). The polygon is always rescaled to
   match floorArea / floors, so changing the area keeps the shape. */
const rectPoly = (area, aspect) => { const w = Math.sqrt(area * aspect), d = area / w; return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: d }, { x: 0, y: d }]; };
let geoKey = "", geoVal = null;

function geometry(st) {
  const fp = st.floorArea / st.floors;
  const key = JSON.stringify([fp, st.aspect, st.fp, st.lotArea, st.terrace, st.garage, st.garageOut, st.garageA]);
  if (key === geoKey) return geoVal;
  let poly = st.fp && st.fp.length >= 3 ? st.fp : rectPoly(fp, st.aspect || 4 / 3);
  const area = polyArea(poly);
  if (area > 0 && Math.abs(area - fp) > fp * 0.002) { const k = Math.sqrt(fp / area); poly = poly.map(q => ({ x: q.x * k, y: q.y * k })); }
  const xs = poly.map(q => q.x), ys = poly.map(q => q.y);
  const x0 = Math.min(...xs), t0 = Math.min(...ys);
  const w = Math.max(...xs) - x0, d = Math.max(...ys) - t0;
  const isRect = poly.length === 4 && poly.every((q, i) => { const n = poly[(i + 1) % 4]; return Math.abs(q.x - n.x) < 1e-6 || Math.abs(q.y - n.y) < 1e-6; });
  const T = st.terrace || 0;   // the terrace sits on the ground, outside the floor area
  geoVal = { fp, w, d, x0, t0, poly, isRect, perim: polyPerim(poly), coverage: (fp + T + (st.garage && st.garageOut ? (st.garageA || 0) : 0)) / st.lotArea * 100 };
  geoKey = key;
  return geoVal;
}

/* clip a polygon to a rectangle (Sutherland–Hodgman) */
function clipRectPoly(poly, x, t, w, h) {
  const planes = [p => p.x - x, p => x + w - p.x, p => p.y - t, p => t + h - p.y];
  let out = poly;
  for (const f of planes) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { const k = fa / (fa - fb); out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); }
    }
    if (!out.length) break;
  }
  return out;
}
const clipArea = (poly, x, t, w, h) => { const c = clipRectPoly(poly, x, t, w, h); return c.length >= 3 ? polyArea(c) : 0; };

/* ---------- room planner ---------- */

function roomPlan(st) {
  const r = st.rooms || { bed: 0, master: 0, cr: 0 };
  const gA = st.garage && !st.garageOut ? (st.garageA || GARAGE_AREA[st.garage]) : 0;
  const stairs = st.floors > 1 && !(st.layout && st.layout.noStairs) ? (() => { const t = STAIR_TYPES[(st.layout || {}).stairType] || STAIR_TYPES.straight; return t.w * t.d * st.floors; })() : 0;
  const lines = [
    { key: "living",   name: "Living room",               n: r.living == null ? 1 : r.living,   min: ROOM_MIN.living },
    { key: "kitchen",  name: "Kitchen & dining",          n: r.kitchen == null ? 1 : r.kitchen, min: ROOM_MIN.kitchen },
    { key: "dining",   name: "Dining room",               n: r.dining || 0, min: 8 },
    { key: "master",   name: "Master bedroom",            n: r.master, min: ROOM_MIN.master },
    { key: "masterTB", name: "Master T&B (own bathroom)", n: mT(r), min: ROOM_MIN.masterTB },
    { key: "bed",      name: "Bedroom",                   n: r.bed,    min: ROOM_MIN.bed },
    { key: "cr",       name: "Common CR",                 n: r.cr,     min: ROOM_MIN.cr },
    { key: "other",    name: "Other rooms",               n: r.otherA > 0 ? 1 : 0, min: r.otherA || 0 }
  ];
  const minNet = lines.reduce((a, l) => a + l.n * l.min, 0);
  const avail = st.floorArea - gA - stairs;          // what is left for rooms + hallways
  const need = minNet * (1 + ROOM_MIN.circ);
  const scale = need > 0 ? avail / need : 1;
  const k = Math.min(Math.max(scale, 0.01), 1.5);    // spare area makes rooms bigger (up to 1.5x)
  lines.forEach(l => { l.size = l.min * k; l.total = l.size * l.n; });
  const used = lines.reduce((a, l) => a + l.total, 0);
  return { lines, gA, stairs, avail, need, scale, fits: scale >= 1, minTotal: need + gA + stairs, circ: Math.max(avail - used, 0) };
}

/* biggest number of one room type that still fits, keeping the others as they are */
function maxRooms(st, type) {
  let best = 0;
  for (let n = 0; n <= 12; n++) {
    if (roomPlan({ ...st, rooms: { ...st.rooms, [type]: n } }).fits) best = n; else break;
  }
  return best;
}

/* smallest floor area at which the chosen rooms fit */
function minFloorArea(st) {
  for (let a = 20; a < 1000; a++) if (roomPlan({ ...st, floorArea: a }).fits) return a;
  return 1000;
}

function recommendRooms(st) {
  const a = st.floorArea - (st.garage && !st.garageOut ? (st.garageA || GARAGE_AREA[st.garage]) : 0);
  const tiers = [
    [30,  { bed: 1, master: 0, cr: 1 }],
    [45,  { bed: 2, master: 0, cr: 1 }],
    [75,  { bed: 2, master: 1, cr: 1 }],
    [105, { bed: 3, master: 1, cr: 1 }],
    [140, { bed: 3, master: 1, cr: 2 }],
    [180, { bed: 4, master: 2, cr: 2 }],
    [1e9, { bed: 5, master: 2, cr: 3 }]
  ];
  const rec = { ...tiers.find(t => a < t[0])[1] };
  while (!roomPlan({ ...st, rooms: rec }).fits && rec.bed + rec.master + rec.cr > 2) {
    if (rec.bed > 1) rec.bed--; else if (rec.cr > 1) rec.cr--; else if (rec.master > 0) rec.master--; else break;
  }
  return rec;
}

/* ---------- terrace / balcony / garage geometry ---------- */

function dims(area, W) {
  const w = Math.min(W * 0.9, Math.max(3, area / 3));
  return { w, d: area / w };
}

function extrasInfo(st, g) {
  const L = st.layout, sp = k => (L ? L.spaces.find(s => s.type === k) : null);
  const gs = sp("garage"), ts = sp("terrace"), bs = sp("balcony");
  const cars = gs ? gs.cars : 0;
  const gOut = !!gs && !!st.garageOut;
  const T = ts ? ts.w * ts.h : 0;
  const bal = st.floors >= 2 && !!bs;
  const B = bal ? bs.w * bs.h : 0;
  const gA = gs ? gs.w * gs.h : 0;
  return {
    cars, gA, gW: GARAGE_DOOR_W[cars], gOut, gIn: cars && !gOut ? gA : 0, gs, ts, bs,
    T, B, bal, over: T > 0 && bal && overlapArea(ts, bs) > 0.5 * B,
    td: ts ? { w: ts.w, d: ts.h } : null,
    bd: bal ? { w: bs.w, d: bs.h } : null
  };
}

function projectDays(st) {
  return Math.ceil(st.floorArea * 1.2 + st.floors * 10 + (st.fence ? 5 : 0)
    + (st.garage ? 3 : 0) + (st.terrace ? 4 : 0) + (st.balcony && st.floors >= 2 ? 5 : 0) + (window.LotItems ? LotItems.days(st) : 0));
}


/* =========================
   MAIN CALCULATION
========================= */

function calc(st) {
  const g = geometry(st);
  const { fp, w, d } = g;
  const fl = st.floors;
  const total = st.floorArea;
  const ex = extrasInfo(st, g);
  const plan = roomPlan(st);
  const R = st.rooms || { bed: 0, master: 0, cr: 0 };
  const line = k => plan.lines.find(x => x.key === k);

  const ext = g.perim * WALL_H * fl;                // exterior wall area
  const extDoorA = 2 * 1.9;                             // main door + back door
  const garageDoorA = ex.cars && !ex.gOut ? ex.gW * 2.2 : 0;

  /* interior divisions, worked out from the rooms */
  const askedWalls = ((st.layout && st.layout.spaces) || []).filter(x => x.walled === true && !isPrivate(x)).reduce((a, x) => a + 2 * Math.sqrt(x.w * x.h), 0);   // open rooms the person chose to wall off
  const dryLen = R.master * 2.2 * Math.sqrt(line("master").size) + R.bed * 2.2 * Math.sqrt(line("bed").size) + 3 + askedWalls;
  const wetSet = [[R.cr, line("cr").size], [mT(R), line("masterTB").size]];
  const wetLen = wetSet.reduce((a, s) => a + s[0] * 2.2 * Math.sqrt(s[1]), 0);
  const wetTileA = wetSet.reduce((a, s) => a + s[0] * Math.max(4 * Math.sqrt(s[1]) * 2.1 - 1.4, 0), 0);
  const dryP = Math.max(dryLen * WALL_H - (R.bed + R.master) * 1.6, 0);    // minus bedroom doors
  const wetP = Math.max(wetLen * WALL_H - (R.cr + mT(R)) * 1.4, 0);     // minus bathroom doors
  const doorsN = R.bed + R.master * 2 + R.cr + 2;

  const item = (key, name, qty, unit) => ({ key, name, qty, unit });
  const cats = [];

  /* Foundation & structure */
  const sv = fp * 0.14 + total * 0.05 + (fl - 1) * fp * 0.12;
  const rebarS = Math.ceil(sv * 95);
  cats.push({
    name: "Foundation & Structure", icon: "🏗",
    items: [
      item("rebar", "Reinforcing steel bars (rebar)", rebarS, "kg"),
      item("cement", "Cement (40 kg sack)", Math.ceil(sv * 9), "sacks"),
      item("sand", "Sand", r1(sv * 0.5), "m³"),
      item("gravel", "Gravel", r1(sv), "m³"),
      item("tiewire", "Tie wire", Math.ceil(rebarS * 0.012), "kg")
    ]
  });

  /* Exterior walls, glass walls & windows */
  const gs = Math.min(Math.max(st.glass || 0, 0), 1);
  const wd = st.windows || { count: 0, w: 1.2, h: 1.1 };
  const extSolid = ext * (1 - gs);
  const winUnit = Math.max(wd.w * wd.h, 0.01);
  // windows only go in the solid part of the wall, and can use at most 60% of it
  const winN = gs >= 1 ? 0 : Math.max(0, Math.min(Math.round(wd.count), Math.floor(extSolid * 0.6 / winUnit)));
  const winArea = winN * winUnit;
  const glassA = ext * gs;
  const wallA = Math.max(extSolid - winArea - extDoorA - garageDoorA, 0);

  let wallItems;
  if (st.walls === "wood") {
    wallItems = [
      item("lumber", "Lumber (studs & siding)", Math.ceil(wallA * 9), "bd.ft"),
      item("plywood", "Plywood panels", Math.ceil(wallA / 2.98 * 0.5), "sheets"),
      item("nails", "Nails", Math.ceil(wallA * 0.15), "kg"),
      item("varnish", "Wood preservative / varnish", Math.ceil(wallA / 12), "gal")
    ];
  } else {
    // concrete hollow block wall: blocks laid with reinforcement, plastered both sides
    wallItems = [
      item("chb", 'Hollow blocks 8"×16" (CHB)', Math.ceil(wallA * 12.5), "pcs"),
      item("cement", "Cement (40 kg sack) — laying + plaster", Math.ceil(wallA), "sacks"),
      item("sand", "Sand — laying + plaster", r1(wallA * 0.07), "m³"),
      item("rebar", "Wall reinforcement bars (10 mm)", Math.ceil(wallA), "kg"),
      item("tiewire", "Tie wire", Math.ceil(wallA * 0.012), "kg")
    ];
  }
  cats.push({ name: "Exterior Walls — " + WALLS[st.walls].name, icon: WALLS[st.walls].icon, items: wallItems });

  if (glassA > 0) {
    cats.push({
      name: `Glass Walls (${Math.round(gs * 100)}% of exterior)`, icon: "🪟",
      items: [
        item("glass", "Tempered glass panels", r1(glassA), "m²"),
        item("aluminum", "Aluminum framing / mullions", Math.ceil(glassA * 2.6), "m"),
        item("tubesteel", "Steel tube posts (support)", Math.ceil(glassA * 0.8), "m"),
        item("sealant", "Glazing sealant (tube)", Math.ceil(glassA / 2.5), "tubes")
      ]
    });
  }

  if (winN > 0) {
    cats.push({
      name: `Windows (${winN} pcs, ${wd.w} × ${wd.h} m each)`, icon: "🪟",
      items: [
        item("glass", "Window glass", r1(winArea), "m²"),
        item("aluminum", "Aluminum window frames", Math.ceil(winN * 2 * (wd.w + wd.h)), "m"),
        item("lintel", "Concrete lintel & sill", r1(winN * (wd.w + 0.6)), "m"),
        item("sealant", "Sealant (tube)", Math.ceil(winN / 4), "tubes")
      ]
    });
  }

  /* Interior divisions between rooms */
  const pn = PARTITIONS[st.partitions] ? st.partitions : "chb4";
  let partItems;
  if (pn === "chb4") {
    partItems = [
      item("chb", 'Hollow blocks 8"×16" (CHB)', Math.ceil(dryP * 12.5), "pcs"),
      item("cement", "Cement (40 kg sack) — laying + plaster", Math.ceil(dryP * 0.9), "sacks"),
      item("sand", "Sand — laying + plaster", r1(dryP * 0.07), "m³"),
      item("rebar", "Reinforcement bars (10 mm)", Math.ceil(dryP * 0.5), "kg"),
      item("tiewire", "Tie wire", Math.ceil(dryP * 0.006), "kg")
    ];
  } else if (pn === "plywood") {
    partItems = [
      item("plywood6", '1/4" Plywood (both faces)', Math.ceil(dryP * 2 * 1.1 / 2.98), "sheets"),
      item("lumber", "Wood studs & plates (2×2)", Math.ceil(dryP * 3), "bd.ft"),
      item("nails", "Nails", Math.ceil(dryP * 0.1), "kg")
    ];
  } else {
    partItems = [
      item("gypsum", '1/2" Gypsum board (both faces)', Math.ceil(dryP * 2 * 1.08 / 2.98), "sheets"),
      item("metalstud", "Metal studs & tracks", Math.ceil(dryP * 2.3), "m"),
      item("drywallscrew", "Drywall screws (box of 1,000)", Math.ceil(dryP * 0.05), "boxes"),
      item("compound", "Joint compound (pail)", Math.ceil(dryP * 2 / 30), "pails")
    ];
  }
  cats.push({ name: "Room Dividers — " + PARTITIONS[pn].name, icon: PARTITIONS[pn].icon, items: partItems });

  /* Bathrooms: always masonry + tiles, whatever the other dividers are */
  cats.push({
    name: "Bathroom Walls & Fixtures", icon: "🚿",
    items: [
      item("chb", 'Hollow blocks 8"×16" (bathroom walls)', Math.ceil(wetP * 12.5), "pcs"),
      item("cement", "Cement (40 kg sack) — laying + plaster", Math.ceil(wetP * 0.9), "sacks"),
      item("sand", "Sand", r1(wetP * 0.07), "m³"),
      item("rebar", "Reinforcement bars (10 mm)", Math.ceil(wetP * 0.5), "kg"),
      item("tile", "Wall tiles (up to 2.1 m high)", Math.ceil(wetTileA * 1.1), "m²"),
      item("adhesive", "Tile adhesive (25 kg bag)", Math.ceil(wetTileA / 4), "bags"),
      item("fixture", "Toilet & lavatory set (with faucet & shower)", R.cr + mT(R), "sets")
    ]
  });

  /* Roof */
  const roofA = fp * 1.3;
  const sheets = Math.ceil(roofA / 1.8);
  cats.push({
    name: "Roofing", icon: "🏠",
    items: [
      item("roofsheet", "Corrugated roofing sheets", sheets, "pcs"),
      item("truss", "Roof trusses", Math.ceil(fp / 7), "pcs"),
      item("purlin", "C-purlins (6 m)", Math.ceil(roofA / 4), "pcs"),
      item("ridge", "Ridge roll", Math.ceil(w / 2.4), "pcs"),
      item("screws", "Roofing screws (box)", Math.ceil(sheets / 12), "boxes")
    ]
  });

  /* Garage */
  if (ex.cars > 0) {
    const v = ex.gA * 0.1;
    const gItems = [
        item("cement", "Cement — floor slab (100 mm)", Math.ceil(v * 9), "sacks"),
        item("sand", "Sand", r1(v * 0.5), "m³"),
        item("gravel", "Gravel", r1(v), "m³"),
        item("rebar", "Slab reinforcement", Math.ceil(ex.gA * 2.5), "kg"),
        item("garagedoor", "Roll-up garage door", ex.gW, "m wide")
    ];
    if (ex.gOut) {   // a separate garage building needs its own walls and roof
      const gw = ex.gs.w, gh = ex.gs.h, wallG = Math.max(2 * (gw + gh) * 2.7 - ex.gW * 2.2, 0), roofG = gw * gh * 1.2;
      gItems.push(
        item("chb", 'Hollow blocks 8"×16" (garage walls)', Math.ceil(wallG * 12.5), "pcs"),
        item("cement", "Cement — block laying & plaster", Math.ceil(wallG), "sacks"),
        item("rebar", "Columns & wall reinforcement", Math.ceil(wallG * 3), "kg"),
        item("roofsheet", "Garage roofing sheets", Math.ceil(roofG / 1.8), "pcs"),
        item("purlin", "C-purlins (6 m)", Math.ceil(roofG / 4), "pcs"),
        item("tubesteel", "Steel tube roof frame", Math.ceil(roofG * 1.5), "m")
      );
    }
    cats.push({
      name: `Garage (${ex.cars} car${ex.cars > 1 ? "s" : ""}, ${r1(ex.gA)} sqm${ex.gOut ? ", separate building" : ", inside the house"})`, icon: "🚗",
      items: gItems
    });
  }

  /* Terrace (ground level) */
  if (ex.T > 0) {
    const v = ex.T * 0.1 + 0.43;   // 100 mm slab + 4 columns
    const tItems = [
      item("cement", "Cement — slab & columns", Math.ceil(v * 9), "sacks"),
      item("sand", "Sand", r1(v * 0.5), "m³"),
      item("gravel", "Gravel", r1(v), "m³"),
      item("rebar", "Slab & column reinforcement", Math.ceil(ex.T * 2.5 + 0.43 * 120), "kg"),
      item("outtile", "Outdoor floor tiles", Math.ceil(ex.T * 1.1), "m²"),
      item("adhesive", "Tile adhesive (25 kg bag)", Math.ceil(ex.T / 4), "bags")
    ];
    if (!ex.over) {   // with a balcony above, its slab is the terrace roof
      tItems.push(
        item("roofsheet", "Terrace roofing sheets", Math.ceil(ex.T * 1.15 / 1.8), "pcs"),
        item("purlin", "C-purlins (6 m)", Math.ceil(ex.T * 1.15 / 4), "pcs"),
        item("tubesteel", "Steel tube roof frame", Math.ceil(ex.T * 1.5), "m")
      );
    }
    cats.push({ name: `Terrace (${ex.T} sqm${ex.over ? ", balcony above" : ", covered"})`, icon: "🌿", items: tItems });
  }

  /* Balcony (upper floor) */
  if (ex.bal) {
    const v = ex.B * 0.125 * 1.4;   // 125 mm slab + edge beams
    const rail = ex.bd.w + 2 * ex.bd.d;
    cats.push({
      name: `Balcony (${r1(ex.B)} sqm, 2nd floor)`, icon: "🏙",
      items: [
        item("cement", "Cement — elevated slab & beams", Math.ceil(v * 9), "sacks"),
        item("sand", "Sand", r1(v * 0.5), "m³"),
        item("gravel", "Gravel", r1(v), "m³"),
        item("rebar", "Slab & beam reinforcement", Math.ceil(v * 110), "kg"),
        item("plywood", "Plywood formwork", Math.ceil(ex.B / 2.98), "sheets"),
        item("lumber", "Formwork lumber & props", Math.ceil(ex.B * 12), "bd.ft"),
        item("outtile", "Outdoor floor tiles", Math.ceil(ex.B * 1.1), "m²"),
        item("railing", "Metal / glass railing", Math.ceil(rail), "m"),
        item("slidingdoor", "Sliding glass door", 1, "pc")
      ]
    });
  }

  /* Doors, windows & finishes */
  const paintFaces = (st.walls === "wood" ? 0 : 2 * wallA) + 2 * dryP + wetP;
  const fin = [
    item("door", "Doors", doorsN, "pcs"),
    item("tile", "Floor tiles", Math.ceil(Math.max(total - ex.gIn, 0) * 1.1), "m²"),
    item("adhesive", "Tile adhesive (25 kg bag)", Math.ceil(Math.max(total - ex.gIn, 0) / 4), "bags")
  ];
  if (paintFaces > 0) fin.push(item("paint", "Paint", Math.ceil(paintFaces / 15), "gal"));
  cats.push({ name: "Doors & Finishes", icon: "🚪", items: fin });

  /* Utilities */
  cats.push({
    name: "Electrical & Plumbing", icon: "💡",
    items: window.Elec && Elec.isSet(st) ? Elec.items(st, item) : [   // the detailed list once the owner answered the electrical question
      item("elec", "Electrical (wires, conduits, breakers, fixtures)", Math.ceil(total), "sqm floor"),
      item("plumb", "Plumbing (pipes, fittings)", Math.ceil(total), "sqm floor")
    ]
  });

  /* Fence: the material follows the type the person chose */
  const fk = fenceKind(st.fence);
  if (fk) {
    const per = Math.max(polyPerim(st.lot.pts) - 3, 0);
    let fi;
    if (fk === "chb") {
      const fa = per * 1.8;
      fi = [item("chb", 'Hollow blocks 8"×16" (fence)', Math.ceil(fa * 12.5), "pcs"), item("cement", "Cement (40 kg sack)", Math.ceil(fa * 0.8), "sacks"), item("sand", "Sand", r1(fa * 0.06), "m³"),
        item("rebar", "Reinforcing steel bars (rebar)", Math.ceil(fa * 1.2), "kg"), item("gate", "Steel gate", 1, "pc")];
    } else if (fk === "chbsteel") {
      const fa = per * 0.6;
      fi = [item("chb", 'Hollow blocks 8"×16" (low wall)', Math.ceil(fa * 12.5), "pcs"), item("cement", "Cement (40 kg sack)", Math.ceil(fa * 0.8 + per * 0.1), "sacks"), item("sand", "Sand", r1(fa * 0.06), "m³"),
        item("rebar", "Reinforcing steel bars (rebar)", Math.ceil(fa * 1.2), "kg"), item("fencepanel", "Steel bar fence panels (1.2 m high)", Math.ceil(per), "m"), item("gate", "Steel gate", 1, "pc")];
    } else if (fk === "steel") {
      const posts = Math.ceil(per / 2.5) + 1;
      fi = [item("wirepost", "Steel posts", posts, "pcs"), item("fencepanel", "Steel pickets / fence panels (1.5 m high)", Math.ceil(per), "m"), item("cement", "Cement (post footings)", Math.ceil(posts * 0.5), "sacks"),
        item("sand", "Sand", r1(posts * 0.04), "m³"), item("gravel", "Gravel", r1(posts * 0.04), "m³"), item("gate", "Steel gate", 1, "pc")];
    } else if (fk === "wire") {
      const posts = Math.ceil(per / 3) + 1;
      fi = [item("wirepost", "GI pipe posts", posts, "pcs"), item("gimesh", "Chain-link / GI wire mesh (1.5 m high)", Math.ceil(per * 1.5), "m²"), item("tiewire", "Tie wire", Math.ceil(per * 0.15), "kg"),
        item("cement", "Cement (post footings)", Math.ceil(posts * 0.4), "sacks"), item("sand", "Sand", r1(posts * 0.03), "m³"), item("gate", "Steel gate", 1, "pc")];
    } else if (fk === "bamboo") {
      fi = [item("bamboo", "Bamboo poles", Math.ceil(per * 7), "pcs"), item("woodpost", "Hardwood posts", Math.ceil(per / 2.5) + 1, "pcs"), item("tiewire", "Tie wire", Math.ceil(per * 0.12), "kg"), item("bgate", "Bamboo gate", 1, "pc")];
    } else {
      fi = [item("lumber", "Treated lumber pickets & rails", Math.ceil(per * 9), "bd.ft"), item("woodpost", "Hardwood posts", Math.ceil(per / 2.4) + 1, "pcs"), item("nails", "Nails", Math.ceil(per * 0.08), "kg"),
        item("paint", "Wood paint / sealer (can)", Math.ceil(per / 25), "cans"), item("woodgate", "Wooden gate", 1, "pc")];
    }
    cats.push({ name: "Perimeter Fence — " + FENCES[fk].name, icon: "🚧", items: fi });
  }

  /* staircase between the floors (one flight per floor above the ground floor) */
  if (st.floors > 1 && !(st.layout && st.layout.noStairs)) {
    const sty = (st.layout && STAIR_TYPES[st.layout.stairType] && st.layout.stairType) || "straight";
    cats.push({ name: "Staircase — " + STAIR_TYPES[sty].name, icon: "🪜", items: [item("stair_" + sty, "Staircase, " + STAIR_TYPES[sty].name.toLowerCase() + " (per flight)", st.floors - 1, "flight")] });
  }

  roomChoiceCats(st, item).forEach(c => cats.push(c));

  /* other buildings and features on the lot */
  if (window.LotItems) LotItems.cats(st, item).forEach(c => cats.push(c));

  /* extras requested in the reference chat */
  if (st.extraItems && st.extraItems.length) {
    cats.push({
      name: "Requested extras", icon: "✨",
      items: st.extraItems.map(x => ({ key: "x_" + x.id, xid: x.id, extra: true, name: x.name, qty: Number(x.qty) || 0, unit: x.unit || "pc", price: Number(x.price) || 0 }))
    });
  }

  /* Price everything */
  let matTotal = 0;
  const keyTotals = {};
  cats.forEach(c => {
    c.items = c.items.filter(i => i.qty > 0);
    c.total = 0;
    c.items.forEach(i => {
      i.cost = i.qty * (i.extra ? i.price : prices[i.key]);
      c.total += i.cost;
      keyTotals[i.key] = (keyTotals[i.key] || 0) + i.qty;
    });
    matTotal += c.total;
  });
  const shownCats = cats.filter(c => c.items.length > 0);

  /* Labor — masonry-heavy dividers need masons, board dividers need carpenters */
  const duration = projectDays(st);
  const adj = { mason: pn === "chb4" ? 1 : 0.8, carpenter: pn === "chb4" ? 1 : 1.3 };
  let laborTotal = 0, headcount = 0;
  const rows = st.crew.map(c => {
    const auto = Math.max(1, Math.round(duration * c.factor * (adj[c.id] || 1)));
    const days = c.days != null ? c.days : auto;
    const cost = c.count * c.rate * days;
    laborTotal += cost;
    headcount += c.count;
    return { ...c, days, auto, daysEdited: c.days != null, cost };
  });

  /* how the job is paid */
  const pay = Object.assign(defaultPay(), st.pay || {});
  const crewCost = laborTotal;
  const paidLabor = pay.type === "pakyawan" && pay.pakyawan != null ? Math.max(0, Number(pay.pakyawan) || 0) : crewCost;
  const permits = matTotal * 0.08;
  const feeBase = matTotal + paidLabor + permits;
  const contingency = feeBase * 0.05;
  const fee = pay.type === "contractor" ? (pay.feeMode === "fixed" ? Math.max(0, Number(pay.feeFixed) || 0) : feeBase * (Math.max(0, Number(pay.feePct) || 0) / 100)) : 0;
  const totalCost = feeBase + contingency + fee;

  return {
    g, cats: shownCats, matTotal, keyTotals,
    labor: { rows, total: laborTotal, headcount, duration },
    permits, contingency, total: totalCost,
    pay: { type: pay.type, feeMode: pay.feeMode, feePct: pay.feePct, showFee: pay.showFee, fixedPrice: pay.type === "pakyawan" && pay.pakyawan != null, crewCost, labor: paidLabor, margin: paidLabor - crewCost, fee, feeBase },
    plan, ex,
    wallInfo: { winN, winArea, glassA, extSolid, dryP, wetP }
  };
}

/* biggest floor area that still fits the budget (never smaller than the rooms need) */
function fitArea(st) {
  let a = st.floorArea;
  const lo = Math.max(20, minFloorArea(st));
  while (a > lo && calc({ ...st, floorArea: a }).total > st.budget) a -= 1;
  return a;
}


/* =========================
   SIDEBAR
========================= */

function answerText(id) {
  switch (id) {
    case "lot":       return `${num(r1(S.lotArea))} sqm lot · ${num(S.floorArea)} sqm house · ${S.floors === 1 ? "1 floor" : S.floors + " floors"}${window.LotItems && LotItems.count() ? ` · +${LotItems.count()} on the lot` : ""}`;
    case "floorArea": return `${num(S.floorArea)} sqm total`;
    case "floors":    return S.floors === 1 ? "1 floor (bungalow)" : `${S.floors} floors`;
    case "rooms": {
      const R = S.rooms, t = [`${R.bed} bed`, `${R.master} master`, `${R.cr} CR`];
      if (S.garage) t.push(`${S.garage}-car garage${S.garageOut ? " (outside)" : ""}`);
      if (S.terrace) t.push("terrace");
      if (S.balcony && S.floors >= 2) t.push("balcony");
      return t.join(" · ") + (roomPlan(S).fits ? "" : " ⚠ too tight");
    }
    case "partitions": return PARTITIONS[S.partitions].name;
    case "walls":     return [WALLS[S.walls].name, S.glass ? `${Math.round(S.glass * 100)}% glass` : "", S.glass >= 1 ? "" : `${S.windows.count} windows`].filter(Boolean).join(" · ");
    case "glass":     return S.glass === 0 ? "0% — all solid" : `${Math.round(S.glass * 100)}% glass`;
    case "windows":   return S.glass >= 1 ? "Not needed (full glass)" : `${S.windows.count} windows · ${S.windows.w}×${S.windows.h} m`;
    case "fence":     return fenceKind(S.fence) ? FENCES[fenceKind(S.fence)].name : "No fence";
    case "elec":      return window.Elec ? Elec.summary(S) : "";
    case "budget":    return peso(S.budget);
    case "labor": {
      const cc = calc(S), l = cc.labor;
      return `${PAY_TYPES.find(t => t.id === cc.pay.type).name} · ${l.headcount} workers · ${l.duration} days`;
    }
  }
  return "";
}

function renderSidebar() {
  const vis = visibleSteps();
  const done = vis.filter(stepDone).length;
  $("sideCount").textContent = `${done} of ${vis.length} answered`;
  $("sideProgress").style.width = (done / vis.length * 100) + "%";
  const fromTpl = st => S.tplFilled && [st.id, ...guestsOf(st.id).map(g => g.id)].some(id => S.tplFilled.includes(id));

  $("qList").innerHTML = vis.map((i, n) => {
    const s = STEPS[i], ok = stepDone(i);
    return `
    <li class="q-item ${ok ? "done" : ""} ${editing === i ? "current" : ""}">
      <span class="q-num">${ok ? "✓" : n + 1}</span>
      <div class="q-text">
        <small>${s.title}${ok && fromTpl(s) ? ` <em class="tpl-tag">template</em>` : ""}</small>
        <strong>${ok ? esc(answerText(s.id)) : "Not answered yet"}</strong>
      </div>
      <button class="q-edit" onclick="openQuestion(${i})">${ok ? "Edit" : "Answer"}</button>
    </li>`;
  }).join("");
}


/* =========================
   QUESTION CARD
========================= */

const allAnswered = () => visibleSteps().every(stepDone);

const ROOM_TYPES = [
  { key: "master", name: "Master bedrooms", note: "own bathroom (T&B) by default, you choose when adding" },
  { key: "bed",    name: "Bedrooms",         note: "regular bedrooms" },
  { key: "cr",     name: "Common CR",        note: "shared comfort rooms for the rest of the house" },
  { key: "living", name: "Living room",      note: "main sitting area" },
  { key: "kitchen", name: "Kitchen & dining", note: "cooking and eating area" },
  { key: "dining", name: "Separate dining room", note: "only if you want it apart from the kitchen" }
];

const suggestedWindows = () => S.rooms.bed + S.rooms.master + S.rooms.cr + 3;   // 1 per bedroom/CR + living (2) + kitchen (1)

const roomDims = a => `${r1(Math.sqrt(a / 1.15))} × ${r1(Math.sqrt(a * 1.15))} m`;

function updateRoomsUI() {
  if (!$("planBox")) return;
  const plan = roomPlan(S);

  ROOM_TYPES.forEach(t => {
    const mx = maxRooms(S, t.key);
    $("n_" + t.key).textContent = S.rooms[t.key];
    $("max_" + t.key).innerHTML = `Max <b>${mx}</b>`;
    const plus = document.querySelector(`[data-room="${t.key}"][data-d="1"]`);
    const minus = document.querySelector(`[data-room="${t.key}"][data-d="-1"]`);
    if (plus) plus.disabled = S.rooms[t.key] >= mx;
    if (minus) minus.disabled = S.rooms[t.key] <= 0;
  });

  updateOutBoxes();
  if (!$("selBox").innerHTML) updateSelBox();

  const rows = plan.lines.filter(l => l.n > 0).map(l => `
    <tr><td>${l.name}</td><td class="num">${l.key === "other" ? "" : l.n}</td>
    <td class="num">${r1(l.size)} sqm <small>(${roomDims(l.size)})</small></td><td class="num">${r1(l.total)} sqm</td></tr>`).join("");
  const extra = [];
  if (plan.stairs) extra.push(["Stairs", plan.stairs]);
  if (plan.gA) extra.push([`Garage (${S.garage} car${S.garage > 1 ? "s" : ""}, inside the house)`, plan.gA]);
  extra.push(["Hallways & circulation", plan.circ]);
  const pct = Math.min(plan.need / Math.max(plan.avail, 0.01) * 100, 100);

  const R = S.rooms;
  let warn = "";
  if (!plan.fits) warn = `⚠ Your rooms need at least <b>${Math.ceil(plan.minTotal)} sqm</b> of floor area (you have ${num(S.floorArea)} sqm). Remove a room, drop the garage, or increase the floor area.`;
  else if (R.bed + R.master === 0) warn = "⚠ Add at least one bedroom.";
  else if (R.master + R.cr === 0) warn = "⚠ Add at least one bathroom (a master bedroom or a common CR).";

  $("planBox").innerHTML = `
    <div class="plan-head">
      <span>Your ${num(S.floorArea)} sqm${plan.gA || plan.stairs ? ` − ${r1(plan.gA + plan.stairs)} sqm (${[plan.gA ? "garage" : "", plan.stairs ? "stairs" : ""].filter(Boolean).join(" + ")})` : ""} leaves <b>${r1(plan.avail)} sqm</b> for rooms</span>
      <span>${plan.fits ? "Fits ✓" : "Too tight"}</span>
    </div>
    <div class="progress"><div style="width:${pct}%;background:${plan.fits ? (pct > 92 ? "#f59e0b" : "#16a34a") : "#dc2626"}"></div></div>
    ${warn ? `<p class="hint warn">${warn}</p>` : ""}
    <div class="table-wrap"><table class="data-table">
      <thead><tr><th>Room</th><th class="num">Count</th><th class="num">Suggested size each</th><th class="num">Total</th></tr></thead>
      <tbody>${rows}${extra.map(e => `<tr class="muted-row"><td>${e[0]}</td><td></td><td></td><td class="num">${r1(e[1])} sqm</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="hint">Sizes grow when you have spare area and shrink when it gets tight. Minimums used: bedroom ${ROOM_MIN.bed} sqm, master ${ROOM_MIN.master} sqm + ${ROOM_MIN.masterTB} sqm T&B, CR ${ROOM_MIN.cr} sqm, living ${ROOM_MIN.living} sqm, kitchen & dining ${ROOM_MIN.kitchen} sqm.</p>`;
}

function openQuestion(i) {
  i = hostIdx(i);
  snapshot = JSON.parse(JSON.stringify(S));
  editing = i;
  modeForEdit();
  renderQuestion();
  renderSidebar();
  renderActiveView();
  $("questionCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function cancelEdit() {
  if (snapshot) Object.assign(S, JSON.parse(JSON.stringify(snapshot)));
  editing = null;
  refreshAll();
}

function saveQuestion() {
  if (STEPS[editing].id === "lot" && !lotValid()) { updateLotPanelValues(); return; }
  S.floorArea = Math.max(20, S.floorArea);
  S.budget = Math.max(100000, S.budget);
  answered[editing] = true;
  if (STEPS[editing].id === "elec" && window.Elec) Elec.markSet();
  guestsOf(STEPS[editing].id).forEach(g => { answered[stepIdx(g.id)] = true; });
  if (S.tplFilled) { const ids = [STEPS[editing].id, ...guestsOf(STEPS[editing].id).map(g => g.id)]; S.tplFilled = S.tplFilled.filter(x => !ids.includes(x)); }
  const next = nextOpen();
  editing = next === -1 ? null : next;
  snapshot = JSON.parse(JSON.stringify(S));
  refreshAll();
}

function goBack() {
  const v = visibleSteps(), k = v.indexOf(editing);
  if (k > 0) openQuestion(v[k - 1]);
}

function numberField(id, label, unit, val, min, step, prefix) {
  return `<label class="field"><span>${label}</span>
    <div class="input-suffix">
      ${prefix ? `<em class="prefix">${prefix}</em>` : ""}
      <input id="${id}" type="number" min="${min}" step="${step}" value="${val}">
      ${unit ? `<em>${unit}</em>` : ""}
    </div></label>`;
}

function chipsHTML(inputId, values, fmt) {
  return `<div class="chips">${values.map(v =>
    `<button type="button" class="chip" data-input="${inputId}" data-v="${v}">${fmt(v)}</button>`).join("")}</div>`;
}

function choiceItems(id) {
  if (id === "floors") return [
    { val: 1, icon: "🏠", title: "1 floor", desc: "Bungalow. Biggest footprint, simplest and cheapest per sqm." },
    { val: 2, icon: "🏡", title: "2 floors", desc: "Smaller footprint, more yard. Needs an elevated slab and stairs." },
    { val: 3, icon: "🏢", title: "3 floors", desc: "Compact footprint on a small lot. Heavier structure." }
  ];
  if (id === "walls") return Object.keys(WALLS).map(k => ({ val: k, icon: WALLS[k].icon, title: WALLS[k].name, desc: WALLS[k].desc }));
  if (id === "partitions") return Object.keys(PARTITIONS).map(k => ({ val: k, icon: PARTITIONS[k].icon, title: PARTITIONS[k].name, desc: PARTITIONS[k].desc }));
  if (id === "glass") return [
    { val: 0,    icon: "🧱", title: "0% — all solid", desc: "Plastered block walls only. Lowest cost; add windows on the next question." },
    { val: 0.25, icon: "🪟", title: "25% glass",      desc: "A glass feature section, the rest solid wall." },
    { val: 0.5,  icon: "🏠", title: "50% glass",      desc: "Half solid wall, half glass." },
    { val: 0.75, icon: "🏢", title: "75% glass",      desc: "Mostly glass with a solid section." },
    { val: 1,    icon: "💎", title: "100% glass",     desc: "Fully glass exterior. Most expensive; needs steel posts and shading." }
  ];
  if (id === "fence") return Object.keys(FENCES).map(k => ({ val: k, icon: FENCES[k].icon, title: FENCES[k].name, desc: FENCES[k].desc }))
    .concat([{ val: false, icon: "🌿", title: "No fence for now", desc: "You can build it later when budget allows." }]);
  return [];
}

function choiceHTML(id) {
  const items = choiceItems(id);
  return `<div class="choices">${items.map((it, i) => `
    <button type="button" class="choice ${it.val === (id === "fence" ? (fenceKind(S.fence) || false) : S[id]) ? "selected" : ""}" data-i="${i}">
      <span class="choice-icon">${it.icon}</span>
      <strong>${it.title}</strong>
      <small>${it.desc}</small>
    </button>`).join("")}</div>`;
}

const SECTION_TITLES = { lot: "Your lot", floorArea: "Your house", floors: "Floors", walls: "Exterior walls", glass: "Glass", windows: "Windows" };
function bodyHTML(id) {
  const gs = guestsOf(id);
  if (!gs.length) return bodyHTML1(id);
  return [id, ...gs.map(g => g.id)].map(k => `<section class="q-sec"><h4 class="q-sec-h">${SECTION_TITLES[k] || k}</h4>${bodyHTML1(k, true)}</section>`).join("");
}
function bodyHTML1(id, merged) {
  switch (id) {
    case "lot":
      return lotPanelHTML();
    case "floorArea":
      return floorAreaPanelHTML(merged);
    case "floors":
      return choiceHTML("floors") + (merged ? "" : `<p class="hint" id="hint"></p>`);
    case "rooms":
      return roomsPanelHTML();
    case "partitions":
      return choiceHTML("partitions") + `<p class="hint" id="hint"></p>`;
    case "walls":
      return choiceHTML("walls");
    case "glass":
      return choiceHTML("glass") + `<p class="hint" id="hint"></p>`;
    case "windows": {
      if (S.glass >= 1) return `<p class="hint">Not needed — your exterior walls are fully glass, so the windows are already included.</p>`;
      const sizes = [["Small", 0.6, 0.6], ["Standard", 1.2, 1.1], ["Large", 1.5, 1.2], ["Tall", 1.2, 2.1]];
      return numberField("wCount", "How many windows (whole house)", "pcs", S.windows.count, 0, 1) +
        `<div class="size-row">${numberField("wW", "Window width", "m", S.windows.w, 0.3, 0.1)}${numberField("wH", "Window height", "m", S.windows.h, 0.3, 0.1)}</div>` +
        `<div class="chips">${sizes.map(z => `<button type="button" class="chip chip-size" data-w="${z[1]}" data-h="${z[2]}">${z[0]} ${z[1]} × ${z[2]} m</button>`).join("")}</div>` +
        `<div class="chips"><button type="button" class="chip chip-suggest" data-n="${suggestedWindows()}">✨ Suggested for your rooms: ${suggestedWindows()} windows</button></div>` +
        `<p class="hint" id="hint2"></p>`;
    }
    case "fence":
      return choiceHTML("fence");
    case "elec":
      return window.Elec ? Elec.panelHTML() : "";
    case "budget":
      return numberField("inNum", "Total budget", "", S.budget, 100000, 50000, "₱") +
        chipsHTML("inNum", [1000000, 1500000, 2000000, 3000000, 5000000], v => peso(v)) + `<p class="hint" id="hint"></p>`;
    case "labor":
      return `<div id="payBox" class="pay-box">${payPanelHTML()}</div><p class="crew-meta" id="crewMeta"></p>
        <div class="table-wrap"><table class="data-table crew-table">
          <thead><tr><th>Worker</th><th>Type</th><th>Daily rate (₱)</th><th>How many</th><th>Days</th><th class="num">Cost</th><th></th></tr></thead>
          <tbody id="crewBody"></tbody>
          <tfoot><tr><td colspan="5" id="crewFootLabel"></td><td class="cost" id="crewTotal"></td><td></td></tr></tfoot>
        </table></div>
        <div class="add-worker">
          <strong>Add another worker type</strong>
          <input type="text" id="newName" placeholder="e.g. Tinsmith">
          <input type="number" id="newRate" placeholder="Daily rate" min="0" value="800">
          <select id="newTier"><option>Skilled</option><option>Supervisor</option><option>Helper</option></select>
          <button type="button" class="outline-btn" id="addWorker">+ Add</button>
        </div>
        <p class="hint">Rates are sample values — edit them. Supervisors and skilled trades earn more than helpers. Days default to the share of the project each trade is on site; type a number to override.</p>`;
  }
  return "";
}

function updateHint() {
  if (editing === null) return;
  const host = STEPS[editing].id, ids = [host, ...guestsOf(host).map(x => x.id)];
  ids.forEach(id => {
    if (id === "lot" || (id === "floors" && ids.includes("floorArea"))) return;
    const el = id === "windows" ? $("hint2") : $("hint");
    if (!el) return;
    const r = hintText(id);
    el.textContent = r.t;
    el.className = "hint" + (r.warn ? " warn" : "");
  });
}

function hintText(id) {
  const g = geometry(S);
  let t = "", warn = false;

  if (id === "lot") {
    t = "";
  } else if (id === "floorArea" || id === "floors") {
    t = `Each floor ≈ ${r1(g.fp)} sqm (about ${r1(g.w)} m × ${r1(g.d)} m) — covers ${Math.round(g.coverage)}% of your ${num(S.lotArea)} sqm lot.`;
    const pl = placeHouse(S);
    if (!pl.fits && g.fp <= S.lotArea) { t = `⚠ A ${r1(pl.Wb)} × ${r1(pl.Db)} m house (with its garage, terrace and so on) doesn't fit inside your lot shape with the usual setbacks (3 m front, 1.5 m sides, 2 m rear). Try more floors, a smaller floor area, or move the garage or terrace.`; warn = true; }
    else if (g.fp > S.lotArea) { t = `⚠ Each floor (${r1(g.fp)} sqm) is bigger than your lot. Try more floors or a smaller floor area.`; warn = true; }
    else if (g.coverage > 70) { t += " That leaves little yard — check local rules on lot coverage and setbacks."; }
  } else if (id === "glass") {
    const wi = calc(S).wallInfo;
    t = S.glass === 0
      ? "Solid walls — the cheapest and coolest option."
      : `Glass covers about ${r1(wi.glassA)} m² of your exterior walls. It replaces blocks, cement and paint, but adds glass, aluminum framing, steel posts and sealant.`;
  } else if (id === "rooms") {
    const c = calc(S), ex = c.ex, plan = c.plan, pb = layoutProblems();
    const parts = [];
    if (ex.cars) parts.push(ex.gOut ? `The ${ex.cars}-car garage is a separate building beside or in front of the house, so it doesn't use your floor area but needs its own walls and roof.` : `The garage sits inside the house and uses ${r1(plan.gA)} sqm of your ${num(S.floorArea)} sqm floor area.`);
    if (ex.T) parts.push(`The terrace adds ${r1(ex.T)} sqm outside the floor area.`);
    if (ex.bal) parts.push(ex.over ? "The balcony sits above the terrace, so the terrace needs no separate roof." : `The balcony is about ${r1(ex.bd.w)} × ${r1(ex.bd.d)} m.`);
    if (S.balcony && S.floors < 2) parts.push("A balcony needs 2 or more floors, so it is ignored for now.");
    pb.list.forEach(m => parts.push("⚠ " + m)); if (pb.list.length) warn = true;
    if (!placeHouse(S).fits) { parts.push("⚠ With these rooms the house doesn't fit your lot shape."); warn = true; }
    if (g.coverage > 100) { parts.push("⚠ The house and its outdoor spaces are bigger than your lot."); warn = true; }
    if (!plan.fits) { parts.push(`⚠ Your rooms need ${Math.ceil(plan.minTotal)} sqm but the floor area is ${num(S.floorArea)} sqm.`); warn = true; }
    t = parts.join(" ");
  } else if (id === "partitions") {
    const wi = calc(S).wallInfo;
    const tot = k => calc({ ...S, partitions: k }).total;
    t = `About ${Math.round(wi.dryP)} m² of dividers between rooms. Bathroom walls (${Math.round(wi.wetP)} m²) are always plastered hollow block (8"×16") with wall tiles, whichever you pick. Estimated total — ` +
      Object.keys(PARTITIONS).map(k => `${PARTITIONS[k].name}: ${peso(tot(k))}`).join(" · ") + ".";
  } else if (id === "windows") {
    const wi = calc(S).wallInfo;
    t = `${wi.winN} window${wi.winN === 1 ? "" : "s"} · ${r1(wi.winArea)} m² of glass. `;
    if (wi.winN < S.windows.count) { t += `Only ${wi.winN} fit in your solid exterior walls (windows can use at most 60% of them).`; warn = true; }
    else t += "Each window removes blocks and plaster but adds glass, aluminum frame and a lintel/sill.";
  } else if (id === "budget") {
    t = `That's about ${peso(S.budget / S.floorArea)} per sqm of your planned floor area.`;
  }
  return { t, warn };
}

function renderQuestion() {
  const card = $("questionCard");

  if (editing === null) {
    card.innerHTML = `<div class="done-banner"><span>✓</span><div>
      <strong>All questions answered</strong>
      <p>Use the Edit buttons on the left to change any answer. The house and estimate update instantly.</p>
    </div></div>`;
    return;
  }

  const st = STEPS[editing];
  const all = allAnswered();
  const last = editing === STEPS.length - 1;

  card.innerHTML = `
    <div class="q-head">
      <p class="eyebrow">QUESTION ${visibleSteps().indexOf(editing) + 1} OF ${visibleSteps().length}</p>
      <h2>${st.q}</h2>
    </div>
    <div id="qBody">${bodyHTML(st.id)}</div>
    <div class="q-actions">
      ${(!all && visibleSteps().indexOf(editing) > 0) ? `<button class="outline-btn" onclick="goBack()">← Back</button>` : ""}
      ${all ? `<button class="outline-btn" onclick="cancelEdit()">Cancel</button>` : ""}
      <span class="spacer"></span>
      <button class="primary-btn" onclick="saveQuestion()">${all ? "Save changes" : (last ? "Finish ✓" : "Next →")}</button>
    </div>`;

  bindBody(st.id);
  updateHint();
}

function bindBody(id) {
  const gs = guestsOf(id);
  if (gs.length) { bindBody1(id); gs.forEach(g => bindBody1(g.id)); return; }
  bindBody1(id);
}
function bindBody1(id) {
  if (id === "lot") bindLot();
  if (id === "floorArea" && window.LotItems) LotItems.bind();
  if (id === "elec" && window.Elec) Elec.bind();
  if (["floorArea", "budget"].includes(id)) {
    const key = id;
    const inp = $("inNum");
    const setNum = v => {
      const old = layoutFootprint();
      S[key] = v;
      if (key === "floorArea") { layoutFootprintChanged(old); layView = null; updateSampleBox(); }
      updateHint();
      liveUpdate();
    };
    inp.addEventListener("input", () => { const v = parseFloat(inp.value); if (v > 0) setNum(v); });
    document.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
      inp.value = b.dataset.v;
      setNum(Number(b.dataset.v));
    }));
  }
  if (id === "floorArea") {
    const refresh = () => { updateSampleBox(); updateHint(); liveUpdate(); };
    document.querySelectorAll("[data-aspect]").forEach(b => b.addEventListener("click", () => {
      setRectFootprint(Number(b.dataset.aspect));
      document.querySelectorAll("[data-aspect]").forEach(x => x.classList.toggle("on", x === b));
      $("fitMsg").textContent = "";
      refresh();
    }));
    $("wholeLotBtn").addEventListener("click", () => {
      const msg = fitFootprintToLot(true);
      document.querySelectorAll("[data-aspect]").forEach(x => x.classList.remove("on"));
      $("fitMsg").textContent = msg || "Done — the house now covers the whole lot (no setbacks). Check your local rules: most places require some open space at the front, sides and rear.";
      $("fitMsg").className = "hint" + (msg ? " warn" : "");
      refresh();
    });
    $("fitLotBtn").addEventListener("click", () => {
      const msg = fitFootprintToLot();
      document.querySelectorAll("[data-aspect]").forEach(x => x.classList.remove("on"));
      $("fitMsg").textContent = msg || "Done — the house now follows your lot, leaving the usual setbacks (3 m front, 1.5 m sides, 2 m rear). Drag the dark corners if you want it smaller or different.";
      $("fitMsg").className = "hint" + (msg ? " warn" : "");
      refresh();
    });
  }

  if (id === "rooms") {
    bindRoomsPanel();
    if (window.LotItems) LotItems.bind();
    updateRoomsUI();
  }

  if (id === "windows" && S.glass < 1) {
    const sg = document.querySelector(".chip-suggest");
    if (sg) sg.addEventListener("click", () => {
      S.windows.count = Number(sg.dataset.n);
      $("wCount").value = S.windows.count;
      updateHint();
      liveUpdate();
    });
    const upd = () => {
      const c = parseInt($("wCount").value), w = parseFloat($("wW").value), h = parseFloat($("wH").value);
      if (c >= 0) S.windows.count = c;
      if (w > 0) S.windows.w = w;
      if (h > 0) S.windows.h = h;
      updateHint();
      liveUpdate();
    };
    ["wCount", "wW", "wH"].forEach(k => $(k).addEventListener("input", upd));
    document.querySelectorAll(".chip-size").forEach(b => b.addEventListener("click", () => {
      S.windows.w = Number(b.dataset.w);
      S.windows.h = Number(b.dataset.h);
      $("wW").value = S.windows.w;
      $("wH").value = S.windows.h;
      updateHint();
      liveUpdate();
    }));
  }

  if (["floors", "walls", "fence", "glass", "partitions"].includes(id)) {
    const items = choiceItems(id);
    const scope = (document.querySelector(".q-sec-h") && [...document.querySelectorAll(".q-sec")].find(sec => sec.querySelector(".q-sec-h").textContent === SECTION_TITLES[id])) || document;
    scope.querySelectorAll(".choice").forEach(b => b.addEventListener("click", () => {
      const old = layoutFootprint();
      S[id] = items[Number(b.dataset.i)].val;
      if (id === "floors") { layoutFootprintChanged(old); layView = null; }
      renderQuestion();
      liveUpdate();
      if (id === "floors" && old.F <= 1 && S.floors > 1 && !S.layout.stairAsked) askStairType(() => { refreshAll(); });
    }));
  }

  if (id === "labor") { bindCrew(); bindPay(); }
}


/* =========================
   HOW THE JOB IS PAID (arawan / pakyawan / contractor)
========================= */

const PAY_TYPES = [
  { id: "arawan", name: "Arawan", sub: "Daily pay", text: "Each worker is paid per day. Labor = daily rate × workers × days." },
  { id: "pakyawan", name: "Pakyawan", sub: "Fixed labor price", text: "The foreman agrees one fixed price for the labor. The owner buys the materials." },
  { id: "contractor", name: "Contractor", sub: "Materials + labor + fee", text: "One price that includes materials, labor and the contractor's fee." }
];

/* the lines of the estimate for the chosen pay type, used by the planner and the saved plan */
function costLines(c) {
  const p = c.pay, L = [];
  L.push([p.type === "pakyawan" ? "Materials (bought by the owner)" : "Materials", c.matTotal, "#8fa89d"]);
  L.push([p.type === "pakyawan" ? "Labor (pakyawan, fixed price)" : p.type === "contractor" ? "Labor (crew, daily rates)" : "Labor (daily crew)", p.labor, "#0f7b6c"]);
  L.push(["Permits, hauling & misc. (8% of materials)", c.permits, "#a78bfa"]);
  L.push(["Contingency (5%)", c.contingency, "#1f9d6b"]);
  if (p.type === "contractor") L.push([p.feeMode === "fixed" ? "Contractor's fee (fixed)" : `Contractor's fee (${Number(p.feePct) || 0}%)`, p.fee, "#f2a541"]);
  return L;
}

function payLiveHTML() {
  const c = calc(S), p = c.pay;
  const rows = costLines(c).map(l => `<div><span>${l[0]}</span><strong>${peso(l[1])}</strong></div>`).join("");
  let who = "";
  if (p.type === "pakyawan") who = `<p class="pay-who">Foreman: pakyawan price <b>${peso(p.labor)}</b> − estimated crew cost <b>${peso(p.crewCost)}</b> = <b class="${p.margin < 0 ? "neg" : ""}">${peso(p.margin)}</b> left for the foreman.</p>`;
  else if (p.type === "contractor") who = `<p class="pay-who">Contractor earns <b>${peso(p.fee)}</b> (${p.feeMode === "fixed" ? "fixed fee" : (Number(p.feePct) || 0) + "% of " + peso(p.feeBase)}).</p>`;
  else who = `<p class="pay-who">Daily crew payroll: <b>${peso(p.crewCost)}</b>.</p>`;
  return `<div class="cost-rows">${rows}<div class="total"><span>Total the house will cost</span><span>${peso(c.total)}</span></div></div>${who}`;
}

function payPanelHTML() {
  const p = S.pay, c = calc(S);
  const cards = PAY_TYPES.map(t => `<button type="button" class="pay-card ${p.type === t.id ? "on" : ""}" data-pay="${t.id}" role="radio" aria-checked="${p.type === t.id}">
      <strong>${t.name}</strong><small>${t.sub}</small><span>${t.text}</span></button>`).join("");
  let opts = "";
  if (p.type === "pakyawan") {
    opts = `<label class="pay-f"><span>Fixed labor price (₱)</span>
      <input type="number" min="0" step="1000" id="payFixed" value="${p.pakyawan != null ? p.pakyawan : ""}" placeholder="${Math.round(c.pay.crewCost)} (same as crew cost)"></label>
      <p class="hint">Leave empty to use the crew cost below. Whatever is left after paying the workers is the foreman's earning.</p>`;
  } else if (p.type === "contractor") {
    opts = `<div class="pay-fee">
      <label class="pay-f"><span>Contractor's fee</span>
        <select id="payMode"><option value="percent" ${p.feeMode === "percent" ? "selected" : ""}>Percent of cost</option><option value="fixed" ${p.feeMode === "fixed" ? "selected" : ""}>Fixed amount</option></select></label>
      <label class="pay-f"><span>${p.feeMode === "fixed" ? "Fee (₱)" : "Fee (%)"}</span>
        <input type="number" min="0" ${p.feeMode === "fixed" ? 'step="1000"' : 'step="0.5" max="100"'} id="payFee" value="${p.feeMode === "fixed" ? p.feeFixed : p.feePct}"></label>
      <label class="pay-chk"><input type="checkbox" id="payShow" ${p.showFee ? "checked" : ""}> Show the fee to the client</label></div>
      <p class="hint">Usually about 10–20% of materials + labor + permits. This is a guide only, so set your own rate. Your default comes from your account.</p>`;
  }
  return `<div class="pay-cards" role="radiogroup" aria-label="How is the job paid?">${cards}</div>${opts}<div class="card pay-live" id="payLive">${payLiveHTML()}</div>`;
}

function bindPay() {
  const box = $("payBox");
  if (!box) return;
  const live = () => { const el = $("payLive"); if (el) el.innerHTML = payLiveHTML(); updateCrewTotals(); liveUpdate(); };
  box.querySelectorAll("[data-pay]").forEach(b => b.addEventListener("click", () => {
    S.pay.type = b.dataset.pay;
    box.innerHTML = payPanelHTML(); bindPay(); liveUpdate();
  }));
  const num$ = id => { const el = $(id); return el ? parseFloat(el.value) : NaN; };
  const fx = $("payFixed"); if (fx) fx.addEventListener("input", () => { const v = num$("payFixed"); S.pay.pakyawan = v >= 0 ? v : null; live(); });
  const md = $("payMode"); if (md) md.addEventListener("change", () => { S.pay.feeMode = md.value; box.innerHTML = payPanelHTML(); bindPay(); liveUpdate(); });
  const fe = $("payFee"); if (fe) fe.addEventListener("input", () => { const v = num$("payFee"); if (S.pay.feeMode === "fixed") S.pay.feeFixed = v >= 0 ? v : 0; else S.pay.feePct = v >= 0 ? Math.min(100, v) : 0; live(); });
  const sh = $("payShow"); if (sh) sh.addEventListener("change", () => { S.pay.showFee = sh.checked; liveUpdate(); });
}

/* =========================
   CREW EDITOR
========================= */

function crewRowsHTML(lab) {
  return lab.rows.map(r => `
    <tr data-id="${r.id}">
      <td><strong>${esc(r.name)}</strong></td>
      <td><span class="tier tier-${r.tier}">${r.tier}</span></td>
      <td><input type="number" min="0" step="50" data-f="rate" value="${r.rate}"></td>
      <td><div class="stepper"><button type="button" data-step="-1">−</button>
        <input type="number" min="0" data-f="count" value="${r.count}">
        <button type="button" data-step="1">+</button></div></td>
      <td><input type="number" min="1" data-f="days" value="${r.daysEdited ? r.days : ""}" placeholder="${r.auto} (auto)"></td>
      <td class="cost">${peso(r.cost)}</td>
      <td>${r.custom ? `<button type="button" class="x" data-remove title="Remove">✕</button>` : ""}</td>
    </tr>`).join("");
}

function renderCrew() {
  const lab = calc(S).labor;
  $("crewBody").innerHTML = crewRowsHTML(lab);
  updateCrewTotals(lab);
}

function updateCrewTotals(lab) {
  lab = lab || calc(S).labor;
  const meta = $("crewMeta");
  if (!meta) return;
  meta.innerHTML = `Estimated project duration: <strong>${lab.duration} days</strong> · Crew on site: <strong>${lab.headcount} workers</strong>`;
  $("crewFootLabel").textContent = "Total labor cost";
  $("crewTotal").textContent = peso(lab.total);
  lab.rows.forEach(r => {
    const tr = document.querySelector(`#crewBody tr[data-id="${r.id}"]`);
    if (tr) tr.querySelector(".cost").textContent = peso(r.cost);
  });
}

function bindCrew() {
  renderCrew();
  const body = $("crewBody");

  body.addEventListener("input", e => {
    const f = e.target.dataset.f;
    if (!f) return;
    const c = S.crew.find(x => x.id === e.target.closest("tr").dataset.id);
    const v = parseFloat(e.target.value);
    if (f === "days") c.days = v > 0 ? Math.round(v) : null;
    else c[f] = v >= 0 ? v : 0;
    updateCrewTotals();
    liveUpdate();
  });

  body.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    const tr = b.closest("tr");
    if (b.dataset.step) {
      const inp = tr.querySelector('[data-f="count"]');
      inp.value = Math.max(0, (parseInt(inp.value) || 0) + Number(b.dataset.step));
      inp.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (b.hasAttribute("data-remove")) {
      S.crew = S.crew.filter(x => x.id !== tr.dataset.id);
      renderCrew();
      liveUpdate();
    }
  });

  $("addWorker").addEventListener("click", () => {
    const name = $("newName").value.trim();
    if (!name) { $("newName").focus(); return; }
    S.crew.push({
      id: "c" + Date.now(), name, tier: $("newTier").value,
      rate: Math.max(0, parseFloat($("newRate").value) || 0),
      count: 1, factor: 0.3, days: null, custom: true
    });
    $("newName").value = "";
    renderCrew();
    liveUpdate();
  });
}


/* =========================
   3D HOUSE VIEWER
========================= */

let viewAngle = -28;
let viewTilt = 20;
let viewOffset = 0;
let viewInside = false;   // 3D view: false = outside, true = cutaway with rooms and furniture
let viewFloor = 0;        // which floor the inside view shows
let viewWide = false;     // inside view: show the whole lot (court, store, pool...) around the cut-away house
let viewZoom = 1;         // zoom buttons

const scene = $("scene");

function updateTransform() {
  scene.style.transform = `translateY(${viewOffset.toFixed(1)}px) rotateX(${-viewTilt}deg) rotateY(${viewAngle}deg)`;
  scene.style.setProperty("--va", viewAngle.toFixed(2));   // room names turn to face the viewer
  scene.style.setProperty("--vt", viewTilt.toFixed(2));

  const a = ((viewAngle % 360) + 360) % 360;
  let label = "Angled view";
  document.querySelectorAll("#viewButtons button").forEach(b => {
    const t = ((Number(b.dataset.angle) % 360) + 360) % 360;
    const diff = Math.min(Math.abs(a - t), 360 - Math.abs(a - t));
    const on = diff < 40;
    b.classList.toggle("active", on);
    if (on) label = b.textContent + " view";
  });
  $("viewBadge").textContent = label;
}

function setView(target) {
  viewAngle = ((viewAngle % 360) + 360) % 360;
  const delta = ((target - viewAngle + 540) % 360) - 180;
  viewAngle += delta;
  $("autoRotate").checked = false;
  scene.classList.add("animate");
  updateTransform();
  setTimeout(() => scene.classList.remove("animate"), 900);
}

document.querySelectorAll("#viewButtons button").forEach(b =>
  b.addEventListener("click", () => setView(Number(b.dataset.angle))));

/* outside / inside switch, floor picker, interior style */
function setInside(on) {
  viewInside = !!on;
  viewTilt = viewInside ? 52 : 20; viewZoom = 1;
  $("autoRotate").checked = false;
  scene.classList.add("animate");
  renderHouse();
  setTimeout(() => scene.classList.remove("animate"), 900);
}
function renderInsideBar() {
  const card = $("viewerCard"), bar = $("insideBar");
  if (!bar || !window.BWInterior) return;
  card.classList.toggle("is-inside", viewInside);
  bar.querySelectorAll("#ioTabs button").forEach(b => b.classList.toggle("active", (b.dataset.io === "in") === viewInside));
  const fw = $("ioFloors");
  fw.hidden = !(viewInside && S.floors > 1);
  if (!fw.hidden) {
    viewFloor = Math.min(viewFloor, S.floors - 1);
    fw.innerHTML = Array.from({ length: S.floors }, (_, i) => `<button type="button" data-f="${i}" class="${i === viewFloor ? "active" : ""}">Floor ${i + 1}</button>`).join("");
  }
  const sel = $("ioStyle");
  if (!sel.options.length) sel.innerHTML = Object.entries(BWInterior.STYLES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join("");
  sel.value = (S.interior && S.interior.style) || "modern";
  $("ioFurn").checked = !(S.interior && S.interior.furniture === false);
  $("ioWide").checked = viewWide; $("ioWideLbl").hidden = !viewInside;
}
(function () {
  const bar = $("insideBar");
  if (!bar) return;
  $("ioTabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setInside(b.dataset.io === "in"); });
  $("ioFloors").addEventListener("click", e => { const b = e.target.closest("button"); if (b) { viewFloor = Number(b.dataset.f); renderHouse(); } });
  $("ioStyle").addEventListener("change", e => { S.interior = Object.assign({ furniture: true }, S.interior, { style: e.target.value }); liveUpdate(); });
  $("ioWide").addEventListener("change", e => { viewWide = e.target.checked; viewZoom = 1; scene.classList.add("animate"); renderHouse(); setTimeout(() => scene.classList.remove("animate"), 900); });
  $("zoomBtns").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; viewZoom = b.dataset.z === "0" ? 1 : Math.max(0.5, Math.min(3.5, viewZoom * (b.dataset.z === "+" ? 1.3 : 1 / 1.3))); scene.classList.add("animate"); renderHouse(); setTimeout(() => scene.classList.remove("animate"), 500); });
  $("ioFurn").addEventListener("change", e => { S.interior = Object.assign({ style: "modern" }, S.interior, { furniture: e.target.checked }); liveUpdate(); });
})();

const tplBtn = $("tplBtn");
if (tplBtn) tplBtn.addEventListener("click", () => { if (window.BWTemplates) BWTemplates.open(); });

/* drag to rotate */
(function () {
  const vp = $("viewport");
  let last = null;
  vp.addEventListener("pointerdown", e => {
    last = { x: e.clientX, y: e.clientY };
    vp.classList.add("dragging");
    vp.setPointerCapture(e.pointerId);
    scene.classList.remove("animate");
  });
  vp.addEventListener("pointermove", e => {
    if (!last) return;
    viewAngle += (e.clientX - last.x) * 0.6;
    viewTilt = Math.min(70, Math.max(4, viewTilt + (e.clientY - last.y) * 0.3));
    last = { x: e.clientX, y: e.clientY };
    updateTransform();
  });
  const end = () => { last = null; vp.classList.remove("dragging"); };
  vp.addEventListener("pointerup", end);
  vp.addEventListener("pointercancel", end);
})();

function tick() {
  if ($("autoRotate").checked && !$("viewport").classList.contains("dragging")) {
    viewAngle += 0.35;
    updateTransform();
  }
  requestAnimationFrame(tick);
}

function face(cls, w, h, tf, inner, extra) {
  return `<div class="face ${cls}" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;` +
    `margin-left:${(-w / 2).toFixed(1)}px;margin-top:${(-h / 2).toFixed(1)}px;transform:${tf};${extra || ""}">${inner || ""}</div>`;
}

function renderHouse() {
  pruneStairs();
  const g = geometry(S);
  const cres = calc(S);
  const info = cres.wallInfo;
  const ex = cres.ex;
  const fl = S.floors;
  const L0 = S.look || {}, roofType = L0.roof || "gable";
  const rise = roofType === "flat" ? 0.35 : (g.isRect ? g.d : Math.min(g.w, g.d)) * 0.2;
  const Hm = fl * WALL_H;
  const Htot = Hm + rise;

  const lotOnly = false;   // the house is always shown (it is part of the same question as the lot)
  const LT = S.lot, fr = lotFrame(LT);
  const poly = LT.pts.map(p => { const q = fr.toLocal(p); return { u: q.u, t: q.t }; });
  const umin = Math.min(...poly.map(p => p.u)), umax = Math.max(...poly.map(p => p.u));
  const tmin = Math.min(...poly.map(p => p.t)), tmax = Math.max(...poly.map(p => p.t));
  const lbw = umax - umin, lbd = tmax - tmin;
  const cu = (umin + umax) / 2, ct = (tmin + tmax) / 2;
  const HT = lotOnly ? 3 : Htot;
  const inside = viewInside && !lotOnly && !!window.BWInterior;
  const vf = Math.max(0, Math.min(viewFloor, fl - 1));
  /* inside view zooms in on the house itself instead of the whole lot */
  const wide = inside && viewWide;   // whole lot, with the house cut away so you can look inside it too
  const s = (inside && !wide ? Math.min(560 / Math.hypot(g.w + 3, g.d + 3), 230 / (vf * WALL_H + 3.2), 70) : Math.min(600 / Math.hypot(lbw + 4, lbd + 6), 230 / (wide ? vf * WALL_H + 3.2 : HT), wide ? 60 : 45)) * viewZoom;
  const pl = placeHouse(S);
  const fu = inside && !wide ? pl.u0 : cu, ft = inside && !wide ? pl.hf + g.d / 2 : ct;   // the point the view is centred on
  const CH = 1.2 * s;   // height of the cut-away walls
  renderInsideBar();

  const W = g.w * s, D = g.d * s, FH = WALL_H * s, Hs = Hm * s, RH = rise * s;
  const wc = "wall-" + S.walls;
  let html = "";

  /* world: everything below is placed as x = u (along the road), z = -t (into the lot) */
  let world = "";
  const bigW = (lbw + 40) * s, bigD = (lbd + 40) * s;
  world += face("surround", bigW, bigD, `translate3d(${(cu * s).toFixed(1)}px,2px,${(-ct * s).toFixed(1)}px) rotateX(90deg)`);
  const clip = "clip-path:polygon(" + poly.map(p => `${((p.u - umin) / (lbw || 1) * 100).toFixed(2)}% ${((tmax - p.t) / (lbd || 1) * 100).toFixed(2)}%`).join(",") + ")";
  world += face("ground", lbw * s, lbd * s, `translate3d(${(cu * s).toFixed(1)}px,-0.5px,${(-ct * s).toFixed(1)}px) rotateX(90deg)`, "", clip);
  const roadLen = Math.max(lbw, fr.len) + 14;
  world += face("road", roadLen * s, 2.6 * s, `translate3d(${(cu * s).toFixed(1)}px,-0.2px,${(2.2 * s).toFixed(1)}px) rotateX(90deg)`, "ROAD");

  /* boundary: fence (with a 3 m gate on the road side), or a low curb with corner stakes */
  const fenced = S.fence && !lotOnly;
  const fkind = fenceKind(S.fence) || "chb";
  const fh = (fenced ? FENCES[fkind].h : 0.3) * s;
  const edgeFace = (u1, t1, u2, t2) => {
    const dx = (u2 - u1) * s, dz = -(t2 - t1) * s, len = Math.hypot(dx, dz);
    if (len < 1) return "";
    const th = Math.atan2(-dz, dx) * 180 / Math.PI;
    return face((fenced ? "fence-face fk-" + fkind : "curb-face") + " sh-side", len, fh,
      `translate3d(${((u1 + u2) / 2 * s).toFixed(1)}px,${(-fh / 2).toFixed(1)}px,${(-(t1 + t2) / 2 * s).toFixed(1)}px) rotateY(${th.toFixed(2)}deg)`);
  };
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    if (fenced && i === fr.i) {
      const len = Math.hypot(q.u - p.u, q.t - p.t), gate = Math.min(3, len * 0.4), k = (len - gate) / 2 / len;
      const m1 = { u: p.u + (q.u - p.u) * k, t: p.t + (q.t - p.t) * k }, m2 = { u: q.u - (q.u - p.u) * k, t: q.t - (q.t - p.t) * k };
      world += edgeFace(p.u, p.t, m1.u, m1.t) + edgeFace(m2.u, m2.t, q.u, q.t);
    } else world += edgeFace(p.u, p.t, q.u, q.t);
    if (!fenced) {
      const sw = 0.18 * s, sh = 0.9 * s, tf = `translate3d(${(p.u * s).toFixed(1)}px,${(-sh / 2).toFixed(1)}px,${(-p.t * s).toFixed(1)}px)`;
      world += face("stake", sw, sh, tf) + face("stake", sw, sh, tf + " rotateY(90deg)");
    }
  });

  /* other buildings and features on the lot */
  if (window.LotItems && (!inside || wide)) world += LotItems.world3d(face, s, wc);

  /* house group (hidden while answering the lot question) */
  if (!lotOnly) {
    html += face("pad", W, D, "translate3d(0,-0.5px,0) rotateX(90deg)", "", "clip-path:polygon(" + g.poly.map(q => `${(q.x / g.w * 100).toFixed(2)}% ${((g.d - q.y) / g.d * 100).toFixed(2)}%`).join(",") + ")");
  }

  /* walls, floor by floor */
  const gs = S.glass || 0;
  const wd = S.windows;
  const per = g.perim;
  const ww = wd.w * s, wh = wd.h * s;
  const wtop = Math.max(0.25 * s, FH - 0.9 * s - wh);

  const win = (l, t, w, h) => `<div class="win" style="left:${l.toFixed(1)}px;top:${t.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></div>`;
  const door = (cx, w, h, glassy) => `<div class="door ${(glassy !== undefined ? glassy : gs >= 0.5) ? "glassdoor" : ""}" style="left:${(cx - w / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></div>`;
  const garageDoor = (cx, w, h) => `<div class="garagedoor" style="left:${(cx - w / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></div>`;
  const pane = (sw, w, h) => gs > 0
    ? `<div class="wall-glass glasspane" style="left:${sw.toFixed(1)}px;top:0;width:${(w - sw).toFixed(1)}px;height:${h.toFixed(1)}px"></div>` : "";
  // avoid = list of [centerX, width] already taken by doors
  const wins = (sw, c, avoid) => {
    let out = "";
    for (let k = 0; k < c; k++) {
      const cx = sw * (k + 0.5) / c;
      if ((avoid || []).some(a => Math.abs(cx - a[0]) < (ww + a[1]) / 2 + 0.2 * s)) continue;
      out += win(cx - ww / 2, wtop, ww, wh);
    }
    return out;
  };

  const Wm = g.w, Dm = g.d, gp = g.poly;
  const X = x => (x - Wm / 2) * s;           // house-local metres -> scene px (x)
  const Z = t => (Dm / 2 - t) * s;           // house-local metres -> scene px (z)
  const gsp = ex.gs;

  /* one wall per side of the footprint (listed counter-clockwise, so every wall faces outward) */
  const E = gp.map((a0, k) => {
    const b0 = gp[(k + 1) % gp.length], dx = b0.x - a0.x, dy = b0.y - a0.y, len = Math.hypot(dx, dy) || 1e-6;
    return { k, a: a0, b: b0, dx, dy, len, nz: dx / len, th: Math.atan2(dy, dx) * 180 / Math.PI, mx: (a0.x + b0.x) / 2, my: (a0.y + b0.y) / 2 };
  });
  const byLen = E.slice().sort((p, q) => q.len - p.len);
  const mainE = E.filter(e => e.nz > 0.5 && e.len > 1.4).sort((p, q) => q.len - p.len)[0] || byLen[0];
  const rearE = E.filter(e => e.nz < -0.5 && e.len > 1.4).sort((p, q) => q.len - p.len)[0] || null;
  const alongE = (e, x, t) => ((x - e.a.x) * e.dx + (t - e.a.y) * e.dy) / e.len;
  const distE = (e, x, t) => Math.abs((x - e.a.x) * e.dy - (t - e.a.y) * e.dx) / e.len;

  /* inside garage whose door faces the road: find the wall it touches */
  let gDoor = null;
  if (gsp && !ex.gOut) {
    const gx = gsp.x + gsp.w / 2, gt = gsp.t;
    const ge = E.filter(e => e.nz > 0.5 && distE(e, gx, gt) < 1.2 && alongE(e, gx, gt) > 0 && alongE(e, gx, gt) < e.len).sort((p, q) => distE(p, gx, gt) - distE(q, gx, gt))[0];
    if (ge) {
      const dw = ex.gW * s, pos = Math.min(Math.max(alongE(ge, gx, gt) * s, dw / 2 + 0.2 * s), ge.len * s - dw / 2 - 0.2 * s);
      gDoor = { e: ge, pos, w: dw };
    }
  }
  /* main door: in front of the living room (or another front room), clear of the garage door */
  const lenPx = e => e.len * s;
  const frontRooms = S.layout.spaces.filter(r => r.fl === 0 && !isOutdoor(r) && distE(mainE, r.x + r.w / 2, r.t) < 1.2)
    .sort((p, q) => (q.type === "living") - (p.type === "living"));
  const cands = frontRooms.map(r => alongE(mainE, r.x + r.w / 2, r.t) * s).filter(v => v > 0.7 * s && v < lenPx(mainE) - 0.7 * s).concat([lenPx(mainE) / 2]);
  const clash = v => gDoor && gDoor.e === mainE && Math.abs(v - gDoor.pos) < (gDoor.w + 0.95 * s) / 2 + 0.25 * s;
  let doorS = cands.find(v => !clash(v));
  if (doorS === undefined) doorS = gDoor.pos < lenPx(mainE) / 2 ? lenPx(mainE) - 0.8 * s : 0.8 * s;
  if (gs >= 0.7) doorS = lenPx(mainE) / 2;

  const nWin = E.map(e => (e.len < 1.2 ? 0 : Math.round(info.winN * e.len / per / fl)));
  if (info.winN > 0 && fl === 1 && nWin.every(v => v === 0)) nWin[mainE.k] = 1;

  const bsp = ex.bal ? ex.bs : null;
  let balDoor = null;
  if (bsp) {
    const bx = bsp.x + bsp.w / 2, bt = bsp.t + bsp.h;
    const be = E.filter(e => e.nz > 0.5 && distE(e, bx, bt) < 0.6 && alongE(e, bx, bt) > 0.8 && alongE(e, bx, bt) < e.len - 0.8)[0];
    if (be) balDoor = { e: be, pos: alongE(be, bx, bt) * s };
  }

  /* outside look from the house template: half cladding over concrete, painted walls, a shop front */
  const clad = L0.facade === "halfclad", paint = L0.finish === "paint" && !clad;
  const wallCls = clad ? "wall-concrete" : paint ? "wall-paint" : wc;
  const cladCls = "clad clad-" + (["amakan", "steel", "wood"].includes(L0.cladding) ? L0.cladding : "amakan");
  const shopRoom = S.layout.spaces.find(r => r.fl === 0 && r.type === "other" && /store|shop/i.test(r.name) && distE(mainE, r.x + r.w / 2, r.t) < 1.2);
  let shop = null;
  if (shopRoom) {
    const sw = Math.min(Math.max(shopRoom.w * 0.8, 1.8), 4.2) * s;
    const sp = Math.min(Math.max(alongE(mainE, shopRoom.x + shopRoom.w / 2, shopRoom.t) * s, sw / 2 + 0.2 * s), lenPx(mainE) - sw / 2 - 0.2 * s);
    shop = { pos: sp, w: sw };
    if (Math.abs(doorS - sp) < (sw + 0.95 * s) / 2 + 0.25 * s) doorS = sp < lenPx(mainE) / 2 ? lenPx(mainE) - 0.8 * s : 0.8 * s;
  }

  for (let i = 0; i < fl; i++) {
    if (inside && i > vf) break;
    const cutHere = inside && i === vf, hh = cutHere ? CH : FH;
    const cy = -(i * FH + hh / 2);
    E.forEach(e => {
      const wpx = e.len * s, sw = wpx * (1 - gs);
      const avoid = [];
      let inner = pane(sw, wpx, FH);
      if (i === 0 && e === mainE) avoid.push([doorS, 0.95 * s]);
      if (i === 0 && e === mainE && shop) avoid.push([shop.pos, shop.w]);
      if (i === 0 && gDoor && gDoor.e === e) avoid.push([gDoor.pos, gDoor.w]);
      if (i === 0 && e === rearE) avoid.push([sw / 2, 0.9 * s]);
      if (i === 1 && balDoor && balDoor.e === e) avoid.push([balDoor.pos, 1.6 * s]);
      inner += wins(sw, nWin[e.k], avoid);
      if (i === 0 && e === mainE) inner += door(doorS, 0.95 * s, 2.1 * s);
      if (i === 0 && e === mainE && shop) inner += `<div class="shopfront" style="left:${(shop.pos - shop.w / 2).toFixed(1)}px;width:${shop.w.toFixed(1)}px;height:${(2.3 * s).toFixed(1)}px"><i></i></div>`;
      if (clad) inner = `<div class="${cladCls}" style="top:0;height:${(hh * 0.56).toFixed(1)}px"></div>` + inner;
      if (i === 0 && gDoor && gDoor.e === e) inner += garageDoor(gDoor.pos, gDoor.w, 2.3 * s);
      if (i === 0 && e === rearE) inner += door(sw / 2, 0.9 * s, 2.1 * s);
      if (i === 1 && balDoor && balDoor.e === e) inner += door(balDoor.pos, 1.6 * s, 2.1 * s, true);
      const cls = e.nz > 0.5 ? "sh-front" : e.nz < -0.5 ? "sh-rear" : "sh-side";
      html += face(`${wallCls} slab-line ${cls}${cutHere ? " cutwall" : ""}`, wpx, hh, `translate3d(${X(e.mx).toFixed(1)}px,${cy.toFixed(1)}px,${Z(e.my).toFixed(1)}px) rotateY(${e.th.toFixed(2)}deg)`, cutHere ? "" : inner);
    });
  }

  /* inside view: room floors, dividing walls, names and furniture for the chosen floor */
  if (inside) {
    const rooms = S.layout.spaces.filter(r => r.fl === vf && (!isOutdoor(r) || (r.type === "garage" && !ex.gOut)));
    html += BWInterior.html({ S, s, X, Z, face, floor: vf, FH, CH, rooms, gp, segDist, TYPES: SPACE_TYPES, walled: isWalled });
  }

  /* terrace: wherever it was placed on the floor plan */
  const onBody = (x, t) => pointInPoly({ x, y: t }, gp) || gp.some((q, i) => segDist({ x, y: t }, q, gp[(i + 1) % gp.length]) < 0.06);
  if (ex.T > 0) {
    const ts = ex.ts, tw = ts.w * s, td = ts.h * s;
    const ph = ex.over ? FH : 0.85 * FH;
    const cx = X(ts.x + ts.w / 2), cz = Z(ts.t + ts.h / 2);
    html += face("terrace-floor", tw, td, `translate3d(${cx.toFixed(1)}px,-1.5px,${cz.toFixed(1)}px) rotateX(90deg)`);
    [[ts.x, ts.t], [ts.x + ts.w, ts.t], [ts.x, ts.t + ts.h], [ts.x + ts.w, ts.t + ts.h]].forEach(([qx, qt]) => {
      if (onBody(qx, qt)) return;
      const pw = 0.24 * s, px = X(qx) + (qx <= ts.x + 0.01 ? 0.12 : -0.12) * s, pz = Z(qt) + (qt <= ts.t + 0.01 ? -0.12 : 0.12) * s;
      html += face("post sh-front", pw, ph, `translate3d(${px.toFixed(1)}px,${(-ph / 2).toFixed(1)}px,${pz.toFixed(1)}px)`);
      html += face("post sh-side", pw, ph, `translate3d(${px.toFixed(1)}px,${(-ph / 2).toFixed(1)}px,${pz.toFixed(1)}px) rotateY(90deg)`);
    });
    if (!ex.over) html += face("roof-face sh-roofa", tw + 0.4 * s, td + 0.4 * s, `translate3d(${cx.toFixed(1)}px,${(-ph - 1).toFixed(1)}px,${cz.toFixed(1)}px) rotateX(90deg)`);
  }

  /* balcony: upper floor, railing on the sides that are open */
  if (bsp && !(inside && vf < 1)) {
    const rh = 1.0 * s, bw2 = bsp.w * s, bd2 = bsp.h * s;
    const cx = X(bsp.x + bsp.w / 2), cz = Z(bsp.t + bsp.h / 2), y = -FH;
    const touchRear = bsp.t + bsp.h > -0.05 && bsp.x < Wm && bsp.x + bsp.w > 0;
    const touchLeft = bsp.x >= Wm - 0.05 && bsp.t < Dm && bsp.t + bsp.h > 0;     // balcony is beside the right wall
    const touchRight = bsp.x + bsp.w <= 0.05 && bsp.t < Dm && bsp.t + bsp.h > 0; // balcony is beside the left wall
    html += face("balcony-slab", bw2, bd2, `translate3d(${cx.toFixed(1)}px,${(y - 1).toFixed(1)}px,${cz.toFixed(1)}px) rotateX(90deg)`);
    const zf = Z(bsp.t), zr = Z(bsp.t + bsp.h), xl = X(bsp.x), xr = X(bsp.x + bsp.w);
    const front = (zz, cls) => face("railing-face sh-front", bw2, rh, `translate3d(${cx.toFixed(1)}px,${(y - rh / 2).toFixed(1)}px,${zz.toFixed(1)}px)`);
    html += face("balcony-edge sh-front", bw2, 0.25 * s, `translate3d(${cx.toFixed(1)}px,${(y + 0.12 * s).toFixed(1)}px,${zf.toFixed(1)}px)`);
    html += front(zf);
    if (!touchRear) html += face("railing-face sh-rear", bw2, rh, `translate3d(${cx.toFixed(1)}px,${(y - rh / 2).toFixed(1)}px,${zr.toFixed(1)}px) rotateY(180deg)`);
    if (!touchLeft) html += face("railing-face sh-side", bd2, rh, `translate3d(${xl.toFixed(1)}px,${(y - rh / 2).toFixed(1)}px,${cz.toFixed(1)}px) rotateY(-90deg)`);
    if (!touchRight) html += face("railing-face sh-side", bd2, rh, `translate3d(${xr.toFixed(1)}px,${(y - rh / 2).toFixed(1)}px,${cz.toFixed(1)}px) rotateY(90deg)`);
  }

  /* garage outside the house: its own little building */
  if (ex.gOut) {
    const gw = gsp.w * s, gd = gsp.h * s, GH = 2.6 * s;
    const cx = X(gsp.x + gsp.w / 2), cz = Z(gsp.t + gsp.h / 2);
    html += face("pad", gw + 0.6 * s, gd + 0.6 * s, `translate3d(${cx.toFixed(1)}px,-0.5px,${cz.toFixed(1)}px) rotateX(90deg)`);
    html += face(`${wc} slab-line sh-front`, gw, GH, `translate3d(${cx.toFixed(1)}px,${(-GH / 2).toFixed(1)}px,${(cz + gd / 2).toFixed(1)}px)`, garageDoor(gw / 2, Math.min(ex.gW * s, gw - 0.4 * s), 2.3 * s));
    html += face(`${wc} slab-line sh-rear`, gw, GH, `translate3d(${cx.toFixed(1)}px,${(-GH / 2).toFixed(1)}px,${(cz - gd / 2).toFixed(1)}px) rotateY(180deg)`);
    html += face(`${wc} slab-line sh-side`, gd, GH, `translate3d(${(cx - gw / 2).toFixed(1)}px,${(-GH / 2).toFixed(1)}px,${cz.toFixed(1)}px) rotateY(-90deg)`);
    html += face(`${wc} slab-line sh-side`, gd, GH, `translate3d(${(cx + gw / 2).toFixed(1)}px,${(-GH / 2).toFixed(1)}px,${cz.toFixed(1)}px) rotateY(90deg)`);
    html += face("roof-face sh-roofa", gw + 0.5 * s, gd + 0.5 * s, `translate3d(${cx.toFixed(1)}px,${(-GH - 1).toFixed(1)}px,${cz.toFixed(1)}px) rotateX(90deg)`);
  }

  /* roof: a gable for a plain rectangle, otherwise a hip roof rising to the middle of the footprint */
  if (inside) {
    /* cut-away: no roof, so the rooms can be seen */
  } else if (roofType === "flat") {
    /* flat slab roof with a deep overhang (rectangles) and a white fascia */
    const TH = 0.35 * s, ov = g.isRect ? 0.7 * s : 0, Wr = W + 2 * ov, Dr = D + 2 * ov, top = -(Hs + TH);
    const clip = g.isRect ? "" : "clip-path:polygon(" + gp.map(q => `${(q.x / g.w * 100).toFixed(2)}% ${((g.d - q.y) / g.d * 100).toFixed(2)}%`).join(",") + ")";
    html += face("roof-flat sh-roofa", Wr, Dr, `translate3d(0,${top.toFixed(1)}px,0) rotateX(90deg)`, "", clip);
    if (g.isRect) {
      const fy = -(Hs + TH / 2);
      html += face("fascia sh-front", Wr, TH, `translate3d(0,${fy.toFixed(1)}px,${(Dr / 2).toFixed(1)}px)`);
      html += face("fascia sh-rear", Wr, TH, `translate3d(0,${fy.toFixed(1)}px,${(-Dr / 2).toFixed(1)}px) rotateY(180deg)`);
      html += face("fascia sh-side", Dr, TH, `translate3d(${(-Wr / 2).toFixed(1)}px,${fy.toFixed(1)}px,0) rotateY(-90deg)`);
      html += face("fascia sh-side", Dr, TH, `translate3d(${(Wr / 2).toFixed(1)}px,${fy.toFixed(1)}px,0) rotateY(90deg)`);
    } else E.forEach(e => {
      const cls2 = e.nz > 0.5 ? "sh-front" : e.nz < -0.5 ? "sh-rear" : "sh-side";
      html += face("fascia " + cls2, e.len * s, TH, `translate3d(${X(e.mx).toFixed(1)}px,${(-(Hs + TH / 2)).toFixed(1)}px,${Z(e.my).toFixed(1)}px) rotateY(${e.th.toFixed(2)}deg)`);
    });
  } else if (g.isRect && roofType !== "hip") {
    const ov = 0.4 * s;
    const half = D / 2;
    const a = Math.atan2(RH, half);
    const L = Math.hypot(half, RH) + ov;
    const tilt = 90 - a * 180 / Math.PI;
    const dz = (ov / 2) * Math.cos(a), dy = (ov / 2) * Math.sin(a);
    const ry = -(Hs + RH / 2) + dy;

    html += face("roof-face sh-roofa", W + 2 * ov, L, `translate3d(0,${ry}px,${D / 4 + dz}px) rotateX(${tilt}deg)`);
    html += face("roof-face sh-roofb", W + 2 * ov, L, `translate3d(0,${ry}px,${-(D / 4 + dz)}px) rotateX(${-tilt}deg)`);

    const gy = -(Hs + RH / 2);
    html += face(`${wc} sh-side`, D, RH, `translate3d(${-W / 2}px,${gy}px,0) rotateY(-90deg)`, "", "clip-path:polygon(50% 0,100% 100%,0 100%)");
    html += face(`${wc} sh-side`, D, RH, `translate3d(${W / 2}px,${gy}px,0) rotateY(90deg)`, "", "clip-path:polygon(50% 0,100% 100%,0 100%)");
  } else {
    const cen = polyCentroid(gp), apex = [X(cen.x), -(Hs + RH), Z(cen.y)], ov = 0.4 * s;
    const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
    const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
    const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
    const unit = p => { const l = Math.hypot(...p) || 1; return [p[0] / l, p[1] / l, p[2] / l]; };
    E.forEach(e => {
      const o = [e.dy / e.len * ov, 0, e.dx / e.len * ov];         // push the eave outward a little
      const A = [X(e.a.x) + o[0], -Hs, Z(e.a.y) + o[2]], B = [X(e.b.x) + o[0], -Hs, Z(e.b.y) + o[2]];
      const AB = sub(B, A), Ln = Math.hypot(...AB), u = unit(AB), AC = sub(apex, A), t = dot(AC, u);
      const vv = sub(AC, u.map(c => c * t)), hgt = Math.hypot(...vv), v = unit(vv), w = cross(u, v);
      if (Ln < 1 || hgt < 1) return;
      const m = [...u, 0, ...v, 0, ...w, 0, ...A, 1].map(c => (Math.abs(c) < 1e-9 ? 0 : c)).join(",");
      html += `<div class="face roof-face ${e.nz > 0 ? "sh-roofa" : "sh-roofb"}" style="width:${Ln.toFixed(1)}px;height:${hgt.toFixed(1)}px;margin:0;transform-origin:0 0;transform:matrix3d(${m});clip-path:polygon(0 0,100% 0,${(t / Ln * 100).toFixed(2)}% 100%)"></div>`;
    });
  }

  const wg = `<div class="wgroup" style="transform:translate3d(${(-fu * s).toFixed(1)}px,0,${(ft * s).toFixed(1)}px)">${world}</div>`;
  const hg = lotOnly ? "" : `<div class="hgroup" style="transform:translate3d(${(pl.u0 * s - fu * s).toFixed(1)}px,0,${(-(pl.hf + g.d / 2) * s + ft * s).toFixed(1)}px)">${html}</div>`;
  scene.innerHTML = wg + hg;
  viewOffset = lotOnly ? 0 : inside ? (vf * FH + 1.6 * s) / 2 : (Hs + RH) / 2;
  updateTransform();

  /* captions */
  const R = S.rooms;
  const tags = [];
  if (ex.cars) tags.push(`${ex.cars}-car garage${ex.gOut ? " (separate)" : ""}`);
  if (ex.T) tags.push("terrace");
  if (ex.bal) tags.push("balcony");
  $("viewerTitle").textContent = lotOnly ? "Your Lot" : "Your House";
  $("viewerSub").textContent = lotOnly ? `${r1(polyArea(S.lot.pts))} sqm lot, ${S.lot.pts.length} sides — the house comes after the next questions` :
    `${fl} floor${fl > 1 ? "s" : ""} · ${num(S.floorArea)} sqm · ${R.bed + R.master} bedroom${R.bed + R.master === 1 ? "" : "s"} · ${R.master + R.cr} bath${R.master + R.cr === 1 ? "" : "s"}` +
    ` · ${WALLS[S.walls].name} walls${S.glass ? ` · ${Math.round(S.glass * 100)}% glass` : ""}${tags.length ? " · " + tags.join(", ") : ""}`;
  const cb = $("coverBadge");
  cb.textContent = lotOnly ? `Lot ${r1(polyArea(S.lot.pts))} sqm` : (pl.fits ? `Lot coverage ${Math.round(g.coverage)}%` : "⚠ House doesn't fit the lot");
  cb.classList.toggle("warn", !lotOnly && (!pl.fits || g.coverage > 100));
}


/* =========================
   RESULTS
========================= */

function setPrice(key, v) {
  const n = parseFloat(v);
  if (n >= 0) prices[key] = n;
  renderResults();
}

function setExtraPrice(id, v) {
  const n = parseFloat(v), x = (S.extraItems || []).find(e => e.id === id);
  if (x && n >= 0) x.price = n;
  liveUpdate();
}
function removeExtra(id) {
  S.extraItems = (S.extraItems || []).filter(e => e.id !== id);
  liveUpdate();
}

function resetPrices() {
  prices = { ...DEFAULT_PRICES };
  renderResults();
}

const TILE_LABELS = {
  chb: ["Hollow blocks 8\"×16\"", "pcs"], cement: ["Cement", "sacks"], sand: ["Sand", "m³"], gravel: ["Gravel", "m³"],
  rebar: ["Rebar", "kg"], roofsheet: ["Roofing sheets", "pcs"], glass: ["Glass", "m²"], lumber: ["Lumber", "bd.ft"]
};

function renderResults() {
  const el = $("results");

  if (!allAnswered()) {
    const left = answered.filter(a => !a).length;
    el.innerHTML = `<div class="card placeholder"><strong>Your estimate will appear here</strong>
      Answer the remaining ${left} question${left > 1 ? "s" : ""} to see your materials, labor and budget check.</div>`;
    return;
  }

  const c = calc(S);
  const remaining = S.budget - c.total;
  const ok = remaining >= 0;
  let h = "";

  if (!c.plan.fits) {
    h += `<div class="card warn-card"><strong>⚠ Your rooms don't fit your floor area</strong>
      <p>Your rooms, stairs and garage need about ${Math.ceil(c.plan.minTotal)} sqm, but the floor area is ${num(S.floorArea)} sqm.
      Open <a href="#" onclick="openQuestion(${STEPS.findIndex(x => x.id === "rooms")});return false">Rooms</a> to remove a room, or increase the floor area.</p></div>`;
  }

  if (S.floors > 1 && S.layout.noStairs) {
    h += `<div class="card warn-card"><strong>⚠ No staircase</strong>
      <p>This ${S.floors}-floor house has no staircase, so nobody can reach the upper floor. Plan an outside stair or a lift, or <a href="#" data-addstairs="1" onclick="return false">add the staircase back</a>.</p></div>`;
  }

  const hp = placeHouse(S);
  if (!hp.fits) {
    h += `<div class="card warn-card"><strong>⚠ The house doesn't fit inside your lot</strong>
      <p>A ${r1(hp.Wb)} × ${r1(hp.Db)} m house (with its garage, terrace and so on) doesn't fit your lot shape with the usual setbacks (3 m front, 1.5 m sides, 2 m rear).
      Try <a href="#" onclick="openQuestion(${STEPS.findIndex(x => x.id === "floors")});return false">more floors</a>, a smaller floor area, or check the lot sides.</p></div>`;
  }

  /* summary */
  h += `<div class="stats-grid">
    <div class="stat-card"><small>Your budget</small><strong>${peso(S.budget)}</strong></div>
    <div class="stat-card"><small>Estimated total</small><strong>${peso(c.total)}</strong></div>
    <div class="stat-card ${ok ? "good" : "bad"}"><small>${ok ? "Remaining" : "Over budget by"}</small><strong>${peso(Math.abs(remaining))}</strong></div>
    <div class="stat-card"><small>Materials</small><strong>${peso(c.matTotal)}</strong></div>
    <div class="stat-card"><small>${c.pay.type === "pakyawan" ? "Labor (pakyawan)" : "Labor"}</small><strong>${peso(c.pay.labor)}</strong></div>
    ${c.pay.type === "contractor" ? `<div class="stat-card"><small>Contractor's fee</small><strong>${peso(c.pay.fee)}</strong></div>` : ""}
  </div>`;

  /* cost breakdown */
  const parts = costLines(c);
  h += `<div class="section-title"><div><h2>Cost breakdown</h2><p>${PAY_TYPES.find(t => t.id === c.pay.type).name}: where the money goes</p></div></div>
    <div class="card">
      <div class="cost-bar">${parts.map(p => `<div style="width:${p[1] / c.total * 100}%;background:${p[2]}"></div>`).join("")}</div>
      <div class="legend">${parts.map(p => `<span><i style="background:${p[2]}"></i>${p[0]}<b>${Math.round(p[1] / c.total * 100)}%</b></span>`).join("")}</div>
      <div class="cost-rows">
        ${parts.map(p => `<div><span>${p[0]}</span><strong>${peso(p[1])}</strong></div>`).join("")}
        <div class="total"><span>${c.pay.type === "contractor" ? "Total the client pays" : "Estimated total"}</span><span>${peso(c.total)}</span></div>
      </div>
      ${c.pay.type === "pakyawan" ? `<p class="note" style="margin-top:10px">Pakyawan: fixed labor price ${peso(c.pay.labor)}. Estimated crew cost ${peso(c.pay.crewCost)}, so ${peso(c.pay.margin)} is left for the foreman.</p>` : c.pay.type === "contractor" ? `<p class="note" style="margin-top:10px">Contractor's fee ${peso(c.pay.fee)} (${c.pay.feeMode === "fixed" ? "fixed" : (Number(c.pay.feePct) || 0) + "% of " + peso(c.pay.feeBase)}) is included in the total.</p>` : ""}
    </div>`;

  /* materials */
  const tiles = Object.keys(TILE_LABELS).filter(k => c.keyTotals[k] > 0);
  h += `<div class="section-title"><div><h2>Materials breakdown</h2><p>Quantities from your design. Prices are sample values — click a price to change it.</p></div>
    <button class="outline-btn" onclick="resetPrices()">Reset prices</button></div>
    <div class="key-tiles">${tiles.map(k => `<div class="key-tile"><small>${TILE_LABELS[k][0]}</small><strong>${num(c.keyTotals[k])}</strong><span>${TILE_LABELS[k][1]}</span></div>`).join("")}</div>`;

  c.cats.forEach(cat => {
    h += `<div class="card cat-card">
      <div class="cat-head"><h3>${cat.icon} ${cat.name}</h3><strong>${peso(cat.total)}</strong></div>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Item</th><th class="num">Quantity</th><th>Unit</th><th class="num">Unit price (₱)</th><th class="num">Cost</th></tr></thead>
        <tbody>${cat.items.map(i => `<tr>
          <td>${esc(i.name)}</td>
          <td class="num"><strong>${Number.isInteger(i.qty) ? num(i.qty) : i.qty}</strong></td>
          <td>${i.unit}</td>
          <td class="num">${i.extra
            ? `<input class="price-input" type="number" min="0" value="${i.price}" onchange="setExtraPrice('${i.xid}',this.value)"> <button class="x" title="Remove" onclick="removeExtra('${i.xid}')">✕</button>`
            : `<input class="price-input" type="number" min="0" value="${prices[i.key]}" onchange="setPrice('${i.key}',this.value)">`}</td>
          <td class="cost">${peso(i.cost)}</td></tr>`).join("")}</tbody>
      </table></div></div>`;
  });

  /* labor */
  h += `<div class="section-title"><div><h2>Labor breakdown</h2><p>${c.labor.headcount} workers · about ${c.labor.duration} working days</p></div>
    <button class="outline-btn" onclick="openQuestion(${LABOR_STEP})">Edit crew</button></div>
    <div class="card"><div class="table-wrap"><table class="data-table">
      <thead><tr><th>Worker</th><th>Type</th><th class="num">Daily rate</th><th class="num">Workers</th><th class="num">Days</th><th class="num">Cost</th></tr></thead>
      <tbody>${c.labor.rows.filter(r => r.count > 0).map(r => `<tr>
        <td><strong>${esc(r.name)}</strong></td><td><span class="tier tier-${r.tier}">${r.tier}</span></td>
        <td class="num">${peso(r.rate)}</td><td class="num">${r.count}</td><td class="num">${r.days}</td><td class="cost">${peso(r.cost)}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="5">${c.pay.type === "pakyawan" ? "Estimated crew cost" : "Total labor"}</td><td class="cost">${peso(c.labor.total)}</td></tr>
      ${c.pay.type === "pakyawan" ? `<tr><td colspan="5">Pakyawan price (fixed)</td><td class="cost">${peso(c.pay.labor)}</td></tr><tr><td colspan="5">Left for the foreman</td><td class="cost">${peso(c.pay.margin)}</td></tr>` : ""}</tfoot>
    </table></div></div>`;

  /* weekly build plan */
  if (window.Sched) { try { h += Sched.html(c); } catch (e) { console.error("schedule", e); } }

  /* budget advisor */
  const pct = Math.min(c.total / S.budget * 100, 100);
  const SCEN = [
    { label: "Concrete hollow block, all solid", o: { walls: "chb", glass: 0 } },
    { label: "Wood, all solid", o: { walls: "wood", glass: 0 } },
    { label: "Half glass (50%)", o: { glass: 0.5 } },
    { label: "Full glass (100%)", o: { glass: 1 } },
    { label: "Room dividers: hollow block", o: { partitions: "chb4" } },
    { label: "Room dividers: plywood", o: { partitions: "plywood" } },
    { label: "Room dividers: gypsum board", o: { partitions: "gypsum" } }
  ];
  const cmp = SCEN.map(x => ({ ...x, total: calc({ ...S, ...x.o }).total, current: Object.keys(x.o).every(k => S[k] === x.o[k]) }));
  const cheapest = cmp.reduce((a, b) => (b.total < a.total ? b : a));
  let rec;
  if (ok) {
    rec = `<strong style="color:var(--green)">✓ Your design fits your budget.</strong><br>
      Estimated cost is <strong>${peso(c.total)}</strong>, leaving about <strong>${peso(remaining)}</strong>.
      Keep part of this as extra contingency, since prices and site conditions often change.`;
  } else {
    const fenceSave = S.fence ? c.total - calc({ ...S, fence: false }).total : 0;
    const fit = fitArea(S);
    let tips = `<li>Reduce the floor area to about <strong>${fit} sqm</strong> to fit your budget.</li>`;
    if (!cheapest.current && cheapest.total < c.total) tips += `<li>Switching to <strong>${cheapest.label}</strong> would save about ${peso(c.total - cheapest.total)}.</li>`;
    if (fenceSave > 0) tips += `<li>Postponing the perimeter fence would save about ${peso(fenceSave)}.</li>`;
    tips += `<li>Reduce the crew size or number of working days in the labor section.</li>`;
    rec = `<strong style="color:var(--red)">⚠ Your design is ${peso(-remaining)} over budget.</strong>
      <ul>${tips}</ul>`;
  }

  h += `<div class="section-title"><div><h2>Budget advisor</h2><p>Does your plan fit what you can spend?</p></div>
    <span class="badge ${ok ? "good-badge" : "bad-badge"}">${ok ? "Within budget" : "Over budget"}</span></div>
    <div class="card">
      <div class="progress"><div style="width:${pct}%;background:${ok ? (pct > 90 ? "#f59e0b" : "#16a34a") : "#dc2626"}"></div></div>
      <div class="recommendation">${rec}${advisorNote ? `<br><br><em>${advisorNote}</em>` : ""}</div>
      ${ok ? "" : `<button class="primary-btn" onclick="optimizeBudget()">Optimize my budget</button>`}
      <h3 style="margin:22px 0 8px;font-size:14px">Total cost by wall option</h3>
      <div class="table-wrap"><table class="data-table compare">
        <thead><tr><th>Wall option</th><th class="num">Estimated total</th><th class="num">vs. your choice</th></tr></thead>
        <tbody>${cmp.map(x => `<tr class="${x.current ? "current" : ""}">
          <td>${x.label}${x.current ? " (current)" : ""}</td>
          <td class="num">${peso(x.total)}</td>
          <td class="num">${x.current ? "—" : (x.total - c.total > 0 ? "+" : "−") + peso(Math.abs(x.total - c.total))}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>`;

  /* stages */
  h += `<details class="card" style="margin-top:18px"><summary>Construction stages</summary><div class="stages">
    <div><b>1. Plans & preparation</b> — house plans, structural plans, permits, contractor quotation.</div>
    <div><b>2. Foundation</b> — rebar, cement, sand, gravel, tie wire.</div>
    <div><b>3. Walls & structure</b> — ${WALLS[S.walls].name.toLowerCase()} exterior walls, columns and beams${S.floors > 1 ? ", elevated slab and stairs" : ""}${S.balcony && S.floors > 1 ? ", balcony slab" : ""}.</div>
    <div><b>4. Roofing</b> — trusses, purlins, roofing sheets, ridge roll${S.terrace ? ", terrace roof" : ""}.</div>
    <div><b>5. Room dividers & bathrooms</b> — ${PARTITIONS[S.partitions].name.toLowerCase()} between rooms; bathroom walls in plastered block with wall tiles.</div>
    <div><b>6. Finishing${S.fence ? " & fence" : ""}</b> — doors, windows, tiles, paint, electrical, plumbing${S.garage ? ", garage floor and door" : ""}${S.terrace ? ", terrace" : ""}${S.fence ? ", perimeter fence and gate" : ""}.</div>
  </div></details>`;

  el.innerHTML = h;
}

function optimizeBudget() {
  const fit = fitArea(S);
  if (fit < S.floorArea) {
    S.floorArea = fit;
    advisorNote = calc({ ...S, floorArea: fit }).total <= S.budget
      ? `Floor area reduced to ${fit} sqm to bring the estimate within your budget.`
      : `Floor area reduced to ${fit} sqm, the smallest size that still fits your rooms, but the estimate is still over budget. Try fewer rooms, a cheaper wall or divider material, skip the garage or fence, or trim the crew.`;
  } else {
    advisorNote = calc(S).total > S.budget
      ? `The floor area can't shrink further without removing rooms (your rooms need about ${fit} sqm). Try fewer rooms, a cheaper divider material, or skip the garage, terrace or fence.`
      : "Already within budget.";
  }
  if (editing === null) snapshot = JSON.parse(JSON.stringify(S));
  refreshAll();
}


/* =========================
   REFRESH
========================= */

function liveUpdate() {
  pruneStairs();
  advisorNote = "";
  renderSidebar();
  renderActiveView();
  renderResults();
}

function refreshAll() {
  pruneStairs();
  modeForEdit();
  renderSidebar();
  renderQuestion();
  renderActiveView();
  renderResults();
}

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Start over and clear all your answers?")) return;
  setLot(presetPts("rect", 200), 0, "", "Rectangle");
  S.placement = null;
  Object.assign(S, { floorArea: 65, floors: 1, aspect: 4 / 3, partitions: "chb4", walls: "chb", glass: 0, windows: { count: 8, w: 1.2, h: 1.1 }, fence: true, budget: 1500000, crew: defaultCrew(), extraItems: [], lotItems: [], elec: null });
  resetLayout();
  answered = STEPS.map(() => false);
  advisorNote = "";
  openQuestion(0);
  refreshAll();
});


/* =========================
   INITIALIZE
========================= */

resetLayout();
bindFloor();
document.querySelectorAll("#viewTabs button").forEach(b => b.addEventListener("click", () => setViewMode(b.dataset.mode)));
bindPlan();
openQuestion(0);
refreshAll();
tick();