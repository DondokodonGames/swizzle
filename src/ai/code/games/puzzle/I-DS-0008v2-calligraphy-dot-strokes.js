// I-DS-0008v2-calligraphy-dot-strokes.js
// 点つなぎ書き初め — 半紙に打たれた手本の点を、書き順の番号どおりに筆でつないで一画ずつ字を書き上げる
// 操作: 赤い番号の点に筆(指)を置き、その画の点を順にたどって終わりの点で離す。曲がる画は角の点も通る。順番を飛ばす・点から大きく外れる・途中で離すと墨がにじむ
// 終わり: 3文字(2画→3画→4画。後の字ほど番号が早く消える)を22秒以内に書き上げればCLEAR。にじみ3回/時間切れでGAME OVER
// @mechanic: connect
// @theme: town_calligraphy_class_dot_strokes
// 世界観: 町の書道教室の長机で、習い始めの子どもが先生の打った朱の番号つきの点を書き順どおりに筆でつなぎ、手本の字を一画ずつ半紙に書き上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 書けた画数・にじみの数・スコア
// スタイル: 90s PRE-RENDER

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗め・金属質。動かない1枚絵の背景に粒状ノイズ、キャラだけドットで動かす
  var STYLE = { bg: ['#241e1a', '#4a3c30'], main: ['#ece4d0', '#16120f', '#8c7c68'], accent: ['#c8392a', '#d6b25e'] };
  var DESK = STYLE.bg[0], WOOD = STYLE.bg[1], PAPER = STYLE.main[0], SUMI = STYLE.main[1], GRAY = STYLE.main[2], SHU = STYLE.accent[0], BRASS = STYLE.accent[1];

  var TITLE = 'SHODO DOTS';
  var TIME_LIMIT = 22;
  var MISTAKES = 3;
  var PX0 = 150, PX1 = W - 150, PY0 = H * 0.17, PY1 = H * 0.64;
  var PASS_R = 58, BREAK_R = 95, START_R = 75;

  // 文字 = 画の並び。画 = 点の並び(半紙内の0〜1座標)。ln = 番号の置き場所のずれ
  var GLYPHS = [
    { show: 99, strokes: [
      { p: [[0.14, 0.45], [0.86, 0.45]], ln: [-60, -40] },
      { p: [[0.5, 0.1], [0.5, 0.9]], ln: [60, -20] },
    ] },
    { show: 1.6, strokes: [
      { p: [[0.22, 0.18], [0.22, 0.84]], ln: [-62, 0] },
      { p: [[0.22, 0.18], [0.78, 0.18], [0.78, 0.84]], ln: [10, -62] },
      { p: [[0.22, 0.84], [0.78, 0.84]], ln: [-62, 30] },
    ] },
    { show: 1.2, strokes: [
      { p: [[0.18, 0.16], [0.82, 0.16]], ln: [-62, 0] },
      { p: [[0.28, 0.5], [0.72, 0.5]], ln: [-62, 0] },
      { p: [[0.5, 0.16], [0.5, 0.86]], ln: [40, -60] },
      { p: [[0.12, 0.86], [0.88, 0.86]], ln: [-62, 0] },
    ] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var PUPIL = [
    ['...hhhhhh...', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hffffffffh.', '.ffeeffeeff.', '.ffkeffkeff.', '.ffffffffff.', '..ffmmmmff..', '...ffffff...', '..wwwwwwww..', '.wwwwwwwwww.', 'ffwwwwwwwwff'],
    ['...hhhhhh...', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hffffffffh.', '.ffeeffeeff.', '.ffekffekff.', '.ffffffffff.', '..fffmmfff..', '...ffffff...', '..wwwwwwww..', '.wwwwwwwwww.', 'ffwwwwwwwwff'],
    ['f..hhhhhh..f', 'f.hhhhhhhh.f', '.fhhhhhhhhf.', '.hffffffffh.', '.ffkkffkkff.', '.ffffffffff.', '.ffmmmmmmff.', '..ffmmmmff..', '...ffffff...', '..wwwwwwww..', '.wwwwwwwwww.', '.wwwwwwwwww.'],
    ['............', '...hhhhhh...', '..hhhhhhhh..', '.hhhhhhhhhh.', '.hffffffffh.', '.ffkkffkkff.', '.ffffffffff.', '..ffmmmmff..', '...ffffff...', '..wwwwwwww..', 'ffwwwwwwwwff', '.wwwwwwwwww.'],
  ];
  var BRUSH = ['.s.', '.s.', '.s.', '.s.', 'bbb', 'bbb', '.k.'];
  var GRAIN = [];
  for (var gi = 0; gi < 140; gi++) GRAIN.push([(gi * 397) % W, (gi * 211 + gi * gi * 7) % H, gi % 3]);

  function label(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function P(pt) { return { x: PX0 + pt[0] * (PX1 - PX0), y: PY0 + pt[1] * (PY1 - PY0) }; }

  function segDist(px, py, a, b) {
    var vx = b.x - a.x, vy = b.y - a.y, wx = px - a.x, wy = py - a.y;
    var l2 = vx * vx + vy * vy;
    var t = l2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / l2)) : 0;
    return Math.hypot(px - (a.x + vx * t), py - (a.y + vy * t));
  }

  // ── 画のなぞり判定(プレイ・デモ共通)。pen = { s: 画番号, k: 次に通る点, dev: 最大ずれ, path: [...] } ──
  function startPen(g, done, x, y) {
    var exp = g.strokes[done];
    if (exp && Math.hypot(x - P(exp.p[0]).x, y - P(exp.p[0]).y) < START_R) return { ok: true, pen: { s: done, k: 1, dev: 0, path: [{ x: x, y: y }] } };
    for (var i = done + 1; i < g.strokes.length; i++) {
      var q = P(g.strokes[i].p[0]);
      if (Math.hypot(x - q.x, y - q.y) < START_R) return { ok: false, wrong: true };
    }
    return { ok: false, wrong: false };
  }

  function movePen(g, pen, x, y) {
    var st = g.strokes[pen.s];
    pen.path.push({ x: x, y: y });
    if (pen.path.length > 60) pen.path.shift();
    if (pen.k >= st.p.length) return 'done';
    var a = P(st.p[pen.k - 1]), b = P(st.p[pen.k]);
    var d = segDist(x, y, a, b);
    pen.dev = Math.max(pen.dev, d);
    pen.near = d;
    if (Math.hypot(x - b.x, y - b.y) < PASS_R) pen.k++;
    if (d > BREAK_R && pen.k < st.p.length) return 'break';
    return pen.k >= st.p.length ? 'done' : 'go';
  }

  // ── 描画(背景は動かない1枚絵) ──
  function drawRoom() {
    game.draw.gradient(0, H, [[0, '#1a1512'], [0.12, DESK], [0.5, WOOD], [1, '#2a221c']]);
    for (var i = 0; i < 14; i++) game.draw.rect(0, H * 0.12 + i * 120, W, 3, '#000000', 0.18);
    for (var g = 0; g < GRAIN.length; g++) game.draw.rect(GRAIN[g][0], GRAIN[g][1], 3, 3, GRAIN[g][2] ? '#ffffff' : '#000000', 0.06);
    // 下敷き(フェルト)と半紙
    game.draw.rect(PX0 - 50, PY0 - 50, PX1 - PX0 + 100, PY1 - PY0 + 100, '#1e2a3a');
    game.draw.rect(PX0 - 10, PY0 - 10, PX1 - PX0 + 20, PY1 - PY0 + 20, '#cfc6b0');
    game.draw.rect(PX0, PY0, PX1 - PX0, PY1 - PY0, PAPER);
    for (var f = 0; f < 6; f++) game.draw.rect(PX0, PY0 + f * 160 + 40, PX1 - PX0, 2, '#d8cfb8', 0.6);
    // 文鎮(金属の照り)
    game.draw.rect(PX0 - 20, PY0 - 46, PX1 - PX0 + 40, 30, '#3a3430');
    game.draw.rect(PX0 - 20, PY0 - 46, PX1 - PX0 + 40, 8, BRASS, 0.8);
    // 硯
    game.draw.rect(W * 0.66, H * 0.73, 260, 150, '#2e2a28');
    game.draw.rect(W * 0.66 + 14, H * 0.73 + 14, 232, 90, '#0e0c0b');
    game.draw.rect(W * 0.66 + 20, H * 0.73 + 18, 120, 6, '#ffffff', 0.2);
  }

  function drawGuide(g, alpha) {
    for (var i = 0; i < g.strokes.length; i++) {
      var p = g.strokes[i].p;
      for (var j = 1; j < p.length; j++) { var a = P(p[j - 1]), b = P(p[j]); game.draw.line(a.x, a.y, b.x, b.y, GRAY, 44); }
    }
    game.draw.rect(PX0, PY0, PX1 - PX0, PY1 - PY0, PAPER, 1 - alpha);
  }

  function drawInk(g, done) {
    for (var i = 0; i < done; i++) {
      var p = g.strokes[i].p;
      for (var j = 1; j < p.length; j++) {
        var a = P(p[j - 1]), b = P(p[j]);
        game.draw.line(a.x, a.y, b.x, b.y, SUMI, 50);
        game.draw.circle(a.x, a.y, 25, SUMI); game.draw.circle(b.x, b.y, 25, SUMI);
      }
      var st = P(p[0]);
      game.draw.circle(st.x - 8, st.y - 6, 30, SUMI);
    }
  }

  function drawDots(g, done, numAlpha, hot) {
    var seen = {};
    for (var i = 0; i < g.strokes.length; i++) {
      var p = g.strokes[i].p;
      for (var j = 0; j < p.length; j++) {
        var key = p[j][0] + ',' + p[j][1];
        if (seen[key]) continue;
        seen[key] = true;
        var q = P(p[j]);
        game.draw.circle(q.x, q.y, 18, '#000000', 0.35);
        game.draw.circle(q.x, q.y, 13, i < done ? SUMI : GRAY);
      }
    }
    for (var s = 0; s < g.strokes.length; s++) {
      var st = g.strokes[s];
      var q0 = P(st.p[0]);
      if (s === done && hot) {
        var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 8);
        game.draw.circle(q0.x, q0.y, 30 + pulse * 10, SHU, 0.25 + 0.2 * pulse);
        game.draw.circle(q0.x, q0.y, 16, '#ffffff');
      }
      if (s >= done && numAlpha > 0) {
        game.draw.circle(q0.x + st.ln[0], q0.y + st.ln[1], 26, PAPER, numAlpha);
        game.draw.text(String(s + 1), q0.x + st.ln[0], q0.y + st.ln[1], { size: 42, color: SHU, bold: true, align: 'center' });
      }
    }
  }

  function drawPen(pen, warn) {
    if (!pen) return;
    for (var i = 1; i < pen.path.length; i++) {
      var a = pen.path[i - 1], b = pen.path[i];
      game.draw.line(a.x, a.y, b.x, b.y, warn ? '#5a1a14' : SUMI, 40);
    }
    var t = pen.path[pen.path.length - 1];
    game.draw.circle(t.x, t.y, 22, warn ? SHU : SUMI);
  }

  function drawBlots(list) {
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var k = Math.min(1, b.t / 0.25);
      game.draw.circle(b.x, b.y, 40 * k + 10, SUMI, 0.75);
      game.draw.circle(b.x + 30, b.y + 18, 22 * k, SUMI, 0.6);
      game.draw.circle(b.x - 26, b.y + 24, 16 * k, SUMI, 0.6);
    }
  }

  function drawPupil(pose) {
    var fr = pose === 'cheer' ? 2 : pose === 'sad' ? 3 : Math.floor(game.time.elapsed * 1.6) % 4 === 0 ? 1 : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 5 - (pose === 'cheer' ? Math.abs(Math.sin(game.time.elapsed * 9)) * 26 : 0);
    game.draw.sprite(PUPIL[fr], { h: '#1a1210', f: '#f0caa0', e: PAPER, k: SUMI, m: SHU, w: '#e8e4dc' }, W * 0.3, H * 0.83 + bob, 18, { anchor: 'center' });
    game.draw.sprite(BRUSH, { s: '#b08a5a', b: SUMI, k: SUMI }, W * 0.48, H * 0.82 + bob, 14, { anchor: 'center' });
  }

  // ── 状態 ──
  var gIdx, done, pen, blots, mistakes, strokesN, totalStrokes, perfects, score, timeLeft, showT, ready, halt, over, won, endT, prevBest, pose, poseT, sparkT, betweenT, milestoneDone, warnT;

  function initGame() {
    gIdx = 0; done = 0; pen = null; blots = []; mistakes = 0; strokesN = 0; perfects = 0; score = 0;
    totalStrokes = 0; for (var i = 0; i < GLYPHS.length; i++) totalStrokes += GLYPHS[i].strokes.length;
    timeLeft = TIME_LIMIT; showT = 0; ready = 0.8; halt = null; over = false; won = false; endT = 0;
    prevBest = game.best || 0; pose = 'idle'; poseT = 0; sparkT = 0; betweenT = 0; milestoneDone = false; warnT = 0;
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.8; pose = ok ? 'cheer' : 'sad';
    if (ok) score += Math.round(timeLeft * 30) + (MISTAKES - mistakes) * 60;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
  }

  function blotAt(x, y) {
    blots.push({ x: x, y: y, t: 0 });
    mistakes++;
    pen = null;
    pose = 'sad'; poseT = 0.5;
    if (mistakes >= MISTAKES) halt = { t: 0.5, max: 0.5, x: x, y: y };
    else game.feedback.bad(x, y, { text: 'MISS' });
  }

  function strokeDone(x, y) {
    var dev = pen.dev;
    pen = null;
    done++;
    strokesN++;
    var perfect = dev < 30;
    if (perfect) perfects++;
    score += 100 + (perfect ? 60 : 0);
    game.feedback.good(x, y, { text: perfect ? 'PERFECT' : 'GOOD', color: BRASS, count: 12 });
    pose = 'cheer'; poseT = 0.35;
    if (done >= GLYPHS[gIdx].strokes.length) {
      game.audio.play('se_coin', 0.35);
      if (gIdx === 1 && !milestoneDone) {
        milestoneDone = true;
        game.fx.popup((gIdx + 1) + ' / ' + GLYPHS.length, W / 2, H * 0.13, { color: BRASS, size: 62 });
        game.audio.play('se_milestone', 0.45);
      }
      betweenT = 0.7;
    }
  }

  function canPlay() { return state === S.PLAYING && !over && !halt && ready <= 0 && betweenT <= 0; }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (!canPlay()) game.fx.burst(x, y, { color: PAPER, count: 3, speed: 60 });
  });

  game.onPress(function (x, y) {
    if (!canPlay() || pen) return;
    var r = startPen(GLYPHS[gIdx], done, x, y);
    if (r.ok) {
      pen = r.pen;
      game.audio.play('se_tap', 0.25);
      game.fx.burst(x, y, { color: SUMI, count: 5, speed: 90 });
    } else if (r.wrong) {
      blotAt(x, y);
    } else {
      game.audio.play('se_tap', 0.05);
      game.fx.burst(x, y, { color: GRAY, count: 3, speed: 60 });
    }
  });

  game.onMove(function (x, y) {
    if (!pen || !canPlay()) return;
    var before = pen.k;
    var res = movePen(GLYPHS[gIdx], pen, x, y);
    if (res === 'break') blotAt(x, y);
    else if (pen.k > before) game.audio.tone(392 + pen.k * 80, 0.06, { wave: 'triangle', volume: 0.07 });
  });

  game.onRelease(function (x, y) {
    if (!pen || !canPlay()) { pen = null; return; }
    var st = GLYPHS[gIdx].strokes[pen.s];
    var p0 = pen.path[0];
    if (pen.k >= st.p.length) {
      game.audio.play('se_jump', 0.15);
      strokeDone(x, y);
    } else if (Math.hypot(x - p0.x, y - p0.y) < 40) {
      // 筆を置いて上げただけ: 書いていないので罰なし
      pen = null;
      game.audio.play('se_tap', 0.08);
    } else {
      // 途中で離した: 筆がかすれてにじむ
      blotAt(x, y);
    }
  });

  // ── ATTRACT: 「十」。2番から書こうとしてにじむ → 1番の横画 → 2番の縦画で書き上がる ──
  var DEMO_CYCLE = 5.0;
  var demo = { t: 0, done: 0, pen: null, blots: [], gx: W / 2, gy: H * 0.5, press: false, step: 0, mood: 'idle' };
  var DEMO_PLAN = [
    { at: 0.3, kind: 'wrong', from: [0.5, 0.1] },
    { at: 1.3, kind: 'stroke', s: 0 },
    { at: 2.5, kind: 'stroke', s: 1 },
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { demo.done = 0; demo.pen = null; demo.blots = []; demo.step = 0; demo.mood = 'idle'; }
    for (var b = 0; b < demo.blots.length; b++) demo.blots[b].t += dt;
    var g = GLYPHS[0];
    var plan = DEMO_PLAN[Math.min(demo.step, DEMO_PLAN.length - 1)];
    var tx = W / 2, ty = H * 0.72;
    demo.press = false;
    if (demo.step < DEMO_PLAN.length) {
      var aim = plan.kind === 'wrong' ? P(plan.from) : P(g.strokes[plan.s].p[0]);
      tx = aim.x; ty = aim.y;
      if (cyc >= plan.at) {
        demo.press = true;
        if (plan.kind === 'wrong') {
          var r = startPen(g, demo.done, aim.x, aim.y);
          if (r.wrong) { demo.blots.push({ x: aim.x, y: aim.y, t: 0 }); game.feedback.bad(aim.x, aim.y, { text: 'MISS', volume: 0.3 }); demo.mood = 'sad'; }
          demo.step++;
        } else {
          if (!demo.pen) { var r2 = startPen(g, demo.done, aim.x, aim.y); demo.pen = r2.pen; }
          var st = g.strokes[plan.s];
          var k = Math.min(1, (cyc - plan.at) / 0.7);
          var a = P(st.p[0]), e = P(st.p[st.p.length - 1]);
          var px = a.x + (e.x - a.x) * k, py = a.y + (e.y - a.y) * k + Math.sin(k * 9) * 6;
          movePen(g, demo.pen, px, py);
          tx = px; ty = py;
          if (k >= 1) {
            demo.pen = null; demo.done++; demo.step++;
            demo.mood = 'cheer';
            game.feedback.good(px, py, { text: 'PERFECT', color: BRASS, count: 10, volume: 0.3 });
          }
        }
      }
    }
    if (demo.press && demo.pen) { demo.gx = tx; demo.gy = ty; }
    else { demo.gx += (tx - demo.gx) * Math.min(1, dt * 8); demo.gy += (ty - demo.gy) * Math.min(1, dt * 8); }
    return cyc;
  }

  function drawHud() {
    for (var i = 0; i < GLYPHS.length; i++) {
      var col = i < gIdx || (over && won) ? SUMI : i === gIdx ? PAPER : GRAY;
      game.draw.rect(40 + i * 96, 46, 78, 78, '#000000', 0.4);
      game.draw.rect(46 + i * 96, 52, 66, 66, PAPER, 0.9);
      if (i < gIdx || (over && won)) game.draw.rect(60 + i * 96, 80, 38, 10, col);
      if (i === gIdx) game.draw.rect(46 + i * 96, 112, 66, 6, SHU);
    }
    for (var m = 0; m < MISTAKES; m++) game.draw.circle(W - 70 - m * 66, 84, 24, m < mistakes ? SUMI : '#5a4c40', m < mistakes ? 1 : 0.6);
    label(strokesN + ' / ' + totalStrokes, W * 0.55, 72, 42, PAPER);
    label(String(score), W * 0.55, 136, 34, BRASS);
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(40, 180, W - 80, 22, '#000000', 0.5);
    game.draw.rect(44, 184, (W - 88) * fr, 14, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? SHU : BRASS);
  }

  function drawResult() {
    game.draw.rect(80, H * 0.24, W - 160, H * 0.30, '#000000', 0.82);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.29, 104, won ? BRASS : SHU);
    label(strokesN + ' / ' + totalStrokes, W / 2, H * 0.36, 60, PAPER);
    label('SCORE ' + score, W / 2, H * 0.42, 50, PAPER);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.48, 54, BRASS);
    else label('BEST ' + Math.max(prevBest, game.best || 0), W / 2, H * 0.48, 42, GRAY);
    if (!won && strokesN < totalStrokes) label('あと' + (totalStrokes - strokesN) + '画!', W / 2, H * 0.525, 46, BRASS);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawRoom();
      drawGuide(GLYPHS[0], 0.35);
      drawInk(GLYPHS[0], demo.done);
      drawDots(GLYPHS[0], demo.done, 1, true);
      drawPen(demo.pen, false);
      drawBlots(demo.blots);
      drawPupil(demo.mood);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      label(TITLE, W / 2, H * 0.055, 88, PAPER);
      label('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 36, BRASS);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.965, 44, BRASS);
      else label('TAP TO START', W / 2, H * 0.965, 40, PAPER);
      return;
    }

    var warn = false;
    if (state === S.PLAYING) {
      if (poseT > 0) { poseT -= dt; if (poseT <= 0 && !over) pose = 'idle'; }
      for (var b = 0; b < blots.length; b++) blots[b].t += dt;
      if (over) {
        endT -= dt;
        if (won) {
          sparkT -= dt;
          if (sparkT <= 0) { sparkT = 0.2; game.fx.burst(game.random(160, W - 160), game.random(PY0, PY1), { color: [BRASS, SHU, PAPER][Math.floor(game.random(0, 3))], count: 16, speed: 340 }); }
        }
        if (endT <= 0) state = S.RESULT;
      } else if (halt) {
        halt.t -= dt;
        if (halt.t <= 0) {
          game.feedback.bad(halt.x, halt.y, { text: 'MISS' });
          halt = null;
          finish(false);
        }
      } else if (ready > 0) {
        ready -= dt;
        if (ready <= 0) game.audio.play('se_tap', 0.3);
      } else if (betweenT > 0) {
        betweenT -= dt;
        if (betweenT <= 0) {
          if (gIdx + 1 >= GLYPHS.length) finish(true);
          else { gIdx++; done = 0; showT = 0; blots = []; }
        }
      } else {
        timeLeft -= dt;
        showT += dt;
        if (pen && pen.near > BREAK_R * 0.65) {
          warn = true;
          warnT -= dt;
          if (warnT <= 0) { warnT = 0.2; game.audio.tone(220, 0.05, { wave: 'square', volume: 0.05 }); }
        }
        if (timeLeft <= 0 && !over) {
          timeLeft = 0; pen = null;
          game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
          finish(false);
        }
      }
    }

    var g = GLYPHS[gIdx];
    drawRoom();
    if (gIdx === 0) drawGuide(g, 0.35);
    drawInk(g, done);
    var numA = g.show > 50 ? 1 : Math.max(0, Math.min(1, (g.show - showT) / 0.3));
    drawDots(g, done, numA, numA > 0 && !over && !halt && ready <= 0 && betweenT <= 0);
    drawPen(pen, warn);
    drawBlots(blots);
    if (halt) {
      var hk = 1 - halt.t / halt.max;
      game.draw.circle(halt.x, halt.y, 60 + hk * 50, '#ffffff', 0.5 * (1 - hk) + 0.2);
    }
    drawPupil(pose);
    drawHud();
    if (ready > 0) label(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 120, SHU);
    if (over || state === S.RESULT) drawResult();

    if (state === S.RESULT) {
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.965, 40, PAPER);
      var stats = { strokes: strokesN, total: totalStrokes, blots: mistakes, perfect: perfects };
      if (won) game.end.success(score, stats);
      else game.end.failure(stats);
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['D5', 1], ['F5', 0.5], ['G5', 0.5], ['A5', 1.5], ['G5', 0.5],
      ['F5', 1], ['D5', 1], ['C5', 2],
      ['D5', 1], ['F5', 0.5], ['A5', 0.5], ['C6', 1.5], ['A5', 0.5],
      ['G5', 1], ['F5', 1], ['D5', 2],
    ], {
      tempo: 84, wave: 'triangle', volume: 0.05, loop: true,
      bass: [['D3', 2], ['A2', 2], ['Bb2', 2], ['C3', 2], ['D3', 2], ['F3', 2], ['G2', 2], ['D3', 2]],
    });
    state = S.ATTRACT;
    initGame();
  });
})(game);
