/* Change requests on the project page: the client asks, the foreman/contractor approves or declines. */
window.CRPanel = (function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const peso = n => n == null || isNaN(n) ? "—" : "₱" + Math.round(n).toLocaleString("en-PH");
  const when = iso => new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  const money = pd => (pd && pd.summary && pd.summary.money) || null;
  const LINES = [["Materials", "materials"], ["Labor", "labor"], ["Permits, hauling & misc.", "permits"], ["Contingency", "contingency"], ["Contractor's fee", "fee"]];

  function diffTable(project, c) {
    const a = money(project.plan_data), b = money(c.plan_data);
    const rows = a && b ? LINES.filter(l => (a[l[1]] || 0) || (b[l[1]] || 0)).map(l => [l[0], a[l[1]] || 0, b[l[1]] || 0]) : [];
    rows.push(["Total", c.old_total != null ? c.old_total : (a ? a.total : project.plan_total), c.plan_total]);
    const sign = d => (d > 0 ? "+" : d < 0 ? "−" : "") + peso(Math.abs(d));
    return `<div class="tbl"><table><thead><tr><th></th><th class="n">Current</th><th class="n">Proposed</th><th class="n">Change</th></tr></thead><tbody>${rows.map((r, i) => {
      const d = (r[2] || 0) - (r[1] || 0);
      return `<tr${i === rows.length - 1 ? ' class="cr-total"' : ""}><td>${r[0]}</td><td class="n">${peso(r[1])}</td><td class="n">${peso(r[2])}</td><td class="n cr-${d > 0 ? "up" : d < 0 ? "down" : "same"}">${d ? sign(d) : "—"}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  async function init({ project, user, box }) {
    if (!box) return 0;
    const isPro = user.role === "contractor";
    const isContractor = isPro && project.contractor_id === user.id;
    const owner = BW.isOwner(user, project), locked = BW.planLocked(user, project);
    let list = [];
    try { list = await BW.listChangeRequests(project.id); } catch (e) { list = []; }
    const pending = list.find(c => c.status === "pending");
    const past = list.filter(c => c.status !== "pending" && c.status !== "cancelled").slice(0, 5);
    if (!locked && !pending && !past.length && !isContractor) { box.hidden = true; return 0; }
    box.hidden = false;
    const label = { approved: "Approved", declined: "Declined" };
    let h = `<h3>Change requests</h3>`;
    if (locked && !pending) h += `<p class="note">Work has started, so the house plan is locked. To change it, make your edits in the planner and send a change request. Your foreman approves or declines it.</p>`;
    if (locked) h += `<a class="go" style="display:inline-block;margin:6px 0 10px;text-decoration:none" href="index.html?project=${encodeURIComponent(project.id)}">${pending ? "Edit and resend" : "Request a change"}</a>`;
    if (pending) {
      h += `<div class="cr-card"><div class="cr-head"><b>${isContractor ? esc(pending.requester_name || "Your client") + " asked for a change" : "Your change request is waiting"}</b><span class="cr-badge">Pending</span></div>
        <small class="note">Sent ${when(pending.created_at)}</small>
        ${pending.note ? `<p class="cr-note">“${esc(pending.note)}”</p>` : ""}${diffTable(project, pending)}`;
      if (isContractor) h += `<label class="f" style="margin-top:10px"><span>Reply to the client <em>(optional)</em></span><input type="text" id="crReply" maxlength="300" placeholder="Reason or next steps"></label>
        <p class="msg err" id="crErr" hidden></p>
        <div class="cr-btns"><button type="button" class="go" id="crApprove">Approve and update the plan</button><button type="button" class="ghost" id="crDecline">Decline</button></div>`;
      else if (owner) h += `<p class="msg err" id="crErr" hidden></p><div class="cr-btns"><button type="button" class="ghost" id="crCancel">Cancel request</button></div>`;
      h += `</div>`;
    } else if (isContractor && !past.length) h += `<p class="note">No change requests. If your client changes the plan after work starts, it shows up here for your approval.</p>`;
    if (past.length) h += `<h4 style="margin:14px 0 6px">Earlier requests</h4><ul class="cr-past">${past.map(c => `<li><span class="cr-badge ${c.status}">${label[c.status]}</span> ${when(c.decided_at || c.created_at)} · ${peso(c.old_total)} → ${peso(c.plan_total)}${c.note ? " · " + esc(c.note) : ""}${c.reply ? `<br><small class="note">Reply: ${esc(c.reply)}</small>` : ""}</li>`).join("")}</ul>`;
    box.innerHTML = h;

    const fail = e => { const m = box.querySelector("#crErr"); if (m) { m.textContent = e.message || String(e); m.hidden = false; } };
    const run = async fn => { try { await fn(); location.reload(); } catch (e) { fail(e); } };
    const ap = box.querySelector("#crApprove"), dc = box.querySelector("#crDecline"), ca = box.querySelector("#crCancel");
    if (ap) ap.onclick = () => { ap.disabled = true; run(() => BW.decideChangeRequest(pending.id, true, box.querySelector("#crReply").value.trim())); };
    if (dc) dc.onclick = () => { dc.disabled = true; run(() => BW.decideChangeRequest(pending.id, false, box.querySelector("#crReply").value.trim())); };
    if (ca) ca.onclick = () => { ca.disabled = true; run(() => BW.cancelChangeRequest(pending.id)); };
    return isContractor && pending ? 1 : 0;
  }
  return { init };
})();
