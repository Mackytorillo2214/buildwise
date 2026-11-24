/* shared by projects.html and project.html: mobile menu and the sidebar "New project" button */
(function () {
  const $ = id => document.getElementById(id);
  const side = $("side"), scrim = $("scrim"), burger = $("burger");
  const set = open => { side.classList.toggle("open", open); scrim.hidden = !open; if (burger) burger.setAttribute("aria-expanded", String(open)); };
  if (burger) burger.addEventListener("click", () => set(!side.classList.contains("open")));
  if (scrim) scrim.addEventListener("click", () => set(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
  const su = document.querySelector(".suser");
  if (su) { su.style.cursor = "pointer"; su.title = "My profile"; su.setAttribute("role", "link"); su.tabIndex = 0; const go = () => (location.href = "profile.html"); su.addEventListener("click", go); su.addEventListener("keydown", e => { if (e.key === "Enter") go(); }); }
  const nw = $("sideNew");
  if (nw) nw.addEventListener("click", () => { set(false); const b = $("newBtn"); if (b) b.click(); else location.href = "projects.html#new"; });
})();