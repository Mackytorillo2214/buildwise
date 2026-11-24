/* BuildWise login: Supabase email + password, with separate Client / Foreman-Contractor accounts. */
(function () {
  const cfg = window.BUILDWISE_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("YOUR_") && window.supabase;
  /* keep only https://<project>.supabase.co, even if extra path or a trailing slash was pasted */
  const baseUrl = configured ? (() => { try { return new URL(cfg.SUPABASE_URL.trim()).origin; } catch (e) { return cfg.SUPABASE_URL.trim(); } })() : "";
  /* "Remember me": keep the sign-in in localStorage (stays after closing the browser) or in sessionStorage (ends when the tab or browser closes) */
  const bwStore = {
    getItem(k) { try { const v = localStorage.getItem(k); return v !== null ? v : sessionStorage.getItem(k); } catch (e) { return null; } },
    setItem(k, v) { try { const keep = localStorage.getItem("bw_remember") !== "0"; (keep ? localStorage : sessionStorage).setItem(k, v); (keep ? sessionStorage : localStorage).removeItem(k); } catch (e) {} },
    removeItem(k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
  };
  const db = configured ? window.supabase.createClient(baseUrl, cfg.SUPABASE_ANON_KEY.trim(), { auth: { storage: bwStore, persistSession: true, autoRefreshToken: true } }) : null;
  const $ = id => document.getElementById(id);
  const ROLE_NAME = { client: "Client", contractor: "Foreman / Contractor" };

  let role = "client", mode = "signin";

  /* ---------- UI state ---------- */
  function say(text, kind) {
    const m = $("msg");
    m.textContent = text || "";
    m.className = "msg " + (kind || "");
    m.hidden = !text;
  }
  function paint() {
    document.querySelectorAll("[data-role]").forEach(b => { const on = b.dataset.role === role; b.classList.toggle("on", on); b.setAttribute("aria-checked", on); });
    document.querySelectorAll("[data-mode]").forEach(b => { const on = b.dataset.mode === mode; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); });
    const signup = mode === "signup";
    $("nameRow").hidden = !signup;
    $("companyRow").hidden = !(signup && role === "contractor");
    $("signRow").hidden = signup;
    $("submit").textContent = signup ? "Create " + (role === "client" ? "client" : "contractor") + " account" : "Sign in as " + (role === "client" ? "client" : "foreman / contractor");
    $("password").autocomplete = signup ? "new-password" : "current-password";
    $("roleNote").textContent = role === "client"
      ? "Plan your house, see the cost estimate and share it with your contractor."
      : "Review client plans, adjust crew and material prices, and send quotes.";
    say("");
  }
  function busy(on) { $("submit").disabled = on; $("submit").classList.toggle("loading", on); }

  /* ---------- Supabase helpers ---------- */
  const friendly = e => {
    const t = (e && e.message) || "Something went wrong.";
    if (/invalid login/i.test(t)) return "Wrong email or password.";
    if (/email not confirmed/i.test(t)) return "Confirm your email first — we sent you a link.";
    if (/already registered/i.test(t)) return "That email already has an account. Sign in instead.";
    if (/password should be/i.test(t)) return "Use a password with at least 6 characters.";
    if (/rate limit/i.test(t)) return "Too many attempts. Wait a minute and try again.";
    return t;
  };

  async function profileOf(user) {
    const { data, error } = await db.from("profiles").select("role, approved, full_name").eq("id", user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function enter(user) {
    const p = await profileOf(user);
    if (!p) { await db.auth.signOut(); throw new Error("No profile found for this account. Ask BuildWise to check the setup."); }
    if (p.role !== role) {
      await db.auth.signOut();
      throw new Error("This email is registered as a " + ROLE_NAME[p.role].toLowerCase() + ". Switch to “" + ROLE_NAME[p.role] + "” above.");
    }
    location.href = (cfg.AFTER_LOGIN || {})[p.role] || "index.html";
  }

  /* ---------- Preview mode (no Supabase keys yet) ---------- */
  function previewEnter() {
    try { sessionStorage.setItem("buildwise_preview_role", role); } catch (e) {}
    say("Preview mode: no Supabase keys yet, so nothing was checked. Opening the planner as " + ROLE_NAME[role] + "…", "ok");
    setTimeout(() => { location.href = (cfg.AFTER_LOGIN || {})[role] || "index.html"; }, 900);
  }

  /* ---------- Actions ---------- */
  async function submit(e) {
    e.preventDefault();
    const typed = $("email").value.trim(), password = $("password").value;
    /* a plain username becomes a private placeholder address (example.com is reserved, mail is never sent) */
    const email = typed.includes("@") ? typed : typed.toLowerCase().replace(/[^a-z0-9._-]/g, "") + "@buildwise.example.com";
    if (!typed || !password) return say("Enter your email or username and your password.", "err");
    if (!typed.includes("@") && typed.replace(/[^a-zA-Z0-9._-]/g, "").length < 3) return say("A username needs at least 3 letters or numbers.", "err");
    if (mode === "signup" && !$("fullName").value.trim()) return say("Enter your full name.", "err");
    if (!db) return previewEnter();
    busy(true); say("");
    try {
      if (mode === "signin") {
        try { localStorage.setItem("bw_remember", $("remember") && !$("remember").checked ? "0" : "1"); } catch (e) {}
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await enter(data.user);
      } else {
        try { localStorage.setItem("bw_remember", "1"); } catch (e) {}
        const { data, error } = await db.auth.signUp({
          email, password,
          options: { data: { full_name: $("fullName").value.trim(), role, company: $("company").value.trim() }, emailRedirectTo: location.href }
        });
        if (error) throw error;
        if (data.session) { await enter(data.user); }
        else {
          mode = "signin"; paint();
          say(role === "contractor"
            ? "Account created. You can sign in now."
            : "Account created. You can sign in now.", "ok");
        }
      }
    } catch (err) { say(friendly(err), "err"); }
    finally { busy(false); }
  }

  async function forgot() {
    const email = $("email").value.trim();
    if (!email) return say("Type your email above first, then tap “Forgot password?”.", "err");
    if (!email.includes("@")) return say("Password reset needs a real email address, not a username.", "err");
    if (!db) return say("Preview mode: connect Supabase to send reset emails.", "err");
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: location.href });
    say(error ? friendly(error) : "If that email has an account, a reset link is on its way.", error ? "err" : "ok");
  }

  /* ---------- wire up ---------- */
  document.querySelectorAll("[data-role]").forEach(b => b.addEventListener("click", () => { role = b.dataset.role; paint(); }));
  document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => { mode = b.dataset.mode; paint(); }));
  $("form").addEventListener("submit", submit);
  $("forgot").addEventListener("click", forgot);
  $("toggleEye").addEventListener("click", () => {
    const show = $("password").type === "password";
    $("password").type = show ? "text" : "password";
    $("toggleEye").textContent = show ? "Hide" : "Show";
  });
  if (!db) $("preview").hidden = false;

  // already signed in? go straight in
  if (db) db.auth.getSession().then(async ({ data }) => {
    if (!data.session) return;
    try { const p = await profileOf(data.session.user); if (p) location.href = (cfg.AFTER_LOGIN || {})[p.role] || "index.html"; } catch (e) {}
  });
  paint();
})();
