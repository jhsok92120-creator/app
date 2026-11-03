(() => {
  "use strict";

  const QUIZ_LENGTH = 8;
  const STORAGE_KEY = "ssuk-best-v1";
  const app = document.getElementById("app");

  const MIX = {
    id: "mix",
    area: "모두",
    title: "섞어서 도전",
    emoji: "🌈",
    color: "#f59e0b",
    questions: CATEGORIES.flatMap((c) => c.questions.map((q) => ({ ...q, tag: `${c.emoji} ${c.title}` }))),
  };

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

  function saveBest(catId, stars) {
    try {
      const best = loadBest();
      if (!best[catId] || stars > best[catId]) {
        best[catId] = stars;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(best));
      }
    } catch {
      /* 저장소를 못 쓰는 환경이면 기록만 건너뜁니다 */
    }
  }

  function starsFor(correct, total) {
    const r = correct / total;
    if (r >= 0.9) return 3;
    if (r >= 0.6) return 2;
    if (r > 0) return 1;
    return 0;
  }

  const starText = (n) => "⭐".repeat(n) + "☆".repeat(3 - n);

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }
  const canSpeak = "speechSynthesis" in window;

  // ---------- 홈 ----------
  function renderHome() {
    state = null;
    if (canSpeak) speechSynthesis.cancel();
    const best = loadBest();
    const card = (c) => `
      <button class="cat-card" data-cat="${c.id}" style="border-color:${c.color}33">
        <span class="emoji" aria-hidden="true">${c.emoji}</span>
        <span class="name">${esc(c.title)}</span>
        <span class="desc">${esc(c.desc)}</span>
        <span class="best" aria-label="최고 기록">${best[c.id] != null ? starText(best[c.id]) : ""}</span>
      </button>`;
    const group = (area, label) => `
      <span class="area-label">${label}</span>
      <div class="cat-grid">${CATEGORIES.filter((c) => c.area === area).map(card).join("")}</div>`;

    app.innerHTML = `
      <h1>🌱 생각쑥쑥 마음쑥쑥</h1>
      <p class="sub">퀴즈를 풀면서 생각하는 힘과 마음 읽는 힘을 키워요!</p>
      ${group("사고력", "🧠 생각하는 힘")}
      ${group("마음", "💛 마음 읽는 힘")}
      <button class="mix-btn" data-cat="mix">🌈 섞어서 도전하기</button>
      <p class="notice">이 퀴즈는 연습용이에요. 지능이나 성격을 검사하는 시험이 아니에요.</p>`;
  }

  // ---------- 퀴즈 ----------
  function startQuiz(catId) {
    const cat = catId === "mix" ? MIX : CATEGORIES.find((c) => c.id === catId);
    if (!cat) return renderHome();
    const picked = shuffle(cat.questions).slice(0, QUIZ_LENGTH).map((q) => ({
      ...q,
      tag: q.tag || `${cat.emoji} ${cat.title}`,
      correctText: q.options[q.answer],
      // O/X처럼 보기가 2개인 문제는 순서를 그대로 둡니다
      shown: q.options.length > 2 ? shuffle(q.options) : q.options.slice(),
    }));
    state = { cat, list: picked, index: 0, results: [] };
    renderQuestion();
  }

  function renderQuestion() {
    const { cat, list, index } = state;
    const q = list[index];
    const pct = (index / list.length) * 100;
    app.style.setProperty("--cat", cat.color);
    app.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" data-action="home" aria-label="처음으로">🏠</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${index}"><span style="width:${pct}%"></span></div>
        <span class="counter">${index + 1}/${list.length}</span>
        ${canSpeak ? `<button class="icon-btn" data-action="speak" aria-label="문제 읽어주기">🔊</button>` : ""}
      </div>
      <section class="q-card pop">
        <span class="q-tag">${esc(q.tag)}</span>
        <p class="q-text">${esc(q.q)}</p>
      </section>
      <div class="options">
        ${q.shown.map((o, i) => `<button class="option" data-opt="${i}">${esc(o)}</button>`).join("")}
      </div>
      <div id="after"></div>`;
    app.querySelector(".option")?.focus({ preventScroll: true });
  }

  function choose(i) {
    const q = state.list[state.index];
    if (state.results.length > state.index) return; // 이미 답함
    const chosen = q.shown[i];
    const ok = chosen === q.correctText;
    state.results.push({ q, chosen, ok });

    app.querySelectorAll(".option").forEach((btn, idx) => {
      btn.disabled = true;
      const text = q.shown[idx];
      if (text === q.correctText) btn.classList.add("correct");
      else if (idx === i) btn.classList.add("wrong");
      else btn.classList.add("dim");
    });

    const last = state.index === state.list.length - 1;
    const after = document.getElementById("after");
    after.innerHTML = `
      <div class="feedback ${ok ? "good" : "try"} pop">
        <strong>${ok ? "🎉 정답이에요!" : `🤔 아쉬워요! 정답: ${esc(q.correctText)}`}</strong>
        ${esc(q.explain)}
      </div>
      <button class="primary-btn" data-action="next">${last ? "결과 보기" : "다음 문제 ➜"}</button>`;
    after.querySelector("button").focus({ preventScroll: true });
    after.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function next() {
    if (canSpeak) speechSynthesis.cancel();
    state.index++;
    if (state.index >= state.list.length) renderResult();
    else renderQuestion();
  }

  // ---------- 결과 ----------
  function renderResult() {
    const { cat, results } = state;
    const correct = results.filter((r) => r.ok).length;
    const total = results.length;
    const stars = starsFor(correct, total);
    saveBest(cat.id, stars);

    const cheer = [
      "괜찮아요! 해설을 보고 다시 도전하면 금방 늘어요.",
      "좋은 출발이에요! 조금씩 더 해 봐요.",
      "잘했어요! 생각하는 힘이 쑥쑥 자라고 있어요.",
      "최고예요! 다른 퀴즈에도 도전해 볼까요?",
    ][stars];
    const big = ["🌱", "🌿", "🌳", "🏆"][stars];

    app.innerHTML = `
      <section class="result">
        <div class="big pop" aria-hidden="true">${big}</div>
        <div class="stars" aria-label="별 ${stars}개">${starText(stars)}</div>
        <div class="score">${total}문제 중 ${correct}문제 맞혔어요</div>
        <p class="cheer">${cheer}</p>
        <button class="primary-btn" data-action="retry">🔁 다시 하기</button>
        <button class="secondary-btn" data-action="home">🏠 처음으로</button>
      </section>
      <h2>다시 보기</h2>
      <ol class="review">
        ${results
          .map(
            (r) => `<li>${esc(r.q.q)}<br>
              ${r.ok ? `<span class="ok">⭕ ${esc(r.chosen)}</span>` : `<span class="no">❌ ${esc(r.chosen)}</span> → 정답: <b>${esc(r.q.correctText)}</b>`}
            </li>`
          )
          .join("")}
      </ol>`;
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
        return speak(`${q.q}. 보기. ${q.shown.join(", ")}`);
      }
    }
  });

  renderHome();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
