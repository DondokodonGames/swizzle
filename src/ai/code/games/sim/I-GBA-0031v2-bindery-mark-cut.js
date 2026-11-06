// I-GBA-0031v2-bindery-mark-cut.js
// 断裁台の一太刀 — 紙束に引かれた目印線を、端の目盛りから端の目盛りまで一息の素早い線でなぞって裁ち落とす
// 操作: 目印線の両端に光る目盛りがある。片方の目盛りの外から反対の目盛りの外まで、線の上を素早く一直線になぞる。遅い・途中で止まる・線から外れると紙が毛羽立って失敗
// 終わり: 14秒以内に5束を裁てばCLEAR。3回しくじる/時間切れでGAME OVER。押さえ板が上がる前(予告点滅)に裁たないと束は流れていく。後の束ほど線が斜めで許容幅が狭く、最後は束が左右に揺れる
// @mechanic: slice
// @theme: bindery_guillotine_mark_cut
// 世界観: 製本工房の断裁台で、製本職人が押さえ板で留められた紙束の目印線を、押さえ板が上がる前に裁ち包丁の一太刀でまっすぐ裁ち落としていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 裁った束の数・PERFECT数・最大のずれ量・スコア
// スタイル: 70s MONO

(function (game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドットのラスター画。色は画面帯ごとに貼ったセロハン(上=橙、台=緑、手元=青)だけ
  var STYLE = { bg: ['#000000', '#0b0c0a'], main: ['#f2f2ea', '#9a9a92', '#4a4a46'], accent: ['#ff9a3a', '#7dff7a'] };
  var WHITE = STYLE.main[0], GREY = STYLE.main[1], DIM = STYLE.main[2];
  var ORANGE = STYLE.accent[0], GREEN = STYLE.accent[1], BLUE = '#5ab4ff';

  var LOGO = 'BINDERY CUT';
  var NEEDED = 5;
  var MISS_MAX = 3;
  var TIME_LIMIT = 14;
  var SLOW_LIMIT = 0.5;

  var CX = W * 0.5, CY = H * 0.47;
  var STACK_W = 720, STACK_H = 540;
  // 束ごとの線: 角度(度)・中心からのずれ・許容幅・押さえ時間・揺れ
  var PLAN = [
    { ang: 0, off: -40, tol: 62, hold: 2.6, sway: 0 },
    { ang: 90, off: 80, tol: 56, hold: 2.4, sway: 0 },
    { ang: 14, off: 30, tol: 50, hold: 2.2, sway: 0 },
    { ang: -28, off: -50, tol: 46, hold: 2.0, sway: 0 },
    { ang: 42, off: 0, tol: 42, hold: 1.9, sway: 0 },
    { ang: -8, off: 60, tol: 40, hold: 1.9, sway: 70 },
    { ang: 64, off: -30, tol: 38, hold: 1.8, sway: 80 },
  ];

  var MODE = { ATTRACT: 'attract', PLAYING: 'play', RESULT: 'result' };
  var mode = MODE.ATTRACT;

  // ── スプライト(白1色) ──
  var SMITH = [
    ['...####...', '..######..', '..#.##.#..', '..######..', '...#..#...', '.########.', '##########', '#.######.#', '#.######.#', '..##..##..', '..##..##..', '.###..###.'],
    ['...####...', '..######..', '..#.##.#..', '..######..', '...#..#...', '.#########', '#########.', '..######..', '..######..', '..##..##..', '..##..##..', '.###..###.'],
    ['...####...', '..######..', '..##..##..', '..######..', '...####...', '#.######.#', '##########', '..######..', '..######..', '..##..##..', '..##..##..', '.###..###.'],
  ];
  var KNIFE = ['......####', '..########', '##########', '..........'];

  // ── 束と線のモデル ──
  function makeStack(i) {
    var p = PLAN[Math.min(PLAN.length - 1, i)];
    return { i: i, p: p, slide: 0.35, hold: p.hold, state: 'wait', t: 0, cut: null, dev: 0, warned: false };
  }
  function stackX(s) { return CX + (s.slide > 0 ? s.slide / 0.35 * W : 0) + (s.p.sway ? Math.sin(s.t * 1.7) * s.p.sway : 0); }
  // 目印線: 束の矩形で切り、両端に余白を足した A-B
  function markLine(s) {
    var cx = stackX(s), a = s.p.ang * Math.PI / 180;
    var ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    var ox = cx + nx * s.p.off, oy = CY + ny * s.p.off;
    var tmin = -1e9, tmax = 1e9;
    var bx = [cx - STACK_W / 2, cx + STACK_W / 2], by = [CY - STACK_H / 2, CY + STACK_H / 2];
    if (Math.abs(ux) > 1e-4) { var t1 = (bx[0] - ox) / ux, t2 = (bx[1] - ox) / ux; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2)); }
    if (Math.abs(uy) > 1e-4) { var t3 = (by[0] - oy) / uy, t4 = (by[1] - oy) / uy; tmin = Math.max(tmin, Math.min(t3, t4)); tmax = Math.min(tmax, Math.max(t3, t4)); }
    var m = 46;
    return { ax: ox + ux * (tmin - m), ay: oy + uy * (tmin - m), bx: ox + ux * (tmax + m), by: oy + uy * (tmax + m),
      px: ox + ux * tmin, py: oy + uy * tmin, qx: ox + ux * tmax, qy: oy + uy * tmax, ux: ux, uy: uy, nx: nx, ny: ny };
  }
  // 一太刀の判定: pts=[{x,y,t}]。戻り値 {kind:'perfect'|'good'|'short'|'slow'|'off', dev, at}
  function judgeStroke(s, pts) {
    var L = markLine(s);
    var len = Math.sqrt((L.bx - L.ax) * (L.bx - L.ax) + (L.by - L.ay) * (L.by - L.ay));
    var smin = 9, smax = -9, dev = 0, tIn = -1, tOut = -1, worst = null;
    var curX = stackX(s);
    for (var i = 0; i < pts.length; i++) {
      var shift = pts[i].sx !== undefined ? curX - pts[i].sx : 0;
      var dx = pts[i].x + shift - L.ax, dy = pts[i].y - L.ay;
      var sp = (dx * L.ux + dy * L.uy) / len, e = dx * L.nx + dy * L.ny;
      smin = Math.min(smin, sp); smax = Math.max(smax, sp);
      if (sp >= 0 && sp <= 1) {
        if (tIn < 0) tIn = pts[i].t;
        tOut = pts[i].t;
        if (Math.abs(e) > dev) { dev = Math.abs(e); worst = pts[i]; }
      }
    }
    var mid = { x: (L.ax + L.bx) / 2, y: (L.ay + L.by) / 2 };
    if (smin > 0.06 || smax < 0.94) return { kind: 'short', dev: dev, at: worst || mid };
    if (tOut - tIn > SLOW_LIMIT) return { kind: 'slow', dev: dev, at: worst || mid };
    if (dev > s.p.tol) return { kind: 'off', dev: dev, at: worst || mid };
    return { kind: dev < s.p.tol * 0.4 ? 'perfect' : 'good', dev: dev, at: mid };
  }

  // ── 状態 ──
  var stack, cut, misses, perfects, maxDev, combo, timeLeft, countIn, stop, over, won, endT, score, prevBest, stroke, trail, celebT, beepT;

  function initGame() {
    stack = makeStack(0); cut = 0; misses = 0; perfects = 0; maxDev = 0; combo = 0;
    timeLeft = TIME_LIMIT; countIn = 0.8; stop = null; over = false; won = false; endT = 0;
    score = 0; prevBest = game.best || 0; stroke = null; trail = []; celebT = 0; beepT = 0;
  }

  function ink(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col || WHITE, bold: true, align: 'center', font: 'monospace' });
  }

  // ── 描画 ──
  function drawShop() {
    game.draw.gradient(0, H, [[0, STYLE.bg[1]], [0.5, '#050605'], [1, STYLE.bg[0]]]);
    for (var y = 240; y < H * 0.2 + 60; y += 12) game.draw.rect(0, y, W, 2, WHITE, 0.05);
    // 奥の棚の背表紙
    for (var b = 0; b < 22; b++) game.draw.rect(40 + b * 46, 250 + (b % 3) * 6, 34, 90 - (b % 3) * 6, WHITE, 0.18 + (b % 4) * 0.05);
    // 断裁台(ラスター)
    game.draw.rect(W * 0.04, H * 0.27, W * 0.92, H * 0.42, WHITE, 0.06);
    for (var ly = H * 0.27; ly < H * 0.69; ly += 10) game.draw.rect(W * 0.04, ly, W * 0.92, 2, WHITE, 0.05);
    game.draw.rect(W * 0.04, H * 0.69, W * 0.92, 14, WHITE, 0.6);
    // 物差し
    for (var r = 0; r < 30; r++) game.draw.rect(W * 0.06 + r * 32, H * 0.69 - (r % 5 === 0 ? 26 : 14), 3, r % 5 === 0 ? 26 : 14, WHITE, 0.7);
  }

  function drawStack(s, hl, k) {
    if (!s) return;
    var cx = stackX(s);
    var x0 = cx - STACK_W / 2, y0 = CY - STACK_H / 2;
    if (s.state === 'cut' && s.cut) {
      // 裁ち落とされた2片が線と直角に離れていく
      var L = s.cut.L, sep = Math.min(1, s.t / 0.4) * 50;
      drawHalf(x0, y0, L, 1, sep, s.t);
      drawHalf(x0, y0, L, -1, sep, s.t);
      game.draw.line(L.px, L.py, L.qx, L.qy, WHITE, 4);
      return;
    }
    // 紙の層(白い横線の重なり)
    game.draw.rect(x0 + 14, y0 + 16, STACK_W, STACK_H, WHITE, 0.15);
    game.draw.rect(x0, y0, STACK_W, STACK_H, WHITE, 0.82);
    for (var yy = y0 + 8; yy < y0 + STACK_H; yy += 16) game.draw.rect(x0, yy, STACK_W, 2, DIM, 0.35);
    for (var e = 0; e < 4; e++) game.draw.rect(x0 + STACK_W + e * 3, y0 + 6 + e * 3, 3, STACK_H, GREY, 0.8);
    // 押さえ板と残り時間(縮むバー)
    var frac = Math.max(0, s.hold / s.p.hold);
    var warn = s.state === 'wait' && s.hold < 0.65 && s.slide <= 0;
    var blink = warn && Math.floor(game.time.elapsed * 12) % 2 === 0;
    game.draw.rect(x0 - 30, y0 - 50, STACK_W + 60, 40, blink ? WHITE : GREY, blink ? 1 : 0.85);
    game.draw.rect(x0 - 20, y0 - 40, (STACK_W + 40) * frac, 20, '#000000', 0.85);
    if (warn) {
      for (var z = 0; z < 6; z++) {
        var zx = x0 + z * (STACK_W / 5);
        game.draw.line(zx - 16, y0 - 64, zx, y0 - 84, WHITE, 5);
        game.draw.line(zx, y0 - 84, zx + 16, y0 - 64, WHITE, 5);
      }
    }
    if (s.slide > 0) return;
    // 目印線と両端の目盛り
    var L2 = markLine(s);
    var segs = 18;
    for (var i = 0; i < segs; i += 2) {
      var a0 = i / segs, a1 = (i + 1) / segs;
      game.draw.line(L2.px + (L2.qx - L2.px) * a0, L2.py + (L2.qy - L2.py) * a0, L2.px + (L2.qx - L2.px) * a1, L2.py + (L2.qy - L2.py) * a1, '#000000', 8);
    }
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 9);
    game.draw.circle(L2.ax, L2.ay, 18 + pulse * 8, WHITE, 0.9);
    game.draw.circle(L2.bx, L2.by, 18 + pulse * 8, WHITE, 0.9);
    game.draw.circle(L2.ax, L2.ay, 34 + pulse * 12, WHITE, 0.2);
    game.draw.circle(L2.bx, L2.by, 34 + pulse * 12, WHITE, 0.2);
    // 許容幅(うっすら)
    game.draw.line(L2.px + L2.nx * s.p.tol, L2.py + L2.ny * s.p.tol, L2.qx + L2.nx * s.p.tol, L2.qy + L2.ny * s.p.tol, DIM, 2);
    game.draw.line(L2.px - L2.nx * s.p.tol, L2.py - L2.ny * s.p.tol, L2.qx - L2.nx * s.p.tol, L2.qy - L2.ny * s.p.tol, DIM, 2);
    if (s.state === 'ragged' && s.cut) {
      var pts = s.cut.pts;
      for (var j = 1; j < pts.length; j++) game.draw.line(pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y, '#000000', 10);
      for (var q = 0; q < 8; q++) {
        var at = s.cut.at, ang = q * 0.8;
        game.draw.line(at.x, at.y, at.x + Math.cos(ang) * 40, at.y + Math.sin(ang) * 40, '#000000', 4);
      }
    }
    if (hl) game.draw.circle(hl.x, hl.y, 50 + k * 110, WHITE, 0.6 * (1 - k) + 0.2);
  }

  function drawHalf(x0, y0, L, side, sep, t) {
    // 線のどちら側かで市松の点を描き分け、離れながら薄くなる
    var a = Math.max(0, 1 - t / 0.9);
    for (var gy = 0; gy < STACK_H; gy += 24) {
      for (var gx = 0; gx < STACK_W; gx += 24) {
        var px = x0 + gx + 12, py = y0 + gy + 12;
        var e = (px - L.px) * L.nx + (py - L.py) * L.ny;
        if ((e >= 0 ? 1 : -1) !== side) continue;
        game.draw.rect(px - 11 + L.nx * sep * side, py - 11 + L.ny * sep * side, 22, 22, WHITE, 0.8 * a);
      }
    }
  }

  function drawTrail(pts, now) {
    for (var i = 1; i < pts.length; i++) {
      var age = now - pts[i].t;
      if (age > 0.3) continue;
      game.draw.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, WHITE, 14 * (1 - age / 0.3) + 2);
    }
    if (pts.length) {
      var last = pts[pts.length - 1];
      if (now - last.t < 0.3) game.draw.sprite(KNIFE, { '#': WHITE }, last.x + 40, last.y - 30, 9, { anchor: 'center' });
    }
  }

  function drawSmith(mood) {
    var fr = mood === 'shock' ? 2 : (mood === 'cut' ? 1 : 0);
    var hop = mood === 'joy' ? -Math.abs(Math.sin(game.time.elapsed * 9)) * 40 : 0;
    var sag = mood === 'sad' ? 22 : 0;
    var bob = Math.sin(game.time.elapsed * 2.5) * 4;
    game.draw.sprite(SMITH[fr], { '#': WHITE }, W * 0.2, H * 0.83 + bob + hop + sag, 16, { anchor: 'center' });
    // 次に来る束の山
    for (var i = 0; i < 4; i++) game.draw.rect(W * 0.56 + i * 8, H * 0.86 - i * 26, 340, 22, WHITE, 0.5 - i * 0.08);
  }

  function drawBands() {
    game.draw.rect(0, 0, W, 236, ORANGE, 0.2);
    game.draw.rect(0, H * 0.27, W, H * 0.43, GREEN, 0.12);
    game.draw.rect(0, H * 0.74, W, H * 0.26, BLUE, 0.13);
  }

  function drawHud() {
    ink(cut + ' / ' + NEEDED, W * 0.2, 86, 54, WHITE);
    ink(String(score), CX, 86, 42, WHITE);
    for (var i = 0; i < MISS_MAX; i++) {
      var x = W * 0.74 + i * 72;
      game.draw.rect(x - 22, 66, 44, 40, WHITE, i < misses ? 0.25 : 0.9);
      if (i < misses) { game.draw.line(x - 22, 66, x + 22, 106, WHITE, 5); game.draw.line(x + 22, 66, x - 22, 106, WHITE, 5); }
    }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 172, W - 120, 22, WHITE, 0.15);
    game.draw.rect(60, 172, (W - 120) * fr, 22, low ? '#000000' : WHITE);
    if (combo >= 2) ink('x' + combo, W * 0.5, 140, 30, WHITE);
  }

  // ── 進行 ──
  function haltThen(at, after) { stop = { t: 0.42, max: 0.42, at: at, after: after }; }

  function takeMiss(at, label) {
    combo = 0;
    game.audio.play('se_break', 0.4);
    haltThen(at, function () {
      misses++;
      game.feedback.bad(at.x, at.y, { text: label, shake: 12 });
      if (misses >= MISS_MAX) { won = false; wrapUp(); return; }
      stack.state = 'gone'; stack.t = 0;
    });
  }

  function resolveStroke(pts) {
    if (!stack || stack.state !== 'wait' || stack.slide > 0) return;
    var r = judgeStroke(stack, pts);
    maxDev = Math.max(maxDev, Math.round(r.dev));
    if (r.kind === 'perfect' || r.kind === 'good') {
      cut++; combo++;
      if (r.kind === 'perfect') perfects++;
      score += (r.kind === 'perfect' ? 150 : 100) + combo * 20;
      stack.state = 'cut'; stack.t = 0; stack.cut = { L: markLine(stack), pts: pts };
      game.audio.play('se_jump', 0.25);
      game.feedback.good(r.at.x, r.at.y, { text: r.kind === 'perfect' ? 'PERFECT' : 'GOOD', color: WHITE, count: 16 });
      if (cut === 3) { game.fx.popup('3 / ' + NEEDED, CX, H * 0.22, { color: WHITE, size: 64 }); game.audio.play('se_milestone', 0.4); }
      if (cut >= NEEDED) { won = true; wrapUp(); }
    } else {
      stack.state = 'ragged'; stack.cut = { pts: pts, at: r.at };
      takeMiss(r.at, 'MISS');
    }
  }

  game.onPress(function (x, y) {
    if (mode === MODE.ATTRACT) { game.audio.play('se_coin', 0.45); mode = MODE.PLAYING; initGame(); return; }
    if (mode === MODE.RESULT) { game.audio.play('se_tap', 0.2); mode = MODE.ATTRACT; initGame(); demo.t = 0; return; }
    if (countIn > 0 || stop || over) { game.audio.tone('C3', 0.04, { wave: 'square', volume: 0.05 }); return; }
    stroke = [{ x: x, y: y, t: game.time.elapsed, sx: stackX(stack) }];
    trail = stroke;
    game.audio.tone('A5', 0.03, { wave: 'square', volume: 0.06 });
  });
  game.onMove(function (x, y) {
    if (mode !== MODE.PLAYING || !stroke) return;
    var last = stroke[stroke.length - 1];
    var d = Math.abs(x - last.x) + Math.abs(y - last.y);
    stroke.push({ x: x, y: y, t: game.time.elapsed, sx: stackX(stack) });
    if (d > 60) game.audio.tone(600 + Math.min(900, d * 4), 0.02, { wave: 'square', volume: 0.04 });
  });
  game.onRelease(function (x, y) {
    if (mode !== MODE.PLAYING || !stroke) return;
    var pts = stroke; stroke = null;
    if (pts.length < 3) { game.audio.play('se_tap', 0.1); return; }
    if (!over && !stop && countIn <= 0) resolveStroke(pts);
  });

  function wrapUp() {
    if (over) return;
    over = true; endT = 1.4; stroke = null;
    if (won) score += Math.floor(timeLeft * 20) + (MISS_MAX - misses) * 50;
    game.audio.stopBgm();
    game.audio.play(won ? 'se_success' : 'se_failure', 0.55);
    if (won) game.fx.flash(WHITE, 0.3);
  }

  function enterResult() {
    mode = MODE.RESULT;
    var stats = { cut: cut, misses: misses, perfect: perfects, maxDev: maxDev, timeLeft: Math.round(timeLeft * 10) / 10 };
    if (won) game.end.success(score, stats);
    else game.end.failure(stats);
  }

  function tickStack(s, dt) {
    s.t += dt;
    if (s.slide > 0) { s.slide = Math.max(0, s.slide - dt); if (s.slide === 0) return 'clamp'; return ''; }
    if (s.state === 'wait') {
      s.hold -= dt;
      if (s.hold < 0.65 && !s.warned) { s.warned = true; return 'warn'; }
      if (s.hold <= 0) return 'expire';
    }
    if ((s.state === 'cut' && s.t > 0.55) || s.state === 'gone') return 'next';
    return '';
  }

  // ── ATTRACT: 素早い一太刀で裁ち、次の束はのろのろ曲がってしくじる ──
  var demo = { t: 0, s: null, pts: [], hx: CX, hy: H * 0.8, press: false, hl: null, k: 0, stage: 0 };
  var DEMO_CYCLE = 3.8;
  function demoPath(s, u, wobble) {
    var L = markLine(s);
    var x = L.ax - L.ux * 40 + (L.bx - L.ax + L.ux * 80) * u, y = L.ay - L.uy * 40 + (L.by - L.ay + L.uy * 80) * u;
    var w = wobble ? Math.sin(u * 9) * 90 : 0;
    return { x: x + L.nx * w, y: y + L.ny * w };
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt || !demo.s) { demo.s = makeStack(2); demo.stage = 0; demo.pts = []; demo.hl = null; }
    var s = demo.s;
    tickStack(s, dt);
    s.hold = s.p.hold;
    demo.press = false;
    if (demo.stage === 0 && cyc > 0.55) {
      var u = Math.min(1, (cyc - 0.55) / 0.22);
      var p = demoPath(s, u, false);
      demo.pts.push({ x: p.x, y: p.y, t: game.time.elapsed });
      demo.hx = p.x; demo.hy = p.y; demo.press = true;
      if (u >= 1) {
        var r = judgeStroke(s, demo.pts);
        s.state = 'cut'; s.t = 0; s.cut = { L: markLine(s), pts: demo.pts };
        game.feedback.good(r.at.x, r.at.y, { text: 'PERFECT', color: WHITE, count: 10, volume: 0.2 });
        demo.stage = 1;
      }
    } else if (demo.stage === 1 && cyc > 1.4) {
      demo.s = makeStack(3); demo.pts = []; demo.stage = 2;
    } else if (demo.stage === 2 && cyc > 2.0) {
      var u2 = Math.min(1, (cyc - 2.0) / 0.8);
      var p2 = demoPath(demo.s, u2, true);
      demo.pts.push({ x: p2.x, y: p2.y, t: game.time.elapsed });
      demo.hx = p2.x; demo.hy = p2.y; demo.press = true;
      if (u2 >= 1) {
        var r2 = judgeStroke(demo.s, demo.pts);
        demo.s.state = 'ragged'; demo.s.cut = { pts: demo.pts, at: r2.at };
        demo.hl = r2.at; demo.k = 0; demo.stage = 3;
        game.feedback.bad(r2.at.x, r2.at.y, { text: 'MISS', volume: 0.15, shake: 4 });
      }
    } else if (demo.stage === 3) {
      demo.k = Math.min(1, demo.k + dt * 2.4);
      demo.hy += (H * 0.8 - demo.hy) * Math.min(1, dt * 4);
    } else if (demo.stage === 1) {
      demo.hy += (H * 0.8 - demo.hy) * Math.min(1, dt * 4);
    }
  }

  game.onUpdate(function (dt) {
    if (mode === MODE.ATTRACT) {
      stepDemo(dt);
      drawShop();
      drawStack(demo.s, demo.hl, demo.k);
      drawTrail(demo.pts, game.time.elapsed);
      drawSmith(demo.stage === 3 ? 'shock' : (demo.press ? 'cut' : ''));
      drawBands();
      game.draw.hand(demo.hx, demo.hy, { press: demo.press, scale: 15 });
      ink(LOGO, CX, H * 0.06, 70, WHITE);
      ink('BEST ' + (game.best > 0 ? game.best : '-'), CX, H * 0.105, 36, WHITE);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('► 100円 投入 ◄', CX, H * 0.95, 46, WHITE);
      else ink('INSERT COIN', CX, H * 0.95, 40, GREY);
      return;
    }

    if (mode === MODE.RESULT) {
      drawShop();
      drawSmith(won ? 'joy' : 'sad');
      drawBands();
      ink(won ? 'CLEAR' : 'GAME OVER', CX, H * 0.36, 100, WHITE);
      ink(cut + ' / ' + NEEDED, CX, H * 0.43, 60, WHITE);
      ink('SCORE ' + score, CX, H * 0.5, 50, WHITE);
      if (won && score > prevBest) ink('NEW RECORD', CX, H * 0.56, 52, WHITE);
      else ink('BEST ' + Math.max(prevBest, score), CX, H * 0.56, 40, GREY);
      if (!won) ink('あと' + (NEEDED - cut) + '束!', CX, H * 0.62, 56, WHITE);
      ink('PERFECT ' + perfects, CX, H * 0.67, 40, GREY);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) ink('TAP TO CONTINUE', CX, H * 0.95, 40, WHITE);
      return;
    }

    // ── PLAYING ──
    var k = 0;
    if (over) {
      endT -= dt;
      if (stack) stack.t += dt;
      if (won) {
        celebT -= dt;
        if (celebT <= 0) { celebT = 0.15; game.fx.burst(game.random(W * 0.1, W * 0.9), game.random(H * 0.3, H * 0.65), { color: WHITE, count: 14, speed: 440 }); }
      }
      if (endT <= 0) { enterResult(); return; }
    } else if (stop) {
      stop.t -= dt;
      k = 1 - stop.t / stop.max;
      if (stop.t <= 0) { var fn = stop.after; stop = null; fn(); }
    } else if (countIn > 0) {
      countIn -= dt;
      if (countIn <= 0) game.audio.tone('E5', 0.12, { wave: 'square', volume: 0.1 });
    } else {
      timeLeft -= dt;
      var ev = tickStack(stack, dt);
      if (ev === 'clamp') game.audio.play('se_tap', 0.3);
      else if (ev === 'warn') { beepT = 0; }
      else if (ev === 'expire') {
        stack.state = 'ragged'; stack.cut = null; stroke = null;
        var L = markLine(stack);
        takeMiss({ x: (L.px + L.qx) / 2, y: (L.py + L.qy) / 2 }, 'MISS');
      } else if (ev === 'next') {
        stack = makeStack(stack.i + 1);
      }
      if (stack.warned && stack.state === 'wait') {
        beepT -= dt;
        if (beepT <= 0) { beepT = 0.16; game.audio.tone('B4', 0.05, { wave: 'square', volume: 0.07 }); }
      }
      if (!over && !stop && timeLeft <= 0) {
        timeLeft = 0; stroke = null;
        var L3 = markLine(stack);
        haltThen({ x: (L3.px + L3.qx) / 2, y: (L3.py + L3.qy) / 2 }, function () {
          game.feedback.bad(CX, CY, { text: 'TIME UP' }); won = false; wrapUp();
        });
      }
    }

    drawShop();
    drawStack(stack, stop ? stop.at : null, k);
    drawTrail(trail, game.time.elapsed);
    drawSmith(stop ? 'shock' : (over ? (won ? 'joy' : 'sad') : (stroke ? 'cut' : '')));
    drawBands();
    drawHud();
    if (countIn > 0) ink(countIn > 0.35 ? 'READY?' : 'GO!', CX, CY, 110, WHITE);
  });

  game.onStart(function () {
    game.audio.melody([['A3', 0.5], ['R', 0.5], ['A3', 0.5], ['C4', 0.5], ['E4', 1], ['R', 1], ['D4', 0.5], ['R', 0.5], ['C4', 0.5], ['B3', 0.5], ['A3', 1], ['R', 1]],
      { tempo: 120, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['A2', 2], ['F2', 2], ['E2', 2]] });
    mode = MODE.ATTRACT;
    initGame();
  });
})(game);
