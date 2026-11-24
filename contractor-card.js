/* a contractor's profile card: usual fee rate and project record, so a client can judge the fee */
window.ContractorCard = (function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function html(p) {
    if (!p) return "";
    const fee = p.default_fee == null ? "Not set" : Number(p.default_fee) + "%";
    const role = p.pro_type === "foreman" ? "Foreman" : "Contractor";
    const since = p.since ? new Date(p.since).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";
    const total = Number(p.total) || 0;
    const rec = total
      ? `<div class="cc-stats"><div><b>${total}</b><small>Projects</small></div><div><b>${Number(p.completed) || 0}</b><small>Completed</small></div><div><b>${Number(p.ongoing) || 0}</b><small>Ongoing</small></div><div><b>${Number(p.avg_progress) || 0}%</b><small>Avg. progress</small></div></div>`
      : `<p class="cc-none">No projects on BuildWise yet. This is a new profile.</p>`;
    return `<div class="cc"><div class="cc-top"><div><b class="cc-name">${esc(p.full_name || "Contractor")}</b><small>${esc(p.company || "No company name")} · ${role}${since ? " · on BuildWise since " + since : ""}</small></div>
      <div class="cc-fee"><b>${fee}</b><small>Usual fee rate</small></div></div>${rec}
      <p class="cc-hint">The fee is a percent of materials, labor and permits. Compare it with the project record before you decide.</p></div>`;
  }
  async function show(el, id) {
    if (!el) return;
    if (!id) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false; el.innerHTML = `<p class="cc-none">Loading profile…</p>`;
    try { const p = await BW.contractorProfile(id); if (!p) { el.hidden = true; return; } el.innerHTML = html(p); }
    catch (e) { el.innerHTML = `<p class="cc-none">Profile not available yet. Run the contractor profile SQL in Supabase.</p>`; }
  }
  return { html, show };
})();
