/*
 * 3D characters and animals, built in code from simple shapes.
 * No image or model files: every person is a small jointed rig made of
 * rounded parts, toon-shaded with an ink outline, and animated by hand
 * (walking, breathing, blinking, looking, and a personal idle pose).
 *
 * Colors come from ART.LOOKS (art.js) so the town matches the portraits.
 * Each character is ONE skinned mesh with two draw groups (color + outline),
 * which keeps the whole cast cheap enough for school Chromebooks.
 */
window.Models = (function () {
  "use strict";
  const T = window.THREE;
  const INK = 0x1d1712;
  let gradient = null;

  // ---------- Materials ----------
  let bodyMat = null;
  const outlineMats = {};
  function outlineMat(width) {
    const k = width.toFixed(4);
    if (outlineMats[k]) return outlineMats[k];
    const m = new T.MeshBasicMaterial({ color: INK, side: T.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `vec3 transformed = vec3(position) + normal * ${k};`);
    };
    m.customProgramCacheKey = () => "outline" + k;
    return (outlineMats[k] = m);
  }
  function materials() {
    if (!bodyMat) bodyMat = new T.MeshToonMaterial({ vertexColors: true, gradientMap: gradient });
    return bodyMat;
  }

  // ---------- Rig builder ----------
  // Bones are declared relative to their parent. Parts are placed relative
  // to their bone's rest position and are rigidly attached to that bone.
  function Rig(defs) {
    this.bones = []; this.b = {}; this.at = {};
    defs.forEach(([name, parent, x, y, z]) => {
      const bone = new T.Bone();
      bone.name = name;
      bone.position.set(x, y, z);
      const base = parent ? this.at[parent] : new T.Vector3();
      this.at[name] = base.clone().add(new T.Vector3(x, y, z));
      if (parent) this.b[parent].add(bone);
      this.b[name] = bone;
      bone.userData.i = this.bones.length;
      this.bones.push(bone);
    });
    this.parts = [];
  }
  const _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _p = new T.Vector3(), _s = new T.Vector3();
  Rig.prototype.add = function (geo, color, bone, pos, rot, scale) {
    const w = this.at[bone];
    _p.set(w.x + (pos ? pos[0] : 0), w.y + (pos ? pos[1] : 0), w.z + (pos ? pos[2] : 0));
    _q.setFromEuler(_e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0));
    _s.set(scale ? scale[0] : 1, scale ? scale[1] : 1, scale ? scale[2] : 1);
    _m.compose(_p, _q, _s);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(_m);
    this.parts.push({ g, color: new T.Color(color).convertSRGBToLinear(), bone: this.b[bone].userData.i, outline: !this.detail });
    return this;
  };
  Rig.prototype.build = function (outlineWidth, skinned) {
    // outlined parts first, so the outline draw group can stop before the small details
    this.parts.sort((a, b) => (b.outline ? 1 : 0) - (a.outline ? 1 : 0));
    let total = 0, outlined = 0;
    this.parts.forEach((p) => { if (p.outline) outlined += p.g.attributes.position.count; });
    this.parts.forEach((p) => (total += p.g.attributes.position.count));
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    const si = skinned ? new Uint16Array(total * 4) : null, sw = skinned ? new Float32Array(total * 4) : null;
    let o = 0;
    this.parts.forEach((p) => {
      const n = p.g.attributes.position.count;
      pos.set(p.g.attributes.position.array, o * 3);
      nor.set(p.g.attributes.normal.array, o * 3);
      for (let i = 0; i < n; i++) {
        col[(o + i) * 3] = p.color.r; col[(o + i) * 3 + 1] = p.color.g; col[(o + i) * 3 + 2] = p.color.b;
        if (skinned) { si[(o + i) * 4] = p.bone; sw[(o + i) * 4] = 1; }
      }
      o += n;
      p.g.dispose();
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new T.BufferAttribute(nor, 3));
    geo.setAttribute("color", new T.BufferAttribute(col, 3));
    if (skinned) {
      geo.setAttribute("skinIndex", new T.Uint16BufferAttribute(si, 4));
      geo.setAttribute("skinWeight", new T.Float32BufferAttribute(sw, 4));
    }
    geo.addGroup(0, total, 0);
    geo.addGroup(0, outlined, 1);
    geo.computeBoundingSphere();
    const mats = [materials(), outlineMat(outlineWidth)];
    let mesh;
    if (skinned) {
      mesh = new T.SkinnedMesh(geo, mats);
      mesh.add(this.bones[0]);
      mesh.bind(new T.Skeleton(this.bones));
    } else {
      mesh = new T.Mesh(geo, mats);
    }
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  };

  // ---------- Shape library (shared, low-poly) ----------
  const G = {
    sphere: new T.SphereGeometry(1, 12, 9),
    sphereLo: new T.SphereGeometry(1, 8, 6),
    cyl: (rt, rb, h, seg, open) => new T.CylinderGeometry(rt, rb, h, seg || 12, 1, !!open),
    cap: (r, len) => new T.CapsuleGeometry(r, len, 3, 9),
    box: (w, h, d) => new T.BoxGeometry(w, h, d),
    cone: (r, h, seg) => new T.ConeGeometry(r, h, seg || 10),
    torus: (r, t, rs, ts) => new T.TorusGeometry(r, t, rs || 6, ts || 16),
    lathe: (pts, seg) => new T.LatheGeometry(pts.slice().sort((a, b) => a[1] - b[1]).map(([x, y]) => new T.Vector2(x, y)), seg || 16),
  };
  const shade = (hex, amt) => {
    const c = new T.Color(hex);
    return c.multiplyScalar(1 + amt).getHex();
  };

  // ---------- People ----------
  const SCALE = 1.12; // people stand a little larger than life so faces read on small screens
  // Extra 3D-only settings on top of ART.LOOKS.
  const EXTRA = {
    player:   { coatStyle: "duster", pose: "relaxed" },
    mrsbrown: { pose: "clasped" },
    whitcomb: { coatStyle: "frock", pose: "ledger", nervous: true },
    pruitt:   { pose: "crossed", apronLong: true, shirtSleeves: true },
    pike:     { coatStyle: "vest", pose: "behind" },
    tuttle:   { pose: "reading", collar: "lace" },
    grayson:  { pose: "hammer", rolled: true, apronLong: true, shirtSleeves: true },
    byrne:    { pose: "hip" },
    bell:     { pose: "shout", shirtSleeves: true },
    cobb:     { coatStyle: "frock", pose: "crate" },
    hale:     { pose: "book", collar: "white" },
  };

  function human(id) {
    const L = Object.assign({}, window.ART.LOOKS[id] || window.ART.LOOKS.player, EXTRA[id] || {});
    const w = L.build === "heavy" ? 1.22 : L.build === "thin" ? 0.88 : L.build === "strong" ? 1.12 : 1;
    const H = L.build === "thin" ? 1.05 : L.build === "heavy" ? 0.98 : 1;
    const female = !!L.female;
    const rig = new Rig([
      ["root", null, 0, 0, 0],
      ["hips", "root", 0, 0.92 * H, 0],
      ["spine", "hips", 0, 0.06, 0],
      ["head", "spine", 0, 0.5 * H, 0],
      ["eyes", "head", 0, 0.15, 0.135],
      ["armL", "spine", 0.19 * w, 0.42 * H, 0],
      ["foreL", "armL", 0, -0.27, 0],
      ["armR", "spine", -0.19 * w, 0.42 * H, 0],
      ["foreR", "armR", 0, -0.27, 0],
      ["legL", "hips", 0.085 * w, -0.03, 0],
      ["shinL", "legL", 0, -0.42 * H, 0],
      ["legR", "hips", -0.085 * w, -0.03, 0],
      ["shinR", "legR", 0, -0.42 * H, 0],
    ]);
    const skin = L.skin, hair = L.hair, top = L.coat, shirt = L.shirt || L.coat, pants = L.pants || "#3d3a36";
    const boot = "#2a211b", sleeve = L.shirtSleeves ? shirt : top;
    const add = (...a) => rig.add(...a);

    // legs and boots
    ["L", "R"].forEach((s) => {
      add(G.cap(0.078 * w, 0.24), pants, "leg" + s, [0, -0.2, 0]);
      add(G.cap(0.066 * w, 0.26), pants, "shin" + s, [0, -0.2, 0]);
      add(G.cyl(0.062 * w, 0.07 * w, 0.12, 10), boot, "shin" + s, [0, -0.36, 0]);
      add(G.sphere, boot, "shin" + s, [0, -0.41, 0.04], null, [0.075 * w, 0.05, 0.125]);
    });
    // hips
    rig.detail = true; // tucked inside the torso and legs, so no outline
    add(G.sphere, female ? top : pants, "hips", [0, 0.02, 0], null, [0.15 * w, 0.115, 0.115]);
    rig.detail = false;
    if (female) {
      add(G.lathe([[0.0, 0.08], [0.15 * w, 0.06], [0.17 * w, -0.05], [0.23 * w, -0.35], [0.29 * w, -0.68], [0.32 * w, -0.84]], 18), top, "hips", [0, 0, 0]);
    }
    // torso
    add(G.cyl(0.165 * w, 0.145 * w, 0.48 * H, 14), top, "spine", [0, 0.18 * H, 0], null, [1, 1, 0.8]);
    if (!female && L.coatStyle !== "frock" && L.coatStyle !== "duster") add(G.cyl(0.152 * w, 0.152 * w, 0.045, 14), "#2a211b", "hips", [0, 0.07, 0], null, [1, 1, 0.82]);
    add(G.sphere, top, "spine", [0, 0.4 * H, 0], null, [0.2 * w, 0.085, 0.135]);
    if (L.build === "heavy") add(G.sphere, top, "spine", [0, 0.12, 0.03], null, [0.17 * w, 0.18, 0.16]);
    // shirt front for open coats
    if (L.coatStyle === "frock" || L.coatStyle === "duster" || L.coatStyle === "vest") {
      add(G.box(0.1 * w, 0.24, 0.02), shirt, "spine", [0, 0.31 * H, 0.112 * w]);
    }
    if (L.coatStyle === "vest") {
      // white shirt shoulders under the vest
      add(G.sphere, shirt, "spine", [0, 0.41 * H, -0.005], null, [0.205 * w, 0.07, 0.125]);
    }
    // coat tails
    if (L.coatStyle === "frock") add(G.cyl(0.14 * w, 0.22 * w, 0.46, 14, true), top, "hips", [0, -0.2, 0], null, [1, 1, 0.8]);
    if (L.coatStyle === "duster") add(G.cyl(0.14 * w, 0.27 * w, 0.64, 14, true), top, "hips", [0, -0.29, 0], null, [1, 1, 0.82]);
    // aprons
    if (L.acc === "apron") {
      add(G.box(0.22 * w, 0.3, 0.02), L.apron, "spine", [0, 0.22 * H, 0.118 * w + 0.01]);
      add(G.box(0.3 * w, L.apronLong ? 0.5 : 0.36, 0.02), L.apron, "hips", [0, L.apronLong ? -0.2 : -0.13, 0.13 * w]);
    }
    if (L.acc === "shawl") {
      add(G.lathe([[0.06, 0.06], [0.2 * w, 0.0], [0.23 * w, -0.1], [0.21 * w, -0.2]], 16), L.shawl, "spine", [0, 0.48 * H, 0], null, [1, 1, 0.82]);
      add(G.cone(0.08, 0.18, 4), L.shawl, "spine", [0, 0.26 * H, 0.12], [Math.PI, 0, 0], [1, 1, 0.3]);
    }
    if (L.acc === "bowtie") {
      add(G.cone(0.03, 0.05, 4), "#1d1b1a", "spine", [0.025, 0.47 * H, 0.1], [0, 0, Math.PI / 2]);
      add(G.cone(0.03, 0.05, 4), "#1d1b1a", "spine", [-0.025, 0.47 * H, 0.1], [0, 0, -Math.PI / 2]);
    }
    if (L.acc === "cravat") add(G.cone(0.035, 0.12, 4), "#7a2e2a", "spine", [0, 0.42 * H, 0.115], [Math.PI, 0, 0], [1, 1, 0.4]);
    if (L.collar === "lace" || L.collar === "white") add(G.torus(0.075, 0.022, 5, 14), L.collar === "lace" ? "#f4efe2" : "#f6f3ea", "spine", [0, 0.49 * H, 0.01], [Math.PI / 2, 0, 0]);
    if (L.collar === "high") add(G.cyl(0.065, 0.075, 0.07, 12), top, "spine", [0, 0.5 * H, 0]);
    if (L.acc === "rope") {
      add(G.torus(0.1, 0.026, 6, 16), "#b8925a", "spine", [0.12 * w, 0.33 * H, 0.1], [0.15, 0.35, 0.5]);
      add(G.torus(0.085, 0.022, 6, 16), "#a8824a", "spine", [0.13 * w, 0.31 * H, 0.115], [0.15, 0.35, 0.7]);
    }
    if (L.acc === "crate") add(G.box(0.15, 0.15, 0.95), "#9b7348", "spine", [-0.27 * w, 0.14, 0.06], [0.22, 0, 0]);

    // arms and hands
    ["L", "R"].forEach((s) => {
      add(G.cap(0.052 * w, 0.17), sleeve, "arm" + s, [0, -0.13, 0]);
      add(G.cap(0.046 * w, 0.15), L.rolled ? skin : sleeve, "fore" + s, [0, -0.12, 0]);
      if (L.rolled) add(G.torus(0.05 * w, 0.018, 5, 12), sleeve, "fore" + s, [0, -0.02, 0], [Math.PI / 2, 0, 0]);
      add(G.sphere, skin, "fore" + s, [0, -0.275, 0.005], null, [0.045, 0.055, 0.04]);
    });
    if (L.coatStyle === "frock" || L.coatStyle === "duster") ["L", "R"].forEach((s) => add(G.torus(0.05 * w, 0.014, 5, 12), shirt, "fore" + s, [0, -0.215, 0], [Math.PI / 2, 0, 0]));
    // held props (right hand = foreR)
    const hand = [0, -0.29, 0.03];
    if (L.acc === "ledger") add(G.box(0.17, 0.23, 0.035), "#6b3f26", "foreR", [0, -0.3, 0.06]);
    if (L.acc === "book") add(G.box(0.13, 0.04, 0.17), "#7a2e2a", "foreR", [0, -0.3, 0.06]);
    if (L.acc === "envelope") add(G.box(0.13, 0.085, 0.008), "#f4efe2", "foreR", [0, -0.33, 0.03]);
    if (L.acc === "notebook") add(G.box(0.08, 0.11, 0.02), "#7a2e2a", "foreR", [0, -0.31, 0.04]);
    if (id === "bell") add(G.box(0.2, 0.28, 0.008), "#efe8d6", "foreR", [0, -0.37, 0.02]);
    if (id === "grayson") {
      add(G.cyl(0.014, 0.014, 0.3, 6), "#7a5a3a", "foreR", [0, -0.29, 0.13], [Math.PI / 2, 0, 0]);
      add(G.box(0.06, 0.06, 0.13), "#3b3b40", "foreR", [0, -0.29, 0.28], [0, Math.PI / 2, 0]);
    }

    // neck and head
    add(G.cyl(0.05, 0.058, 0.1, 10), skin, "head", [0, 0.02, 0]);
    add(G.sphere, skin, "head", [0, 0.155, 0], null, [0.148, 0.165, 0.148]);
    add(G.sphere, skin, "head", [0, 0.085, 0.035], null, [0.12, 0.09, 0.12]); // jaw
    add(G.sphereLo, skin, "head", [0.145, 0.15, -0.005], null, [0.022, 0.036, 0.03]);
    add(G.sphereLo, skin, "head", [-0.145, 0.15, -0.005], null, [0.022, 0.036, 0.03]);
    rig.detail = true;
    ["L", "R"].forEach((s, i) => {
      const sx = i ? -1 : 1;
      // eyes (on their own bone so they can blink) with a tiny highlight
      add(G.sphereLo, "#1d1712", "eyes", [0.052 * sx, 0, 0], null, [0.021, 0.029, 0.014]);
      add(G.sphereLo, "#ffffff", "eyes", [0.052 * sx + 0.007, 0.01, 0.011], null, [0.006, 0.006, 0.004]);
      // brows
      add(G.box(0.055, 0.013, 0.014), L.hairStyle === "balding" ? shade(L.hair, -0.35) : shade(hair, -0.2), "head", [0.055 * sx, 0.215, 0.135], [0, 0, 0.12 * sx]);
    });
    add(G.sphereLo, shade(skin, -0.08), "head", [0, 0.125, 0.15], null, [0.024, 0.032, 0.03]); // nose
    add(G.box(0.05, 0.01, 0.01), "#6a2c24", "head", [0, 0.07, 0.143]); // mouth
    if (L.freckles) [[-1, 0], [1, 0]].forEach(([sx]) => add(G.sphereLo, "#c46a3a", "head", [0.07 * sx, 0.1, 0.13], null, [0.018, 0.008, 0.005]));
    rig.detail = false;

    // hair
    const cap = (sy, y) => add(G.sphere, hair, "head", [0, y, -0.012], null, [0.156, sy, 0.157]);
    const hs = L.hairStyle;
    if (hs === "short") cap(0.12, 0.2);
    if (hs === "cropped") cap(0.11, 0.215);
    if (hs === "bunMiddle") { cap(0.12, 0.205); add(G.sphere, hair, "head", [0, 0.17, -0.165], null, [0.07, 0.065, 0.06]); }
    if (hs === "bunTop") { cap(0.12, 0.205); add(G.sphere, hair, "head", [0, 0.33, -0.04], null, [0.07, 0.06, 0.07]); }
    if (hs === "curly") {
      cap(0.12, 0.2);
      [[0, 0.3, 0.05], [0.09, 0.28, 0.03], [-0.09, 0.28, 0.03], [0.06, 0.29, -0.08], [-0.06, 0.29, -0.08], [0.13, 0.22, 0.06], [-0.13, 0.22, 0.06]].forEach((p) => add(G.sphereLo, hair, "head", p, null, [0.062, 0.058, 0.062]));
    }
    if (hs === "balding") {
      [-1, 1].forEach((sx) => add(G.sphere, hair, "head", [0.135 * sx, 0.175, -0.04], null, [0.04, 0.06, 0.08]));
      add(G.sphere, hair, "head", [0, 0.16, -0.12], null, [0.11, 0.065, 0.055]);
    }
    // facial hair
    rig.detail = true;
    if (L.facial === "mustache") [-1, 1].forEach((sx) => add(G.sphereLo, hair, "head", [0.033 * sx, 0.092, 0.146], [0, 0, 0.35 * sx], [0.042, 0.018, 0.02]));
    rig.detail = false;
    if (L.facial === "muttonchops") [-1, 1].forEach((sx) => add(G.sphere, hair, "head", [0.118 * sx, 0.085, 0.075], [0, 0.35 * sx, 0], [0.026, 0.06, 0.045]));
    if (L.facial === "shortbeard") {
      add(G.sphere, hair, "head", [0, 0.06, 0.04], null, [0.13, 0.085, 0.115]);
      add(G.box(0.05, 0.01, 0.01), "#6a2c24", "head", [0, 0.078, 0.157]);
    }
    if (L.facial === "chinbeard") add(G.cone(0.035, 0.11, 8), hair, "head", [0, -0.015, 0.11], [Math.PI + 0.3, 0, 0]);
    // glasses
    if (L.glasses) {
      rig.detail = true;
      const gy = L.glasses === "half" ? 0.135 : 0.15, gc = L.glasses === "wire" ? "#7d756c" : "#1d1712";
      [-1, 1].forEach((sx) => add(G.torus(0.03, 0.006, 4, 12), gc, "head", [0.052 * sx, gy, 0.155]));
      add(G.box(0.04, 0.006, 0.006), gc, "head", [0, gy + 0.005, 0.158]);
      rig.detail = false;
    }
    // hats
    const hc = L.hatColor;
    if (L.hat === "slouch" || L.hat === "wide") {
      const r = L.hat === "wide" ? 0.32 : 0.27;
      add(G.cyl(r, r, 0.02, 22), hc, "head", [0, 0.265, 0.005], [-0.06, 0, 0]);
      add(G.cyl(0.13, 0.155, 0.15, 14), hc, "head", [0, 0.345, 0]);
      add(G.cyl(0.157, 0.157, 0.035, 14), shade(hc, -0.4), "head", [0, 0.29, 0]);
    }
    if (L.hat === "stovepipe") {
      add(G.cyl(0.22, 0.22, 0.02, 20), hc, "head", [0, 0.27, 0]);
      add(G.cyl(0.145, 0.135, 0.38, 14), hc, "head", [0, 0.46, 0]);
      add(G.cyl(0.14, 0.14, 0.05, 14), "#4a4440", "head", [0, 0.31, 0]);
    }
    if (L.hat === "flatcap") {
      add(G.sphere, hc, "head", [0, 0.25, 0.02], [-0.12, 0, 0], [0.175, 0.085, 0.19]);
      add(G.cyl(0.11, 0.11, 0.016, 14, false), shade(hc, -0.15), "head", [0, 0.235, 0.17], [0.15, 0, 0], [1, 1, 0.6]);
    }
    if (L.hat === "visor") {
      add(G.cyl(0.158, 0.158, 0.045, 16, true), shade(hc, -0.2), "head", [0, 0.245, 0]);
      add(G.box(0.24, 0.012, 0.13), hc, "head", [0, 0.25, 0.185], [0.32, 0, 0]);
    }

    const mesh = rig.build(0.015, true);
    const root = new T.Group();
    root.scale.setScalar(SCALE);
    root.add(mesh);
    // simple blob shadow keeps them grounded even with shadows off
    const blob = new T.Mesh(new T.CircleGeometry(0.34 * w, 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
    root.add(blob);
    // invisible hit volume for clicks
    const hit = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 1.9 * H, 8), new T.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.95 * H;
    root.add(hit);

    const st = {
      kind: "human", id, root, mesh, hit, b: rig.b, look: L, H: H * SCALE,
      t: Math.random() * 10, walk: 0, mv: 0, yaw: 0, headYaw: 0,
      blinkIn: 1 + Math.random() * 3, blink: 0, pose: L.pose || "relaxed", nervous: !!L.nervous,
      hipsY: rig.b.hips.position.y,
    };
    setPose(st, 1);
    return st;
  }

  // ---------- Arm poses ----------
  // Directions are in the spine's space for the LEFT arm (+x is outward).
  // The right arm mirrors x unless a pose gives it its own directions.
  const POSES = {
    relaxed: { L: [[0.12, -1, 0.02], [0.08, -1, 0.14]] },
    clasped: { L: [[0.12, -1, 0.3], [-0.55, -0.45, 0.75]] },
    crossed: { L: [[0.2, -1, 0.35], [-1, 0.12, 0.42]], R: [[-0.2, -1, 0.3], [1, 0.25, 0.4]] },
    behind: { L: [[0.16, -1, -0.38], [-0.6, -0.35, -0.55]] },
    ledger: { L: [[0.2, -1, 0.3], [-0.6, 0.55, 0.6]], R: [[-0.2, -1, 0.32], [0.5, 0.6, 0.62]] },
    book: { L: [[0.12, -1, 0.35], [-0.4, 0.1, 1]], R: [[-0.12, -1, 0.35], [0.3, 0.15, 1]] },
    reading: { L: [[0.12, -1, 0.02], [0.08, -1, 0.14]], R: [[-0.25, -0.25, 0.9], [0.05, 0.85, 0.55]] },
    crate: { L: [[0.12, -1, 0.05], [0.1, -1, 0.25]], R: [[-0.3, -1, 0.05], [0.15, -0.15, 1]] },
    hip: { L: [[0.6, -0.75, -0.05], [-0.85, -0.3, 0.2]], R: [[-0.12, -1, 0.02], [-0.08, -1, 0.14]] },
    shout: { L: [[0.3, -0.45, 0.8], [-0.55, 0.85, 0.2]], R: [[-0.55, 0.65, 0.25], [-0.05, 1, 0.1]] },
    hammerUp: { L: [[0.18, -1, 0.45], [0.05, -0.55, 1]], R: [[-0.3, 0.45, 0.65], [0, 0.8, 0.6]] },
    hammerDown: { L: [[0.18, -1, 0.45], [0.05, -0.55, 1]], R: [[-0.25, -0.55, 0.8], [0, -0.7, 0.9]] },
    walkOnlyLegs: null,
  };
  const DOWN = new T.Vector3(0, -1, 0);
  const _a = new T.Vector3(), _f = new T.Vector3(), _qa = new T.Quaternion(), _qf = new T.Quaternion(), _qi = new T.Quaternion();
  function aimArm(st, side, upper, fore, rate) {
    const arm = st.b["arm" + side], fa = st.b["fore" + side];
    _a.set(upper[0], upper[1], upper[2]).normalize();
    _qa.setFromUnitVectors(DOWN, _a);
    _f.set(fore[0], fore[1], fore[2]).normalize();
    _qi.copy(_qa).invert();
    _f.applyQuaternion(_qi);
    _qf.setFromUnitVectors(DOWN, _f);
    if (rate >= 1) { arm.quaternion.copy(_qa); fa.quaternion.copy(_qf); }
    else { arm.quaternion.slerp(_qa, rate); fa.quaternion.slerp(_qf, rate); }
  }
  function poseDirs(name, side) {
    const p = POSES[name] || POSES.relaxed;
    if (side === "L") return p.L;
    if (p.R) return p.R;
    return p.L.map((v) => [-v[0], v[1], v[2]]);
  }
  function setPose(st, rate) {
    ["L", "R"].forEach((s) => { const [u, f] = poseDirs(st.pose, s); aimArm(st, s, u, f, rate); });
  }

  // ---------- Animation ----------
  // ctx: { moving, speed, look: {x,z} or null, talking }
  function animateHuman(st, dt, ctx) {
    st.t += dt;
    const b = st.b;
    const mvTarget = ctx.moving ? 1 : 0;
    st.mv += (mvTarget - st.mv) * Math.min(1, dt * 10);
    if (ctx.moving) st.walk += dt * (ctx.speed || 1.2) * 3.6;
    const mv = st.mv, s = Math.sin(st.walk), c = Math.cos(st.walk);
    const amp = Math.min(1, 0.45 + (ctx.speed || 1.2) * 0.12);

    // legs
    b.legL.rotation.x = -s * 0.62 * amp * mv;
    b.legR.rotation.x = s * 0.62 * amp * mv;
    b.shinL.rotation.x = mv * (0.12 + 0.9 * amp * Math.max(0, -s));
    b.shinR.rotation.x = mv * (0.12 + 0.9 * amp * Math.max(0, s));
    // hips and spine
    b.hips.position.y = st.hipsY + mv * (Math.abs(c) * 0.04 * amp - 0.025);
    b.hips.rotation.y = -s * 0.07 * mv;
    b.spine.rotation.y = s * 0.12 * mv;
    b.spine.rotation.x = Math.sin(st.t * 1.7) * 0.018 * (1 - mv) + 0.06 * mv * amp;
    b.spine.scale.set(1, 1 + Math.sin(st.t * 1.7) * 0.012 * (1 - mv), 1);

    // arms: personal pose, swing while walking, or special idles
    let pose = st.pose;
    const holds = pose !== "relaxed" && pose !== "clasped" && pose !== "behind" && pose !== "hip";
    if (mv > 0.5 && !holds) {
      const sw = s * 0.55 * amp;
      aimArm(st, "L", [0.12, -1, -sw], [0.08, -1, -sw + 0.35], Math.min(1, dt * 14));
      aimArm(st, "R", [-0.12, -1, sw], [-0.08, -1, sw + 0.35], Math.min(1, dt * 14));
    } else if (pose === "hammer") {
      const k = (st.t * 1.6) % 1; // raise slowly, strike fast
      const up = k < 0.7 ? k / 0.7 : 1 - (k - 0.7) / 0.3;
      const a = POSES.hammerUp, d = POSES.hammerDown;
      const mix = (u, v) => u.map((x, i) => v[i] + (x - v[i]) * up);
      aimArm(st, "R", mix(a.R[0], d.R[0]), mix(a.R[1], d.R[1]), 1);
      aimArm(st, "L", a.L[0], a.L[1], Math.min(1, dt * 8));
      b.spine.rotation.x += (1 - up) * 0.12;
    } else if (pose === "shout") {
      const wave = Math.sin(st.t * 6) * 0.35;
      aimArm(st, "R", [-0.55, 0.65, 0.25], [-0.05 + wave, 1, 0.1], Math.min(1, dt * 10));
      const [u, f] = poseDirs("shout", "L");
      aimArm(st, "L", u, f, Math.min(1, dt * 8));
    } else {
      ["L", "R"].forEach((sd) => { const [u, f] = poseDirs(pose, sd); aimArm(st, sd, u, f, Math.min(1, dt * 8)); });
    }

    // body facing
    b.root.rotation.y = 0;
    // head: look toward a point, or glance around
    let targetYaw = 0, targetPitch = 0;
    if (ctx.look) {
      const wx = ctx.look.x - st.root.position.x, wz = ctx.look.z - st.root.position.z;
      let d = Math.atan2(wx, wz) - st.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      targetYaw = Math.max(-0.85, Math.min(0.85, d));
    } else if (st.nervous) {
      targetYaw = Math.sin(st.t * 0.9) > 0.6 ? 0.7 : Math.sin(st.t * 1.3) < -0.7 ? -0.7 : 0;
    } else {
      targetYaw = Math.sin(st.t * 0.37) * 0.35 * (1 - mv);
    }
    if (st.pose === "reading" || st.pose === "book") targetPitch = mv < 0.5 && !ctx.look ? 0.3 : 0;
    if (st.pose === "shout") targetPitch = -0.15;
    st.headYaw += (targetYaw - st.headYaw) * Math.min(1, dt * (st.nervous ? 9 : 4));
    b.head.rotation.y = st.headYaw;
    b.head.rotation.x += (targetPitch - b.head.rotation.x) * Math.min(1, dt * 4);
    if (st.nervous && !ctx.look) b.head.position.x = Math.sin(st.t * 23) * 0.003;

    // blinking
    st.blinkIn -= dt;
    if (st.blinkIn < 0) { st.blink = 0.13; st.blinkIn = 2 + Math.random() * 3.5; }
    if (st.blink > 0) st.blink -= dt;
    b.eyes.scale.y = st.blink > 0 ? 0.12 : 1;
  }

  // Turn smoothly toward a world-space yaw.
  function face(st, yaw, dt, rate) {
    let d = yaw - st.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    st.yaw += d * Math.min(1, dt * (rate || 10));
    st.root.rotation.y = st.yaw;
  }

  // ---------- Animals ----------
  function goat() {
    const rig = new Rig([
      ["root", null, 0, 0, 0],
      ["body", "root", 0, 0.42, 0],
      ["head", "body", 0, 0.12, 0.3],
      ["jaw", "head", 0, -0.02, 0.12],
      ["legFL", "body", 0.09, -0.06, 0.2], ["legFR", "body", -0.09, -0.06, 0.2],
      ["legBL", "body", 0.09, -0.06, -0.2], ["legBR", "body", -0.09, -0.06, -0.2],
      ["tail", "body", 0, 0.08, -0.3],
    ]);
    const W = "#f2efe8", horn = "#8a7a62", hoof = "#3a2f28";
    rig.add(G.cap(0.15, 0.36), W, "body", [0, 0, 0], [Math.PI / 2, 0, 0]);
    rig.add(G.cap(0.06, 0.1), W, "head", [0, -0.04, -0.06], [-0.6, 0, 0]);
    rig.add(G.sphere, W, "head", [0, 0.04, 0.04], null, [0.085, 0.09, 0.12]);
    rig.add(G.sphere, "#e6d2c4", "jaw", [0, 0.01, 0.03], null, [0.055, 0.045, 0.06]);
    rig.add(G.cone(0.02, 0.09, 6), "#d9d4c8", "jaw", [0, -0.06, -0.01], [Math.PI, 0, 0]);
    [-1, 1].forEach((sx) => {
      rig.add(G.cone(0.022, 0.13, 6), horn, "head", [0.04 * sx, 0.14, -0.01], [-0.7, 0, 0.15 * sx]);
      rig.add(G.sphere, W, "head", [0.09 * sx, 0.07, -0.01], [0, 0, 0.6 * sx], [0.06, 0.02, 0.035]);
      rig.add(G.sphereLo, "#c9a24a", "head", [0.055 * sx, 0.06, 0.1], null, [0.016, 0.014, 0.01]);
      rig.add(G.box(0.022, 0.006, 0.004), "#1d1712", "head", [0.055 * sx, 0.06, 0.108]);
    });
    // a page of newspaper in his mouth
    rig.add(G.box(0.12, 0.08, 0.005), "#efe8d6", "jaw", [0.05, 0, 0.06], [0.2, 0.6, 0.3]);
    ["FL", "FR", "BL", "BR"].forEach((k) => {
      rig.add(G.cap(0.034, 0.22), W, "leg" + k, [0, -0.15, 0]);
      rig.add(G.cyl(0.034, 0.038, 0.05, 8), hoof, "leg" + k, [0, -0.3, 0]);
    });
    rig.add(G.cone(0.035, 0.09, 6), W, "tail", [0, 0.04, -0.02], [-0.8, 0, 0]);
    const mesh = rig.build(0.012, true);
    return animal("goat", rig, mesh, 0.28);
  }

  function dog() {
    const rig = new Rig([
      ["root", null, 0, 0, 0],
      ["body", "root", 0, 0.29, 0],
      ["head", "body", 0, 0.14, 0.24],
      ["jaw", "head", 0, -0.02, 0.1],
      ["legFL", "body", 0.07, -0.04, 0.15], ["legFR", "body", -0.07, -0.04, 0.15],
      ["legBL", "body", 0.07, -0.04, -0.15], ["legBR", "body", -0.07, -0.04, -0.15],
      ["tail", "body", 0, 0.06, -0.24],
    ]);
    const B = "#a8743f", D = "#6b4526";
    rig.add(G.cap(0.11, 0.26), B, "body", [0, 0, 0], [Math.PI / 2, 0, 0]);
    rig.add(G.sphere, B, "head", [0, 0.02, 0], null, [0.09, 0.085, 0.09]);
    rig.add(G.sphere, "#c99a62", "jaw", [0, 0, 0.04], null, [0.05, 0.045, 0.07]);
    rig.add(G.sphereLo, "#1d1712", "jaw", [0, 0.025, 0.11], null, [0.02, 0.016, 0.014]);
    [-1, 1].forEach((sx) => {
      rig.add(G.sphere, D, "head", [0.075 * sx, 0.02, -0.02], [0, 0, 0.25 * sx], [0.025, 0.07, 0.045]);
      rig.add(G.sphereLo, "#1d1712", "head", [0.04 * sx, 0.04, 0.08], null, [0.014, 0.016, 0.01]);
    });
    ["FL", "FR", "BL", "BR"].forEach((k) => { rig.add(G.cap(0.034, 0.14), B, "leg" + k, [0, -0.11, 0]); rig.add(G.sphereLo, "#c99a62", "leg" + k, [0, -0.22, 0.015], null, [0.035, 0.022, 0.045]); });
    rig.add(G.cap(0.025, 0.18), D, "tail", [0, 0.08, -0.03], [-0.6, 0, 0]);
    const mesh = rig.build(0.01, true);
    return animal("dog", rig, mesh, 0.22);
  }

  function animal(kind, rig, mesh, blobR) {
    const root = new T.Group();
    root.add(mesh);
    const blob = new T.Mesh(new T.CircleGeometry(blobR, 14), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
    root.add(blob);
    return { kind, root, mesh, b: rig.b, t: Math.random() * 10, walk: 0, mv: 0, yaw: 0, bodyY: rig.b.body.position.y };
  }

  function animateQuad(st, dt, ctx) {
    st.t += dt;
    const b = st.b;
    st.mv += ((ctx.moving ? 1 : 0) - st.mv) * Math.min(1, dt * 10);
    if (ctx.moving) st.walk += dt * (ctx.speed || 1) * 7;
    const s = Math.sin(st.walk), mv = st.mv;
    b.legFL.rotation.x = s * 0.6 * mv; b.legBR.rotation.x = s * 0.6 * mv;
    b.legFR.rotation.x = -s * 0.6 * mv; b.legBL.rotation.x = -s * 0.6 * mv;
    b.body.position.y = st.bodyY + Math.abs(Math.cos(st.walk)) * 0.03 * mv;
    // tail wag and idle head moves
    b.tail.rotation.y = Math.sin(st.t * (st.kind === "dog" ? 12 : 4)) * (st.kind === "dog" ? 0.6 : 0.3);
    if (st.kind === "goat") {
      b.jaw.rotation.x = Math.max(0, Math.sin(st.t * 7)) * 0.15 * (1 - mv); // chewing
      b.head.rotation.x = Math.sin(st.t * 0.5) * 0.1;
    } else {
      b.head.rotation.y = Math.sin(st.t * 0.6) * 0.3 * (1 - mv);
      b.jaw.rotation.x = ctx.pant ? Math.max(0, Math.sin(st.t * 10)) * 0.12 : 0;
    }
    // sitting dog
    const sit = ctx.sit ? 1 : 0;
    st.sit = (st.sit || 0) + (sit - (st.sit || 0)) * Math.min(1, dt * 6);
    if (st.kind === "dog") {
      b.body.rotation.x = -0.45 * st.sit;
      b.legBL.rotation.x += -0.9 * st.sit; b.legBR.rotation.x += -0.9 * st.sit;
      b.legFL.rotation.x += 0.45 * st.sit; b.legFR.rotation.x += 0.45 * st.sit;
      b.body.position.y -= 0.08 * st.sit;
    }
  }

  function chicken() {
    const rig = new Rig([["root", null, 0, 0, 0], ["body", "root", 0, 0.17, 0]]);
    const W = "#f6f1e6";
    rig.add(G.sphere, W, "body", [0, 0, 0], null, [0.09, 0.08, 0.11]);
    rig.add(G.cone(0.05, 0.1, 6), W, "body", [0, 0.06, -0.1], [-0.9, 0, 0]);
    rig.add(G.sphere, W, "body", [0, 0.09, 0.08], null, [0.05, 0.055, 0.05]);
    rig.add(G.sphereLo, "#c0392b", "body", [0, 0.15, 0.08], null, [0.012, 0.03, 0.03]);
    rig.add(G.cone(0.015, 0.04, 5), "#e8a33a", "body", [0, 0.085, 0.135], [Math.PI / 2, 0, 0]);
    [-1, 1].forEach((sx) => {
      rig.add(G.sphereLo, "#1d1712", "body", [0.035 * sx, 0.1, 0.11], null, [0.008, 0.009, 0.006]);
      rig.add(G.cyl(0.008, 0.008, 0.1, 5), "#e0a23a", "body", [0.03 * sx, -0.12, 0]);
    });
    const mesh = rig.build(0.008, false);
    const root = new T.Group();
    const pivot = new T.Group(); // pecking tilts around the feet
    pivot.add(mesh);
    root.add(pivot);
    return { kind: "chicken", root, pivot, mesh, t: Math.random() * 10, yaw: 0, mv: 0 };
  }
  function animateChicken(st, dt, ctx) {
    st.t += dt;
    const peck = !ctx.moving && Math.sin(st.t * 1.3) > 0.55 ? Math.max(0, Math.sin(st.t * 14)) : 0;
    st.pivot.rotation.x = peck * 0.7;
    st.pivot.position.y = ctx.moving ? Math.abs(Math.sin(st.t * 16)) * 0.05 : 0;
  }

  return {
    init(gradientMap) { gradient = gradientMap; },
    human, goat, dog, chicken,
    animate(st, dt, ctx) {
      if (st.kind === "human") animateHuman(st, dt, ctx);
      else if (st.kind === "chicken") animateChicken(st, dt, ctx);
      else animateQuad(st, dt, ctx);
    },
    face,
  };
})();
