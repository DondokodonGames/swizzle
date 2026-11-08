// I-DS-0015v3-newhouse-fence-enclose.js
// 板塀の囲い塗り — 塗る区画の角の釘から角の釘へ指で線を結び、ぐるりと囲めた区画を塗りつぶしていく
// 操作: 釘から釘へ指をすべらせて離すと養生の線が張られる。点線の区画の縁に沿った線だけが張れる。縁を一周囲うと塗られる(社内メモ)
// 終わり: 3枚の板塀(四角→L字→コの字)を時間内に塗り切れば成功。縁から外れた線は時間を削る。時間切れで失敗
// @mechanic: connect
// @theme: newhouse_fence_enclose_paint
// 世界観: 新築の家の庭で、塗装職人が板塀に打った釘を角から角へ養生の線で結んで区画を囲い、囲った分だけ順に塗り分けていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 塗った区画数・張った線の本数・外れ線の数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数(8色ベタ)、細い線、テキスト枠のUI、市松ディザで中間色
  var STYLE = { bg: ['#000022', '#000000', '#0000aa'], main: ['#aa5500', '#ffff55', '#55ffff'], accent: ['#ff55ff', '#ffffff'] };
  var P8 = {
    navy: STYLE.bg[0], black: STYLE.bg[1], blue: STYLE.bg[2],
    brown: STYLE.main[0], yellow: STYLE.main[1], cyan: STYLE.main[2], magenta: STYLE.accent[0], white: STYLE.accent[1],
    green: '#55ff55', red: '#ff5555', gray: '#aaaaaa', dark: '#555555',
  };
  var PAINT = [P8.cyan, P8.green, P8.magenta];

  var GAME_TITLE = 'FENCE PAINT';
  var TIME_LIMIT = 22;
  var GCOLS = 8, GROWS = 7, GAP = 120;
  var GX = (W - (GCOLS - 1) * GAP) / 2, GY = H * 0.215;
  var SNAP = 58;
  var PENALTY = 1;
  var SHAPES = [
    [[1, 1], [5, 1], [5, 4], [1, 4]],
    [[1, 1], [3, 1], [3, 3], [6, 3], [6, 5], [1, 5]],
    [[0, 1], [2, 1], [2, 4], [5, 4], [5, 1], [7, 1], [7, 6], [0, 6]],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var shapeIx, units, unitTotal, covered, lines, drag, fillT, inside, panelsDone, strokes, offs, score, timeLeft;
  var opening, wrapped, good, held, resultT, posted, spark, mood, halfPop, slideT, buzz;

  var PAINTER_A = ['..cccc..', '.cccccc.', 'cccccccc', '.ffffff.', '.fefeff.', '..ffff..', '.wwwwww.', 'wwwwwwww', 'w.wwww.w', '..ww.ww.', '..kk.kk.'];
  var PAINTER_B = ['..cccc..', '.cccccc.', 'cccccccc', '.ffffff.', '.ffffff.', '..ffff..', '.wwwwww.', 'wwwwwwww', 'w.wwww.w', '.ww...ww', '.kk...kk'];
  var PAINTER_YAY = ['w.cccc.w', 'wcccccw.', 'cccccccc', '.ffffff.', '.fefeff.', '..fmmf..', '..wwww..', '.wwwwww.', '..wwww..', '.ww...ww', '.kk...kk'];
  var PAINTER_PAL = { c: '#ffff55', f: '#ffaa55', e: '#000000', m: '#ff5555', w: '#ffffff', k: '#555555' };
  var CAN = ['.hhhh.', 'h....h', 'pppppp', 'pwwwwp', 'pwwwwp', 'pppppp'];
  var ROLLER = ['rrrrrr', 'rrrrrr', '..h...', '..h...', '..h...'];

  function frameText(str, x, y, sz, col) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: P8.blue, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }

  function nail(c, r) { return { x: GX + c * GAP, y: GY + r * GAP }; }
  function key(c, r, horiz) { return (horiz ? 'h' : 'v') + c + '_' + r; }

  // 区画の縁を1マス単位の線分に分解
  function loadShape(ix) {
    shapeIx = ix;
    var pts = SHAPES[ix];
    units = {}; unitTotal = 0; covered = 0; lines = [];
    for (var i = 0; i < pts.length; i++) {
      var a = pts[i], b = pts[(i + 1) % pts.length];
      if (a[1] === b[1]) {
        for (var c = Math.min(a[0], b[0]); c < Math.max(a[0], b[0]); c++) { units[key(c, a[1], true)] = false; unitTotal++; }
      } else {
        for (var r = Math.min(a[1], b[1]); r < Math.max(a[1], b[1]); r++) { units[key(a[0], r, false)] = false; unitTotal++; }
      }
    }
    inside = [];
    for (var cy = 0; cy < GROWS - 1; cy++) for (var cx = 0; cx < GCOLS - 1; cx++) {
      if (pointIn(cx + 0.5, cy + 0.5, pts)) inside.push({ c: cx, r: cy });
    }
    fillT = -1; drag = null; slideT = 0.5;
  }

  function pointIn(x, y, pts) {
    var inside2 = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside2 = !inside2;
    }
    return inside2;
  }

  function initGame() {
    panelsDone = 0; strokes = 0; offs = 0; score = 0; timeLeft = TIME_LIMIT;
    opening = 0.8; wrapped = false; good = false; held = 0; resultT = 0; posted = false;
    spark = null; mood = null; halfPop = false; buzz = 0;
    loadShape(0);
  }

  function nailNear(x, y) {
    var best = null, bd = SNAP;
    for (var r = 0; r < GROWS; r++) for (var c = 0; c < GCOLS; c++) {
      var n = nail(c, r), d = Math.hypot(x - n.x, y - n.y);
      if (d < bd) { bd = d; best = { c: c, r: r }; }
    }
    return best;
  }

  // ---- 結ぶ(本番もデモも同じ) ----
  function startLine(x, y) {
    if (fillT >= 0 || slideT > 0) return false;
    var n = nailNear(x, y);
    if (!n) return false;
    var p = nail(n.c, n.r);
    drag = { a: n, x: p.x, y: p.y };
    game.audio.play('se_tap', 0.3);
    return true;
  }

  function moveLine(x, y) {
    if (!drag) return;
    drag.x = x; drag.y = y;
    var n = nailNear(x, y);
    var k = n ? n.c * 10 + n.r : -1;
    if (k !== drag.hover) {
      drag.hover = k;
      return !!(n && (n.c !== drag.a.c || n.r !== drag.a.r));
    }
    return false;
  }

  function endLine(x, y, live) {
    if (!drag) return 'none';
    var a = drag.a; drag = null;
    var b = nailNear(x, y);
    if (!b || (b.c === a.c && b.r === a.r)) { game.audio.tone('C4', 0.04, { wave: 'square', volume: 0.05 }); return 'cancel'; }
    var pa = nail(a.c, a.r), pb = nail(b.c, b.r);
    var ok = a.c === b.c || a.r === b.r;
    var segs = [];
    if (ok) {
      if (a.r === b.r) for (var c = Math.min(a.c, b.c); c < Math.max(a.c, b.c); c++) segs.push(key(c, a.r, true));
      else for (var r = Math.min(a.r, b.r); r < Math.max(a.r, b.r); r++) segs.push(key(a.c, r, false));
      for (var i = 0; i < segs.length; i++) if (!(segs[i] in units)) { ok = false; break; }
    }
    if (!ok) {
      spark = { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, t: 0.5 };
      if (live) { offs++; timeLeft = Math.max(0.01, timeLeft - PENALTY); held = 0.3; }
      game.feedback.bad((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, { text: live ? '-1' : 'MISS', shake: 8 });
      game.audio.play('se_break', 0.3);
      mood = { k: 'oops', t: 0.6 };
      return 'off';
    }
    var fresh = 0;
    for (var j = 0; j < segs.length; j++) if (!units[segs[j]]) { units[segs[j]] = true; fresh++; covered++; }
    if (!fresh) { game.audio.tone('D4', 0.05, { wave: 'triangle', volume: 0.06 }); return 'dup'; }
    lines.push({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, t: 0 });
    strokes++;
    var big = segs.length >= 3;
    if (live) score += fresh * 20 + (big ? 50 : 0);
    game.feedback.good(pb.x, pb.y - 50, { text: big ? 'NICE' : '+' + fresh * 20, color: P8.yellow, size: big ? 56 : 44 });
    game.audio.tone(360 + (covered / unitTotal) * 600, 0.08, { wave: 'square', volume: 0.08 });
    if (covered >= unitTotal) {
      fillT = 0;
      game.audio.play('se_powerup', 0.45);
      mood = { k: 'yay', t: 1 };
    }
    return 'ok';
  }

  function stepFence(dt, live) {
    if (slideT > 0) slideT -= dt;
    if (spark) { spark.t -= dt; if (spark.t <= 0) spark = null; }
    if (mood) { mood.t -= dt; if (mood.t <= 0) mood = null; }
    for (var i = 0; i < lines.length; i++) lines[i].t += dt;
    if (fillT >= 0) {
      fillT += dt;
      if (fillT >= 0.9) {
        var cen = nail(3.5, 3);
        if (live) {
          panelsDone++;
          score += 300;
          game.fx.popup(panelsDone === 1 ? 'GOOD' : 'CLEAR', cen.x, H * 0.66, { color: P8.cyan, size: 70 });
          if (!halfPop && panelsDone >= 2) { halfPop = true; game.fx.popup('NICE', W / 2, H * 0.17, { color: P8.magenta, size: 80 }); game.audio.play('se_milestone', 0.5); }
          if (panelsDone >= SHAPES.length) { fillT = 0.9; wrap(true); return; }
          loadShape(shapeIx + 1);
        } else {
          fillT = 0.9;
        }
      }
    }
  }

  function wrap(ok) {
    if (wrapped) return;
    wrapped = true; good = ok;
    if (!held) held = 0.4;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) score += Math.round(timeLeft * 40);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) {
      if (!posted) return;
      state = S.ATTRACT; initGame(); demo.t = 0; return;
    }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || wrapped || opening > 0 || held > 0) return;
    if (!startLine(x, y)) { game.audio.tone('A2', 0.04, { wave: 'square', volume: 0.05 }); game.fx.burst(x, y, { color: P8.dark, count: 3, speed: 70 }); }
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || wrapped) return;
    if (drag && moveLine(x, y)) game.audio.tone('G5', 0.03, { wave: 'square', volume: 0.05 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || wrapped) return;
    if (drag) {
      var r = endLine(x, y, true);
      if (r === 'cancel') game.fx.burst(x, y, { color: P8.gray, count: 4, speed: 90 });
    }
  });

  // ---- 描画 ----
  function garden() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, P8.navy], [0.7, P8.black], [0.72, '#002200'], [1, P8.black]]);
    // 新築の家(細線の輪郭)
    game.draw.line(W * 0.6, H * 0.1, W * 0.78, H * 0.04, P8.gray, 3);
    game.draw.line(W * 0.78, H * 0.04, W * 0.96, H * 0.1, P8.gray, 3);
    game.draw.line(W * 0.62, H * 0.1, W * 0.62, H * 0.18, P8.gray, 2);
    game.draw.line(W * 0.94, H * 0.1, W * 0.94, H * 0.18, P8.gray, 2);
    game.draw.rect(W * 0.72, H * 0.12, 60, 50, Math.floor(t * 0.8) % 2 ? P8.yellow : P8.dark, 0.6);
    // 芝の市松ディザ
    for (var gy = H * 0.73; gy < H; gy += 16) for (var gx = ((gy / 16) % 2) * 16; gx < W; gx += 32) game.draw.rect(gx, gy, 16, 16, '#005500', 0.5);
  }

  function fence(off) {
    var x0 = GX - 70 + off, y0 = GY - 70, w = (GCOLS - 1) * GAP + 140, h = (GROWS - 1) * GAP + 140;
    game.draw.rect(x0 - 6, y0 - 6, w + 12, h + 12, P8.white);
    game.draw.rect(x0, y0, w, h, P8.brown);
    for (var b = 0; b < 12; b++) {
      var bx = x0 + b * (w / 12);
      game.draw.line(bx, y0, bx, y0 + h, '#552a00', 3);
      game.draw.rect(bx + 10, y0 + 30 + (b * 37) % 200, 4, 60, '#cc7722', 0.6);
    }
    // 塗った区画(ディザで塗り広がる)
    if (fillT >= 0) {
      var col = PAINT[shapeIx % PAINT.length];
      for (var i = 0; i < inside.length; i++) {
        var cell = inside[i];
        var spread = Math.min(1, fillT / 0.6);
        var p = nail(cell.c, cell.r);
        var d = (cell.c + cell.r) / (GCOLS + GROWS);
        if (d > spread) continue;
        game.draw.rect(p.x + off, p.y, GAP, GAP, col);
        for (var q = 0; q < 4; q++) for (var s = 0; s < 4; s++) if ((q + s) % 2 === 0) game.draw.rect(p.x + off + q * 30, p.y + s * 30, 15, 15, P8.white, 0.25);
      }
    }
    // 塗る区画の縁(点線)
    for (var k in units) {
      var horiz = k.charAt(0) === 'h';
      var parts = k.slice(1).split('_');
      var c = parseInt(parts[0], 10), r = parseInt(parts[1], 10);
      var a = nail(c, r), e = horiz ? nail(c + 1, r) : nail(c, r + 1);
      if (units[k]) continue;
      for (var dsh = 0; dsh < 4; dsh++) {
        var t0 = dsh / 4 + 0.04, t1 = dsh / 4 + 0.16;
        game.draw.line(a.x + (e.x - a.x) * t0 + off, a.y + (e.y - a.y) * t0, a.x + (e.x - a.x) * t1 + off, a.y + (e.y - a.y) * t1, P8.yellow, 5);
      }
    }
    // 張った養生の線
    for (var l = 0; l < lines.length; l++) {
      var ln = lines[l];
      game.draw.line(ln.x1 + off, ln.y1, ln.x2 + off, ln.y2, P8.white, 9);
      game.draw.line(ln.x1 + off, ln.y1, ln.x2 + off, ln.y2, P8.cyan, 4);
    }
    // 釘(押せる物: 明滅+白縁)
    var tt = game.time.elapsed;
    for (var r2 = 0; r2 < GROWS; r2++) for (var c2 = 0; c2 < GCOLS; c2++) {
      var n = nail(c2, r2);
      game.draw.circle(n.x + off, n.y, 15, P8.white, 0.35 + 0.25 * Math.sin(tt * 5 + c2 + r2));
      game.draw.circle(n.x + off, n.y, 10, P8.gray);
      game.draw.circle(n.x + off - 3, n.y - 3, 4, P8.white);
    }
    if (drag) {
      var pa = nail(drag.a.c, drag.a.r);
      game.draw.line(pa.x, pa.y, drag.x, drag.y, P8.magenta, 6);
      game.draw.circle(pa.x, pa.y, 22, P8.magenta, 0.5);
      var hn = nailNear(drag.x, drag.y);
      if (hn) { var hp = nail(hn.c, hn.r); game.draw.circle(hp.x, hp.y, 26, P8.white, 0.4); }
    }
    if (spark) {
      var g = 1 + (0.5 - spark.t);
      game.draw.line(spark.x1, spark.y1, spark.x2, spark.y2, P8.white, 14 * g);
      game.draw.line(spark.x1, spark.y1, spark.x2, spark.y2, P8.red, 6 * g);
      game.draw.circle(spark.x2, spark.y2, 30 * g, P8.red, 0.5);
    }
  }

  function crew() {
    var t = game.time.elapsed;
    var fr = Math.floor(t * 3) % 2 === 0 ? PAINTER_A : PAINTER_B;
    var dy = 0;
    if (mood && mood.k === 'yay') { fr = PAINTER_YAY; dy = -Math.abs(Math.sin(t * 12)) * 20; }
    if (mood && mood.k === 'oops') dy = 12;
    if (wrapped && state !== S.ATTRACT) { fr = good ? PAINTER_YAY : PAINTER_A; dy = good ? -Math.abs(Math.sin(t * 12)) * 20 : 20; }
    game.draw.sprite(fr, PAINTER_PAL, W * 0.14, H * 0.82 + dy, 14, { anchor: 'center' });
    game.draw.sprite(ROLLER, { r: PAINT[shapeIx % PAINT.length], h: P8.gray }, W * 0.25, H * 0.8 + Math.sin(t * 4) * 6, 12, { anchor: 'center' });
    game.draw.sprite(CAN, { h: P8.gray, p: P8.white, w: PAINT[shapeIx % PAINT.length] }, W * 0.86, H * 0.84, 14, { anchor: 'center' });
    // 区画の進み(テキスト枠UI)
    game.draw.rect(W * 0.35, H * 0.78, W * 0.42, 110, P8.blue);
    game.draw.rect(W * 0.35 + 6, H * 0.78 + 6, W * 0.42 - 12, 98, P8.black);
    for (var i = 0; i < SHAPES.length; i++) {
      var on = i < panelsDone || (wrapped && good);
      game.draw.rect(W * 0.35 + 30 + i * 140, H * 0.78 + 26, 110, 58, on ? PAINT[i] : P8.dark);
      if (i === shapeIx && !on) game.draw.rect(W * 0.35 + 30 + i * 140, H * 0.78 + 26 + 58 - 8, 110 * (covered / unitTotal), 8, P8.yellow);
    }
  }

  function drawHud() {
    game.draw.rect(30, 24, W - 60, 140, P8.blue);
    game.draw.rect(36, 30, W - 72, 128, P8.black);
    frameText(panelsDone + ' / 3', W / 2, 52, 52, P8.white);
    game.draw.text('SCORE ' + score, W - 60, 46, { size: 28, color: P8.yellow, bold: true, align: 'right', font: 'monospace' });
    game.draw.rect(60, 122, W - 120, 20, P8.dark);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 8) % 2;
    game.draw.rect(62, 124, (W - 124) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? P8.red : P8.cyan);
  }

  function drawResult() {
    game.draw.rect(60, H * 0.2, W - 120, H * 0.4, P8.blue);
    game.draw.rect(70, H * 0.2 + 10, W - 140, H * 0.4 - 20, P8.black, 0.9);
    frameText(good ? 'CLEAR' : 'TIME UP', W / 2, H * 0.27, 104, good ? P8.cyan : P8.red);
    frameText('SCORE ' + score, W / 2, H * 0.36, 58, P8.white);
    frameText(panelsDone + ' / 3   MISS ' + offs, W / 2, H * 0.42, 42, P8.yellow);
    if (good && score > game.best) {
      if (Math.floor(resultT * 4) % 2 === 0) frameText('NEW RECORD', W / 2, H * 0.49, 62, P8.magenta);
    } else {
      frameText('BEST ' + Math.max(game.best, good ? score : 0), W / 2, H * 0.49, 42, P8.magenta);
    }
    if (!good) frameText('あと' + Math.max(1, unitTotal - covered) + '本!', W / 2, H * 0.55, 60, P8.yellow);
    if (posted && Math.floor(game.time.elapsed * 2) % 2 === 0) frameText('TAP TO CONTINUE', W / 2, H * 0.965, 34, P8.white);
  }

  // ---- ATTRACT: startLine/moveLine/endLine を手が実行。角→角で2辺、縁から外れた斜め線(失敗例)、残り2辺で塗る ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.7, press: false, i: 0, phase: 'go', wait: 0 };
  var DEMO_STROKES = [[[1, 1], [5, 1]], [[5, 1], [5, 4]], [[5, 4], [2, 2]], [[5, 4], [1, 4]], [[1, 4], [1, 1]]];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.4;
    if (cyc < dt || demo.t <= dt) {
      initGame(); opening = 0; slideT = 0; demo.i = 0; demo.phase = 'go'; demo.wait = 0.4;
    }
    stepFence(dt, false);
    if (demo.wait > 0) { demo.wait -= dt; demo.press = false; return; }
    if (demo.i >= DEMO_STROKES.length) {
      demo.press = false;
      demo.gx += (W * 0.75 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.7 - demo.gy) * Math.min(1, dt * 2);
      return;
    }
    var st = DEMO_STROKES[demo.i];
    var a = nail(st[0][0], st[0][1]), b = nail(st[1][0], st[1][1]);
    if (demo.phase === 'go') {
      demo.gx += (a.x - demo.gx) * Math.min(1, dt * 8);
      demo.gy += (a.y - demo.gy) * Math.min(1, dt * 8);
      demo.press = false;
      if (Math.hypot(demo.gx - a.x, demo.gy - a.y) < 6) { startLine(a.x, a.y); demo.phase = 'pull'; }
    } else {
      demo.gx += (b.x - demo.gx) * Math.min(1, dt * 5);
      demo.gy += (b.y - demo.gy) * Math.min(1, dt * 5);
      demo.press = true;
      if (moveLine(demo.gx, demo.gy)) game.audio.tone('G5', 0.03, { wave: 'square', volume: 0.03 });
      if (Math.hypot(demo.gx - b.x, demo.gy - b.y) < 5) { endLine(b.x, b.y, false); demo.i++; demo.phase = 'go'; demo.wait = 0.25; }
    }
  }

  // ---- メインループ ----
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      garden();
      fence(0);
      crew();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      frameText(GAME_TITLE, W / 2, H * 0.06 + Math.sin(game.time.elapsed * 2) * 4, 92, P8.yellow);
      frameText('HI-SCORE ' + game.best, W / 2, H * 0.115, 38, P8.cyan);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) frameText('► 100円 投入 ◄', W / 2, H * 0.965, 44, P8.magenta);
      else frameText('INSERT COIN', W / 2, H * 0.965, 40, P8.white);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      garden(); fence(0); crew(); drawHud();
      if (good && Math.floor(resultT * 6) !== Math.floor((resultT - dt) * 6)) {
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.22, H * 0.58), { color: PAINT[Math.floor(game.random(0, 3)) % 3], count: 16, speed: 420 });
      }
      drawResult();
      if (!posted && resultT >= 1.3) {
        posted = true;
        var stt = { panels: panelsDone, strokes: strokes, offLines: offs };
        if (good) game.end.success(score, stt); else game.end.failure(stt);
      }
      return;
    }

    if (held > 0) {
      held -= dt;
      if (spark) spark.t = Math.max(0.1, spark.t - dt * 0.3);
      if (held <= 0 && wrapped) { state = S.RESULT; resultT = 0; }
    } else if (wrapped) {
      state = S.RESULT; resultT = 0;
    } else if (opening > 0) {
      opening -= dt;
      if (opening <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      stepFence(dt, true);
      if (timeLeft < 4) {
        buzz -= dt;
        if (buzz <= 0) { buzz = 0.5; game.audio.tone('E6', 0.04, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && !wrapped) {
        timeLeft = 0;
        drag = null;
        var first = null;
        for (var k in units) if (!units[k]) { first = k; break; }
        if (first) {
          var parts = first.slice(1).split('_');
          var a = nail(parseInt(parts[0], 10), parseInt(parts[1], 10));
          var e = first.charAt(0) === 'h' ? nail(parseInt(parts[0], 10) + 1, parseInt(parts[1], 10)) : nail(parseInt(parts[0], 10), parseInt(parts[1], 10) + 1);
          spark = { x1: a.x, y1: a.y, x2: e.x, y2: e.y, t: 0.5 };
        }
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP', size: 64 });
        held = 0.5;
        wrap(false);
      }
    }

    var off = slideT > 0 ? slideT * 900 : 0;
    garden();
    fence(off);
    crew();
    drawHud();
    if (opening > 0) frameText(opening > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 110, P8.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 1], ['D5', 1],
      ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 0.5], ['D4', 1], ['G4', 1],
    ], { tempo: 124, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 2], ['E2', 2], ['C3', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
