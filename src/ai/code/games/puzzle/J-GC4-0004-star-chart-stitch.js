// J-GC4-0004-star-chart-stitch.js
// スターステッチ — 上の星座札のお手本どおりに、夜空の星を順番に糸で結んで星座を縫い上げる
// 操作: 札で光っている始まりの星から指を置き、お手本の形の頂点を順に(どちら回りでも)なぞってつなぎ、最後に始まりの星へ戻す
// 終わり: 3つの星座を縫い上げればCLEAR。形にない星へつなぐと1ミス、3ミスか時間切れでGAME OVER
// @mechanic: connect
// @theme: star_chart_stitch
// 世界観: 夜明け前の天文台で働く糸引き蜘蛛の星図職人が、師匠の星座札に描かれた形のとおりに星と星を糸で結び、夜が明ける前に3枚の星図を仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 縫い上げた星座数・ミス数・残りタイムのスコア
// スタイル: 70s VECTOR

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s VECTOR: 暗い地に発光する線画のみ(面の塗りを使わない)
  var STYLE = {
    bg: ['#000510', '#021028', '#051a3a'],
    main: ['#7dffd6', '#e8fff9', '#1d6b5c'],
    accent: ['#ffe066', '#ff5c8a'],
  };

  var GAME_TITLE = 'STAR STITCH';
  var TIME_LIMIT = 22;
  var FIG_COUNT = 3;
  var MAX_MISS = 3;
  var HIT_R = 72;

  var FIGS = [
    [[0.5, 0], [1, 0.42], [0.5, 1], [0, 0.42]],
    [[0.08, 0.5], [0.5, 0], [0.92, 0.5], [0.75, 1], [0.25, 1]],
    [[0.5, 0], [1, 0.3], [0.8, 1], [0.5, 0.62], [0.2, 1], [0, 0.3]],
  ];

  var FIELD = { x0: 170, x1: 910, y0: H * 0.31, y1: H * 0.73 };
  var CARD = { cx: W * 0.5, cy: H * 0.19, w: 250, h: 190 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var WEAVER = [
    'l......l',
    '.l.ll.l.',
    '..llll..',
    'llleelll',
    '..llll..',
    '.l.ll.l.',
    'l......l',
  ];
  var MOON = ['..mmm.', '.mm...', 'mm....', 'mm....', '.mm...', '..mmm.'];

  var fig, verts, decoys, seq, dir, anchored, dragging, fx, fy, wrongLock, figIndex, misses, figMisses, links, timeLeft, ready, freeze, ended, endWait, won, score, celebrate;

  function glowLine(x1, y1, x2, y2, rgb, w) {
    game.draw.line(x1, y1, x2, y2, 'rgba(' + rgb + ',0.22)', w * 3.2);
    game.draw.line(x1, y1, x2, y2, 'rgba(' + rgb + ',1)', w);
  }

  function makeFigure(i) {
    fig = FIGS[i];
    var sw = 520 + Math.random() * 160;
    var sh = sw * (0.95 + Math.random() * 0.15);
    var ox = FIELD.x0 + Math.random() * (FIELD.x1 - FIELD.x0 - sw);
    var oy = FIELD.y0 + Math.random() * Math.max(0, FIELD.y1 - FIELD.y0 - sh);
    verts = [];
    for (var k = 0; k < fig.length; k++) {
      verts.push({ x: ox + fig[k][0] * sw + game.random(-18, 18), y: oy + fig[k][1] * sh + game.random(-18, 18) });
    }
    decoys = [];
    var tries = 0;
    while (decoys.length < 4 && tries < 200) {
      tries++;
      var p = { x: game.random(FIELD.x0 - 40, FIELD.x1 + 40), y: game.random(FIELD.y0 - 40, FIELD.y1 + 60) };
      var okp = true;
      var all = verts.concat(decoys);
      for (var a = 0; a < all.length; a++) if (Math.hypot(all[a].x - p.x, all[a].y - p.y) < 170) okp = false;
      // 辺のすぐそばにも置かない(なぞる途中で誤爆しないように)
      for (var e = 0; e < verts.length && okp; e++) {
        var A = verts[e], B = verts[(e + 1) % verts.length];
        var vx = B.x - A.x, vy = B.y - A.y, L2 = vx * vx + vy * vy;
        var t = Math.max(0, Math.min(1, ((p.x - A.x) * vx + (p.y - A.y) * vy) / L2));
        if (Math.hypot(p.x - (A.x + vx * t), p.y - (A.y + vy * t)) < 110) okp = false;
      }
      if (okp) decoys.push(p);
    }
    seq = [];
    dir = 0;
    anchored = false;
    dragging = false;
    wrongLock = -1;
    figMisses = 0;
  }

  function initGame() {
    figIndex = 0;
    misses = 0;
    links = 0;
    timeLeft = TIME_LIMIT;
    ready = 0.8;
    freeze = null;
    ended = false;
    endWait = 0;
    won = false;
    score = 0;
    celebrate = 0;
    fx = W * 0.5;
    fy = H * 0.8;
    makeFigure(0);
  }

  function expectedList() {
    var n = verts.length;
    var last = seq[seq.length - 1];
    if (seq.length === n) return [0];
    if (dir === 0) return [(last + 1) % n, (last + n - 1) % n];
    return [(last + dir + n) % n];
  }

  function txt(s, x, y, size, color) {
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  function endGame(ok) {
    if (ended) return;
    ended = true;
    won = ok;
    endWait = 1.5;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.6);
  }

  function miss(x, y, idx, demo) {
    misses++;
    figMisses++;
    dragging = false;
    wrongLock = idx;
    freeze = { t: 0.35, x: x, y: y, done: function () {
      game.feedback.bad(x, y, { text: 'MISS', color: STYLE.accent[1] });
      if (misses >= MAX_MISS && !demo) endGame(false);
    } };
  }

  function link(v, demo) {
    var n = verts.length;
    var last = seq[seq.length - 1];
    if (seq.length === 1 && dir === 0) dir = v === (last + 1) % n ? 1 : -1;
    seq.push(v);
    links++;
    score += 50;
    if (!demo) game.audio.tone(['C5', 'E5', 'G5', 'B5', 'D6', 'E6', 'G6'][Math.min(6, seq.length - 1)], 0.12, { wave: 'triangle', volume: 0.09 });
    var P = verts[v];
    if (seq.length === n + 1) {
      // 閉じた → 星座完成
      var clean = figMisses === 0;
      score += 300 + (clean ? 200 : 0);
      game.feedback.good(P.x, P.y, { text: clean ? 'PERFECT' : 'NICE', color: STYLE.accent[0], count: 24, volume: demo ? 0 : undefined });
      dragging = false;
      celebrate = 0.8;
      if (!demo) {
        game.fx.popup((figIndex + 1) + ' / ' + FIG_COUNT, W * 0.5, H * 0.5, { color: STYLE.main[0], size: 70 });
        game.audio.play('se_milestone', 0.5);
      }
    } else {
      game.fx.burst(P.x, P.y, { color: STYLE.main[0], count: 8, speed: 260 });
      if (!demo) game.audio.play('se_good', 0.18);
    }
  }

  function probe(x, y, demo) {
    // 指の位置で星に触れたかを判定(押した瞬間・なぞり中の両方)
    if (ended || freeze || celebrate > 0) return;
    if (wrongLock >= 0) {
      var L = wrongLock < 100 ? verts[wrongLock] : decoys[wrongLock - 100];
      if (!L || Math.hypot(L.x - x, L.y - y) > HIT_R + 30) wrongLock = -1;
      else return;
    }
    if (!anchored) {
      if (Math.hypot(verts[0].x - x, verts[0].y - y) < HIT_R + 10) {
        anchored = true;
        seq = [0];
        if (!demo) game.audio.play('se_tap', 0.4);
        game.fx.burst(verts[0].x, verts[0].y, { color: STYLE.accent[0], count: 10, speed: 240 });
        return;
      }
      for (var q = 1; q < verts.length; q++) if (Math.hypot(verts[q].x - x, verts[q].y - y) < HIT_R) { miss(verts[q].x, verts[q].y, q, demo); return; }
      for (var r = 0; r < decoys.length; r++) if (Math.hypot(decoys[r].x - x, decoys[r].y - y) < HIT_R) { miss(decoys[r].x, decoys[r].y, 100 + r, demo); return; }
      return;
    }
    var last = seq[seq.length - 1];
    var exp = expectedList();
    for (var i = 0; i < verts.length; i++) {
      if (i === last) continue;
      if (Math.hypot(verts[i].x - x, verts[i].y - y) >= HIT_R) continue;
      if (exp.indexOf(i) >= 0) { link(i, demo); return; }
      if (seq.indexOf(i) >= 0) return; // 既に結んだ星の上を通るのは可
      miss(verts[i].x, verts[i].y, i, demo);
      return;
    }
    for (var d = 0; d < decoys.length; d++) {
      if (Math.hypot(decoys[d].x - x, decoys[d].y - y) < HIT_R) { miss(decoys[d].x, decoys[d].y, 100 + d, demo); return; }
    }
  }

  function pointerDown(x, y, demo) {
    fx = x; fy = y;
    if (ended || freeze || celebrate > 0) return;
    dragging = true;
    var before = seq.length;
    probe(x, y, demo);
    if (!demo && seq.length === before && !freeze) game.audio.play('se_tap', 0.15);
    game.fx.burst(x, y, { color: STYLE.main[1], count: 4, speed: 120 });
  }
  function pointerMove(x, y, demo) {
    fx = x; fy = y;
    if (!dragging) return;
    probe(x, y, demo);
  }

  function stepWorld(dt, demo) {
    if (freeze) {
      freeze.t -= dt;
      if (freeze.t <= 0) { var d = freeze.done; freeze = null; d(); }
      return;
    }
    if (celebrate > 0) {
      celebrate -= dt;
      if (celebrate <= 0) {
        figIndex++;
        if (figIndex >= FIG_COUNT) {
          if (!demo) {
            score += Math.round(timeLeft * 40) - misses * 100;
            score = Math.max(0, score);
            game.feedback.good(W * 0.5, H * 0.45, { text: 'CLEAR', color: STYLE.accent[0], count: 40 });
            endGame(true);
          }
          return;
        }
        makeFigure(figIndex);
      }
    }
  }

  // ── 描画 ────────────────────────────────────────────────
  function drawBg() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.6, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    for (var i = 0; i < 40; i++) {
      var sx = (i * 263) % W;
      var sy = (i * 397) % H;
      var tw = 0.25 + 0.25 * Math.sin(t * 2 + i);
      game.draw.rect(sx, sy, 3, 3, '#9fb8ff', tw);
    }
    // 地平線の天文台(線画)
    var hy = H * 0.8;
    glowLine(0, hy, W, hy, '60,160,140', 3);
    glowLine(W * 0.72, hy, W * 0.72, hy - 90, '60,160,140', 3);
    glowLine(W * 0.86, hy, W * 0.86, hy - 90, '60,160,140', 3);
    glowLine(W * 0.72, hy - 90, W * 0.79, hy - 150, '60,160,140', 3);
    glowLine(W * 0.86, hy - 90, W * 0.79, hy - 150, '60,160,140', 3);
    game.draw.sprite(MOON, { m: '#ffe066' }, W * 0.14, H * 0.84, 12, { anchor: 'center', alpha: 0.7 + 0.2 * Math.sin(t) });
    game.draw.rect(0, 0, W, H, '#7dffd6', 0.02 + 0.02 * Math.sin(t * 1.6));
  }

  function drawStar(x, y, r, rgb, pulse) {
    var s = r * (1 + pulse);
    glowLine(x - s, y, x + s, y, rgb, 4);
    glowLine(x, y - s, x, y + s, rgb, 4);
    glowLine(x - s * 0.6, y - s * 0.6, x + s * 0.6, y + s * 0.6, rgb, 2);
    glowLine(x - s * 0.6, y + s * 0.6, x + s * 0.6, y - s * 0.6, rgb, 2);
  }

  function drawCard() {
    var t = game.time.elapsed;
    var c = CARD;
    var x0 = c.cx - c.w / 2, y0 = c.cy - c.h / 2;
    glowLine(x0, y0, x0 + c.w, y0, '255,224,102', 3);
    glowLine(x0 + c.w, y0, x0 + c.w, y0 + c.h, '255,224,102', 3);
    glowLine(x0 + c.w, y0 + c.h, x0, y0 + c.h, '255,224,102', 3);
    glowLine(x0, y0 + c.h, x0, y0, '255,224,102', 3);
    var n = fig.length;
    function P(k) { return { x: x0 + 30 + fig[k % n][0] * (c.w - 60), y: y0 + 25 + fig[k % n][1] * (c.h - 50) }; }
    for (var k = 0; k < n; k++) { var a = P(k), b = P(k + 1); game.draw.line(a.x, a.y, b.x, b.y, 'rgba(125,255,214,0.3)', 3); }
    // お手本のペンが始まりの星から順に描く(実演)
    var cyc = (t % 2.6) / 2.2;
    var prog = Math.min(1, cyc) * n;
    var whole = Math.floor(prog);
    for (var m = 0; m < whole; m++) { var a2 = P(m), b2 = P(m + 1); glowLine(a2.x, a2.y, b2.x, b2.y, '125,255,214', 3); }
    if (whole < n) {
      var a3 = P(whole), b3 = P(whole + 1), f = prog - whole;
      var px = a3.x + (b3.x - a3.x) * f, py = a3.y + (b3.y - a3.y) * f;
      glowLine(a3.x, a3.y, px, py, '125,255,214', 3);
      game.draw.circle(px, py, 7, STYLE.accent[0]);
    }
    var s0 = P(0);
    game.draw.circle(s0.x, s0.y, 12 + 4 * Math.sin(t * 8), STYLE.accent[0], 0.8);
  }

  function drawField() {
    var t = game.time.elapsed;
    // 結んだ糸
    for (var i = 1; i < seq.length; i++) {
      var a = verts[seq[i - 1]], b = verts[seq[i]];
      glowLine(a.x, a.y, b.x, b.y, celebrate > 0 ? '255,224,102' : '125,255,214', 6);
    }
    // 引いている途中の糸
    if (anchored && dragging && seq.length > 0 && celebrate <= 0) {
      var L = verts[seq[seq.length - 1]];
      game.draw.line(L.x, L.y, fx, fy, 'rgba(232,255,249,0.6)', 3);
    }
    for (var d = 0; d < decoys.length; d++) drawStar(decoys[d].x, decoys[d].y, 28, '160,190,255', 0.1 * Math.sin(t * 3 + d));
    for (var v = 0; v < verts.length; v++) {
      var linked = seq.indexOf(v) >= 0;
      var isStart = v === 0 && !anchored;
      var rgb = linked ? '125,255,214' : isStart ? '255,224,102' : '160,190,255';
      drawStar(verts[v].x, verts[v].y, isStart ? 38 : 28, rgb, (isStart ? 0.35 : 0.1) * Math.sin(t * (isStart ? 8 : 3) + v));
    }
    // 蜘蛛の職人は最後に結んだ星にいる
    var at = anchored ? verts[seq[seq.length - 1]] : { x: W * 0.5, y: H * 0.72 };
    var bob = Math.sin(t * 5) * 8;
    game.draw.sprite(WEAVER, { l: STYLE.main[0], e: STYLE.accent[1] }, at.x, at.y - 60 + bob, 9, { anchor: 'center' });
    if (freeze) {
      var k = 0.5 + 0.5 * Math.sin(freeze.t * 40);
      game.draw.circle(freeze.x, freeze.y, 60 + (0.35 - freeze.t) * 220, '#ffffff', 0.35 * k);
      drawStar(freeze.x, freeze.y, 44, '255,92,138', 0.3);
    }
  }

  function drawHud() {
    txt((figIndex < FIG_COUNT ? figIndex : FIG_COUNT) + ' / ' + FIG_COUNT, W * 0.16, H * 0.045, 54, STYLE.main[1]);
    txt('SCORE ' + score, W * 0.8, H * 0.045, 38, STYLE.main[1]);
    var bw = W - 160;
    var low = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.line(80, H * 0.08, 80 + bw, H * 0.08, 'rgba(125,255,214,0.25)', 14);
    glowLine(80, H * 0.08, 80 + bw * Math.max(0, timeLeft / TIME_LIMIT), H * 0.08, low ? '255,92,138' : '255,224,102', 8);
    for (var i = 0; i < MAX_MISS; i++) {
      var mx = W * 0.5 - 60 + i * 60, my = H * 0.045;
      if (i < misses) { glowLine(mx - 16, my - 16, mx + 16, my + 16, '255,92,138', 5); glowLine(mx - 16, my + 16, mx + 16, my - 16, '255,92,138', 5); }
      else game.draw.circle(mx, my, 10, STYLE.main[2]);
    }
  }

  function drawOutcome() {
    game.draw.rect(0, H * 0.34, W, H * 0.24, '#000510', 0.75);
    txt(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.4, 96, won ? STYLE.accent[0] : STYLE.accent[1]);
    txt('SCORE ' + score, W * 0.5, H * 0.46, 50, STYLE.main[1]);
    if (!won) txt('あと' + (FIG_COUNT - figIndex) + '枚!', W * 0.5, H * 0.52, 46, STYLE.main[0]);
    else if (score > game.best) txt('NEW RECORD', W * 0.5, H * 0.52, 46, STYLE.main[0]);
    else txt('BEST ' + game.best, W * 0.5, H * 0.52, 42, STYLE.main[1]);
  }

  // ── ATTRACT ゴースト実演 ───────────────────────────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.8, press: false, lift: 0, round: 0, detoured: false };
  function stepDemo(dt) {
    demo.t += dt;
    if (demo.t <= dt || !verts) { initGame(); ready = 0; demo.detoured = false; }
    if (figIndex >= 2 || misses >= 2) { initGame(); ready = 0; demo.round++; demo.detoured = false; }
    if (freeze || celebrate > 0) { if (freeze) demo.detoured = true; demo.press = false; dragging = false; return; }
    if (demo.lift > 0) { demo.lift -= dt; demo.press = false; return; }
    var target;
    if (!anchored) target = verts[0];
    else {
      var exp = expectedList();
      target = verts[exp[0]];
      // 2本目の糸で一度だけ形にない星へ寄り道して、ミスの因果を見せる
      if (seq.length === 2 && !demo.detoured && demo.round % 2 === 0 && decoys.length) {
        var best = decoys[0], bd = 1e9;
        for (var i = 0; i < decoys.length; i++) {
          var dd = Math.hypot(decoys[i].x - demo.gx, decoys[i].y - demo.gy);
          if (dd < bd) { bd = dd; best = decoys[i]; }
        }
        target = best;
        if (bd < HIT_R - 10) demo.detoured = true;
      }
    }
    var dx = target.x - demo.gx, dy = target.y - demo.gy, dist = Math.hypot(dx, dy);
    var sp = 1300 * dt;
    if (dist > sp) { demo.gx += dx / dist * sp; demo.gy += dy / dist * sp; }
    else { demo.gx = target.x; demo.gy = target.y; }
    if (!demo.press) {
      if (!anchored && dist > 40) { return; }
      demo.press = true;
      pointerDown(demo.gx, demo.gy, true);
    } else {
      pointerMove(demo.gx, demo.gy, true);
    }
    if (!dragging) { demo.press = false; demo.lift = 0.3; }
  }

  function playerPointer(x, y, down) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    if (down) pointerDown(x, y, false);
    else pointerMove(x, y, false);
  }

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready <= 0 && !ended && !anchored) game.fx.burst(verts[0].x, verts[0].y, { color: STYLE.accent[0], count: 6, speed: 160 });
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || ready > 0 || ended) return;
    game.fx.burst(x, y, { color: STYLE.main[1], count: 3, speed: 90 });
    playerPointer(x, y, true);
  });
  game.onMove(function (x, y) {
    if (state !== S.PLAYING || !dragging) return;
    // 糸を引く指先に細かな火花(なぞっている手応え)
    if (Math.random() < 0.15) game.fx.burst(x, y, { color: STYLE.main[0], count: 1, speed: 60 });
    playerPointer(x, y, false);
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (dragging && anchored && !ended) game.audio.play('se_tap', 0.06);
    dragging = false;
  });

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepWorld(dt, true);
      drawBg();
      drawCard();
      drawField();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W * 0.5, H * 0.05, 84, STYLE.main[0]);
      txt('HI-SCORE ' + game.best, W * 0.5, H * 0.095, 38, STYLE.main[1]);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W * 0.5, H * 0.92, 46, STYLE.accent[0]);
      else txt('INSERT COIN', W * 0.5, H * 0.92, 40, STYLE.main[1]);
      return;
    }
    if (state === S.RESULT) {
      drawBg();
      drawField();
      drawOutcome();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W * 0.5, H * 0.92, 40, STYLE.main[1]);
      return;
    }
    if (ended) {
      endWait -= dt;
      drawBg();
      drawCard();
      drawField();
      drawHud();
      drawOutcome();
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { figures: Math.min(figIndex, FIG_COUNT), links: links, misses: misses };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      if (!freeze && celebrate <= 0) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          var at = anchored ? verts[seq[seq.length - 1]] : verts[0];
          freeze = { t: 0.4, x: at.x, y: at.y, done: function () {
            game.feedback.bad(at.x, at.y, { text: 'TIME UP' });
            endGame(false);
          } };
        }
      }
      stepWorld(dt, false);
    }
    drawBg();
    drawCard();
    drawField();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.74, 100, STYLE.accent[0]);
  });

  game.onStart(function () {
    game.audio.melody(
      [['E5', 1], ['B4', 0.5], ['C5', 0.5], ['D5', 1], ['G4', 1], ['A4', 1], ['E5', 1], ['D5', 2]],
      { tempo: 96, wave: 'sine', volume: 0.06, loop: true, bass: [['E3', 4], ['C3', 4]] }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
