/* BuildWise data layer: Supabase when keys are set, otherwise a local preview store (this browser only). */
window.BW = (function () {
  const cfg = window.BUILDWISE_CONFIG || {};
  const configured = cfg.SUPABASE_URL && !String(cfg.SUPABASE_URL).startsWith("YOUR_") && window.supabase;
  const base = configured ? (() => { try { return new URL(cfg.SUPABASE_URL.trim()).origin; } catch (e) { return cfg.SUPABASE_URL.trim(); } })() : "";
  const db = configured ? window.supabase.createClient(base, cfg.SUPABASE_ANON_KEY.trim()) : null;
  const FAKE = "@buildwise.example.com";
  const STAGES = [
    { name: "Site preparation", from: 0 },
    { name: "Foundation", from: 15 },
    { name: "Walls & framing", from: 35 },
    { name: "Roofing", from: 60 },
    { name: "Finishing", from: 75 },
    { name: "Turnover", from: 95 }
  ];
  const stageOf = p => { let s = STAGES[0]; STAGES.forEach(x => { if (p >= x.from) s = x; }); return s; };
  const shownName = e => (e || "").endsWith(FAKE) ? e.slice(0, -FAKE.length) : (e || "");
  const toEmail = t => { t = (t || "").trim(); if (!t) return null; return (t.includes("@") ? t : t.toLowerCase().replace(/[^a-z0-9._-]/g, "") + FAKE).toLowerCase(); };

  /* ---------- preview store ---------- */
  const KEY = "buildwise_preview_db";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const save = d => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
  const uid = () => "p" + Math.random().toString(36).slice(2, 10);
  function store() {
    let d = load();
    if (!d) {
      const a = uid(), b = uid(), t = Date.now(), day = 86400000;
      d = {
        projects: [
          { id: a, created_by: "preview-contractor", contractor_id: "preview-contractor", contractor_name: "Foreman Reyes", client_name: "Maria Dela Cruz", name: "Dela Cruz Residence", location: "Lipa, Batangas", client_email: "delacruz" + FAKE, progress: 45, plan_total: 3590459, budget: 4000000, created_at: new Date(t - 40 * day).toISOString() },
          { id: b, created_by: "preview-contractor", contractor_id: "preview-contractor", contractor_name: "Foreman Reyes", client_name: "Jose Santos", name: "Santos Duplex", location: "Calamba, Laguna", client_email: "santos" + FAKE, progress: 12, plan_total: 2810000, budget: 3000000, created_at: new Date(t - 9 * day).toISOString() }
        ],
        updates: [
          { id: uid(), project_id: a, author_name: "Foreman Reyes", message: "Foundation poured and cured. Starting hollow-block laying on the ground floor tomorrow.", progress: 35, created_at: new Date(t - 12 * day).toISOString() },
          { id: uid(), project_id: a, author_name: "Foreman Reyes", message: "First-floor walls are up to window height. Rebar for the columns inspected.", progress: 45, created_at: new Date(t - 3 * day).toISOString() },
          { id: uid(), project_id: b, author_name: "Foreman Reyes", message: "Lot cleared and staked out. Footing excavation starts Monday.", progress: 12, created_at: new Date(t - 2 * day).toISOString() }
        ]
      };
      save(d);
    }
    return d;
  }

  /* ---------- session ---------- */
  async function me() {
    if (!db) {
      const role = sessionStorage.getItem("buildwise_preview_role");
      if (!role) { location.href = "login.html"; return new Promise(() => {}); }
      let pr = {}; try { pr = JSON.parse(localStorage.getItem("bw_preview_profile") || "{}"); } catch (e) {}
      return { id: "preview-" + role, email: "preview@buildwise.example.com", name: pr.name || (role === "client" ? "Preview Client" : "Preview Foreman"), role, preview: true, proType: role === "contractor" ? (pr.proType || null) : null, company: pr.company || "", defaultFee: pr.defaultFee != null ? pr.defaultFee : null };
    }
    const { data } = await db.auth.getSession();
    if (!data.session) { location.href = "login.html"; return new Promise(() => {}); }
    const u = data.session.user;
    const { data: p } = await db.from("profiles").select("role, approved, full_name").eq("id", u.id).maybeSingle();
    if (!p) { await db.auth.signOut(); location.href = "login.html"; return new Promise(() => {}); }   /* accounts are active right away: no approval step for now (to bring it back use: if (!p || !p.approved)) */
    const md = u.user_metadata || {};
    const proType = p.role === "contractor" && (md.pro_type === "foreman" || md.pro_type === "contractor") ? md.pro_type : null;
    const defaultFee = md.default_fee != null && md.default_fee !== "" ? Number(md.default_fee) : null;
    /* the planner reads these two to choose its starting pay type and fee */
    try { if (proType) localStorage.setItem("bw_pro_type", proType); else localStorage.removeItem("bw_pro_type"); if (defaultFee != null) localStorage.setItem("bw_default_fee", String(defaultFee)); } catch (e) {}
    return { id: u.id, email: u.email, name: p.full_name || shownName(u.email), role: p.role, preview: false, proType, company: md.company || "", defaultFee };
  }
  const proLabel = user => (user && user.proType === "foreman" ? "FOREMAN" : user && user.proType === "contractor" ? "CONTRACTOR" : "FOREMAN / CONTRACTOR");
  /* profile settings: kept on the account itself (works with no database change); also copied to the profiles table when its columns exist */
  async function saveProfile(user, { name, proType, company, defaultFee }) {
    try {
      if (proType) localStorage.setItem("bw_pro_type", proType); else localStorage.removeItem("bw_pro_type");
      if (defaultFee != null) localStorage.setItem("bw_default_fee", String(defaultFee));
    } catch (e) {}
    if (!db) { try { localStorage.setItem("bw_preview_profile", JSON.stringify({ name, proType, company, defaultFee })); } catch (e) {} return; }
    const { error } = await db.auth.updateUser({ data: { full_name: name, company, pro_type: proType || null, default_fee: defaultFee } });
    if (error) throw error;
    /* best effort: other people see these through the profiles table */
    for (const row of [{ full_name: name, company, pro_type: proType || null }, { full_name: name, company }, { full_name: name }]) {
      const r = await db.from("profiles").update(row).eq("id", user.id);
      if (!r.error) break;
    }
  }
  async function signOut() {
    if (db) await db.auth.signOut();
    try { sessionStorage.removeItem("buildwise_preview_role"); localStorage.removeItem("bw_pro_type"); } catch (e) {}
    location.href = "login.html";
  }

  /* ---------- projects ---------- */
  async function listProjects() {
    if (!db) return store().projects.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { data, error } = await db.from("projects").select("id,name,location,client_email,client_name,client_id,contractor_id,contractor_name,created_by,progress,budget,plan_total,created_at,updated_at").order("created_at", { ascending: false });
    if (error) throw error; return data;
  }
  async function lastUpdates() {   // latest update per project, for the list cards
    if (!db) { const m = {}; store().updates.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach(u => { m[u.project_id] = u; }); return m; }
    const { data, error } = await db.from("project_updates").select("project_id,message,created_at").order("created_at", { ascending: false }).limit(200);
    if (error) throw error; const m = {}; data.forEach(u => { if (!m[u.project_id]) m[u.project_id] = u; }); return m;
  }
  async function createProject(user, { name, location, client, contractor }) {
    const row = { name, location: location || null, progress: 0 };
    if (user.role === "contractor") Object.assign(row, { contractor_id: user.id, contractor_name: user.name, client_email: toEmail(client) });
    else Object.assign(row, { client_id: user.id, client_name: user.name, client_email: (user.email || "").toLowerCase(), contractor_id: contractor ? contractor.id : null, contractor_name: contractor ? contractor.full_name : null });
    if (!db) { const d = store(); const p = Object.assign({ id: uid(), created_by: user.id, created_at: new Date().toISOString() }, row); d.projects.push(p); save(d); return p; }
    const { data, error } = await db.from("projects").insert(Object.assign({ created_by: user.id }, row)).select().single();
    if (error) throw error; return data;
  }
  async function connectContractor(id, contractor) {
    const patch = { contractor_id: contractor ? contractor.id : null, contractor_name: contractor ? contractor.full_name : null, updated_at: new Date().toISOString() };
    if (!db) { const d = store(); const p = d.projects.find(x => x.id === id); if (p) Object.assign(p, patch); save(d); return; }
    const { error } = await db.from("projects").update(patch).eq("id", id); if (error) throw error;
  }
  async function searchContractors(q) {
    q = (q || "").trim().toLowerCase();
    if (!db) return [{ id: "preview-contractor", full_name: "Foreman Reyes", company: "Reyes Builders" }, { id: "c2", full_name: "Jun Mercado", company: "JM Construction" }, { id: "c3", full_name: "Joel Bautista", company: "Bautista & Sons" }]
      .filter(c => !q || c.full_name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q));
    const { data, error } = await db.rpc("search_contractors", { q });
    if (error) throw error; return data || [];
  }
  /* who may do what on a project */
  const ownerOf = p => p.created_by || p.contractor_id || "preview-contractor";
  const isOwner = (user, p) => ownerOf(p) === user.id;
  const canPost = (user, p) => p.contractor_id ? p.contractor_id === user.id : ownerOf(p) === user.id;

  async function getProject(id) {
    if (!db) return store().projects.find(p => p.id === id) || null;
    const { data, error } = await db.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) throw error; return data;
  }
  async function savePlan(id, plan, total, budget) {
    if (!db) { const d = store(); const p = d.projects.find(x => x.id === id); if (p) { p.plan_data = plan; p.plan_total = total; p.budget = budget; } save(d); return; }
    const { error } = await db.from("projects").update({ plan_data: plan, plan_total: total, budget, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  }
  async function deleteProject(id) {
    if (!db) { const d = store(); d.projects = d.projects.filter(p => p.id !== id); d.updates = d.updates.filter(u => u.project_id !== id); save(d); return; }
    const { error } = await db.from("projects").delete().eq("id", id); if (error) throw error;
  }

  /* ---------- find clients (for the new-project box) ---------- */
  async function searchClients(q) {
    q = (q || "").trim().toLowerCase();
    if (!db) {
      const people = [["John Reyes", "johnreyes"], ["Juana Cruz", "juana"], ["Jose Santos", "santos"], ["Maria Dela Cruz", "delacruz"], ["Macky Torillo", "macky"], ["Jenny Lim", "jenny"]]
        .map(([n, u]) => ({ full_name: n, email: u + FAKE }));
      return people.filter(c => !q || c.full_name.toLowerCase().includes(q) || c.email.includes(q))
        .sort((a, b) => (b.full_name.toLowerCase().startsWith(q) - a.full_name.toLowerCase().startsWith(q)) || a.full_name.localeCompare(b.full_name)).slice(0, 8);
    }
    const { data, error } = await db.rpc("search_clients", { q });
    if (error) throw error; return data || [];
  }

  /* ---------- reference files (Supabase Storage bucket "references") ---------- */
  async function uploadReference(projectId, file) {
    if (!db) return null;
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = projectId + "/" + Date.now().toString(36) + "-" + safe;
    const { error } = await db.storage.from("references").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (error) throw error; return path;
  }
  /* progress photos: same private bucket, under <project>/updates/. Without Supabase the (already resized) photo is kept as a data URL. */
  async function uploadUpdatePhoto(projectId, blob) {
    if (!db) return await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
    const path = projectId + "/updates/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7) + ".jpg";
    const { error } = await db.storage.from("references").upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw error; return path;
  }
  async function referenceUrl(path) {
    if (!db || !path) return null;
    const { data } = await db.storage.from("references").createSignedUrl(path, 3600); return data ? data.signedUrl : null;
  }

  /* change a few columns of a project (start date, payment schedule) */
  async function updateProject(id, patch) {
    if (!db) { const d = store(); const p = d.projects.find(x => x.id === id); if (p) Object.assign(p, patch, { updated_at: new Date().toISOString() }); save(d); return; }
    const { error } = await db.from("projects").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  }

  /* ---------- updates ---------- */
  async function listUpdates(id) {
    if (!db) return store().updates.filter(u => u.project_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { data, error } = await db.from("project_updates").select("*").eq("project_id", id).order("created_at", { ascending: false });
    if (error) throw error; return data;
  }
  async function addUpdate(user, id, { message, progress, photos }) {
    photos = photos || [];
    if (!db) {
      const d = store(); const u = { id: uid(), project_id: id, author_name: user.name, message, progress, photos, created_at: new Date().toISOString() };
      d.updates.push(u); const p = d.projects.find(x => x.id === id); if (p) p.progress = progress; save(d); return u;
    }
    const { data, error } = await db.from("project_updates").insert({ project_id: id, author_id: user.id, author_name: user.name, message, progress, ...(photos.length ? { photos } : {}) }).select().single();
    if (error) throw error;
    const r = await db.from("projects").update({ progress, updated_at: new Date().toISOString() }).eq("id", id);
    if (r.error) throw r.error;
    return data;
  }

  return { db, configured: !!db, STAGES, stageOf, shownName, me, proLabel, saveProfile, signOut, listProjects, lastUpdates, createProject, uploadReference, uploadUpdatePhoto, referenceUrl, connectContractor, searchContractors, isOwner, canPost, searchClients, getProject, savePlan, deleteProject, listUpdates, addUpdate, updateProject };
})();