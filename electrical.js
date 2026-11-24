/* Electrical & utilities: how many lights, outlets, aircons, water heaters, toilets and so on.
   Starts from sensible numbers for the rooms in the plan; the owner can change any of them.
   S.elec = { touched, set, v: {key: number}, acHp, tank, pump, septic, appl }  (touched: the owner changed a number; set: question answered) */
(function () {
  const r1 = v => Math.round(v * 10) / 10;
  const AC_HP = { 0.75: 24000, 1: 28000, 1.5: 38000, 2: 48000 };
  const TANK = { 0: ["No tank", 0], 500: ["500 L", 7500], 1000: ["1,000 L", 13000], 2000: ["2,000 L", 24000] };

  /* rows: key, group, name, note, price (all-in: material + wiring/piping), kW each for the load estimate */
  const ROWS = [
    { k: "lights",   g: "e", name: "Light points",                  note: "ceiling lights, downlights and outdoor lights", unit: "pts", price: 1400, kw: 0.012 },
    { k: "switches", g: "e", name: "Light switches",                note: "one per room entry plus extra for 2-way (stairs, halls)", unit: "pcs", price: 750, kw: 0 },
    { k: "outlets",  g: "e", name: "Convenience outlets (sockets)", note: "general wall sockets for phones, TV, small appliances", unit: "pcs", price: 950, kw: 0.1 },
    { k: "ac",       g: "e", name: "Air-conditioners",              note: "split-type units, each on its own circuit", unit: "units", price: 6500, kw: 0 },
    { k: "fans",     g: "e", name: "Ceiling fans",                  note: "fan point with its own switch", unit: "pcs", price: 1800, kw: 0.07 },
    { k: "heaters",  g: "e", name: "Water heaters",                 note: "one per bathroom that has a hot shower", unit: "units", price: 3500, kw: 1.75 },
    { k: "big",      g: "e", name: "Big-appliance outlets",         note: "refrigerator, washing machine, oven, induction cooker", unit: "pcs", price: 2800, kw: 1.2 },
    { k: "tv",       g: "e", name: "TV / cable / internet points",  note: "in the living room, bedrooms and the office", unit: "pts", price: 1100, kw: 0.15 },
    { k: "cctv",     g: "e", name: "CCTV cameras",                  note: "cable and power provision per camera", unit: "pcs", price: 2500, kw: 0.02 },
    { k: "ev",       g: "e", name: "Electric-car charger",          note: "a dedicated circuit in the garage", unit: "pcs", price: 18000, kw: 3.3 },
    { k: "toilets",  g: "p", name: "Toilets (water closets)",       note: "bowl, fittings and drain", unit: "pcs", price: 5500 },
    { k: "showers",  g: "p", name: "Showers",                       note: "shower head and mixer", unit: "pcs", price: 2800 },
    { k: "sinks",    g: "p", name: "Sinks & lavatories",            note: "kitchen sink, bathroom lavatories and the laundry tub", unit: "pcs", price: 2200 },
    { k: "hose",     g: "p", name: "Outdoor faucets",               note: "garden hose and car wash", unit: "pcs", price: 900 },
    { k: "solar",    g: "e", name: "Solar panels",                  note: "grid-tied system in kW; 0 if none", unit: "kW", price: 55000, kw: 0, step: 0.5 }
  ];
  const rowOf = k => ROWS.find(r => r.k === k);
  const cnt = (st, t) => (st.layout && st.layout.spaces ? st.layout.spaces.filter(s => s.type === t).length : 0) || (st.rooms ? st.rooms[t] || 0 : 0);

  /* sensible starting numbers from the rooms in the plan */
  function defaults(st) {
    const sp = ((st.layout && st.layout.spaces) || []).filter(s => s.type !== "stairs");
    const T = { master: [4, 6, 2], bed: [2, 4, 1], cr: [1, 1, 1], living: [5, 6, 2], kitchen: [3, 8, 2], dining: [2, 3, 1], other: [2, 3, 1], garage: [2, 2, 1], terrace: [2, 2, 1], balcony: [1, 1, 1] };
    let l = 0, o = 0, s = 0;
    if (sp.length) sp.forEach(x => { const t = T[x.type] || T.other, a = x.w * x.h; l += Math.max(t[0], Math.ceil(a / 5.5)); o += t[1]; s += t[2]; });
    else { const R = st.rooms || {}; l = (R.master || 0) * 4 + (R.bed || 0) * 2 + (R.cr || 0) + 8; o = (R.master || 0) * 6 + (R.bed || 0) * 4 + (R.cr || 0) + 14; s = (R.master || 0) * 2 + (R.bed || 0) + (R.cr || 0) + 4; }
    const F = st.floors || 1;
    l += 2 + 2 * F; s += 2 * F; o += 2;   // halls, stairs, outside lights and an outside socket
    const master = cnt(st, "master"), bed = cnt(st, "bed"), cr = cnt(st, "cr"), living = cnt(st, "living"), kit = cnt(st, "kitchen"), din = cnt(st, "dining");
    const en = ((st.layout && st.layout.spaces) || []).filter(x => x.type === "bed" && x.ensuite).length;
    const pcs = ((st.layout && st.layout.spaces) || []).filter(x => ["boy", "study", "office", "work"].some(k => (Array.isArray(x.styles) ? x.styles : []).includes(k))).length;
    const mNo = ((st.layout && st.layout.spaces) || []).filter(x => x.type === "master" && x.ensuite === false).length;
    const bath = master - mNo + cr + en;
    l += en; o += pcs * 3 + en; s += en; 
    return { lights: l, switches: s, outlets: o, ac: master + bed, fans: Math.max(1, living + din + kit), heaters: bath, big: 3, tv: living + master + bed + pcs, cctv: 0, ev: 0,
      toilets: bath, showers: bath, sinks: bath + 2, hose: 1, solar: 0 };
  }
  const base = () => ({ touched: false, set: false, v: {}, acHp: 1, tank: -1, pump: -1, septic: 1, appl: true });
  const get = () => (S.elec && typeof S.elec === "object" ? S.elec : (S.elec = base()));

  /* the numbers in use: the owner's, once they changed any; otherwise fresh suggestions that follow the plan */
  function eff(st) {
    const e = st.elec || base(), d = defaults(st);
    const v = e.touched ? Object.assign(d, e.v) : d, F = st.floors || 1, bed = cnt(st, "bed") + cnt(st, "master");
    return { v, acHp: e.acHp || 1, appl: e.appl !== false, septic: e.septic === 0 ? 0 : 1, septicBig: bed > 4,
      tank: e.tank === undefined || e.tank < 0 ? (F > 1 ? 1000 : 500) : e.tank, pump: e.pump === undefined || e.pump < 0 ? (F > 1 ? 1 : 0) : e.pump };
  }

  /* electrical load, a rough main-breaker size and the number of circuits */
  function load(st) {
    const E = eff(st), v = E.v;
    let kw = 0; ROWS.forEach(r => { if (r.kw) kw += (v[r.k] || 0) * r.kw; });
    kw = kw * 0.55 + (v.ac || 0) * E.acHp * 0.9 * 0.8 + (E.pump ? 0.75 : 0) + (v.solar ? 0 : 0);   // not everything runs at once
    const amps = kw * 1000 / 230 / 0.9, std = [30, 40, 50, 60, 70, 80, 100, 125, 150, 200];
    const circuits = Math.ceil((v.lights || 0) / 10) + Math.ceil((v.outlets || 0) / 6) + (v.ac || 0) + (v.heaters || 0) + (v.big || 0) + Math.ceil((v.fans || 0) / 6) + (v.ev ? 1 : 0) + 1;
    return { kw: r1(kw), main: std.find(n => n >= amps * 1.25) || 200, circuits };
  }

  /* cost lines for the estimate */
  function items(st, item) {
    const E = eff(st), v = E.v, out = [], add = (key, name, q, unit) => { if (q > 0) out.push(item(key, name, q, unit)); };
    const L = load(st);
    ROWS.filter(r => r.g === "e" && r.k !== "solar").forEach(r => add("e_" + r.k, r.name + (r.k === "ac" ? " (circuit and pipe provision)" : r.k === "heaters" ? " (circuit)" : " (supply and install)"), v[r.k] || 0, r.unit));
    add("e_panel", "Panel board and breakers (per circuit)", L.circuits, "circuits");
    add("e_main", "Main breaker, meter base and service entrance", 1, "lot");
    if (E.appl) {
      add("e_ac" + String(E.acHp).replace(".", ""), `Air-conditioner unit, ${E.acHp} HP inverter (supply and install)`, v.ac || 0, "units");
      add("e_heaterunit", "Instant water heater unit", v.heaters || 0, "units");
    }
    add("e_solar", "Solar panels, grid-tied (per kW installed)", v.solar || 0, "kW");
    ROWS.filter(r => r.g === "p").forEach(r => add("p_" + r.k, r.name + " (fixture and piping)", v[r.k] || 0, r.unit));
    add("plumb", "Plumbing (main pipes, fittings, drains)", Math.ceil(st.floorArea || 0), "sqm floor");
    if (E.tank) add("p_tank" + E.tank, `Water tank, ${TANK[E.tank][0]}`, 1, "pc");
    add("p_pump", "Water pump and pressure tank", E.pump ? 1 : 0, "set");
    add("p_septic" + (E.septicBig ? "L" : ""), `Septic tank (2-chamber${E.septicBig ? ", larger for 5+ bedrooms" : ""})`, E.septic ? 1 : 0, "pc");
    return out;
  }
  const priceKeys = () => {
    const o = { e_main: 6500, e_panel: 1800, e_heaterunit: 5500, p_pump: 9500, p_septic: 38000, p_septicL: 52000, e_solar: 55000 };
    ROWS.forEach(r => { o[(r.g === "p" ? "p_" : "e_") + r.k] = r.price; });
    Object.entries(AC_HP).forEach(([hp, p]) => { o["e_ac" + String(hp).replace(".", "")] = p; });
    Object.entries(TANK).forEach(([k, t]) => { if (+k) o["p_tank" + k] = t[1]; });
    return o;
  };

  /* ---------- the question ---------- */
  const rowHTML = (r, v) => `<div class="room-row el-row"><div class="room-info"><strong>${r.name}</strong><small>${r.note}</small></div>
    <div class="stepper big"><button type="button" data-el="${r.k}" data-d="-1">−</button><input class="el-n" type="number" min="0" step="${r.step || 1}" value="${v[r.k] || 0}" data-elin="${r.k}" aria-label="${r.name}"><button type="button" data-el="${r.k}" data-d="1">+</button></div>
    <div class="room-max">${r.unit}</div></div>`;
  function panelHTML() {
    const E = eff(S), v = E.v, L = load(S), tankOpts = Object.entries(TANK).map(([k, t]) => `<button type="button" class="opt ${+k === E.tank ? "on" : ""}" data-eltank="${k}">${t[0]}</button>`).join("");
    const hpOpts = [0.75, 1, 1.5, 2].map(hp => `<button type="button" class="opt ${+hp === E.acHp ? "on" : ""}" data-elhp="${hp}">${hp} HP</button>`).join("");
    return `<div id="elecBox">
      <div class="el-sum"><div><small>Estimated load</small><strong>${L.kw} kW</strong></div><div><small>Suggested main breaker</small><strong>${L.main} A</strong></div><div><small>Circuits</small><strong>${L.circuits}</strong></div></div>
      <p class="hint">${v.ac ? `${v.ac} aircon${v.ac > 1 ? "s" : ""} is the biggest part of the load. ` : ""}These are starting numbers for your ${S.floors > 1 ? S.floors + "-floor " : ""}house. Change anything. A licensed electrical engineer will confirm the final sizes.</p>
      <div class="room-actions"><button type="button" class="outline-btn" data-elreset="1">✨ Suggest numbers from my rooms</button></div>
      <h4 class="lot-h">Electrical</h4>
      <div class="room-list">${ROWS.filter(r => r.g === "e").map(r => rowHTML(r, v)).join("")}</div>
      <div class="extra-group"><h4>❄ Aircon size</h4><div class="opts">${hpOpts}</div>
        <label class="el-check"><input type="checkbox" data-elappl="1" ${E.appl ? "checked" : ""}> Include the aircon and water heater units in the cost (not just the wiring)</label></div>
      <h4 class="lot-h">Water &amp; plumbing</h4>
      <div class="room-list">${ROWS.filter(r => r.g === "p").map(r => rowHTML(r, v)).join("")}</div>
      <div class="extra-group"><h4>🛢 Water tank</h4><div class="opts">${tankOpts}</div></div>
      <div class="extra-group"><h4>⚙ Other utilities</h4><div class="opts">
        <button type="button" class="opt ${E.pump ? "on" : ""}" data-elflag="pump">Water pump ${E.pump ? "✓" : ""}</button>
        <button type="button" class="opt ${E.septic ? "on" : ""}" data-elflag="septic">Septic tank ${E.septic ? "✓" : ""}</button></div>
        <p class="hint">A pump is needed for a roof tank or when the water pressure is weak. A septic tank is needed unless the lot connects to a sewer line.</p></div>
      <p class="hint" id="hint"></p></div>`;
  }
  function touch() { const e = get(); if (!e.touched) { e.touched = true; e.v = Object.assign({}, eff(S).v); const E2 = eff(S); e.tank = E2.tank; e.pump = E2.pump; } }
  function refresh() { const b = document.getElementById("elecBox"); if (b) { const y = b.parentNode; b.outerHTML = panelHTML(); bind(); } if (typeof liveUpdate === "function") liveUpdate(); }
  function setVal(k, n) { const r = rowOf(k); touch(); get().v[k] = Math.max(0, Math.min(200, Math.round(n / (r.step || 1)) / (1 / (r.step || 1)))); }
  function bind() {
    const b = document.getElementById("elecBox"); if (!b || b._bound) return; b._bound = true;
    b.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.el) { const r = rowOf(t.dataset.el); setVal(t.dataset.el, (eff(S).v[t.dataset.el] || 0) + Number(t.dataset.d) * (r.step || 1)); refresh(); }
      else if (t.dataset.elreset) { S.elec = Object.assign(base(), { set: get().set }); refresh(); }
      else if (t.dataset.elhp) { touch(); get().acHp = Number(t.dataset.elhp); refresh(); }
      else if (t.dataset.eltank !== undefined) { touch(); get().tank = Number(t.dataset.eltank); refresh(); }
      else if (t.dataset.elflag) { touch(); const E = eff(S), e = get(); e[t.dataset.elflag] = E[t.dataset.elflag] ? 0 : 1; refresh(); }
    });
    b.addEventListener("change", e => {
      const t = e.target;
      if (t.dataset.elin) { setVal(t.dataset.elin, Number(t.value) || 0); refresh(); }
      else if (t.dataset.elappl) { touch(); get().appl = t.checked; refresh(); }
    });
  }
  const markSet = () => { get().set = true; };
  const summary = st => { const v = eff(st).v; return `${v.lights} lights · ${v.outlets} outlets${v.ac ? ` · ${v.ac} aircon${v.ac > 1 ? "s" : ""}` : ""}${v.heaters ? ` · ${v.heaters} heater${v.heaters > 1 ? "s" : ""}` : ""}`; };

  window.Elec = { ROWS, defaults, eff, load, items, priceKeys, panelHTML, bind, markSet, summary, isSet: st => !!(st.elec && st.elec.set) };
})();