// I-DS-0018v2-lookout-star-plate-hold.js
// 物見櫓の星焼き — 押さえている間だけ写真乾板に星が一つずつ写る。星座の点が全部そろった直後、昇る月の光が差す前に指を離す
// 操作: 下のレリーズを押し続けるとシャッターが開き、点線の星座の点に星が一つずつ写っていく。最後の星が写ったらすぐ離す。早いと星が欠け、遅いと海から昇る月で乾板が白くとぶ。流れ星は数に入らない
// 終わり: 乾板4枚を焼けばCLEAR。欠け・白とび・構えたまま3秒が2回、または時間切れでGAME OVER
// @mechanic: hold_duration
// @theme: lookout_star_plate
// 世界観: 離島の漁村の物見櫓で、星図づくりの少年が手作り望遠鏡のレリーズを押さえ続け、月が海から昇る前に星座を一枚ずつ写真乾板に焼き付ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 焼けた乾板の枚数・PERFECT数・離した瞬間のズレ(秒)
// スタイル: 70s VECTOR
var STYLE = { bg: ['#000000', '#020a18'], main: ['#7cf8ff', '#5cff9c', '#f0f8ff'], accent: ['#ffd84a', '#ff5a5a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'STAR PLATE';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var MISS_MAX = 2;
  var EX = W * 0.5, EY = H * 0.39, ER = 320;
  var HZ = H * 0.7;
  var BX = W * 0.5, BY = H * 0.86, BR = 100;
  var MOON_X = W * 0.82;
  var C = {
    cyan: STYLE.main[0], green: STYLE.main[1], white: STYLE.main[2], gold: STYLE.accent[0], red: STYLE.accent[1],
    dim: '#2a6a78', deep: '#123848', black: '#000000',
  };
  var PLATES = [
    { k: 4, full: 1.5, win: 0.75, meteors: 0, faint: false },
    { k: 5, full: 1.8, win: 0.62, meteors: 1, faint: false },
    { k: 5, full: 2.0, win: 0.55, meteors: 1, faint: true },
    { k: 6, full: 2.2, win: 0.5, meteors: 2, faint: true },
    { k: 6, full: 2.4, win: 0.45, meteors: 2, faint: true },
  ];
  var SHAPES = [
    [[-0.6, -0.3], [-0.3, -0.42], [0, -0.3], [0.2, 0], [0.55, -0.05], [0.6, 0.35]],
    [[-0.7, -0.2], [-0.35, 0.3], [0, -0.1], [0.35, 0.35], [0.7, -0.25], [0.1, -0.6]],
    [[0, -0.65], [0.42, -0.1], [0, 0.6], [-0.42, -0.1], [0.05, 0.05], [0.18, -0.36]],
    [[0, -0.62], [0, -0.15], [0, 0.35], [-0.48, -0.25], [0.46, -0.2], [0.06, 0.66]],
    [[-0.66, 0.4], [-0.3, 0.05], [0, 0.3], [0.3, -0.1], [0.62, 0.15], [0.45, -0.55]],
  ];

  var BOY_A = [
    '..gggg....',
    '.gggggg...',
    '.g.gg.g...',
    '..gggg....',
    '...gg.....',
    '.gggggggg.',
    'g.gggg..gg',
    '..gggg....',
    '..g..g....',
    '..g..g....',
  ];
  var BOY_B = [
    '..gggg....',
    '.gggggg...',
    '.gggggg...',
    '..gggg....',
    '...gg.....',
    '.ggggggggg',
    'g.gggg....',
    '..gggg....',
    '..g..g....',
    '.g....g...',
  ];
  var BOY_SAD = [
    '..........',
    '..gggg....',
    '.gggggg...',
    '.gg..gg...',
    '..gggg....',
    '.gggggg...',
    'g.gggg.g..',
    '..gggg....',
    '..g..g....',
    '.gg..gg...',
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, plateIx, plates, misses, score, perfects, errSum, phase, phT, idle, expT, holding, cfg, pts, meteors;
  var cue, hitStop, hitKind, badPending, ready, done, endT, won, resultT, endSent, newRec, finalScore, lastErr, celebT, shapeSeed;
  var BG_STARS = [];
  for (var bs = 0; bs < 60; bs++) BG_STARS.push({ x: (bs * 397) % W, y: 240 + ((bs * 211) % Math.floor(HZ - 260)), p: bs * 0.7 });

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 3, { size: size, color: C.deep, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }
  // ベクター線: 太い半透明 + 細い芯で発光
  function vline(x1, y1, x2, y2, col, w) {
    game.draw.line(x1, y1, x2, y2, col + '44', w * 3);
    game.draw.line(x1, y1, x2, y2, col, w);
  }
  function vring(cx, cy, r, col, w, n, a0, a1) {
    var segs = n || 40;
    var s0 = a0 === undefined ? 0 : a0, s1 = a1 === undefined ? Math.PI * 2 : a1;
    for (var i = 0; i < segs; i++) {
      var p = s0 + (s1 - s0) * (i / segs), q = s0 + (s1 - s0) * ((i + 1) / segs);
      game.draw.line(cx + Math.cos(p) * r, cy + Math.sin(p) * r, cx + Math.cos(q) * r, cy + Math.sin(q) * r, col, w);
    }
  }
  function star(x, y, s, col) {
    vline(x - s, y, x + s, y, col, 3);
    vline(x, y - s, x, y + s, col, 3);
    game.draw.line(x - s * 0.5, y - s * 0.5, x + s * 0.5, y + s * 0.5, col, 2);
    game.draw.line(x - s * 0.5, y + s * 0.5, x + s * 0.5, y - s * 0.5, col, 2);
  }

  function initGame() {
    clock = TIME_LIMIT; plateIx = 0; plates = 0; misses = 0; score = 0; perfects = 0; errSum = 0;
    cue = null; hitStop = 0; hitKind = ''; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; lastErr = 0; celebT = 0;
    shapeSeed = Math.floor(game.random(0, SHAPES.length));
    setupPlate(0);
    phase = 'wait';
  }

  function setupPlate(i) {
    cfg = PLATES[Math.min(i, PLATES.length - 1)];
    var shape = SHAPES[(i + shapeSeed) % SHAPES.length];
    pts = [];
    for (var k = 0; k < cfg.k; k++) pts.push({ x: EX + shape[k][0] * ER, y: EY + shape[k][1] * ER, at: 0, faint: false });
    var order = [];
    for (var o = 0; o < cfg.k; o++) order.push(o);
    for (var s = order.length - 1; s > 0; s--) { var j = Math.floor(Math.random() * (s + 1)); var tmp = order[s]; order[s] = order[j]; order[j] = tmp; }
    var gaps = [], sum = 0;
    for (var g = 0; g < cfg.k; g++) { var gg = game.random(0.6, 1.4); gaps.push(gg); sum += gg; }
    var acc = 0;
    for (var m = 0; m < cfg.k; m++) { acc += (gaps[m] / sum) * cfg.full; pts[order[m]].at = acc; }
    pts[order[cfg.k - 1]].at = cfg.full;
    pts[order[cfg.k - 2]].at = Math.min(pts[order[cfg.k - 2]].at, cfg.full - 0.28);
    if (cfg.faint) pts[order[cfg.k - 1]].faint = true;
    meteors = [];
    for (var mt = 0; mt < cfg.meteors; mt++) {
      var a = game.random(0, Math.PI * 2);
      var sx = EX + Math.cos(a) * ER * 0.75, sy = EY + Math.sin(a) * ER * 0.75;
      var d = a + Math.PI * 0.75;
      meteors.push({ t0: game.random(0.4, cfg.full - 0.1), x0: sx, y0: sy, x1: sx + Math.cos(d) * 300, y1: sy + Math.sin(d) * 300, sounded: false });
    }
    phase = 'aim'; phT = 0; idle = 0; expT = 0; holding = false; cue = null;
  }

  function shownCount() {
    var n = 0;
    for (var i = 0; i < pts.length; i++) if (expT >= pts[i].at) n++;
    return n;
  }

  function startExposure() {
    holding = true; phase = 'expose'; expT = 0;
    game.audio.play('se_tap', 0.35);
    game.audio.tone('C4', 0.08, { wave: 'square', volume: 0.06, slide: -120 });
  }

  function simulate(dt, real) {
    if (cue) {
      cue.t -= dt;
      if (cue.t <= 0) { cue = null; nextPlate(real); }
      return;
    }
    if (phase === 'aim') {
      idle += dt;
      if (idle > 3) { expT = 0; failPlate('idle', real); }
    } else if (phase === 'expose' && holding) {
      var prev = expT;
      expT += dt;
      for (var i = 0; i < pts.length; i++) {
        if (prev < pts[i].at && expT >= pts[i].at) {
          var notes = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
          game.audio.tone(notes[Math.min(5, shownCount() - 1)], 0.09, { wave: 'triangle', volume: pts[i].faint ? 0.03 : 0.07 });
        }
      }
      for (var m = 0; m < meteors.length; m++) {
        if (!meteors[m].sounded && expT >= meteors[m].t0) { meteors[m].sounded = true; game.audio.tone('G5', 0.12, { wave: 'sine', volume: 0.04, slide: -300 }); }
      }
      if (expT > cfg.full && Math.floor(prev / 0.09) !== Math.floor(expT / 0.09)) game.audio.tone('E6', 0.03, { wave: 'square', volume: 0.035 });
      if (expT >= cfg.full + cfg.win) { holding = false; failPlate('over', real); }
    } else if (phase === 'gap') {
      phT += dt;
      if (phT > 0.35) setupPlate(plateIx);
    }
  }

  function releaseShutter(real) {
    if (!holding || phase !== 'expose') return;
    holding = false;
    var d = expT - cfg.full;
    lastErr = d;
    if (d < 0) { failPlate('under', real); return; }
    var perfect = d < 0.15;
    game.feedback.good(EX, EY - ER - 30, { text: perfect ? 'PERFECT' : 'GOOD', color: C.gold });
    game.audio.play('se_coin', 0.35);
    if (real) {
      plates++; errSum += d;
      score += perfect ? 300 : 200;
      if (perfect) perfects++;
      if (plates === 2) { game.fx.popup('NICE', W * 0.5, H * 0.18 + 40, { color: C.gold, size: 80 }); game.audio.play('se_milestone', 0.45); }
    }
    phase = 'develop';
    cue = { t: 0.6 };
  }

  function failPlate(kind, real) {
    hitStop = 0.45; hitKind = kind; phase = 'fail';
    badPending = { real: real };
    game.audio.tone('D3', 0.18, { wave: 'square', volume: 0.12 });
    game.fx.flash(kind === 'under' ? '#ff5a5a' : '#ffffff', 0.12);
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    game.feedback.bad(EX, EY, { text: 'MISS' });
    hitKind = '';
    if (b && b.real) misses++;
    nextPlate(b && b.real);
  }

  function nextPlate(real) {
    if (real) {
      plateIx++;
      if (plates >= NEEDED) { finish(true); return; }
      if (misses >= MISS_MAX || plateIx >= PLATES.length) { finish(false); return; }
    }
    phase = 'gap'; phT = 0;
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score + (ok ? Math.round(Math.max(0, clock) * 20) : 0);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { plates: plates, perfect: perfects, misses: misses, avgLagSec: plates > 0 ? Math.round((errSum / plates) * 100) / 100 : 0 };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 1枚目は最後の星で離してPERFECT、2枚目は押しすぎて白とび ──
  var demo = { t: 0, gx: BX, gy: BY + 140, press: false, plan: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.2;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; setupPlate(0); demo.plan = 0; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) resolveBad(); }
    else {
      if (phase === 'gap') { phT += dt; if (phT > 0.35) { setupPlate(1); demo.plan = 1; } }
      else simulate(dt, false);
    }
    if (phase === 'aim' && idle > 0.6 && !holding) startExposure();
    if (phase === 'expose' && holding && demo.plan === 0 && expT >= cfg.full + 0.08) releaseShutter(false);
    demo.press = holding;
    var ty = holding ? BY : BY + 120;
    demo.gx += (BX - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 8);
  }

  // ── 描画 ─────────────────────────────────────────────────────
  function drawWorld(moonRise) {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.black], [0.68, STYLE.bg[1]], [1, C.black]]);
    for (var i = 0; i < BG_STARS.length; i++) {
      var s = BG_STARS[i];
      if (Math.hypot(s.x - EX, s.y - EY) < ER + 30) continue;
      var tw = Math.sin(t * 2 + s.p) > -0.2;
      if (tw) game.draw.line(s.x - 3, s.y, s.x + 3, s.y, C.dim, 2);
    }
    // 海と波
    vline(0, HZ, W, HZ, C.cyan, 2);
    for (var w = 0; w < 3; w++) {
      var yy = HZ + 40 + w * 46;
      var px = 0, py = yy;
      for (var x = 40; x <= W; x += 40) {
        var ny = yy + Math.sin(x * 0.02 + t * (1.5 + w * 0.4) + w) * 8;
        game.draw.line(px, py, x, ny, w === 0 ? C.cyan : C.dim, 2);
        px = x; py = ny;
      }
    }
    // 月(危険): 窓の間だけ昇る
    var my = HZ + 70 - moonRise * 150;
    if (moonRise > 0) {
      vring(MOON_X, my, 60 + moonRise * 20, C.gold, 3, 28);
      for (var r = 0; r < 8; r++) {
        var a = -Math.PI + (r / 7) * Math.PI;
        var r0 = 90 + moonRise * 20, r1 = r0 + 30 + moonRise * 60;
        game.draw.line(MOON_X + Math.cos(a) * r0, my + Math.sin(a) * r0, MOON_X + Math.cos(a) * r1, my + Math.sin(a) * r1, C.gold, 2);
      }
    }
    // 物見櫓
    var tx = 170, top = HZ - 250;
    vline(tx - 70, HZ + 140, tx - 50, top, C.green, 3);
    vline(tx + 70, HZ + 140, tx + 50, top, C.green, 3);
    vline(tx - 60, top + 80, tx + 60, top + 170, C.green, 2);
    vline(tx + 60, top + 80, tx - 60, top + 170, C.green, 2);
    vline(tx - 90, top, tx + 90, top, C.green, 4);
    vline(tx - 90, top - 60, tx - 90, top, C.green, 2);
    vline(tx + 90, top - 60, tx + 90, top, C.green, 2);
  }

  function drawBoy(mood) {
    var t = game.time.elapsed;
    var tx = 170, top = HZ - 250;
    var spr = mood === 'sad' ? BOY_SAD : (Math.floor(t * 2) % 2 === 0 ? BOY_A : BOY_B);
    var jump = mood === 'win' ? Math.abs(Math.sin(t * 7)) * 40 : Math.sin(t * 3) * 3;
    game.draw.sprite(spr, { g: C.green }, tx - 10, top - 62 - jump, 11, { anchor: 'center' });
    // 望遠鏡(線で描く)
    vline(tx + 30, top - 80, tx + 150, top - 190, C.cyan, 6);
    vline(tx + 60, top - 40, tx + 60, top, C.cyan, 3);
  }

  function drawEyepiece(showPlate) {
    var t = game.time.elapsed;
    var over = phase === 'expose' && expT > cfg.full ? Math.min(1, (expT - cfg.full) / cfg.win) : 0;
    if (hitKind === 'over' || hitKind === 'idle') over = 1;
    vring(EX, EY, ER + 26, C.cyan, 3, 48);
    vring(EX, EY, ER, C.cyan, 5, 48);
    // ズーム鏡筒の線
    vline(EX - ER - 26, EY, EX - ER - 70, EY + 40, C.dim, 2);
    vline(EX + ER + 26, EY, EX + ER + 70, EY + 40, C.dim, 2);
    if (!showPlate) return;
    // 経過の針(縁を回る)
    if (phase === 'expose') {
      var ang = -Math.PI / 2 + expT * 2.2;
      vline(EX + Math.cos(ang) * (ER + 8), EY + Math.sin(ang) * (ER + 8), EX + Math.cos(ang) * (ER + 44), EY + Math.sin(ang) * (ER + 44), C.white, 4);
    }
    // 星座の下書き(点線)
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (i > 0) {
        var q = pts[i - 1];
        for (var s = 0; s < 6; s += 2) {
          var a = s / 6, b = (s + 1) / 6;
          game.draw.line(q.x + (p.x - q.x) * a, q.y + (p.y - q.y) * a, q.x + (p.x - q.x) * b, q.y + (p.y - q.y) * b, phase === 'develop' ? C.gold : C.deep, phase === 'develop' ? 5 : 3);
        }
      }
      var shown = (phase === 'expose' || phase === 'develop' || phase === 'fail') && expT >= p.at;
      if (shown) {
        var sz = p.faint ? 16 : 30;
        star(p.x, p.y, sz + Math.sin(t * 9 + i) * 3, p.faint ? '#9fd8e0' : C.white);
      } else {
        var pulse = phase === 'aim' && Math.floor(t * 3) % 2 === 0;
        vring(p.x, p.y, 16, pulse ? C.cyan : C.dim, 2, 10);
        if (hitKind === 'under' && hitStop > 0 && Math.floor(t * 16) % 2 === 0) {
          vring(p.x, p.y, 40, C.red, 5, 14);
          star(p.x, p.y, 34, C.red);
        }
      }
    }
    // 流れ星(数えない)
    if (phase === 'expose') {
      for (var m = 0; m < meteors.length; m++) {
        var mt = meteors[m];
        var u = (expT - mt.t0) / 0.28;
        if (u < 0 || u > 1) continue;
        var hx = mt.x0 + (mt.x1 - mt.x0) * u, hy = mt.y0 + (mt.y1 - mt.y0) * u;
        var tx2 = mt.x0 + (mt.x1 - mt.x0) * Math.max(0, u - 0.35), ty2 = mt.y0 + (mt.y1 - mt.y0) * Math.max(0, u - 0.35);
        vline(tx2, ty2, hx, hy, C.white, 3);
      }
    }
    // シャッターの羽根(閉じている間)
    if (!holding && phase !== 'develop') {
      for (var bl = 0; bl < 6; bl++) {
        var ba = bl * Math.PI / 3 + t * 0.2;
        game.draw.line(EX + Math.cos(ba) * ER, EY + Math.sin(ba) * ER, EX + Math.cos(ba + 2.2) * 40, EY + Math.sin(ba + 2.2) * 40, C.deep, 3);
      }
    }
    // 月明かりの侵入(下の縁から金色の弧が太る)
    if (over > 0) {
      for (var k = 0; k < 5; k++) vring(EX, EY, ER - 8 - k * 14, C.gold, 2 + over * 6, 20, Math.PI * (0.5 - over * 0.5), Math.PI * (0.5 + over * 0.5));
      if (over >= 1 && hitStop > 0) {
        game.draw.circle(EX, EY, ER * (1 + (0.45 - hitStop) * 0.3), '#ffffff', 0.75);
      } else {
        game.draw.circle(EX, EY, ER, '#ffffff', over * 0.22);
      }
    }
  }

  function drawButton(press) {
    var t = game.time.elapsed;
    var r = press ? BR * 0.82 : BR + Math.sin(t * 4) * 6;
    vring(BX, BY, r + 22, press ? C.green : C.dim, 2, 32);
    vring(BX, BY, r, press ? C.green : (phase === 'aim' && Math.floor(t * 3) % 2 === 0 ? C.white : C.cyan), 5, 32);
    vring(BX, BY, r * 0.45, press ? C.white : C.cyan, 3, 20);
    // レリーズのケーブル
    var px = BX, py = BY - r;
    for (var i = 1; i <= 8; i++) {
      var nx = BX - (BX - 320) * (i / 8) + Math.sin(i + t * 2) * 10, ny = BY - r - (BY - r - (HZ - 330)) * (i / 8);
      game.draw.line(px, py, nx, ny, C.dim, 3);
      px = nx; py = ny;
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.black, 0.85);
    vline(0, 226, W, 226, C.dim, 1);
    for (var i = 0; i < NEEDED; i++) {
      var x = 80 + i * 76, y = 84;
      var got = i < plates;
      game.draw.line(x - 26, y - 26, x + 26, y - 26, got ? C.gold : C.dim, 3);
      game.draw.line(x - 26, y + 26, x + 26, y + 26, got ? C.gold : C.dim, 3);
      game.draw.line(x - 26, y - 26, x - 26, y + 26, got ? C.gold : C.dim, 3);
      game.draw.line(x + 26, y - 26, x + 26, y + 26, got ? C.gold : C.dim, 3);
      if (got) star(x, y, 14, C.gold);
    }
    for (var m = 0; m < MISS_MAX; m++) vring(W - 90 - m * 70, 84, 22, m < MISS_MAX - misses ? C.green : C.deep, 5, 16);
    say(plates + ' / ' + NEEDED, W * 0.5, 76, 60, C.white);
    say('SCORE ' + score, W * 0.5, 138, 32, C.cyan);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.line(70, 190, W - 70, 190, C.deep, 14);
    game.draw.line(70, 190, 70 + (W - 140) * frac, 190, frac < 0.3 ? C.red : C.green, 14);
  }

  function scanlines() {
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.2);
  }

  function moonRiseNow() {
    if (hitKind === 'over' || hitKind === 'idle') return 1;
    if (phase === 'expose' && cfg && expT > cfg.full) return Math.min(1, (expT - cfg.full) / cfg.win);
    if (phase === 'aim' && idle > 2) return Math.min(1, (idle - 2));
    return 0;
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (phase === 'aim') {
      startExposure();
      game.fx.burst(BX, BY, { color: C.green, count: 6, speed: 160 });
    } else {
      game.audio.tone('A3', 0.04, { wave: 'triangle', volume: 0.05 });
    }
  });

  game.onRelease(function (x, y) {
    if (state !== S.PLAYING) return;
    if (holding) {
      game.audio.tone('G4', 0.05, { wave: 'square', volume: 0.06, slide: 120 });
      releaseShutter(true);
    }
  });

  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'wait' || phase === 'gap') game.fx.burst(x, y, { color: C.dim, count: 3, speed: 80 });
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawWorld(moonRiseNow());
      drawBoy('');
      drawEyepiece(true);
      drawButton(demo.press);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.125, C.black, 0.85);
      say(TITLE, W * 0.5, H * 0.05, 90, C.cyan);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 36, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.96, 46, C.gold);
      else say('INSERT COIN', W * 0.5, H * 0.96, 40, C.white);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawWorld(won ? 0 : 1);
      drawBoy(won ? 'win' : 'sad');
      game.draw.rect(90, H * 0.2, W - 180, 540, C.black, 0.9);
      vring(W * 0.5, H * 0.33, 250, C.dim, 2, 40);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, won ? C.gold : C.red);
      say(plates + ' / ' + NEEDED, W * 0.5, H * 0.32, 68, C.white);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.white);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.cyan);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.gold); }
      else if (!won && lastErr < 0) say('あと' + Math.max(0.1, Math.round(-lastErr * 10) / 10) + '秒!', W * 0.5, H * 0.47, 52, C.red);
      else if (!won) say('あと' + Math.max(1, NEEDED - plates) + '枚!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.95, 40, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt;
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(140, W - 140), game.random(H * 0.18, H * 0.6), { color: Math.random() < 0.5 ? C.gold : C.cyan, count: 14, speed: 420 });
      }
      if (endT <= 0) { state = S.RESULT; resultT = 0; }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap', 0.35); setupPlate(0); }
    } else {
      simulate(dt, true);
      if (phase === 'aim' || phase === 'expose') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0; holding = false;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }

    drawWorld(moonRiseNow());
    drawBoy(done ? (won ? 'win' : 'sad') : '');
    drawEyepiece(phase !== 'wait');
    drawButton(holding);
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, EY, 100, C.gold);
      game.draw.hand(BX, BY + 10, { press: false, scale: 14 });
    }
    scanlines();
  });

  game.onStart(function () {
    game.audio.melody([
      ['A3', 1.5], ['E4', 0.5], ['D4', 1], ['C4', 1],
      ['B3', 1.5], ['E4', 0.5], ['G4', 1], ['E4', 1],
    ], { tempo: 72, wave: 'sine', volume: 0.05, loop: true, bass: [['A2', 4], ['E2', 4]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
