(async function () {
  const $ = id => document.getElementById(id);
  const user = await BW.me();
  const isPro = user.role === "contractor";
  $("who").textContent = user.name; $("whoMail").textContent = BW.shownName(user.email);
  $("roleTag").textContent = isPro ? BW.proLabel(user) : "CLIENT"; $("roleTag").classList.toggle("client", !isPro);
  $("out").onclick = BW.signOut; $("previewBanner").hidden = !user.preview;
  $("sub").textContent = isPro ? "Tell clients whether you work as a foreman or a contractor." : "Your account details.";
  $("pName").value = user.name; $("pMail").value = BW.shownName(user.email); $("pRole").value = isPro ? "Foreman / Contractor" : "Client";
  let pt = user.proType || null;
  const paint = () => {
    document.querySelectorAll("[data-pt]").forEach(b => { const on = b.dataset.pt === pt; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
    $("feeBox").hidden = pt !== "contractor";
  };
  if (isPro) {
    $("proOnly").hidden = false; $("pCompany").value = user.company || ""; $("pFee").value = user.defaultFee != null ? user.defaultFee : "";
    document.querySelectorAll("[data-pt]").forEach(b => b.onclick = () => { pt = b.dataset.pt; paint(); });
    paint();
  }
  $("pf").addEventListener("submit", async e => {
    e.preventDefault(); $("pErr").hidden = true; $("pOk").hidden = true;
    const name = $("pName").value.trim();
    if (!name) { $("pErr").textContent = "Enter your name."; $("pErr").hidden = false; return; }
    if (isPro && !pt) { $("pErr").textContent = "Choose whether you work as a foreman or a contractor."; $("pErr").hidden = false; return; }
    const fee = isPro && pt === "contractor" && $("pFee").value !== "" ? Math.min(100, Math.max(0, parseFloat($("pFee").value) || 0)) : null;
    $("pSave").disabled = true;
    try {
      await BW.saveProfile(user, { name, proType: isPro ? pt : null, company: isPro ? $("pCompany").value.trim() : "", defaultFee: fee });
      user.name = name; user.proType = isPro ? pt : null;
      $("who").textContent = name; if (isPro) $("roleTag").textContent = BW.proLabel(user);
      $("pOk").textContent = "Saved."; $("pOk").hidden = false;
    } catch (err) { $("pErr").textContent = "Couldn't save: " + (err.message || err); $("pErr").hidden = false; }
    $("pSave").disabled = false;
  });
})();