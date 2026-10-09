/*
 * Placeholder art drawn in code, plus loading of real art when it exists.
 *
 * Real art (from Google Flow) goes in /art with these names:
 *   art/portraits/<character>-<expression>.png   e.g. pike-proud.png
 *   art/backgrounds/bg-<place>.png               e.g. bg-tavern.png
 *   art/intro/intro-<n>.png                      e.g. intro-3.png
 * Portrait backgrounds must already be transparent
 * (run tools/key_green.py on Flow's green-screen images first).
 */
(function () {
  "use strict";

  const INK = "#1d1712";

  // ---------- Character looks (shared by portraits and the 3D models) ----------
  const LOOKS = {
    player:   { skin: "#e3bf9c", hair: "#4a3527", hairStyle: "short", hat: "wide", hatColor: "#5a4330", coat: "#7a5a3a", shirt: "#e9e2d0", pants: "#3d3a36", acc: "notebook" },
    mrsbrown: { skin: "#e8c4a0", hair: "#4a3020", hairStyle: "bunMiddle", coat: "#2f4a6b", shirt: "#2f4a6b", collar: "high", acc: "shawl", shawl: "#8f8a82", female: true, pants: "#2f4a6b" },
    whitcomb: { skin: "#efcfae", hair: "#8a7055", hairStyle: "balding", coat: "#26272b", shirt: "#f2efe6", acc: "ledger", glasses: "round", build: "thin", pants: "#2d2c2a" },
    pruitt:   { skin: "#e2b48e", hair: "#6e5a45", hairStyle: "short", facial: "mustache", stubble: true, hat: "slouch", hatColor: "#5b4a3a", coat: "#8a4b3a", shirt: "#8a4b3a", checked: true, acc: "apron", apron: "#d8ccb3", build: "heavy", pants: "#4a3f35" },
    pike:     { skin: "#f0cfb0", hair: "#ece8e0", hairStyle: "balding", facial: "muttonchops", glasses: "half", coat: "#6b4a2f", shirt: "#f4f1e8", acc: "bowtie", old: true, pants: "#3b3530" },
    tuttle:   { skin: "#efcfb4", hair: "#aaa49c", hairStyle: "bunTop", glasses: "wire", coat: "#6a3b5c", shirt: "#6a3b5c", collar: "lace", acc: "envelope", female: true, old: true, pants: "#6a3b5c" },
    grayson:  { skin: "#6b4430", hair: "#1e1612", hairStyle: "cropped", facial: "shortbeard", coat: "#d9cdb4", shirt: "#d9cdb4", acc: "apron", apron: "#5a3b26", build: "strong", pants: "#3a332c" },
    byrne:    { skin: "#f1c9a8", hair: "#b5532a", hairStyle: "curly", freckles: true, hat: "flatcap", hatColor: "#5a5048", coat: "#6b5340", shirt: "#e6dccb", acc: "rope", pants: "#4b443c" },
    bell:     { skin: "#e9c3a0", hair: "#3d2f25", hairStyle: "short", hat: "visor", hatColor: "#4a3628", coat: "#e8e2d4", shirt: "#e8e2d4", striped: true, acc: "cravat", pants: "#2f2c29" },
    cobb:     { skin: "#e6c09c", hair: "#2a2420", hairStyle: "short", facial: "chinbeard", hat: "stovepipe", hatColor: "#1d1b1a", coat: "#232120", shirt: "#ece6d8", acc: "crate", build: "thin", pants: "#232120" },
    hale:     { skin: "#f2d2b8", hair: "#6a4a30", hairStyle: "bunMiddle", coat: "#7d7f85", shirt: "#7d7f85", collar: "white", acc: "book", female: true, pants: "#7d7f85" },
  };

  // Expression name -> face settings.
  const FACES = {
    worried:   { brows: "worried", eyes: "normal", mouth: "flat" },
    determined:{ brows: "firm", eyes: "normal", mouth: "firm" },
    nervous:   { brows: "worried", eyes: "normal", mouth: "tight", sweat: true },
    panicked:  { brows: "raised", eyes: "wide", mouth: "open", sweat: true },
    scowl:     { brows: "angry", eyes: "normal", mouth: "frown" },
    smug:      { brows: "raisedOne", eyes: "half", mouth: "smirk" },
    proud:     { brows: "raised", eyes: "happy", mouth: "grin" },
    teary:     { brows: "worried", eyes: "normal", mouth: "wobble", tear: true },
    sly:       { brows: "raisedOne", eyes: "half", mouth: "smirk" },
    shocked:   { brows: "raised", eyes: "wide", mouth: "O" },
    wry:       { brows: "raisedOne", eyes: "normal", mouth: "smallSmile" },
    serious:   { brows: "firm", eyes: "normal", mouth: "flat" },
    grin:      { brows: "raised", eyes: "happy", mouth: "grin" },
    offended:  { brows: "angry", eyes: "normal", mouth: "frown" },
    shouting:  { brows: "raised", eyes: "wide", mouth: "shout" },
    scheming:  { brows: "angry", eyes: "half", mouth: "smirk" },
    wink:      { brows: "raisedOne", eyes: "wink", mouth: "grin" },
    cheerful:  { brows: "raised", eyes: "happy", mouth: "grin" },
    stern:     { brows: "firm", eyes: "half", mouth: "flat" },
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * (1 + amt))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 + amt))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ---------- Portrait (SVG, 400 x 500) ----------
  function portraitSVG(id, expr) {
    if (id === "senator") return goatSVG(expr);
    const L = LOOKS[id] || LOOKS.player;
    const F = FACES[expr] || FACES.serious;
    const s = `stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
    const skinS = shade(L.skin, -0.18);
    const hairS = shade(L.hair, -0.25);
    const cx = 206, cy = 200;
    const wide = L.build === "heavy" ? 1.12 : L.build === "thin" ? 0.9 : L.build === "strong" ? 1.08 : 1;
    let o = "";

    // Body
    const sw = 150 * wide;
    o += `<path d="M${cx - sw - 20} 500 C${cx - sw - 10} 400 ${cx - sw + 10} 345 ${cx - 52} 320 L${cx + 52} 320 C${cx + sw - 10} 345 ${cx + sw + 10} 400 ${cx + sw + 20} 500 Z" fill="${L.coat}" ${s}/>`;
    if (L.checked) {
      for (let x = cx - sw; x < cx + sw; x += 26) o += `<line x1="${x}" y1="335" x2="${x}" y2="500" stroke="${shade(L.coat, -0.3)}" stroke-width="4" opacity=".55"/>`;
      for (let y = 340; y < 500; y += 26) o += `<line x1="${cx - sw}" y1="${y}" x2="${cx + sw}" y2="${y}" stroke="${shade(L.coat, -0.3)}" stroke-width="4" opacity=".55"/>`;
    }
    if (L.striped) {
      for (let x = cx - sw; x < cx + sw; x += 18) o += `<line x1="${x}" y1="330" x2="${x}" y2="500" stroke="#9aa6b8" stroke-width="3" opacity=".7"/>`;
    }
    // Shirt front / collar
    if (L.shirt && L.shirt !== L.coat) {
      o += `<path d="M${cx - 46} 322 L${cx} 420 L${cx + 46} 322 Z" fill="${L.shirt}" ${s}/>`;
    }
    if (L.collar === "high") o += `<path d="M${cx - 40} 318 Q${cx} 340 ${cx + 40} 318 L${cx + 36} 300 Q${cx} 318 ${cx - 36} 300 Z" fill="${L.coat}" ${s}/>`;
    if (L.collar === "white") o += `<path d="M${cx - 44} 320 Q${cx - 20} 350 ${cx} 330 Q${cx + 20} 350 ${cx + 44} 320 L${cx + 36} 302 Q${cx} 322 ${cx - 36} 302 Z" fill="#f6f3ea" ${s}/>`;
    if (L.collar === "lace") {
      o += `<path d="M${cx - 50} 318 Q${cx} 360 ${cx + 50} 318 L${cx + 36} 298 Q${cx} 322 ${cx - 36} 298 Z" fill="#f4efe2" ${s}/>`;
      for (let i = -3; i <= 3; i++) o += `<circle cx="${cx + i * 14}" cy="${336 - Math.abs(i) * 3}" r="5" fill="#f4efe2" stroke="${INK}" stroke-width="2.5"/>`;
    }
    // Accessories on the body
    if (L.acc === "apron") {
      o += `<path d="M${cx - 70} 360 L${cx + 70} 360 L${cx + 84} 500 L${cx - 84} 500 Z" fill="${L.apron}" ${s}/>`;
      o += `<path d="M${cx - 60} 362 L${cx - 40} 322 M${cx + 60} 362 L${cx + 40} 322" fill="none" ${s}/>`;
    }
    if (L.acc === "shawl") o += `<path d="M${cx - sw + 4} 380 Q${cx - 70} 330 ${cx - 40} 318 L${cx} 400 L${cx + 40} 318 Q${cx + 70} 330 ${cx + sw - 4} 380 L${cx + sw - 10} 430 Q${cx} 470 ${cx - sw + 10} 430 Z" fill="${L.shawl}" ${s}/>`;
    if (L.acc === "bowtie") o += `<path d="M${cx} 330 L${cx - 30} 316 L${cx - 30} 346 Z M${cx} 330 L${cx + 30} 316 L${cx + 30} 346 Z" fill="#1d1b1a" ${s}/>`;
    if (L.acc === "cravat") o += `<path d="M${cx - 20} 322 L${cx + 20} 322 L${cx + 10} 370 L${cx} 385 L${cx - 10} 370 Z" fill="#7a2e2a" ${s}/>`;
    if (L.acc === "ledger") o += `<rect x="${cx - 70}" y="380" width="120" height="150" rx="6" fill="#6b3f26" ${s} transform="rotate(-8 ${cx} 420)"/>`;
    if (L.acc === "book") o += `<rect x="${cx + 10}" y="390" width="95" height="125" rx="5" fill="#7a2e2a" ${s} transform="rotate(10 ${cx} 420)"/>`;
    if (L.acc === "envelope") o += `<g transform="rotate(-12 ${cx + 110} 330)"><rect x="${cx + 70}" y="300" width="96" height="62" fill="#f4efe2" ${s}/><path d="M${cx + 70} 300 L${cx + 118} 336 L${cx + 166} 300" fill="none" ${s}/></g>`;
    if (L.acc === "crate") o += `<rect x="${cx + 20}" y="350" width="240" height="56" fill="#9b7348" ${s} transform="rotate(-24 ${cx + 120} 380)"/>`;
    if (L.acc === "rope") for (let i = 0; i < 3; i++) o += `<ellipse cx="${cx - 95 + i * 6}" cy="${372 + i * 4}" rx="${46 - i * 8}" ry="${30 - i * 5}" fill="none" stroke="#b8925a" stroke-width="9"/><ellipse cx="${cx - 95 + i * 6}" cy="${372 + i * 4}" rx="${46 - i * 8}" ry="${30 - i * 5}" fill="none" stroke="${INK}" stroke-width="2" opacity=".6"/>`;

    // Neck
    o += `<path d="M${cx - 30} 262 L${cx - 32} 322 Q${cx} 336 ${cx + 32} 322 L${cx + 30} 262 Z" fill="${skinS}" ${s}/>`;

    // Hair behind head
    if (L.hairStyle === "bunMiddle") o += `<circle cx="${cx - 58}" cy="${cy + 40}" r="34" fill="${L.hair}" ${s}/>`;
    if (L.hairStyle === "curly") for (let i = 0; i < 7; i++) o += `<circle cx="${cx - 72 + i * 24}" cy="${cy - 70 + Math.abs(i - 3) * 9}" r="24" fill="${L.hair}" ${s}/>`;

    // Ears
    o += `<ellipse cx="${cx - 70}" cy="${cy + 8}" rx="13" ry="21" fill="${L.skin}" ${s}/>`;
    o += `<ellipse cx="${cx + 70}" cy="${cy + 8}" rx="13" ry="21" fill="${L.skin}" ${s}/>`;

    // Head
    const head = `M${cx} ${cy - 92} C${cx + 52} ${cy - 92} ${cx + 72} ${cy - 50} ${cx + 70} ${cy + 4} C${cx + 68} ${cy + 58} ${cx + 40} ${cy + 88} ${cx} ${cy + 90} C${cx - 40} ${cy + 88} ${cx - 68} ${cy + 58} ${cx - 70} ${cy + 4} C${cx - 72} ${cy - 50} ${cx - 52} ${cy - 92} ${cx} ${cy - 92} Z`;
    const clipId = "hc" + id + expr;
    o += `<defs><clipPath id="${clipId}"><path d="${head}"/></clipPath></defs>`;
    o += `<path d="${head}" fill="${L.skin}"/>`;
    // Cel shadow on the far side of the face
    o += `<g clip-path="url(#${clipId})"><ellipse cx="${cx - 104}" cy="${cy + 10}" rx="64" ry="120" fill="${skinS}" opacity=".9"/></g>`;
    if (L.stubble) o += `<g clip-path="url(#${clipId})"><path d="M${cx - 70} ${cy + 30} Q${cx} ${cy + 120} ${cx + 70} ${cy + 30} L${cx + 70} ${cy + 100} L${cx - 70} ${cy + 100} Z" fill="#5a4a3a" opacity=".22"/></g>`;
    if (L.old) o += `<path d="M${cx - 34} ${cy - 50} Q${cx} ${cy - 56} ${cx + 34} ${cy - 50} M${cx - 26} ${cy - 38} Q${cx} ${cy - 42} ${cx + 26} ${cy - 38}" fill="none" stroke="${INK}" stroke-width="2.5" opacity=".5"/>`;
    o += `<path d="${head}" fill="none" ${s}/>`;

    // Facial hair
    if (L.facial === "muttonchops") {
      o += `<path d="M${cx - 70} ${cy - 10} Q${cx - 74} ${cy + 60} ${cx - 34} ${cy + 74} Q${cx - 40} ${cy + 40} ${cx - 50} ${cy - 6} Z" fill="${L.hair}" ${s}/>`;
      o += `<path d="M${cx + 70} ${cy - 10} Q${cx + 74} ${cy + 60} ${cx + 34} ${cy + 74} Q${cx + 40} ${cy + 40} ${cx + 50} ${cy - 6} Z" fill="${L.hair}" ${s}/>`;
    }
    if (L.facial === "shortbeard") o += `<path d="M${cx - 66} ${cy + 20} Q${cx - 60} ${cy + 96} ${cx} ${cy + 100} Q${cx + 60} ${cy + 96} ${cx + 66} ${cy + 20} Q${cx + 50} ${cy + 66} ${cx} ${cy + 64} Q${cx - 50} ${cy + 66} ${cx - 66} ${cy + 20} Z" fill="${L.hair}" ${s}/>`;
    if (L.facial === "chinbeard") o += `<path d="M${cx - 18} ${cy + 82} Q${cx} ${cy + 140} ${cx + 18} ${cy + 82} Z" fill="${L.hair}" ${s}/>`;

    // Eyes
    const ex = [cx - 28, cx + 30], ey = cy - 4;
    ex.forEach((x, i) => {
      if (F.eyes === "happy" || (F.eyes === "wink" && i === 1)) {
        o += `<path d="M${x - 13} ${ey + 3} Q${x} ${ey - 9} ${x + 13} ${ey + 3}" fill="none" ${s}/>`;
        return;
      }
      const ry = F.eyes === "wide" ? 13 : 9;
      o += `<ellipse cx="${x}" cy="${ey}" rx="13" ry="${ry}" fill="#fbf8f2" stroke="${INK}" stroke-width="3.5"/>`;
      o += `<circle cx="${x + 2}" cy="${ey + 1}" r="${F.eyes === "wide" ? 4 : 5.5}" fill="${INK}"/>`;
      if (F.eyes === "half") o += `<path d="M${x - 15} ${ey - 1} Q${x} ${ey - 4} ${x + 15} ${ey - 1} L${x + 15} ${ey - 14} L${x - 15} ${ey - 14} Z" fill="${L.skin}" stroke="${INK}" stroke-width="3.5"/>`;
    });

    // Brows
    const bc = L.hairStyle === "balding" ? shade(L.hair, -0.3) : hairS;
    const by = cy - 26;
    const brow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${bc}" stroke-width="8" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`;
    const b = F.brows;
    if (b === "worried") { o += brow(cx - 44, by + 2, cx - 14, by - 8); o += brow(cx + 16, by - 8, cx + 46, by + 2); }
    else if (b === "angry") { o += brow(cx - 44, by - 6, cx - 14, by + 6); o += brow(cx + 16, by + 6, cx + 46, by - 6); }
    else if (b === "raised") { o += brow(cx - 44, by - 6, cx - 14, by - 10); o += brow(cx + 16, by - 10, cx + 46, by - 6); }
    else if (b === "raisedOne") { o += brow(cx - 44, by + 2, cx - 14, by + 2); o += brow(cx + 16, by - 12, cx + 46, by - 6); }
    else { o += brow(cx - 44, by, cx - 14, by + 2); o += brow(cx + 16, by + 2, cx + 46, by); }

    // Nose
    o += `<path d="M${cx + 2} ${cy + 4} Q${cx + 12} ${cy + 30} ${cx + 10} ${cy + 36} Q${cx + 2} ${cy + 42} ${cx - 10} ${cy + 36}" fill="none" stroke="${INK}" stroke-width="3.5"/>`;
    if (L.freckles) for (let i = 0; i < 9; i++) o += `<circle cx="${cx - 44 + (i % 3) * 8 + (i > 4 ? 72 : 0)}" cy="${cy + 26 + Math.floor(i / 3) * 6}" r="2.2" fill="#a0522d" opacity=".7"/>`;

    // Mustache sits over the mouth
    const my = cy + 56;
    const m = F.mouth;
    if (m === "grin") o += `<path d="M${cx - 30} ${my - 4} Q${cx} ${my + 30} ${cx + 30} ${my - 4} Z" fill="#fbf8f2" ${s}/>`;
    else if (m === "open") o += `<ellipse cx="${cx}" cy="${my + 4}" rx="16" ry="14" fill="#5a1f1a" ${s}/>`;
    else if (m === "shout") o += `<path d="M${cx - 28} ${my - 8} Q${cx} ${my + 42} ${cx + 28} ${my - 8} Q${cx} ${my - 2} ${cx - 28} ${my - 8} Z" fill="#5a1f1a" ${s}/>`;
    else if (m === "O") o += `<ellipse cx="${cx}" cy="${my + 4}" rx="10" ry="13" fill="#5a1f1a" ${s}/>`;
    else if (m === "frown") o += `<path d="M${cx - 24} ${my + 8} Q${cx} ${my - 8} ${cx + 24} ${my + 8}" fill="none" ${s}/>`;
    else if (m === "smirk") o += `<path d="M${cx - 20} ${my + 2} Q${cx + 8} ${my + 6} ${cx + 26} ${my - 8}" fill="none" ${s}/>`;
    else if (m === "smallSmile") o += `<path d="M${cx - 18} ${my} Q${cx} ${my + 10} ${cx + 20} ${my - 2}" fill="none" ${s}/>`;
    else if (m === "tight") o += `<path d="M${cx - 26} ${my} Q${cx} ${my + 8} ${cx + 26} ${my} M${cx - 18} ${my + 3} L${cx + 18} ${my + 3}" fill="none" ${s}/>`;
    else if (m === "wobble") o += `<path d="M${cx - 22} ${my + 4} Q${cx - 11} ${my - 4} ${cx} ${my + 4} Q${cx + 11} ${my - 4} ${cx + 22} ${my + 4}" fill="none" ${s}/>`;
    else if (m === "firm") o += `<path d="M${cx - 22} ${my + 2} L${cx + 22} ${my}" fill="none" ${s}/>`;
    else o += `<path d="M${cx - 20} ${my + 2} Q${cx} ${my + 4} ${cx + 20} ${my + 2}" fill="none" ${s}/>`;
    if (L.facial === "mustache") o += `<path d="M${cx - 44} ${my - 2} Q${cx - 30} ${my - 26} ${cx} ${my - 14} Q${cx + 30} ${my - 26} ${cx + 44} ${my - 2} Q${cx + 20} ${my - 6} ${cx} ${my - 4} Q${cx - 20} ${my - 6} ${cx - 44} ${my - 2} Z" fill="${L.hair}" ${s}/>`;

    // Hair on top
    const hs = L.hairStyle;
    if (hs === "bunMiddle" || hs === "bunTop") {
      o += `<path d="M${cx - 72} ${cy + 10} C${cx - 80} ${cy - 80} ${cx - 30} ${cy - 100} ${cx} ${cy - 96} C${cx + 30} ${cy - 100} ${cx + 80} ${cy - 80} ${cx + 72} ${cy + 10} C${cx + 60} ${cy - 40} ${cx + 30} ${cy - 66} ${cx} ${cy - 70} C${cx - 30} ${cy - 66} ${cx - 60} ${cy - 40} ${cx - 72} ${cy + 10} Z" fill="${L.hair}" ${s}/>`;
      o += `<path d="M${cx} ${cy - 96} L${cx} ${cy - 70}" stroke="${hairS}" stroke-width="4"/>`;
      if (hs === "bunTop") o += `<circle cx="${cx}" cy="${cy - 108}" r="28" fill="${L.hair}" ${s}/>`;
    } else if (hs === "balding") {
      o += `<path d="M${cx - 74} ${cy + 6} Q${cx - 80} ${cy - 46} ${cx - 54} ${cy - 62} Q${cx - 62} ${cy - 20} ${cx - 64} ${cy + 6} Z" fill="${L.hair}" ${s}/>`;
      o += `<path d="M${cx + 74} ${cy + 6} Q${cx + 80} ${cy - 46} ${cx + 54} ${cy - 62} Q${cx + 62} ${cy - 20} ${cx + 64} ${cy + 6} Z" fill="${L.hair}" ${s}/>`;
      o += `<path d="M${cx - 10} ${cy - 92} Q${cx} ${cy - 112} ${cx + 14} ${cy - 104} M${cx + 6} ${cy - 92} Q${cx + 18} ${cy - 110} ${cx + 30} ${cy - 98}" fill="none" stroke="${L.hair}" stroke-width="4"/>`;
    } else if (hs === "curly") {
      // drawn behind; add a fringe
      for (let i = 0; i < 5; i++) o += `<circle cx="${cx - 48 + i * 24}" cy="${cy - 78 + Math.abs(i - 2) * 6}" r="18" fill="${L.hair}" ${s}/>`;
    } else if (hs === "cropped") {
      o += `<path d="M${cx - 70} ${cy - 6} C${cx - 74} ${cy - 84} ${cx - 30} ${cy - 96} ${cx} ${cy - 96} C${cx + 30} ${cy - 96} ${cx + 74} ${cy - 84} ${cx + 70} ${cy - 6} C${cx + 62} ${cy - 50} ${cx + 30} ${cy - 76} ${cx} ${cy - 78} C${cx - 30} ${cy - 76} ${cx - 62} ${cy - 50} ${cx - 70} ${cy - 6} Z" fill="${L.hair}" ${s}/>`;
    } else {
      o += `<path d="M${cx - 72} ${cy - 2} C${cx - 82} ${cy - 90} ${cx - 20} ${cy - 108} ${cx + 10} ${cy - 100} C${cx + 60} ${cy - 96} ${cx + 82} ${cy - 66} ${cx + 72} ${cy - 2} C${cx + 64} ${cy - 50} ${cx + 40} ${cy - 62} ${cx + 4} ${cy - 66} C${cx - 30} ${cy - 62} ${cx - 62} ${cy - 46} ${cx - 72} ${cy - 2} Z" fill="${L.hair}" ${s}/>`;
    }

    // Glasses
    if (L.glasses === "round") ex.forEach((x) => (o += `<circle cx="${x}" cy="${ey}" r="19" fill="none" stroke="${INK}" stroke-width="3.5"/>`));
    if (L.glasses === "wire") ex.forEach((x) => (o += `<ellipse cx="${x}" cy="${ey}" rx="20" ry="14" fill="none" stroke="#6b6560" stroke-width="3"/>`));
    if (L.glasses === "half") ex.forEach((x) => (o += `<path d="M${x - 19} ${ey + 6} L${x + 19} ${ey + 6} Q${x + 18} ${ey + 22} ${x} ${ey + 22} Q${x - 18} ${ey + 22} ${x - 19} ${ey + 6} Z" fill="#ffffff" fill-opacity=".25" stroke="${INK}" stroke-width="3"/>`));
    if (L.glasses) o += `<path d="M${ex[0] + 19} ${ey} Q${cx + 1} ${ey - 6} ${ex[1] - 19} ${ey}" fill="none" stroke="${INK}" stroke-width="3"/>`;

    // Hats
    const hc = L.hatColor, hcs = hc ? shade(hc, -0.25) : null;
    if (L.hat === "slouch" || L.hat === "wide") {
      o += `<ellipse cx="${cx}" cy="${cy - 64}" rx="${L.hat === "wide" ? 150 : 130}" ry="30" fill="${hc}" ${s}/>`;
      o += `<path d="M${cx - 66} ${cy - 66} C${cx - 70} ${cy - 150} ${cx + 70} ${cy - 150} ${cx + 66} ${cy - 66} Z" fill="${hcs}" ${s}/>`;
      o += `<path d="M${cx - 64} ${cy - 76} Q${cx} ${cy - 66} ${cx + 64} ${cy - 76}" fill="none" stroke="#2a211b" stroke-width="10"/>`;
    }
    if (L.hat === "stovepipe") {
      o += `<ellipse cx="${cx}" cy="${cy - 64}" rx="104" ry="20" fill="${hc}" ${s}/>`;
      o += `<path d="M${cx - 64} ${cy - 66} L${cx - 70} ${cy - 220} Q${cx} ${cy - 232} ${cx + 70} ${cy - 220} L${cx + 64} ${cy - 66} Z" fill="${hc}" ${s}/>`;
      o += `<path d="M${cx - 66} ${cy - 92} L${cx + 66} ${cy - 92}" stroke="#4a4440" stroke-width="12"/>`;
    }
    if (L.hat === "flatcap") {
      o += `<path d="M${cx - 76} ${cy - 46} C${cx - 84} ${cy - 120} ${cx + 70} ${cy - 130} ${cx + 82} ${cy - 56} Q${cx + 20} ${cy - 66} ${cx - 76} ${cy - 46} Z" fill="${hc}" ${s}/>`;
      o += `<path d="M${cx + 20} ${cy - 62} Q${cx + 90} ${cy - 66} ${cx + 116} ${cy - 46} Q${cx + 70} ${cy - 40} ${cx + 30} ${cy - 50} Z" fill="${hcs}" ${s}/>`;
    }
    if (L.hat === "visor") {
      o += `<path d="M${cx - 72} ${cy - 56} Q${cx} ${cy - 76} ${cx + 72} ${cy - 56} L${cx + 72} ${cy - 40} Q${cx} ${cy - 60} ${cx - 72} ${cy - 40} Z" fill="${hcs}" ${s}/>`;
      o += `<path d="M${cx - 60} ${cy - 46} Q${cx + 10} ${cy - 66} ${cx + 110} ${cy - 30} Q${cx + 20} ${cy - 30} ${cx - 60} ${cy - 46} Z" fill="${hc}" fill-opacity=".85" ${s}/>`;
    }

    // Extras
    if (F.sweat) o += `<path d="M${cx + 64} ${cy - 46} Q${cx + 74} ${cy - 28} ${cx + 64} ${cy - 22} Q${cx + 54} ${cy - 28} ${cx + 64} ${cy - 46} Z" fill="#bfe3f2" stroke="${INK}" stroke-width="2.5"/>`;
    if (F.tear) o += `<path d="M${ex[1] + 4} ${ey + 12} Q${ex[1] + 12} ${ey + 30} ${ex[1] + 4} ${ey + 36} Q${ex[1] - 4} ${ey + 30} ${ex[1] + 4} ${ey + 12} Z" fill="#bfe3f2" stroke="${INK}" stroke-width="2.5"/>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">${o}</svg>`;
  }

  function goatSVG(expr) {
    const s = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
    let o = "";
    o += `<ellipse cx="200" cy="470" rx="150" ry="90" fill="#efece4" ${s}/>`;
    o += `<path d="M150 160 Q120 80 160 60 M250 160 Q280 80 240 60" fill="none" stroke="#8a7a62" stroke-width="16" stroke-linecap="round"/>`;
    o += `<ellipse cx="110" cy="200" rx="46" ry="18" fill="#efece4" ${s} transform="rotate(-20 110 200)"/>`;
    o += `<ellipse cx="290" cy="200" rx="46" ry="18" fill="#efece4" ${s} transform="rotate(20 290 200)"/>`;
    o += `<path d="M200 140 C260 140 280 220 260 300 C250 350 230 380 200 382 C170 380 150 350 140 300 C120 220 140 140 200 140 Z" fill="#f6f3ec" ${s}/>`;
    o += `<path d="M180 370 Q200 440 220 370" fill="#efece4" ${s}/>`;
    o += `<ellipse cx="172" cy="230" rx="11" ry="8" fill="#e8c35a" stroke="${INK}" stroke-width="3"/><rect x="164" y="227" width="16" height="5" fill="${INK}"/>`;
    o += `<ellipse cx="228" cy="230" rx="11" ry="8" fill="#e8c35a" stroke="${INK}" stroke-width="3"/><rect x="220" y="227" width="16" height="5" fill="${INK}"/>`;
    o += `<ellipse cx="190" cy="320" rx="5" ry="4" fill="${INK}"/><ellipse cx="210" cy="320" rx="5" ry="4" fill="${INK}"/>`;
    if (expr === "bleating") o += `<ellipse cx="200" cy="350" rx="18" ry="14" fill="#5a1f1a" ${s}/>`;
    else o += `<path d="M180 346 Q200 356 220 346" fill="none" ${s}/>`;
    o += `<g transform="rotate(12 250 360)"><rect x="210" y="335" width="110" height="70" fill="#f1ead8" ${s}/><path d="M222 352 H300 M222 366 H310 M222 380 H290" stroke="#b9ae96" stroke-width="5"/></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">${o}</svg>`;
  }

  // ---------- Cut-scene backgrounds (SVG, 1600 x 900) ----------
  const ROOMS = {
    cabin:   { wall: "#7a5638", trim: "#4f3826", floor: "#5e4430", logs: true },
    polling: { wall: "#cfc3a6", trim: "#7a6a52", floor: "#8a6f50", planks: true },
    tavern:  { wall: "#4b3526", trim: "#2d1f16", floor: "#3a2a1e", planks: true },
    store:   { wall: "#b59468", trim: "#6b4f33", floor: "#7a5a3c", planks: true },
    post:    { wall: "#9aa6a8", trim: "#5d6667", floor: "#7a6550", planks: true },
    forge:   { wall: "#3a2e28", trim: "#241c18", floor: "#2c2420", stone: true },
    print:   { wall: "#c2b28e", trim: "#6d5d45", floor: "#6e5842", planks: true },
    school:  { wall: "#c9b79a", trim: "#7f3a2c", floor: "#806246", planks: true },
    ferry:   { outdoor: "creek" },
    wagon:   { outdoor: "street" },
  };

  function backgroundSVG(place) {
    const R = ROOMS[place] || ROOMS.polling;
    const s = `stroke="${INK}" stroke-width="5" stroke-linejoin="round"`;
    let o = "";
    if (R.outdoor) {
      o += `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fc0de"/><stop offset="1" stop-color="#e6eed6"/></linearGradient></defs>`;
      o += `<rect width="1600" height="900" fill="url(#sky)"/>`;
      o += `<path d="M0 470 Q400 430 800 460 T1600 450 L1600 900 L0 900 Z" fill="#9fb26a"/>`;
      if (R.outdoor === "creek") {
        o += `<path d="M560 900 Q760 640 980 560 T1600 520 L1600 900 Z" fill="#5f8fa8" ${s}/>`;
        o += `<path d="M760 760 h220 M900 680 h160 M1100 600 h180" stroke="#cfe4ee" stroke-width="6" stroke-linecap="round"/>`;
        o += `<path d="M980 700 L1380 640 L1430 700 L1030 760 Z" fill="#9b7348" ${s}/>`;
        o += `<path d="M700 500 L1500 430" stroke="#6b5340" stroke-width="5"/>`;
        o += tree(1240, 470, 1.4) + tree(1420, 470, 1.1) + tree(420, 480, 1.2);
        o += `<rect x="1240" y="420" width="160" height="110" fill="#8a6b4a" ${s}/><path d="M1225 425 L1320 360 L1415 425 Z" fill="#5b4636" ${s}/>`;
      } else {
        o += `<rect x="0" y="560" width="1600" height="340" fill="#c4a77a"/>`;
        o += `<rect x="760" y="300" width="300" height="200" fill="#c9b08a" ${s}/><path d="M740 305 L910 220 L1080 305 Z" fill="#6b625a" ${s}/>`;
        o += `<rect x="1180" y="320" width="260" height="180" fill="#9b4a3a" ${s}/><path d="M1165 325 L1310 250 L1455 325 Z" fill="#5b4636" ${s}/>`;
        // wagon
        o += `<path d="M900 620 Q1050 420 1260 620 Z" fill="#efe9da" ${s}/>`;
        o += `<rect x="880" y="610" width="400" height="80" fill="#8a5a36" ${s}/>`;
        o += `<circle cx="950" cy="720" r="58" fill="none" stroke="${INK}" stroke-width="12"/><circle cx="1210" cy="720" r="58" fill="none" stroke="${INK}" stroke-width="12"/>`;
        o += `<rect x="1000" y="570" width="260" height="34" fill="#9b7348" ${s} transform="rotate(-6 1100 590)"/>`;
      }
    } else {
      o += `<rect width="1600" height="900" fill="${R.wall}"/>`;
      if (R.logs) for (let y = 30; y < 600; y += 54) o += `<rect x="0" y="${y}" width="1600" height="44" rx="22" fill="${shade(R.wall, (y % 108 ? -0.06 : 0.05))}" stroke="${INK}" stroke-width="3" opacity=".9"/>`;
      if (R.planks) for (let x = 0; x < 1600; x += 90) o += `<line x1="${x}" y1="0" x2="${x}" y2="610" stroke="${shade(R.wall, -0.25)}" stroke-width="4"/>`;
      if (R.stone) for (let y = 20; y < 600; y += 60) for (let x = (y / 60) % 2 ? 0 : 50; x < 1600; x += 100) o += `<rect x="${x}" y="${y}" width="92" height="52" rx="10" fill="${shade(R.wall, ((x + y) % 3) * 0.06)}" stroke="#18120f" stroke-width="3"/>`;
      o += `<rect x="0" y="600" width="1600" height="300" fill="${R.floor}"/>`;
      for (let x = -200; x < 1800; x += 140) o += `<line x1="${x}" y1="600" x2="${x - 220}" y2="900" stroke="${shade(R.floor, -0.25)}" stroke-width="4"/>`;
      o += `<rect x="0" y="585" width="1600" height="22" fill="${R.trim}"/>`;
      o += props(place, s);
    }
    // darker left third so the portrait stands out
    o += `<defs><linearGradient id="lft" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".45" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="1600" height="900" fill="url(#lft)"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">${o}</svg>`;
  }

  function tree(x, y, k) {
    return `<rect x="${x - 10 * k}" y="${y - 40 * k}" width="${20 * k}" height="${80 * k}" fill="#6b4a2f" stroke="${INK}" stroke-width="4"/>` +
      `<circle cx="${x}" cy="${y - 90 * k}" r="${70 * k}" fill="#5f7d3a" stroke="${INK}" stroke-width="5"/>` +
      `<circle cx="${x - 50 * k}" cy="${y - 50 * k}" r="${50 * k}" fill="#6a8a42" stroke="${INK}" stroke-width="5"/>` +
      `<circle cx="${x + 50 * k}" cy="${y - 56 * k}" r="${52 * k}" fill="#577536" stroke="${INK}" stroke-width="5"/>`;
  }

  function windowSVG(x, y, w, h, s) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bcd9e6" ${s}/><path d="M${x} ${y + h * 0.62} Q${x + w / 2} ${y + h * 0.5} ${x + w} ${y + h * 0.6} L${x + w} ${y + h} L${x} ${y + h} Z" fill="#a9b86a"/><path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="${INK}" stroke-width="6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${s}/>`;
  }

  function props(place, s) {
    let o = "";
    switch (place) {
      case "cabin":
        o += windowSVG(700, 170, 220, 180, s);
        o += `<rect x="1150" y="180" width="330" height="420" fill="#8b8379" ${s}/><rect x="1215" y="390" width="200" height="210" fill="#2b1d16" ${s}/><path d="M1250 600 Q1290 470 1315 560 Q1340 450 1380 600 Z" fill="#f0a23a" stroke="#c45a1c" stroke-width="5"/>`;
        o += `<rect x="560" y="640" width="380" height="30" fill="#7a5a3c" ${s}/><rect x="590" y="670" width="22" height="150" fill="#6b4a2f" ${s}/><rect x="890" y="670" width="22" height="150" fill="#6b4a2f" ${s}/>`;
        break;
      case "polling":
        o += windowSVG(560, 160, 200, 170, s) + windowSVG(1200, 160, 200, 170, s);
        o += `<rect x="760" y="560" width="520" height="34" fill="#7a5a3c" ${s}/><rect x="790" y="594" width="24" height="200" fill="#6b4a2f" ${s}/><rect x="1226" y="594" width="24" height="200" fill="#6b4a2f" ${s}/>`;
        o += `<rect x="930" y="470" width="150" height="92" fill="#8a5a36" ${s}/><rect x="975" y="468" width="60" height="10" fill="${INK}"/>`;
        // the empty chair
        o += `<path d="M1340 420 L1340 640 M1440 420 L1440 640" stroke="#6b4a2f" stroke-width="18" stroke-linecap="round"/><path d="M1340 430 H1440 M1340 480 H1440 M1340 530 H1440" stroke="#6b4a2f" stroke-width="12"/><rect x="1320" y="630" width="140" height="22" fill="#7a5a3c" ${s}/><path d="M1330 652 L1325 800 M1450 652 L1455 800" stroke="#6b4a2f" stroke-width="16" stroke-linecap="round"/>`;
        break;
      case "tavern":
        o += `<rect x="560" y="180" width="980" height="22" fill="#2d1f16"/><rect x="560" y="300" width="980" height="22" fill="#2d1f16"/>`;
        for (let i = 0; i < 16; i++) o += `<rect x="${590 + i * 58}" y="${(i % 3) * 8 + 120}" width="30" height="${60 - (i % 3) * 8}" rx="8" fill="${["#5f7d3a", "#7a2e2a", "#c08a2b"][i % 3]}" stroke="${INK}" stroke-width="3"/>`;
        for (let i = 0; i < 12; i++) o += `<ellipse cx="${620 + i * 76}" cy="270" rx="22" ry="28" fill="#9b7348" stroke="${INK}" stroke-width="3"/>`;
        o += `<rect x="480" y="520" width="1120" height="70" fill="#5a3d28" ${s}/><rect x="500" y="590" width="1100" height="260" fill="#4a3220" ${s}/>`;
        o += `<path d="M1300 40 V120" stroke="${INK}" stroke-width="4"/><rect x="1270" y="120" width="60" height="80" rx="10" fill="#f0c860" ${s}/>`;
        break;
      case "store":
        for (let r = 0; r < 4; r++) {
          o += `<rect x="1000" y="${130 + r * 115}" width="560" height="16" fill="#6b4f33" ${s}/>`;
          for (let i = 0; i < 9; i++) o += `<rect x="${1015 + i * 60}" y="${78 + r * 115}" width="44" height="52" fill="${["#c08a2b", "#7a2e2a", "#5d6667", "#8a6f50"][(i + r) % 4]}" stroke="${INK}" stroke-width="3"/>`;
        }
        // portrait of Henry Clay
        o += `<rect x="560" y="120" width="240" height="300" fill="#c08a2b" ${s}/><rect x="585" y="145" width="190" height="250" fill="#3a3a44" ${s}/>`;
        o += `<ellipse cx="680" cy="240" rx="52" ry="64" fill="#e9cdb0" stroke="${INK}" stroke-width="4"/><path d="M628 220 Q680 160 732 220 Q720 186 680 182 Q640 186 628 220 Z" fill="#d8d4cc" stroke="${INK}" stroke-width="3"/><path d="M600 395 Q680 300 760 395 Z" fill="#1d1b1a" stroke="${INK}" stroke-width="4"/>`;
        for (let i = 0; i < 3; i++) o += `<ellipse cx="${640 + i * 140}" cy="760" rx="62" ry="90" fill="#9b7348" ${s}/><path d="M${582 + i * 140} 730 H${698 + i * 140} M${582 + i * 140} 790 H${698 + i * 140}" stroke="${INK}" stroke-width="5"/>`;
        break;
      case "post":
        for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) {
          o += `<rect x="${760 + c * 84}" y="${90 + r * 84}" width="84" height="84" fill="#6b4f33" stroke="${INK}" stroke-width="4"/>`;
          if ((r * 9 + c) % 3 === 0) o += `<rect x="${772 + c * 84}" y="${130 + r * 84}" width="60" height="34" fill="#f4efe2" stroke="${INK}" stroke-width="2"/>`;
        }
        o += `<rect x="560" y="560" width="1040" height="60" fill="#7a5a3c" ${s}/><rect x="580" y="620" width="1000" height="230" fill="#6b4f33" ${s}/>`;
        o += `<rect x="1380" y="470" width="44" height="90" rx="12" fill="#f0c860" ${s}/>`;
        break;
      case "forge":
        o += `<defs><radialGradient id="glow"><stop offset="0" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient></defs>`;
        o += `<circle cx="1200" cy="480" r="420" fill="url(#glow)"/>`;
        o += `<rect x="1020" y="420" width="360" height="200" fill="#4a3a32" ${s}/><path d="M1060 440 Q1200 340 1340 440 Z" fill="#ff8a2a" stroke="#c45a1c" stroke-width="5"/>`;
        o += `<rect x="1120" y="80" width="160" height="340" fill="#4a3a32" ${s}/>`;
        o += `<path d="M640 640 L900 640 L860 690 L960 700 L960 730 L600 730 L600 700 L680 690 Z" fill="#3b3b40" ${s}/><rect x="700" y="730" width="160" height="120" fill="#5a3b26" ${s}/>`;
        for (let i = 0; i < 4; i++) o += `<path d="M${620 + i * 70} 200 V${330 + (i % 2) * 30}" stroke="#2b2b30" stroke-width="12" stroke-linecap="round"/>`;
        break;
      case "print":
        o += windowSVG(1260, 150, 220, 190, s);
        o += `<rect x="640" y="250" width="360" height="40" fill="#2b2b30" ${s}/><rect x="660" y="290" width="40" height="520" fill="#2b2b30" ${s}/><rect x="940" y="290" width="40" height="520" fill="#2b2b30" ${s}/><rect x="680" y="520" width="280" height="60" fill="#55555c" ${s}/><path d="M820 290 V510" stroke="${INK}" stroke-width="16"/>`;
        for (let i = 0; i < 4; i++) o += `<rect x="${1120 + i * 24}" y="${620 - i * 36}" width="300" height="36" fill="#f1ead8" ${s}/>`;
        break;
      case "school":
        o += `<rect x="640" y="140" width="700" height="340" fill="#2f3a32" stroke="#6b4f33" stroke-width="18"/>`;
        for (let r = 0; r < 2; r++) o += `<rect x="${560 + r * 40}" y="${660 + r * 110}" width="900" height="30" fill="#7a5a3c" ${s}/>`;
        o += `<rect x="1430" y="430" width="120" height="180" rx="12" fill="#2b2b30" ${s}/><rect x="1475" y="40" width="30" height="390" fill="#2b2b30"/>`;
        break;
    }
    return o;
  }

  // ---------- Intro panel art ----------
  // Simplified map in longitude/latitude. Not to scale for distances.
  const MAP = { lon0: -107, lon1: -87, lat0: 34, lat1: 42.5 };
  function mp(lon, lat) {
    const x = ((lon - MAP.lon0) / (MAP.lon1 - MAP.lon0)) * 1000;
    const y = ((MAP.lat1 - lat) / (MAP.lat1 - MAP.lat0)) * 430;
    return x.toFixed(1) + " " + y.toFixed(1);
  }
  const MISSOURI = [[-95.77, 40.58], [-91.73, 40.61], [-91.4, 40.37], [-91.1, 39.85], [-90.75, 39.45], [-90.18, 38.85], [-90.25, 38.55], [-89.65, 37.95], [-89.5, 37.3], [-89.15, 36.95], [-89.55, 36.5], [-89.7, 36.0], [-90.37, 36.0], [-90.15, 36.5], [-94.62, 36.5], [-94.62, 39.1], [-95.1, 39.6], [-94.9, 39.9], [-95.3, 40.0]];
  const KANSAS = [[-94.62, 37], [-94.62, 39.1], [-95.1, 39.6], [-94.9, 39.9], [-95.3, 40.0], [-106, 40], [-106, 37]];
  const NEBRASKA = [[-95.3, 40.0], [-95.6, 41.0], [-96.1, 42.5], [-106, 42.5], [-106, 40]];
  const poly = (pts) => "M" + pts.map((p) => mp(p[0], p[1])).join(" L") + " Z";

  function mapSVG(which) {
    const t = (x, y, txt, size, weight, fill, anchor) => `<text x="${x}" y="${y}" font-family="Atkinson Hyperlegible, Verdana, sans-serif" font-size="${size}" font-weight="${weight || 400}" fill="${fill || "#2a2420"}" text-anchor="${anchor || "middle"}">${txt}</text>`;
    let o = `<rect width="1000" height="430" fill="#efe6cf"/>`;
    for (let lat = 35; lat <= 42; lat++) o += `<path d="M${mp(MAP.lon0, lat)} L${mp(MAP.lon1, lat)}" stroke="#d6cbb0" stroke-width="1"/>`;
    for (let lon = -106; lon <= -88; lon += 2) o += `<path d="M${mp(lon, MAP.lat0)} L${mp(lon, MAP.lat1)}" stroke="#d6cbb0" stroke-width="1"/>`;
    const y365 = mp(MAP.lon0, 36.5).split(" ")[1];
    const xMoW = mp(-94.62, 36.5).split(" ")[0];
    if (which === "map1820") {
      o += `<rect x="0" y="0" width="${xMoW}" height="${y365}" fill="#7fa3b8" fill-opacity=".35"/>`;
      o += `<rect x="0" y="${y365}" width="${xMoW}" height="${430 - y365}" fill="#c98a5a" fill-opacity=".35"/>`;
      o += `<path d="${poly(MISSOURI)}" fill="#c98a5a" fill-opacity=".75" stroke="#2a2420" stroke-width="2.5"/>`;
      o += `<path d="M0 ${y365} L${xMoW} ${y365}" stroke="#7a2e2a" stroke-width="5" stroke-dasharray="14 8"/>`;
      o += t(xMoW / 2, y365 - 120, "No slavery north of the line", 26, 700);
      o += t(xMoW / 2, +y365 + 60, "Slavery allowed south of the line", 26, 700);
      o += t(+mp(-92.6, 38.5).split(" ")[0], +mp(-92.6, 38.5).split(" ")[1], "Missouri", 24, 700);
      o += t(+mp(-92.6, 38.5).split(" ")[0], +mp(-92.6, 38.5).split(" ")[1] + 26, "slave state", 18);
      o += t(20, +y365 - 10, "36°30′ line", 20, 700, "#7a2e2a", "start");
    } else {
      o += `<path d="${poly(KANSAS)}" fill="#c08a2b" fill-opacity=".45" stroke="#2a2420" stroke-width="2.5"/>`;
      o += `<path d="${poly(NEBRASKA)}" fill="#7fa3b8" fill-opacity=".45" stroke="#2a2420" stroke-width="2.5"/>`;
      o += `<path d="${poly(MISSOURI)}" fill="#c98a5a" fill-opacity=".55" stroke="#2a2420" stroke-width="2.5"/>`;
      o += `<path d="M0 ${y365} L${xMoW} ${y365}" stroke="#7a2e2a" stroke-width="4" stroke-dasharray="14 8" opacity=".45"/>`;
      o += t(30, +y365 - 10, "1820 line erased", 18, 700, "#7a2e2a", "start");
      const k = mp(-100.5, 38.5).split(" ");
      o += t(+k[0], +k[1], "Kansas Territory", 30, 700);
      o += t(+k[0], +k[1] + 32, "voters decide", 22);
      const n = mp(-100.5, 41.4).split(" ");
      o += t(+n[0], +n[1], "Nebraska Territory", 26, 700);
      o += t(+n[0], +n[1] + 28, "voters decide", 20);
      const e = mp(-95.12, 39.35).split(" ");
      o += `<circle cx="${e[0]}" cy="${e[1]}" r="8" fill="#7a2e2a" stroke="#fff" stroke-width="3"/>`;
      o += t(+e[0] - 14, +e[1] - 14, "Easton", 18, 700, "#7a2e2a", "end");
      const m = mp(-92.4, 38.3).split(" ");
      o += t(+m[0], +m[1], "Missouri", 22, 700);
    }
    o += t(990, 420, "Simplified map", 14, 400, "#6b6158", "end");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 430">${o}</svg>`;
  }

  // Placeholder for the Flow intro scenes: a quiet silhouette with no text.
  function introSceneSVG(key) {
    const s = `fill="#2a2420"`;
    let o = `<defs><linearGradient id="isky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${key === "intro-8" ? "#3d5266" : "#e9c98f"}"/><stop offset="1" stop-color="${key === "intro-8" ? "#c9d4dc" : "#f3e6c8"}"/></linearGradient></defs>`;
    o += `<rect width="1000" height="430" fill="url(#isky)"/>`;
    o += `<path d="M0 320 Q250 290 500 310 T1000 300 L1000 430 L0 430 Z" fill="${key === "intro-8" ? "#e9eef0" : "#b9a777"}"/>`;
    switch (key) {
      case "intro-2":
        for (let i = 0; i < 3; i++) o += `<g transform="translate(${180 + i * 230} ${270 - i * 10}) scale(${1 - i * 0.18})"><path d="M0 40 Q80 -60 160 40 Z" fill="#efe9da" stroke="#2a2420" stroke-width="4"/><rect x="-10" y="38" width="180" height="28" ${s}/><circle cx="20" cy="76" r="22" fill="none" stroke="#2a2420" stroke-width="6"/><circle cx="140" cy="76" r="22" fill="none" stroke="#2a2420" stroke-width="6"/></g>`;
        break;
      case "intro-3":
        o += `<path d="M380 300 L380 180 Q500 60 620 180 L620 300 Z" ${s}/><rect x="300" y="290" width="400" height="30" ${s}/><rect x="480" y="40" width="40" height="70" ${s}/>`;
        for (let i = 0; i < 6; i++) o += `<rect x="${330 + i * 66}" y="210" width="16" height="80" fill="#efe6cf"/>`;
        break;
      case "intro-4":
        for (let i = 0; i < 26; i++) o += `<circle cx="${20 + i * 38}" cy="${330 + (i % 3) * 8}" r="18" ${s}/><rect x="${4 + i * 38}" y="${346 + (i % 3) * 8}" width="32" height="90" ${s}/>`;
        for (let i = 0; i < 8; i++) o += `<rect x="${420 + i * 22}" y="250" width="10" height="40" fill="#3d4d66"/>`;
        break;
      case "intro-6":
        for (let i = 0; i < 5; i++) o += `<g transform="translate(${120 + i * 150} ${250 + (i % 2) * 14})"><path d="M0 40 Q30 10 70 20 L90 0 L100 10 L84 40 Q84 70 60 70 L20 70 Q0 70 0 40 Z" ${s}/><rect x="10" y="66" width="8" height="34" ${s}/><rect x="62" y="66" width="8" height="34" ${s}/><rect x="36" y="-30" width="18" height="40" ${s}/><circle cx="45" cy="-38" r="10" ${s}/><path d="M50 -20 L80 -50" stroke="#2a2420" stroke-width="5"/></g>`;
        o += `<rect x="860" y="240" width="110" height="80" ${s}/><path d="M850 245 L915 200 L980 245 Z" ${s}/>`;
        break;
      case "intro-7":
        for (let i = 0; i < 7; i++) o += `<circle cx="${80 + i * 46}" cy="290" r="16" ${s}/><rect x="${66 + i * 46}" y="304" width="28" height="80" ${s}/>`;
        for (let i = 0; i < 7; i++) o += `<circle cx="${640 + i * 46}" cy="290" r="16" ${s}/><rect x="${626 + i * 46}" y="304" width="28" height="80" ${s}/>`;
        break;
      case "intro-8":
        o += `<g transform="translate(470 230)"><path d="M0 40 Q30 10 70 20 L90 0 L100 10 L84 40 Q84 70 60 70 L20 70 Q0 70 0 40 Z" ${s}/><rect x="10" y="66" width="8" height="34" ${s}/><rect x="62" y="66" width="8" height="34" ${s}/><rect x="34" y="-34" width="22" height="46" ${s}/><circle cx="45" cy="-42" r="11" ${s}/></g>`;
        for (let i = 0; i < 40; i++) o += `<circle cx="${(i * 97) % 1000}" cy="${(i * 53) % 300}" r="3" fill="#fff" opacity=".8"/>`;
        break;
      case "intro-9":
        o += `<rect x="560" y="200" width="140" height="110" ${s}/><path d="M545 205 L630 150 L715 205 Z" ${s}/><rect x="740" y="180" width="160" height="130" ${s}/>`;
        o += `<g transform="translate(220 230)"><rect x="0" y="0" width="160" height="70" rx="10" ${s}/><circle cx="30" cy="84" r="22" fill="none" stroke="#2a2420" stroke-width="6"/><circle cx="130" cy="84" r="22" fill="none" stroke="#2a2420" stroke-width="6"/><path d="M-80 60 Q-60 30 -30 40 L-10 30" stroke="#2a2420" stroke-width="10" fill="none"/></g>`;
        break;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 430" preserveAspectRatio="xMidYMid slice">${o}</svg>`;
  }

  // ---------- Real art loading ----------
  const cache = {};
  function probe(src) {
    if (src in cache) return cache[src];
    const listed = window.ART_FILES || [];
    if (src.startsWith("art/") && !listed.includes(src.slice(4))) return (cache[src] = Promise.resolve(null));
    cache[src] = new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
    return cache[src];
  }
  const svgURL = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  // Sets an <img> to real art if it exists, otherwise to the placeholder SVG.
  function setPortrait(img, id, expr) {
    const real = `art/portraits/${id}-${expr}.png`;
    img.dataset.want = real;
    probe(real).then((ok) => {
      if (img.dataset.want !== real) return;
      img.src = ok ? real : svgURL(portraitSVG(id, expr));
    });
  }
  function setBackground(el, place) {
    const real = `art/backgrounds/bg-${place}.png`;
    el.dataset.want = real;
    probe(real).then((ok) => {
      if (el.dataset.want !== real) return;
      el.style.backgroundImage = `url("${ok ? real : svgURL(backgroundSVG(place))}")`;
    });
  }
  function setIntro(el, key) {
    if (key.startsWith("map")) { el.innerHTML = mapSVG(key); return; }
    const real = `art/intro/${key}.png`;
    el.dataset.want = real;
    el.innerHTML = introSceneSVG(key);
    probe(real).then((ok) => {
      if (ok && el.dataset.want === real) el.innerHTML = `<img src="${real}" alt="">`;
    });
  }

  window.ART = { LOOKS, portraitSVG, backgroundSVG, mapSVG, probe, svgURL, setPortrait, setBackground, setIntro };
})();
