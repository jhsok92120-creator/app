(() => {
  "use strict";

  const ROUND_SIZE = 10; // 한 회에 푸는 문제 수 (영역당 2문제씩)
  const PRACTICE_SIZE = 8; // 영역별 연습 문제 수
  const STORAGE_KEY = "iqeq-best-v3";
  const NUMS = ["①", "②", "③", "④", "⑤"];
  const app = document.getElementById("app");

  // 손으로 그린 듯한 채점 표시(빨간 펜)
  const MARK_O = (draw) =>
    `<svg class="mark${draw ? " draw" : ""}" viewBox="0 0 60 60" aria-hidden="true"><path d="M33 7C47 7 55 18 54 31C53 45 42 54 29 54C15 54 6 44 6 30C6 18 15 9 27 8C30 8 34 9 37 10"/></svg>`;
  const MARK_X = (draw) =>
    `<svg class="mark${draw ? " draw" : ""}" viewBox="0 0 60 60" aria-hidden="true"><path d="M12 50C22 38 36 22 50 9"/></svg>`;
  const SPEAKER = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

  let state = null;

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

  // ---------- 홈 ----------
  function renderHome() {
    state = null;
    if (canSpeak) speechSynthesis.cancel();
    const best = loadBest();
    const panel = (t) => {
      const b = best[t.id];
      const count = t.categories.reduce((n, c) => n + c.questions.length, 0);
      return `
        <button class="panel" data-start="${t.id}">
          <span class="panel-label">${t.label}</span>
          <span class="panel-body">
            <span class="panel-title">${esc(t.title)}</span>
            <span class="panel-desc">${esc(t.desc)}</span>
            <span class="panel-tags">${t.categories.map((c) => `<span>${esc(c.title)}</span>`).join("")}</span>
            <span class="panel-foot">
              <span>문제 ${count}개 중 ${ROUND_SIZE}문제</span>
              <span>${b ? `최고 기록 <b>${b.correct}/${b.total}</b>` : "아직 기록 없음"}</span>
            </span>
          </span>
          <span class="panel-go">시작 ›</span>
        </button>`;
    };
    app.innerHTML = `
      <header class="masthead">
        <h1>IQ·EQ 퀴즈</h1>
        <p>생각하는 힘과 마음 읽는 힘을 10문제로 확인해요. 초등 3학년 이상</p>
      </header>
      ${TRACKS.map(panel).join("")}
      <button class="btn-ghost" data-action="practice">영역을 골라서 연습하기 ›</button>
      <p class="footnote">연습용 퀴즈예요. 지능이나 성격을 재는 검사가 아니에요.</p>`;
    window.scrollTo({ top: 0 });
  }

  // ---------- 영역별 연습 목록 ----------
  function renderPractice() {
    const best = loadBest();
    app.innerHTML = `
      <div class="bar"><button class="text-btn" data-action="home">‹ 처음으로</button></div>
      <h1 class="page-title">영역별 연습</h1>
      ${TRACKS.map(
        (t) => `
        <section class="part">
          <h2><span class="tag-${t.id}">${t.label}</span> ${esc(t.title)}</h2>
          ${t.categories
            .map((c, i) => {
              const b = best[c.id];
              return `<button class="unit" data-start="${c.id}">
                <span class="unit-no">${String(i + 1).padStart(2, "0")}</span>
                <span><span class="unit-title">${esc(c.title)}</span><span class="unit-desc">${c.questions.length}문제 중 ${PRACTICE_SIZE}문제</span></span>
                ${b ? `<span class="unit-best">최고<br><b>${b.correct}/${b.total}</b></span>` : `<span class="unit-go" aria-hidden="true">›</span>`}
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

  function trackHTML() {
    const { list, index, results } = state;
    return list
      .map((_, i) => {
        const r = results[i];
        if (r) return `<li class="${r.ok ? "o" : "x"}">${r.ok ? MARK_O(false) : MARK_X(false)}</li>`;
        return `<li class="${i === index ? "now" : ""}"></li>`;
      })
      .join("");
  }

  function renderQuestion() {
    const { list, index, title } = state;
    const q = list[index];
    app.innerHTML = `
      <div class="bar">
        <button class="text-btn" data-action="home">‹ 그만하기</button>
        <span class="bar-title">${esc(title)}</span>
        ${canSpeak ? `<button class="speak-btn" data-action="speak">${SPEAKER}읽기</button>` : ""}
      </div>
      <ol class="track" aria-label="${list.length}문제 중 ${index + 1}번째">${trackHTML()}</ol>
      <article class="sheet">
        <div class="q-meta">
          <span>${esc(q.cat)} · ${index + 1} / ${list.length}</span>
          <span class="lv" title="난이도 ${lvName[q.lv]}" aria-label="난이도 ${lvName[q.lv]}">${lvText(q.lv)}</span>
        </div>
        <div class="q-head">
          <span class="q-num">${index + 1}.</span>
          <p class="q-text">${esc(q.q)}</p>
        </div>
        <ul class="opts">
          ${q.shown
            .map(
              (o, i) => `<li><button class="opt" data-opt="${i}">
                <span class="opt-no">${NUMS[i]}</span><span class="opt-text">${esc(o)}</span>
              </button></li>`
            )
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

    const correctIdx = q.shown.indexOf(q.correctText);
    app.querySelectorAll(".opt").forEach((btn, idx) => {
      btn.disabled = true;
      const num = btn.querySelector(".opt-no");
      if (idx === correctIdx) num.insertAdjacentHTML("beforeend", MARK_O(true));
      else if (idx === i) {
        num.insertAdjacentHTML("beforeend", MARK_X(true));
        btn.classList.add("picked-wrong");
      } else btn.classList.add("dim");
    });
    app.querySelector(".track").innerHTML = trackHTML();

    const last = state.index === state.list.length - 1;
    const after = document.getElementById("after");
    after.innerHTML = `
      <div class="note">
        <div class="note-head${ok ? " ok" : ""}">${ok ? "정답" : `정답은 ${NUMS[correctIdx]} ${esc(q.correctText)}`}</div>
        <p>${esc(q.explain)}</p>
      </div>
      <button class="btn" data-action="next">${last ? "채점 결과 보기" : "다음 문제"}</button>`;
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

    const r = correct / total;
    const [stamp, cheer, soft] =
      r >= 0.9
        ? ["참<br>잘했어요", "거의 다 맞혔어요. 더 어려운 문제가 나오도록 다른 퀴즈에도 도전해 봐요.", false]
        : r >= 0.6
        ? ["잘<br>했어요", "많이 맞혔어요. 틀린 문제의 풀이를 한 번 더 읽어 봐요.", false]
        : r > 0
        ? ["힘내요", "아래 채점표에서 틀린 문제를 다시 보고, 한 번 더 풀어 봐요.", true]
        : ["다시<br>도전", "처음엔 누구나 어려워요. 풀이를 읽고 다시 도전해요.", true];

    // 영역별 결과
    const byCat = {};
    for (const x of results) {
      byCat[x.q.cat] = byCat[x.q.cat] || { c: 0, t: 0 };
      byCat[x.q.cat].t++;
      if (x.ok) byCat[x.q.cat].c++;
    }
    const catRows = Object.entries(byCat);

    app.innerHTML = `
      <div class="bar"><button class="text-btn" data-action="home">‹ 처음으로</button><span class="bar-title">${esc(title)}</span></div>
      <section class="result">
        <div class="stamp${soft ? " soft" : ""}" aria-hidden="true"><span>${stamp}</span></div>
        <p class="score">${total}문제 중 <b>${correct}</b>문제</p>
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
        <h2>채점표</h2>
        <ol>
          ${results
            .map(
              (x, i) => `<li>
                ${x.ok ? MARK_O(false) : MARK_X(false)}
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
  }

  // ---------- 이벤트 ----------
  app.addEventListener("click", (e) => {
    const el = e.target.closest("button");
    if (!el) return;
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

  renderHome();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
