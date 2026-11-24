(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ago = iso => { const d = (Date.now() - new Date(iso)) / 86400000; return d < 1 ? "today" : d < 2 ? "yesterday" : Math.floor(d) + " days ago"; };
  const peso = n => n ? "₱" + Math.round(n).toLocaleString("en-PH") : "—";
  const pesoShort = n => !n ? "—" : n >= 1e6 ? "₱" + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, "") + "M" : "₱" + Math.round(n).toLocaleString("en-PH");
  const hash = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  /* an illustrated cover for each project: a house that is built up as the progress grows (decorative, not a photo) */
  const cover = p => {
    const k = hash(p.id), pr = p.progress || 0, tints = [["#dff0ec", "#b7dcd3"], ["#e8eef2", "#c5d5de"], ["#f6ecdc", "#ecd3a8"], ["#e5efe0", "#c3dbb8"]][k % 4];
    const wall = ["#fbfaf6", "#f3efe6", "#e9f1f3", "#f6ede4"][k % 4], roof = ["#147D70", "#102A35", "#c2703a", "#4e6b7a"][(k >> 3) % 4];
    return `<svg viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="320" height="170" fill="${tints[0]}"/><circle cx="${40 + (k % 60)}" cy="38" r="15" fill="#F2A541" opacity=".85"/><path d="M0 128 Q80 112 160 126 T320 120 V170 H0z" fill="${tints[1]}"/><rect y="132" width="320" height="38" fill="#cfd8d2"/>
      <rect x="86" y="${pr < 15 ? 128 : 126}" width="148" height="6" fill="#9aa6a0"/>
      ${pr >= 15 ? `<rect x="96" y="${pr >= 35 ? 78 : 104}" width="128" height="${pr >= 35 ? 48 : 22}" fill="${pr >= 35 ? wall : "#cfc7b6"}" stroke="#a79f8e" stroke-width="1.5"/>` : `<path d="M96 126h128" stroke="#8a948e" stroke-width="3" stroke-dasharray="6 5"/>`}
      ${pr >= 60 ? `<path d="M86 80 160 38 234 80z" fill="${roof}"/>` : pr >= 35 ? `<path d="M96 78 160 44 224 78" fill="none" stroke="#a37a4a" stroke-width="3"/>` : ""}
      ${pr >= 75 ? `<rect x="112" y="92" width="26" height="20" rx="2" fill="#9fd0e0"/><rect x="182" y="92" width="26" height="20" rx="2" fill="#9fd0e0"/><rect x="148" y="98" width="24" height="28" rx="2" fill="#8a6a46"/>` : ""}
      ${pr >= 95 ? `<path d="M232 126V96" stroke="#555" stroke-width="2"/><path d="M232 96h20l-5 6 5 6h-20z" fill="#F2A541"/>` : ""}
      ${pr < 60 ? `<path d="M246 130V70M246 70h22M258 70V96" stroke="#e0a01f" stroke-width="3" fill="none"/>` : ""}</svg>`;
  };
  const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;

  const user = await BW.me();
  const isPro = user.role === "contractor";
  $("who").textContent = user.name;
  $("whoMail").textContent = BW.shownName(user.email);
  $("roleTag").textContent = isPro ? BW.proLabel(user) : "CLIENT";
  $("roleTag").classList.toggle("client", !isPro);
  $("out").onclick = BW.signOut;
  $("previewBanner").hidden = !user.preview;
  const first = (user.name || "").split(" ")[0] || "there";
  const DAY = 86400000;
  const chev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  let projects = [], last = {}, flt = "all", qs = "", sortBy = "new", loaded = false;
  const lastTime = p => new Date(last[p.id] ? last[p.id].created_at : p.created_at).getTime();
  const whoOf = p => isPro ? (p.client_email ? "Client: " + (p.client_name || BW.shownName(p.client_email)) : "No client linked yet") : (p.contractor_name ? "Foreman: " + p.contractor_name : "No contractor yet");
  const emptyHTML = () => `<div class="plate empty" style="grid-column:1/-1"><h2>No projects yet</h2>
    <p>${isPro ? "Add your first project, plan the house, and your client can follow the progress here." : "Planning a house? Start a project, work out the lot, rooms and costs yourself, then connect a contractor when you're ready. A project your foreman added for you will also show up here."}</p>
    <button class="go" id="emptyNew">+ New project</button></div>`;
  const wireEmpty = () => { const b = $("emptyNew"); if (b) b.onclick = openNew; };

  const card = p => {
    const st = BW.stageOf(p.progress), u = last[p.id], over = p.budget && p.plan_total && p.plan_total > p.budget;
    return `<a class="pcard" href="project.html?id=${encodeURIComponent(p.id)}" aria-label="Open ${esc(p.name)}">
      <div class="pc-cover">${cover(p)}<span class="pc-pill ${p.progress >= 100 ? "done" : ""}">${p.progress >= 100 ? "Completed" : BW.isStarted(p) ? esc(st.name) : "Not started"}</span></div>
      <div class="pc-body">
        <h2>${esc(p.name)}</h2>
        <div class="pc-meta"><span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>${esc(p.location || "No location yet")}</span><span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>${esc(whoOf(p))}</span></div>
        <div><div class="prow"><span>${BW.isStarted(p) ? esc(st.name) : "Not started yet"}</span><b>${p.progress}%</b></div>
        <div class="pbar ${p.progress >= 100 ? "done" : ""}" role="progressbar" aria-valuenow="${p.progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:0" data-w="${p.progress}"></i></div></div>
        <div class="pc-money"><div><small>Estimate</small><b>${peso(p.plan_total)}</b></div><div><small>Budget</small><b class="${over ? "over" : ""}">${peso(p.budget)}</b></div></div>
        <div class="last">${u ? esc(u.message.length > 100 ? u.message.slice(0, 100) + "…" : u.message) + `<br><small class="meta">Latest update · ${ago(u.created_at)}</small>` : '<span class="meta">No updates yet</span>'}</div>
        <span class="pc-open">View details <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
      </div></a>`;
  };
  const grow = root => requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll(".pbar i[data-w]").forEach(i => { i.style.width = i.dataset.w + "%"; })));
  const link = p => "project.html?id=" + encodeURIComponent(p.id);

  /* ---- Dashboard: overview, what needs attention, latest news. Everything is worked out from real project data. ---- */
  const started = p => BW.isStarted(p), pending = p => !started(p), running = p => started(p) && p.progress < 100;
  function paintDash() {
    if (!projects.length) { $("stats").hidden = true; $("vDash").querySelector(".dgrid").innerHTML = emptyHTML(); wireEmpty(); return; }
    const done = projects.filter(p => p.progress >= 100).length, notStarted = projects.filter(pending).length, going = projects.filter(running).length, est = projects.reduce((n, p) => n + (p.plan_total || 0), 0);
    $("stats").hidden = false;
    $("stats").innerHTML = [["Total projects", projects.length, "folder"], ["Not started", notStarted, "folder"], ["Ongoing", going, "hammer"], ["Completed", done, "check"], ["Total estimated cost", pesoShort(est), "peso"]]
      .map(([l, v, ic]) => `<div class="stat"><span class="sico ${ic}" aria-hidden="true"></span><div><small>${l}</small><b>${v}</b></div></div>`).join("");

    const items = [];
    projects.forEach(p => {
      if (p.progress >= 100) return;
      const days = Math.floor((Date.now() - lastTime(p)) / DAY);
      if (p.budget && p.plan_total && p.plan_total > p.budget) items.push({ s: 0, p, t: `estimate is <b>${peso(p.plan_total - p.budget)}</b> over the budget` });
      if (started(p) && days >= 7) items.push({ s: 1, p, t: last[p.id] ? `no update for <b>${days} days</b>` : `no updates posted in <b>${days} days</b>` });
      if (isPro ? !p.client_email : !p.contractor_name) items.push({ s: 2, p, t: isPro ? "no client linked yet" : "no contractor connected yet" });
      if (!p.plan_total) items.push({ s: 2, p, t: "no house plan saved yet" });
    });
    items.sort((a, b) => a.s - b.s);
    const sev = ["red", "amber", "blue"], shown = items.slice(0, 6);
    $("attnList").innerHTML = shown.length
      ? shown.map(i => `<li><a href="${link(i.p)}"><span class="sev ${sev[i.s]}" aria-hidden="true"></span><span class="at"><b>${esc(i.p.name)}</b> · ${i.t}</span>${chev}</a></li>`).join("") + (items.length > shown.length ? `<li class="more">+ ${items.length - shown.length} more in My projects</li>` : "")
      : `<li class="clear"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>All clear. Nothing needs attention right now.</li>`;

    const rows = [{ n: "Not started", c: notStarted }].concat(BW.STAGES.map(s => ({ n: s.name, c: projects.filter(p => running(p) && BW.stageOf(p.progress) === s).length })));
    rows.push({ n: "Completed", c: done, d: 1 });
    const mx = Math.max(1, ...rows.map(r => r.c));
    $("stageBars").innerHTML = rows.map(r => `<div class="sb ${r.c ? "" : "zero"}"><span>${esc(r.n)}</span><div class="sbar"><i class="${r.d ? "done" : ""}" style="width:${r.c / mx * 100}%"></i></div><b>${r.c}</b></div>`).join("");

    const byId = {}; projects.forEach(p => { byId[p.id] = p; });
    const ups = Object.keys(last).filter(k => byId[k]).map(k => ({ p: byId[k], u: last[k] })).sort((a, b) => b.u.created_at.localeCompare(a.u.created_at)).slice(0, 6);
    $("actList").innerHTML = ups.length ? ups.map(({ p, u }) => `<li><a href="${link(p)}"><span class="adot" aria-hidden="true"></span><div><div class="ah"><b>${esc(p.name)}</b><small>${ago(u.created_at)}</small></div><p>${esc(u.message.length > 140 ? u.message.slice(0, 140) + "…" : u.message)}</p></div></a></li>`).join("")
      : `<li class="clear">${isPro ? "No updates yet. Open a project and post the first one." : "No updates yet. Your foreman will post here as work moves along."}</li>`;
  }

  /* ---- My projects: the full list, with search / filter / sort ---- */
  function paintList() {
    const all = projects.length;
    if (!all) { $("lcount").textContent = ""; $("list").innerHTML = emptyHTML(); wireEmpty(); return; }
    const q = qs.trim().toLowerCase();
    let rows = projects.filter(p => (flt === "all" || (flt === "done" && p.progress >= 100) || (flt === "ongoing" && running(p)) || (flt === "pending" && pending(p))) &&
      (!q || [p.name, p.location, p.client_name, p.client_email && BW.shownName(p.client_email), p.contractor_name].some(x => x && String(x).toLowerCase().includes(q))));
    rows.sort(sortBy === "name" ? (a, b) => a.name.localeCompare(b.name) : sortBy === "progress" ? (a, b) => b.progress - a.progress : sortBy === "activity" ? (a, b) => lastTime(b) - lastTime(a) : (a, b) => b.created_at.localeCompare(a.created_at));
    $("lcount").textContent = rows.length === all ? all + (all === 1 ? " project" : " projects") : "Showing " + rows.length + " of " + all;
    $("list").innerHTML = rows.length ? rows.map(card).join("") : `<div class="plate empty" style="grid-column:1/-1"><h2>No match</h2><p>No project fits that search. Try another word or switch the filter to All.</p></div>`;
    grow($("list"));
  }

  function setView() {
    const list = location.hash === "#list";
    $("vDash").hidden = list; $("vList").hidden = !list;
    document.querySelectorAll(".snav a").forEach(a => a.classList.toggle("on", (a.getAttribute("href") || "").endsWith("#list") === list));
    const role = isPro ? "FOREMAN" : "CLIENT";
    $("crumb").textContent = role + (list ? " · PROJECTS" : " · OVERVIEW");
    $("title").textContent = list ? (isPro ? "My projects" : "My houses") : "Welcome back, " + first;
    $("sub").textContent = list ? (loaded && projects.length ? (isPro ? "Search, filter and open any project." : "Open a house to follow the progress or view your plan.") : "") : (isPro ? "Here is where your projects stand today." : "Here is how your houses are coming along.");
    $("tcrumb").textContent = list ? "My projects" : "Dashboard";
    document.title = (list ? "My projects" : "Dashboard") + " · BuildWise";
    if (list) paintList();
  }
  window.addEventListener("hashchange", setView);
  $("q").addEventListener("input", e => { qs = e.target.value; paintList(); });
  $("sortBy").addEventListener("change", e => { sortBy = e.target.value; paintList(); });
  document.querySelectorAll(".seg").forEach(b => b.addEventListener("click", () => {
    flt = b.dataset.f; document.querySelectorAll(".seg").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); }); paintList();
  }));

  async function render() {
    setView();
    try {
      [projects, last] = await Promise.all([BW.listProjects(), BW.lastUpdates()]);
      loaded = true; paintDash(); setView();
    } catch (e) { $("err").textContent = "Couldn't load projects: " + (e.message || e) + ". If this is new, run supabase-projects.sql first."; $("err").hidden = false; }
  }

  /* type-ahead picker: type "J" and every match shows; keep typing to narrow the list */
  function makePicker(input, list, search, row, onPick) {
    let items = [], active = -1, timer = 0, seq = 0;
    const mark = (text, q) => { const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1; return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length)); };
    const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; input.removeAttribute("aria-activedescendant"); };
    const paint = q => {
      list.innerHTML = items.length ? items.map((c, i) => { const r = row(c); return `<li role="option" id="${list.id}${i}" data-i="${i}" aria-selected="${i === active}" class="${i === active ? "on" : ""}"><b>${mark(r[0], q)}</b><small>${mark(r[1], q)}</small></li>`; }).join("")
        : `<li class="none" role="presentation">${q ? "No match for “" + esc(q) + "”." : "Nobody has signed up yet."}</li>`;
      list.hidden = false; input.setAttribute("aria-expanded", "true");
      if (active >= 0) input.setAttribute("aria-activedescendant", list.id + active);
    };
    const look = async () => {
      const q = input.value.trim(), mine = ++seq;
      try { const r = await search(q); if (mine !== seq) return; items = r; active = -1; paint(q); }
      catch (e) { if (mine !== seq) return; items = []; list.innerHTML = `<li class="none" role="presentation">Couldn't search — run the latest SQL files in Supabase. You can still continue without it.</li>`; list.hidden = false; }
    };
    const pick = c => { input.value = row(c)[0]; close(); onPick(c); };
    input.addEventListener("input", () => { onPick(null); clearTimeout(timer); timer = setTimeout(look, 150); });
    input.addEventListener("focus", look);
    input.addEventListener("blur", () => setTimeout(close, 150));
    input.addEventListener("keydown", e => {
      if (list.hidden || !items.length) { if (e.key === "ArrowDown") look(); return; }
      if (e.key === "ArrowDown") { active = (active + 1) % items.length; paint(input.value.trim()); e.preventDefault(); }
      else if (e.key === "ArrowUp") { active = (active - 1 + items.length) % items.length; paint(input.value.trim()); e.preventDefault(); }
      else if (e.key === "Enter" && active >= 0) { pick(items[active]); e.preventDefault(); }
      else if (e.key === "Escape") { close(); e.stopPropagation(); e.preventDefault(); }
    });
    list.addEventListener("mousedown", e => { const li = e.target.closest("[data-i]"); if (li) { e.preventDefault(); pick(items[Number(li.dataset.i)]); } });
  }
  let chosenPro = null;
  makePicker($("pClient"), $("clientList"), BW.searchClients, c => [c.full_name || BW.shownName(c.email), BW.shownName(c.email)], c => { if (c) $("pClient").value = BW.shownName(c.email); });
  makePicker($("pPro"), $("proList"), BW.searchContractors, c => [c.full_name || "Contractor", c.company || "No company name"], c => { chosenPro = c; ContractorCard.show($("proCard"), c && c.id); });
  window.__bwPicker = { get pro() { return chosenPro; } };

  /* new project */
  const dlg = $("dlg");
  function openNew() {
    $("newForm").reset(); chosenPro = null; ContractorCard.show($("proCard"), null); $("dErr").hidden = true;
    $("clientBlock").hidden = !isPro; $("proBlock").hidden = isPro;
    $("dNote").textContent = isPro
      ? "Pick a client from the list. They see this project and every update you post when they sign in. Not listed yet? Type the login they will use and it links once they sign up."
      : "You can plan the house yourself first. Connect a contractor now or later from the project page, and they will see your plan and post progress updates.";
    $("dGo").textContent = "Create and plan";
    dlg.showModal(); $("pName").focus();
  }
  $("newBtn").onclick = openNew;
  $("dCancel").onclick = () => dlg.close();
  $("newForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("pName").value.trim(); if (!name) return;
    $("dGo").disabled = true; $("dErr").hidden = true;
    try {
      if (!isPro && $("pPro").value.trim() && !chosenPro) throw new Error("Pick the contractor from the list, or clear the box to connect one later.");
      const p = await BW.createProject(user, { name, location: $("pLoc").value.trim(), client: $("pClient").value, contractor: chosenPro });
      location.href = "index.html?new=1&project=" + encodeURIComponent(p.id);
    } catch (err) { $("dErr").textContent = err.message || String(err); $("dErr").hidden = false; $("dGo").disabled = false; }
  });
  render();
  if (location.hash === "#new") { history.replaceState(null, "", location.pathname); openNew(); }
})();
