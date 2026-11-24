/* Connects the planner (index.html) to a project: open with index.html?project=<id> */
(async function () {
  const id = new URLSearchParams(location.search).get("project");
  if (!id || !window.BW) return;
  const user = await BW.me();

  /* read-only 3D viewer, shown inside plan.html for the client and the foreman: index.html?project=<id>&embed=1 */
  if (new URLSearchParams(location.search).get("embed") === "1") {
    document.documentElement.classList.add("bw-embed");
    let pr = null; try { pr = await BW.getProject(id); } catch (e) {}
    if (pr && pr.plan_data && pr.plan_data.S) {
      try {
        Object.assign(S, pr.plan_data.S);
        if (!pr.plan_data.S.pay) S.pay = defaultPay();   /* plans saved before pay types existed stay as they were */
        if (Array.isArray(pr.plan_data.answered)) answered = migrateAnswered(pr.plan_data.answered);
        editing = null; viewInside = false;
        setViewMode("3d");
        refreshAll();
      } catch (e) { console.warn("Could not open the saved plan", e); }
    }
    return;
  }

  let project = null;
  try { project = await BW.getProject(id); } catch (e) {}
  /* only the owner edits the plan; everyone else gets the read-only summary */
  if (project && !BW.isOwner(user, project)) { location.replace("plan.html?id=" + encodeURIComponent(id)); return; }

  const bar = document.createElement("div");
  bar.style.cssText = "position:sticky;top:0;z-index:20;display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px 28px;background:#0b1522;border-bottom:2px solid #f5b301;font:600 14px Barlow,system-ui,sans-serif;color:#dbe7f3";
  const b = "background:transparent;border:1px solid #25405c;color:#bfe4ff;padding:7px 14px;border-radius:3px;font:600 13px inherit;cursor:pointer;text-decoration:none";
  bar.innerHTML = project
    ? `<span style="color:#f5b301;font-family:'IBM Plex Mono',monospace;font-size:11px">PROJECT</span><strong style="font-size:17px">${project.name.replace(/[<>&]/g, "")}</strong><span style="flex:1"></span>
       <span id="bwSaved" style="color:#8ea6bd;font-size:12.5px"></span>
       <button id="bwChat" style="${b}">💬 Reference chat</button>
       <button id="bwSave" style="background:#f5b301;color:#0b1522;border:0;padding:8px 16px;border-radius:3px;font:700 14px inherit;cursor:pointer">Save plan to project</button>
       <a href="project.html?id=${encodeURIComponent(id)}" style="${b}">Progress</a><a href="projects.html" style="${b}">All projects</a>`
    : `<span style="color:#ff6b5b">This project wasn't found or isn't shared with you.</span><span style="flex:1"></span><a href="projects.html" style="${b}">All projects</a>`;
  document.body.insertBefore(bar, document.body.firstChild);
  if (!project) return;
  /* work has started with a contractor: the plan is locked, and edits go to the contractor as a change request */
  const locked = BW.planLocked(user, project);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (locked) {
    const sv = document.getElementById("bwSave"); if (sv) sv.textContent = "Send change request";
    const nb = document.createElement("div");
    nb.style.cssText = "padding:9px 28px;background:#fff4e0;color:#7a4a00;border-bottom:1px solid #f0c987;font:500 13.5px system-ui,sans-serif";
    nb.innerHTML = "<b>Work has started.</b> The saved plan is locked. Make your changes here, then press <b>Send change request</b>. Your foreman approves or declines it, and an approved request becomes the official plan.";
    bar.after(nb);
  }
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) { sidebar.style.top = bar.offsetHeight + "px"; sidebar.style.height = "calc(100vh - " + bar.offsetHeight + "px)"; }

  /* open the saved plan */
  if (project.plan_data && project.plan_data.chat && window.RefChat) RefChat.load(project.plan_data.chat);
  if (project.plan_data && project.plan_data.S) {
    try {
      Object.assign(S, project.plan_data.S);
      if (!project.plan_data.S.pay) S.pay = defaultPay();
      if (Array.isArray(project.plan_data.answered)) answered = migrateAnswered(project.plan_data.answered);
      const next = nextOpen();
      openQuestion(next < 0 ? 0 : next);
      refreshAll();
    } catch (e) { console.warn("Could not open the saved plan", e); }
  }

  /* a plain-language snapshot of the plan, so clients and foremen can read it without the questions */
  function buildSummary() {
    const c = calc(S), g = geometry(S), remaining = S.budget - c.total, ok = remaining >= 0;
    const cmp = [
      { label: "Concrete hollow block walls, all solid", o: { walls: "chb", glass: 0 } },
      { label: "Wood walls, all solid", o: { walls: "wood", glass: 0 } },
      { label: "Half glass walls", o: { glass: 0.5 } },
      { label: "Room dividers in hollow block", o: { partitions: "chb4" } },
      { label: "Room dividers in plywood", o: { partitions: "plywood" } },
      { label: "Room dividers in gypsum board", o: { partitions: "gypsum" } }
    ].map(x => ({ ...x, total: calc({ ...S, ...x.o }).total, current: Object.keys(x.o).every(k => S[k] === x.o[k]) }));
    const cheapest = cmp.reduce((a, b) => (b.total < a.total ? b : a));
    const tips = [];
    if (ok) {
      tips.push("The design fits the budget, with about " + peso(remaining) + " left.");
      tips.push("Keep part of the leftover as extra contingency, since prices and site conditions often change.");
    } else {
      tips.push("The design is " + peso(-remaining) + " over budget.");
      tips.push("Reduce the floor area to about " + fitArea(S) + " sqm to fit the budget.");
      if (!cheapest.current && cheapest.total < c.total) tips.push("Switching to " + cheapest.label.toLowerCase() + " would save about " + peso(c.total - cheapest.total) + ".");
      if (S.fence) { const f = c.total - calc({ ...S, fence: false }).total; if (f > 0) tips.push("Postponing the perimeter fence would save about " + peso(f) + "."); }
      tips.push("Reduce the crew size or the number of working days.");
    }
    if (!c.plan.fits) tips.push("The rooms need about " + Math.ceil(c.plan.minTotal) + " sqm, more than the floor area. Remove a room or enlarge the house.");
    if (!placeHouse(S).fits) tips.push("The house does not fit inside the lot with the usual setbacks. Try more floors or a smaller floor area.");
    const R = S.rooms;
    return {
      savedAt: new Date().toISOString(),
      lot: { area: Math.round(S.lotArea * 10) / 10, sides: S.lot.pts.length, name: S.lot.name || "" },
      house: { floorArea: S.floorArea, floors: S.floors, perFloor: Math.round(g.fp * 10) / 10 },
      rooms: { bed: R.bed || 0, master: R.master || 0, cr: R.cr || 0, living: R.living || 0, kitchen: R.kitchen || 0, dining: R.dining || 0 },
      extras: [S.garage ? S.garage + "-car garage" + (S.garageOut ? " (outside the house)" : "") : "", S.terrace ? "Terrace" : "", S.balcony && S.floors >= 2 ? "Balcony" : ""].filter(Boolean),
      build: { walls: answerText("walls"), dividers: answerText("partitions"), glass: answerText("glass"), windows: answerText("windows"), fence: answerText("fence") },
      money: { budget: S.budget, total: Math.round(c.total), remaining: Math.round(remaining), ok, materials: Math.round(c.matTotal), labor: Math.round(c.pay.labor), permits: Math.round(c.permits), contingency: Math.round(c.contingency), payType: c.pay.type, fee: Math.round(c.pay.fee), feeLabel: c.pay.feeMode === "fixed" ? "fixed" : (Number(c.pay.feePct) || 0) + "%", showFee: c.pay.showFee !== false, crewCost: Math.round(c.pay.crewCost), margin: Math.round(c.pay.margin) },
      keyTotals: Object.keys(TILE_LABELS).filter(k => c.keyTotals[k] > 0).map(k => ({ name: TILE_LABELS[k][0], qty: Math.round(c.keyTotals[k]), unit: TILE_LABELS[k][1] })),
      materials: c.cats.map(cat => ({ name: cat.name, icon: cat.icon, total: Math.round(cat.total), items: cat.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, cost: Math.round(i.cost) })) })),
      labor: { headcount: c.labor.headcount, days: c.labor.duration, total: Math.round(c.labor.total), rows: c.labor.rows.filter(r => r.count > 0).map(r => ({ name: r.name, tier: r.tier, rate: r.rate, count: r.count, days: r.days, cost: Math.round(r.cost) })) },
      suggestions: tips,
      complete: answered.every(Boolean)
    };
  }

  const note = t => { const el = document.getElementById("bwSaved"); if (el) el.textContent = t; };
  let saving = false, again = false, timer = 0, dirty = false;
  async function saveNow(manual) {
    if (locked) return;   /* locked plans are never auto-saved */
    if (saving) { again = true; return; }
    saving = true; dirty = false; note(manual ? "Saving…" : "Saving changes…");
    try {
      const total = Math.round(calc(S).total || 0);
      await BW.savePlan(id, { S: JSON.parse(JSON.stringify(S)), answered: answered.slice(), summary: buildSummary(), chat: window.RefChat ? RefChat.getChat() : [] }, total, S.budget || null);
      note("Saved " + new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }));
    } catch (e) { note("Couldn't save: " + (e.message || e)); dirty = true; }
    saving = false;
    if (again) { again = false; schedule(); }
  }
  function schedule() { dirty = true; if (locked) { note("Draft changes, not sent yet"); return; } note("Unsaved changes…"); clearTimeout(timer); timer = setTimeout(() => saveNow(false), 1500); }

  /* save automatically whenever an answer changes (the planner redraws through these two functions) */
  ["liveUpdate", "refreshAll"].forEach(name => {
    const orig = window[name];
    if (typeof orig !== "function") return;
    window[name] = function () { const r = orig.apply(this, arguments); schedule(); return r; };
  });
  window.bwSchedule = schedule;
  window.addEventListener("pagehide", () => { if (dirty) saveNow(false); });
  window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  if (window.RefChat) RefChat.setContext({ project, user });
  const chatBtn = document.getElementById("bwChat");
  if (chatBtn) chatBtn.onclick = () => RefChat.open({ project, user });
  /* a brand-new project starts with the reference chat */
  if (new URLSearchParams(location.search).get("new") === "1" && !(project.plan_data && project.plan_data.S) && window.RefChat) {
    history.replaceState(null, "", location.pathname + "?project=" + encodeURIComponent(id));
    RefChat.open({ project, user });
  }

  const btn = document.getElementById("bwSave");
  /* ask for a short reason, then send the proposed plan to the contractor */
  const askNote = () => new Promise(ok => {
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;z-index:99;background:rgba(10,20,30,.55);display:grid;place-items:center;padding:16px";
    box.innerHTML = `<div role="dialog" aria-modal="true" aria-label="Send change request" style="background:#fff;color:#1f2d28;border-radius:12px;padding:20px;max-width:440px;width:100%;font:500 14px system-ui,sans-serif">
      <h3 style="margin:0 0 6px;font-size:18px">Send change request</h3>
      <p style="margin:0 0 10px;color:#5a6b66">Your foreman will see the old and new cost and can approve or decline. Say what you want changed.</p>
      <textarea id="crNote" maxlength="500" rows="3" placeholder="Example: add one more bedroom on the second floor" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid #cfd8d4;border-radius:8px;font:inherit"></textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button type="button" id="crNo" style="padding:8px 14px;border:1px solid #cfd8d4;background:#fff;border-radius:8px;cursor:pointer">Cancel</button><button type="button" id="crYes" style="padding:8px 16px;border:0;background:#147D70;color:#fff;border-radius:8px;font-weight:700;cursor:pointer">Send</button></div></div>`;
    const done = v => { box.remove(); ok(v); };
    box.querySelector("#crNo").onclick = () => done(null);
    box.querySelector("#crYes").onclick = () => done(box.querySelector("#crNote").value.trim());
    document.body.appendChild(box); box.querySelector("#crNote").focus();
  });
  if (btn && locked) btn.onclick = async () => {
    const text = await askNote(); if (text === null) return;
    btn.disabled = true; note("Sending…");
    try {
      const total = Math.round(calc(S).total || 0);
      await BW.sendChangeRequest(user, id, { note: text, plan: { S: JSON.parse(JSON.stringify(S)), answered: answered.slice(), summary: buildSummary(), chat: window.RefChat ? RefChat.getChat() : [] }, total, budget: S.budget || null, oldTotal: project.plan_total || null });
      dirty = false; note("Change request sent. Waiting for your foreman.");
      btn.textContent = "Sent ✓";
      setTimeout(() => { btn.textContent = "Send change request"; btn.disabled = false; }, 2500);
    } catch (e) { note("Couldn't send: " + (/change_requests/.test(e.message || "") ? "run the change requests SQL in Supabase first." : (e.message || e))); btn.disabled = false; }
  };
  else if (btn) btn.onclick = async () => { clearTimeout(timer); btn.disabled = true; await saveNow(true); btn.disabled = false; };
})();
