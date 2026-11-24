(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const peso = n => n ? "₱" + Math.round(n).toLocaleString("en-PH") : "—";
  const when = iso => new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const id = new URLSearchParams(location.search).get("id");
  const fail = t => { $("err").textContent = t; $("err").hidden = false; };

  const user = await BW.me();
  const isPro = user.role === "contractor";
  $("who").textContent = user.name; $("whoMail").textContent = BW.shownName(user.email);
  $("roleTag").textContent = isPro ? BW.proLabel(user) : "CLIENT"; $("roleTag").classList.toggle("client", !isPro);
  $("out").onclick = BW.signOut; $("previewBanner").hidden = !user.preview;
  if (!id) return fail("No project selected. Go back to your projects.");

  let project;
  try { project = await BW.getProject(id); } catch (e) { return fail("Couldn't load this project: " + (e.message || e)); }
  if (!project) return fail("This project doesn't exist, or it isn't shared with you.");

  const day = iso => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  let allUps = [];
  /* overview: progress ring, milestones, people, budget and plan summary, all from the project's own data */
  function paintExtras() {
    const p = project.progress, st = BW.stageOf(p), R = 38, C = 2 * Math.PI * R;
    $("hero").innerHTML = `<div class="ring" role="img" aria-label="${p}% complete"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" class="rg-bg"/><circle cx="50" cy="50" r="${R}" class="rg-fg" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - p / 100)).toFixed(1)}"/></svg><b>${p}%</b></div>
      <div class="hero-txt"><small>CONSTRUCTION PROGRESS</small><h2>${p >= 100 ? "Completed" : esc(st.name)}</h2>
      <p>${allUps.length ? "Latest update " + day(allUps[0].created_at) + ": " + esc(allUps[0].message.length > 120 ? allUps[0].message.slice(0, 120) + "…" : allUps[0].message) : (isPro ? "No updates yet. Post the first one under Progress & timeline." : "No updates yet. Your foreman will post here as work moves along.")}</p></div>`;
    $("miles").innerHTML = BW.STAGES.map((s2, i) => {
      const next = BW.STAGES[i + 1], state = p >= 100 || (next && p >= next.from) ? "done" : s2 === st ? "now" : "todo";
      return `<li class="${state}"><span class="mdot" aria-hidden="true">${state === "done" ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ""}</span><div><b>${esc(s2.name)}</b><small>${state === "done" ? "Done" : state === "now" ? "In progress" : "Upcoming"} · from ${s2.from}%</small></div></li>`;
    }).join("");
    $("people").innerHTML = `<div><small>CLIENT</small><b>${project.client_email ? esc(project.client_name || BW.shownName(project.client_email)) : "Not linked yet"}</b></div>
      <div><small>FOREMAN / CONTRACTOR</small><b>${project.contractor_name ? esc(project.contractor_name) : "Not connected yet"}</b></div>
      <div><small>LOCATION</small><b>${esc(project.location || "Not set")}</b></div>`;
    /* budget: only numbers we really have (the plan's estimate and the budget set in the planner) */
    const est = project.plan_total, bud = project.budget, diff = bud && est ? bud - est : null, use = bud && est ? Math.min(100, Math.round(est / bud * 100)) : 0;
    $("bud").innerHTML = est || bud ? `<div class="bud-cards"><div class="plate"><small>ESTIMATED COST</small><b>${peso(est)}</b><span class="note">From the house plan</span></div>
      <div class="plate"><small>BUDGET</small><b>${peso(bud)}</b><span class="note">Set in the planner</span></div>
      <div class="plate ${diff != null && diff < 0 ? "bad" : "good"}"><small>${diff != null && diff < 0 ? "OVER BUDGET BY" : "ROOM IN BUDGET"}</small><b>${diff == null ? "—" : peso(Math.abs(diff))}</b><span class="note">${diff == null ? "Needs both an estimate and a budget" : diff < 0 ? "The estimate is higher than the budget" : "Budget minus the estimate"}</span></div></div>
      <section class="plate"><h3>Estimate against budget</h3><div class="pbar ${diff != null && diff < 0 ? "over" : ""}"><i style="width:${use}%"></i></div><p class="note" style="margin-top:8px">${bud && est ? `The estimate uses ${Math.round(est / bud * 100)}% of the budget.` : "Open the house plan and set a budget to compare."}</p></section>
      <section class="plate"><p class="note">Actual expenses, material and labor spending are not recorded yet, so they are not shown. They would need a place to enter them.</p></section>` :
      `<section class="plate"><h3>No budget yet</h3><p class="note">${BW.isOwner(user, project) ? "Open the house plan to work out the estimate and set a budget." : "The owner hasn't saved a plan with a budget yet."}</p></section>`;
    const S0 = project.plan_data && project.plan_data.S, R0 = S0 && S0.rooms || {};
    const rows = S0 ? [["Floors", S0.floors], ["Floor area", S0.floorArea ? S0.floorArea + " sqm" : null], ["Lot area", S0.lotArea ? Math.round(S0.lotArea) + " sqm" : null], ["Bedrooms", (R0.master || 0) + (R0.bed || 0) || null], ["Bathrooms", (R0.masterT != null ? R0.masterT : R0.master || 0) + (R0.cr || 0) || null], ["Extras on the lot", (S0.lotItems || []).length || null]].filter(r => r[1]) : [];
    $("planSum").innerHTML = rows.map(r => `<div><small>${r[0].toUpperCase()}</small><b>${esc(r[1])}</b></div>`).join("") || "";
    $("planNote").textContent = rows.length ? (BW.isOwner(user, project) ? "Open the house plan to change any of this. The estimate updates as you do." : "This is the house plan your client saved.") : "No house plan has been saved yet.";
    paintBreakdown();
  }
  /* budget breakdown: every cost line of the saved plan, and how much of it the payments received so far cover */
  function paintBreakdown() {
    const el = $("budBreak"); if (!el) return;
    const sm = project.plan_data && project.plan_data.summary, m = sm && sm.money;
    if (!sm || !m) { el.innerHTML = ""; return; }
    const total = Number(project.plan_total) || m.total || 0, pc = n => total ? (n / total * 100) : 0;
    const rowsP = (project.payments && project.payments.rows) || [], hasP = rowsP.length > 0;
    const recPct = rowsP.filter(r => r.status === "received").reduce((a, r) => a + r.pct, 0), sentPct = rowsP.filter(r => r.status === "sent").reduce((a, r) => a + r.pct, 0);
    const cov = n => n * recPct / 100, pe = n => "₱" + Math.round(n || 0).toLocaleString("en-PH");
    const type = m.payType || "arawan", hideFee = false;   /* clients can see the contractor's fee and rate */
    const feeLine = type === "contractor" && !hideFee ? m.fee : 0;
    const labor = type === "contractor" && hideFee ? m.labor + m.fee : m.labor;
    const cols = hasP ? 4 : 3;
    const line = (name, amount, extra) => `<tr${extra ? ' class="bk-sub"' : ""}><td>${name}</td><td class="num">${pe(amount)}</td><td class="num">${pc(amount).toFixed(1)}%</td>${hasP ? `<td class="num">${pe(cov(amount))}</td>` : ""}</tr>`;
    const mats = (sm.materials || []).map(c => `<details class="bk-det"><summary><span>${esc(c.icon || "")} ${esc(c.name)}</span><b>${pe(c.total)}</b></summary>
        <div class="table-wrap"><table class="pay-table bk-in"><thead><tr><th>Item</th><th class="num">Qty</th><th>Unit</th><th class="num">Cost</th></tr></thead><tbody>
        ${c.items.map(i => `<tr><td>${esc(i.name)}</td><td class="num">${Number(i.qty).toLocaleString("en-PH")}</td><td>${esc(i.unit)}</td><td class="num">${pe(i.cost)}</td></tr>`).join("")}</tbody></table></div></details>`).join("");
    const lab = sm.labor ? `<div class="table-wrap"><table class="pay-table bk-in"><thead><tr><th>Worker</th><th>Type</th><th class="num">Daily rate</th><th class="num">Workers</th><th class="num">Days</th><th class="num">Cost</th></tr></thead><tbody>
        ${sm.labor.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.tier)}</td><td class="num">${pe(r.rate)}</td><td class="num">${r.count}</td><td class="num">${r.days}</td><td class="num">${pe(r.cost)}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="5">Crew cost (daily rates)</td><td class="num">${pe(sm.labor.total)}</td></tr>${type === "pakyawan" ? `<tr><td colspan="5">Pakyawan price (fixed)</td><td class="num">${pe(m.labor)}</td></tr>` : ""}</tfoot></table></div>` : "";
    const prog = project.progress || 0, ahead = recPct - prog;
    const funding = hasP ? `<div class="bk-fund"><div class="prow"><span>Payments received</span><b>${Math.round(recPct * 10) / 10}% · ${pe(total * recPct / 100)}</b></div>
        <div class="pbar"><i style="width:${Math.min(100, recPct)}%"></i></div>
        <p class="note" style="margin-top:8px">${sentPct ? `Another ${Math.round(sentPct * 10) / 10}% (${pe(total * sentPct / 100)}) was sent and is waiting to be confirmed. ` : ""}Work is ${prog}% done. ${ahead > 5 ? "Payments are ahead of the work." : ahead < -5 ? "The work is ahead of the payments received." : "Payments and work are about level."}</p></div>`
      : `<p class="note">No payment schedule yet. Set one in the Payments tab to see how much of each cost the payments received so far cover.</p>`;
    el.innerHTML = `<section class="plate"><h3>Cost breakdown</h3>
      <p class="note" style="margin-bottom:12px">Where the estimated ${pe(total)} goes${hasP ? ", and how much of each part the payments received so far cover. The covered amounts are proportional (every line gets the same share), because actual spending isn't recorded." : "."}</p>
      ${funding}
      <div class="table-wrap" style="margin-top:14px"><table class="pay-table"><thead><tr><th>Cost</th><th class="num">Estimate</th><th class="num">% of total</th>${hasP ? '<th class="num">Covered by payments</th>' : ""}</tr></thead><tbody>
        ${line(type === "pakyawan" ? "Materials (bought by the owner)" : "Materials", m.materials)}
        <tr><td colspan="${cols}" class="bk-wrap">${mats || '<span class="note">No material details saved.</span>'}</td></tr>
        ${line(type === "pakyawan" ? "Labor (pakyawan, fixed price)" : hideFee ? "Labor and contractor services" : "Labor", labor)}
        <tr><td colspan="${cols}" class="bk-wrap"><details class="bk-det"><summary><span>Crew and daily rates</span><b>${pe(sm.labor ? sm.labor.total : m.labor)}</b></summary>${lab}</details></td></tr>
        ${line("Permits, hauling & misc.", m.permits)}
        ${line("Contingency (5%)", m.contingency)}
        ${feeLine ? line("Contractor's fee (" + esc(m.feeLabel || "") + ")", feeLine) : ""}
      </tbody><tfoot><tr><td>Estimated total</td><td class="num">${pe(total)}</td><td class="num">100%</td>${hasP ? `<td class="num">${pe(cov(total))}</td>` : ""}</tr></tfoot></table></div>
    </section>`;
  }
  function paintProgress(p) {
    const st = BW.stageOf(p);
    $("pct").textContent = p + "%"; $("stageName").textContent = st.name;
    $("barFill").style.width = p + "%"; $("bar").setAttribute("aria-valuenow", p); $("bar").classList.toggle("done", p >= 100);
    $("stages").innerHTML = BW.STAGES.map(s => `<div class="${s === st ? "on" : p > s.from && s !== st ? "past" : ""}">${esc(s.name)}</div>`).join("");
    if (typeof paintExtras === "function" && $("hero")) paintExtras();
  }
  async function paintFeed() {
    let ups = []; try { ups = await BW.listUpdates(id); } catch (e) { fail("Couldn't load updates: " + (e.message || e)); }
    allUps = ups;
    $("feedMini").innerHTML = ups.length ? ups.slice(0, 3).map(u => `<li><span class="when">${when(u.created_at)}</span><span class="pct">${u.progress}%</span><p>${esc(u.message)}</p>${photosHTML(u)}<small>${esc(u.author_name || "Foreman")}</small></li>`).join("") : `<li style="border-left-color:transparent"><p class="note">No updates yet.</p></li>`;
    $("feed").innerHTML = ups.length ? ups.map(u => `<li><span class="when">${when(u.created_at)}</span><span class="pct">${u.progress}%</span>
      <p>${esc(u.message)}</p>${photosHTML(u)}<small>${esc(u.author_name || "Foreman")}</small></li>`).join("")
      : `<li style="border-left-color:transparent"><p class="note">${isPro ? "No updates yet. Post the first one on the right." : "No updates yet. Your foreman will post here as work moves along."}</p></li>`;
  }
  /* progress photos: signed links are fetched after the list is drawn */
  const photosHTML = u => Array.isArray(u.photos) && u.photos.length ? `<div class="ph-grid">${u.photos.map(p => `<img class="ph" alt="Progress photo" data-p="${esc(p)}" loading="lazy">`).join("")}</div>` : "";
  async function hydratePhotos() {
    for (const img of document.querySelectorAll("img.ph[data-p]:not([src])")) {
      const p = img.dataset.p;
      let url = p.startsWith("data:") ? p : null;
      if (!url) { try { url = await BW.referenceUrl(p); } catch (e) {} }
      if (url) img.src = url; else img.alt = "Photo not available";
    }
  }
  document.addEventListener("click", e => {
    const img = e.target.closest("img.ph"); if (!img || !img.src) return;
    const box = document.createElement("div"); box.className = "ph-light"; box.innerHTML = `<img alt="Progress photo"><button type="button" aria-label="Close">✕</button>`;
    box.querySelector("img").src = img.src; box.onclick = () => box.remove(); document.body.appendChild(box);
  });
  /* shrink a phone photo before uploading (max 1600 px, JPEG) */
  function shrink(file) {
    return new Promise((ok, no) => {
      const im = new Image(), u = URL.createObjectURL(file);
      im.onload = () => {
        const k = Math.min(1, 1600 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(b => (b ? ok(b) : no(new Error("Could not read that photo."))), "image/jpeg", 0.82);
      };
      im.onerror = () => { URL.revokeObjectURL(u); no(new Error("That file isn't a photo we can open.")); };
      im.src = u;
    });
  }
  function paintHead() {
    document.title = project.name + " · BuildWise";
    $("pName").textContent = project.name;
    $("pMeta").textContent = [project.location,
      project.client_email ? "Client: " + (project.client_name || BW.shownName(project.client_email)) : "No client linked yet",
      project.contractor_name ? "Foreman: " + project.contractor_name : "No contractor yet"].filter(Boolean).join(" · ");
    $("facts").innerHTML = `<div><small>ESTIMATE</small><b>${peso(project.plan_total)}</b></div><div><small>BUDGET</small><b>${peso(project.budget)}</b></div>
      <div><small>STARTED</small><b>${project.started_at ? day(project.started_at) : project.progress > 0 ? day(project.created_at) : "Not started yet"}</b></div>
      <div><small>LAST CHANGED</small><b>${project.updated_at ? day(project.updated_at) : day(project.created_at)}</b></div>`;
    $("tcrumb").textContent = project.name;
    const owner = BW.isOwner(user, project);
    $("planLink").textContent = owner ? (project.plan_data ? "Open house plan" : "Plan the house") : "View house plan";
    $("planLink").href = (owner ? "index.html?project=" : "plan.html?id=") + encodeURIComponent(id);
    $("planLink").hidden = !owner && !project.plan_data;
    const sp = $("sidePlan"); if (sp) { sp.href = $("planLink").href; sp.lastChild.textContent = owner ? "House plan" : "View house plan"; sp.hidden = $("planLink").hidden; }
  }

  /* tabs: Overview, Progress & timeline, Budget, House plan */
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const showTab = n => { tabs.forEach(t => { const on = t.dataset.tab === n; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; $("pane-" + t.dataset.tab).hidden = !on; }); if (n === "progress") $("barFill").style.width = project.progress + "%"; try { history.replaceState(null, "", "#" + n); } catch (e) {} };
  tabs.forEach(t => { t.addEventListener("click", () => showTab(t.dataset.tab)); t.addEventListener("keydown", e => { const i = tabs.indexOf(t); if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]; n.focus(); showTab(n.dataset.tab); } }); });
  document.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.goto)));
  $("page").hidden = false;
  paintHead(); paintProgress(project.progress); await paintFeed(); paintExtras(); hydratePhotos();
  showTab(tabs.some(t => "#" + t.dataset.tab === location.hash) ? location.hash.slice(1) : "overview");
  const canPost = BW.canPost(user, project);
  Pay.mount({ project, user, isPro, BW, canManage: canPost, canSend: !isPro, repaint: () => { paintHead(); paintBreakdown(); } });
  $("composer").hidden = !canPost; $("clientNote").hidden = canPost;
  $("clientNote").querySelector("p").textContent = project.contractor_name && !isPro
    ? "Your foreman posts progress here. You can read every update, but only the foreman can add or change them."
    : "Only the project's foreman can post progress updates here. You can read every update.";

  /* a client who owns the project can connect (or change) the contractor */
  if (!isPro && BW.isOwner(user, project)) {
    $("connect").hidden = false;
    $("connectNote").textContent = project.contractor_name
      ? "Connected to " + project.contractor_name + ". Pick someone else to change it."
      : "Not connected yet. Pick a contractor and they will see your saved plan and post progress updates. Without one, you track progress yourself.";
    let chosen = null;
    if (project.contractor_id) ContractorCard.show($("proCard2"), project.contractor_id);
    const input = $("pPro2"), list = $("proList2");
    let items = [], t = 0;
    const paint = q => { list.innerHTML = items.length ? items.map((c, i) => `<li role="option" data-i="${i}"><b>${esc(c.full_name || "Contractor")}</b><small>${esc(c.company || "No company name")}</small></li>`).join("") : `<li class="none">No match${q ? " for “" + esc(q) + "”" : ""}.</li>`; list.hidden = false; };
    const look = async () => { const q = input.value.trim(); try { items = await BW.searchContractors(q); } catch (e) { items = []; } paint(q); };
    input.addEventListener("input", () => { chosen = null; $("cGo").disabled = true; ContractorCard.show($("proCard2"), project.contractor_id || null); clearTimeout(t); t = setTimeout(look, 150); });
    input.addEventListener("focus", look);
    input.addEventListener("blur", () => setTimeout(() => { list.hidden = true; }, 150));
    list.addEventListener("mousedown", e => { const li = e.target.closest("[data-i]"); if (!li) return; e.preventDefault(); chosen = items[Number(li.dataset.i)]; input.value = chosen.full_name || ""; list.hidden = true; $("cGo").disabled = false; ContractorCard.show($("proCard2"), chosen.id); });
    if (project.contractor_name) $("cGo").textContent = "Change contractor";
    /* warn before swapping the contractor of a project that already has one */
    const confirmChange = (from, to) => new Promise(ok => {
      const box = document.createElement("div"); box.className = "cf-back";
      box.innerHTML = `<div class="cf-card" role="alertdialog" aria-modal="true" aria-label="Change contractor?"><h3>Change contractor?</h3>
        <p><b>${esc(from)}</b> is your contractor now. If you switch to <b>${esc(to)}</b>:</p>
        <ul><li>${esc(from)} will be disconnected from this project.</li><li>${esc(from)} can't post progress updates anymore.</li><li>Past updates and photos stay on the project.</li></ul>
        <div class="cf-btns"><button type="button" class="cf-keep">Keep ${esc(from)}</button><button type="button" class="cf-go">Yes, change</button></div></div>`;
      const done = v => { box.remove(); ok(v); };
      box.querySelector(".cf-keep").onclick = () => done(false); box.querySelector(".cf-go").onclick = () => done(true);
      box.addEventListener("mousedown", e => { if (e.target === box) done(false); });
      document.body.appendChild(box); box.querySelector(".cf-keep").focus();
    });
    $("cGo").onclick = async () => {
      if (!chosen) return; $("cErr").hidden = true;
      if (project.contractor_id && chosen.id === project.contractor_id) { $("cErr").textContent = chosen.full_name + " is already your contractor."; $("cErr").hidden = false; return; }
      if (project.contractor_name && !(await confirmChange(project.contractor_name, chosen.full_name || "this contractor"))) return;
      $("cGo").disabled = true;
      try { await BW.connectContractor(id, chosen); project.contractor_id = chosen.id; project.contractor_name = chosen.full_name; location.reload(); }
      catch (e) { $("cErr").textContent = e.message || String(e); $("cErr").hidden = false; $("cGo").disabled = false; }
    };
  }

  if (canPost) {
    const r = $("upRange"), o = $("upOut");
    r.value = project.progress; o.textContent = project.progress + "%";
    r.oninput = () => { o.textContent = r.value + "%"; };
    /* photos picked for this update */
    let pics = [];
    const drawPics = () => {
      $("upThumbs").innerHTML = pics.map((p, i) => `<span class="ph-t"><img alt="" src="${p.url}"><button type="button" data-rm="${i}" aria-label="Remove photo">✕</button></span>`).join("");
      $("upAddLbl").hidden = pics.length >= 4;
    };
    $("upFile").addEventListener("change", async e => {
      $("upErr").hidden = true;
      for (const f of [...e.target.files].slice(0, 4 - pics.length)) {
        try { const b = await shrink(f); pics.push({ blob: b, url: URL.createObjectURL(b) }); }
        catch (err) { $("upErr").textContent = err.message || String(err); $("upErr").hidden = false; }
      }
      e.target.value = ""; drawPics();
    });
    $("upThumbs").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (!b) return; const [x] = pics.splice(Number(b.dataset.rm), 1); URL.revokeObjectURL(x.url); drawPics(); });
    $("upForm").addEventListener("submit", async e => {
      e.preventDefault();
      const message = $("upMsg").value.trim(); if (!message) return;
      $("upGo").disabled = true; $("upErr").hidden = true; $("upGo").textContent = pics.length ? "Uploading photos…" : "Posting…";
      try {
        const photos = [];
        for (const p of pics) photos.push(await BW.uploadUpdatePhoto(id, p.blob));
        await BW.addUpdate(user, id, { message, progress: Number(r.value), photos });
        project.progress = Number(r.value);
        pics.forEach(p => URL.revokeObjectURL(p.url)); pics = []; drawPics();
        $("upMsg").value = ""; paintProgress(project.progress); paintHead(); await paintFeed(); hydratePhotos(); Pay.refresh();
      } catch (err) { $("upErr").textContent = "Couldn't post: " + (err.message || err); $("upErr").hidden = false; }
      $("upGo").textContent = "Post update";
      $("upGo").disabled = false;
    });
  }
})();
