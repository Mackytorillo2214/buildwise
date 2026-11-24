/* Inside view of the 3D house: room floors, dividing walls, room names and default furniture.
   Called from renderHouse() in script.js when the viewer is switched to "Inside". Pure HTML/CSS 3D, no libraries. */
window.BWInterior = (function () {
  /* the interior looks the owner can choose (or ask for in the reference chat) */
  const STYLES = {
    modern:     { name: "Modern",              floor: "#c9ccd1", pattern: "tile",  wall: "#eef0f3", wood: "#6b4f3a", fabric: "#44546a", fabric2: "#6c7a8e", accent: "#f5b301", light: "#f4f4f4", dark: "#2b3138" },
    minimalist: { name: "Minimalist",          floor: "#e6dfd2", pattern: "plank", wall: "#ffffff", wood: "#d2b48c", fabric: "#d8d3c8", fabric2: "#bdb8ad", accent: "#8fa39a", light: "#fbfbf9", dark: "#5a5a58" },
    classic:    { name: "Classic",             floor: "#7b5236", pattern: "plank", wall: "#efe2c8", wood: "#4a2f1d", fabric: "#7b2d3a", fabric2: "#a14a58", accent: "#c9a227", light: "#f3ead8", dark: "#2d1c12" },
    tropical:   { name: "Tropical / Filipino", floor: "#b88a58", pattern: "plank", wall: "#f2e7d0", wood: "#8a5a2b", fabric: "#3f7d5c", fabric2: "#6aa386", accent: "#e07a3f", light: "#f7eed9", dark: "#3b2a1a" },
    industrial: { name: "Industrial",          floor: "#5d636b", pattern: "tile",  wall: "#9aa0a8", wood: "#5c4630", fabric: "#2f3b4a", fabric2: "#4d5d72", accent: "#f5b301", light: "#cfd3d8", dark: "#1d2228" }
  };
  const styleOf = st => STYLES[(st && st.interior && st.interior.style) || "modern"] || STYLES.modern;

  /* ---------- furniture: boxes in house-local metres (cx, ct = centre; w along x, d along t; h and y0 up) ---------- */
  const WALLS = { rear: { out: [0, -1], along: [1, 0] }, front: { out: [0, 1], along: [1, 0] }, left: { out: [1, 0], along: [0, 1] }, right: { out: [-1, 0], along: [0, 1] } };
  const OPP = { rear: "front", front: "rear", left: "right", right: "left" };

  function furnish(r, kind, name, cars) {
    const boxes = [], M = 0.1;
    const B = { x0: r.x + M, x1: r.x + r.w - M, t0: r.t + M, t1: r.t + r.h - M };
    const mid = { x: (B.x0 + B.x1) / 2, t: (B.t0 + B.t1) / 2 };
    const inside = b => b.cx - b.w / 2 >= B.x0 - 1e-3 && b.cx + b.w / 2 <= B.x1 + 1e-3 && b.ct - b.d / 2 >= B.t0 - 1e-3 && b.ct + b.d / 2 <= B.t1 + 1e-3;
    const hit = (a, b) => Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 - 0.02 && Math.abs(a.ct - b.ct) < (a.d + b.d) / 2 - 0.02;
    const ok = b => inside(b) && (b.flat || !boxes.some(o => !o.flat && !o.sub && hit(b, o)));
    const mk = (cx, ct, w, d, h, c, extra) => Object.assign({ cx, ct, w, d, h, c, y0: 0 }, extra || {});

    /* a box against a wall: along = length along the wall, depth = how far it sticks out */
    function onWall(wall, anchor, along, depth, h, c, extra) {
      const horiz = wall === "rear" || wall === "front";
      const w = horiz ? along : depth, d = horiz ? depth : along;
      let cx, ct;
      if (horiz) {
        ct = wall === "rear" ? B.t1 - d / 2 : B.t0 + d / 2;
        cx = anchor === "start" ? B.x0 + w / 2 : anchor === "end" ? B.x1 - w / 2 : mid.x;
      } else {
        cx = wall === "left" ? B.x0 + w / 2 : B.x1 - w / 2;
        ct = anchor === "start" ? B.t0 + d / 2 : anchor === "end" ? B.t1 - d / 2 : mid.t;
      }
      return mk(cx, ct, w, d, h, c, extra);
    }
    function tryWalls(list, along, depth, h, c, extra) {
      for (const [wall, anchor] of list) {
        const b = onWall(wall, anchor, along, depth, h, c, extra);
        if (ok(b)) { b.wall = wall; boxes.push(b); return b; }
      }
      return null;
    }
    /* a part placed relative to a box that sits on a wall: u along the wall, v out from the wall (relative to the box centre) */
    function part(b, u, v, wu, wv, h, c, y0, extra) {
      const W = WALLS[b.wall], horiz = b.wall === "rear" || b.wall === "front";
      const cx = b.cx + u * W.along[0] + v * W.out[0], ct = b.ct + u * W.along[1] + v * W.out[1];
      boxes.push(mk(cx, ct, horiz ? wu : wv, horiz ? wv : wu, h, c, Object.assign({ y0: y0 || 0, sub: true }, extra || {})));
    }
    function free(b, extra) { const x = Object.assign(b, extra || {}); if (ok(x)) { boxes.push(x); return x; } return null; }
    function table(cx, ct, w, d, c) {
      const top = mk(cx, ct, w, d, 0.05, c, { y0: 0.7 });
      if (!ok(top)) return null;
      boxes.push(top);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, e]) => boxes.push(mk(cx + a * (w / 2 - 0.07), ct + e * (d / 2 - 0.07), 0.07, 0.07, 0.7, c, { sub: true, thin: true })));
      return top;
    }
    function chair(cx, ct) {
      const c0 = mk(cx, ct, 0.42, 0.42, 0.05, "fabric2", { y0: 0.42, sub: true });
      if (inside(c0)) { boxes.push(c0); boxes.push(mk(cx, ct, 0.42, 0.05, 0.45, "fabric2", { y0: 0.47, sub: true })); }
    }

    function bed(wide, tint) {
      const bw = wide, bl = 2.0;
      const b = tryWalls([["rear", "center"], ["rear", "start"], ["rear", "end"], ["left", "center"], ["right", "center"], ["front", "center"]], bw, bl, 0.3, "wood");
      if (!b) return null;
      part(b, 0, 0.02, bw - 0.08, bl - 0.12, 0.22, "light", 0.3);
      part(b, 0, -(bl / 2 - 0.04), bw, 0.08, 0.95, "wood", 0);
      part(b, -bw / 4, -(bl / 2 - 0.3), 0.55, 0.35, 0.12, "#ffffff", 0.52);
      part(b, bw / 4, -(bl / 2 - 0.3), 0.55, 0.35, 0.12, "#ffffff", 0.52);
      part(b, 0, 0.3, bw - 0.1, bl * 0.5, 0.05, tint || "fabric", 0.52);
      [-1, 1].forEach(s => { const t = mk(0, 0, 0.45, 0.4, 0.5, "wood", {}); const W = WALLS[b.wall], horiz = b.wall === "rear" || b.wall === "front"; const u = s * (bw / 2 + 0.28), v = -(bl / 2 - 0.25);
        t.cx = b.cx + u * W.along[0] + v * W.out[0]; t.ct = b.ct + u * W.along[1] + v * W.out[1]; if (!horiz) { t.w = 0.4; t.d = 0.45; } if (ok(t)) boxes.push(t); });
      return b;
    }

    function sofaSet(len) {
      const s = tryWalls([["rear", "center"], ["left", "center"], ["right", "center"], ["front", "center"]], len, 0.9, 0.45, "fabric");
      if (!s) return null;
      part(s, 0, -0.35, len, 0.2, 0.9, "fabric", 0);
      part(s, -(len / 2 - 0.1), 0.05, 0.2, 0.75, 0.6, "fabric", 0);
      part(s, len / 2 - 0.1, 0.05, 0.2, 0.75, 0.6, "fabric", 0);
      part(s, 0, 0.08, len - 0.4, 0.7, 0.12, "fabric2", 0.45);
      const tv = tryWalls([[OPP[s.wall], "center"]], 1.5, 0.4, 0.5, "wood");
      if (tv) part(tv, 0, -0.1, 1.1, 0.06, 0.65, "dark", 0.5);
      return s;
    }

    const wide = r.w >= 3.2;
    const kset = Array.isArray(r.styles) ? r.styles : (r.style && r.style !== "std" ? [r.style] : []);
    const has = k => kset.includes(k);
    /* a desk against a wall: with a PC (tower, monitor) or plain */
    function desk(pc, along) {
      const d = tryWalls([["left", "end"], ["right", "end"], ["front", "center"], ["rear", "start"], ["left", "start"]], along || 1.2, 0.6, 0.05, pc ? "dark" : "wood", { y0: 0.72 });
      if (!d) return null;
      [-1, 1].forEach(sg => part(d, sg * ((along || 1.2) / 2 - 0.05), 0, 0.06, 0.55, 0.72, "wood", 0, { thin: true }));
      if (pc) { part(d, -0.1, -0.12, 0.55, 0.05, 0.34, "dark", 0.8); part(d, -0.1, -0.12, 0.1, 0.1, 0.1, "dark", 0.77); part(d, 0.42, 0, 0.2, 0.42, 0.45, "dark", 0.0, { y0: 0 }); part(d, 0.0, 0.12, 0.35, 0.12, 0.04, "accent", 0.77); }
      chair(d.cx + (d.wall === "left" ? 0.55 : d.wall === "right" ? -0.55 : 0), d.ct + (d.wall === "front" ? 0.55 : d.wall === "rear" ? -0.55 : 0));
      return d;
    }
    /* an own CR inside the bedroom: a walled corner with toilet, lavatory and shower */
    function ensuite() {
      const w = Math.min(1.5, r.w * 0.45), d = Math.min(1.9, r.h * 0.55);
      if (r.w < 2.6 || r.h < 2.8) return;
      const x1 = B.x1, t1 = B.t1, x0 = x1 - w, t0 = t1 - d;
      boxes.push(mk(x0 + w / 2, t0 + d / 2, w, d, 0.02, "#9fb7c1", { y0: 0 }));   // tiled floor that also keeps furniture out
      boxes.push(mk(x0 + 0.04, t0 + d / 2, 0.08, d, 2.2, "light", {}));            // side partition
      const fw = w - 0.7; if (fw > 0.2) boxes.push(mk(x1 - fw / 2, t0 + 0.04, fw, 0.08, 2.2, "light", {}));   // front partition, door gap beside the side wall
      boxes.push(mk(x1 - 0.28, t1 - 0.5, 0.4, 0.62, 0.4, "#f4f7f9", { sub: true }));
      boxes.push(mk(x1 - 0.28, t1 - 0.2, 0.38, 0.18, 0.8, "#f4f7f9", { sub: true }));
      boxes.push(mk(x0 + 0.38, t1 - 0.22, 0.5, 0.38, 0.85, "wood", { sub: true }));
      boxes.push(mk(x0 + 0.38, t1 - 0.22, 0.46, 0.34, 0.04, "light", { sub: true, y0: 0.85 }));
      boxes.push(mk(x1 - 0.4, t0 + 0.55, 0.7, 0.7, 0.03, "#7fa6b8", { sub: true, flat: true }));   // shower tray
    }
    if (kind === "bed" && r.ensuite) ensuite();
    if (kind === "bed" || kind === "master") {
      const big = kind === "master";
      const tint = has("girl") ? "#f2a9c6" : has("kid") ? "#7cc4f0" : has("boy") ? "#5b8def" : null;
      const bd = bed(big ? 1.8 : (has("kid") ? 0.95 : Math.min(r.w, r.h) >= 2.7 ? 1.5 : 0.95), tint);
      if (has("kid") && bd) {   // bunk: a second deck with posts, and a play mat with a toy box
        part(bd, 0, 0, 0.9, 1.9, 0.07, tint, 1.35); part(bd, 0, 0.1, 0.8, 1.6, 0.05, "light", 1.42);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, e]) => part(bd, a * 0.44, e * 0.93, 0.06, 0.06, 1.35, "wood", 0, { thin: true }));
        free(mk(mid.x, mid.t, 1.5, 1.2, 0.02, "accent"), { flat: true });
        tryWalls([["front", "start"], ["front", "end"], ["left", "start"]], 0.8, 0.4, 0.4, "accent");
      }
      if (has("boy")) { desk(true, 1.3); tryWalls([["left", "center"], ["right", "center"]], 0.9, 0.3, 1.2, "wood");
      }
      if (has("study")) { desk(false, 1.3); tryWalls([["left", "center"], ["right", "center"], ["front", "start"]], 0.9, 0.3, 1.8, "wood");
      }
      if (has("girl")) {
        const v = tryWalls([["right", "end"], ["left", "end"], ["front", "center"]], 0.95, 0.45, 0.75, "light");
        if (v) { part(v, 0, -0.2, 0.6, 0.04, 0.8, "#cfe3f2", 0.85); part(v, 0, 0.45, 0.35, 0.35, 0.05, "#f2a9c6", 0.42, { sub: true }); }
      }
      tryWalls([["left", "start"], ["right", "start"], ["front", "start"], ["front", "end"], ["left", "end"]], big ? 1.8 : 1.2, 0.55, 2.0, "wood");
      if (big) tryWalls([["front", "center"], ["right", "center"], ["left", "center"]], 1.2, 0.45, 0.8, "wood");
      if (big && has("closet")) { tryWalls([["left", "center"], ["right", "center"]], 1.8, 0.55, 2.1, "wood"); tryWalls([["front", "end"], ["front", "start"]], 1.6, 0.55, 2.1, "wood"); free(mk(mid.x, mid.t + 0.4, 0.8, 0.6, 0.45, "light")); }
      if (big && has("work")) desk(true, 1.4);
      if (big && has("lounge")) { tryWalls([["front", "start"], ["front", "end"], ["left", "end"], ["right", "end"]], 0.8, 0.8, 0.45, "fabric2"); tryWalls([["front", "end"], ["right", "start"], ["left", "start"]], 0.8, 0.8, 0.45, "fabric2"); free(mk(mid.x, mid.t + 0.9, 0.6, 0.6, 0.4, "wood")); }
    } else if (kind === "living") {
      sofaSet(has("family") ? 2.8 : r.w >= 3.6 || r.h >= 3.6 ? 2.2 : 1.6);
      if (has("family")) tryWalls([["left", "center"], ["right", "center"]], 1.7, 0.9, 0.45, "fabric");
      if (has("formal")) { tryWalls([["front", "center"], ["left", "center"], ["right", "center"]], 1.9, 0.85, 0.45, "fabric"); tryWalls([["left", "center"], ["right", "center"]], 0.85, 0.85, 0.45, "fabric2"); }
      if (has("office")) desk(true, 1.3);
      free(mk(mid.x, mid.t, 1.0, 0.6, 0.4, "wood"));
      free(mk(mid.x, mid.t, 2.2, 1.5, 0.02, "fabric2"), { flat: true });
      tryWalls([["left", "center"], ["right", "center"]], 0.85, 0.85, 0.45, "fabric2");
      tryWalls([["rear", "end"], ["rear", "start"]], 0.3, 0.3, 1.6, "accent");
      tryWalls([["front", "start"], ["front", "end"]], 0.45, 0.45, 1.0, "#4f9d5d");
    } else if (kind === "kitchen" || kind === "dining") {
      if (kind === "kitchen") {
        const cl = Math.min(2.8, Math.max(1.4, (r.w >= r.h ? r.w : r.h) - 1.0));
        const cnt = tryWalls([["rear", "start"], ["left", "start"]], cl, 0.62, 0.9, "wood");
        if (cnt) part(cnt, 0, 0.01, cl, 0.66, 0.04, "light", 0.9);
        if (has("galley") && cnt) { const c2 = tryWalls([[OPP[cnt.wall], "start"], [OPP[cnt.wall], "center"]], cl, 0.62, 0.9, "wood"); if (c2) part(c2, 0, 0.01, cl, 0.66, 0.04, "light", 0.9); }
        if (has("island")) { const isl = free(mk(mid.x, mid.t + 0.2, Math.min(1.8, r.w - 1.4), 0.85, 0.9, "wood")); if (isl) boxes.push(mk(isl.cx, isl.ct, isl.w + 0.06, isl.d + 0.06, 0.05, "light", { y0: 0.9, sub: true })); }
        if (has("bar")) { const br = tryWalls([["front", "center"], ["right", "center"], ["front", "start"]], Math.min(1.8, Math.max(r.w, r.h) - 1.2), 0.5, 1.05, "wood"); if (br) { part(br, 0, 0, br.w > br.d ? br.w + 0.04 : br.d + 0.04, 0.54, 0.05, "light", 1.05); [-0.4, 0.4].forEach(o => part(br, o, 0.5, 0.32, 0.32, 0.05, "accent", 0.62, { sub: true })); } }
        tryWalls([["rear", "end"], ["left", "end"]], 0.75, 0.72, 1.8, "#dfe4ea");
      }
      if (kind === "dining" || (r.w * r.h >= 9 && !has("island"))) {
        const tw = kind === "dining" ? (has("six") ? 2.1 : wide ? 1.6 : 1.2) : 1.4, td = 0.85;
        const t = table(mid.x, mid.t + (kind === "kitchen" ? 0.4 : 0), tw, td, "wood");
        if (t) { [-0.5, 0.5].forEach(o => { chair(t.cx + o * (tw / 2), t.ct + td / 2 + 0.3); chair(t.cx + o * (tw / 2), t.ct - td / 2 - 0.3); }); if (kind === "dining" && tw >= 1.6) chair(t.cx, t.ct + td / 2 + 0.3); if (has("six")) { chair(t.cx - tw / 2 - 0.3, t.ct); chair(t.cx + tw / 2 + 0.3, t.ct); } if (has("bench")) boxes.push(mk(t.cx, t.ct + td / 2 + 0.28, tw - 0.1, 0.35, 0.05, "wood", { y0: 0.42, sub: true })); }
      }
    } else if (kind === "cr") {
      const t = tryWalls([["rear", "start"], ["rear", "center"], ["left", "start"]], 0.4, 0.65, 0.4, "#f4f7f9");
      if (t) part(t, 0, -0.22, 0.38, 0.18, 0.8, "#f4f7f9", 0);
      tryWalls([["rear", "end"], ["left", "end"], ["right", "start"]], 0.6, 0.45, 0.85, "wood", {});
      if (has("tub")) tryWalls([["left", "center"], ["right", "center"], ["front", "start"]], 1.6, 0.72, 0.5, "#f4f7f9");
      tryWalls([["front", "end"], ["front", "start"], ["right", "end"]], 0.9, 0.9, 0.06, "#9fb7c1", { flat: true });
    } else if (kind === "stairsdown") {
      /* last floor: the stairs only go down, so show an opening in the floor with treads dropping away and a rail along the sides */
      const n = 8, len = r.h - 2 * M;
      boxes.push(mk(mid.x, mid.t, r.w - 2 * M, len, 0.01, "#1d2228", { flat: true, y0: 0.02 }));
      for (let k = 0; k < n; k++) {
        const sh = Math.round(200 - k * 18), c = "rgb(" + sh + "," + Math.round(sh * 0.92) + "," + Math.round(sh * 0.7) + ")", inset = 0.05 + k * 0.045;
        boxes.push(mk(mid.x, B.t0 + len * (k + 0.5) / n, Math.max(0.3, r.w - 2 * M - 2 * inset), len / n - 0.04, 0.01, c, { flat: true, y0: 0.03 }));
      }
      [B.x0, B.x1].forEach(x => boxes.push(mk(x, mid.t, 0.05, len, 0.9, "#2b343d", { thin: true, y0: 0 })));
      boxes.push(mk(mid.x, B.t1, r.w - 2 * M, 0.05, 0.9, "#2b343d", { thin: true, y0: 0 }));
    } else if (kind === "stairs") {
      /* every stair type climbs from its rear end toward the front (L and U turn on a landing) */
      const ty = (S.layout && S.layout.stairType) || "straight", rot = r.w > r.h + 0.05 && ty !== "spiral";
      const nw = rot ? (B.t1 - B.t0) : (B.x1 - B.x0), nd = rot ? (B.x1 - B.x0) : (B.t1 - B.t0);
      const blk = (a0, a1, b0, b1, h, c) => {
        const aw = a1 - a0, bl = b1 - b0, ac = (a0 + a1) / 2, bc = (b0 + b1) / 2;
        return rot ? mk(B.x0 + bc, B.t0 + ac, bl, aw, h, c, { y0: 0 }) : mk(B.x0 + ac, B.t1 - bc, aw, bl, h, c, { y0: 0 });
      };
      const tread = "#c9b98f", land = "#dccfa8", rise = 0.28;
      if (ty === "spiral") {
        const R = Math.max(0.3, Math.min(nw, nd) / 2 - 0.35), cx = B.x0 + (B.x1 - B.x0) / 2, ct = B.t0 + (B.t1 - B.t0) / 2;
        for (let k = 0; k < 10; k++) { const an = -Math.PI / 2 + k * Math.PI / 5; boxes.push(mk(cx + R * Math.cos(an), ct + R * Math.sin(an), 0.62, 0.62, rise * (k + 1), tread, { y0: 0 })); }
        boxes.push(mk(cx, ct, 0.16, 0.16, 2.9, "#6b7680", { y0: 0, thin: true }));
      } else if (ty === "L") {
        const rw = nw * 0.45, n1 = 5, n2 = 4, l1 = (nd - rw) / n1, l2 = (nw - rw) / n2;
        for (let j = 0; j < n1; j++) boxes.push(blk(0, rw, j * l1, (j + 1) * l1, rise * (j + 1), tread));
        boxes.push(blk(0, rw, nd - rw, nd, rise * (n1 + 1), land));
        for (let j = 0; j < n2; j++) boxes.push(blk(rw + j * l2, rw + (j + 1) * l2, nd - rw, nd, rise * (n1 + 2 + j), tread));
      } else if (ty === "U") {
        const rw = (nw - 0.12) / 2, lnd = rw * 0.95, n1 = 5, n2 = 4, l1 = (nd - lnd) / n1, l2 = (nd - lnd) / n2;
        for (let j = 0; j < n1; j++) boxes.push(blk(0, rw, j * l1, (j + 1) * l1, rise * (j + 1), tread));
        boxes.push(blk(0, nw, nd - lnd, nd, rise * (n1 + 1), land));
        for (let j = 0; j < n2; j++) boxes.push(blk(nw - rw, nw, (nd - lnd) - (j + 1) * l2, (nd - lnd) - j * l2, rise * (n1 + 2 + j), tread));
      } else {
        const n = 10, ln = nd / n;
        for (let j = 0; j < n; j++) boxes.push(blk(0, nw, j * ln, (j + 1) * ln, rise * (j + 1), tread));
      }
    } else if (kind === "garage") {
      const n = Math.max(1, cars || 1);
      for (let i = 0; i < n; i++) {
        const cx = r.x + r.w * (i + 0.5) / n, ct = r.t + r.h / 2;
        const car = mk(cx, ct, 1.8, 4.2, 0.7, "#5b7ba3", { y0: 0.25 });
        if (inside(car)) { boxes.push(car); boxes.push(mk(cx, ct - 0.2, 1.55, 2.1, 0.55, "#cfe3f2", { y0: 0.95, sub: true })); }
      }
    } else {
      const n = String(name || "").toLowerCase();
      if (/store|shop/.test(n)) {
        tryWalls([["rear", "center"], ["rear", "start"]], Math.min(r.w - 0.6, 3.2), 0.4, 1.8, "wood");
        tryWalls([["left", "center"]], 2.2, 0.4, 1.8, "wood");
        tryWalls([["right", "center"]], 2.2, 0.4, 1.8, "wood");
        tryWalls([["front", "center"], ["front", "start"]], Math.min(r.w - 0.8, 2.4), 0.6, 1.0, "accent");
        tryWalls([["rear", "end"], ["right", "end"]], 0.8, 0.7, 1.9, "#dfe4ea");
        free(mk(mid.x, mid.t, 1.4, 0.5, 1.1, "wood"));
      } else if (/laundry/.test(n)) { tryWalls([["rear", "start"], ["left", "start"]], 0.65, 0.65, 0.9, "#e8ecef"); tryWalls([["rear", "end"], ["right", "start"]], 0.9, 0.4, 1.8, "wood"); }
      else if (/gym/.test(n)) { tryWalls([["rear", "center"], ["left", "center"]], 0.8, 1.8, 1.2, "dark"); tryWalls([["front", "center"], ["right", "center"]], 1.4, 0.5, 0.45, "fabric"); tryWalls([["left", "start"], ["right", "start"]], 1.0, 0.4, 0.9, "wood"); }
      else if (/maid|guest/.test(n)) { bed(0.95); tryWalls([["left", "start"], ["right", "start"], ["front", "start"]], 0.9, 0.55, 2.0, "wood"); }
      else if (/media|family/.test(n)) { sofaSet(2.2); free(mk(mid.x, mid.t, 1.0, 0.6, 0.4, "wood")); }
      else if (/storage|pantry/.test(n)) { tryWalls([["rear", "center"], ["left", "center"]], 1.2, 0.4, 1.8, "wood"); tryWalls([["left", "start"], ["right", "start"]], 1.0, 0.4, 1.8, "wood"); }
      else if (/prayer/.test(n)) { free(mk(mid.x, mid.t, 1.0, 0.7, 0.02, "fabric"), { flat: true }); tryWalls([["rear", "center"]], 0.9, 0.35, 1.2, "wood"); }
      else { /* study / office / any other room */
        const d = tryWalls([["rear", "center"], ["left", "center"], ["rear", "start"]], 1.3, 0.62, 0.05, "wood", { y0: 0.7 });
        if (d) { [-1, 1].forEach(sg => part(d, sg * 0.58, 0, 0.06, 0.58, 0.7, "wood", 0, { thin: true })); chair(d.cx + (d.wall === "rear" ? 0 : 0.6), d.ct + (d.wall === "rear" ? -0.55 : 0)); }
        tryWalls([["left", "start"], ["right", "start"], ["front", "start"]], 0.9, 0.35, 1.8, "wood");
      }
    }
    return boxes;
  }

  /* ---------- drawing ---------- */
  function html(ctx) {
    const { S, s, X, Z, face, floor, FH, CH, rooms, gp, segDist, TYPES, cut } = ctx;
    const st = styleOf(S), withF = !(S.interior && S.interior.furniture === false);
    const col = c => st[c] || c;
    const base = -(floor * FH);                 // y of this floor's slab
    let out = "";

    /* room floors, with a soft tint per room type so the divisions are easy to read */
    const grain = st.pattern === "plank"
      ? "repeating-linear-gradient(90deg,rgba(0,0,0,.09) 0 1px,transparent 1px 20px)"
      : "linear-gradient(rgba(0,0,0,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.10) 1px,transparent 1px)";
    const gsize = st.pattern === "plank" ? "" : "background-size:26px 26px;";
    /* one continuous slab under the whole footprint, so unlabeled space (hallways, gaps) is floor, never a hole */
    if (gp && gp.length > 2) {
      const xs = gp.map(q => q.x), ys = gp.map(q => q.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const bw = (x1 - x0) * s, bh = (y1 - y0) * s;
      if (bw > 1 && bh > 1) {
        const clip = gp.map(q => `${(((q.x - x0) * s / bw) * 100).toFixed(2)}% ${(((q.y - y0) * s / bh) * 100).toFixed(2)}%`).join(",");
        out += face("rfloor hallfloor", bw, bh, `translate3d(${X((x0 + x1) / 2).toFixed(1)}px,${(base - 1.0).toFixed(1)}px,${Z((y0 + y1) / 2).toFixed(1)}px) rotateX(90deg)`, "",
          `background:${grain},${st.floor};${gsize}clip-path:polygon(${clip});`);
      }
    }
    rooms.forEach(r => {
      const tint = (TYPES[r.type] || {}).color || "#e5e7eb";
      out += face("rfloor", r.w * s, r.h * s, `translate3d(${X(r.x + r.w / 2).toFixed(1)}px,${(base - 1.5).toFixed(1)}px,${Z(r.t + r.h / 2).toFixed(1)}px) rotateX(90deg)`, "",
        `background:${grain},linear-gradient(${tint}66,${tint}66),${st.floor};${gsize}`);
    });

    /* dividing walls: every room edge once, skipping the ones that are the outer wall */
    const segs = new Map();
    const addSeg = (x1, t1, x2, t2) => {
      const r2 = v => Math.round(v * 20) / 20;
      const a = [r2(x1), r2(t1)], b = [r2(x2), r2(t2)];
      const key = (a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? [a, b] : [b, a]).join("|");
      if (!segs.has(key)) segs.set(key, [x1, t1, x2, t2]);
    };
    rooms.forEach(r => { if (ctx.walled && !ctx.walled(r)) return; addSeg(r.x, r.t, r.x + r.w, r.t); addSeg(r.x, r.t + r.h, r.x + r.w, r.t + r.h); addSeg(r.x, r.t, r.x, r.t + r.h); addSeg(r.x + r.w, r.t, r.x + r.w, r.t + r.h); });
    const near = (px, pt) => gp.some((q, i) => segDist({ x: px, y: pt }, q, gp[(i + 1) % gp.length]) < 0.12);
    /* one door per walled room, on the edge that opens onto the hall (or an open room), swung half open into the room */
    const inGp = (px, pt) => { let c = false; for (let k = 0, j = gp.length - 1; k < gp.length; j = k++) { const A = gp[k], Bq = gp[j]; if ((A.y > pt) !== (Bq.y > pt) && px < (Bq.x - A.x) * (pt - A.y) / (Bq.y - A.y) + A.x) c = !c; } return c; };
    const doors = [];
    rooms.forEach(r => {
      if (r.type === "stairs" || (TYPES[r.type] || {}).outdoor || (ctx.walled && !ctx.walled(r))) return;
      const E = [[r.x + r.w / 2, r.t, 1, 0, 0, 1, r.w], [r.x + r.w / 2, r.t + r.h, 1, 0, 0, -1, r.w], [r.x, r.t + r.h / 2, 0, 1, 1, 0, r.h], [r.x + r.w, r.t + r.h / 2, 0, 1, -1, 0, r.h]];
      let best = null;
      E.forEach(([cx, ct, ux, ut, nx, nt, len]) => {
        if (len < 1.5) return;
        const sx = cx - nx * 0.4, st2 = ct - nt * 0.4;      // a point just outside the room
        let sc;
        if (!inGp(sx, st2)) sc = -1;
        else { const o = rooms.find(q => q !== r && sx > q.x && sx < q.x + q.w && st2 > q.t && st2 < q.t + q.h); sc = !o ? 3 : (ctx.walled && ctx.walled(o) ? 0.5 : 2); }
        if (sc < 0) return;
        if (!best || sc > best.sc || (sc === best.sc && len > best.len)) best = { sc, len, cx, ct, ux, ut, nx, nt };
      });
      if (best) doors.push(best);
    });
    const DW = 0.9, DH = 2.1;
    segs.forEach(([x1, t1, x2, t2]) => {
      const len = Math.hypot(x2 - x1, t2 - t1);
      if (len < 0.3) return;
      const m = [(x1 + x2) / 2, (t1 + t2) / 2];
      if (near(m[0], m[1]) && near(x1 + (x2 - x1) * 0.2, t1 + (t2 - t1) * 0.2) && near(x1 + (x2 - x1) * 0.8, t1 + (t2 - t1) * 0.8)) return;   // already an outer wall
      const vx = (x2 - x1) / len, vt = (t2 - t1) / len, th = Math.atan2(t2 - t1, x2 - x1) * 180 / Math.PI;
      /* doors that sit on this wall piece */
      const cuts = [];
      doors.forEach(d => {
        const px = d.cx - x1, pt = d.ct - t1, along = px * vx + pt * vt, off = Math.abs(px * vt - pt * vx);
        if (off < 0.12 && along - DW / 2 >= -0.01 && along + DW / 2 <= len + 0.01) cuts.push({ a: along - DW / 2, b: along + DW / 2, d });
      });
      cuts.sort((p, q) => p.a - q.a);
      const piece = (p0, p1) => {
        if (p1 - p0 < 0.05) return;
        const cm = (p0 + p1) / 2, mx = x1 + vx * cm, mt = t1 + vt * cm;
        out += face("pwall sh-side", (p1 - p0) * s, CH, `translate3d(${X(mx).toFixed(1)}px,${(base - CH / 2).toFixed(1)}px,${Z(mt).toFixed(1)}px) rotateY(${th.toFixed(2)}deg)`, "", `background:${st.wall};`);
      };
      let cur = 0;
      cuts.forEach(c => {
        piece(cur, c.a); cur = c.b;
        const cx = x1 + vx * (c.a + c.b) / 2, ct = t1 + vt * (c.a + c.b) / 2, lh = Math.max(CH - DH * s, 2);
        out += face("pwall sh-side", DW * s, lh, `translate3d(${X(cx).toFixed(1)}px,${(base - DH * s - lh / 2).toFixed(1)}px,${Z(ct).toFixed(1)}px) rotateY(${th.toFixed(2)}deg)`, "", `background:${st.wall};`);   // wall above the door
        /* the door leaf, hinged at one side and swung 65 degrees into the room */
        const d = c.d, hx = cx - d.ux * DW / 2, ht = ct - d.ut * DW / 2, sw = 65 * Math.PI / 180;
        const lx = d.ux * Math.cos(sw) + d.nx * Math.sin(sw), lt = d.ut * Math.cos(sw) + d.nt * Math.sin(sw);
        const mx = hx + lx * DW / 2, mt = ht + lt * DW / 2, al = Math.atan2(lt, lx) * 180 / Math.PI;
        out += face("pwall sh-side doorleaf", DW * s, (DH - 0.05) * s, `translate3d(${X(mx).toFixed(1)}px,${(base - (DH - 0.05) * s / 2).toFixed(1)}px,${Z(mt).toFixed(1)}px) rotateY(${al.toFixed(2)}deg)`, "", `background:${col("wood")};border:1px solid rgba(0,0,0,.35);`);
      });
      piece(cur, len);
    });

    /* furniture */
    const fxBox = (b, bx) => {
      const w = b.w * s, d = b.d * s, h = Math.max(b.h * s, 0.6), y = base - (b.y0 || 0) * s, px = X(b.cx), pz = Z(b.ct);
      const bg = `background:${col(b.c)};`;
      let o = "";
      o += face("fx fxtop", w, d, `translate3d(${px.toFixed(1)}px,${(y - h).toFixed(1)}px,${pz.toFixed(1)}px) rotateX(90deg)`, "", bg);
      if (b.flat) return o;
      o += face("fx sh-front", w, h, `translate3d(${px.toFixed(1)}px,${(y - h / 2).toFixed(1)}px,${(pz + d / 2).toFixed(1)}px)`, "", bg);
      o += face("fx sh-side", d, h, `translate3d(${(px - w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px,${pz.toFixed(1)}px) rotateY(-90deg)`, "", bg);
      if (!b.thin) {
        o += face("fx sh-rear", w, h, `translate3d(${px.toFixed(1)}px,${(y - h / 2).toFixed(1)}px,${(pz - d / 2).toFixed(1)}px) rotateY(180deg)`, "", bg);
        o += face("fx sh-side", d, h, `translate3d(${(px + w / 2).toFixed(1)}px,${(y - h / 2).toFixed(1)}px,${pz.toFixed(1)}px) rotateY(90deg)`, "", bg);
      }
      return o;
    };
    if (withF) rooms.forEach(r => {
      const kind = r.type === "garage" ? "garage" : (r.type === "stairs" && floor >= (S.floors || 1) - 1 ? "stairsdown" : r.type);
      furnish(r, kind, r.name, r.cars).forEach(b => { out += fxBox(b); });
    });

    /* room names that always face the viewer */
    rooms.forEach(r => {
      const tint = (TYPES[r.type] || {}).color || "#e5e7eb";
      const nm = r.type === "stairs" && S.floors > 1 && floor >= S.floors - 1 ? "Stairs down" : r.name;
      const label = `<b>${String(nm).replace(/[<>&]/g, "")}</b><span>${Math.round(r.w * r.h)} sqm</span>`;
      const lw = Math.round(Math.min(150, Math.max(66, r.w * s * 0.95)));
      out += `<div class="face rlabel" style="width:${lw}px;height:32px;margin-left:${-lw / 2}px;margin-top:-16px;border-color:${tint};` +
        `transform:translate3d(${X(r.x + r.w / 2).toFixed(1)}px,${(base - Math.min(2.6 * s, FH * 0.9)).toFixed(1)}px,${Z(r.t + r.h / 2).toFixed(1)}px) rotateY(calc(var(--va,0) * -1deg)) rotateX(calc(var(--vt,0) * 1deg))">${label}</div>`;
    });
    return out;
  }

  return { STYLES, styleOf, html, furnish };
})();