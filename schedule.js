/* Weekly build plan: turns the crew, the labor days and the budget into a week-by-week schedule.
   Uses the globals from script.js (S, calc, peso, esc, openQuestion, renderResults). */
(function () {
  const PHASES = [
    { id: "site",   name: "Site preparation & layout",       share: 0.04, mat: 0,    lead: ["foreman"],                       help: 1, overlap: 0,
      tasks: ["Clear and level the lot", "Stake out the building lines", "Set up temporary water, power and storage"] },
    { id: "found",  name: "Foundation & footings",           share: 0.14, mat: 0.17, lead: ["mason", "steelman"],             help: 1, overlap: 0,
      tasks: ["Excavate the footings", "Tie rebar and set the forms", "Pour footings and ground slab"] },
    { id: "struct", name: "Columns, beams & floor slabs",    share: 0.18, mat: 0.24, lead: ["steelman", "carpenter", "mason"], help: 1, overlap: 0,
      tasks: ["Rebar and formwork for columns", "Pour columns and beams", "Cure, strip the forms, pour upper slab if any"] },
    { id: "walls",  name: "Walls & room dividers",           share: 0.17, mat: 0.2,  lead: ["mason"],                         help: 1, overlap: 0.1,
      tasks: ["Lay hollow blocks / frame the walls", "Install lintels and wall openings", "Plaster-ready walls and dividers"] },
    { id: "roof",   name: "Roof framing & roofing",          share: 0.11, mat: 0.14, lead: ["roofer", "carpenter"],           help: 1, overlap: 0.1,
      tasks: ["Erect trusses or roof frame", "Install purlins and roof sheets", "Flashing, ridge and gutters"] },
    { id: "rough",  name: "Electrical & plumbing rough-in",  share: 0.09, mat: 0.07, lead: ["electrician", "plumber"],        help: 0, overlap: 0.55,
      tasks: ["Conduits and pipes inside walls", "Boxes, water and drain lines", "Pressure test and inspection"] },
    { id: "open",   name: "Doors, windows & glass",          share: 0.06, mat: 0.06, lead: ["glazier", "carpenter"],          help: 0, overlap: 0.3,
      tasks: ["Install window frames", "Hang doors", "Glass, sealant and hardware"] },
    { id: "finish", name: "Plastering, tiles & painting",    share: 0.15, mat: 0.1,  lead: ["tiler", "painter", "mason"],     help: 1, overlap: 0.15,
      tasks: ["Plaster and skim coat", "Floor and wall tiles", "Primer and paint"] },
    { id: "out",    name: "Fence, garage & outdoor works",   share: 0.05, mat: 0.02, lead: ["mason", "roofer"],               help: 1, overlap: 0.8,
      tasks: ["Fence posts and footings", "Fence panels / wall and gate", "Garage floor, terrace and driveway"], optional: true },
    { id: "lotx",   name: "Other buildings & features on the lot", share: 0.1, mat: 0, lead: ["mason", "carpenter"], help: 1, overlap: 0.5, optional: true, lot: true,
      tasks: ["Set out and excavate", "Build the structure / pour the slab or pool shell", "Finishes and landscaping"] },
    { id: "fix",    name: "Fixtures, clean-up & turnover",   share: 0.06, mat: 0.0,  lead: ["electrician", "plumber"],        help: 1, overlap: 0.1,
      tasks: ["Light, switches and plumbing fixtures", "Final touch-ups and punch list", "Clean-up and hand-over"] }
  ];
  const REF = {};          // reference crew size per trade (the default crew)
  const refCrew = () => { if (!Object.keys(REF).length) defaultCrew().forEach(c => (REF[c.id] = c.count)); return REF; };

  const DAY = 86400000;
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const nextMonday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d; };
  const fmt = d => d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  const fmtS = d => d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const opts = () => {
    const o = S.sched || (S.sched = {});
    if (!o.start) o.start = iso(nextMonday());
    if (![5, 6, 7].includes(o.days)) o.days = 6;
    return o;
  };

  /* the schedule itself; `crew` is S.crew (or a what-if copy) */
  function build(c, crew, perWeek) {
    const ref = refCrew();
    const byId = {}; crew.forEach(x => (byId[x.id] = x));
    const count = id => (byId[id] ? Number(byId[id].count) || 0 : 0);
    const lotN = window.LotItems ? LotItems.count() : 0;
    const lotMat = (c.cats.find(x => /^Other buildings/.test(x.name)) || { total: 0 }).total, lotF = c.matTotal > 0 ? lotMat / c.matTotal : 0;
    const dur0 = Math.max(10, c.labor.duration);
    let phases = PHASES.filter(p => (p.lot ? lotN > 0 : (!p.optional || S.fence || S.garage || S.terrace)));
    const fixedMat = phases.filter(p => !p.lot).reduce((a, p) => a + p.mat, 0) || 1;
    phases = phases.map(p => (p.lot ? { ...p, share: Math.min(0.35, Math.max(0.03, LotItems.days(S) / dur0)), mat: lotF } : { ...p, mat: p.mat / fixedMat * (1 - lotF) }));
    const totalShare = phases.reduce((a, p) => a + p.share, 0);
    const dur = Math.max(10, c.labor.duration);

    /* speed of a phase = how the crew you have compares with the reference crew */
    const info = phases.map(p => {
      const ratios = p.lead.filter(id => ref[id]).map(id => (count(id) === 0 ? 0 : count(id) / ref[id]));
      const missing = p.lead.filter(id => ref[id] && count(id) === 0);
      let spd = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
      if (p.help) spd = spd * 0.7 + 0.3 * (count("helper") / ref.helper);
      const noLead = missing.length > 0 && missing.length === p.lead.filter(id => ref[id]).length;
      spd = noLead ? 0.2 : Math.min(2.5, Math.max(0.34, spd));
      return { p, spd, missing };
    });

    /* lay the phases out so that the reference crew finishes exactly in the labor duration */
    const lay = (scale) => {
      let start = 0, prevLen = 0, end = 0;
      return info.map(({ p, spd, missing }) => {
        const len = Math.max(1, Math.ceil(dur * (p.share / totalShare) * scale / spd));
        start = start === 0 && prevLen === 0 ? 0 : Math.max(0, start + prevLen - Math.round(prevLen * p.overlap));
        const o = { p, spd, missing, start, len, end: start + len };
        prevLen = len; start = o.start; end = Math.max(end, o.end);
        return Object.assign(o, { _end: end });
      });
    };
    /* find the scale that makes the reference (speed 1) timeline equal `dur` */
    const refLen = (scale) => { let s = 0, pl = 0, e = 0; info.forEach(({ p }, i) => { const len = Math.max(1, Math.ceil(dur * (p.share / totalShare) * scale)); s = i === 0 ? 0 : Math.max(0, s + pl - Math.round(pl * p.overlap)); pl = len; e = Math.max(e, s + len); }); return e; };
    let k = 1; for (let i = 0; i < 30; i++) { const L = refLen(k); k *= dur / L; }
    const rows = lay(k);
    const totalDays = rows.reduce((a, r) => Math.max(a, r.end), 0);

    /* day-by-day crew, labor and materials */
    const supportIds = crew.filter(x => !PHASES.some(p => p.lead.includes(x.id)) && x.id !== "helper" && x.id !== "foreman").map(x => x.id);
    const day = Array.from({ length: totalDays }, () => ({ trades: new Set(), mat: 0 }));
    rows.forEach(r => {
      const ids = [...r.p.lead, ...(r.p.help ? ["helper"] : [])];
      const matShare = phases.reduce((a, p) => a + p.mat, 0);
      for (let d = r.start; d < r.end; d++) {
        ids.forEach(id => day[d].trades.add(id));
        day[d].mat += (c.matTotal * (r.p.mat / matShare)) / r.len;
      }
    });
    day.forEach(d => { d.trades.add("foreman"); supportIds.forEach(id => d.trades.add(id)); });
    let rawLabor = 0;
    day.forEach(d => { d.raw = 0; d.crew = 0; d.trades.forEach(id => { const x = byId[id]; if (x) { d.raw += (Number(x.count) || 0) * (Number(x.rate) || 0); d.crew += Number(x.count) || 0; } }); rawLabor += d.raw; });
    /* the labor total is fixed by the labor table, so spread exactly that amount in proportion */
    const labTotal = c.pay ? c.pay.labor : c.labor.total;
    const lf = rawLabor > 0 ? labTotal / rawLabor : 0;
    const base = c.matTotal + labTotal;
    day.forEach(d => { d.labor = d.raw * lf; d.cont = (d.mat + d.labor) * (c.contingency / (base || 1)); });

    const wd = perWeek;
    const weeks = [];
    for (let w = 0; w * wd < totalDays; w++) {
      const a = w * wd, b = Math.min(totalDays, a + wd), ds = day.slice(a, b);
      const act = rows.filter(r => r.start < b && r.end > a);
      const peak = Math.max(...ds.map(d => d.crew));
      const labor = ds.reduce((x, d) => x + d.labor, 0), mat = ds.reduce((x, d) => x + d.mat, 0) + (w === 0 ? 0 : 0);
      const cont = ds.reduce((x, d) => x + d.cont, 0);
      const permits = w === 0 ? c.permits : 0;
      weeks.push({ n: w + 1, a, b, act, peak, labor, mat, cont, permits, cash: labor + mat + cont + permits });
    }
    if (c.pay && c.pay.fee > 0) { const sm = weeks.reduce((x, w) => x + w.labor + w.mat, 0) || 1; weeks.forEach(w => { w.cash += c.pay.fee * (w.labor + w.mat) / sm; }); }
    let cum = 0; weeks.forEach(w => { cum += w.cash; w.cum = cum; w.pct = Math.round(w.b / totalDays * 100); });
    return { rows, weeks, totalDays, k, info, total: cum };
  }

  function taskFor(r, w) {
    const mid = (Math.max(r.start, w.a) + Math.min(r.end, w.b)) / 2;
    const prog = (mid - r.start) / r.len;
    return r.p.tasks[Math.min(2, Math.floor(prog * 3))];
  }

  function html(c) {
    const o = opts(), wd = o.days, crew = S.crew;
    const sc = build(c, crew, wd);
    const start = new Date(o.start + "T00:00:00");
    const wkDate = n => new Date(start.getTime() + n * 7 * DAY);
    const nW = sc.weeks.length;
    const finish = new Date(wkDate(nW - 1).getTime() + (Math.ceil(((sc.totalDays - (nW - 1) * wd) / wd) * 7) - 1) * DAY);
    const budget = S.budget, over = sc.total > budget;
    const runOut = sc.weeks.find(w => w.cum > budget);
    const peakCash = sc.weeks.reduce((a, w) => (w.cash - w.permits > a.cash - a.permits ? w : a), sc.weeks[0]);
    const peakCrew = Math.max(...sc.weeks.map(w => w.peak));
    const missing = [...new Set(sc.info.flatMap(i => i.missing))];
    const nm = id => ((crew.find(x => x.id === id) || {}).name || id).replace(/ \(.*\)/, "");

    /* what-if: more manpower */
    const trial = (label, fn, extra) => {
      const cr = crew.map(x => ({ ...x })); fn(cr);
      const t = build(c, cr, wd);
      const daily = cr.reduce((a, x, i) => a + (x.count - crew[i].count) * x.rate, 0);
      return { label, weeks: t.weeks.length, saved: nW - t.weeks.length, daily };
    };
    const bump = (cr, id, n) => { const x = cr.find(y => y.id === id); if (x) x.count += n; };
    const what = [
      trial("Add 1 mason", cr => bump(cr, "mason", 1)),
      trial("Add 2 helpers", cr => bump(cr, "helper", 2)),
      trial("Add 1 mason, 1 carpenter and 2 helpers", cr => { bump(cr, "mason", 1); bump(cr, "carpenter", 1); bump(cr, "helper", 2); }),
      trial("Double every crew", cr => cr.forEach(x => { if (x.id !== "foreman") x.count *= 2; }))
    ];

    /* gantt */
    const cw = nW > 30 ? 20 : nW > 18 ? 28 : 38;
    const gantt = `<div class="sch-gantt" style="--cw:${cw}px;--nw:${nW}">
      <div class="sch-g-head"><span></span><div class="sch-g-cols">${sc.weeks.map(w => `<i>${w.n}</i>`).join("")}</div></div>
      ${sc.rows.map(r => {
        const l = r.start / wd, wdt = Math.max(0.3, r.len / wd);
        return `<div class="sch-g-row"><span title="${esc(r.p.name)}">${esc(r.p.name)}${r.missing.length ? ` <b class="sch-miss" title="No ${esc(r.missing.map(nm).join(", "))} in your crew, so this stage is much slower">!</b>` : ""}</span>
        <div class="sch-g-track"><u style="left:calc(${l} * var(--cw));width:calc(${wdt} * var(--cw))" title="Weeks ${Math.floor(l) + 1}–${Math.ceil(l + wdt)}"></u></div></div>`;
      }).join("")}
      ${runOut ? `<div class="sch-g-flag" style="left:calc(190px + ${(runOut.n - 1)} * var(--cw))" title="Budget runs out in week ${runOut.n}"></div>` : ""}
    </div>`;

    const weekRows = sc.weeks.map(w => {
      const d0 = wkDate(w.n - 1), d1 = new Date(d0.getTime() + (wd - 1) * DAY);
      const tasks = w.act.map(r => `<li><b>${esc(r.p.name.split(" & ")[0].split(",")[0])}:</b> ${esc(taskFor(r, w))}</li>`).join("");
      const bad = w.cum > budget;
      return `<tr class="${bad ? "sch-over" : ""}">
        <td><strong>Week ${w.n}</strong><small>${fmtS(d0)} – ${fmtS(d1)}</small></td>
        <td><ul class="sch-tasks">${tasks}</ul></td>
        <td class="num">${w.peak}</td>
        <td class="num">${peso(w.cash)}</td>
        <td class="num"><span class="sch-cum">${peso(w.cum)}</span><div class="sch-bar"><div style="width:${Math.min(100, w.cum / budget * 100)}%" class="${bad ? "bad" : ""}"></div></div></td>
      </tr>`;
    }).join("");

    let verdict;
    if (missing.length) verdict = `<div class="sch-note warn">Your crew has no <strong>${esc(missing.map(nm).join(", "))}</strong>, so those stages are shown as very slow. <a href="#" onclick="openQuestion(LABOR_STEP);return false">Edit crew</a></div>`;
    else if (over) verdict = `<div class="sch-note warn">At this pace the money runs out in <strong>week ${runOut.n}</strong> (${runOut.pct}% of the work). The full job needs about ${peso(sc.total)} against your ${peso(budget)} budget, so you would be short by ${peso(sc.total - budget)}. Phase the work or trim the design in the Budget advisor.</div>`;
    else verdict = `<div class="sch-note ok">The full job fits your budget. Spending averages ${peso(sc.total / nW)} a week and peaks at ${peso(peakCash.cash - peakCash.permits)} in week ${peakCash.n}. Permits and fees of about ${peso(c.permits)} are due in week 1.</div>`;

    return `<div class="section-title"><div><h2>Weekly build plan</h2><p>What happens each week, how long it takes with your crew, and when the money goes out.</p></div>
      <button class="outline-btn" onclick="openQuestion(LABOR_STEP)">Edit crew</button></div>
    <div class="card sch">
      <div class="stats-grid sch-stats">
        <div class="stat-card"><small>Build time</small><strong>${nW} weeks</strong></div>
        <div class="stat-card"><small>Estimated finish</small><strong>${fmt(finish)}</strong></div>
        <div class="stat-card"><small>Most workers at once</small><strong>${peakCrew}</strong></div>
        <div class="stat-card ${over ? "bad" : "good"}"><small>Busiest week (week ${peakCash.n})</small><strong>${peso(peakCash.cash - peakCash.permits)}</strong></div>
      </div>
      <div class="sch-opts">
        <label>Start date <input type="date" value="${o.start}" onchange="schedSet('start',this.value)"></label>
        <label>Working days a week <select onchange="schedSet('days',+this.value)">${[5, 6, 7].map(n => `<option value="${n}" ${n === wd ? "selected" : ""}>${n} days${n === 6 ? " (Mon–Sat)" : n === 5 ? " (Mon–Fri)" : ""}</option>`).join("")}</select></label>
      </div>
      ${verdict}
      <h3 class="sch-h">Timeline</h3>
      <div class="sch-scroll">${gantt}</div>
      <h3 class="sch-h">If you had more workers</h3>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Change</th><th class="num">Build time</th><th class="num">Faster by</th><th class="num">Extra pay per day</th></tr></thead>
        <tbody>${what.map(x => `<tr><td>${x.label}</td><td class="num">${x.weeks} weeks</td><td class="num">${x.saved > 0 ? x.saved + " week" + (x.saved > 1 ? "s" : "") : "–"}</td><td class="num">${peso(x.daily)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="sch-fine">More workers shorten the schedule, but the labor cost mostly stays the same because the work is shared out. Stages that wait for concrete to cure, such as slabs, can't be rushed.</p>
      <details class="sch-weeks"><summary>Week-by-week tasks and cash</summary>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Week</th><th>Main tasks</th><th class="num">Workers</th><th class="num">Spend</th><th class="num">Total so far</th></tr></thead>
          <tbody>${weekRows}</tbody>
        </table></div>
      </details>
      <p class="sch-fine">This is a planning guide, not a contract. Real schedules shift with weather, material delivery and inspections. Permits are counted in week 1 and contingency is spread across the weeks.</p>
    </div>`;
  }

  window.Sched = { html, build };
  window.schedSet = (k, v) => { const o = opts(); if (k === "start" && !v) return; o[k] = v; if (typeof renderResults === "function") renderResults(); };
})();