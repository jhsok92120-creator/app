(() => {
  "use strict";

  const QUIZ_LENGTH = 8;
  const STORAGE_KEY = "ssuk-best-v2";
  const NUMS = ["①", "②", "③", "④", "⑤"];
  const app = document.getElementById("app");

  const MIX = {
    id: "mix",
    title: "섞어서 풀기",
    questions: CATEGORIES.flatMap((c) => c.questions.map((q) => ({ ...q, tag: c.title }))),
  };

  // 손으로 그린 듯한 채점 표시(빨간 펜)
  const MARK_O = (draw) =>
    `<svg class="mark${draw ? " draw" : ""}" viewBox="0 0 60 60" aria-hidden="true"><path d="M33 7C47 7 55 18 54 31C53 45 42 54 29 54C15 54 6 44 6 30C6 18 15 9 27 8C30 8 34 9 37 10"/></svg>`;
  const MARK_X = (draw) =>
    `<svg class="mark${draw ? " draw" : ""}" viewBox="0 0 60 60" aria-hidden="true"><path d="M12 50C22 38 36 22 50 9"/></svg>`;

  const MASCOT = `<svg viewBox="0 0 512 512" aria-hidden="true">
    <circle cx="256" cy="320" r="150" fill="#fffdf7" stroke="#1f2a44" stroke-width="14"/>
    <path d="M256 172V110" stroke="#2f7d5b" stroke-width="22" stroke-linecap="round"/>
    <path d="M256 130C200 132 162 96 160 52C214 50 254 82 256 130Z" fill="#2f7d5b"/>
    <path d="M256 116C312 118 350 82 352 38C298 36 258 68 256 116Z" fill="#5bb08a"/>
    <circle cx="206" cy="318" r="16" fill="#1f2a44"/><circle cx="306" cy="318" r="16" fill="#1f2a44"/>
    <path d="M222 366Q256 394 290 366" stroke="#1f2a44" stroke-width="12" stroke-linecap="round" fill="none"/>
    <ellipse cx="172" cy="360" rx="20" ry="12" fill="#e0412f" opacity=".35"/><ellipse cx="340" cy="360" rx="20" ry="12" fill="#e0412f" opacity=".35"/>
  </svg>`;

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

  function loadBest() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveBest(catId, correct, total) {
    try {
      const best = loadBest();
      const prev = best[catId];
      if (!prev || correct / total > prev.correct / prev.total) {
        best[catId] = { correct, total };
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
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  // ---------- 홈 ----------
  function renderHome() {
    state = null;
    if (canSpeak) speechSynthesis.cancel();
    const best = loadBest();
    let no = 0;
    const unit = (c) => {
      no++;
      const b = best[c.id];
      return `
        <button class="unit" data-cat="${c.id}">
          <span class="unit-no">${String(no).padStart(2, "0")}</span>
          <span><span class="unit-title">${esc(c.title)}</span><span class="unit-desc">${esc(c.desc)}</span></span>
          ${b ? `<span class="unit-best">최고<br><b>${b.correct}/${b.total}</b></span>` : `<span class="unit-go" aria-hidden="true">›</span>`}
        </button>`;
    };
    const part = (area, title, sub) => `
      <section class="part">
        <h2>${title}<small>${sub}</small></h2>
        ${CATEGORIES.filter((c) => c.area === area).map(unit).join("")}
      </section>`;

    app.innerHTML = `
      <header class="masthead">
        ${MASCOT}
        <div>
          <h1>생각쑥쑥 <span class="hl">마음쑥쑥</span></h1>
          <p>오늘은 어떤 단원을 풀어 볼까요?</p>
        </div>
      </header>
      ${part("사고력", "생각하는 힘", "규칙과 순서")}
      ${part("마음", "마음 읽는 힘", "감정과 친구")}
      <button class="btn" data-cat="mix">모든 단원 섞어서 풀기</button>
      <p class="footnote">연습용 퀴즈예요. 지능이나 성격을 재는 검사가 아니에요.</p>`;
  }

  // ---------- 퀴즈 ----------
  function startQuiz(catId) {
    const cat = catId === "mix" ? MIX : CATEGORIES.find((c) => c.id === catId);
    if (!cat) return renderHome();
    const picked = shuffle(cat.questions).slice(0, QUIZ_LENGTH).map((q) => ({
      ...q,
      tag: q.tag || cat.title,
      correctText: q.options[q.answer],
      // O/X처럼 보기가 2개인 문제는 순서를 그대로 둡니다
      shown: q.options.length > 2 ? shuffle(q.options) : q.options.slice(),
    }));
    state = { cat, list: picked, index: 0, results: [] };
    renderQuestion();
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
    const { list, index } = state;
    const q = list[index];
    app.innerHTML = `
      <div class="bar">
        <button class="text-btn" data-action="home">‹ 그만하기</button>
        ${canSpeak ? `<button class="speak-btn" data-action="speak">${SPEAKER}읽어 줘</button>` : ""}
      </div>
      <ol class="track" aria-label="${list.length}문제 중 ${index + 1}번째">${trackHTML()}</ol>
      <article class="sheet">
        <div class="q-meta">${esc(q.tag)} · ${index + 1} / ${list.length}</div>
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
        <div class="note-head${ok ? " ok" : ""}">${ok ? "정답이에요!" : `정답은 ${NUMS[correctIdx]} ${esc(q.correctText)}`}</div>
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
    const { cat, results } = state;
    const correct = results.filter((r) => r.ok).length;
    const total = results.length;
    saveBest(cat.id, correct, total);

    const r = correct / total;
    const [stamp, cheer, soft] =
      r >= 0.9
        ? ["참<br>잘했어요", "거의 다 맞혔어요! 다른 단원에도 도전해 볼까요?", false]
        : r >= 0.6
        ? ["잘<br>했어요", "많이 맞혔어요. 틀린 문제의 풀이를 한 번 더 읽어 봐요.", false]
        : r > 0
        ? ["힘내요", "아래에서 틀린 문제를 다시 보고, 한 번 더 풀어 봐요.", true]
        : ["다시<br>해 봐요", "처음엔 누구나 어려워요. 풀이를 읽고 다시 도전해요.", true];

    app.innerHTML = `
      <div class="bar"><button class="text-btn" data-action="home">‹ 처음으로</button></div>
      <section class="result">
        <div class="stamp${soft ? " soft" : ""}" aria-hidden="true"><span>${stamp}</span></div>
        <p class="score">${total}문제 중 <b>${correct}</b>문제</p>
        <p class="cheer">${cheer}</p>
        <button class="btn" data-action="retry">한 번 더 풀기</button>
        <button class="btn-ghost" data-action="home">다른 단원 고르기</button>
      </section>
      <section class="review">
        <h2>채점표</h2>
        <ol style="list-style:none;padding:0;margin:0">
          ${results
            .map(
              (x, i) => `<li>
                ${x.ok ? MARK_O(false) : MARK_X(false)}
                <div>${i + 1}. ${esc(x.q.q)}
                  <span class="ans">${
                    x.ok
                      ? `내 답: ${esc(x.chosen)}`
                      : `내 답: ${esc(x.chosen)} · 정답: <b>${esc(x.q.correctText)}</b>`
                  }</span>
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
    if (el.dataset.cat) return startQuiz(el.dataset.cat);
    if (el.dataset.opt != null) return choose(Number(el.dataset.opt));
    switch (el.dataset.action) {
      case "home":
        return renderHome();
      case "next":
        return next();
      case "retry":
        return startQuiz(state.cat.id);
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
