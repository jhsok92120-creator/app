// 그림 문제용 SVG 생성 도우미. questions.js보다 먼저 불러옵니다.
// 모든 그림은 파일 없이 코드로 그려서 오프라인에서도 보입니다.
const FIG = (() => {
  const C = { p: "#6d36d5", c: "#ff6b5a", b: "#4c8dff", g: "#3fae4b", y: "#f0c33c", k: "#1f2033", l: "#dfe5f2", w: "#ffffff", skin: "#ffd9a8" };
  const svg = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

  // 기본 도형
  const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
  const square = (cx, cy, r, fill, rot = 0) => `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="4" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const rect = (cx, cy, w, h, fill) => `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="4" fill="${fill}"/>`;
  const triangle = (cx, cy, r, fill, rot = 0) => `<polygon points="${cx},${cy - r} ${cx + r * 0.95},${cy + r * 0.7} ${cx - r * 0.95},${cy + r * 0.7}" fill="${fill}" stroke-linejoin="round" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const star = (cx, cy, r, fill) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
  };
  const arrow = (cx, cy, r, fill, rot = 0) => `<path d="M${cx} ${cy - r} L${cx + r * 0.8} ${cy} L${cx + r * 0.35} ${cy} L${cx + r * 0.35} ${cy + r} L${cx - r * 0.35} ${cy + r} L${cx - r * 0.35} ${cy} L${cx - r * 0.8} ${cy} Z" fill="${fill}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const shape = (type, cx, cy, r, fill, rot = 0) =>
    ({ circle, square, triangle, star, arrow }[type])(cx, cy, r, fill, rot);
  const qmark = (cx, cy, r) => `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="10" fill="${C.l}"/><text x="${cx}" y="${cy + r * 0.4}" text-anchor="middle" font-size="${r * 1.2}" font-weight="800" fill="#8a90a8" font-family="Pretendard, sans-serif">?</text>`;

  // 한 줄 수열 그림: items = [{type, fill, rot, r}] 마지막에 ? 추가
  const row = (items, withQ = true) => {
    const n = items.length + (withQ ? 1 : 0);
    const w = n * 70 + 10;
    let s = "";
    items.forEach((it, i) => { s += shape(it.type, 40 + i * 70, 40, it.r || 24, it.fill, it.rot || 0); });
    if (withQ) s += qmark(40 + items.length * 70, 40, 24);
    return svg(w, 80, s);
  };
  // 보기용 도형 하나
  const one = (type, fill, rot = 0, r = 26) => svg(80, 80, shape(type, 40, 40, r, fill, rot));

  // 3×3 행렬 (마지막 칸 ?)
  const matrix = (cells) => {
    let s = "";
    cells.forEach((c, i) => {
      const x = 40 + (i % 3) * 72, y = 40 + Math.floor(i / 3) * 72;
      s += `<rect x="${x - 34}" y="${y - 34}" width="68" height="68" rx="10" fill="${C.w}" stroke="${C.l}" stroke-width="2"/>`;
      s += c ? shape(c.type, x, y, 22, c.fill, c.rot || 0) : qmark(x, y, 22);
    });
    return svg(224, 224, s);
  };

  // 쌓기나무 (앞에서 본 모습): rows = [3,2,1] 아래층부터
  const blocks = (rows) => {
    let s = "";
    const u = 36, w = Math.max(...rows) * u + 20, h = rows.length * u + 20;
    rows.forEach((n, r) => {
      const off = (w - n * u) / 2;
      for (let i = 0; i < n; i++) {
        const x = off + i * u, y = h - 10 - (r + 1) * u;
        s += `<rect x="${x}" y="${y}" width="${u}" height="${u}" fill="${C.y}" stroke="${C.k}" stroke-width="2"/>`;
      }
    });
    return svg(w, h, s);
  };

  // 시계
  const clock = (hour, minute) => {
    const ha = ((hour % 12) + minute / 60) * 30, ma = minute * 6;
    let ticks = "";
    for (let i = 0; i < 12; i++) ticks += `<line x1="60" y1="14" x2="60" y2="${i % 3 === 0 ? 22 : 18}" stroke="${C.k}" stroke-width="${i % 3 === 0 ? 3 : 2}" transform="rotate(${i * 30} 60 60)"/>`;
    return svg(120, 120, `<circle cx="60" cy="60" r="54" fill="${C.w}" stroke="${C.k}" stroke-width="4"/>${ticks}
      <line x1="60" y1="60" x2="60" y2="32" stroke="${C.k}" stroke-width="6" stroke-linecap="round" transform="rotate(${ha} 60 60)"/>
      <line x1="60" y1="60" x2="60" y2="22" stroke="${C.c}" stroke-width="4" stroke-linecap="round" transform="rotate(${ma} 60 60)"/>
      <circle cx="60" cy="60" r="4" fill="${C.k}"/>`);
  };

  // 부채꼴 색칠 (n등분 중 k칸)
  const pie = (n, k) => {
    let s = `<circle cx="60" cy="60" r="52" fill="${C.w}" stroke="${C.k}" stroke-width="3"/>`;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
      const x0 = 60 + 52 * Math.cos(a0), y0 = 60 + 52 * Math.sin(a0), x1 = 60 + 52 * Math.cos(a1), y1 = 60 + 52 * Math.sin(a1);
      s += `<path d="M60 60 L${x0.toFixed(1)} ${y0.toFixed(1)} A52 52 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${i < k ? C.b : C.w}" stroke="${C.k}" stroke-width="3"/>`;
    }
    return svg(120, 120, s);
  };

  // 점 묶음 수열
  const dots = (counts) => {
    let s = "";
    counts.forEach((n, gi) => {
      const x0 = 20 + gi * 80;
      if (n == null) { s += qmark(x0 + 20, 40, 22); return; }
      for (let i = 0; i < n; i++) s += circle(x0 + (i % 3) * 16, 24 + Math.floor(i / 3) * 16, 6, C.p);
    });
    return svg(counts.length * 80 + 10, 80, s);
  };

  // 격자 길 찾기: 4×3 격자, 출발 S, 칸에 글자
  const gridPath = (labels) => {
    let s = "";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 10 + c * 56, y = 10 + r * 56;
      s += `<rect x="${x}" y="${y}" width="52" height="52" rx="8" fill="${C.w}" stroke="${C.l}" stroke-width="2"/>`;
      const t = labels[r * 4 + c];
      if (t) s += `<text x="${x + 26}" y="${y + 34}" text-anchor="middle" font-size="22" font-weight="800" fill="${t === "S" ? C.c : C.k}" font-family="Pretendard, sans-serif">${t}</text>`;
    }
    return svg(240, 180, s);
  };

  // 수 피라미드
  const pyramid = (rows) => {
    let s = "";
    const u = 56;
    rows.forEach((vals, r) => {
      const y = 10 + r * 52, off = (3 - vals.length) * u / 2 + 10;
      vals.forEach((v, i) => {
        const x = off + i * u;
        s += `<rect x="${x}" y="${y}" width="50" height="44" rx="8" fill="${v == null ? C.l : C.w}" stroke="${C.l}" stroke-width="2"/>`;
        s += `<text x="${x + 25}" y="${y + 30}" text-anchor="middle" font-size="22" font-weight="800" fill="${v == null ? "#8a90a8" : C.k}" font-family="Pretendard, sans-serif">${v == null ? "?" : v}</text>`;
      });
    });
    return svg(190, 10 + rows.length * 52, s);
  };

  // 삼각형 안에 선 (삼각형 개수 세기)
  const triLines = (n) => {
    let s = `<polygon points="100,16 190,164 10,164" fill="${C.w}" stroke="${C.k}" stroke-width="3" stroke-linejoin="round"/>`;
    for (let i = 1; i <= n; i++) {
      const x = 10 + (180 * i) / (n + 1);
      s += `<line x1="100" y1="16" x2="${x}" y2="164" stroke="${C.k}" stroke-width="3"/>`;
    }
    return svg(200, 180, s);
  };

  // 조각 맞추기: 오른쪽 위가 파인 사각형
  const notch = () => svg(140, 140, `<path d="M20 20 H80 V60 H120 V120 H20 Z" fill="${C.p}" />`);
  const piece = (w, h) => svg(80, 80, `<rect x="${40 - w / 2}" y="${40 - h / 2}" width="${w}" height="${h}" fill="${C.c}"/>`);

  // L 모양과 거울상
  const ell = (flip = false, rot = 0) => svg(80, 80, `<path d="M26 14 H40 V52 H60 V66 H26 Z" fill="${C.b}" transform="${flip ? "scale(-1,1) translate(-80,0)" : ""} rotate(${rot} 40 40)"/>`);

  // ---------- 표정 ----------
  // eyes: open | wide | closed | half | side,  brows: none | angry | sad | up,  mouth: smile | big | frown | flat | o | wavy | small
  const face = ({ eyes = "open", brows = "none", mouth = "smile", blush = false, sweat = false, tear = false } = {}) => {
    let s = `<circle cx="60" cy="62" r="46" fill="${C.skin}" stroke="${C.k}" stroke-width="3"/>`;
    const ey = 56, lx = 44, rx = 76;
    if (eyes === "open") s += circle(lx, ey, 5, C.k) + circle(rx, ey, 5, C.k);
    else if (eyes === "wide") s += `<circle cx="${lx}" cy="${ey}" r="10" fill="${C.w}" stroke="${C.k}" stroke-width="2.5"/><circle cx="${rx}" cy="${ey}" r="10" fill="${C.w}" stroke="${C.k}" stroke-width="2.5"/>` + circle(lx, ey, 4.5, C.k) + circle(rx, ey, 4.5, C.k);
    else if (eyes === "closed") s += `<path d="M36 ${ey} Q44 ${ey + 7} 52 ${ey}" fill="none" stroke="${C.k}" stroke-width="3" stroke-linecap="round"/><path d="M68 ${ey} Q76 ${ey + 7} 84 ${ey}" fill="none" stroke="${C.k}" stroke-width="3" stroke-linecap="round"/>`;
    else if (eyes === "half") s += `<path d="M36 ${ey + 2} H52 M68 ${ey + 2} H84" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/><path d="M36 ${ey - 6} Q44 ${ey - 1} 52 ${ey - 6} M68 ${ey - 6} Q76 ${ey - 1} 84 ${ey - 6}" fill="none" stroke="${C.k}" stroke-width="2.5" stroke-linecap="round"/>`;
    else if (eyes === "side") s += circle(lx + 5, ey + 2, 5, C.k) + circle(rx + 5, ey + 2, 5, C.k);
    if (brows === "angry") s += `<path d="M34 40 L52 48 M86 40 L68 48" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/>`;
    else if (brows === "sad") s += `<path d="M34 48 L52 42 M86 48 L68 42" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/>`;
    else if (brows === "up") s += `<path d="M34 40 Q44 32 54 40 M66 40 Q76 32 86 40" fill="none" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/>`;
    const my = 82;
    if (mouth === "smile") s += `<path d="M44 ${my - 2} Q60 ${my + 14} 76 ${my - 2}" fill="none" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/>`;
    else if (mouth === "big") s += `<path d="M40 ${my - 4} Q60 ${my + 24} 80 ${my - 4} Z" fill="${C.c}" stroke="${C.k}" stroke-width="3" stroke-linejoin="round"/>`;
    else if (mouth === "frown") s += `<path d="M44 ${my + 8} Q60 ${my - 8} 76 ${my + 8}" fill="none" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/>`;
    else if (mouth === "flat") s += `<path d="M46 ${my + 2} H74" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/>`;
    else if (mouth === "o") s += `<ellipse cx="60" cy="${my + 4}" rx="9" ry="12" fill="${C.k}"/>`;
    else if (mouth === "wavy") s += `<path d="M42 ${my + 4} Q50 ${my - 4} 58 ${my + 4} T74 ${my + 4}" fill="none" stroke="${C.k}" stroke-width="3.5" stroke-linecap="round"/>`;
    else if (mouth === "small") s += `<path d="M52 ${my + 2} Q60 ${my + 8} 68 ${my + 2}" fill="none" stroke="${C.k}" stroke-width="3" stroke-linecap="round"/>`;
    if (blush) s += `<ellipse cx="36" cy="72" rx="9" ry="5" fill="${C.c}" opacity=".45"/><ellipse cx="84" cy="72" rx="9" ry="5" fill="${C.c}" opacity=".45"/>`;
    if (sweat) s += `<path d="M98 42 q8 12 0 16 q-8 -4 0 -16z" fill="${C.b}"/>`;
    if (tear) s += `<path d="M46 66 q6 10 0 14 q-6 -4 0 -14z" fill="${C.b}"/>`;
    return svg(120, 120, s);
  };

  // ---------- 몸짓 ----------
  // pose: crossed | slump | cheer | away | open
  const body = (pose) => {
    const head = (cx, cy, m) => `<circle cx="${cx}" cy="${cy}" r="18" fill="${C.skin}" stroke="${C.k}" stroke-width="3"/>` + m;
    const torso = (x, y, h = 60) => `<rect x="${x - 22}" y="${y}" width="44" height="${h}" rx="14" fill="${C.b}"/>`;
    const legs = (x, y) => `<rect x="${x - 18}" y="${y}" width="14" height="36" rx="6" fill="${C.k}"/><rect x="${x + 4}" y="${y}" width="14" height="36" rx="6" fill="${C.k}"/>`;
    const arm = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.skin}" stroke-width="12" stroke-linecap="round"/>`;
    const flat = `<path d="M54 44 H66" stroke="${C.k}" stroke-width="2.5" stroke-linecap="round"/>`;
    const smileM = `<path d="M52 42 Q60 50 68 42" fill="none" stroke="${C.k}" stroke-width="2.5" stroke-linecap="round"/>`;
    const frownM = `<path d="M52 48 Q60 40 68 48" fill="none" stroke="${C.k}" stroke-width="2.5" stroke-linecap="round"/>`;
    const eyesN = circle(54, 34, 2.5, C.k) + circle(66, 34, 2.5, C.k);
    let s = "";
    if (pose === "crossed") {
      s = head(60, 36, eyesN + flat) + torso(60, 56) + arm(40, 70, 82, 92) + arm(80, 70, 38, 92) + legs(60, 114);
    } else if (pose === "slump") {
      s = head(60, 50, circle(54, 50, 2.5, C.k) + circle(66, 50, 2.5, C.k) + `<path d="M52 62 Q60 56 68 62" fill="none" stroke="${C.k}" stroke-width="2.5" stroke-linecap="round"/>`) + `<path d="M38 70 Q60 60 82 70 V118 H38 Z" fill="${C.b}"/>` + arm(40, 76, 36, 112) + arm(80, 76, 84, 112) + legs(60, 116);
    } else if (pose === "cheer") {
      s = head(60, 36, eyesN + smileM) + torso(60, 56) + arm(40, 62, 22, 22) + arm(80, 62, 98, 22) + legs(60, 114);
    } else if (pose === "away") {
      s = head(60, 36, circle(50, 34, 2.5, C.k) + `<path d="M48 44 H58" stroke="${C.k}" stroke-width="2.5" stroke-linecap="round"/>`) + torso(60, 56) + arm(42, 64, 36, 104) + arm(78, 64, 84, 104) + legs(60, 114);
    } else {
      s = head(60, 36, eyesN + smileM) + torso(60, 56) + arm(40, 64, 16, 84) + arm(80, 64, 104, 84) + legs(60, 114);
    }
    return svg(120, 156, s);
  };

  // 두 사람 장면: 왼쪽 표정 + 오른쪽 표정
  const pair = (a, b) => svg(260, 120, `<g transform="translate(0,0) scale(1)">${a.replace(/<svg[^>]*>|<\/svg>/g, "")}</g><g transform="translate(140,0)">${b.replace(/<svg[^>]*>|<\/svg>/g, "")}</g>`);

  return { C, svg, row, one, matrix, blocks, clock, pie, dots, gridPath, pyramid, triLines, notch, piece, ell, face, body, pair, shape };
})();
