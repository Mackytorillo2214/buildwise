/* House templates: pick a ready-made look and layout, then change anything in the planner.
   Needs reference-chat.js (RefChat.applyResult does the actual filling in). */
window.BWTemplates = (function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const R = (type, floor, x0, y0, x1, y1, name) => ({ type, floor, x0, y0, x1, y1, name });

  /* Room rectangles are fractions of one floor: x from left to right along the front, y from the front (0) to the rear (1). */
  const LIST = [
    {
      id: "amakan-bungalow", name: "Amakan & concrete bungalow", keys: /amakan|bamboo weave|half[- ]?clad|half (wood|cladding)|native modern/,
      blurb: "One storey. Woven amakan cladding over a concrete base, a wide veranda and a deep flat roof.",
      plan: { floors: 1, floorArea: 78, terrace: 14, garage: 0, balcony: false, walls: "chb", partitions: "chb4", glass: 0, windows: { count: 6 }, fence: "bamboo", style: "tropical", look: { facade: "halfclad", cladding: "amakan", roof: "flat", finish: "plain" } },
      extras: [
        { name: "Amakan weave cladding panels (upper walls)", unit: "sqm", price: 650, perWall: 0.5 },
        { name: "Hardwood veranda posts & railing", qty: 1, unit: "lot", price: 35000 }
      ],
      layout: [R("living", 1, 0, 0, 0.45, 0.5), R("kitchen", 1, 0.45, 0, 1, 0.5), R("master", 1, 0, 0.5, 0.35, 1), R("cr", 1, 0.35, 0.5, 0.5, 1), R("bed", 1, 0.5, 0.5, 0.75, 1), R("bed", 1, 0.75, 0.5, 1, 1)]
    },
    {
      id: "compact-starter", name: "Compact starter home", keys: /starter|compact|small house|tiny house|steel cladding|metal cladding|blue/,
      blurb: "A small one-storey home. Steel-sheet cladding over a concrete base and a simple gable roof.",
      plan: { floors: 1, floorArea: 36, terrace: 6, garage: 0, balcony: false, walls: "chb", partitions: "plywood", glass: 0, windows: { count: 4 }, fence: false, style: "minimalist", look: { facade: "halfclad", cladding: "steel", roof: "gable", finish: "plain" } },
      extras: [{ name: "Steel-sheet cladding (upper walls)", unit: "sqm", price: 700, perWall: 0.5 }],
      layout: [R("living", 1, 0, 0, 0.5, 0.55), R("kitchen", 1, 0.5, 0, 1, 0.55), R("bed", 1, 0, 0.55, 0.62, 1), R("cr", 1, 0.62, 0.55, 1, 1)]
    },
    {
      id: "house-with-store", name: "House with a store", keys: /store|shop|sari[- ]?sari|business|commercial|tindahan/,
      blurb: "Two storeys. A shop at the front of the ground floor, the family lives upstairs with a balcony.",
      plan: { floors: 2, floorArea: 112, terrace: 0, garage: 0, balcony: true, walls: "chb", partitions: "chb4", glass: 0.25, windows: { count: 6 }, fence: false, style: "modern", look: { facade: "plain", roof: "flat", finish: "paint" } },
      extras: [
        { name: "Roll-up shutter shop front", qty: 1, unit: "set", price: 28000 },
        { name: "Store shelving & counter", qty: 1, unit: "set", price: 45000 },
        { name: "Display refrigerator", qty: 1, unit: "unit", price: 38000 },
        { name: "Balcony railing (stainless / aluminum)", qty: 7, unit: "m", price: 2800 }
      ],
      layout: [R("other", 1, 0, 0, 1, 0.5, "Store"), R("kitchen", 1, 0, 0.5, 0.5, 1), R("cr", 1, 0.5, 0.5, 0.74, 1),
        R("living", 2, 0, 0, 0.5, 0.5), R("bed", 2, 0.5, 0, 1, 0.5), R("master", 2, 0, 0.5, 0.45, 1), R("cr", 2, 0.45, 0.5, 0.62, 1), R("bed", 2, 0.62, 0.5, 1, 1)]
    },
    {
      id: "glass-house", name: "Almost-glass modern house", keys: /glass house|all glass|almost glass|mostly glass|glass wall|glass facade|floor[- ]to[- ]ceiling/,
      blurb: "One storey with glass on about three quarters of the walls, a flat roof and a big terrace.",
      plan: { floors: 1, floorArea: 140, terrace: 20, garage: 1, balcony: false, walls: "chb", partitions: "gypsum", glass: 0.75, windows: { count: 4 }, fence: "steel", style: "industrial", look: { facade: "plain", roof: "flat", finish: "paint" } },
      extras: [{ name: "Air-conditioning unit", qty: 3, unit: "unit", price: 32000 }, { name: "Sliding glass door set (large)", qty: 2, unit: "set", price: 48000 }],
      layout: [R("living", 1, 0, 0, 0.5, 0.5), R("kitchen", 1, 0.5, 0, 1, 0.5), R("master", 1, 0, 0.5, 0.34, 1), R("cr", 1, 0.34, 0.5, 0.46, 1), R("bed", 1, 0.46, 0.5, 0.73, 1), R("bed", 1, 0.73, 0.5, 1, 1)]
    },
    {
      id: "modern-carport", name: "Modern two-storey with carport", keys: /modern|contemporary|box(y)? house|carport|two[- ]car/,
      blurb: "Two storeys, flat roof, a balcony over a two-car carport and a mix of solid walls and glass.",
      plan: { floors: 2, floorArea: 190, terrace: 10, garage: 2, balcony: true, walls: "chb", partitions: "chb4", glass: 0.5, windows: { count: 8 }, fence: "chbsteel", style: "modern", look: { facade: "plain", roof: "flat", finish: "paint" } },
      extras: [{ name: "Balcony glass railing", qty: 8, unit: "m", price: 4200 }],
      layout: [R("living", 1, 0, 0, 0.5, 0.5), R("kitchen", 1, 0.5, 0, 1, 0.5), R("bed", 1, 0, 0.5, 0.34, 1), R("cr", 1, 0.34, 0.5, 0.48, 1), R("dining", 1, 0.48, 0.5, 0.8, 1),
        R("master", 2, 0, 0, 0.5, 0.5), R("bed", 2, 0.5, 0, 1, 0.5), R("bed", 2, 0, 0.5, 0.4, 1), R("cr", 2, 0.4, 0.5, 0.55, 1), R("other", 2, 0.55, 0.5, 1, 1, "Family lounge")]
    },
    {
      id: "luxury-villa", name: "Luxury villa with hip roof", keys: /villa|luxury|mansion|hip roof|columns|colonial/,
      blurb: "Two big storeys with a hip roof, columns, a wide terrace, a balcony and a two-car garage.",
      plan: { floors: 2, floorArea: 280, terrace: 24, garage: 2, balcony: true, walls: "chb", partitions: "chb4", glass: 0.25, windows: { count: 12 }, fence: "steel", style: "classic", look: { facade: "plain", roof: "hip", finish: "paint" } },
      extras: [{ name: "Decorative columns", qty: 4, unit: "pc", price: 22000 }, { name: "Garden lighting & landscaping", qty: 1, unit: "lot", price: 120000 }],
      layout: [R("living", 1, 0, 0, 0.45, 0.5), R("dining", 1, 0.45, 0, 0.75, 0.5), R("kitchen", 1, 0.75, 0, 1, 0.5), R("bed", 1, 0, 0.5, 0.3, 1), R("cr", 1, 0.3, 0.5, 0.42, 1), R("other", 1, 0.42, 0.5, 0.8, 1, "Family room"),
        R("master", 2, 0, 0, 0.45, 0.5), R("master", 2, 0.45, 0, 0.9, 0.5), R("bed", 2, 0, 0.5, 0.3, 1), R("bed", 2, 0.3, 0.5, 0.6, 1), R("cr", 2, 0.6, 0.5, 0.75, 1), R("other", 2, 0.75, 0.5, 1, 1, "Study")]
    }
  ];
  const byId = Object.fromEntries(LIST.map(t => [t.id, t]));

  /* ---------- small drawings for the gallery ---------- */
  const SKY = "#e8efea", GR = "#c9dccb";
  const svg = body => `<svg viewBox="0 0 200 120" role="img" aria-hidden="true"><rect width="200" height="120" fill="${SKY}"/><rect y="98" width="200" height="22" fill="${GR}"/>${body}</svg>`;
  const weave = (x, y, w, h, c1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c1}"/>` + Array.from({ length: Math.floor(w / 7) }, (_, i) => `<path d="M${x + i * 7} ${y}l7 ${h}M${x + i * 7 + 7} ${y}l-7 ${h}" stroke="rgba(110,70,20,.45)" stroke-width="1"/>`).join("");
  const ICON = {
    "amakan-bungalow": svg(`<rect x="30" y="62" width="110" height="36" fill="#8d918c"/>${weave(30, 44, 110, 18, "#d9b46c")}<rect x="22" y="36" width="132" height="8" fill="#6f757c"/><rect x="150" y="56" width="3" height="42" fill="#8a5a2b"/><rect x="118" y="54" width="36" height="5" fill="#a8743f"/><rect x="48" y="66" width="22" height="16" fill="#9fd0f0" stroke="#fff"/><rect x="92" y="62" width="14" height="36" fill="#6b3f1d"/>`),
    "compact-starter": svg(`<rect x="40" y="66" width="120" height="32" fill="#8d918c"/><rect x="40" y="48" width="120" height="18" fill="#4c6c9a"/><path d="M28 50 L100 22 L172 50Z" fill="#2b3f66"/><rect x="92" y="62" width="16" height="36" fill="#b57b45"/><rect x="52" y="54" width="20" height="16" fill="#9fd0f0" stroke="#fff"/><rect x="128" y="54" width="20" height="16" fill="#9fd0f0" stroke="#fff"/>`),
    "house-with-store": svg(`<rect x="44" y="30" width="112" height="68" fill="#cfd4d8"/><rect x="38" y="24" width="124" height="7" fill="#6f757c"/><rect x="44" y="52" width="112" height="3" fill="#fff"/>${Array.from({ length: 11 }, (_, i) => `<rect x="${46 + i * 10}" y="44" width="1.5" height="10" fill="#fff"/>`).join("")}<rect x="60" y="35" width="18" height="12" fill="#9fd0f0" stroke="#fff"/><rect x="118" y="34" width="14" height="19" fill="#b57b45"/><rect x="56" y="64" width="88" height="34" fill="#1c262f" stroke="#f5b301" stroke-width="2"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${56 + i * 11}" y="64" width="11" height="8" fill="${i % 2 ? "#f4f4f4" : "#d13b2f"}"/>`).join("")}<rect x="62" y="78" width="76" height="3" fill="#8a5a2b"/><rect x="62" y="88" width="76" height="3" fill="#8a5a2b"/>`),
    "glass-house": svg(`<rect x="28" y="52" width="144" height="46" fill="#9fd0f0" fill-opacity=".85" stroke="#fff" stroke-width="2"/>${Array.from({ length: 7 }, (_, i) => `<rect x="${28 + (i + 1) * 18}" y="52" width="2" height="46" fill="#fff"/>`).join("")}<rect x="20" y="44" width="160" height="9" fill="#6f757c"/><rect x="28" y="52" width="40" height="46" fill="#dcdfe3"/>`),
    "modern-carport": svg(`<rect x="30" y="50" width="76" height="48" fill="#dfe2e6"/><rect x="62" y="22" width="68" height="30" fill="#c8cdd3"/><rect x="26" y="45" width="84" height="6" fill="#6f757c"/><rect x="58" y="17" width="76" height="6" fill="#6f757c"/><rect x="106" y="54" width="70" height="44" fill="#26313c"/><rect x="100" y="48" width="82" height="7" fill="#6f757c"/><rect x="118" y="82" width="46" height="12" rx="4" fill="#d13b2f"/><rect x="62" y="52" width="46" height="2" fill="#fff"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${62 + i * 5}" y="46" width="1" height="6" fill="#fff"/>`).join("")}<rect x="40" y="58" width="16" height="22" fill="#9fd0f0" stroke="#fff"/>`),
    "luxury-villa": svg(`<rect x="34" y="52" width="132" height="46" fill="#f1efe8"/><rect x="48" y="34" width="104" height="19" fill="#f1efe8"/><path d="M26 54 L56 28 L144 28 L174 54Z" fill="#2b2f36"/><path d="M42 36 L64 20 L136 20 L158 36Z" fill="#383d46"/>${[56, 84, 112, 140].map(x => `<rect x="${x}" y="58" width="5" height="40" fill="#fff"/>`).join("")}<rect x="66" y="62" width="14" height="22" fill="#e8c45a" fill-opacity=".8" stroke="#2b2f36"/><rect x="120" y="62" width="14" height="22" fill="#e8c45a" fill-opacity=".8" stroke="#2b2f36"/><rect x="72" y="38" width="16" height="12" fill="#9fd0f0" stroke="#2b2f36"/><rect x="112" y="38" width="16" height="12" fill="#9fd0f0" stroke="#2b2f36"/>`)
  };

  /* what a template turns into for RefChat.applyResult */
  function build(t) {
    const plan = JSON.parse(JSON.stringify(t.plan));
    return {
      template: t.id, templateName: t.name, plan,
      extras: t.extras.map(x => Object.assign({ tpl: true }, x)),
      layout: { rooms: t.layout.map(r => Object.assign({}, r)) }
    };
  }
  function facts(t) {
    const rs = t.layout, n = k => rs.filter(r => r.type === k).length;
    const beds = n("bed") + n("master"), p = t.plan;
    return [`${p.floors} floor${p.floors > 1 ? "s" : ""}`, `${p.floorArea} sqm`, `${beds} bedroom${beds === 1 ? "" : "s"}`, p.look.roof === "flat" ? "flat roof" : p.look.roof === "hip" ? "hip roof" : "gable roof", p.glass >= 0.5 ? "lots of glass" : ""].filter(Boolean).join(" · ");
  }

  /* a template the AI (or the typed words) point to, with the user's own numbers winning over the template's */
  function merge(r) {
    const t = byId[r.template];
    if (!t) return r;
    const base = build(t), own = r.plan || {};
    const plan = Object.assign({}, base.plan, own);
    if (own.look) plan.look = Object.assign({}, base.plan.look, own.look);
    const ownLay = r.layout && Array.isArray(r.layout.rooms) && r.layout.rooms.length;
    const layout = ownLay ? r.layout : own.rooms ? null : base.layout;
    const taken = new Set((r.extras || []).map(x => String(x && x.name).toLowerCase()));
    const extras = base.extras.filter(x => !taken.has(x.name.toLowerCase())).concat(r.extras || []);
    return Object.assign({}, r, { plan, layout, extras, templateName: t.name });
  }
  const guess = text => { const t = String(text || "").toLowerCase(); const hit = LIST.find(x => x.keys.test(t)); return hit ? hit.id : null; };

  /* ---------- gallery dialog ---------- */
  let dlg;
  const css = document.createElement("style");
  css.textContent = `
  #tplDlg{margin:auto;padding:0;border:1px solid #0f7b6c;background:#ffffff;color:#1c2622;border-radius:10px;width:min(980px,95vw);max-height:90vh;overflow:auto;font-family:Inter,system-ui,sans-serif}
  #tplDlg::backdrop{background:rgba(28,38,34,.35)}
  .tp-head{padding:18px 22px;border-bottom:1px solid #e2e6df;display:flex;gap:12px;align-items:flex-start;position:sticky;top:0;background:#ffffff;z-index:1}
  .tp-head h3{font-family:Inter,system-ui,sans-serif;font-size:28px;font-weight:600;line-height:1.1}.tp-head p{color:#5b6761;font-size:13.5px;margin-top:4px;max-width:640px}
  .tp-head button{margin-left:auto;background:none;border:1px solid #e2e6df;color:#1c2622;border-radius:10px;padding:7px 14px;cursor:pointer;white-space:nowrap}
  .tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;padding:20px 22px 24px}
  .tp-card{background:#f1f3ef;border:1px solid #e2e6df;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
  .tp-card:hover{border-color:#0f7b6c}
  .tp-card svg{width:100%;display:block;border-bottom:1px solid #e2e6df}
  .tp-card div{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
  .tp-card h4{font-family:Inter,system-ui,sans-serif;font-size:22px;font-weight:600}
  .tp-card p{color:#55615b;font-size:13.5px;line-height:1.45}.tp-card small{color:#0f7b6c;font-family:"IBM Plex Mono",monospace;font-size:11px}
  .tp-card button{margin-top:auto;background:#0f7b6c;color:#ffffff;border:0;border-radius:10px;padding:9px 14px;font:700 15px Inter,system-ui,sans-serif;letter-spacing:.05em;cursor:pointer}
  .tp-done{padding:24px 22px}.tp-done h4{font-family:Inter,system-ui,sans-serif;font-size:26px;margin-bottom:8px}.tp-done ul{margin:8px 0 14px 20px}.tp-done li{margin:3px 0}
  .tp-done button{background:#0f7b6c;color:#ffffff;border:0;border-radius:10px;padding:9px 18px;font:700 15px Inter,system-ui,sans-serif;cursor:pointer;margin-right:8px}
  .tp-done .ghost{background:none;border:1px solid #e2e6df;color:#1c2622}`;
  document.head.appendChild(css);

  function gallery() {
    dlg.innerHTML = `<div class="tp-head"><div><h3>Pick a house template</h3><p>Choose a look to start from. It fills in the floors, rooms, walls, glass and roof, and adds the extra materials it needs. You can change everything afterwards. Rooms you locked stay where they are.</p></div><button type="button" data-x>Close</button></div>
      <div class="tp-grid">${LIST.map(t => `<article class="tp-card">${ICON[t.id]}<div><h4>${esc(t.name)}</h4><p>${esc(t.blurb)}</p><small>${esc(facts(t))}</small><button type="button" data-id="${t.id}">Use this template</button></div></article>`).join("")}</div>`;
  }
  function open() {
    if (!window.RefChat || typeof RefChat.applyResult !== "function") return;
    if (!dlg) {
      dlg = document.createElement("dialog"); dlg.id = "tplDlg"; document.body.appendChild(dlg);
      dlg.addEventListener("click", e => {
        if (e.target.closest("[data-x]")) return dlg.close();
        const b = e.target.closest("button[data-id]");
        if (b) use(b.dataset.id);
        if (e.target.closest("[data-back]")) gallery();
      });
    }
    gallery(); dlg.showModal();
  }
  function use(id) {
    const t = byId[id]; if (!t) return;
    if (typeof isLotEditing === "function" && isLotEditing() && typeof lotValid === "function" && lotValid()) saveQuestion();
    const res = RefChat.applyResult(build(t));
    if (window.bwSchedule) window.bwSchedule();
    dlg.innerHTML = `<div class="tp-done"><h4>${esc(t.name)} applied</h4>
      <p>${esc(t.blurb)}</p>
      <ul>${res.done.map(d => `<li>${esc(d)}</li>`).join("")}</ul>
      ${res.added.length ? `<p><b>Added to your materials</b> (rough prices, you can edit them):</p><ul>${res.added.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
      <p style="color:#8ea6bd;font-size:13px;margin-bottom:14px">Open the 3D view to see it, then press <b>Inside</b> to walk through the rooms. Anything can still be changed from the questions.</p>
      <button type="button" data-x>See my house</button><button type="button" class="ghost" data-back>Try another template</button></div>`;
    if (typeof setViewMode === "function") { viewInside = false; setViewMode("3d"); }
  }

  return { LIST, open, build, merge, guess, byId };
})();