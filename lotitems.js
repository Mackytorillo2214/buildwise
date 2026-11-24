/* Extra things on the lot: a second house, an outdoor store, a pool, a garden...
   They live in S.lotItems as {id, type, name, u, t, w, d} (u/t are lot-frame metres: u along the road, t into the lot;
   the rectangle runs from (u, t) to (u + w, t + d)). Uses globals from script.js. */
(function () {
  const TYPES = {
    house2:  { icon: "🏠", name: "Second house / guest house", w: 8,  d: 7,  rate: 15000, days: 1.0,  color: "#efe7d6", h: 3.0 },
    store:   { icon: "🏪", name: "Outdoor store / sari-sari",  w: 4,  d: 3,  rate: 9000,  days: 0.8,  color: "#f6dfa4", h: 2.8 },
    pool:    { icon: "🏊", name: "Swimming pool",              w: 3,  d: 6,  rate: 20000, days: 0.9,  color: "#bfe6f2", h: 0 },
    gazebo:  { icon: "🛖", name: "Gazebo / kubo",              w: 4,  d: 4,  rate: 7000,  days: 0.6,  color: "#e7d3b0", h: 2.6 },
    carport: { icon: "🚗", name: "Extra carport / parking",    w: 3,  d: 5.5, rate: 4000, days: 0.3,  color: "#d9dde0", h: 2.5 },
    garden:  { icon: "🌿", name: "Garden / lawn",              w: 5,  d: 5,  rate: 350,   days: 0.05, color: "#cfe6c2", h: 0 },
    shed:    { icon: "📦", name: "Storage shed / workshop",    w: 3,  d: 3,  rate: 5500,  days: 0.6,  color: "#e6e2da", h: 2.4 },
    court:   { icon: "🏀", name: "Play / basketball court",    w: 6,  d: 10, rate: 1200,  days: 0.1,  color: "#f1c9a6", h: 0 },
    coop:    { icon: "🐔", name: "Farm plot / chicken coop",   w: 3,  d: 4,  rate: 2200,  days: 0.3,  color: "#f3e3b3", h: 1.4 },
    other:   { icon: "⭐", name: "Something else",              w: 4,  d: 4,  rate: 6000,  days: 0.5,  color: "#e4e1f1", h: 2.4 }
  };
  /* choices per kind of thing: single-choice groups, or multi:1 groups where several can be picked.
     A choice may set the size (w, d) and a default name (n). COSTS: mode s = per sqm of the item, f = flat, p = per metre of perimeter, h = per hoop */
  const C = (k, l, o) => Object.assign({ k, l }, o || {});
  const OPTS = {
    store: [
      { k: "size", label: "Size", def: "m", ch: [C("s", "Small 3 × 2.5 m", { w: 3, d: 2.5 }), C("m", "Standard 4 × 3 m", { w: 4, d: 3 }), C("l", "Large 6 × 4 m", { w: 6, d: 4 })] },
      { k: "kind", label: "Kind of store", def: "conv", ch: [C("conv", "🏪 Convenience store · roll-up shutter", { n: "Convenience store" }), C("sari", "🪟 Sari-sari · window counter", { n: "Sari-sari store" }), C("stall", "🛖 Open stall · no front wall", { n: "Market stall" })] },
      { k: "seat", label: "Outside the store", def: "chairs", ch: [C("chairs", "🪑 Chairs & table outside"), C("none", "No chairs outside")] },
      { k: "extra", label: "Extras", multi: 1, def: [], ch: [C("awn", "☂ Awning over the front"), C("fridge", "❄ Fridge / freezer corner"), C("sign", "🔆 Lighted signboard")] }
    ],
    court: [
      { k: "size", label: "Court size", def: "play", ch: [C("play", "Small play court 6 × 10 m", { w: 6, d: 10, n: "Play court" }), C("half", "Half court 14 × 15 m", { w: 14, d: 15, n: "Half basketball court" }), C("full", "Full court 15 × 28 m", { w: 15, d: 28, n: "Full basketball court" })] },
      { k: "roof", label: "Cover", def: "open", ch: [C("open", "☀ Open (not covered)"), C("cov", "🏗 Covered with a roof")] },
      { k: "floor", label: "Flooring", def: "paint", ch: [C("conc", "Plain concrete"), C("paint", "Painted concrete"), C("asph", "Asphalt"), C("tile", "Interlocking sports tiles"), C("rub", "Rubberized (acrylic) surface")] },
      { k: "extra", label: "Extras", multi: 1, def: ["hoop"], ch: [C("hoop", "🏀 Hoop and backboard"), C("light", "💡 Court lights"), C("fence", "🧱 Netting / fence around")] }
    ],
    pool: [
      { k: "size", label: "Pool size", def: "std", ch: [C("plunge", "Plunge pool 3 × 4 m", { w: 3, d: 4, n: "Plunge pool" }), C("std", "Standard 3 × 6 m", { w: 3, d: 6, n: "Swimming pool" }), C("lap", "Lap pool 4 × 10 m", { w: 4, d: 10, n: "Lap pool" })] },
      { k: "depth", label: "Depth", def: "std", ch: [C("kids", "Kids / shallow (1.0 m)"), C("std", "Standard (1.5 m)"), C("deep", "Deep (2 m)")] },
      { k: "extra", label: "Extras", multi: 1, def: ["filter"], ch: [C("filter", "⚙ Filter & pump"), C("deck", "🪑 Deck with loungers"), C("shade", "⛱ Shade / umbrella"), C("pfence", "🧱 Safety fence"), C("plight", "💡 Underwater lights")] }
    ],
    house2: [
      { k: "kind", label: "Kind of house", def: "guest", ch: [C("guest", "🏠 Guest house", { n: "Guest house" }), C("rent", "🏘 Rental unit", { n: "Rental unit" }), C("staff", "🧹 Caretaker quarters", { n: "Caretaker quarters" })] },
      { k: "storeys", label: "Storeys", def: "one", ch: [C("one", "1 storey"), C("two", "2 storeys")] },
      { k: "extra", label: "Includes", multi: 1, def: ["cr"], ch: [C("cr", "🚿 Own CR"), C("kitchen", "🍳 Small kitchen"), C("porch", "🏡 Porch")] }
    ],
    gazebo: [
      { k: "roof", label: "Roof", def: "metal", ch: [C("metal", "Metal roof"), C("nipa", "Nipa / thatch roof")] },
      { k: "extra", label: "Extras", multi: 1, def: [], ch: [C("bench", "🪑 Built-in benches"), C("grill", "🔥 Grill / outdoor kitchen"), C("glights", "💡 Lights")] }
    ],
    carport: [
      { k: "floor", label: "Floor", def: "conc", ch: [C("conc", "Plain concrete"), C("paver", "Paver blocks")] },
      { k: "roof", label: "Roof", def: "metal", ch: [C("metal", "Metal roof"), C("poly", "Polycarbonate (see-through)")] },
      { k: "extra", label: "Extras", multi: 1, def: [], ch: [C("gate", "🚪 Sliding gate")] }
    ],
    garden: [
      { k: "kind", label: "Kind of garden", def: "lawn", ch: [C("lawn", "🌿 Lawn with trees", { n: "Lawn & trees" }), C("veg", "🥬 Vegetable beds", { n: "Vegetable garden" }), C("flower", "🌸 Flower garden", { n: "Flower garden" }), C("fruit", "🥭 Fruit trees", { n: "Fruit trees" })] },
      { k: "extra", label: "Extras", multi: 1, def: [], ch: [C("walk", "👣 Stone walkway"), C("spr", "💧 Sprinkler / irrigation"), C("gfence", "🧱 Garden fence")] }
    ],
    shed: [
      { k: "use", label: "Use", def: "store", ch: [C("store", "📦 Storage", { n: "Storage shed" }), C("work", "🔧 Workshop", { n: "Workshop" }), C("laundry", "🧺 Laundry & drying", { n: "Laundry area" })] },
      { k: "extra", label: "Extras", multi: 1, def: [], ch: [C("power", "⚡ Power & lights"), C("water", "🚰 Water line & sink")] }
    ],
    coop: [
      { k: "kind", label: "Kind", def: "chick", ch: [C("chick", "🐔 Chicken coop", { n: "Chicken coop" }), C("veg", "🥬 Vegetable plot", { n: "Vegetable plot" }), C("fish", "🐟 Fish pond", { n: "Fish pond" })] },
      { k: "extra", label: "Extras", multi: 1, def: [], ch: [C("cfence", "🧱 Fence around"), C("cwater", "🚰 Water line")] }
    ]
  };
  const COSTS = {
    "store:conv": ["s", 2500, "Roll-up shutter, counter and shelving"], "store:sari": ["s", 1200, "Window counter and shelving"], "store:stall": ["s", 600, "Counter and shelving"],
    "store:chairs": ["f", 3500, "Outdoor chairs and table set"], "store:awn": ["s", 900, "Awning over the front"], "store:fridge": ["f", 6500, "Fridge corner: outlet and shelving"], "store:sign": ["f", 5500, "Lighted signboard"],
    "court:paint": ["s", 250, "Court paint and line marking"], "court:asph": ["s", 150, "Asphalt surface"], "court:tile": ["s", 1600, "Interlocking sports tiles"], "court:rub": ["s", 1900, "Rubberized acrylic surface"],
    "court:cov": ["s", 4500, "Roof over the court (steel trusses and sheets)"], "court:hoop": ["h", 15000, "Basketball hoop and backboard (each)"], "court:light": ["f", 24000, "Court lights, 4 poles"], "court:fence": ["p", 900, "Netting and posts around the court (per metre)"],
    "pool:deep": ["s", 1500, "Extra digging for the deep pool"], "pool:filter": ["f", 22000, "Pool filter and pump"], "pool:deck": ["f", 28000, "Pool deck with loungers"], "pool:shade": ["f", 8000, "Shade / umbrella"], "pool:pfence": ["p", 1800, "Pool safety fence (per metre)"], "pool:plight": ["f", 12000, "Underwater lights"],
    "house2:two": ["s", 14000, "Second storey (per sqm of footprint)"], "house2:cr": ["f", 65000, "Own CR (toilet, shower, lavatory)"], "house2:kitchen": ["f", 45000, "Small kitchen"], "house2:porch": ["f", 30000, "Porch"],
    "gazebo:nipa": ["s", 400, "Nipa / thatch roof finish"], "gazebo:bench": ["f", 9000, "Built-in benches"], "gazebo:grill": ["f", 18000, "Grill / outdoor kitchen"], "gazebo:glights": ["f", 4000, "Gazebo lights"],
    "carport:paver": ["s", 900, "Paver blocks"], "carport:poly": ["s", 500, "Polycarbonate roof"], "carport:gate": ["f", 18000, "Sliding gate"],
    "garden:walk": ["f", 12000, "Stone walkway"], "garden:spr": ["f", 15000, "Sprinkler / irrigation"], "garden:gfence": ["p", 700, "Garden fence (per metre)"],
    "shed:power": ["f", 9000, "Power and lights"], "shed:water": ["f", 12000, "Water line and sink"],
    "coop:cfence": ["p", 600, "Fence around (per metre)"], "coop:cwater": ["f", 8000, "Water line"]
  };
  /* line icons (48 x 48) for the cards and dialogs, so the screen doesn't depend on emoji */
  const P = d => `<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    house2: P('<path d="M6 23 24 8l18 15"/><path d="M10 20v20h28V20"/><path d="M20 40V28h8v12"/>'),
    store: P('<path d="M7 18 10 8h28l3 10"/><path d="M7 18c0 3 3 4 5.7 4S18 21 18 18c0 3 2.6 4 6 4s6-1 6-4c0 3 2.6 4 5.3 4S41 21 41 18"/><path d="M10 22v18h28V22"/><rect x="18" y="29" width="12" height="11"/>'),
    pool: P('<rect x="6" y="14" width="36" height="24" rx="4"/><path d="M12 27c3-3 6 3 9 0s6 3 9 0 5 2 6 0"/><path d="M16 14V8m10 6V8"/>'),
    gazebo: P('<path d="M5 20 24 7l19 13z"/><path d="M11 20v20m26-20v20m-13-20v20"/><path d="M8 40h32"/>'),
    carport: P('<path d="M6 16h36l-3 6H9z"/><path d="M12 22v18m24-18v18"/><path d="M17 36h14l-2-6h-10z"/><circle cx="20" cy="37" r="1.5"/><circle cx="28" cy="37" r="1.5"/>'),
    garden: P('<path d="M24 40V22"/><path d="M24 26c-8 0-12-5-12-11 8 0 12 4 12 11z"/><path d="M24 30c7 0 11-4 11-10-7 0-11 4-11 10z"/><path d="M10 40h28"/>'),
    shed: P('<path d="M6 20 24 8l18 12v20H6z"/><rect x="15" y="24" width="18" height="16"/><path d="M15 32h18M24 24v16"/>'),
    court: P('<rect x="5" y="11" width="38" height="26" rx="2"/><path d="M24 11v26"/><circle cx="24" cy="24" r="5"/><path d="M5 19h6v10H5m38-10h-6v10h6"/>'),
    coop: P('<path d="M8 22 24 10l16 12v18H8z"/><path d="M20 40v-9a4 4 0 0 1 8 0v9"/><path d="M5 40h38"/>'),
    other: P('<path d="M24 7l5 11 12 1.5-9 8 2.7 12L24 33l-10.7 6.5L16 27.5l-9-8L19 18z"/>')
  };
  const MAX = 12, r1 = v => Math.round(v * 10) / 10;
  const items = () => (S.lotItems || (S.lotItems = []));
  const T = it => TYPES[it.type] || TYPES.other;
  /* the current choice(s) of an item for a group */
  const pick = (it, k) => { const g = (OPTS[it.type] || []).find(x => x.k === k); const v = it.opt && it.opt[k]; return v !== undefined ? v : g ? (g.multi ? g.def.slice() : g.def) : null; };
  const has = (it, k, c) => { const v = pick(it, k); return Array.isArray(v) ? v.includes(c) : v === c; };
  const defaultOpt = type => Object.fromEntries((OPTS[type] || []).map(g => [g.k, g.multi ? g.def.slice() : g.def]));
  const choiceOf = (type, k, c) => ((OPTS[type] || []).find(g => g.k === k) || { ch: [] }).ch.find(x => x.k === c);
  let msg = "";

  /* ---------- geometry (lot frame) ---------- */
  const rectOf = it => ({ x0: it.u, y0: it.t, x1: it.u + it.w, y1: it.t + it.d });
  const grow = (r, g) => ({ x0: r.x0 - g, y0: r.y0 - g, x1: r.x1 + g, y1: r.y1 + g });
  const overlap = (a, b) => a.x0 < b.x1 - 1e-6 && a.x1 > b.x0 + 1e-6 && a.y0 < b.y1 - 1e-6 && a.y1 > b.y0 + 1e-6;
  function houseRects() {
    const m = houseModel(S), pl = placeHouse(S);
    return m.shapes.map(sh => {
      const xs = sh.pts.map(p => p.x + pl.ox), ys = sh.pts.map(p => p.y + pl.oy);
      return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
    });
  }
  function insideLot(r, margin) {
    const poly = houseModel(S).lotPoly, pts = [];
    const nx = Math.max(1, Math.ceil((r.x1 - r.x0) / 0.5)), ny = Math.max(1, Math.ceil((r.y1 - r.y0) / 0.5));
    for (let i = 0; i <= nx; i++) { const x = r.x0 + (r.x1 - r.x0) * i / nx; pts.push({ x, y: r.y0 }, { x, y: r.y1 }); }
    for (let j = 0; j <= ny; j++) { const y = r.y0 + (r.y1 - r.y0) * j / ny; pts.push({ x: r.x0, y }, { x: r.x1, y }); }
    for (const p of pts) {
      if (!pointInPoly(p, poly)) return false;
      if (margin > 0) for (let k = 0; k < poly.length; k++) if (segDist(p, poly[k], poly[(k + 1) % poly.length]) < margin - 1e-6) return false;
    }
    /* a lot corner poking into the rectangle means the rectangle crosses the boundary */
    return !poly.some(v => v.x > r.x0 + 0.02 && v.x < r.x1 - 0.02 && v.y > r.y0 + 0.02 && v.y < r.y1 - 0.02);
  }
  const clearOf = (r, skipId, gap) => !houseRects().some(h => overlap(r, grow(h, gap))) && !items().some(o => o.id !== skipId && overlap(r, grow(rectOf(o), gap)));
  const validAt = (it, u, t, margin, gap) => { const r = rectOf({ ...it, u, t }); return insideLot(r, margin) && clearOf(r, it.id, gap); };

  function findSpot(it, margin, gap) {
    const poly = houseModel(S).lotPoly;
    const us = poly.map(p => p.x), ts = poly.map(p => p.y);
    const hr = houseRects(), cx = hr.length ? (hr[0].x0 + hr[0].x1) / 2 : 0, cy = hr.length ? (hr[0].y0 + hr[0].y1) / 2 : 0;
    const cand = [];
    for (let u = Math.min(...us); u <= Math.max(...us); u += 0.5) for (let t = Math.min(...ts); t <= Math.max(...ts); t += 0.5) cand.push({ u, t, k: Math.hypot(u + it.w / 2 - cx, t + it.d / 2 - cy) });
    cand.sort((a, b) => a.k - b.k);
    return cand.find(c => validAt(it, c.u, c.t, margin, gap)) || null;
  }

  /* ---------- how much room is left ---------- */
  function freeArea() {
    const lot = S.lotArea || polyArea(S.lot.pts);
    const hr = houseRects(), foot = hr.reduce((a, r) => a + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
    const used = items().reduce((a, o) => a + o.w * o.d, 0);
    return Math.max(0, lot - foot - used);
  }

  /* ---------- editing ---------- */
  function add(type, opt) {
    if (items().length >= MAX) { msg = `That's the most extras this planner can hold (${MAX}).`; return false; }
    const ty = TYPES[type], it = { id: "li" + Math.random().toString(36).slice(2, 8), type, name: ty.name, u: 0, t: 0, w: ty.w, d: ty.d, opt: opt || defaultOpt(type) };
    (OPTS[type] || []).forEach(g => { const c = !g.multi && choiceOf(type, g.k, it.opt[g.k]); if (c && c.w) { it.w = c.w; it.d = c.d; } if (c && c.n) { it.name = c.n; it.auto = c.n; } });
    let spot = findSpot(it, 1, 1) || findSpot(it, 0.6, 0.5);
    if (!spot) {   /* try a smaller one before giving up */
      const small = { ...it, w: Math.max(2, ty.w * 0.7), d: Math.max(2, ty.d * 0.7) };
      spot = findSpot(small, 0.6, 0.5);
      if (spot) { it.w = r1(small.w); it.d = r1(small.d); }
    }
    if (!spot) { msg = "There isn't a free spot big enough on your lot for that. Make the lot bigger, move the house, or remove something."; return false; }
    it.u = spot.u; it.t = spot.t; items().push(it); msg = ""; return true;
  }
  /* change one choice of an item: toggles in multi groups; a size choice resizes it, a kind choice renames it (unless the owner typed a name) */
  function setPick(id, k, c) {
    const it = items().find(o => o.id === id); if (!it) return;
    const g = (OPTS[it.type] || []).find(x => x.k === k); if (!g) return;
    it.opt = it.opt || defaultOpt(it.type);
    if (g.multi) { const cur = pick(it, k); it.opt[k] = cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c]; msg = ""; return; }
    it.opt[k] = c;
    const ch = choiceOf(it.type, k, c);
    if (ch && ch.n && (it.name === it.auto || it.name === T(it).name)) { it.name = ch.n; it.auto = ch.n; }
    if (ch && ch.w) {
      const test = { ...it, w: ch.w, d: ch.d };
      if (validAt(test, it.u, it.t, 0.3, 0)) { it.w = ch.w; it.d = ch.d; msg = ""; }
      else { const sp = findSpot(test, 0.6, 0.5); if (sp) { Object.assign(it, { w: ch.w, d: ch.d, u: sp.u, t: sp.t }); msg = "Moved it to a spot where that size fits."; } else { msg = "That size doesn't fit on your lot. Make the lot bigger or remove something."; } }
    }
  }
  function remove(id) { S.lotItems = items().filter(o => o.id !== id); msg = ""; }
  function resize(id, f, v) {
    const it = items().find(o => o.id === id); if (!it) return;
    if (f === "name") { it.name = String(v).trim().slice(0, 30) || T(it).name; return; }
    v = Math.max(1, Math.min(60, Number(v) || it[f]));
    const test = { ...it, [f]: v };
    if (validAt(test, it.u, it.t, 0.3, 0)) { it[f] = v; msg = ""; return; }
    const spot = findSpot(test, 0.6, 0.5);
    if (spot) { it[f] = v; it.u = spot.u; it.t = spot.t; msg = "Moved it to a spot where the new size fits."; } else msg = "That size doesn't fit on your lot.";
  }

  /* selecting, dragging and resizing in the plan */
  let sel = null, drag = null;
  const getSel = () => items().find(o => o.id === sel) || null;
  function turn(id) {
    const it = items().find(o => o.id === id); if (!it) return;
    const test = { ...it, w: it.d, d: it.w };
    if (validAt(test, it.u, it.t, 0.3, 0)) { it.w = test.w; it.d = test.d; msg = ""; return; }
    const cx = it.u + it.w / 2, cy = it.t + it.d / 2;   // turn around the middle
    const tu = cx - test.w / 2, tt = cy - test.d / 2;
    if (validAt(test, tu, tt, 0.3, 0)) { Object.assign(it, { w: test.w, d: test.d, u: tu, t: tt }); msg = ""; return; }
    const spot = findSpot(test, 0.6, 0.5);
    if (spot) { Object.assign(it, { w: test.w, d: test.d, u: spot.u, t: spot.t }); msg = "Moved it to a spot where it fits when turned."; } else msg = "It doesn't fit when turned here.";
  }
  function down(d, q) {
    drag = null;
    const id = d.item || d.lih || d.lirot || d.lidel;
    const it = items().find(o => o.id === id); if (!it) return false;
    sel = id; renderBox();
    if (d.lirot) { turn(id); renderBox(); return false; }
    if (d.lidel) { askRemove(id); return false; }
    if (d.lih) { drag = { id, mode: "rs", edge: d.edge, r0: { ...rectOf(it) } }; return true; }
    drag = { id, mode: "mv", du: q.u - it.u, dt: q.t - it.t };
    return true;
  }
  function move(q) {
    if (!drag) return false;
    const it = items().find(o => o.id === drag.id); if (!it) return false;
    if (drag.mode === "rs") {
      const e = drag.edge, r0 = drag.r0, sn = v => Math.round(v / 0.25) * 0.25, MIN = 1;
      let x0 = r0.x0, x1 = r0.x1, y0 = r0.y0, y1 = r0.y1;
      if (e.includes("l")) x0 = Math.min(sn(q.u), x1 - MIN);
      if (e.includes("r")) x1 = Math.max(sn(q.u), x0 + MIN);
      if (e.includes("f")) y0 = Math.min(sn(q.t), y1 - MIN);
      if (e.includes("b")) y1 = Math.max(sn(q.t), y0 + MIN);
      const tryIt = (a, b, c, d2) => { const t2 = { ...it, u: a, t: c, w: b - a, d: d2 - c }; return validAt(t2, a, c, 0.3, 0) ? t2 : null; };
      let ok = tryIt(x0, x1, y0, y1);
      if (!ok) ok = tryIt(x0, x1, it.t, it.t + it.d) || tryIt(it.u, it.u + it.w, y0, y1);   // slide along the free axis
      if (!ok) return false;
      it.u = ok.u; it.t = ok.t; it.w = ok.w; it.d = ok.d; return true;
    }
    const u = Math.round((q.u - drag.du) / 0.25) * 0.25, t = Math.round((q.t - drag.dt) / 0.25) * 0.25;
    if (validAt(it, u, t, 0.3, 0)) { it.u = u; it.t = t; return true; }
    if (validAt(it, u, it.t, 0.3, 0)) { it.u = u; return true; }
    if (validAt(it, it.u, t, 0.3, 0)) { it.t = t; return true; }
    return false;
  }
  function up() { drag = null; }
  const deselect = () => { sel = null; };

  /* ask first, so a slip of the finger doesn't delete it */
  function askRemove(id) {
    const it = items().find(o => o.id === id); if (!it) return;
    document.getElementById("rmAsk") && document.getElementById("rmAsk").remove();
    const box = document.createElement("div"); box.id = "rmAsk"; box.className = "rm-ask";
    box.innerHTML = `<div class="rm-card" role="alertdialog"><h3>Remove ${esc(it.name)}?</h3><p>This takes it off your lot and out of the cost and schedule. You can add it again any time.</p>
      <div class="rm-btns"><button type="button" class="outline-btn" data-rm="keep">Keep it</button><button type="button" class="primary-btn danger" data-rm="yes">Yes, remove</button></div></div>`;
    document.body.appendChild(box);
    box.addEventListener("click", e => {
      const a = e.target.dataset && e.target.dataset.rm;
      if (a === "yes") { box.remove(); remove(id); if (sel === id) sel = null; changed(); if (typeof renderPlan === "function") renderPlan(); }
      else if (a === "keep" || e.target === box) box.remove();
    });
  }

  /* things that overlap or stick out (e.g. the house was dragged on top of a pool) */
  function problems() {
    const out = [], hr = houseRects();
    items().forEach(o => {
      const r = rectOf(o);
      if (!insideLot(r, 0)) out.push(`${o.name} sticks out of the lot`);
      else if (hr.some(h => overlap(r, h))) out.push(`${o.name} overlaps the house`);
      else if (items().some(p => p.id < o.id && overlap(r, rectOf(p)))) out.push(`${o.name} overlaps another item`);
    });
    return out;
  }

  /* ---------- costs and time ---------- */
  function cats(st, item) {
    const list = (st.lotItems || []).filter(o => o.w > 0 && o.d > 0);
    if (!list.length) return [];
    const agg = {}, extra = {};
    list.forEach(o => {
      const k = "lot_" + o.type; (agg[k] = agg[k] || { k, type: o.type, a: 0, names: [] }); agg[k].a += o.w * o.d; agg[k].names.push(o.name);
      (OPTS[o.type] || []).forEach(g => { const v = pick(o, g.k); (Array.isArray(v) ? v : [v]).forEach(c => {
        const co = COSTS[o.type + ":" + c]; if (!co) return; const key = "lopt_" + o.type + "_" + c, e = (extra[key] = extra[key] || { key, co, q: 0 });
        e.q += co[0] === "s" ? o.w * o.d : co[0] === "p" ? 2 * (o.w + o.d) : co[0] === "h" ? (o.type === "court" && has(o, "size", "full") ? 2 : 1) : 1; }); });
    });
    const rows = Object.values(agg).map(x => item(x.k, `${TYPES[x.type].name} (${x.names.length > 1 ? x.names.length + " items, " : ""}materials)`, Math.ceil(x.a), "sqm"))
      .concat(Object.values(extra).map(e => item(e.key, e.co[2], Math.ceil(e.q), e.co[0] === "s" ? "sqm" : e.co[0] === "p" ? "m" : "pc")));
    return [{ name: "Other buildings & features on the lot", icon: "🏗️", items: rows }];
  }
  const days = st => Math.ceil((st.lotItems || []).reduce((a, o) => a + o.w * o.d * (TYPES[o.type] || TYPES.other).days, 0));
  const priceKeys = () => Object.assign(Object.fromEntries(Object.entries(TYPES).map(([k, v]) => ["lot_" + k, v.rate])), Object.fromEntries(Object.entries(COSTS).map(([k, v]) => ["lopt_" + k.replace(":", "_"), v[1]])));

  /* ---------- the lot plan (SVG) ---------- */
  function svg(P, fr, px, halo, editingLot) {
    let h = "";
    const bad = new Set();
    const hr = houseRects();
    items().forEach(o => { const r = rectOf(o); if (!insideLot(r, 0) || hr.some(q => overlap(r, q)) || items().some(p => p.id !== o.id && overlap(r, rectOf(p)))) bad.add(o.id); });
    items().forEach(o => {
      const ty = T(o), pts = [[o.u, o.t], [o.u + o.w, o.t], [o.u + o.w, o.t + o.d], [o.u, o.t + o.d]].map(([a, b]) => P(fr.toMap(a, b))).join(" ");
      const c = fr.toMap(o.u + o.w / 2, o.t + o.d / 2), isBad = bad.has(o.id);
      const fs = Math.min(px(12), Math.min(o.w, o.d) / 3.2), isSel = o.id === sel;
      h += `<g><polygon data-item="${o.id}" style="cursor:move;pointer-events:auto" points="${pts}" fill="${ty.color}" fill-opacity="0.92" stroke="${isBad ? "#cf4436" : isSel ? "#0f7b6c" : "#7a8a80"}" stroke-width="${px(isSel ? 2.6 : 1.6).toFixed(3)}" ${isBad ? `stroke-dasharray="${px(6).toFixed(2)} ${px(4).toFixed(2)}"` : ""}/>` +
        `<text x="${c.x.toFixed(3)}" y="${(-c.y - fs * 0.35).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(fs * 1.5, px(14)).toFixed(3)}" style="pointer-events:none">${ty.icon}</text>` +
        (o.w / px(1) >= 56 && o.d / px(1) >= 34
          ? `<text x="${c.x.toFixed(3)}" y="${(-c.y + fs * 1.15).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${px(10.5).toFixed(3)}" font-weight="700" fill="#1f2d28" style="${halo};pointer-events:none">${esc(o.w / px(1) >= 110 ? o.name : o.name.split(/[ \/]/)[0])} ${r1(o.w)}×${r1(o.d)}</text>` : "") + `</g>`;
      if (isSel) {
        const hp = (ux, ty) => P(fr.toMap(ux, ty)).split(","), r = px(6.5), um = o.u + o.w / 2, tm = o.t + o.d / 2;
        const spots = [["l", o.u, tm], ["r", o.u + o.w, tm], ["f", um, o.t], ["b", um, o.t + o.d], ["lf", o.u, o.t], ["rf", o.u + o.w, o.t], ["lb", o.u, o.t + o.d], ["rb", o.u + o.w, o.t + o.d]];
        h += spots.map(([e, ux, ty]) => { const [x, y] = hp(ux, ty); return `<circle data-lih="${o.id}" data-edge="${e}" cx="${x}" cy="${y}" r="${(e.length > 1 ? r * 1.15 : r).toFixed(3)}" fill="#0f7b6c" stroke="#fff" stroke-width="${px(1.6).toFixed(3)}" style="cursor:${e.length > 1 ? "nwse-resize" : (e === "l" || e === "r" ? "ew-resize" : "ns-resize")}"/>`; }).join("");
        /* turn / remove buttons just above the item (towards the back of the lot) */
        const bt = (kind, off, txt, col, ttl) => { const [x, y] = hp(o.u + o.w / 2 + off, o.t + o.d); const yy = (parseFloat(y) - px(17)).toFixed(3); return `<g ${kind}="${o.id}" style="cursor:pointer"><circle ${kind}="${o.id}" cx="${x}" cy="${yy}" r="${px(10).toFixed(3)}" fill="#fff" stroke="${col}" stroke-width="${px(1.3).toFixed(3)}"/><text ${kind}="${o.id}" x="${x}" y="${yy}" text-anchor="middle" dominant-baseline="central" font-size="${px(12).toFixed(3)}" font-weight="800" fill="${col}">${txt}</text><title>${ttl}</title></g>`; };
        h += bt("data-lirot", -px(14), "⟳", "#1f2d28", "Turn 90°") + bt("data-lidel", px(14), "✕", "#cf4436", "Remove (asks first)");
      }
    });
    return h;
  }

  /* ---------- the 3D scene (world: x = u, z = -t) ---------- */
  function world3d(face, s, wc) {
    let out = "";
    const f = (cls, w, h, x, y, z, rot, inner, style) => face(cls, w, h, `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px)${rot || ""}`, inner || "", style || "");
    const bg = c => `background:${c};`;
    const slab = (cx, cz, w, d, y, c) => f("lotflat", w, d, cx, y, cz, " rotateX(90deg)", "", bg(c));
    const box = (cx, cz, w, d, h, y0, c, inner) => {
      const cy = -y0 - h / 2;
      return f("lotbox sh-front", w, h, cx, cy, cz + d / 2, "", inner, bg(c)) + f("lotbox sh-rear", w, h, cx, cy, cz - d / 2, " rotateY(180deg)", "", bg(c)) +
        f("lotbox sh-side", d, h, cx - w / 2, cy, cz, " rotateY(-90deg)", "", bg(c)) + f("lotbox sh-side", d, h, cx + w / 2, cy, cz, " rotateY(90deg)", "", bg(c)) +
        slab(cx, cz, w, d, -y0 - h, c);
    };
    const gable = (cx, cz, w, d, y, rise) => {
      const th = Math.atan2(rise, d / 2) * 180 / Math.PI, hyp = Math.hypot(rise, d / 2) + 0.4 * s, ang = 90 - th;
      const roof = bg("#8f9aa3");
      let o = f("lotroof sh-roofa", w + 0.5 * s, hyp, cx, y - rise / 2, cz + d / 4, ` rotateX(${ang.toFixed(1)}deg)`, "", roof) +
        f("lotroof sh-roofa", w + 0.5 * s, hyp, cx, y - rise / 2, cz - d / 4, ` rotateY(180deg) rotateX(${ang.toFixed(1)}deg)`, "", roof);
      const tri = "clip-path:polygon(0 100%,100% 100%,50% 0);";
      o += f("lotbox sh-side", d, rise, cx - w / 2, y - rise / 2, cz, " rotateY(-90deg)", "", bg("#e6dfcf") + tri) + f("lotbox sh-side", d, rise, cx + w / 2, y - rise / 2, cz, " rotateY(90deg)", "", bg("#e6dfcf") + tri);
      return o;
    };
    items().forEach(o => {
      const ty = T(o), cx = (o.u + o.w / 2) * s, cz = -(o.t + o.d / 2) * s, w = o.w * s, d = o.d * s, H = ty.h * s * (o.type === "house2" && has(o, "storeys", "two") ? 1.9 : 1);
      if (o.type === "house2") {
        out += slab(cx, cz, w + 0.6 * s, d + 0.6 * s, -0.6, "#cfd3cf");
        out += f(`${wc} lotbox sh-front`, w, H, cx, -H / 2, cz + d / 2, "", `<div class="door" style="left:${(w * 0.3).toFixed(1)}px;width:${(0.95 * s).toFixed(1)}px;height:${(2.1 * s).toFixed(1)}px"></div><div class="win" style="left:${(w * 0.62).toFixed(1)}px;top:${(0.9 * s).toFixed(1)}px;width:${(1.2 * s).toFixed(1)}px;height:${(1.1 * s).toFixed(1)}px"></div>`);
        out += f(`${wc} lotbox sh-rear`, w, H, cx, -H / 2, cz - d / 2, " rotateY(180deg)") + f(`${wc} lotbox sh-side`, d, H, cx - w / 2, -H / 2, cz, " rotateY(-90deg)") + f(`${wc} lotbox sh-side`, d, H, cx + w / 2, -H / 2, cz, " rotateY(90deg)");
        out += gable(cx, cz, w, d, -H, Math.min(w, d) * 0.22);
      } else if (o.type === "store") {
        const kind = pick(o, "kind"), shell = kind === "conv" ? "#f1f4f7" : kind === "sari" ? "#f6dfa4" : "#e9d6a8";
        const front = kind === "conv" ? `<div style="position:absolute;left:8%;right:8%;bottom:0;height:72%;background:repeating-linear-gradient(0deg,#9aa4ad 0 2px,#b9c1c8 2px 5px)"></div>`
          : kind === "sari" ? `<div style="position:absolute;left:14%;right:14%;bottom:30%;height:38%;background:#3c4a55;border:2px solid #8a6a46"></div>` : "";
        out += box(cx, cz, w, d, H, 0, shell, `${front}<div class="lotsign">${esc((o.name || "STORE").toUpperCase().slice(0, 14))}</div>`);
        out += slab(cx, cz, w + 0.5 * s, d + 0.5 * s, -H - 1.5, "#c8553d");
        if (has(o, "extra", "awn")) out += slab(cx, cz + d / 2 + 0.55 * s, w, 1.1 * s, -H * 0.82, "#d96a4a");
        if (has(o, "seat", "chairs")) {
          const zz = cz + d / 2 + (has(o, "extra", "awn") ? 1.5 : 1.0) * s;
          out += box(cx, zz, 0.7 * s, 0.7 * s, 0.7 * s, 0, "#8a6a46");
          [-1, 1].forEach(g => { out += box(cx + g * 0.95 * s, zz, 0.45 * s, 0.45 * s, 0.45 * s, 0, "#d9534f") + box(cx + g * 0.95 * s, zz + 0.2 * s, 0.45 * s, 0.06 * s, 0.9 * s, 0, "#d9534f"); });
        }
      } else if (o.type === "shed" || o.type === "coop") {
        if (o.type === "coop" && has(o, "kind", "fish")) { out += slab(cx, cz, w + 0.6 * s, d + 0.6 * s, -0.8, "#8f8a7c"); out += slab(cx, cz, w, d, -1.6, "#58c4e6"); }
        else if (o.type === "coop" && has(o, "kind", "veg")) { out += slab(cx, cz, w, d, -0.8, "#8a6a46"); for (let i = 0; i < 3; i++) out += slab(cx, cz - d / 2 + (i + 0.5) * d / 3, w * 0.86, d / 3 * 0.55, -1.6, "#5fae5a"); }
        else {
          out += box(cx, cz, w, d, H, 0, o.type === "shed" && has(o, "use", "work") ? "#d7cbb5" : ty.color);
          out += slab(cx, cz, w + 0.5 * s, d + 0.5 * s, -H - 1.5, "#8f9aa3");
        }
      } else if (o.type === "pool") {
        const deck = has(o, "extra", "deck");
        out += slab(cx, cz, w + (deck ? 2.6 : 1.2) * s, d + (deck ? 1.4 : 1.2) * s, -0.8, "#e8e4d8");
        out += slab(cx, cz, w, d, -1.6, has(o, "depth", "kids") ? "#8fe0f5" : has(o, "depth", "deep") ? "#2f9fc9" : "#58c4e6");
        out += slab(cx, cz, w * 0.8, d * 0.8, -2.2, has(o, "depth", "kids") ? "#b6eefa" : has(o, "depth", "deep") ? "#4fb6dc" : "#7fd6f0");
        if (deck) [-0.2, 0.2].forEach(g => { out += box(cx + w / 2 + 0.9 * s, cz + g * d, 0.6 * s, 1.7 * s, 0.3 * s, 0, "#f2c14e"); });
        if (has(o, "extra", "shade")) out += box(cx + w / 2 + 0.9 * s, cz, 0.08 * s, 0.08 * s, 2.2 * s, 0, "#8a6a46") + slab(cx + w / 2 + 0.9 * s, cz, 1.8 * s, 1.8 * s, -2.3 * s, "#e0524a");
        if (has(o, "extra", "pfence")) { const fh = 1.1 * s, tt = 0.05 * s, fw = w + 1.2 * s, fd = d + 1.2 * s; out += box(cx, cz + fd / 2, fw, tt, fh, 0, "#b9c1c8") + box(cx, cz - fd / 2, fw, tt, fh, 0, "#b9c1c8") + box(cx - fw / 2, cz, tt, fd, fh, 0, "#b9c1c8") + box(cx + fw / 2, cz, tt, fd, fh, 0, "#b9c1c8"); }
      } else if (o.type === "gazebo" || o.type === "carport") {
        out += slab(cx, cz, w, d, -0.7, o.type === "gazebo" ? "#d8c7a4" : has(o, "floor", "paver") ? "#caa98a" : "#bfc3c6");
        const pw = 0.18 * s, post = (px, pz) => box(px, pz, pw, pw, H, 0, "#8a6a46");
        out += post(cx - w / 2 + pw, cz - d / 2 + pw) + post(cx + w / 2 - pw, cz - d / 2 + pw) + post(cx - w / 2 + pw, cz + d / 2 - pw) + post(cx + w / 2 - pw, cz + d / 2 - pw);
        const roofC = o.type === "gazebo" ? (has(o, "roof", "nipa") ? "#b8913f" : "#9c7a4f") : has(o, "roof", "poly") ? "#bfe3ee" : "#8f9aa3";
        out += slab(cx, cz, w + 0.6 * s, d + 0.6 * s, -H - 1.5, roofC);
        if (o.type === "gazebo" && has(o, "extra", "bench")) out += box(cx, cz - d / 2 + 0.45 * s, w - 0.9 * s, 0.4 * s, 0.45 * s, 0, "#8a6a46") + box(cx - w / 2 + 0.45 * s, cz, 0.4 * s, d - 1.4 * s, 0.45 * s, 0, "#8a6a46");
        if (o.type === "gazebo" && has(o, "extra", "grill")) out += box(cx + w / 2 - 0.7 * s, cz + d / 2 - 0.7 * s, 0.8 * s, 0.6 * s, 0.9 * s, 0, "#3a3f45");
        if (o.type === "carport" && has(o, "extra", "gate")) out += box(cx, cz + d / 2, w, 0.05 * s, 1.6 * s, 0, "#6c7a8e");
      } else if (o.type === "garden") {
        const kind = pick(o, "kind");
        out += slab(cx, cz, w, d, -1, kind === "veg" ? "#8a6a46" : "#9fd08f");
        if (kind === "veg") for (let i = 0; i < 4; i++) out += slab(cx, cz - d / 2 + (i + 0.5) * d / 4, w * 0.86, d / 4 * 0.55, -1.8, i % 2 ? "#6fb85a" : "#4f9d5a");
        else if (kind === "flower") [[-0.3, -0.25], [0.28, 0.2], [0.05, 0.32], [-0.2, 0.25], [0.3, -0.3], [0, -0.05]].forEach(([a, b], i) => { out += box(cx + a * w, cz + b * d, 0.45 * s, 0.45 * s, 0.35 * s, 0, ["#e86a9a", "#f2c14e", "#b57edc"][i % 3]); });
        else (kind === "fruit" ? [[-0.3, -0.25], [0.28, 0.2], [0.05, 0.32], [-0.25, 0.25], [0.3, -0.3]] : [[-0.3, -0.25], [0.28, 0.2], [0.05, 0.32]]).forEach(([a, b]) => {
          const tx = cx + a * w, tz = cz + b * d, tw = 0.25 * s;
          out += box(tx, tz, tw, tw, 1.1 * s, 0, "#7a5a3a") + box(tx, tz, 1.4 * s, 1.4 * s, 1.3 * s, 1.1 * s, kind === "fruit" ? "#3f8f4f" : "#4f9d5a");
        });
        if (has(o, "extra", "walk")) out += slab(cx, cz, 0.7 * s, d, -1.7, "#cfc9bb");
      } else if (o.type === "court") {
        const FL = { conc: "#c9c6bd", paint: "#d98c5f", asph: "#5f6368", tile: "#4f8fd0", rub: "#b5543f" }[pick(o, "floor")] || "#d98c5f";
        out += slab(cx, cz, w, d, -1, "#b9b6ad");
        out += slab(cx, cz, w * 0.92, d * 0.94, -1.4, FL);
        out += slab(cx, cz, w * 0.92, 0.1 * s, -1.6, "#ffffff");
        if (has(o, "extra", "hoop")) {
          const ends = has(o, "size", "full") ? [-1, 1] : [-1];
          ends.forEach(g => { const zz = cz + g * (d / 2 - 0.9 * s); out += box(cx, zz, 0.14 * s, 0.14 * s, 3.2 * s, 0, "#3a3f45") + box(cx, zz + g * 0.2 * s, 1.8 * s, 0.06 * s, 1.1 * s, 2.5 * s, "#f4f4f4"); });
        }
        if (has(o, "roof", "cov")) {
          const pw = 0.25 * s, ph = 6 * s;
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { out += box(cx + a * (w / 2 - pw), cz + b * (d / 2 - pw), pw, pw, ph, 0, "#6c7a8e"); });
          out += slab(cx, cz, w + 0.8 * s, d + 0.8 * s, -ph - 1.5, "#8f9aa3");
        }
      } else {
        out += box(cx, cz, w, d, H, 0, ty.color);
        out += slab(cx, cz, w + 0.4 * s, d + 0.4 * s, -H - 1.5, "#8f9aa3");
      }
    });
    return out;
  }

  /* ---------- choices: shown when adding, and for the selected item ---------- */
  const plain = l => l.replace(/^[\p{Extended_Pictographic}\uFE0F\u200d\s]+/u, "");
  const summary = (type, getv) => (OPTS[type] || []).map(g => { const v = getv(g.k); return (Array.isArray(v) ? v : [v]).map(c => { const ch = g.ch.find(x => x.k === c); return ch ? plain(ch.l).split(" · ")[0] : ""; }).filter(Boolean).join(" + "); }).filter(Boolean);
  function groupsHTML(type, getv, attr, id, cards) {
    return (OPTS[type] || []).map(g => { const v = getv(g.k);
      return `<div class="opts sub kinds ${cards ? "cardy" : ""}"><span class="sub-l">${g.label}${g.multi ? " <small>(pick any)</small>" : ""}${cards ? "" : ":"}</span>${g.ch.map(c => { const on = Array.isArray(v) ? v.includes(c.k) : v === c.k; return `<button type="button" class="opt ${on ? "on" : ""}" ${attr}="${id || ""}|${g.k}|${c.k}" aria-pressed="${on}">${cards ? `<i class="tick" aria-hidden="true"></i>${plain(c.l)}` : c.l}</button>`; }).join("")}</div>`; }).join("");
  }
  function askOpts(type, done) {
    const ty = TYPES[type], tmp = defaultOpt(type);
    document.getElementById("rmAsk") && document.getElementById("rmAsk").remove();
    const box = document.createElement("div"); box.id = "rmAsk"; box.className = "rm-ask";
    const draw = () => { box.innerHTML = `<div class="rm-card kind-card kc-modern" role="dialog" aria-modal="true" aria-label="Choose options"><div class="kc-head"><span class="kc-ico">${ICONS[type] || ""}</span><div><h3>${esc(ty.name)}</h3><p>Choose what fits. You can change these later by selecting it in the lot plan.</p></div></div>
      <div class="kc-sum">${summary(type, k => tmp[k]).map(t => `<span>${esc(t)}</span>`).join("")}</div>
      ${groupsHTML(type, k => tmp[k], "data-lc", "", true)}
      <div class="rm-btns"><button type="button" class="outline-btn" data-rk="cancel">Cancel</button><button type="button" class="primary-btn" data-rk="add">Add to my lot</button></div></div>`; };
    draw(); document.body.appendChild(box);
    box.addEventListener("click", e => {
      const t = e.target.closest("button");
      if (t && t.dataset.lc) { const [, k, c] = t.dataset.lc.split("|"), g = OPTS[type].find(x => x.k === k); if (g.multi) tmp[k] = tmp[k].includes(c) ? tmp[k].filter(x => x !== c) : [...tmp[k], c]; else tmp[k] = c; draw(); }
      else if (t && t.dataset.rk === "add") { box.remove(); done(tmp); }
      else if ((t && t.dataset.rk === "cancel") || e.target === box) box.remove();
    });
    document.addEventListener("keydown", function k1(e) { if (e.key === "Escape") { box.remove(); document.removeEventListener("keydown", k1); } });
  }

  /* ---------- the panel in the lot question ---------- */
  function boxHTML() {
    const free = freeArea(), list = items(), probs = problems();
    const big = free >= 40 || list.length > 0;
    let h = `<p class="hint">${big
      ? `Your lot has about <b>${Math.round(free)} sqm</b> of free space${list.length ? " left" : " around the house"}. Add anything you plan to build or set up there. They appear in the plan, in 3D, and in your cost and schedule.`
      : `Your lot has little free space around the house (about ${Math.round(free)} sqm). You can still add small things, or use a bigger lot.`}</p>`;
    h += `<div class="lot-cards">${Object.entries(TYPES).map(([k, v]) => `<button type="button" class="lot-card" data-li-add="${k}"><span class="lc-ico">${ICONS[k] || ""}</span><span class="lc-name">${v.name}</span><span class="lc-add">+ Add</span></button>`).join("")}</div>`;
    if (msg) h += `<p class="hint bad">${esc(msg)}</p>`;
    if (probs.length) h += `<p class="hint bad">⚠ ${esc(probs[0])}. Drag it in the plan, or make it smaller.</p>`;
    const cur = getSel();
    if (cur && OPTS[cur.type]) h += `<div class="li-opts"><strong>${T(cur).icon} ${esc(cur.name)}: choices</strong>${groupsHTML(cur.type, k => pick(cur, k), "data-lo", cur.id)}</div>`;
    if (list.length) {
      h += `<div class="li-list">${list.map(o => `<div class="li-row"><span class="li-ic">${T(o).icon}</span>
        <input type="text" class="li-name" value="${esc(o.name)}" data-li="${o.id}" data-f="name" maxlength="30" aria-label="Name">
        <label>W <input type="number" min="1" max="60" step="0.5" value="${r1(o.w)}" data-li="${o.id}" data-f="w"></label>
        <label>D <input type="number" min="1" max="60" step="0.5" value="${r1(o.d)}" data-li="${o.id}" data-f="d"></label>
        <small>${Math.round(o.w * o.d)} sqm</small>
        <button type="button" class="x" title="Turn 90°" data-li-rot="${o.id}">⟳</button><button type="button" class="x" title="Remove (asks first)" data-li-del="${o.id}">✕</button></div>`).join("")}</div>
        <p class="hint">In the lot plan, tap an item to select it, drag it to move it, and drag the green dots on its sides and corners to resize it. W is the width along the road, D is how deep it goes into the lot.</p>`;
    }
    return h;
  }
  const panelHTML = () => `<details class="lot-more lot-add-box" id="lotItemsDetails" open><summary>➕ Add things outside the house, inside your lot <small>— store, basketball court, pool, second house, garden and more</small></summary><div id="lotItemsBox">${boxHTML()}</div></details>`;
  /* from the Rooms question the floor plan is showing, so jump to the lot plan where the new item can be moved */
  function toPlan() { try { if (typeof editing !== "undefined" && STEPS[editing] && STEPS[editing].id === "rooms" && typeof setViewMode === "function") setViewMode("plan"); } catch (e) {} if (typeof renderPlan === "function") renderPlan(); }
  function renderBox() { const el = document.getElementById("lotItemsBox"); if (el) el.innerHTML = boxHTML(); }
  function changed() { renderBox(); if (typeof liveUpdate === "function") liveUpdate(); }
  function bind() {
    const box = document.getElementById("lotItemsBox"); if (!box || box._bound) return; box._bound = true;
    box.addEventListener("click", e => {
      const a = e.target.closest("[data-li-add]"), d = e.target.closest("[data-li-del]"), r = e.target.closest("[data-li-rot]"), lo = e.target.closest("[data-lo]");
      const afterAdd = o => { const before = items().length; add(a.dataset.liAdd, o); sel = items().length ? items()[items().length - 1].id : null; changed(); if (typeof renderPlan === "function") renderPlan(); };
      if (lo) { const [id, k, c] = lo.dataset.lo.split("|"); setPick(id, k, c); changed(); if (typeof renderPlan === "function") renderPlan(); if (typeof renderHouse === "function" && typeof viewMode !== "undefined" && viewMode === "3d") renderHouse(); }
      else if (a) { const ty = a.dataset.liAdd; if (OPTS[ty]) askOpts(ty, o => { add(ty, o); sel = items().length ? items()[items().length - 1].id : null; changed(); toPlan(); }); else afterAdd(); }
      else if (r) { turn(r.dataset.liRot); sel = r.dataset.liRot; changed(); if (typeof renderPlan === "function") renderPlan(); }
      else if (d) askRemove(d.dataset.liDel);
    });
    box.addEventListener("change", e => { const t = e.target; if (t.dataset && t.dataset.li) { resize(t.dataset.li, t.dataset.f, t.value); changed(); } });
  }

  window.LotItems = { TYPES, items, svg, world3d, cats, days, priceKeys, panelHTML, bind, renderBox, down, move, up, deselect, sel: () => sel, askRemove, turn, problems, count: () => items().length };
})();