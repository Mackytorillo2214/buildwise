(async function () {
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const peso = n => "₱" + Math.round(n || 0).toLocaleString("en-PH");
  const num = n => Number(n).toLocaleString("en-PH");
  const id = new URLSearchParams(location.search).get("id");
  const fail = t => { $("err").textContent = t; $("err").hidden = false; };

  const user = await BW.me();
  const isPro = user.role === "contractor";
  $("who").textContent = user.name; $("whoMail").textContent = BW.shownName(user.email);
  $("roleTag").textContent = isPro ? BW.proLabel(user) : "CLIENT"; $("roleTag").classList.toggle("client", !isPro);
  $("out").onclick = BW.signOut;
  $("printBtn").onclick = () => window.print();
  if (!id) return fail("No project selected.");
  let p; try { p = await BW.getProject(id); } catch (e) { return fail("Couldn't load this plan: " + (e.message || e)); }
  if (!p) return fail("This project doesn't exist, or it isn't shared with you.");
  $("back").href = "project.html?id=" + encodeURIComponent(id);
  $("pName").textContent = p.name;
  $("pMeta").textContent = [p.location, "House plan · read only"].filter(Boolean).join(" · ");
  document.title = p.name + " — house plan · BuildWise";
  $("page").hidden = false;

  const s = p.plan_data && p.plan_data.summary;
  if (!s) {
    $("body").innerHTML = `<section class="plate empty"><h2>No plan saved yet</h2><p>${BW.isOwner(user, p) ? "Open the planner, finish the questions and press “Save plan to project”." : "The project owner hasn't saved a house plan yet. It will appear here once they do."}</p>
      ${BW.isOwner(user, p) ? `<a class="go" href="index.html?project=${encodeURIComponent(id)}">Plan the house</a>` : ""}</section>`;
    return;
  }

  const R = s.rooms, chips = [];
  [["Bedrooms", R.bed], ["Master bedrooms", R.master], ["Comfort rooms", R.cr], ["Living room", R.living], ["Kitchen", R.kitchen], ["Dining", R.dining]].forEach(([n, v]) => { if (v) chips.push(`<span><b>${v}</b>${n}</span>`); });
  s.extras.forEach(x => chips.push(`<span>${esc(x)}</span>`));
  const m = s.money;
  const when = new Date(s.savedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

  $("body").innerHTML = `
    ${p.plan_data.S ? `<section class="plate sec" style="margin-top:0"><h2>3D model</h2>
      <p class="note" style="margin-bottom:10px">Drag to turn the house around. Press <b>Inside</b> to look into the rooms, change the floor, and try the interior styles. This view is read only.</p>
      <iframe class="viewer3d" title="3D model of the house" src="index.html?project=${encodeURIComponent(id)}&embed=1" loading="lazy"></iframe></section>` : ""}
    ${s.complete ? "" : `<div class="banner"><b>Draft.</b> The owner hasn't answered every planner question yet, so some numbers may change.</div>`}
    <section class="plate">
      <div class="stat4">
        <div><small>LOT AREA</small><b>${num(s.lot.area)}</b><span>sqm</span></div>
        <div><small>FLOOR AREA</small><b>${num(s.house.floorArea)}</b><span>sqm total</span></div>
        <div><small>FLOORS</small><b>${s.house.floors}</b><span>${s.house.floors === 1 ? "bungalow" : "storeys"}</span></div>
        <div><small>ESTIMATED COST</small><b>${peso(m.total)}</b></div>
      </div>
      <p class="note" style="margin-top:12px">Lot with ${s.lot.sides} sides${s.lot.name ? " (" + esc(s.lot.name) + ")" : ""}. About ${num(s.house.perFloor)} sqm per floor. Plan saved ${when}.</p>
    </section>

    <section class="plate sec"><h2>Rooms</h2><div class="chips">${chips.join("") || "<span>No rooms listed</span>"}</div></section>

    <section class="plate sec"><h2>Construction</h2>
      <div class="tbl"><table><tbody>
        <tr><td>Exterior walls</td><td>${esc(s.build.walls)}</td></tr>
        <tr><td>Room dividers</td><td>${esc(s.build.dividers)}</td></tr>
        <tr><td>Glass</td><td>${esc(s.build.glass)}</td></tr>
        <tr><td>Windows</td><td>${esc(s.build.windows)}</td></tr>
        <tr><td>Perimeter fence</td><td>${esc(s.build.fence)}</td></tr>
      </tbody></table></div></section>

    <section class="plate sec"><h2>Materials</h2>
      <div class="keys">${s.keyTotals.map(k => `<div><small>${esc(k.name)}</small><b>${num(k.qty)}</b> <span class="note">${esc(k.unit)}</span></div>`).join("")}</div>
      ${s.materials.map(c => `<div class="cat"><h3>${esc(c.icon || "")} ${esc(c.name)}</h3><b>${peso(c.total)}</b></div>
        <div class="tbl"><table><thead><tr><th>Item</th><th class="n">Quantity</th><th>Unit</th><th class="n">Cost</th></tr></thead>
        <tbody>${c.items.map(i => `<tr><td>${esc(i.name)}</td><td class="n">${num(i.qty)}</td><td>${esc(i.unit)}</td><td class="n">${peso(i.cost)}</td></tr>`).join("")}</tbody></table></div>`).join("")}
    </section>

    <section class="plate sec"><h2>Labor</h2>
      <p class="note" style="margin-bottom:8px">${s.labor.headcount} workers · about ${s.labor.days} working days</p>
      <div class="tbl"><table><thead><tr><th>Worker</th><th>Type</th><th class="n">Daily rate</th><th class="n">Workers</th><th class="n">Days</th><th class="n">Cost</th></tr></thead>
        <tbody>${s.labor.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.tier)}</td><td class="n">${peso(r.rate)}</td><td class="n">${r.count}</td><td class="n">${r.days}</td><td class="n">${peso(r.cost)}</td></tr>`).join("")}</tbody>
        <tfoot><tr><td colspan="5">${m.payType === "pakyawan" ? "Estimated crew cost" : "Total labor"}</td><td class="n">${peso(s.labor.total)}</td></tr>${m.payType === "pakyawan" ? `<tr><td colspan="5">Pakyawan price (fixed)</td><td class="n">${peso(m.labor)}</td></tr>` : ""}</tfoot></table></div></section>

    <section class="plate sec"><h2>Cost summary</h2>
      ${(() => {
        const type = m.payType || "arawan", hideFee = type === "contractor" && m.showFee === false && !isPro;
        const L = [[type === "pakyawan" ? "Materials (bought by the owner)" : "Materials", m.materials]];
        L.push([type === "pakyawan" ? "Labor (pakyawan, fixed price)" : hideFee ? "Labor and contractor services" : "Labor", m.labor + (hideFee ? m.fee : 0)]);
        L.push(["Permits, hauling & misc.", m.permits], ["Contingency", m.contingency]);
        if (type === "contractor" && !hideFee) L.push(["Contractor's fee (" + (m.feeLabel || "") + ")", m.fee]);
        const who = type === "pakyawan" && isPro ? `<p class="note" style="margin-top:10px">Pakyawan price ${peso(m.labor)} − estimated crew cost ${peso(m.crewCost)} = <b>${peso(m.margin)}</b> left for the foreman.</p>`
          : type === "contractor" && isPro ? `<p class="note" style="margin-top:10px">Your contractor's fee: <b>${peso(m.fee)}</b>${m.showFee === false ? " (hidden from the client)" : ""}.</p>` : "";
        return `<p class="note" style="margin-bottom:8px">Pay type: <b>${{ arawan: "Arawan (daily crew)", pakyawan: "Pakyawan (fixed labor price)", contractor: "Contractor (materials + labor + fee)" }[type]}</b></p>
      <div class="tbl"><table><tbody>${L.map(l => `<tr><td>${l[0]}</td><td class="n">${peso(l[1])}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td>${type === "contractor" ? "Total the client pays" : "Estimated total"}</td><td class="n">${peso(m.total)}</td></tr>
        <tr><td>Budget ${m.budget ? peso(m.budget) : ""}</td><td class="n"><span class="badge ${m.ok ? "ok" : "bad"}">${m.ok ? "Within budget · " + peso(m.remaining) + " left" : "Over budget by " + peso(-m.remaining)}</span></td></tr></tfoot></table></div>${who}`;
      })()}</section>

    <section class="plate sec"><h2>Suggestions</h2><ul class="tips ${m.ok ? "ok" : ""}">${s.suggestions.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>`;
})();