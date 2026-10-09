/*
 * Wood and parchment textures for the interface, generated once at load.
 * No image files: grain, plank seams, and paper fibers come from tileable
 * value noise, and each texture is handed to the CSS as a custom property
 * (--tex-planks, --tex-planks-dark, --tex-board, --tex-board-light,
 * --tex-paper). Until they are ready the CSS falls back to flat colors.
 */
(function () {
  "use strict";

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Tileable value noise: a lattice that wraps in both directions.
  function lattice(cx, cy, r) {
    const a = new Float32Array(cx * cy);
    for (let i = 0; i < a.length; i++) a[i] = r();
    return { cx, cy, a };
  }
  function vnoise(L, u, v) {
    const x = u * L.cx, y = v * L.cy;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % L.cx) + L.cx) % L.cx, x1 = (x0 + 1) % L.cx;
    const y0 = ((yi % L.cy) + L.cy) % L.cy, y1 = (y0 + 1) % L.cy;
    const s = xf * xf * (3 - 2 * xf), t = yf * yf * (3 - 2 * yf);
    const a = L.a[y0 * L.cx + x0], b = L.a[y0 * L.cx + x1], c = L.a[y1 * L.cx + x0], d = L.a[y1 * L.cx + x1];
    return a + (b - a) * s + (c - a) * t + (a - b - c + d) * s * t;
  }
  function fbm(Ls, u, v) {
    let sum = 0, amp = 0.5, norm = 0;
    for (const L of Ls) { sum += vnoise(L, u, v) * amp; norm += amp; amp *= 0.5; }
    return sum / norm;
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

  // Horizontal planks with long grain, ring bands, and dark seams.
  function wood(W, H, o) {
    const r = rng(o.seed);
    const warp = [lattice(3, 6, r), lattice(6, 12, r), lattice(12, 24, r)];
    const streak = [lattice(10, 96, r), lattice(20, 192, r)];
    const knotL = lattice(4, 4 * o.planks, r);
    const dark = hex(o.dark), mid = hex(o.mid), light = hex(o.light);
    const ph = H / o.planks;
    const tone = [], phase = [];
    for (let i = 0; i < o.planks; i++) { tone.push((r() - 0.5) * 0.22); phase.push(r()); }
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) {
      const p = Math.floor(y / ph), py = (y - p * ph) / ph;
      const edge = Math.min(py, 1 - py);
      for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H;
        const w = fbm(warp, u, v);
        const band = 0.5 + 0.5 * Math.sin(Math.PI * 2 * (py * o.rings + w * 2.2 + phase[p]));
        const fine = fbm(streak, u, v);
        // occasional knots: tight rings where a slow noise peaks
        const k = vnoise(knotL, u, v);
        const knot = k > 0.86 ? (k - 0.86) / 0.14 : 0;
        let t = 0.12 + 0.48 * band * band + 0.4 * fine + tone[p];
        if (knot) t = t * (1 - knot * 0.6) + 0.5 * knot * (0.5 + 0.5 * Math.sin(knot * 40));
        t *= 0.78 + 0.22 * clamp(edge / 0.14);
        t = clamp(t);
        const col = t < 0.5 ? [0, 1, 2].map((i) => dark[i] + (mid[i] - dark[i]) * (t / 0.5)) : [0, 1, 2].map((i) => mid[i] + (light[i] - mid[i]) * ((t - 0.5) / 0.5));
        const j = (y * W + x) * 4;
        d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
      }
    }
    // seams between planks: a dark gap with a lit lip below it
    if (o.planks > 1) {
      for (let p = 0; p < o.planks; p++) {
        const y0 = Math.round(p * ph);
        for (let x = 0; x < W; x++) {
          for (let k = 0; k < 3; k++) {
            const j = (((y0 + k) % H) * W + x) * 4;
            const f = k < 2 ? 0.35 : 1.25;
            d[j] = Math.min(255, d[j] * f); d[j + 1] = Math.min(255, d[j + 1] * f); d[j + 2] = Math.min(255, d[j + 2] * f);
          }
        }
      }
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }

  // Aged paper: soft blotches, grain, and a few fibers.
  function paper(W, H, seed) {
    const r = rng(seed);
    const blot = [lattice(3, 3, r), lattice(6, 6, r), lattice(12, 12, r)];
    const grain = [lattice(64, 64, r), lattice(128, 128, r)];
    const base = hex("#efe0bd"), stain = hex("#c9a46a");
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const b = fbm(blot, u, v);
      const s = clamp((b - 0.45) * 1.6) * 0.32;
      const gr = (fbm(grain, u, v) - 0.5) * 18;
      const j = (y * W + x) * 4;
      for (let i = 0; i < 3; i++) d[j + i] = base[i] + (stain[i] - base[i]) * s + gr;
      d[j + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.strokeStyle = "rgba(120, 85, 40, 0.10)";
    g.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const x = r() * W, y = r() * H, a = r() * Math.PI, l = 6 + r() * 18;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    return c.toDataURL("image/png");
  }

  function build() {
    const root = document.documentElement.style;
    const set = (k, url) => root.setProperty(k, `url("${url}")`);
    try {
      set("--tex-planks", wood(512, 256, { seed: 11, planks: 4, rings: 3, dark: "#4a2a17", mid: "#7a4a29", light: "#a8703f" }));
      set("--tex-planks-dark", wood(512, 256, { seed: 23, planks: 4, rings: 3, dark: "#24140b", mid: "#41261a", light: "#62402a" }));
      set("--tex-board", wood(512, 96, { seed: 37, planks: 1, rings: 4, dark: "#5a341c", mid: "#87542f", light: "#b07a48" }));
      set("--tex-board-light", wood(512, 96, { seed: 41, planks: 1, rings: 4, dark: "#9a6a3c", mid: "#c08d58", light: "#dcb07a" }));
      set("--tex-paper", paper(384, 384, 59));
      document.documentElement.classList.add("tex-ready");
    } catch (e) {
      // canvas blocked: the flat fallback colors in the CSS still look like wood and paper
    }
  }
  build();
})();
