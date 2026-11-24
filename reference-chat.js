/* Reference chat: upload photos / a floor plan / a video, or describe the house, and the planner fills itself in.
   Uses the Supabase edge function "reference-chat" (Claude) when it exists, and a simple built-in text reader otherwise. */
/* Name of the Supabase Edge Function that holds the AI code (see Edge Functions in your Supabase dashboard). */
const AI_FUNCTION_NAME = "smart-worker";

window.RefChat = (function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, a: 1, an: 1, single: 1, double: 2 };
  const toNum = s => { s = String(s).toLowerCase(); return N[s] != null ? N[s] : parseFloat(s); };

  let dlg, listEl, textEl, filesEl, sendBtn, project, user, chat = [], pending = [], busy = false, aiOff = false, started = false, focus = null;

  /* ---------- styles ---------- */
  const css = document.createElement("style");
  css.textContent = `
  #rcDlg{margin:auto;padding:0;border:1px solid #0f7b6c;background:#ffffff;color:#1c2622;border-radius:10px;width:min(780px,94vw);height:min(86vh,720px);overflow:hidden;font-family:Inter,system-ui,sans-serif}
  #rcDlg[open]{display:flex;flex-direction:column}
  #rcDlg::backdrop{background:rgba(28,38,34,.35)}
  .rc-head{padding:16px 20px;border-bottom:1px solid #e2e6df;display:flex;gap:12px;align-items:flex-start}
  .rc-head h3{font-family:Inter,system-ui,sans-serif;font-size:26px;font-weight:600;line-height:1.1}.rc-head p{color:#5b6761;font-size:13.5px;margin-top:3px}
  .rc-head button{margin-left:auto;background:none;border:1px solid #e2e6df;color:#1c2622;border-radius:10px;padding:6px 12px;cursor:pointer;white-space:nowrap}
  .rc-list{flex:1;overflow:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px}
  .rc-m{max-width:86%;padding:10px 13px;border-radius:10px;line-height:1.5;white-space:pre-wrap;font-size:14.5px}
  .rc-m.bot{align-self:flex-start;background:#f1f3ef;border:1px solid #e2e6df;border-left:3px solid #0f7b6c}
  .rc-m.me{align-self:flex-end;background:rgba(15,123,108,.08);border:1px solid rgba(15,123,108,.35)}
  .rc-m ul{margin:6px 0 0 18px}.rc-m li{margin:2px 0}.rc-m b{color:#0f7b6c}
  .rc-thumbs{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.rc-thumbs img,.rc-thumbs span{height:64px;min-width:64px;border-radius:8px;border:1px solid #e2e6df;object-fit:cover;background:#f1f3ef;display:inline-grid;place-items:center;padding:0 8px;font-size:12px;color:#9fb2c6}
  .rc-chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 20px 10px}.rc-chips button{background:#f1f3ef;border:1px solid #e2e6df;color:#1c2622;border-radius:10px;padding:7px 12px;cursor:pointer;font:inherit;font-size:13px}.rc-chips button:hover{border-color:#0f7b6c}
  .rc-files{display:flex;flex-wrap:wrap;gap:8px;padding:0 20px}.rc-files .f{display:flex;align-items:center;gap:6px;background:#f1f3ef;border:1px solid #e2e6df;padding:4px 8px;border-radius:10px;font-size:12.5px}.rc-files img{height:28px;border-radius:8px}.rc-files button{background:none;border:0;color:#ff6b5b;cursor:pointer}
  .rc-comp{display:flex;gap:8px;padding:12px 20px;border-top:1px solid #e2e6df;align-items:flex-end}
  .rc-comp textarea{flex:1;min-height:46px;max-height:140px;resize:none;background:#f1f3ef;color:inherit;border:1px solid #e2e6df;border-radius:10px;padding:11px 12px;font:inherit}
  .rc-comp textarea:focus{outline:none;border-color:#0f7b6c}
  .rc-comp .att{background:#f1f3ef;border:1px solid #e2e6df;color:#1c2622;border-radius:10px;width:46px;height:46px;font-size:20px;cursor:pointer}
  .rc-comp .send{background:#0f7b6c;color:#ffffff;border:0;border-radius:10px;height:46px;padding:0 20px;font:600 15px Inter,system-ui,sans-serif;letter-spacing:0;cursor:pointer}.rc-comp .send:disabled{opacity:.5;cursor:progress}
  .rc-foot{display:flex;gap:10px;justify-content:space-between;align-items:center;padding:10px 20px 14px;border-top:1px dashed #e2e6df;font-size:12.5px;color:#5b6761}
  .rc-foot .go{background:transparent;border:1px solid #0f7b6c;color:#0f7b6c;border-radius:10px;padding:8px 16px;font-weight:700;cursor:pointer}
  .rc-focus{display:flex;align-items:center;gap:8px;margin:0 20px 8px;padding:6px 10px;background:rgba(15,123,108,.08);border:1px solid rgba(15,123,108,.35);border-radius:10px;font-size:13px;color:#0b6256}
  .rc-focus[hidden]{display:none}
  .rc-focus button{margin-left:auto;background:none;border:0;color:#0b6256;cursor:pointer;font-size:14px}
  .ask-ai{border-color:#0f7b6c!important;color:#0f7b6c!important}
  .rc-dots span{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:#0f7b6c;animation:rcb 1s infinite}.rc-dots span:nth-child(2){animation-delay:.15s}.rc-dots span:nth-child(3){animation-delay:.3s}
  @keyframes rcb{0%,80%,100%{opacity:.25}40%{opacity:1}}@media(prefers-reduced-motion:reduce){.rc-dots span{animation:none}}`;
  document.head.appendChild(css);

  function build() {
    dlg = document.createElement("dialog"); dlg.id = "rcDlg";
    dlg.innerHTML = `
      <div class="rc-head"><div><h3>Do you have a reference for this house?</h3><p>Photos, a sketch, a floor plan, a video, or just your ideas. I'll fill in what I can in the planner. You can also ask me about any question, or ask me to arrange the rooms.</p></div><button type="button" id="rcClose">Skip for now</button></div>
      <div class="rc-list" id="rcList" aria-live="polite"></div>
      <div class="rc-focus" id="rcFocus" hidden></div>
      <div class="rc-chips" id="rcChips"></div>
      <div class="rc-files" id="rcFiles"></div>
      <form class="rc-comp" id="rcForm">
        <input type="file" id="rcPick" multiple hidden accept="image/*,video/*,application/pdf,.pdf,.txt,text/plain">
        <button type="button" class="att" id="rcAttach" title="Attach photos, a video, a PDF or a text file" aria-label="Attach files">📎</button>
        <textarea id="rcText" rows="1" placeholder="e.g. 2-storey, 3 bedrooms, 120 sqm. Add solar panels and a water tank."></textarea>
        <button type="submit" class="send" id="rcSend">Send</button>
      </form>
      <div class="rc-foot"><span id="rcNote">Tip: you can come back to this chat from the bar at the top of the planner.</span><button type="button" class="go" id="rcGo">Continue to the planner</button></div>`;
    document.body.appendChild(dlg);
    listEl = $("#rcList", dlg); textEl = $("#rcText", dlg); filesEl = $("#rcFiles", dlg); sendBtn = $("#rcSend", dlg);
    $("#rcClose", dlg).onclick = $("#rcGo", dlg).onclick = () => dlg.close();
    $("#rcAttach", dlg).onclick = () => $("#rcPick", dlg).click();
    $("#rcPick", dlg).onchange = e => { addFiles([...e.target.files]); e.target.value = ""; };
    $("#rcForm", dlg).addEventListener("submit", e => { e.preventDefault(); send(); });
    textEl.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
    textEl.addEventListener("input", () => { textEl.style.height = "auto"; textEl.style.height = Math.min(textEl.scrollHeight, 140) + "px"; });
    dlg.addEventListener("dragover", e => e.preventDefault());
    dlg.addEventListener("drop", e => { e.preventDefault(); addFiles([...e.dataTransfer.files]); });
    $("#rcChips", dlg).addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.act === "skip") dlg.close();
      else if (b.dataset.act === "templates") { if (window.BWTemplates) { dlg.close(); BWTemplates.open(); } }
      else if (b.dataset.act === "attach") $("#rcPick", dlg).click();
      else if (b.dataset.send) { textEl.value = b.dataset.send; send(); }
      else { textEl.value = b.dataset.text; textEl.focus(); }
    });
  }

  /* ---------- messages ---------- */
  function paint() {
    listEl.innerHTML = chat.map(m => `<div class="rc-m ${m.role === "user" ? "me" : "bot"}">${m.html || esc(m.text)}${m.files && m.files.length ? `<div class="rc-thumbs">${m.files.map(f => f.thumb ? `<img src="${f.thumb}" alt="${esc(f.name)}" title="${esc(f.name)}">` : `<span>${esc(f.name)}</span>`).join("")}</div>` : ""}</div>`).join("")
      + (busy ? `<div class="rc-m bot rc-dots"><span></span><span></span><span></span></div>` : "");
    listEl.scrollTop = listEl.scrollHeight;
    sendBtn.disabled = busy;
    filesEl.innerHTML = pending.map((f, i) => `<span class="f">${f.thumb ? `<img src="${f.thumb}" alt="">` : "📄"}${esc(f.name)}<button type="button" data-i="${i}" aria-label="Remove">✕</button></span>`).join("");
    filesEl.querySelectorAll("button").forEach(b => b.onclick = () => { pending.splice(Number(b.dataset.i), 1); paint(); });
    const fb = $("#rcFocus", dlg);
    fb.hidden = !focus;
    fb.innerHTML = focus ? `<span>Asking about: <b>${esc(focus.title)}</b></span><button type="button" aria-label="Stop asking about this question" title="Stop asking about this question">✕</button>` : "";
    if (focus) fb.querySelector("button").onclick = () => { focus = null; paint(); };
    $("#rcChips", dlg).innerHTML = focus ? `
      <button data-send="What does this question mean?">What does this mean?</button>
      <button data-send="What do you recommend for me here?">What do you recommend?</button>
      <button data-send="Use your recommendation.">Use your recommendation</button>`
      : chat.length <= 1 ? `
      <button data-act="attach">📎 I have photos or a plan</button>
      <button data-text="2-storey house, 3 bedrooms, 2 comfort rooms, 120 sqm, budget 3 million">Describe my idea</button>
      <button data-act="templates">🏠 Pick a house template</button>
      <button data-act="skip">Skip — I'll answer the questions</button>`
      : `<button data-send="Arrange the rooms for me.">Arrange the rooms for me</button>`;
    if (window.bwSchedule && started) window.bwSchedule();
  }
  const say = (role, text, extra) => { chat.push(Object.assign({ role, text }, extra || {})); paint(); };

  /* ---------- files ---------- */
  const readB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
  function drawScaled(src, w, h, max) {
    const k = Math.min(1, max / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  }
  const loadImg = f => new Promise((res, rej) => { const u = URL.createObjectURL(f), i = new Image(); i.onload = () => { res(i); }; i.onerror = rej; i.src = u; });
  async function videoFrames(f) {
    const v = document.createElement("video"); v.muted = true; v.preload = "auto"; v.src = URL.createObjectURL(f);
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; });
    const out = [], d = v.duration || 1;
    for (const p of [0.1, 0.35, 0.6, 0.85]) {
      v.currentTime = d * p; await new Promise(r => { v.onseeked = r; });
      out.push(drawScaled(v, v.videoWidth, v.videoHeight, 1024));
    }
    return out;
  }
  async function addFiles(list) {
    for (const f of list) {
      if (pending.length >= 6) { say("bot", "That's enough for one message (6 files). Send these first, then add more."); break; }
      if (f.size > 25 * 1024 * 1024) { say("bot", f.name + " is over 25 MB. Try a shorter clip or a smaller file."); continue; }
      try {
        if (f.type.startsWith("image/")) {
          const img = await loadImg(f), data = drawScaled(img, img.naturalWidth, img.naturalHeight, 1280);
          pending.push({ name: f.name, kind: "image", file: f, thumb: data, images: [data.split(",")[1]] });
        } else if (f.type.startsWith("video/")) {
          const frames = await videoFrames(f);
          pending.push({ name: f.name, kind: "video", file: f, thumb: "data:image/jpeg;base64," + frames[0].split(",")[1], images: frames.map(x => x.split(",")[1]) });
        } else if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
          if (f.size > 4 * 1024 * 1024) { say("bot", f.name + " is over 4 MB, which is too big for me to read. Export fewer pages, or attach photos of the plan."); continue; }
          pending.push({ name: f.name, kind: "pdf", file: f, pdf: await readB64(f) });
        } else if (f.type.startsWith("text/") || /\.txt$/i.test(f.name)) {
          pending.push({ name: f.name, kind: "text", file: f, text: (await f.text()).slice(0, 8000) });
        } else { say("bot", f.name + " isn't a type I can read yet. Use photos, a video, a PDF or a .txt file. For a Word file, save it as PDF first."); }
      } catch (e) { say("bot", "I couldn't open " + f.name + "."); }
    }
    paint();
  }

  /* ---------- built-in text reader (used when the AI function isn't set up) ---------- */
  const EXTRAS = [
    [/solar|pv panel/i, "Solar panel set (with inverter)", 1, "set", 120000],
    [/water (tank|tower)|tank/i, "Water tank (1,000 L) with stand", 1, "set", 18000],
    [/septic/i, "Septic tank", 1, "set", 45000],
    [/cctv|camera/i, "CCTV set (4 cameras)", 1, "set", 25000],
    [/generator/i, "Standby generator", 1, "unit", 60000],
    [/(swimming )?pool/i, "Small swimming pool (rough estimate)", 1, "lot", 350000],
    [/ceiling/i, "Ceiling boards", null, "sqm", 450],
    [/aircon|air.?con|air conditioner/i, "Air-conditioning unit", "n", "unit", 32000],
    [/water heater/i, "Water heater", "n", "unit", 6500],
    [/(cabinet|kitchen counter)/i, "Kitchen cabinets & counter", 1, "set", 85000],
    [/(stairs? railing|railings?)/i, "Stair / balcony railing", 6, "m", 2800],
    [/(intercom|doorbell)/i, "Video doorbell / intercom", 1, "set", 8000]
  ];
  function readText(text) {
    const t = " " + text.toLowerCase().replace(/,(?=\d{3})/g, "") + " ", plan = {}, notes = [];
    const area = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(?:sqm|sq\.?\s?m|square met(?:er|re)s?|m2|m²)/g)];
    area.forEach(m => { const near = t.slice(Math.max(0, m.index - 18), m.index + m[0].length + 18); if (/floor|house|home|building/.test(near)) plan.floorArea = parseFloat(m[1]); else if (/\blot\b/.test(near)) plan.lotArea = parseFloat(m[1]); else plan.floorArea = parseFloat(m[1]); });
    const lw = t.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?)?\s*(?:x|by)\s*(\d+(?:\.\d+)?)\s*(?:m|meters?)?\s*lot|lot[^.]{0,20}?(\d+(?:\.\d+)?)\s*(?:m|meters?)?\s*(?:x|by)\s*(\d+(?:\.\d+)?)/);
    if (lw) { plan.lotWidth = parseFloat(lw[1] || lw[3]); plan.lotDepth = parseFloat(lw[2] || lw[4]); }
    let m;
    if ((m = t.match(/(\d+|one|two|three)[\s-]*(?:storey|story|floor)s?/))) plan.floors = Math.min(3, toNum(m[1]));
    else if (/bungalow|single[- ]storey|one[- ]storey/.test(t)) plan.floors = 1;
    const rooms = {};
    if ((m = t.match(/(\d+|one|two|three|four|five|six)\s*(?:regular\s*)?(?:bed ?rooms?|brs?\b)/))) rooms.bed = toNum(m[1]);
    if ((m = t.match(/(\d+|one|two|three|a|an)\s*master(?:'s)?(?:\s*bed ?rooms?)?/))) rooms.master = toNum(m[1]);
    if ((m = t.match(/(\d+|one|two|three|four)\s*(?:common\s*)?(?:crs?\b|comfort rooms?|bath ?rooms?|toilets?|t&b)/))) rooms.cr = toNum(m[1]);
    if (Object.keys(rooms).length) plan.rooms = rooms;
    if ((m = t.match(/(\d)[\s-]*car garage/))) plan.garage = Math.min(2, toNum(m[1])); else if (/\bgarage\b/.test(t) && !/no garage/.test(t)) plan.garage = 1;
    if (/no garage/.test(t)) plan.garage = 0;
    if (/terrace|veranda/.test(t)) plan.terrace = 12;
    if (/balcony/.test(t)) plan.balcony = true;
    if (/wood(en)?\s*(house|walls?|construction)|made of wood/.test(t)) plan.walls = "wood"; else if (/hollow block|chb|concrete/.test(t)) plan.walls = "chb";
    if (/plywood (wall|partition|divid)/.test(t)) plan.partitions = "plywood"; else if (/gypsum|drywall/.test(t)) plan.partitions = "gypsum";
    if ((m = t.match(/(\d+)\s*%\s*glass/))) plan.glass = Math.min(1, parseFloat(m[1]) / 100); else if (/(full|all|glass) glass|glass house/.test(t)) plan.glass = 1;
    if ((m = t.match(/(\d+)\s*windows?/))) plan.windows = { count: parseInt(m[1]) };
    if (/minimali[sz]t|scandinavian|japandi/.test(t)) plan.style = "minimalist"; else if (/classic|traditional|victorian/.test(t)) plan.style = "classic"; else if (/tropical|filipino|bahay kubo|rustic|resort/.test(t)) plan.style = "tropical"; else if (/industrial|loft/.test(t)) plan.style = "industrial"; else if (/\bmodern\b|contemporary/.test(t)) plan.style = "modern";
    if (/no fence/.test(t)) plan.fence = false;
    else if (/bamboo/.test(t)) plan.fence = "bamboo";
    else if (/chain[- ]?link|wire (fence|mesh)|\bgi wire|wire fence/.test(t)) plan.fence = "wire";
    else if (/wrought|steel fence|metal fence|iron fence|metal bars|steel bars? fence/.test(t)) plan.fence = /concrete|block|chb|base/.test(t) ? "chbsteel" : "steel";
    else if (/picket|wood(en)? fence|lumber fence/.test(t)) plan.fence = "wood";
    else if (/(concrete|block|chb|hollow block|cement) (wall )?fence|fence.*(concrete|block|chb)/.test(t)) plan.fence = "chb";
    else if (/\bfence\b/.test(t)) plan.fence = true;
    if ((m = t.match(/(?:budget|₱|php|\bp)\s*(?:of|is|around|about)?\s*(?:₱|php)?\s*(\d+(?:\.\d+)?)\s*(m\b|million|k\b|thousand)?/))) {
      let v = parseFloat(m[1]); const u = m[2] || ""; if (/^m/.test(u)) v *= 1e6; else if (/^(k|t)/.test(u)) v *= 1e3;
      if (v >= 100000) plan.budget = Math.round(v);
    }
    const extras = [];
    if (/\b(add|include|with|want|need|also|extra|plus|install)\b/.test(t)) EXTRAS.forEach(([re, name, qty, unit, price]) => {
      if (!re.test(t)) return;
      let q = qty;
      if (q === "n") { const k = t.match(/(\d+|one|two|three|four|five)\s*(?:units? of\s*)?(?:aircon|air.?con|air conditioners?|water heaters?)/); q = k ? toNum(k[1]) : 1; }
      if (q == null) q = 0;   // filled from the floor area when applied
      extras.push({ name, qty: q, unit, price, perFloorArea: qty === null });
    });
    return { plan, extras };
  }

  /* ---------- plain explanations of each question (used when the AI isn't connected) ---------- */
  const HELP = {
    lot: "Your lot is the land you own. Measure each side from your title or survey plan. If it is not a rectangle, add corners to match its real shape. The lot decides how big the house can be: the planner keeps the usual setbacks of about 3 m at the front, 1.5 m on the sides and 2 m at the back.",
    floorArea: "Floor area is the total living area of all floors added together. As a rough guide, plan about 20–25 sqm per person for a comfortable home. Bigger area means higher cost, roughly in proportion. If you are unsure, start with the suggested size and adjust while watching the estimate.",
    floors: "One floor is the cheapest per sqm and the easiest to build. Two floors fit more rooms on a small lot, but you pay for stairs and stronger columns and beams. If your lot is small, two floors usually make more sense.",
    rooms: "Pick the rooms you need and the planner places them on the floor plan. Drag rooms to move them, and use the 🔒 padlock to keep a room in place while the others rearrange around it. Count the people living there and add a bedroom for each couple or child.",
    partitions: "These are the walls between rooms inside. CHB (standard 8×16-inch concrete hollow block) is strong and good for sound but slower and heavier. Plywood is cheap and fast. Gypsum board is smooth and light, but it does not like water, so avoid it in the CR.",
    walls: "CHB (concrete hollow block) is the common choice in the Philippines: strong, typhoon-resistant and termite-proof. Wood costs less to start and goes up faster, but it needs maintenance and protection against termites and fire.",
    glass: "Glass walls bring in light and look modern, but they cost more per sqm than CHB, make rooms hotter (more aircon use) and need good aluminum framing. A small share, around 10–30%, is a popular balance.",
    windows: "Windows give light and fresh air. Give each room at least one window on an outside wall. As a rough rule, total window area of about 10–15% of the floor area works well. The default size 1.2 m × 1.1 m is a common size.",
    fence: "A perimeter fence gives privacy and security and marks your boundary. Pick the material: concrete block (most private, priciest), concrete base with steel bars, metal/wrought iron, wire (chain-link, cheapest), bamboo (natural, low cost, needs upkeep) or wood pickets. Its cost depends on the lot's perimeter length and the material. You can skip it for now and add it later.",
    budget: "This is the most you plan to spend on the whole build. The estimate on the right updates as you answer each question, so compare it with your budget. It is wise to keep about 10% in reserve for price changes and surprises.",
    labor: "This is who builds the house and their daily rates. The defaults are typical crews. Rates differ by location and by contractor, so change them to match your quotes. If a foreman is connected to your project, they can confirm the real numbers."
  };
  const HELP_KEYS = { lot: /\blot\b|\bland\b/, floorArea: /floor area|how big|size of the house/, floors: /\bfloors?\b|storey|story|stories/, rooms: /\brooms?\b|bedroom|layout|\bcr\b/, partitions: /divider|partition/, walls: /\bwalls?\b|chb|hollow|wood/, glass: /\bglass\b/, windows: /\bwindows?\b/, fence: /\bfence\b/, budget: /budget|cost|price|how much/, labor: /labou?r|worker|crew|rate|foreman/ };
  const isQuestion = t => /\?|^\s*(what|which|how|why|should|can|could|is|are|does|do|explain|help|tell me)\b/i.test(t);
  function helpFor(text) {
    let id = focus && focus.id;
    if (!id) id = Object.keys(HELP_KEYS).find(k => HELP_KEYS[k].test(text.toLowerCase()));
    return id && HELP[id] ? { id, text: HELP[id] } : null;
  }
  const wantsArrange = t => /\b(arrange|re-?arrange|re-?organi[sz]e|re-?layout|auto[- ]?layout)\b/i.test(t) && /\brooms?\b|\bhouse\b|\blayout\b|\bplan\b|\bfloor\b/i.test(t);

  /* ---------- apply a result to the planner ---------- */
  const idx = id => STEPS.findIndex(s => s.id === id);
  const LAY_TYPES = ["living", "kitchen", "dining", "master", "bed", "cr", "other"];
  const c01 = v => Math.min(1, Math.max(0, Number(v) || 0));

  /* the AI's rooms are rectangles in fractions of the floor (x: left→right, y: front→rear). Locked rooms never move. */
  function applyLayout(lay, r) {
    if (!lay || !Array.isArray(lay.rooms)) return null;
    const list = lay.rooms.filter(x => x && LAY_TYPES.includes(x.type)).slice(0, 24);
    if (!list.length) return null;
    if (!S.layout.counted) seedSample();
    const L = S.layout, g = geometry(S), D = g.d, W = S.floors > 1 ? Math.max(3, g.w - stairDims().w) : g.w;   // two or more floors: the right-hand side is kept for the staircase
    const lockedN = L.spaces.filter(s => s.locked && !isOutdoor(s)).length;
    const keep = L.spaces.filter(s => isOutdoor(s) || s.locked);
    let clamped = false;
    const fresh = list.map(x => {
      let fl = Math.round(Number(x.floor) || 1) - 1;
      if (fl < 0 || fl >= S.floors) { fl = Math.min(Math.max(fl, 0), S.floors - 1); clamped = true; }
      let x0 = c01(x.x0), x1 = c01(x.x1), y0 = c01(x.y0), y1 = c01(x.y1);
      if (x1 < x0) [x0, x1] = [x1, x0];
      if (y1 < y0) [y0, y1] = [y1, y0];
      const sp = mkSpace(x.type, x.type === "other" && x.name ? { name: String(x.name).slice(0, 30) } : {});
      sp.fl = fl;
      /* round the edges, not the sizes, so neighbouring rooms share exactly the same wall */
      sp.x = roundTo(x0 * W, 0.05); sp.t = roundTo(y0 * D, 0.05);
      sp.w = Math.max(1.4, roundTo(x1 * W, 0.05) - sp.x); sp.h = Math.max(1.4, roundTo(y1 * D, 0.05) - sp.t);
      return sp;
    });
    /* a store goes on the ground floor; the AI can't send it upstairs without the person agreeing */
    let movedShop = false;
    fresh.forEach(sp => { if (isShop(sp) && sp.fl > 0) { sp.fl = 0; movedShop = true; } });
    L.spaces = keep.concat(fresh);
    L.custom = true; L.counted = true;
    if (typeof carveHalls === "function") carveHalls();
    resolveRooms(null); placeOutdoor(); layoutSync();
    layView = null; laySel = null;
    if (movedShop) r._warn = (r._warn || []).concat("I kept the store on the ground floor. If you want a second store upstairs, add it from the floor plan and I'll ask first.");
    if (clamped) r._warn = (r._warn || []).concat("The house has " + S.floors + " floor" + (S.floors > 1 ? "s" : "") + ", so I kept every room on the floors it has.");
    const probs = layoutProblems().list;
    if (probs.length) r._warn = (r._warn || []).concat("Some rooms didn't fit perfectly: " + probs.join(" ") + " You can drag them in the floor plan, or ask me to change the arrangement.");
    return `Rooms arranged (${fresh.length} room${fresh.length === 1 ? "" : "s"}${lockedN ? `, ${lockedN} locked room${lockedN === 1 ? "" : "s"} kept in place` : ""})`;
  }

  /* built-in arranger (no AI): re-runs the normal automatic layout; locked rooms stay */
  function localArrange() {
    if (!S.layout.counted) { seedSample(); return "Rooms arranged"; }
    S.layout.custom = false;
    autoLayout(); placeOutdoor(); layoutSync(); layView = null;
    const n = S.layout.spaces.filter(s => s.locked).length;
    return "Rooms arranged automatically" + (n ? ` (${n} locked room${n === 1 ? "" : "s"} kept in place)` : "");
  }

  function applyResult(r) {
    const p = r.plan || {}, done = [];
    if (r.templateName) S.tplFilled = [];
    const mark = id => { const i = idx(id); if (i >= 0) { answered[i] = true; if (r.templateName && S.tplFilled && !S.tplFilled.includes(id)) S.tplFilled.push(id); } };
    const setBig = (key, v) => { const old = layoutFootprint(); S[key] = v; layoutFootprintChanged(old); layView = null; };

    if (p.lotWidth > 3 && p.lotDepth > 3) {
      setLot([{ x: 0, y: 0 }, { x: p.lotWidth, y: 0 }, { x: p.lotWidth, y: p.lotDepth }, { x: 0, y: p.lotDepth }], 0, "", "Rectangle");
      mark("lot"); done.push(`Lot ${p.lotWidth} × ${p.lotDepth} m`);
    } else if (p.lotArea >= 40) {
      setLot(presetPts("rect", p.lotArea), 0, "", "Rectangle"); mark("lot"); done.push(`Lot area ${Math.round(p.lotArea)} sqm`);
    }
    if (p.floors >= 1 && p.floors <= 3) { setBig("floors", Math.round(p.floors)); mark("floors"); done.push(`${S.floors} floor${S.floors > 1 ? "s" : ""}`); }
    if (p.floorArea >= 20) { const fa = Math.min(1000, p.floorArea); setBig("floorArea", fa); mark("floorArea"); done.push(`Floor area ${Math.round(fa)} sqm`); }
    const hasLay = !!(r.layout && Array.isArray(r.layout.rooms) && r.layout.rooms.length);
    if (p.rooms && !hasLay) {
      if (!S.layout.counted) seedSample();
      ["master", "bed", "cr"].forEach(k => {
        if (p.rooms[k] == null) return;
        const want = Math.max(0, Math.round(p.rooms[k])), cap = maxRooms(S, k);
        let guard = 30;
        while (S.rooms[k] < Math.min(want, Math.max(cap, S.rooms[k])) && guard--) addSpace(k);
        while (S.rooms[k] > want && guard--) removeOne(k);
      });
      const R = S.rooms; done.push(`${R.bed} bedroom${R.bed === 1 ? "" : "s"}, ${R.master} master, ${R.cr} CR`);
      const asked = p.rooms, short = ["bed", "master", "cr"].filter(k => asked[k] != null && S.rooms[k] < Math.round(asked[k]));
      if (short.length) r._warn = (r._warn || []).concat("The floor area is too small for all the rooms you asked for, so I added as many as fit. Increase the floor area to add more.");
      mark("rooms");
    }
    if (p.garage != null) { const g = S.layout.spaces.find(s => s.type === "garage"); if (g) removeSpace(g.id); if (p.garage > 0) addSpace("garage", { cars: Math.min(2, Math.round(p.garage)), pos: "right" }); S.layout.counted = true; mark("rooms"); done.push(p.garage ? `${p.garage}-car garage` : "No garage"); }
    if (p.terrace === 0) { const t0 = S.layout.spaces.find(s => s.type === "terrace"); if (t0) removeSpace(t0.id); }
    if (p.terrace > 0) {
      const t0 = S.layout.spaces.find(s => s.type === "terrace");
      if (t0 && r.templateName) removeSpace(t0.id);   // a template sets the terrace size itself
      if (!S.layout.spaces.some(s => s.type === "terrace")) { addSpace("terrace", { area: p.terrace }); mark("rooms"); done.push("Terrace"); }
    }
    if (p.balcony === false) { const b0 = S.layout.spaces.find(s => s.type === "balcony"); if (b0) removeSpace(b0.id); }
    if (p.balcony && S.floors >= 2 && !S.layout.spaces.some(s => s.type === "balcony")) { addSpace("balcony"); mark("rooms"); done.push("Balcony"); }
    if (hasLay) { const m = applyLayout(r.layout, r); if (m) { mark("rooms"); done.push(m); } }
    else if (r.localArrange) { done.push(localArrange()); mark("rooms"); }
    if (p.walls && WALLS[p.walls]) { S.walls = p.walls; mark("walls"); done.push(WALLS[p.walls].name + " walls"); }
    if (p.partitions && PARTITIONS[p.partitions]) { S.partitions = p.partitions; mark("partitions"); done.push(PARTITIONS[p.partitions].name + " dividers"); }
    if (p.glass != null && p.glass >= 0 && p.glass <= 1) { S.glass = Math.round(p.glass * 4) / 4; mark("glass"); done.push(Math.round(S.glass * 100) + "% glass"); }
    if (p.windows && p.windows.count >= 0) { S.windows = { count: Math.round(p.windows.count), w: p.windows.w || S.windows.w, h: p.windows.h || S.windows.h }; mark("windows"); done.push(S.windows.count + " windows"); }
    if (p.look && typeof p.look === "object") {
      const L = Object.assign({ facade: "plain", roof: "gable", cladding: "amakan", finish: "plain" }, S.look);
      const ok = { facade: ["plain", "halfclad"], roof: ["gable", "flat", "hip"], cladding: ["amakan", "steel", "wood"], finish: ["plain", "paint"] };
      Object.keys(ok).forEach(k => { if (ok[k].includes(p.look[k])) L[k] = p.look[k]; });
      S.look = L;
      const bits = [];
      if (p.look.facade) bits.push(L.facade === "halfclad" ? "half " + (L.cladding === "steel" ? "steel-sheet" : L.cladding === "wood" ? "wood" : "amakan") + " cladding over concrete" : "plain walls");
      if (p.look.roof) bits.push(L.roof === "flat" ? "flat roof" : L.roof === "hip" ? "hip roof" : "gable roof");
      if (p.look.finish === "paint") bits.push("painted walls");
      if (bits.length) done.push("Look: " + bits.join(", "));
    }
    if (p.style && window.BWInterior && BWInterior.STYLES[p.style]) { S.interior = Object.assign({ furniture: true }, S.interior, { style: p.style }); done.push("Interior style: " + BWInterior.STYLES[p.style].name); }
    if (p.fenceType && FENCES[p.fenceType] && p.fence !== false) p.fence = p.fenceType;
    if (typeof p.fence === "boolean" || FENCES[p.fence]) { S.fence = p.fence; mark("fence"); done.push(fenceKind(p.fence) ? FENCES[fenceKind(p.fence)].name + " fence" : "No fence"); }
    if (p.budget >= 100000) { S.budget = Math.round(p.budget); mark("budget"); done.push("Budget " + peso(S.budget)); }

    const added = [];
    if (r.templateName) S.extraItems = (S.extraItems || []).filter(e => !e.tpl);   // a new template replaces the old template's extras
    (r.extras || []).forEach(x => {
      if (!x || !x.name) return;
      const qty = x.perWall ? Math.max(1, Math.round(geometry(S).perim * WALL_H * S.floors * x.perWall)) : x.perFloorArea || !x.qty ? S.floorArea : Number(x.qty);
      if (!(qty > 0)) return;
      S.extraItems = S.extraItems || [];
      const same = S.extraItems.find(e => e.name.toLowerCase() === String(x.name).toLowerCase());
      if (same) { same.qty = qty; if (x.price >= 0) same.price = Number(x.price); }
      else S.extraItems.push({ id: Math.random().toString(36).slice(2, 8), name: String(x.name).slice(0, 80), qty, unit: x.unit || "pc", price: Number(x.price) || 0, tpl: !!x.tpl });
      added.push(`${x.name} (${qty} ${x.unit || "pc"})`);
    });
    if (r.templateName) done.unshift("Template: " + r.templateName);
    if (done.length || added.length) {
      const next = nextOpen();
      if (next >= 0) openQuestion(next); else editing = null;
      refreshAll();
    }
    return { done, added };
  }

  /* ---------- talking to the AI function (or falling back) ---------- */
  function currentState() {
    const g = geometry(S), W = g.w || 1, D = g.d || 1, r2 = v => Math.round(v * 100) / 100;
    return {
      lotArea: Math.round(S.lotArea || 0), floorArea: S.floorArea, floors: S.floors,
      house: { widthM: r2(W), depthM: r2(D), floorsCount: S.floors },
      rooms: S.rooms, garage: S.garage, terraceSqm: S.terrace, balcony: S.balcony,
      interiorStyle: S.interior && S.interior.style, walls: S.walls, partitions: S.partitions, glass: S.glass, windows: S.windows, fence: S.fence, budget: S.budget,
      layout: S.layout.spaces.filter(s => !isOutdoor(s) && s.type !== "stairs").map(s => ({ type: s.type, name: s.name, floor: s.fl + 1, locked: !!s.locked, x0: r2(s.x / W), y0: r2(s.t / D), x1: r2((s.x + s.w) / W), y1: r2((s.t + s.h) / D) })),
      extras: (S.extraItems || []).map(e => e.name),
      answered: STEPS.filter((st, i) => answered[i]).map(st => st.id)
    };
  }

  async function ask(userMsg) {
    const text = userMsg.text || "", notes = userMsg.files.filter(f => f.text);
    let aiError = "", aiWhy = "";
    if (!BW.db) aiWhy = "You are in preview mode: supabase-config.js has no real Supabase URL and key, or you are not signed in, so the AI cannot be reached.";
    if (BW.db && !aiOff) {
      try {
        const history = chat.filter(m => !m.hidden).slice(-10, -1).map(m => ({ role: m.role === "user" ? "user" : "assistant", text: m.text || "" }));
        const { data, error } = await BW.db.functions.invoke(AI_FUNCTION_NAME, { body: {
          history, text,
          images: userMsg.files.flatMap(f => f.images || []).slice(0, 8),
          pdfs: userMsg.files.filter(f => f.pdf).map(f => f.pdf).slice(0, 2),
          notes: notes.map(f => f.name + ":\n" + f.text).join("\n\n"),
          focus: focus ? { id: focus.id, title: focus.title, question: focus.q } : null,
          current: currentState()
        } });
        if (error) {
          let status = 0, msg = "";
          try { status = error.context && error.context.status; const j = await error.context.json(); msg = j && j.error; } catch (_) {}
          if (status === 404 || !status) throw error;   // function not deployed / can't be reached
          aiError = msg || ("The AI service had a problem (" + status + ").");
        } else if (data && data.error) aiError = data.error;
        else return { ...data, via: "ai" };
      } catch (e) { console.warn("reference-chat unavailable:", e); aiWhy = "I could not reach the AI function \"" + AI_FUNCTION_NAME + "\" on Supabase. Check that it is deployed with exactly that name, and that you are signed in with a real account. (" + String((e && e.message) || e).slice(0, 120) + ")"; }
    }
    const r = readText(text);
    r.via = "local"; r.aiError = aiError; r.aiWhy = aiWhy; r.hadFiles = userMsg.files.some(f => f.kind !== "text");
    notes.forEach(f => { const t = readText(f.text); r.plan = Object.assign({}, t.plan, r.plan); r.extras = (r.extras || []).concat(t.extras); });
    if (wantsArrange(text)) r.localArrange = true;
    if (window.BWTemplates && !r.template && !isQuestion(text)) r.template = BWTemplates.guess(text);
    const h = isQuestion(text) ? helpFor(text) : null;
    if (h) r.reply = h.text;
    return r;
  }

  async function uploadAll(files) {
    const out = [];
    for (const f of files) {
      let path = null;
      try { if (BW.uploadReference) path = await BW.uploadReference(project.id, f.file); } catch (e) { console.warn("upload failed", e); }
      out.push({ name: f.name, kind: f.kind, path, thumb: f.kind === "image" || f.kind === "video" ? f.thumb : null });
    }
    return out;
  }

  async function send() {
    const text = textEl.value.trim();
    if (busy || (!text && !pending.length)) return;
    const files = pending.slice(); pending = []; textEl.value = ""; textEl.style.height = "auto"; busy = true;
    const mine = { role: "user", text: text || "(files attached)", files: files.map(f => ({ name: f.name, thumb: f.thumb })) };
    chat.push(mine); paint();
    try {
      const [r0, saved] = await Promise.all([ask({ text, files }), uploadAll(files)]);
      const r = r0.template && window.BWTemplates ? BWTemplates.merge(r0) : r0;
      mine.files = saved.map(s => ({ name: s.name, thumb: s.thumb, path: s.path, kind: s.kind }));
      const res = applyResult(r);
      let html = "";
      const reply = (r.reply || "").trim();
      if (reply) html += esc(reply);
      if (r.via === "local") {
        const none = !res.done.length && !res.added.length;
        if (r.aiError) html = (html ? html + "<br><br>" : "") + "⚠ The AI assistant had a problem: " + esc(r.aiError) + (none ? "" : "<br>I filled in what I could from your text.");
        else if (none && !reply) html = (r.hadFiles ? "I can see you attached files, but reading images, plans and videos needs the AI assistant, which isn't connected yet. " : "") + "I couldn't pick out any details from that. Try something like: “2-storey, 3 bedrooms, 2 CR, 120 sqm, budget 3 million, add solar panels.” You can also skip this and answer the questions yourself.";
        else if (r.hadFiles) html += (html ? "<br><br>" : "") + "I filled in what I could from your text. Reading the attached files needs the AI assistant, which isn't connected yet.";
        if (r.aiWhy && !r.aiError) html += `<br><br><span style="color:#8ea6bd">Why: ${esc(r.aiWhy)}</span>`;
        else if (reply && none) html += "<br><br><span style=\"color:#8ea6bd\">The AI assistant isn't connected yet, so this is a built-in explanation. Once it is, I can answer your own questions and arrange the rooms to fit your ideas.</span>";
      }
      if (res.done.length) html += (html ? "<br><br>" : "") + "<b>Filled in the planner:</b><ul>" + res.done.map(d => `<li>${esc(d)}</li>`).join("") + "</ul>";
      if (res.added.length) html += (html ? "<br><br>" : "") + "<b>Added to your materials:</b><ul>" + res.added.map(d => `<li>${esc(d)}</li>`).join("") + "</ul><span style=\"color:#8ea6bd\">Prices for extras are rough estimates. You can change them in the materials list.</span>";
      (r._warn || []).forEach(w => { html += `<br><br>⚠ ${esc(w)}`; });
      const left = visibleSteps().filter(i => !stepDone(i) && STEPS[i].id !== "labor").map(i => STEPS[i].title.toLowerCase());
      if (!(res.done.length || res.added.length) && !reply && !html) html = "I didn't change anything. Tell me what you want, or ask me about a question in the planner.";
      if ((res.done.length || res.added.length) && left.length) html += `<br><br>Still open in the planner: ${esc(left.slice(0, 5).join(", "))}${left.length > 5 ? "…" : ""}. Tell me more, or close this and answer them yourself.`;
      chat.push({ role: "bot", text: (reply || (res.done.concat(res.added).join(", "))), html });
    } catch (e) {
      chat.push({ role: "bot", text: "Something went wrong: " + (e.message || e), html: "Something went wrong: " + esc(e.message || e) + ". Your files are kept — try sending again." });
    }
    busy = false; paint();
  }

  /* ---------- public ---------- */
  function intro() {
    chat.push({ role: "bot", text: "Hi! Do you have a reference for this house?", html: "Hi! Do you have a reference for this house, like photos, a sketch, a floor plan or a video you like? Upload it with 📎, or just tell me what you want, for example “2-storey, 3 bedrooms, 120 sqm, add solar panels”.<br><br>I'll fill in the planner questions I can and add any extra materials you mention. You can also ask me about any planner question, or ask me to arrange the rooms. Or skip this and answer the questions yourself." });
  }
  function setContext(ctx) {
    const first = !project;
    project = ctx.project; user = ctx.user;
    if (first && typeof renderQuestion === "function" && editing !== null) renderQuestion();   // show the "Ask AI" button on the current question
  }
  function open(ctx, opts) {
    if (ctx) setContext(ctx);
    if (!project) return;
    if (!dlg) build();
    if (!chat.length) intro();
    focus = opts && opts.focus ? opts.focus : null;
    started = true;
    paint(); if (!dlg.open) dlg.showModal(); textEl.focus();
  }
  /* "Ask AI" button on a planner question */
  function askAbout() {
    if (editing === null || !STEPS[editing]) return open(null);
    const st = STEPS[editing];
    open(null, { focus: { id: st.id, title: st.title, q: st.q } });
  }
  const origRQ = window.renderQuestion;
  if (typeof origRQ === "function") window.renderQuestion = function () {
    origRQ.apply(this, arguments);
    const acts = document.querySelector("#questionCard .q-actions");
    if (!acts || !project || editing === null) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "outline-btn ask-ai"; b.textContent = "💬 Ask AI about this";
    b.title = "Ask a question about this step, or let the AI decide for you";
    b.onclick = askAbout;
    const sp = acts.querySelector(".spacer"); acts.insertBefore(b, sp || null);
  };
  function load(saved) { if (Array.isArray(saved) && saved.length) { chat = saved.map(m => Object.assign({}, m)); } }
  const getChat = () => chat.slice(-60).map(m => ({ role: m.role, text: m.text, html: m.html, files: (m.files || []).map(f => ({ name: f.name, kind: f.kind, path: f.path || null })) }));
  return { open, setContext, load, getChat, readText, applyResult };
})();