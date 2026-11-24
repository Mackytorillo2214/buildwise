/* Payments tab + "Start project" for a project (project.html).
   Foreman / contractor: pick a payment plan, edit the percentages, start the project, confirm money received.
   Client: sees the schedule and marks "I've sent this". Needs two columns on projects: started_at (timestamptz) and payments (jsonb). */
window.Pay = (function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const peso = n => "₱" + Math.round(n || 0).toLocaleString("en-PH");
  const day = iso => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

  /* when a payment falls due, as the project's overall progress */
  const POINTS = [[0, "Before work starts"], [35, "When the foundation is done"], [60, "When walls & framing are done"], [75, "When the roof is done"], [95, "When finishing is done"], [100, "After turnover and client check"]];
  const whenOf = at => (POINTS.find(p => p[0] === at) || [at, "At " + at + "% progress"])[1];
  const row = (label, pct, at, when) => ({ label, pct, at, when: when || whenOf(at), status: "open" });

  const PLANS = [
    { id: "milestone", name: "Down payment + milestones", tag: "Most common",
      text: "The client pays about 30–50% to start, so the contractor can buy the first materials and pay the crew. The rest is paid as each stage is finished, with a small last payment after turnover and a final check.",
      rows: () => [row("Down payment", 30, 0), row("Foundation done", 15, 35), row("Walls & framing done", 20, 60), row("Roofing done", 15, 75), row("Finishing done", 15, 95), row("Final payment", 5, 100)] },
    { id: "half", name: "Half down", tag: "Small jobs",
      text: "50% to start, 30% when walls and framing are done, and 20% at turnover. Suits small jobs, or contractors who must buy most of the materials first. The client carries more risk.",
      rows: () => [row("Down payment", 50, 0), row("Walls & framing done", 30, 60), row("Final payment", 20, 100)] },
    { id: "monthly", name: "Pay as you go (monthly)", tag: "Long jobs",
      text: "Equal payments, one each month while the work goes on, with the first one at the start. Good for long jobs and for daily-paid crews (arawan), because the money arrives as the work happens.",
      rows: ctx => { const d = ctx.project.plan_data && ctx.project.plan_data.summary && ctx.project.plan_data.summary.labor ? ctx.project.plan_data.summary.labor.days : 104, n = Math.min(12, Math.max(2, Math.ceil(d / 26))), base = Math.floor(100 / n), out = []; for (let i = 0; i < n; i++) { const at = Math.round(100 * i / n); out.push(row("Month " + (i + 1), i === n - 1 ? 100 - base * (n - 1) : base, at, i === 0 ? "Before work starts" : "When about " + at + "% is done")); } return out; } },
    { id: "full_start", name: "Whole price at the start", tag: "Risky for the client",
      text: "The full amount is paid before work begins. The contractor has all the money for materials and labor, but the client has nothing to hold back if work slows or stops. Only for people who trust each other, or very small jobs.",
      rows: () => [row("Full payment", 100, 0)] },
    { id: "full_end", name: "Whole price at the end", tag: "Risky for the contractor",
      text: "Everything is paid after turnover. The client keeps the money until the house is done, but the contractor must fund all materials and labor first. Rare, and only for small jobs.",
      rows: () => [row("Full payment", 100, 100)] },
    { id: "custom", name: "My own schedule", tag: "Flexible",
      text: "Make your own steps. Add or remove payments and set each percentage and when it is due.",
      rows: () => [row("Down payment", 30, 0), row("Final payment", 70, 100)] }
  ];

  let C = null, draft = null, editing = false;

  const total = () => Number(C.project.plan_total) || 0;
  const amt = pct => total() * (Number(pct) || 0) / 100;
  const startedAt = () => C.project.started_at || (C.project.progress > 0 ? C.project.created_at : null);
  const rowsOf = () => (C.project.payments && C.project.payments.rows) || [];
  const locked = () => rowsOf().some(r => r.status !== "open");

  async function save(patch, fail) {
    try { await C.BW.updateProject(C.project.id, patch); Object.assign(C.project, patch); if (C.repaint) C.repaint(); return true; }
    catch (e) {
      const m = (e && e.message) || String(e);
      fail(/column|schema cache/i.test(m) ? "The database needs two new columns first (started_at and payments). Run the SQL step, then try again." : "Couldn't save: " + m);
      return false;
    }
  }
  const say = (t) => { const el = $("payErr"); if (el) { el.textContent = t || ""; el.hidden = !t; } };

  /* ---------- Start project ---------- */
  function paintStart() {
    const s = startedAt(), btn = $("startBtn"), chip = $("startChip");
    if (chip) { chip.textContent = s ? "Started " + day(s) : "Planning"; chip.className = "st-chip " + (s ? "on" : ""); }
    if (btn) btn.hidden = !(C.canManage && !s);
  }
  function dialog(html) {
    return new Promise(ok => {
      const box = document.createElement("div"); box.className = "cf-back";
      box.innerHTML = `<div class="cf-card" role="alertdialog" aria-modal="true">${html}</div>`;
      const done = v => { box.remove(); ok(v); };
      box.querySelector("[data-no]").onclick = () => done(false); box.querySelector("[data-yes]").onclick = () => done(true);
      box.addEventListener("mousedown", e => { if (e.target === box) done(false); });
      document.body.appendChild(box); box.querySelector("[data-no]").focus();
    });
  }
  async function startProject() {
    const first = rowsOf()[0], noPlan = !rowsOf().length, noDown = first && first.at === 0 && first.status !== "received";
    const notes = [];
    if (noPlan) notes.push("No payment schedule is set yet. You can set one in the Payments tab.");
    else if (noDown) notes.push("The first payment (" + esc(first.label.toLowerCase()) + ") is not marked as received yet.");
    const ok = await dialog(`<h3>Start this project?</h3><p>Starting records today as the day work began and moves the project into site preparation. Usually you start after the contract is agreed and the first payment is in.</p>
      ${notes.length ? `<ul>${notes.map(n => `<li>${n}</li>`).join("")}</ul>` : ""}
      <div class="cf-btns"><button type="button" class="cf-keep" data-no>Not yet</button><button type="button" class="cf-go cf-ok" data-yes>Start project</button></div>`);
    if (!ok) return;
    $("startBtn").disabled = true;
    const done = await save({ started_at: new Date().toISOString() }, say);
    $("startBtn").disabled = false;
    if (done) { paintStart(); render(); C.repaint(); }
  }

  /* ---------- editor (foreman) ---------- */
  const draftTotal = () => draft.rows.reduce((a, r) => a + (Number(r.pct) || 0), 0);
  function pickPlan(id) {
    const p = PLANS.find(x => x.id === id);
    draft = { plan: id, rows: p.rows(C) };
    render();
  }
  function editorHTML() {
    const cur = PLANS.find(p => p.id === (draft && draft.plan));
    const cards = PLANS.map(p => `<button type="button" class="pay-plan ${draft && draft.plan === p.id ? "on" : ""}" data-plan="${p.id}" role="radio" aria-checked="${!!draft && draft.plan === p.id}">
        <span class="pp-top"><strong>${esc(p.name)}</strong><em>${esc(p.tag)}</em></span><span class="pp-text">${esc(p.text)}</span></button>`).join("");
    let table = "";
    if (draft) {
      const custom = draft.plan === "custom", sum = draftTotal(), ok = Math.abs(sum - 100) < 0.01;
      table = `<div class="table-wrap"><table class="data-table pay-table"><thead><tr><th>Payment</th><th>Due</th><th class="num">%</th><th class="num">Amount</th>${custom ? "<th></th>" : ""}</tr></thead><tbody>
        ${draft.rows.map((r, i) => `<tr data-i="${i}">
          <td>${custom ? `<input type="text" data-f="label" value="${esc(r.label)}" maxlength="40">` : `<strong>${esc(r.label)}</strong>`}</td>
          <td>${custom ? `<select data-f="at">${POINTS.map(p => `<option value="${p[0]}" ${p[0] === r.at ? "selected" : ""}>${esc(p[1])}</option>`).join("")}</select>` : esc(r.when)}</td>
          <td class="num"><input type="number" min="0" max="100" step="1" data-f="pct" value="${r.pct}"></td>
          <td class="num cost" data-amt>${total() ? peso(amt(r.pct)) : "—"}</td>
          ${custom ? `<td>${draft.rows.length > 1 ? `<button type="button" class="x" data-rm title="Remove">✕</button>` : ""}</td>` : ""}</tr>`).join("")}
        </tbody><tfoot><tr><td colspan="2">Total</td><td class="num" id="payTotPct" style="${ok ? "" : "color:#b42318"}">${Math.round(sum * 100) / 100}%</td><td class="num cost" id="payTotAmt">${total() ? peso(amt(sum)) : "—"}</td>${custom ? "<td></td>" : ""}</tr></tfoot></table></div>
        ${custom ? `<button type="button" class="outline-btn" id="payAdd" style="margin-top:10px">+ Add a payment</button>` : ""}
        <p class="hint" id="payHint">${ok ? (total() ? "Amounts use the project's estimated total of " + peso(total()) + "." : "Plan the house first to see peso amounts.") : "The percentages must add up to 100%."}</p>
        <div class="pay-actions"><button type="button" class="go" id="paySave" ${ok ? "" : "disabled"}>Save payment schedule</button>${editing ? `<button type="button" class="outline-btn" id="payCancel">Cancel</button>` : ""}</div>`;
    }
    return `<p class="note" style="margin-bottom:12px">Choose how the client will pay. Pick a plan to see what it means, then adjust the percentages if you agreed on something different.</p>
      <div class="pay-plans" role="radiogroup" aria-label="Payment plan">${cards}</div>${table}`;
  }
  function bindEditor() {
    const root = $("payRoot");
    root.querySelectorAll("[data-plan]").forEach(b => b.onclick = () => pickPlan(b.dataset.plan));
    const live = () => {
      const sum = draftTotal(), ok = Math.abs(sum - 100) < 0.01;
      root.querySelectorAll("tr[data-i]").forEach(tr => { const r = draft.rows[Number(tr.dataset.i)]; const c = tr.querySelector("[data-amt]"); if (c) c.textContent = total() ? peso(amt(r.pct)) : "—"; });
      $("payTotPct").textContent = Math.round(sum * 100) / 100 + "%"; $("payTotPct").style.color = ok ? "" : "#b42318";
      $("payTotAmt").textContent = total() ? peso(amt(sum)) : "—";
      $("paySave").disabled = !ok; $("payHint").textContent = ok ? (total() ? "Amounts use the project's estimated total of " + peso(total()) + "." : "Plan the house first to see peso amounts.") : "The percentages must add up to 100%.";
    };
    root.querySelectorAll("tr[data-i] [data-f]").forEach(el => el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      const r = draft.rows[Number(el.closest("tr").dataset.i)], f = el.dataset.f;
      if (f === "pct") r.pct = Math.max(0, Math.min(100, parseFloat(el.value) || 0));
      else if (f === "at") { r.at = Number(el.value); r.when = whenOf(r.at); }
      else r.label = el.value;
      live();
    }));
    root.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { draft.rows.splice(Number(b.closest("tr").dataset.i), 1); render(); });
    const add = $("payAdd"); if (add) add.onclick = () => { draft.rows.push(row("Payment " + (draft.rows.length + 1), 0, 60)); render(); };
    const cancel = $("payCancel"); if (cancel) cancel.onclick = () => { editing = false; draft = null; render(); };
    const sv = $("paySave"); if (sv) sv.onclick = async () => {
      sv.disabled = true; say("");
      const ordered = draft.rows.slice().sort((a, b) => a.at - b.at);
      const payments = { plan: draft.plan, rows: ordered.map(r => ({ label: String(r.label || "Payment").trim() || "Payment", pct: Number(r.pct) || 0, at: r.at, when: r.when, status: "open" })), savedAt: new Date().toISOString() };
      if (await save({ payments }, say)) { editing = false; draft = null; render(); }
      else sv.disabled = false;
    };
  }

  /* ---------- saved schedule (everyone) ---------- */
  function statusOf(r) {
    if (r.status === "received") return { k: "ok", t: "Received" + (r.receivedAt ? " · " + day(r.receivedAt) : "") };
    if (r.status === "sent") return { k: "wait", t: "Sent by client · waiting for the foreman to confirm" };
    if (C.project.progress >= r.at) return { k: "due", t: r.at === 0 ? "Due now" : "Due now (stage reached)" };
    return { k: "up", t: "Upcoming" };
  }
  function viewHTML() {
    const P = C.project.payments, rows = P.rows, plan = PLANS.find(p => p.id === P.plan) || PLANS[5];
    const paid = rows.filter(r => r.status === "received").reduce((a, r) => a + amt(r.pct), 0);
    const sent = rows.filter(r => r.status === "sent").reduce((a, r) => a + amt(r.pct), 0);
    const pctPaid = Math.round(rows.filter(r => r.status === "received").reduce((a, r) => a + r.pct, 0));
    const dueNow = rows.filter(r => r.status === "open" && C.project.progress >= r.at).reduce((a, r) => a + amt(r.pct), 0);
    const btns = (r, i) => {
      const out = [];
      if (r.status === "open" && C.canSend) out.push(`<button type="button" class="pay-b" data-act="sent" data-i="${i}">I've sent this</button>`);
      if (r.status !== "received" && C.canManage) out.push(`<button type="button" class="pay-b ok" data-act="received" data-i="${i}">Mark received</button>`);
      if (r.status !== "open" && C.canManage) out.push(`<button type="button" class="pay-b ghost" data-act="open" data-i="${i}">Undo</button>`);
      return out.join("");
    };
    return `<div class="pay-top"><div><h3 style="margin:0">${esc(plan.name)}</h3><p class="note" style="margin-top:4px;max-width:640px">${esc(plan.text)}</p></div>
        ${C.canManage && !locked() ? `<button type="button" class="outline-btn" id="payChange">Change schedule</button>` : ""}</div>
      <div class="stats-grid pay-stats">
        <div class="stat-card"><small>Project total</small><strong>${total() ? peso(total()) : "—"}</strong></div>
        <div class="stat-card good"><small>Received</small><strong>${peso(paid)}</strong></div>
        <div class="stat-card"><small>Sent, not yet confirmed</small><strong>${peso(sent)}</strong></div>
        <div class="stat-card ${dueNow > 0 ? "bad" : ""}"><small>Due now</small><strong>${peso(dueNow)}</strong></div>
      </div>
      <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pctPaid}" style="margin:6px 0 4px"><i style="width:${pctPaid}%"></i></div>
      <p class="note" style="margin-bottom:12px">${pctPaid}% of the price is paid and confirmed.</p>
      <div class="table-wrap"><table class="data-table pay-table"><thead><tr><th>Payment</th><th>Due</th><th class="num">%</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>
        ${rows.map((r, i) => { const s = statusOf(r); return `<tr><td><strong>${esc(r.label)}</strong></td><td>${esc(r.when)}</td><td class="num">${r.pct}%</td><td class="num cost">${total() ? peso(amt(r.pct)) : "—"}</td><td><span class="pay-st ${s.k}">${esc(s.t)}</span></td><td class="pay-btns">${btns(r, i)}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="hint">${C.canManage ? "Confirm each payment once the money is in your hands. The client can mark a payment as sent, and you confirm it." : "Mark a payment as sent after you pay. Your foreman then confirms that it was received."}${locked() && C.canManage ? " The schedule is locked once a payment is marked, so both sides see the same terms." : ""}</p>`;
  }
  function bindView() {
    const ch = $("payChange"); if (ch) ch.onclick = () => { editing = true; draft = { plan: C.project.payments.plan, rows: C.project.payments.rows.map(r => ({ ...r })) }; render(); };
    $("payRoot").querySelectorAll("[data-act]").forEach(b => b.onclick = async () => {
      const i = Number(b.dataset.i), act = b.dataset.act, P = JSON.parse(JSON.stringify(C.project.payments)), r = P.rows[i];
      r.status = act; if (act === "sent") r.sentAt = new Date().toISOString(); if (act === "received") { r.receivedAt = new Date().toISOString(); if (!r.sentAt) r.sentAt = r.receivedAt; } if (act === "open") { delete r.sentAt; delete r.receivedAt; }
      b.disabled = true; say("");
      if (await save({ payments: P }, say)) render(); else b.disabled = false;
    });
  }

  function render() {
    const root = $("payRoot"); if (!root) return;
    const has = rowsOf().length > 0;
    let h = `<p class="msg err" id="payErr" hidden></p>`;
    if (has && !editing) h += viewHTML();
    else if (C.canManage) h += editorHTML();
    else h += `<div class="empty-pay"><h3>No payment schedule yet</h3><p class="note">Your foreman will set how the payments are split, for example a down payment and then payments as each stage is finished. It will show here.</p></div>`;
    root.innerHTML = h;
    if (has && !editing) bindView(); else if (C.canManage) bindEditor();
  }

  function mount(ctx) {
    C = ctx;
    const sb = $("startBtn"); if (sb) sb.onclick = startProject;
    paintStart(); render();
  }
  return { mount, refresh: () => { if (C) { paintStart(); if (!editing) render(); } } };
})();