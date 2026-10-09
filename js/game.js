/*
 * Where Is Reese Brown? Game flow and screens.
 * Depends on GAME_DATA (data.js), ART (art.js) and World (world.js).
 */
(function () {
  "use strict";
  const D = window.GAME_DATA;
  const A = window.ART;
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = "where-is-reese-brown-v1";
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  // ---------- State ----------
  const fresh = () => ({
    team: "", started: false, introDone: false,
    flags: {},          // clue and theory ids found
    asked: {},          // "char.topic": true
    met: {},            // char: true once greeted
    closing: {},        // char: true once their closing line played
    notes: { clue: [], history: [], who: [] },
    seen: 0,            // notebook entries already viewed
    chairSeen: false,
    player: null,
    solveOpen: false,
    answers: {},
    finished: false,
    readAloud: false,
    choices: {},        // dilemma id -> option id
    choiceAt: {},       // dilemma id -> scene number when it was made
    events: {},         // event ids that already played
    scenes: 0,          // how many talking scenes have opened
  });
  let S = fresh();
  function load() {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { /* storage blocked */ }
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } }, 150);
  }
  const has = (id) => !!S.flags[id];
  const noteCount = () => S.notes.clue.length + S.notes.history.length + S.notes.who.length;

  // ---------- World setup ----------
  let worldOK = true;
  function startWorld() {
    try {
      const test = document.createElement("canvas");
      if (!(test.getContext("webgl2") || test.getContext("webgl"))) throw new Error("no webgl");
      World.init($("world"), D, { player: S.player });
      World.onInteract(openTarget);
      World.onNear(showPrompt);
    } catch (e) {
      worldOK = false;
      buildFallbackTown();
    }
  }
  // If 3D can't run, show the town as a list of places.
  function buildFallbackTown() {
    const box = $("fallback");
    box.hidden = false;
    const people = Object.entries(D.characters);
    box.innerHTML = `<h2>Easton, Kansas Territory</h2><p>This computer can't show the 3D town, so here are the places to visit.</p><div class="fallback-grid">` +
      people.map(([id, c]) => `<button type="button" class="fallback-place" data-id="${id}"><strong>${c.name}</strong><span>${c.role}</span></button>`).join("") +
      `<button type="button" class="fallback-place" data-id="chair"><strong>The empty chair</strong><span>At the polling place</span></button></div>`;
    box.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => openTarget(b.dataset.id)));
  }

  // ---------- HUD ----------
  function refreshHUD() {
    $("lead").innerHTML = `<span class="lead-label">Next lead</span> ${D.nextLead(has)}`;
    const unseen = noteCount() - S.seen;
    $("noteBadge").textContent = unseen > 0 ? unseen : "";
    $("noteBadge").hidden = unseen <= 0;
    const canSolve = S.solveOpen || (has("c3") && has("c4") && has("c6"));
    $("solveBtn").disabled = !canSolve;
    $("solveBtn").title = canSolve ? "Answer the case questions" : "Find more clues first";
    const phase = has("c6") ? 3 : has("c4") ? 2 : has("c3") ? 1 : 0;
    $("hudTime").textContent = ["Afternoon", "Evening", "Dusk", "Night"][phase];
    if (worldOK) {
      World.setMarkers(markers());
      World.setPhase(phase);
      World.setGoatFollow(!!S.met.byrne);
    }
  }
  function availableTopics(id) {
    const c = D.characters[id];
    return c.topics.filter((t) => (!t.requires || t.requires.every(has)) && (!t.requiresAny || t.requiresAny.some(has)));
  }
  function markers() {
    const m = {};
    Object.keys(D.characters).forEach((id) => {
      const fresh = availableTopics(id).some((t) => !S.asked[id + "." + t.id]) || pendingEvents(id).length > 0;
      m[id] = fresh ? "new" : "done";
    });
    m.chair = S.chairSeen ? "done" : "new";
    return m;
  }
  function showPrompt(id) {
    const p = $("prompt");
    if (!id) { p.hidden = true; return; }
    const name = id === "chair" ? "Look at the empty chair" : `Talk to ${D.characters[id].name}`;
    p.innerHTML = `<kbd>E</kbd> ${name}`;
    p.hidden = false;
  }

  // ---------- Toasts ----------
  function toast(html) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = html;
    $("toasts").appendChild(t);
    setTimeout(() => t.classList.add("out"), 3600);
    setTimeout(() => t.remove(), 4200);
  }

  function addNote(kind, id) {
    if (kind === "clue") {
      if (S.flags[id]) return;
      S.flags[id] = true;
      S.notes.clue.push(id);
      const c = D.clues[id];
      toast(`<span class="toast-kind">${id.startsWith("t") ? "New theory" : "New clue"}</span>${c.title}: ${c.text}`);
    } else if (kind === "history") {
      if (S.notes.history.includes(id)) return;
      S.notes.history.push(id);
      toast(`<span class="toast-kind">History note</span>${D.history[id].title}`);
    } else if (kind === "who") {
      if (S.notes.who.includes(id)) return;
      S.notes.who.push(id);
      toast(`<span class="toast-kind">Who decides?</span>${id === "chair" ? "The empty chair" : D.characters[id].name}'s answer`);
    }
    save();
    refreshHUD();
  }

  // ---------- Talking scenes ----------
  const scene = {
    who: null, lines: [], i: 0, after: null, typing: false, full: "", timer: null, expr: {}, mode: "lines",
  };
  function setScenePortrait(id, expr) {
    const img = $("scenePortrait");
    if (!id) { img.hidden = true; return; }
    img.hidden = false;
    A.setPortrait(img, id, expr);
    img.alt = id === "senator" ? "Senator the goat" : D.characters[id].name;
  }
  function openTarget(id) {
    if (id === "chair") return openChair();
    openCharacter(id);
  }
  function pauseWorld(p) { if (worldOK) World.setPaused(p); }

  function openCharacter(id) {
    const c = D.characters[id];
    pauseWorld(true);
    $("prompt").hidden = true;
    scene.who = id;
    scene.expr = { [id]: c.expr[0] };
    A.setBackground($("sceneBg"), c.place);
    $("scenePlace").textContent = placeName(c.place);
    setScenePortrait(id, c.expr[0]);
    $("scene").hidden = false;
    $("scene").classList.remove("chair-mode");
    S.scenes++;
    const firstVisit = !S.met[id];
    const afterHello = () => runEvents(id, () => {
      const rv = !firstVisit && (c.revisit || []).find((r) => matches(r.when) && Object.keys(r.when).every((k) => S.choiceAt[k] < S.scenes));
      if (rv) playLines(rv.lines, showMenu); else showMenu();
    });
    if (firstVisit) {
      S.met[id] = true; save();
      playLines(c.greeting, afterHello);
    } else {
      afterHello();
    }
    refreshHUD();
  }
  // a "when" like { offer: "take" } matches the choices made so far
  function matches(when) { return !when || Object.keys(when).every((k) => S.choices[k] === when[k]); }
  function pendingEvents(id) {
    const c = D.characters[id];
    const evs = (c.events || []).filter((ev) => !S.events[id + "." + ev.id] && (!ev.requires || ev.requires.every(has)) && matches(ev.when) && !(ev.choice && S.choices[ev.choice]));
    // a dilemma that was started but left before choosing comes back
    c.topics.forEach((t) => { if (t.choice && S.asked[id + "." + t.id] && !S.choices[t.choice]) evs.push({ id: "redo-" + t.choice, choice: t.choice }); });
    return evs;
  }
  function runEvents(id, done) {
    const ev = pendingEvents(id)[0];
    if (!ev) return done();
    const next = () => { S.events[id + "." + ev.id] = true; save(); runEvents(id, done); };
    if (ev.choice) runChoice(ev.choice, next);
    else playLines(ev.lines, next);
  }

  // ---------- Choices that stick ----------
  function runChoice(key, done) {
    if (S.choices[key]) return done();
    const ch = D.choices[key];
    playLines(ch.lines, () => {
      scene.mode = "choice";
      $("dialogNext").hidden = true;
      $("dialogName").textContent = "Your choice";
      $("dialog").classList.add("is-you");
      $("dialogText").textContent = "There's no single right answer. Choose carefully. The town will remember.";
      const menu = $("dialogMenu");
      menu.hidden = false;
      menu.innerHTML = ch.options.map((o, i) => `<button type="button" class="ask is-choice" data-opt="${o.id}"><span class="ask-key">${i + 1}</span><span class="ask-label">${o.label}</span></button>`).join("");
      menu.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        const opt = ch.options.find((o) => o.id === b.dataset.opt);
        S.choices[key] = opt.id;
        S.choiceAt[key] = S.scenes;
        save();
        toast(`<span class="toast-kind">Choice made</span>${ch.title}: ${opt.label}`);
        playLines(opt.lines, () => { refreshHUD(); done(); });
      }));
      menu.querySelector("button").focus({ preventScroll: true });
      if (S.readAloud) speak("Your choice. " + ch.options.map((o) => o.label).join(". Or. "));
    });
  }
  function placeName(place) {
    const p = (worldOK && World.places[place]) || null;
    if (p) return p.name;
    return { wagon: "Peddler's wagon", ferry: "Ferry landing" }[place] || "";
  }

  function playLines(lines, after) {
    scene.lines = lines; scene.i = 0; scene.after = after; scene.mode = "lines";
    $("dialogMenu").hidden = true;
    $("dialogNext").hidden = false;
    showLine();
  }
  function showLine() {
    const [who, e, text] = scene.lines[scene.i];
    $("scenePapers").hidden = true;
    const box = $("dialog");
    if (who === "papers") {
      $("scenePapers").hidden = false;
      $("scenePapers").innerHTML = D.papers.map((p) => `<article class="newspaper"><div class="paper-name">${p.name}</div><div class="paper-side">${p.side}</div><h3>${p.headline}</h3><p>${p.deck}</p></article>`).join("");
      $("dialogName").textContent = "Two front pages";
      typeText("Read both headlines. Same man, same week.");
      return;
    }
    if (who === "you") {
      $("dialogName").textContent = "You";
      box.classList.add("is-you");
    } else if (who === "narrator") {
      $("dialogName").textContent = "";
      box.classList.remove("is-you");
    } else {
      box.classList.remove("is-you");
      const name = who === "senator" ? "Senator the goat" : D.characters[who].name;
      $("dialogName").textContent = name;
      if (e) scene.expr[who] = e;
      const expr = scene.expr[who] || (who === "senator" ? "bleating" : D.characters[who].expr[0]);
      setScenePortrait(who, expr);
    }
    typeText(text);
  }
  function typeText(text) {
    clearInterval(scene.timer);
    const el = $("dialogText");
    scene.full = text;
    if (S.readAloud) speak(text);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = text; scene.typing = false; return; }
    let n = 0;
    scene.typing = true;
    el.textContent = "";
    scene.timer = setInterval(() => {
      n += 2;
      el.textContent = text.slice(0, n);
      if (n >= text.length) { clearInterval(scene.timer); scene.typing = false; }
    }, 28);
  }
  function advance() {
    if (scene.mode !== "lines") return;
    if (scene.typing) { clearInterval(scene.timer); $("dialogText").textContent = scene.full; scene.typing = false; return; }
    scene.i++;
    if (scene.i < scene.lines.length) { showLine(); return; }
    const after = scene.after; scene.after = null;
    if (after) after();
  }

  function showMenu() {
    const id = scene.who;
    const c = D.characters[id];
    // switch back to the main character if the goat was talking
    setScenePortrait(id, scene.expr[id] || c.expr[0]);
    $("scenePapers").hidden = true;
    $("dialog").classList.remove("is-you");
    // Mrs. Brown's closing line, once, after every question
    if (c.closing && !S.closing[id] && c.topics.every((t) => S.asked[id + "." + t.id])) {
      S.closing[id] = true; save();
      playLines(c.closing, showMenu);
      return;
    }
    scene.mode = "menu";
    $("dialogName").textContent = c.name;
    $("dialogText").textContent = "What do you want to ask about?";
    $("dialogNext").hidden = true;
    const menu = $("dialogMenu");
    menu.hidden = false;
    const topics = availableTopics(id);
    menu.innerHTML = topics.map((t, i) => {
      const done = S.asked[id + "." + t.id];
      return `<button type="button" class="ask${done ? " is-done" : ""}${t.decide ? " is-decide" : ""}" data-topic="${t.id}"><span class="ask-key">${i + 1}</span><span class="ask-label">${t.label}</span>${done ? '<span class="ask-tag">Asked</span>' : '<span class="ask-tag ask-new">New</span>'}</button>`;
    }).join("") + `<button type="button" class="ask ask-leave" data-topic="__leave"><span class="ask-key">Esc</span><span class="ask-label">Leave</span></button>`;
    menu.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => pickTopic(b.dataset.topic)));
    const first = menu.querySelector(".ask:not(.is-done)") || menu.querySelector(".ask");
    if (first) first.focus({ preventScroll: true });
    if (S.readAloud) speak("What do you want to ask about?");
  }
  function pickTopic(tid) {
    if (tid === "__leave") return closeScene();
    const id = scene.who;
    const t = D.characters[id].topics.find((x) => x.id === tid);
    playLines(t.lines, () => {
      S.asked[id + "." + t.id] = true;
      t.add.forEach(([kind, nid]) => addNote(kind, nid));
      save(); refreshHUD();
      if (t.choice) runChoice(t.choice, showMenu); else showMenu();
    });
  }
  function closeScene() {
    if (scene.mode === "choice") { toast("Make your choice first."); return; }
    clearInterval(scene.timer);
    stopSpeaking();
    $("scene").hidden = true;
    scene.who = null; scene.mode = "lines";
    pauseWorld(false);
    refreshHUD();
    if (!worldOK) return;
    S.player = World.getPlayer(); save();
  }

  function openChair() {
    pauseWorld(true);
    $("prompt").hidden = true;
    scene.who = null;
    A.setBackground($("sceneBg"), "polling");
    $("scenePlace").textContent = "Polling place";
    setScenePortrait(null);
    $("scene").hidden = false;
    $("scene").classList.add("chair-mode");
    const lines = D.chair.cards.map((t) => ["narrator", "", t]);
    $("dialogName").textContent = "";
    playLines(lines, () => {
      S.chairSeen = true;
      addNote("who", "chair");
      save();
      closeScene();
    });
    $("dialogName").textContent = D.chair.label;
  }

  // ---------- Read aloud ----------
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; speechSynthesis.speak(u); } catch (e) { /* not available */ }
  }
  function stopSpeaking() { try { speechSynthesis.cancel(); } catch (e) { /* not available */ } }
  function setReadAloud(on) {
    S.readAloud = on; save();
    document.querySelectorAll("[data-readaloud]").forEach((b) => { b.setAttribute("aria-pressed", on ? "true" : "false"); b.textContent = on ? "Read aloud: on" : "Read aloud: off"; });
    if (!on) stopSpeaking();
  }

  // ---------- Intro ----------
  let introI = 0;
  function openIntro() {
    pauseWorld(true);
    $("title").hidden = true;
    $("intro").hidden = false;
    introI = 0;
    showIntro();
  }
  function showIntro() {
    const p = D.intro[introI];
    A.setIntro($("introArt"), p.art);
    $("introYear").textContent = p.year;
    $("introTitle").textContent = p.title;
    $("introText").textContent = p.text;
    $("introHint").textContent = p.hint || "";
    $("introHint").hidden = !p.hint;
    $("introBack").disabled = introI === 0;
    $("introNext").textContent = introI === D.intro.length - 1 ? "Start investigating" : "Next";
    $("introDots").innerHTML = D.intro.map((_, i) => `<span class="${i === introI ? "on" : i < introI ? "past" : ""}"></span>`).join("");
    $("introNext").focus({ preventScroll: true });
    if (S.readAloud) speak(`${p.year}. ${p.title}. ${p.text} ${p.hint || ""}`);
  }
  function introNext() {
    if (introI < D.intro.length - 1) { introI++; showIntro(); return; }
    stopSpeaking();
    $("intro").hidden = true;
    const firstTime = !S.introDone;
    S.introDone = true; save();
    enterTown();
    if (firstTime) setTimeout(() => openCharacter("mrsbrown"), 350);
  }

  function enterTown() {
    $("title").hidden = true;
    $("hud").hidden = false;
    $("lead").hidden = false;
    if (worldOK) {
      pauseWorld(false);
      $("controlsHint").hidden = false;
      setTimeout(() => $("controlsHint").classList.add("fade"), 14000);
    }
    refreshHUD();
  }

  // ---------- Notebook ----------
  let noteTab = "clue";
  function openNotebook() {
    pauseWorld(true);
    $("notebook").hidden = false;
    S.seen = noteCount(); save();
    renderNotebook();
    refreshHUD();
    $("noteClose").focus({ preventScroll: true });
  }
  function closeNotebook() {
    $("notebook").hidden = true;
    if ($("scene").hidden && $("solve").hidden) pauseWorld(false);
  }
  const TAB_TITLES = { clue: "Clues", history: "History notes", who: "Who decides?", timeline: "Timeline" };
  function renderNotebook() {
    document.querySelectorAll("#notebook [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === noteTab ? "true" : "false"));
    $("noteH").textContent = TAB_TITLES[noteTab];
    $("noteSide").innerHTML = notebookSide();
    const body = $("noteBody");
    const empty = (msg) => `<p class="note-empty">${msg}</p>`;
    if (noteTab === "clue") {
      const clues = S.notes.clue.filter((id) => id.startsWith("c")).sort();
      const theories = S.notes.clue.filter((id) => id.startsWith("t")).sort();
      body.innerHTML = (clues.length ? `<ol class="notes">${clues.map((id) => `<li><strong>${D.clues[id].title}.</strong> ${D.clues[id].text}</li>`).join("")}</ol>` : empty("No clues yet. Start with Mrs. Brown.")) +
        (theories.length ? `<h3 class="note-sub">Theories to test</h3><ul class="notes">${theories.map((id) => `<li><strong>${D.clues[id].title}.</strong> ${D.clues[id].text}</li>`).join("")}</ul>` : "");
    } else if (noteTab === "history") {
      body.innerHTML = S.notes.history.length ? `<ul class="notes">${S.notes.history.map((id) => `<li><strong>${D.history[id].title}.</strong> ${D.history[id].text}</li>`).join("")}</ul>` : empty("Ask townspeople about the past to fill this page.");
    } else if (noteTab === "who") {
      body.innerHTML = whoBoard();
    } else {
      body.innerHTML = `<ol class="timeline">${D.intro.map((p) => `<li><span class="tl-year">${p.year}</span><span><strong>${p.title}.</strong> ${p.text}</span></li>`).join("")}</ol>`;
    }
  }
  // Right-hand page: where the case stands
  function notebookSide() {
    const clues = S.notes.clue.filter((id) => id.startsWith("c")).length;
    const theory = (id) => S.flags[id]
      ? `<li><span class="stud"></span><span><strong>${D.clues[id].title}.</strong> ${D.clues[id].text}</span></li>`
      : `<li><span class="stud off"></span><span class="note-empty">Not heard yet</span></li>`;
    const people = Object.entries(D.characters).filter(([, c]) => !c.bonus)
      .map(([id, c]) => `<li><span class="stud${S.met[id] ? "" : " off"}"></span><span><strong>${c.name}</strong> &middot; ${c.role}</span></li>`).join("");
    return `<div class="side-block"><p class="side-h">Next lead</p><p class="side-lead">${D.nextLead(has)}</p></div>
      <div class="side-block"><p class="side-h">The case so far</p><div class="tally">
        <div><strong>${clues}</strong><span>of 9 clues</span></div>
        <div><strong>${S.notes.history.length}</strong><span>history notes</span></div>
        <div><strong>${S.notes.who.length}</strong><span>answers to "Who decides?"</span></div></div></div>
      <div class="side-block"><p class="side-h">Theories</p><ul class="side-list">${theory("tA")}${theory("tB")}</ul></div>
      <div class="side-block"><p class="side-h">People you've met</p><ul class="side-list">${people}</ul></div>`;
  }
  function whoBoard() {
    const rows = Object.keys(D.who).map((id) => {
      const known = S.notes.who.includes(id);
      const name = id === "chair" ? "The empty chair" : D.characters[id].name;
      return `<tr class="${known ? "" : "is-unknown"}"><th scope="row">${name}</th><td>${known ? D.who[id] : "Not asked yet"}</td></tr>`;
    }).join("");
    return `<p class="note-lead">Every townsperson has an answer to the big question: who should decide about slavery?</p><table class="who-table"><thead><tr><th scope="col">Townsperson</th><th scope="col">Their answer</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ---------- Solving the case ----------
  let solveStep = 0;
  function openSolve() {
    pauseWorld(true);
    $("solve").hidden = false;
    solveStep = S.finished ? 6 : (S.answers.step || 0);
    renderSolve();
  }
  function closeSolve() {
    $("solve").hidden = true;
    if ($("scene").hidden && $("notebook").hidden) pauseWorld(false);
  }
  const clueOptions = (name, type, selected) => {
    const ids = S.notes.clue.filter((id) => id.startsWith("c")).sort();
    if (!ids.length) return `<p class="note-empty">You haven't found any clues yet.</p>`;
    return `<div class="clue-picks">${ids.map((id) => `<label class="pick"><input type="${type}" name="${name}" value="${id}"${(selected || []).includes(id) ? " checked" : ""}><span><strong>${D.clues[id].title}.</strong> ${D.clues[id].text}</span></label>`).join("")}</div>`;
  };
  function renderSolve() {
    const Q = D.solve, a = S.answers, body = $("solveBody");
    const steps = ["What happened?", "Why?", "No arrests", "Who decides?", "Exit check", "Your choices", "What really happened"];
    $("solveSteps").innerHTML = steps.map((s, i) => `<li class="${i === solveStep ? "on" : i < solveStep ? "past" : ""}">${s}</li>`).join("");
    let html = "";
    if (solveStep === 0) {
      html = `<h2>${Q.q1.title}</h2><p>${Q.q1.prompt}</p><div class="choices">${Q.q1.choices.map((c) => `<label class="pick"><input type="radio" name="q1" value="${c.id}"${a.q1 === c.id ? " checked" : ""}><span>${c.text}</span></label>`).join("")}</div><div class="feedback" id="q1fb" aria-live="polite"></div><div id="q1clues" ${a.q1 === "C" ? "" : "hidden"}><h3>${Q.q1.cluePrompt}</h3>${clueOptions("q1c", "checkbox", a.q1clues)}<div class="feedback" id="q1cfb" aria-live="polite"></div></div>`;
    } else if (solveStep === 1) {
      html = `<h2>${Q.q2.title}</h2><p>${Q.q2.prompt}</p><p class="solve-note">${Q.q2.note}</p><div class="choices">${Q.q2.choices.map((c) => `<label class="pick"><input type="radio" name="q2" value="${c.id}"${a.q2 === c.id ? " checked" : ""}><span>${c.text}</span></label>`).join("")}</div><h3>Pick a clue that backs it up</h3>${clueOptions("q2c", "radio", [a.q2clue])}`;
    } else if (solveStep === 2) {
      html = `<h2>${Q.q3.title}</h2><p>${Q.q3.prompt}</p><div class="choices">${Q.q3.reasons.map((r) => `<label class="pick"><input type="checkbox" name="q3" value="${r.id}"${(a.q3 || []).includes(r.id) ? " checked" : ""}><span>${r.text}</span></label>`).join("")}</div><div class="feedback" id="q3fb" aria-live="polite"></div><h3>${Q.q3.mostPrompt}</h3><div class="choices">${Q.q3.most.map((m) => `<label class="pick"><input type="radio" name="q3m" value="${m.id}"${a.q3most === m.id ? " checked" : ""}><span>${m.text}</span></label>`).join("")}</div>`;
    } else if (solveStep === 3) {
      html = `<h2>${Q.final.title}</h2>${whoBoard()}<h3>Your answer</h3><div class="choices">${Q.final.choices.map((c) => `<label class="pick"><input type="radio" name="fc" value="${c}"${a.finalChoice === c ? " checked" : ""}><span>${c}</span></label>`).join("")}</div>
        <h3>Finish the sentence. Name at least two townspeople or clues.</h3>
        <div class="frame">
          <span>Although</span><input id="f1" type="text" value="${esc(a.f1)}" aria-label="Although: the other side's best point">
          <span>,</span><input id="f2" type="text" value="${esc(a.f2)}" aria-label="Who should have decided">
          <span>should have decided because</span><input id="f3" type="text" value="${esc(a.f3)}" aria-label="First reason">
          <span>, and because</span><input id="f4" type="text" value="${esc(a.f4)}" aria-label="Second reason"><span>.</span>
        </div>`;
    } else if (solveStep === 4) {
      html = `<h2>Exit check</h2><p class="exit-q">${Q.final.exit}</p><label class="sr-only" for="exitText">Your answer</label><textarea id="exitText" rows="4" placeholder="Write one or two sentences.">${esc(a.exit)}</textarea>`;
    } else if (solveStep === 5) {
      html = `<h2>What your choices led to</h2><div class="outcomes">${Object.keys(D.choices).map((k) => {
        const ch = D.choices[k], o = ch.options.find((x) => x.id === S.choices[k]);
        return `<article class="outcome"><p class="eyebrow">${ch.title}</p><h3>${o ? o.label : "No choice made"}</h3><p>${o ? o.outcome : ch.none}</p></article>`;
      }).join("")}</div><p class="outcome-close">${D.choicesClosing}</p>`;
    } else {
      const R = D.reality;
      html = `<div class="reality"><p class="eyebrow">Based on a true story</p><h2>${R.title}</h2>${R.paragraphs.map((p) => `<p>${p}</p>`).join("")}<h3>What came next</h3><p>${R.next}</p></div>`;
    }
    body.innerHTML = html;
    $("solveBack").hidden = solveStep === 0 || solveStep >= 5;
    $("solveNext").textContent = solveStep === 4 ? "See what your choices led to" : solveStep === 5 ? "See what really happened" : solveStep === 6 ? "See your case report" : "Next";
    wireSolve();
  }
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
  function wireSolve() {
    const Q = D.solve, a = S.answers;
    if (solveStep === 0) {
      document.querySelectorAll('input[name="q1"]').forEach((r) => r.addEventListener("change", () => {
        a.q1 = r.value; save();
        const c = Q.q1.choices.find((x) => x.id === r.value);
        $("q1fb").textContent = c.correct ? "Good. The evidence points to the Rangers." : c.hint;
        $("q1fb").className = "feedback " + (c.correct ? "good" : "look");
        $("q1clues").hidden = !c.correct;
      }));
      if (a.q1) { const c = Q.q1.choices.find((x) => x.id === a.q1); $("q1fb").textContent = c.correct ? "Good. The evidence points to the Rangers." : c.hint; $("q1fb").className = "feedback " + (c.correct ? "good" : "look"); }
    }
  }
  function solveNext() {
    const Q = D.solve, a = S.answers;
    const val = (sel) => [...document.querySelectorAll(sel)].filter((x) => x.checked).map((x) => x.value);
    if (solveStep === 0) {
      if (a.q1 !== "C") { $("q1fb").textContent = a.q1 ? "Look again before you move on." : "Pick a theory first."; $("q1fb").className = "feedback look"; return; }
      const picks = val('input[name="q1c"]');
      if (picks.length !== 2) { $("q1cfb").textContent = "Pick exactly two clues."; $("q1cfb").className = "feedback look"; return; }
      const good = picks.filter((p) => Q.q1.goodClues.includes(p)).length;
      if (good < 2) { $("q1cfb").textContent = "At least one of those doesn't show the Rangers took him. Try clues about the Rangers, the prisoners, the wagon, or the ferry."; $("q1cfb").className = "feedback look"; a.q1clues = picks; save(); return; }
      a.q1clues = picks;
    } else if (solveStep === 1) {
      const c = val('input[name="q2"]')[0], clue = val('input[name="q2c"]')[0];
      if (!c || !clue) { toast("Pick an answer and a clue."); return; }
      a.q2 = c; a.q2clue = clue;
    } else if (solveStep === 2) {
      const picks = val('input[name="q3"]'), most = val('input[name="q3m"]')[0];
      a.q3 = picks;
      if (picks.includes("guilty")) { $("q3fb").textContent = "Look again: Byrne says Brown never crossed the ferry, and Tuttle says he never wrote home."; $("q3fb").className = "feedback look"; save(); return; }
      if (picks.length < 2) { $("q3fb").textContent = "The evidence supports more than one reason. Check all that apply."; $("q3fb").className = "feedback look"; save(); return; }
      if (!most) { $("q3fb").textContent = "Now pick who is most responsible."; $("q3fb").className = "feedback look"; save(); return; }
      a.q3most = most;
    } else if (solveStep === 3) {
      a.finalChoice = val('input[name="fc"]')[0];
      ["f1", "f2", "f3", "f4"].forEach((k) => (a[k] = $(k).value.trim()));
      if (!a.finalChoice || !a.f1 || !a.f2 || !a.f3 || !a.f4) { toast("Pick an answer and fill in all four blanks."); save(); return; }
    } else if (solveStep === 4) {
      a.exit = $("exitText").value.trim();
      if (!a.exit) { toast("Write an answer to the exit check."); return; }
      S.finished = true;
    } else if (solveStep === 6) {
      save(); closeSolve(); openReport(); return;
    }
    solveStep++;
    a.step = Math.min(solveStep, 4);
    save();
    renderSolve();
    $("solveBody").scrollTop = 0;
  }
  function solveBack() {
    if (solveStep === 3) ["f1", "f2", "f3", "f4"].forEach((k) => (S.answers[k] = $(k).value.trim()));
    if (solveStep === 4) S.answers.exit = $("exitText").value.trim();
    solveStep = Math.max(0, solveStep - 1); save(); renderSolve();
  }

  // ---------- Case report ----------
  function reportText() {
    const a = S.answers, Q = D.solve;
    const L = [];
    L.push("WHERE IS REESE BROWN? CASE REPORT");
    L.push(`Team: ${S.team || "(no name)"}`);
    L.push(`Date: ${new Date().toLocaleDateString()}`);
    L.push("");
    L.push(`Clues found: ${S.notes.clue.filter((x) => x.startsWith("c")).length} of 9`);
    L.push(`History notes: ${S.notes.history.length} of ${Object.keys(D.history).length}`);
    L.push("");
    L.push("1. What happened to Reese Brown?");
    const q1 = Q.q1.choices.find((c) => c.id === a.q1);
    L.push(`   ${q1 ? q1.text : "(not answered)"}`);
    if (a.q1clues) L.push(`   Evidence: ${a.q1clues.map((c) => D.clues[c].title).join(", ")}`);
    L.push("2. Why did the Rangers take him?");
    const q2 = Q.q2.choices.find((c) => c.id === a.q2);
    L.push(`   ${q2 ? q2.text : "(not answered)"}${a.q2clue ? " (" + D.clues[a.q2clue].title + ")" : ""}`);
    L.push("3. Why has no one been arrested?");
    (a.q3 || []).forEach((r) => L.push(`   - ${Q.q3.reasons.find((x) => x.id === r).text}`));
    const most = Q.q3.most.find((m) => m.id === a.q3most);
    L.push(`   Most responsible: ${most ? most.text : "(not answered)"}`);
    L.push("4. Who should have decided about slavery in Kansas?");
    L.push(`   ${a.finalChoice || "(not answered)"}`);
    if (a.f1) L.push(`   Although ${a.f1}, ${a.f2} should have decided because ${a.f3}, and because ${a.f4}.`);
    L.push("");
    L.push(`Exit check: ${Q.final.exit}`);
    L.push(`   ${a.exit || "(not answered)"}`);
    L.push("");
    L.push("Choices:");
    Object.keys(D.choices).forEach((k) => {
      const ch = D.choices[k], o = ch.options.find((x) => x.id === S.choices[k]);
      L.push(`   ${ch.title}: ${o ? o.label : "no choice made"}`);
    });
    L.push("");
    L.push("Who decides? What the townspeople said:");
    S.notes.who.forEach((id) => L.push(`   ${id === "chair" ? "The empty chair" : D.characters[id].name}: ${D.who[id]}`));
    return L.join("\n");
  }
  function openReport() {
    pauseWorld(true);
    $("report").hidden = false;
    $("reportText").textContent = reportText();
    $("reportPrint").hidden = inFrame;
  }

  // ---------- Menu ----------
  function openMenu() {
    pauseWorld(true);
    $("menu").hidden = false;
    $("menuResume").focus({ preventScroll: true });
    $("qualityBtn").textContent = worldOK ? `Graphics: ${World.quality === "high" ? "high" : "low"}` : "Graphics: list view";
  }
  function closeMenu() {
    $("menu").hidden = true;
    $("resetBtn").dataset.armed = "";
    $("resetBtn").textContent = "Start over";
    if ($("scene").hidden && $("notebook").hidden && $("solve").hidden && $("report").hidden) pauseWorld(false);
  }

  // ---------- Wiring ----------
  function wire() {
    $("startBtn").addEventListener("click", () => {
      S.team = $("teamName").value.trim();
      S.started = true; save();
      openIntro();
    });
    $("continueBtn").addEventListener("click", () => {
      if (!S.introDone) return openIntro();
      enterTown();
    });
    $("introNext").addEventListener("click", introNext);
    $("introBack").addEventListener("click", () => { if (introI > 0) { introI--; showIntro(); } });
    $("introSkip").addEventListener("click", () => { introI = D.intro.length - 1; introNext(); });

    $("dialog").addEventListener("click", (e) => { if (scene.mode === "lines" && !e.target.closest("button")) advance(); });
    $("sceneBg").addEventListener("click", () => { if (scene.mode === "lines") advance(); });
    $("scenePapers").addEventListener("click", () => { if (scene.mode === "lines") advance(); });
    $("dialogNext").addEventListener("click", advance);
    $("sceneLeave").addEventListener("click", closeScene);

    $("noteBtn").addEventListener("click", openNotebook);
    $("noteClose").addEventListener("click", closeNotebook);
    document.querySelectorAll("#notebook [data-tab]").forEach((b) => b.addEventListener("click", () => { noteTab = b.dataset.tab; renderNotebook(); }));
    $("solveBtn").addEventListener("click", openSolve);
    $("solveClose").addEventListener("click", closeSolve);
    $("solveNext").addEventListener("click", solveNext);
    $("solveBack").addEventListener("click", solveBack);
    $("reportClose").addEventListener("click", () => { $("report").hidden = true; pauseWorld(false); });
    $("reportCopy").addEventListener("click", () => {
      const text = reportText();
      const ok = () => toast("Copied. Paste it into Google Classroom.");
      const fallback = () => { const r = document.createRange(); r.selectNodeContents($("reportText")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Selected. Press Ctrl+C to copy."); };
      try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
    });
    $("reportPrint").addEventListener("click", () => window.print());

    $("menuBtn").addEventListener("click", openMenu);
    $("menuResume").addEventListener("click", closeMenu);
    $("menuIntro").addEventListener("click", () => { closeMenu(); $("hud").hidden = true; $("lead").hidden = true; openIntro(); });
    $("qualityBtn").addEventListener("click", () => {
      if (!worldOK) return;
      World.setQuality(World.quality === "high" ? "low" : "high");
      $("qualityBtn").textContent = `Graphics: ${World.quality === "high" ? "high" : "low"}`;
    });
    $("teacherBtn").addEventListener("click", () => { S.solveOpen = true; save(); refreshHUD(); closeMenu(); toast("The case questions are open."); });
    $("resetBtn").addEventListener("click", () => {
      const b = $("resetBtn");
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "Click again to erase all progress"; return; }
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
      location.reload();
    });
    document.querySelectorAll("[data-readaloud]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); setReadAloud(!S.readAloud); }));
    $("prompt").addEventListener("click", () => worldOK && World.interactNear());

    document.addEventListener("keydown", (e) => {
      const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
      if (!$("scene").hidden) {
        if (e.key === "Escape") { if (scene.mode !== "choice") closeScene(); return; }
        if (scene.mode === "choice") {
          const n = parseInt(e.key, 10);
          const btns = $("dialogMenu").querySelectorAll(".ask");
          if (n >= 1 && n <= btns.length) btns[n - 1].click();
          return;
        }
        if (scene.mode === "lines" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); advance(); return; }
        if (scene.mode === "menu") {
          const n = parseInt(e.key, 10);
          const btns = $("dialogMenu").querySelectorAll(".ask:not(.ask-leave)");
          if (n >= 1 && n <= btns.length) { btns[n - 1].click(); return; }
        }
        return;
      }
      if (typing) return;
      if (!$("intro").hidden && (e.key === "ArrowRight")) { introNext(); return; }
      if (!$("intro").hidden && (e.key === "ArrowLeft") && introI > 0) { introI--; showIntro(); return; }
      if (e.key === "Escape") {
        if (!$("notebook").hidden) return closeNotebook();
        if (!$("menu").hidden) return closeMenu();
        if (!$("solve").hidden) return closeSolve();
        if (!$("report").hidden) { $("report").hidden = true; pauseWorld(false); return; }
        if (!$("hud").hidden) return openMenu();
      }
      if ((e.key === "n" || e.key === "N") && !$("hud").hidden && $("notebook").hidden && $("solve").hidden && $("menu").hidden) openNotebook();
    });
    // movement hint disappears once they move
    window.addEventListener("keydown", (e) => { if (/^(arrow|[wasd]$)/i.test(e.key)) $("controlsHint").classList.add("fade"); });
  }

  // ---------- Boot ----------
  function boot() {
    load();
    wire();
    setReadAloud(S.readAloud);
    $("teamName").value = S.team || "";
    $("continueBtn").hidden = !S.started;
    $("startBtn").textContent = S.started ? "Start a new team" : "Start investigating";
    if (S.started) {
      $("startBtn").addEventListener("click", () => {
        // a new team on the same computer gets a clean slate
        const team = $("teamName").value.trim();
        S = fresh(); S.team = team; S.started = true; save();
        if (worldOK) World.setPlayer(-28, 0);
      }, { capture: true });
    }
    startWorld();
    refreshHUD();
  }
  // small hook for automated tests and teacher demos
  window.WIRB = { open: openTarget, state: () => S };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
