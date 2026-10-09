/*
 * The 3D town of Easton, built with three.js (global THREE, r149).
 * Isometric camera, toon shading, free walking with collision,
 * click-to-walk with path finding, and billboard characters.
 *
 * World units are roughly meters. +x is east, +z is south, y is up.
 * Every building's front door faces south (+z), toward the camera.
 */
window.World = (function () {
  "use strict";
  const T = window.THREE;

  // ---------- Layout ----------
  const BOUNDS = { minX: -40, maxX: 40, minZ: -24, maxZ: 26 };
  const CREEK = { minX: 31.6, maxX: 37.2 };
  const ROADS = [
    { x0: -40, x1: 31.6, z0: -2, z1: 2 },     // Main Street
    { x0: -40, x1: 31.6, z0: 14, z1: 18 },    // Back Street
    { x0: -2, x1: 2, z0: -24, z1: 18 },       // Cross street
  ];
  // place id -> building spec. x,z = center. w along x, d along z, h = wall height.
  const BUILDINGS = {
    cabin:   { name: "Brown cabin",   x: -28, z: -8,  w: 6, d: 5,   h: 3.0, style: "log",   wall: "#8a6141", roof: "#5b4636", sign: null },
    polling: { name: "Polling place", x: -16, z: -8,  w: 7, d: 5,   h: 3.4, style: "board", wall: "#e3dccb", roof: "#6b625a", porch: true, sign: "ballot" },
    tavern:  { name: "Tavern",        x: 6,   z: -8.5,w: 9, d: 6,   h: 4.4, style: "board", wall: "#9b4a3a", roof: "#4f3b30", porch: true, sign: "mug" },
    store:   { name: "General store", x: 18,  z: -8.5,w: 8, d: 6,   h: 3.8, style: "board", wall: "#c9b08a", roof: "#5e554d", porch: true, falseFront: true, sign: "barrel" },
    school:  { name: "Schoolhouse",   x: -28, z: 8,   w: 6, d: 5,   h: 3.2, style: "board", wall: "#a8483a", roof: "#4f4740", bell: true, sign: "book" },
    post:    { name: "Post office",   x: -16, z: 8,   w: 5, d: 4.5, h: 3.2, style: "board", wall: "#93a3a8", roof: "#4f4740", sign: "letter" },
    forge:   { name: "Forge",         x: 6,   z: 8,   w: 7, d: 5,   h: 3.2, style: "forge", wall: "#6a5444", roof: "#3f3a36", sign: "anvil" },
    print:   { name: "Print shop",    x: 18,  z: 8,   w: 6, d: 5,   h: 3.6, style: "board", wall: "#d8c9a4", roof: "#5e554d", sign: "press" },
  };
  // Where each character stands.
  const PEOPLE = {
    mrsbrown: { x: -26.6, z: -4.2, place: "cabin" },
    whitcomb: { x: -13.6, z: -3.6, place: "polling" },
    pruitt:   { x: 8.6,   z: -3.4, place: "tavern" },
    pike:     { x: 15.4,  z: -3.4, place: "store" },
    tuttle:   { x: -14.4, z: 11.4, place: "post" },
    grayson:  { x: 7.4,   z: 9.4,  place: "forge" },
    bell:     { x: 16.4,  z: 11.4, place: "print" },
    hale:     { x: -26.4, z: 11.4, place: "school" },
    cobb:     { x: -5.2,  z: 4.6,  place: "wagon" },
    byrne:    { x: 29.2,  z: 3.0,  place: "ferry" },
  };
  const CHAIR = { x: -18.5, z: -4.2 };
  const START = { x: -28, z: 0 };

  // ---------- State ----------
  let renderer, scene, camera, sun, container, labelLayer;
  let viewSize = 24, targetView = 24;
  const camTarget = new T.Vector3(START.x, 0, START.z);
  const colliders = [];      // {minX,maxX,minZ,maxZ} or {x,z,r}
  const fadeables = [];      // {group, materials, opacity}
  const clickables = [];     // meshes with userData.target
  const people = {};         // id -> {mesh, frames, ...}
  let player = null;
  let water = null;
  const keys = {};
  let path = [];
  let pendingTarget = null;
  let paused = true;
  let onInteract = () => {};
  let onNear = () => {};
  let nearId = null;
  let markers = {};
  let shadowsOn = true;
  const clock = new T.Clock();
  let fpsSamples = [], qualityChecked = false;
  const CAM_DIR = new T.Vector3(1, 1.05, 1).normalize();
  const FWD = new T.Vector3(-1, 0, -1).normalize();   // screen up
  const RIGHT = new T.Vector3(1, 0, -1).normalize();  // screen right
  const PR = 0.38; // player radius

  // ---------- Materials ----------
  let gradient;
  function makeGradient() {
    const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
    const t = new T.DataTexture(data, 3, 1, T.RGBAFormat);
    t.minFilter = t.magFilter = T.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }
  const matCache = {};
  function toon(color, opts) {
    if (opts) return new T.MeshToonMaterial(Object.assign({ color, gradientMap: gradient }, opts));
    if (!matCache[color]) matCache[color] = new T.MeshToonMaterial({ color, gradientMap: gradient });
    return matCache[color];
  }
  const edgeMat = new T.LineBasicMaterial({ color: 0x241c16 });

  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    return t;
  }

  // ---------- Geometry helpers ----------
  function addEdges(mesh, parent) {
    const e = new T.LineSegments(new T.EdgesGeometry(mesh.geometry, 20), edgeMat);
    e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); e.scale.copy(mesh.scale);
    (parent || mesh.parent).add(e);
    return e;
  }
  function box(parent, w, h, d, mat, x, y, z, edges) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    if (edges !== false) addEdges(m, parent);
    return m;
  }
  function gable(parent, w, d, rise, mat, x, y, z) {
    const s = new T.Shape();
    s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, rise); s.lineTo(-d / 2, 0);
    const g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
    g.translate(0, 0, -w / 2);
    g.rotateY(Math.PI / 2);
    const m = new T.Mesh(g, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    addEdges(m, parent);
    return m;
  }
  function solid(minX, maxX, minZ, maxZ) { colliders.push({ minX, maxX, minZ, maxZ }); }
  function post(x, z, r) { colliders.push({ x, z, r }); }

  // ---------- Ground ----------
  const PX = 25.6; // texture pixels per world unit
  function buildGround() {
    const W = BOUNDS.maxX - BOUNDS.minX, D = BOUNDS.maxZ - BOUNDS.minZ;
    const tex = canvasTex(W * PX, D * PX, (g, w, h) => {
      const u = (x) => (x - BOUNDS.minX) * PX, v = (z) => (z - BOUNDS.minZ) * PX;
      g.fillStyle = "#93ad5c"; g.fillRect(0, 0, w, h);
      // grass variation
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = ["#8aa556", "#9db766", "#86a050", "#a6bd6c"][i % 4];
        g.globalAlpha = 0.5;
        g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 26, 4 + rnd() * 14, rnd() * 3, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      // dirt yards in front of buildings
      g.fillStyle = "#b9a06e";
      Object.values(BUILDINGS).forEach((b) => {
        g.globalAlpha = 0.55;
        g.beginPath(); g.ellipse(u(b.x), v(b.z + b.d / 2 + 1.6), (b.w / 2 + 1.5) * PX, 2.2 * PX, 0, 0, Math.PI * 2); g.fill();
      });
      g.globalAlpha = 1;
      // roads
      ROADS.forEach((r) => {
        g.fillStyle = "#c2a272";
        g.fillRect(u(r.x0), v(r.z0), (r.x1 - r.x0) * PX, (r.z1 - r.z0) * PX);
        g.strokeStyle = "#a88a5c"; g.lineWidth = 5; g.setLineDash([30, 22]);
        g.beginPath();
        if (r.x1 - r.x0 > r.z1 - r.z0) {
          [0.3, 0.7].forEach((f) => { const zz = v(r.z0 + (r.z1 - r.z0) * f); g.moveTo(u(r.x0), zz); g.lineTo(u(r.x1), zz); });
        } else {
          [0.3, 0.7].forEach((f) => { const xx = u(r.x0 + (r.x1 - r.x0) * f); g.moveTo(xx, v(r.z0)); g.lineTo(xx, v(r.z1)); });
        }
        g.stroke(); g.setLineDash([]);
      });
      // creek bed and banks
      g.fillStyle = "#7d6a48"; g.fillRect(u(CREEK.minX - 0.5), 0, (CREEK.maxX - CREEK.minX + 1) * PX, h);
      g.fillStyle = "#4f7f99"; g.fillRect(u(CREEK.minX), 0, (CREEK.maxX - CREEK.minX) * PX, h);
    });
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    const ground = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshToonMaterial({ map: tex, gradientMap: gradient }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((BOUNDS.minX + BOUNDS.maxX) / 2, 0, (BOUNDS.minZ + BOUNDS.maxZ) / 2);
    ground.receiveShadow = true;
    ground.userData.ground = true;
    scene.add(ground);
    clickables.push(ground);
    // prairie that runs past the edge of the map
    const outer = new T.Mesh(new T.PlaneGeometry(600, 600), new T.MeshToonMaterial({ color: 0x8aa556, gradientMap: gradient }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.03;
    outer.receiveShadow = true;
    scene.add(outer);

    // moving water
    const wtex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#5b8fab"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#cfe4ee"; g.lineWidth = 4; g.lineCap = "round";
      for (let i = 0; i < 14; i++) { const x = (i * 71) % w, y = (i * 113) % h; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 26); g.stroke(); }
    }, true);
    wtex.repeat.set(2, 16);
    wtex.repeat.set(2, 16 * 400 / D);
    water = new T.Mesh(new T.PlaneGeometry(CREEK.maxX - CREEK.minX, 400), new T.MeshBasicMaterial({ map: wtex, transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set((CREEK.minX + CREEK.maxX) / 2, 0.06, (BOUNDS.minZ + BOUNDS.maxZ) / 2);
    scene.add(water);
  }

  // ---------- Buildings ----------
  function wallTexture(style, color) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      if (style === "log") {
        for (let y = 0; y < h; y += 32) {
          g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, y + 26, w, 6);
          g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(0, y + 4, w, 6);
        }
      } else {
        for (let y = 0; y < h; y += 22) { g.fillStyle = "rgba(0,0,0,.16)"; g.fillRect(0, y + 18, w, 4); }
      }
    }, true);
  }

  function signTexture(kind) {
    return canvasTex(128, 64, (g) => {
      g.fillStyle = "#e9dfc4"; g.fillRect(0, 0, 128, 64);
      g.strokeStyle = "#2a211b"; g.lineWidth = 5; g.strokeRect(3, 3, 122, 58);
      g.fillStyle = "#2a211b"; g.strokeStyle = "#2a211b"; g.lineWidth = 4;
      const c = 64;
      switch (kind) {
        case "mug": g.fillRect(c - 16, 14, 26, 36); g.beginPath(); g.arc(c + 14, 32, 10, -1.2, 1.2); g.stroke(); break;
        case "barrel": g.beginPath(); g.ellipse(c, 32, 16, 22, 0, 0, 7); g.fill(); g.fillStyle = "#e9dfc4"; g.fillRect(c - 18, 22, 36, 3); g.fillRect(c - 18, 40, 36, 3); break;
        case "letter": g.strokeRect(c - 24, 16, 48, 32); g.beginPath(); g.moveTo(c - 24, 16); g.lineTo(c, 34); g.lineTo(c + 24, 16); g.stroke(); break;
        case "anvil": g.beginPath(); g.moveTo(c - 26, 20); g.lineTo(c + 22, 20); g.lineTo(c + 10, 32); g.lineTo(c + 10, 40); g.lineTo(c + 18, 48); g.lineTo(c - 18, 48); g.lineTo(c - 10, 40); g.lineTo(c - 10, 30); g.closePath(); g.fill(); break;
        case "press": g.fillRect(c - 22, 14, 44, 8); g.fillRect(c - 22, 14, 8, 36); g.fillRect(c + 14, 14, 8, 36); g.fillRect(c - 14, 34, 28, 8); break;
        case "book": g.fillRect(c - 22, 16, 20, 32); g.fillRect(c + 2, 16, 20, 32); break;
        case "ballot": g.strokeRect(c - 20, 22, 40, 26); g.fillRect(c - 10, 18, 20, 4); g.beginPath(); g.moveTo(c - 6, 10); g.lineTo(c + 6, 10); g.lineTo(c + 6, 20); g.lineTo(c - 6, 20); g.stroke(); break;
      }
    });
  }

  function buildBuilding(id, b) {
    const grp = new T.Group();
    grp.position.set(b.x, 0, b.z);
    scene.add(grp);
    const mats = [];
    const own = (m) => m.clone();
    const wt = wallTexture(b.style === "log" ? "log" : "board", b.wall);
    const wallMat = own(new T.MeshToonMaterial({ map: wt, gradientMap: gradient }));
    const roofMat = own(toon(b.roof));
    const trimMat = own(toon("#3d3029"));
    const fx = b.w / 2, fz = b.d / 2;

    if (b.style === "forge") {
      // open-fronted shed
      box(grp, b.w, b.h, 0.3, wallMat, 0, 0, -fz + 0.15);
      box(grp, 0.3, b.h, b.d, wallMat, -fx + 0.15, 0, 0);
      box(grp, 0.3, b.h, b.d, wallMat, fx - 0.15, 0, 0);
      [-fx + 0.2, fx - 0.2].forEach((x) => box(grp, 0.3, b.h, 0.3, trimMat, x, 0, fz - 0.2));
      grp.children.forEach((m) => { if (m.isMesh) { m.userData.target = id; clickables.push(m); } });
      const hearth = box(grp, 2.2, 1.0, 1.6, own(toon("#4a3f3a")), -1.6, 0, -fz + 1.2);
      const coals = new T.Mesh(new T.BoxGeometry(1.6, 0.12, 1.1), new T.MeshBasicMaterial({ color: 0xff8a2a }));
      coals.position.set(-1.6, 1.06, -fz + 1.2); grp.add(coals);
      box(grp, 1.0, 0.7, 0.5, own(toon("#3b3b40")), 1.0, 0.5, 0.2);
      box(grp, 0.6, 0.5, 0.6, own(toon("#5a3b26")), 1.0, 0, 0.2);
      box(grp, 0.9, b.h + 2.4, 0.9, own(toon("#7d746b")), -1.6, 0, -fz + 0.6);
      solid(b.x - fx, b.x + fx, b.z - fz, b.z - fz + 0.4);
      solid(b.x - fx, b.x - fx + 0.4, b.z - fz, b.z + fz);
      solid(b.x + fx - 0.4, b.x + fx, b.z - fz, b.z + fz);
      solid(b.x - 2.8, b.x - 0.4, b.z - fz, b.z - fz + 2.1);
      solid(b.x + 0.4, b.x + 1.6, b.z - 0.2, b.z + 0.6);
    } else {
      const walls = box(grp, b.w, b.h, b.d, wallMat, 0, 0, 0);
      wt.repeat.set(b.w / 3, b.h / 3);
      walls.userData.target = id;
      clickables.push(walls);
      solid(b.x - fx, b.x + fx, b.z - fz, b.z + fz);
      // door and windows on the front
      box(grp, 1.1, 2.1, 0.12, trimMat, b.style === "log" ? -0.6 : 0, 0, fz + 0.04, false);
      const glass = own(toon("#bcd9e6"));
      const winX = b.w > 6.5 ? [-b.w / 2 + 1.3, b.w / 2 - 1.3] : [-b.w / 2 + 1.1, b.w / 2 - 1.1];
      winX.forEach((x) => { box(grp, 1.0, 1.0, 0.12, glass, x, 1.2, fz + 0.04); });
      box(grp, 0.12, 1.0, 1.0, glass, fx + 0.04, 1.2, 0);
    }
    // roof
    const rise = b.style === "forge" ? 1.2 : Math.min(2.4, b.d * 0.42);
    const roof = gable(grp, b.w + 0.6, b.d + 0.8, rise, roofMat, 0, b.h, 0);
    roof.userData.target = id; clickables.push(roof);
    if (b.style === "log") box(grp, 0.8, 1.8, 0.8, own(toon("#8b8379")), b.w / 2 - 1.1, b.h + 0.4, -0.6);
    if (b.falseFront) {
      const ff = box(grp, b.w + 0.2, b.h + 2.0, 0.25, wallMat, 0, 0, fz + 0.15);
      ff.userData.target = id; clickables.push(ff);
      box(grp, b.w + 0.5, 0.25, 0.45, trimMat, 0, b.h + 2.0, fz + 0.15);
    }
    if (b.bell) {
      box(grp, 1.0, 1.1, 1.0, wallMat, 0, b.h + rise - 0.2, 0);
      const cap = new T.Mesh(new T.ConeGeometry(0.85, 0.9, 4), roofMat);
      cap.position.set(0, b.h + rise + 1.35, 0); cap.rotation.y = Math.PI / 4; grp.add(cap); addEdges(cap, grp);
    }
    if (b.porch) {
      const pd = 1.8;
      box(grp, b.w, 0.18, pd, own(toon("#8a6f50")), 0, 0, fz + pd / 2);
      [-fx + 0.2, -fx / 3, fx / 3, fx - 0.2].forEach((x) => { box(grp, 0.16, 2.6, 0.16, trimMat, x, 0.18, fz + pd - 0.15); post(b.x + x, b.z + fz + pd - 0.15, 0.15); });
      const pr = box(grp, b.w + 0.2, 0.12, pd + 0.2, roofMat, 0, 2.78, fz + pd / 2, false);
      pr.rotation.x = 0.12;
      addEdges(pr, grp);
    }
    if (b.sign) {
      const sm = new T.Mesh(new T.PlaneGeometry(1.4, 0.7), new T.MeshBasicMaterial({ map: signTexture(b.sign) }));
      const sy = b.falseFront ? b.h + 1.1 : (b.porch ? 3.3 : b.h - 0.55);
      const sz = b.porch && !b.falseFront ? fz + 1.9 : fz + (b.falseFront ? 0.3 : 0.08);
      sm.position.set(b.style === "forge" ? 0 : (b.style === "log" ? 0.9 : 0), sy, sz);
      grp.add(sm);
    }
    // Give this building its own copy of every material so it can fade alone.
    grp.traverse((o) => {
      if (!o.material) return;
      const own = o.material.clone();
      if (o.isLineSegments) own.transparent = true;
      o.material = own;
      mats.push(own);
    });
    fadeables.push({ group: grp, materials: mats, opacity: 1, id });
    return grp;
  }

  // ---------- Props ----------
  function buildProps() {
    const wood = toon("#8a6440"), dark = toon("#5a4330");
    // polling place: table, ballot box, the empty chair
    box(scene, 1.6, 0.08, 0.8, wood, -16.0, 0.95, -4.1);
    [[-16.7, -4.4], [-15.3, -4.4], [-16.7, -3.8], [-15.3, -3.8]].forEach(([x, z]) => box(scene, 0.08, 0.95, 0.08, dark, x, 0, z, false));
    box(scene, 0.5, 0.36, 0.36, toon("#7a4a2a"), -16.0, 1.03, -4.1);
    solid(-16.9, -15.1, -4.6, -3.6);
    const chair = new T.Group(); chair.position.set(CHAIR.x, 0, CHAIR.z); scene.add(chair);
    box(chair, 0.55, 0.07, 0.55, wood, 0, 0.5, 0);
    [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].forEach(([x, z]) => box(chair, 0.06, 0.5, 0.06, dark, x, 0, z, false));
    box(chair, 0.55, 0.65, 0.06, wood, 0, 0.57, -0.25);
    chair.children.forEach((m) => { if (m.isMesh) { m.userData.target = "chair"; clickables.push(m); } });
    post(CHAIR.x, CHAIR.z, 0.35);

    // peddler's wagon
    const wg = new T.Group(); wg.position.set(-8, 0, 5); scene.add(wg);
    box(wg, 3.2, 0.7, 1.6, toon("#8a5a36"), 0, 0.55, 0);
    const cover = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 3.0, 12, 1, true, -Math.PI / 2, Math.PI), toon("#efe9da", { side: T.DoubleSide }));
    cover.rotation.z = Math.PI / 2; cover.position.set(0, 1.25, 0); cover.castShadow = true; wg.add(cover);
    [[-1.1, 0.85], [1.1, 0.85], [-1.1, -0.85], [1.1, -0.85]].forEach(([x, z]) => {
      const wh = new T.Mesh(new T.TorusGeometry(0.45, 0.07, 6, 16), toon("#3d3029"));
      wh.position.set(x, 0.45, z); wg.add(wh);
    });
    box(wg, 2.4, 0.3, 0.4, toon("#9b7348"), 0.2, 1.25, 0.95);
    wg.children.forEach((m) => { if (m.isMesh) { m.userData.target = "cobb"; clickables.push(m); } });
    solid(-9.7, -6.3, 4.1, 5.9);

    // ferry dock, raft, rope, shack
    box(scene, 2.2, 0.2, 3.2, toon("#8a6f50"), 32.4, 0.05, 0);
    const raft = box(scene, 2.8, 0.25, 3.4, toon("#9b7348"), 35.0, 0.02, 0);
    raft.userData.target = "byrne"; clickables.push(raft);
    const rope = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 9, 4), toon("#c9a46a"));
    rope.rotation.z = Math.PI / 2; rope.position.set(34.4, 1.3, -1.9); scene.add(rope);
    [30.8, 38.0].forEach((x) => box(scene, 0.2, 1.6, 0.2, dark, x, 0, -1.9));
    const shack = buildShack(28.2, 6.6);
    shack.userData = { target: "byrne" };

    // trees
    const trees = [];
    const addTree = (x, z, k) => { if (onRoad(x, z) || onRoad(x, z + 1) || onRoad(x, z - 1)) return; trees.push([x, z, k]); post(x, z, 0.45 * k); };
    for (let z = -22; z <= 24; z += 4.5) { addTree(30.6, z + (z % 3), 1.1); if (Math.abs(z) > 3) addTree(38.8, z + 1.5, 1.2); }
    [[-34, -14, 1.2], [-21, -15, 1], [-10, -16, 1.3], [8, -17, 1.1], [24, -16, 1.2], [-35, 4, 1], [-21, 3.8, 0.9], [12, 4.2, 1], [24, 4.2, 0.9],
     [-34, 21, 1.2], [-20, 22, 1.1], [-6, 21, 1.3], [10, 22, 1], [24, 21, 1.2], [-37, -6, 1], [-37, 12, 1.1], [26, -10, 1]].forEach(([x, z, k]) => addTree(x, z, k));
    const trunkG = new T.CylinderGeometry(0.18, 0.26, 2.0, 6);
    const crownG = new T.IcosahedronGeometry(1.2, 0);
    const trunks = new T.InstancedMesh(trunkG, toon("#6b4a2f"), trees.length);
    const crowns = new T.InstancedMesh(crownG, toon("#ffffff", {}), trees.length * 3);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3();
    trees.forEach(([x, z, k], i) => {
      m4.compose(ps.set(x, k, z), q.identity(), sc.set(k, k, k)); trunks.setMatrixAt(i, m4);
      [[0, 2.5, 0, 1.15], [0.6, 2.1, 0.3, 0.85], [-0.55, 2.2, -0.25, 0.9]].forEach(([dx, dy, dz, s], j) => {
        q.setFromEuler(new T.Euler(i + j, i * 0.7, 0));
        m4.compose(ps.set(x + dx * k, dy * k, z + dz * k), q, sc.set(s * k, s * k, s * k));
        crowns.setMatrixAt(i * 3 + j, m4);
        crowns.setColorAt(i * 3 + j, new T.Color(["#5f8a3a", "#6f9a44", "#557d33"][(i + j) % 3]));
      });
    });
    trunks.castShadow = crowns.castShadow = true;
    scene.add(trunks, crowns);

    // fences behind the north row
    const fenceMat = toon("#7a6248");
    const rails = [];
    for (let x = -36; x < 28; x += 2.4) if (Math.abs(x) > 3) rails.push([x, -13]);
    const postsM = new T.InstancedMesh(new T.BoxGeometry(0.14, 1.1, 0.14), fenceMat, rails.length);
    const railM = new T.InstancedMesh(new T.BoxGeometry(2.4, 0.1, 0.06), fenceMat, rails.length * 2);
    rails.forEach(([x, z], i) => {
      m4.compose(ps.set(x, 0.55, z), q.identity(), sc.set(1, 1, 1)); postsM.setMatrixAt(i, m4);
      m4.compose(ps.set(x + 1.2, 0.45, z), q.identity(), sc.set(1, 1, 1)); railM.setMatrixAt(i * 2, m4);
      m4.compose(ps.set(x + 1.2, 0.85, z), q.identity(), sc.set(1, 1, 1)); railM.setMatrixAt(i * 2 + 1, m4);
    });
    scene.add(postsM, railM);
    solid(-36, -2.4, -13.1, -12.9); solid(4.8, 29, -13.1, -12.9);

    // haystacks and corn north of town
    const hay = toon("#d9b85a");
    [[-30, -18], [-26, -19], [14, -20], [18, -19.5]].forEach(([x, z]) => {
      const h = new T.Mesh(new T.ConeGeometry(1.3, 2.2, 8), hay); h.position.set(x, 1.1, z); h.castShadow = true; scene.add(h); addEdges(h, scene); post(x, z, 1.2);
    });
    const cornM = new T.InstancedMesh(new T.ConeGeometry(0.25, 1.4, 5), toon("#7fa04a"), 120);
    let n = 0;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) {
      m4.compose(ps.set(-21 + c * 0.85, 0.7, -17 - r * 1.1), q.identity(), sc.set(1, 1, 1)); cornM.setMatrixAt(n++, m4);
    }
    scene.add(cornM); solid(-21.4, -4.4, -23, -16.4);

    // barrels and crates
    const barrel = new T.CylinderGeometry(0.38, 0.38, 0.9, 10);
    [[11.2, -6.4], [11.4, -7.4], [23.2, -4.6], [22.6, -5.4], [-31.4, -4.6]].forEach(([x, z]) => {
      const b = new T.Mesh(barrel, toon("#8a6440")); b.position.set(x, 0.45, z); b.castShadow = true; scene.add(b); addEdges(b, scene); post(x, z, 0.4);
    });
    [[11.2, 11.6], [12.0, 12.1], [21.8, 11.8]].forEach(([x, z]) => { box(scene, 0.8, 0.8, 0.8, toon("#9b7348"), x, 0, z); post(x, z, 0.5); });
    // hitching rail at the tavern
    box(scene, 3.0, 0.1, 0.1, dark, 5.5, 0.95, -2.6, false);
    [4.1, 6.9].forEach((x) => { box(scene, 0.12, 1.0, 0.12, dark, x, 0, -2.6, false); post(x, -2.6, 0.12); });
    // well at the crossroads
    const well = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 0.8, 12), toon("#8b8379")); well.position.set(-4.2, 0.4, -4.4); scene.add(well); addEdges(well, scene); post(-4.2, -4.4, 0.85);
    box(scene, 1.8, 0.1, 1.0, toon("#5b4636"), -4.2, 1.9, -4.4);
    [-4.9, -3.5].forEach((x) => box(scene, 0.1, 1.9, 0.1, dark, x, 0, -4.4, false));

    // grass tufts
    const tuftM = new T.InstancedMesh(new T.ConeGeometry(0.12, 0.45, 4), toon("#7c9a48"), 420);
    let t = 0, s2 = 11;
    const rnd = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
    while (t < 420) {
      const x = BOUNDS.minX + rnd() * (CREEK.minX - BOUNDS.minX - 1), z = BOUNDS.minZ + rnd() * (BOUNDS.maxZ - BOUNDS.minZ);
      if (onRoad(x, z) || blockedRaw(x, z, 0.6)) continue;
      m4.compose(ps.set(x, 0.2, z), q.identity(), sc.set(1, 1 + rnd(), 1)); tuftM.setMatrixAt(t++, m4);
    }
    scene.add(tuftM);
  }

  function buildShack(x, z) {
    const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    box(g, 2.4, 2.2, 2.0, toon("#8a6b4a"), 0, 0, 0);
    gable(g, 2.8, 2.6, 1.0, toon("#5b4636"), 0, 2.2, 0);
    solid(x - 1.2, x + 1.2, z - 1.0, z + 1.0);
    return g;
  }

  function onRoad(x, z) { return ROADS.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1); }

  // ---------- Collision ----------
  function blockedRaw(x, z, r) {
    if (x < BOUNDS.minX + 1 || x > BOUNDS.maxX - 1 || z < BOUNDS.minZ + 1 || z > BOUNDS.maxZ - 1) return true;
    // creek, except the dock
    if (x > CREEK.minX - 0.2 - r && !(x < 33.4 && z > -1.5 && z < 1.5)) return true;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.r !== undefined) {
        const dx = x - c.x, dz = z - c.z;
        if (dx * dx + dz * dz < (c.r + r) * (c.r + r)) return true;
      } else if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
    }
    return false;
  }
  function blocked(x, z) {
    if (blockedRaw(x, z, PR)) return true;
    for (const id in people) {
      const p = people[id];
      const dx = x - p.x, dz = z - p.z;
      if (dx * dx + dz * dz < 0.55 * 0.55) return true;
    }
    return false;
  }

  // ---------- Navigation grid + A* ----------
  const CELL = 0.5;
  let gridW, gridH, grid;
  function buildGrid() {
    gridW = Math.ceil((BOUNDS.maxX - BOUNDS.minX) / CELL);
    gridH = Math.ceil((BOUNDS.maxZ - BOUNDS.minZ) / CELL);
    grid = new Uint8Array(gridW * gridH);
    for (let j = 0; j < gridH; j++) for (let i = 0; i < gridW; i++) {
      const x = BOUNDS.minX + (i + 0.5) * CELL, z = BOUNDS.minZ + (j + 0.5) * CELL;
      grid[j * gridW + i] = blockedRaw(x, z, PR + 0.05) ? 1 : 0;
      for (const id in PEOPLE) {
        const p = PEOPLE[id];
        if ((x - p.x) * (x - p.x) + (z - p.z) * (z - p.z) < (0.55 + PR) * (0.55 + PR)) grid[j * gridW + i] = 1;
      }
    }
  }
  const cellOf = (x, z) => [Math.floor((x - BOUNDS.minX) / CELL), Math.floor((z - BOUNDS.minZ) / CELL)];
  const centerOf = (i, j) => [BOUNDS.minX + (i + 0.5) * CELL, BOUNDS.minZ + (j + 0.5) * CELL];
  const free = (i, j) => i >= 0 && j >= 0 && i < gridW && j < gridH && grid[j * gridW + i] === 0;

  function nearestFree(i, j) {
    if (free(i, j)) return [i, j];
    for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (free(i + di, j + dj)) return [i + di, j + dj];
    }
    return null;
  }

  function findPath(sx, sz, tx, tz) {
    const s = nearestFree(...cellOf(sx, sz)), t = nearestFree(...cellOf(tx, tz));
    if (!s || !t) return [];
    const N = gridW * gridH;
    const g = new Float32Array(N).fill(Infinity);
    const from = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap = [];
    const push = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const h = (i, j) => { const dx = Math.abs(i - t[0]), dy = Math.abs(j - t[1]); return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); };
    const sk = s[1] * gridW + s[0], tk = t[1] * gridW + t[0];
    g[sk] = 0; push(sk, h(s[0], s[1]));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let found = false, guard = 0;
    while (heap.length && guard++ < 60000) {
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === tk) { found = true; break; }
      const i = k % gridW, j = (k / gridW) | 0;
      for (const [di, dj, cost] of dirs) {
        const ni = i + di, nj = j + dj;
        if (!free(ni, nj)) continue;
        if (di && dj && (!free(i + di, j) || !free(i, j + dj))) continue;
        const nk = nj * gridW + ni;
        const ng = g[k] + cost;
        if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(nk, ng + h(ni, nj)); }
      }
    }
    if (!found) return [];
    const cells = [];
    for (let k = tk; k !== -1; k = from[k]) cells.push(k);
    cells.reverse();
    const pts = cells.map((k) => centerOf(k % gridW, (k / gridW) | 0));
    pts[pts.length - 1] = blocked(tx, tz) ? pts[pts.length - 1] : [tx, tz];
    // string pulling: keep only the turns
    const out = [];
    let anchor = [sx, sz];
    for (let i = 1; i < pts.length; i++) {
      if (!clearLine(anchor, pts[i])) { out.push(pts[i - 1]); anchor = pts[i - 1]; }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function clearLine(a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const n = Math.ceil(Math.hypot(dx, dz) / 0.25);
    for (let i = 1; i <= n; i++) {
      const [ci, cj] = cellOf(a[0] + (dx * i) / n, a[1] + (dz * i) / n);
      if (!free(ci, cj)) return false;
    }
    return true;
  }

  // ---------- Characters ----------
  const SPRITE_H = 2.05;
  const BILLBOARD_STRETCH = 1 / Math.cos(Math.asin(CAM_DIR.y)); // undo the camera's tilt
  function framesFrom(sourceCanvasOrImage, count) {
    const base = new T.Texture(sourceCanvasOrImage);
    base.encoding = T.sRGBEncoding;
    base.needsUpdate = true;
    const out = [];
    for (let i = 0; i < count; i++) {
      const r = base.clone(); r.needsUpdate = true;
      r.repeat.set(1 / count, 1); r.offset.set(i / count, 0);
      const l = base.clone(); l.needsUpdate = true;
      l.repeat.set(-1 / count, 1); l.offset.set((i + 1) / count, 0);
      out.push({ r, l });
    }
    return out;
  }
  function makeBillboard(frames, aspect, scale) {
    const h = SPRITE_H * (scale || 1);
    const geo = new T.PlaneGeometry(h * aspect, h * BILLBOARD_STRETCH);
    geo.translate(0, (h * BILLBOARD_STRETCH) / 2, 0);
    const mat = new T.MeshBasicMaterial({ map: frames[0].r, transparent: true, alphaTest: 0.4, side: T.DoubleSide });
    const mesh = new T.Mesh(geo, mat);
    mesh.rotation.y = Math.PI / 4;
    mesh.castShadow = false;
    const blob = new T.Mesh(new T.CircleGeometry(0.42 * (scale || 1), 16), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03;
    const grp = new T.Group(); grp.add(blob, mesh);
    scene.add(grp);
    return { grp, mesh };
  }

  function loadStrip(src, count, fallback) {
    return window.ART.probe(src).then((img) => (img ? { img, count, real: true } : { img: fallback(), count, real: false }));
  }

  function buildPeople() {
    const A = window.ART;
    const aspect = A.FW / A.FH;
    Object.entries(PEOPLE).forEach(([id, p]) => {
      const holder = { x: p.x, z: p.z, id, place: p.place, frames: null, t: Math.random() * 2 };
      people[id] = holder;
      loadStrip(`art/sprites/${id}-idle.png`, 2, () => A.spriteStrip(id, "idle")).then(({ img, count }) => {
        holder.frames = framesFrom(img, count);
        const bb = makeBillboard(holder.frames, img.width / count / img.height || aspect);
        holder.grp = bb.grp; holder.mesh = bb.mesh;
        holder.grp.position.set(p.x, 0, p.z);
        bb.mesh.userData.target = id; clickables.push(bb.mesh);
      });
    });
    // Senator the goat
    const goat = { x: 28.0, z: 4.0 };
    loadStrip("art/sprites/senator-idle.png", 2, () => A.spriteStrip("senator", "idle")).then(({ img, count }) => {
      const frames = framesFrom(img, count);
      const bb = makeBillboard(frames, img.width / count / img.height || aspect, 0.9);
      bb.grp.position.set(goat.x, 0, goat.z);
      bb.mesh.userData.target = "byrne"; clickables.push(bb.mesh);
      people._goat = { frames, mesh: bb.mesh, t: 0.5, x: goat.x, z: goat.z, decor: true };
    });
    post(goat.x, goat.z, 0.4);

    // the player
    player = { x: START.x, z: START.z, dir: { x: 0, z: 1 }, walkT: 0, moving: false };
    Promise.all([
      window.ART.probe("art/sprites/player-walk-front.png"),
      window.ART.probe("art/sprites/player-walk-back.png"),
    ]).then(([front, back]) => {
      let ff, bf, aspectP;
      if (front && back) { ff = framesFrom(front, 3); bf = framesFrom(back, 3); aspectP = front.width / 3 / front.height; }
      else {
        const strip = A.spriteStrip("player", "walk");
        const all = framesFrom(strip, 6);
        ff = all.slice(0, 3); bf = all.slice(3, 6); aspectP = aspect;
      }
      player.front = ff; player.back = bf;
      const bb = makeBillboard(ff, aspectP);
      player.grp = bb.grp; player.mesh = bb.mesh;
      player.grp.position.set(player.x, 0, player.z);
    });
  }

  // ---------- Labels (HTML over the canvas) ----------
  const labels = {};
  function buildLabels(data) {
    Object.keys(PEOPLE).forEach((id) => {
      const c = data.characters[id];
      const el = document.createElement("button");
      el.className = "label";
      el.type = "button";
      el.innerHTML = `<span class="label-mark" aria-hidden="true"></span><span class="label-name">${c.name}</span><span class="label-role">${c.role.replace(" (bonus)", "")}</span>`;
      el.addEventListener("click", (e) => { e.stopPropagation(); goTo(id); });
      labelLayer.appendChild(el);
      labels[id] = el;
    });
    const chairEl = document.createElement("button");
    chairEl.className = "label label-chair"; chairEl.type = "button";
    chairEl.innerHTML = `<span class="label-mark" aria-hidden="true"></span><span class="label-name">Empty chair</span>`;
    chairEl.addEventListener("click", (e) => { e.stopPropagation(); goTo("chair"); });
    labelLayer.appendChild(chairEl);
    labels.chair = chairEl;
  }
  const v3 = new T.Vector3();
  function updateLabels() {
    const w = container.clientWidth, h = container.clientHeight;
    for (const id in labels) {
      const p = id === "chair" ? { x: CHAIR.x, z: CHAIR.z } : people[id];
      if (!p) continue;
      v3.set(p.x, id === "chair" ? 1.6 : SPRITE_H * BILLBOARD_STRETCH * 0.86 + 0.5, p.z).project(camera);
      const x = (v3.x * 0.5 + 0.5) * w, y = (-v3.y * 0.5 + 0.5) * h;
      const el = labels[id];
      const on = x > -100 && x < w + 100 && y > -60 && y < h + 60;
      el.style.display = on ? "" : "none";
      if (on) el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.dataset.mark = markers[id] || "";
      el.classList.toggle("is-near", nearId === id);
    }
  }

  // ---------- Input ----------
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  let downAt = null;
  function pointerDown(e) { downAt = { x: e.clientX, y: e.clientY }; }
  function pointerUp(e) {
    if (paused || !downAt) return;
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) { downAt = null; return; }
    downAt = null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(clickables, false);
    for (const hit of hits) {
      const t = hit.object.userData.target;
      if (t) { goTo(t); return; }
      if (hit.object.userData.ground) { walkTo(hit.point.x, hit.point.z, null); return; }
    }
  }
  function talkSpot(id) {
    if (id === "chair") return [CHAIR.x + 0.2, CHAIR.z + 1.3];
    const p = PEOPLE[id];
    return [p.x, p.z + 1.25];
  }
  function goTo(id) {
    if (paused) return;
    const target = id in BUILDINGS ? Object.keys(PEOPLE).find((k) => PEOPLE[k].place === id) : id;
    if (!target) return;
    if (distTo(target) < 2.4) { stopWalking(); onInteract(target); return; }
    const [x, z] = talkSpot(target);
    walkTo(x, z, target);
  }
  function walkTo(x, z, target) {
    path = findPath(player.x, player.z, x, z);
    pendingTarget = target;
    showMarker(path.length ? path[path.length - 1] : null);
  }
  function stopWalking() { path = []; pendingTarget = null; showMarker(null); }
  let marker = null;
  function showMarker(pt) {
    if (!marker) {
      marker = new T.Mesh(new T.RingGeometry(0.25, 0.4, 20), new T.MeshBasicMaterial({ color: 0xf3d36b, transparent: true, opacity: 0.9, depthWrite: false }));
      marker.rotation.x = -Math.PI / 2; scene.add(marker);
    }
    marker.visible = !!pt;
    if (pt) marker.position.set(pt[0], 0.05, pt[1]);
  }

  function keyDown(e) {
    if (paused) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
      keys[k] = true; stopWalking(); e.preventDefault();
    }
    if ((k === "e" || k === " " || k === "enter") && nearId) { e.preventDefault(); stopWalking(); onInteract(nearId); }
  }
  function keyUp(e) { keys[e.key.toLowerCase()] = false; }

  function distTo(id) {
    const p = id === "chair" ? CHAIR : people[id];
    if (!p || !player) return 99;
    return Math.hypot(p.x - player.x, p.z - player.z);
  }

  // ---------- Frame loop ----------
  const fadeRay = new T.Raycaster();
  fadeRay.params.Line.threshold = 0.01;
  let fadeTimer = 0;
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!renderer) return;
    if (!qualityChecked && !paused) {
      fpsSamples.push(dt);
      if (fpsSamples.length > 90) {
        const avg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
        qualityChecked = true;
        if (avg > 1 / 38) setQuality("low");
      }
    }
    if (player && player.mesh) {
      if (!paused) movePlayer(dt);
      animatePlayer(dt);
    }
    for (const id in people) {
      const p = people[id];
      if (!p.frames || !p.mesh) continue;
      p.t += dt;
      const f = Math.floor(p.t / 0.7) % p.frames.length;
      if (p.mesh.material.map !== p.frames[f].r) p.mesh.material.map = p.frames[f].r;
    }
    if (water) water.material.map.offset.y -= dt * 0.08;
    // camera follows the player
    if (player) {
      camTarget.x += (player.x - camTarget.x) * Math.min(1, dt * 4);
      camTarget.z += (player.z - camTarget.z) * Math.min(1, dt * 4);
    }
    viewSize += (targetView - viewSize) * Math.min(1, dt * 6);
    placeCamera();
    fadeTimer -= dt;
    if (fadeTimer <= 0) { fadeTimer = 0.1; updateFades(); }
    fadeables.forEach((f) => {
      const target = f.fade ? 0.28 : 1;
      if (Math.abs(f.opacity - target) > 0.01) {
        f.opacity += (target - f.opacity) * Math.min(1, dt * 8);
        f.materials.forEach((m) => { m.transparent = f.opacity < 0.99; m.opacity = f.opacity; m.depthWrite = f.opacity > 0.99; });
      }
    });
    updateNear();
    updateLabels();
    renderer.render(scene, camera);
  }

  function movePlayer(dt) {
    const speed = 5.2;
    let mx = 0, mz = 0;
    if (keys.arrowup || keys.w) { mx += FWD.x; mz += FWD.z; }
    if (keys.arrowdown || keys.s) { mx -= FWD.x; mz -= FWD.z; }
    if (keys.arrowright || keys.d) { mx += RIGHT.x; mz += RIGHT.z; }
    if (keys.arrowleft || keys.a) { mx -= RIGHT.x; mz -= RIGHT.z; }
    if (!mx && !mz && path.length) {
      const [tx, tz] = path[0];
      const dx = tx - player.x, dz = tz - player.z, d = Math.hypot(dx, dz);
      if (d < 0.12) {
        path.shift();
        if (!path.length) {
          showMarker(null);
          if (pendingTarget) { const t = pendingTarget; pendingTarget = null; if (distTo(t) < 2.6) onInteract(t); }
        }
      } else { mx = dx / d; mz = dz / d; }
    }
    const len = Math.hypot(mx, mz);
    player.moving = len > 0;
    if (!len) return;
    mx /= len; mz /= len;
    const step = Math.min(speed * dt, path.length && !keys.w ? Math.hypot(path[0][0] - player.x, path[0][1] - player.z) : 99);
    const nx = player.x + mx * step, nz = player.z + mz * step;
    if (!blocked(nx, nz)) { player.x = nx; player.z = nz; }
    else if (!blocked(nx, player.z)) player.x = nx;
    else if (!blocked(player.x, nz)) player.z = nz;
    else if (path.length) { path = findPath(player.x, player.z, path[path.length - 1][0], path[path.length - 1][1]); }
    player.dir = { x: mx, z: mz };
  }

  function animatePlayer(dt) {
    player.grp.position.set(player.x, 0, player.z);
    // screen-space direction: positive dot with camera-right means walking right
    const sr = player.dir.x * RIGHT.x + player.dir.z * RIGHT.z;
    const su = player.dir.x * FWD.x + player.dir.z * FWD.z;
    const set = su > 0.2 ? player.back : player.front;
    if (player.moving) player.walkT += dt; else player.walkT = 0;
    const seq = [0, 1, 2, 1];
    const f = player.moving ? seq[Math.floor(player.walkT * 8) % 4] : 1;
    const side = su > 0.2 ? (sr < 0 ? "r" : "l") : (sr >= 0 ? "r" : "l");
    const tex = set[f][side];
    if (player.mesh.material.map !== tex) player.mesh.material.map = tex;
  }

  function updateNear() {
    if (!player || paused) { if (nearId) { nearId = null; onNear(null); } return; }
    let best = null, bd = 2.4;
    for (const id of [...Object.keys(PEOPLE), "chair"]) {
      const d = distTo(id);
      if (d < bd) { bd = d; best = id; }
    }
    if (best !== nearId) { nearId = best; onNear(best); }
  }

  function updateFades() {
    if (!player) return;
    const head = new T.Vector3(player.x, 1.2, player.z);
    const from = head.clone().addScaledVector(CAM_DIR, 60);
    fadeRay.set(from, head.clone().sub(from).normalize());
    fadeRay.far = from.distanceTo(head) - 0.5;
    const hitGroups = new Set();
    fadeables.forEach((f) => {
      const hits = fadeRay.intersectObject(f.group, true);
      if (hits.length) hitGroups.add(f);
    });
    fadeables.forEach((f) => (f.fade = hitGroups.has(f)));
  }

  function placeCamera() {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const hh = viewSize / 2;
    camera.left = -hh * aspect; camera.right = hh * aspect; camera.top = hh; camera.bottom = -hh;
    camera.updateProjectionMatrix();
    camera.position.copy(camTarget).addScaledVector(CAM_DIR, 60);
    camera.lookAt(camTarget);
    if (sun) {
      sun.position.set(camTarget.x - 14, 26, camTarget.z + 10);
      sun.target.position.copy(camTarget);
    }
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    targetView = Math.max(14, Math.min(28, h / 34));
  }

  function setQuality(q) {
    shadowsOn = q !== "low";
    renderer.shadowMap.enabled = shadowsOn;
    renderer.setPixelRatio(q === "low" ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); });
    resize();
    document.dispatchEvent(new CustomEvent("world-quality", { detail: q }));
  }

  // ---------- Public ----------
  function init(el, data, opts) {
    container = el;
    if (opts && opts.player) { START.x = opts.player.x; START.z = opts.player.z; }
    renderer = new T.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 1.5, alpha: true, powerPreference: "high-performance" });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.domElement.className = "world-canvas";
    el.appendChild(renderer.domElement);
    labelLayer = document.createElement("div");
    labelLayer.className = "labels";
    el.appendChild(labelLayer);

    scene = new T.Scene();
    gradient = makeGradient();
    camera = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
    scene.add(new T.HemisphereLight(0xfff4dc, 0x6f7a52, 0.75));
    sun = new T.DirectionalLight(0xfff1d6, 0.95);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    Object.entries(BUILDINGS).forEach(([id, b]) => buildBuilding(id, b));
    buildProps();
    buildGround();
    buildGrid();
    buildPeople();
    buildLabels(data);
    camTarget.set(START.x, 0, START.z);

    const cv = renderer.domElement;
    cv.addEventListener("pointerdown", pointerDown);
    cv.addEventListener("pointerup", pointerUp);
    cv.addEventListener("wheel", (e) => { e.preventDefault(); targetView = Math.max(12, Math.min(36, targetView + Math.sign(e.deltaY) * 2)); }, { passive: false });
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", () => Object.keys(keys).forEach((k) => (keys[k] = false)));
    new ResizeObserver(resize).observe(el);
    resize();
    placeCamera();
    tick();
  }

  return {
    init,
    setPaused(p) { paused = p; if (p) { Object.keys(keys).forEach((k) => (keys[k] = false)); stopWalking(); } },
    onInteract(cb) { onInteract = cb; },
    onNear(cb) { onNear = cb; },
    setMarkers(m) { markers = m; },
    goTo,
    interactNear() { if (nearId) { stopWalking(); onInteract(nearId); } },
    getPlayer() { return player ? { x: player.x, z: player.z } : { x: START.x, z: START.z }; },
    setPlayer(x, z) { if (player) { player.x = x; player.z = z; } START.x = x; START.z = z; camTarget.set(x, 0, z); },
    stepBackFrom(id) {
      // Move the player one step toward the camera after a talk, so they don't re-trigger it.
      if (!player) return;
      const nz = player.z + 0.6;
      if (!blocked(player.x, nz)) player.z = nz;
    },
    setQuality,
    get quality() { return shadowsOn ? "high" : "low"; },
    stats() { return renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures } : null; },
    zoom(d) { targetView = Math.max(12, Math.min(36, targetView + d)); },
    places: BUILDINGS,
    people: PEOPLE,
  };
})();
