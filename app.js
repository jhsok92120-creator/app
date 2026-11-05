(() => {
  "use strict";

  const ROUND_SIZE = 10; // 한 회에 푸는 문제 수 (영역당 2문제씩)
  const PRACTICE_SIZE = 8; // 영역별 연습 문제 수
  const STORAGE_KEY = "iqeq-best-v3";
  const app = document.getElementById("app");

  const ICO_BACK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_SPEAK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const ICO_OK = `<svg class="ico ico-ok" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.2 3L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const ICO_NO = `<svg class="ico ico-no" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`;

  let state = null;

  // ---------- 효과음 (Web Audio, 음원 파일 없음) ----------
  const SOUND_KEY = "iqeq-sound";
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch { /* 기본값 켜짐 */ }
  let actx = null;
  function tone(freq, ms, type = "sine", gain = 0.18, delay = 0) {
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    o.connect(g).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + ms / 1000 + 0.02);
  }
  function play(kind) {
    if (!soundOn) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === "suspended") actx.resume();
      if (kind === "tap") tone(620, 70, "sine", 0.12);
      else if (kind === "correct") { tone(660, 120, "sine", 0.16); tone(990, 220, "sine", 0.16, 0.1); }
      else if (kind === "wrong") tone(180, 200, "triangle", 0.18);
      else if (kind === "done") { tone(523, 120, "sine", 0.15); tone(659, 120, "sine", 0.15, 0.12); tone(784, 260, "sine", 0.15, 0.24); }
    } catch { /* 소리를 못 내는 환경이면 조용히 넘어갑니다 */ }
  }
  function toggleSound() {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch { /* 무시 */ }
    if (soundOn) play("tap");
  }
  const ICO_SOUND_ON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const ICO_SOUND_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const soundBtn = () =>
    `<button class="icon-btn sound-btn" data-action="sound" aria-label="효과음 ${soundOn ? "끄기" : "켜기"}" aria-pressed="${soundOn}">${soundOn ? ICO_SOUND_ON : ICO_SOUND_OFF}</button>`;

  // ---------- 유틸 ----------
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const findTrack = (id) => TRACKS.find((t) => t.id === id);
  const findCategory = (id) => {
    for (const t of TRACKS) for (const c of t.categories) if (c.id === id) return { track: t, cat: c };
    return null;
  };
  const lvText = (lv) => "●".repeat(lv) + "○".repeat(3 - lv);
  const lvName = ["", "쉬움", "보통", "어려움"];

  function loadBest() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }
  function saveBest(key, correct, total) {
    try {
      const best = loadBest();
      const prev = best[key];
      if (!prev || correct / total > prev.correct / prev.total) {
        best[key] = { correct, total };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
      }
    } catch {
      /* 저장소를 못 쓰는 환경이면 기록만 건너뜁니다 */
    }
  }

  const canSpeak = "speechSynthesis" in window;
  function speak(text) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.95;
    speechSynthesis.speak(u);
  }


  // ---------- 스플래시 (실행할 때마다) ----------
  const SPLASH_MS = 1500;
  const LOGO = `<svg class="logo" viewBox="0 0 512 512" aria-hidden="true">
    <rect x="88" y="128" width="336" height="236" rx="48" fill="#fff"/>
    <path d="M212 364h88l-44 52z" fill="#fff"/>
    <circle class="logo-eye l" cx="186" cy="246" r="30" fill="#6d36d5"/>
    <circle class="logo-eye r" cx="326" cy="246" r="30" fill="#ff6b5a"/>
    <path d="M166 302c16 10 32 16 60 16s44-6 60-16" fill="none" stroke="#1f2033" stroke-width="14" stroke-linecap="round"/>
  </svg>`;

  function renderSplash() {
    app.innerHTML = `
      <div class="splash" role="button" tabindex="0" aria-label="건너뛰기">
        ${LOGO}
        <h1>IQ·EQ 퀴즈</h1>
        <p>생각하는 힘, 마음 읽는 힘</p>
      </div>`;
    document.body.classList.add("splash-bg");
    const done = () => {
      clearTimeout(t);
      document.body.classList.remove("splash-bg");
      renderHome();
    };
    const t = setTimeout(done, SPLASH_MS);
    const el = app.querySelector(".splash");
    el.addEventListener("click", done, { once: true });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") done(); }, { once: true });
  }

  // ---------- 홈 ----------
  function renderHome() {
    state = null;
    if (canSpeak) speechSynthesis.cancel();
    const best = loadBest();
    const panel = (t) => {
      const b = best[t.id];
      return `
        <button class="panel ${t.id}" data-start="${t.id}">
          <span class="panel-head">
            <span class="panel-label">${t.label}</span>
            <span class="panel-best">${b ? `최고 ${b.correct}/${b.total}` : "첫 도전"}</span>
          </span>
          <span class="panel-title">${esc(t.title)}</span>
          <span class="panel-desc">${esc(t.desc)}</span>
          <span class="panel-tags">${t.categories.map((c) => `<span>${esc(c.title)}</span>`).join("")}</span>
          <span class="panel-go">${ROUND_SIZE}문제 시작하기</span>
        </button>`;
    };
    app.innerHTML = `
      <header class="masthead">
        <div class="masthead-top"><p class="eyebrow">초등 3학년 이상</p>${soundBtn()}</div>
        <h1>오늘은 어떤 힘을<br>키워 볼까요?</h1>
        <p class="sub">IQ는 생각하는 힘, EQ는 마음을 읽는 힘이에요.</p>
      </header>
      ${TRACKS.map(panel).join("")}
      <button class="link-btn" data-action="practice">영역을 골라서 연습하기 ›</button>
      <p class="footnote">연습용 퀴즈예요. 지능이나 성격을 재는 검사가 아니에요.</p>`;
    window.scrollTo({ top: 0 });
  }

  // ---------- 영역별 연습 목록 ----------
  function renderPractice() {
    const best = loadBest();
    app.innerHTML = `
      <div class="bar"><button class="icon-btn" data-action="home" aria-label="처음으로">${ICO_BACK}</button></div>
      <h1 class="page-title">영역별 연습</h1>
      ${TRACKS.map(
        (t) => `
        <section class="part ${t.id}">
          <h2><b>${t.label}</b>${esc(t.title)}</h2>
          ${t.categories
            .map((c) => {
              const b = best[c.id];
              return `<button class="unit" data-start="${c.id}">
                <span><span class="unit-title">${esc(c.title)}</span><span class="unit-desc">${c.questions.length}문제 중 ${PRACTICE_SIZE}문제</span></span>
                ${b ? `<span class="unit-best">${b.correct}/${b.total}</span>` : `<span class="unit-go" aria-hidden="true">›</span>`}
              </button>`;
            })
            .join("")}
        </section>`
      ).join("")}`;
    window.scrollTo({ top: 0 });
  }

  // ---------- 퀴즈 ----------
  function start(id) {
    let title, list, key;
    const track = findTrack(id);
    if (track) {
      // 영역마다 같은 수씩 뽑아 섞습니다
      const per = Math.ceil(ROUND_SIZE / track.categories.length);
      list = shuffle(
        track.categories.flatMap((c) => shuffle(c.questions).slice(0, per).map((q) => ({ ...q, cat: c.title })))
      ).slice(0, ROUND_SIZE);
      title = `${track.label} 퀴즈`;
      key = track.id;
    } else {
      const found = findCategory(id);
      if (!found) return renderHome();
      list = shuffle(found.cat.questions).slice(0, PRACTICE_SIZE).map((q) => ({ ...q, cat: found.cat.title }));
      title = `${found.track.label} · ${found.cat.title}`;
      key = found.cat.id;
    }
    list = list.map((q) => ({
      ...q,
      correctText: q.options[q.answer],
      shown: q.options.length > 2 ? shuffle(q.options) : q.options.slice(),
    }));
    state = { id, key, title, list, index: 0, results: [] };
    renderQuestion();
    window.scrollTo({ top: 0 });
  }

  function renderQuestion() {
    const { list, index } = state;
    const q = list[index];
    const pct = (index / list.length) * 100;
    app.innerHTML = `
      <div class="bar">
        <button class="icon-btn" data-action="home" aria-label="그만하기">${ICO_BACK}</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${index}"><span style="width:${pct}%"></span></div>
        <span class="counter">${index + 1}/${list.length}</span>
        ${canSpeak ? `<button class="icon-btn" data-action="speak" aria-label="문제 읽어주기">${ICO_SPEAK}</button>` : ""}
      </div>
      <article class="sheet">
        <div class="q-meta">
          <span class="chip">${esc(q.cat)}</span>
          <span class="lv" title="난이도 ${lvName[q.lv]}" aria-label="난이도 ${lvName[q.lv]}">${lvText(q.lv)}</span>
        </div>
        <p class="q-text">${esc(q.q)}</p>
        <ul class="opts">
          ${q.shown
            .map((o, i) => `<li><button class="opt" data-opt="${i}"><span>${esc(o)}</span></button></li>`)
            .join("")}
        </ul>
        <div id="after"></div>
      </article>`;
  }

  function choose(i) {
    const q = state.list[state.index];
    if (state.results.length > state.index) return; // 이미 답함
    const chosen = q.shown[i];
    const ok = chosen === q.correctText;
    state.results.push({ q, chosen, ok });
    play(ok ? "correct" : "wrong");

    const correctIdx = q.shown.indexOf(q.correctText);
    app.querySelectorAll(".opt").forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === correctIdx) {
        btn.classList.add("correct");
        btn.insertAdjacentHTML("beforeend", ICO_OK);
      } else if (idx === i) {
        btn.classList.add("wrong");
        btn.insertAdjacentHTML("beforeend", ICO_NO);
      } else btn.classList.add("dim");
    });
    const bar = app.querySelector(".progress > span");
    if (bar) bar.style.width = `${((state.index + 1) / state.list.length) * 100}%`;

    const last = state.index === state.list.length - 1;
    const after = document.getElementById("after");
    after.innerHTML = `
      <div class="note${ok ? " good" : ""}">
        <p class="note-head">${ok ? "정답이에요!" : `정답은 "${esc(q.correctText)}"`}</p>
        <p>${esc(q.explain)}</p>
      </div>
      <button class="btn" data-action="next">${last ? "결과 보기" : "다음"}</button>`;
    after.querySelector("button").focus({ preventScroll: true });
    after.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function next() {
    if (canSpeak) speechSynthesis.cancel();
    state.index++;
    if (state.index >= state.list.length) renderResult();
    else {
      renderQuestion();
      window.scrollTo({ top: 0 });
    }
  }

  // ---------- 결과 ----------
  function renderResult() {
    const { key, title, results } = state;
    const correct = results.filter((r) => r.ok).length;
    const total = results.length;
    saveBest(key, correct, total);
    play("done");

    const r = correct / total;
    const [head, cheer] =
      r >= 0.9
        ? ["완벽에 가까워요!", "거의 다 맞혔어요. 다른 퀴즈에도 도전해 봐요."]
        : r >= 0.6
        ? ["잘했어요!", "많이 맞혔어요. 틀린 문제의 풀이를 한 번 더 읽어 봐요."]
        : r > 0
        ? ["조금만 더!", "아래에서 틀린 문제를 다시 보고, 한 번 더 풀어 봐요."]
        : ["다시 도전!", "처음엔 누구나 어려워요. 풀이를 읽고 다시 도전해요."];

    const byCat = {};
    for (const x of results) {
      byCat[x.q.cat] = byCat[x.q.cat] || { c: 0, t: 0 };
      byCat[x.q.cat].t++;
      if (x.ok) byCat[x.q.cat].c++;
    }
    const catRows = Object.entries(byCat);

    app.innerHTML = `
      <div class="bar"><button class="icon-btn" data-action="home" aria-label="처음으로">${ICO_BACK}</button><span class="counter" style="flex:1;text-align:center">${esc(title)}</span><span style="width:40px"></span></div>
      <section class="result">
        <div class="ring" aria-label="${total}문제 중 ${correct}문제">
          <svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52" pathLength="100"/><circle class="fill" cx="60" cy="60" r="52" pathLength="100"/></svg>
          <div class="num">${correct}<small>/ ${total}</small></div>
        </div>
        <h2>${head}</h2>
        <p class="cheer">${cheer}</p>
        <button class="btn" data-action="retry">한 번 더 풀기</button>
        <button class="btn-ghost" data-action="home">다른 퀴즈 고르기</button>
      </section>
      ${
        catRows.length > 1
          ? `<section class="breakdown">
              <h2>영역별 결과</h2>
              ${catRows
                .map(
                  ([name, v]) => `<div class="bd-row">
                    <span>${esc(name)}</span>
                    <span class="bd-bar"><span style="width:${(v.c / v.t) * 100}%"></span></span>
                    <span class="bd-num">${v.c}/${v.t}</span>
                  </div>`
                )
                .join("")}
            </section>`
          : ""
      }
      <section class="review">
        <h2>다시 보기</h2>
        <ol>
          ${results
            .map(
              (x, i) => `<li>
                ${x.ok ? ICO_OK : ICO_NO}
                <div>${i + 1}. ${esc(x.q.q)}
                  <span class="ans">${
                    x.ok ? `내 답: ${esc(x.chosen)}` : `내 답: ${esc(x.chosen)} · 정답: <b>${esc(x.q.correctText)}</b>`
                  }</span>
                  ${x.ok ? "" : `<span class="ans">${esc(x.q.explain)}</span>`}
                </div>
              </li>`
            )
            .join("")}
        </ol>
      </section>`;
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const fill = app.querySelector(".ring .fill");
        if (fill) fill.style.strokeDashoffset = String(100 - r * 100);
      })
    );
  }

  // ---------- 이벤트 ----------
  app.addEventListener("click", (e) => {
    const el = e.target.closest("button");
    if (!el) return;
    if (el.dataset.action === "sound") {
      toggleSound();
      el.outerHTML = soundBtn();
      return;
    }
    if (el.dataset.opt == null) play("tap");
    if (el.dataset.start) return start(el.dataset.start);
    if (el.dataset.opt != null) return choose(Number(el.dataset.opt));
    switch (el.dataset.action) {
      case "home":
        return renderHome();
      case "practice":
        return renderPractice();
      case "next":
        return next();
      case "retry":
        return start(state.id);
      case "speak": {
        const q = state.list[state.index];
        return speak(`${q.q}. ${q.shown.map((o, i) => `${i + 1}번, ${o}`).join(". ")}`);
      }
    }
  });

  renderSplash();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
