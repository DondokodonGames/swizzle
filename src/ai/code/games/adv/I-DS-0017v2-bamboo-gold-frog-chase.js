// I-DS-0017v2-bamboo-gold-frog-chase.js
// 竹林の金蛙おいかけ — 水たまりを跳ね逃げる金色の蛙だけを連続タップで追い、イボ蛙には触れずに3回おさえて籠へ入れる
// 操作: 金色の蛙をタップすると一度おさえ、蛙は指と反対へ跳んで逃げる(着地点に金の輪が先に出る)。輪へ先回りして続けてタップ。赤い輪に降りるイボ蛙に触れるとMISS
// 終わり: 金蛙を3匹(各3回おさえ)籠に入れればCLEAR。イボ蛙に3回触れる/時間切れでGAME OVER
// @mechanic: chase
// @theme: bamboo_rain_gold_frog
// 世界観: 雨上がりの竹林で、たけのこ掘りの少女が水たまりを跳ね回るすばしこい金色の蛙だけを追いかけ、イボ蛙をよけながら籠に入れていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 籠に入れた金蛙の数・おさえた回数・最大コンボ
// スタイル: NEO-RETRO
var STYLE = { bg: ['#0e2219', '#1c4430'], main: ['#3d7a4c', '#b6d79a', '#f3efd6'], accent: ['#ffc83a', '#e8503a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'GOLD FROG';
  var TIME_LIMIT = 20;
  var NEEDED = 3;
  var TOUCH_NEED = 3;
  var MISS_MAX = 3;
  var FX0 = 150, FX1 = W - 150, FY0 = H * 0.27, FY1 = H * 0.68;
  var GOLD_R = 84, TOAD_R = 70;
  var BASKET_X = W * 0.68, BASKET_Y = H * 0.86;
  var LEVELS = [
    { toads: 2, sit: 1.05, hop: 300, air: 0.4 },
    { toads: 3, sit: 0.85, hop: 360, air: 0.36 },
    { toads: 4, sit: 0.7, hop: 420, air: 0.33 },
  ];
  var C = {
    dark: STYLE.bg[0], mid: STYLE.bg[1], leaf: STYLE.main[0], pale: STYLE.main[1],
    cream: STYLE.main[2], gold: STYLE.accent[0], red: STYLE.accent[1],
  };

  // ── スプライト(大きいドット・限定色) ─────────────────────────────
  var FROG_A = [
    '.ww....ww.',
    '.wk....kw.',
    '.gggggggg.',
    'gddddddddg',
    'gggyyyyggg',
    '.gyyyyyyg.',
    'gg.gggg.gg',
    'g........g',
  ];
  var FROG_B = [
    '.ww....ww.',
    '.wk....kw.',
    '.gggggggg.',
    'gddddddddg',
    'ggyyyyyygg',
    'gyyyyyyyyg',
    'gg.gggg.gg',
    'g........g',
  ];
  var FROG_AIR = [
    '.ww....ww.',
    '.wk....kw.',
    '.gggggggg.',
    'gddddddddg',
    '.gyyyyyyg.',
    '..gyyyyg..',
    '.g......g.',
    'g........g',
  ];
  var TOAD_A = [
    '.ww....ww.',
    '.wk....kw.',
    '.grgggrgg.',
    'gddddddddg',
    'grgyyyygrg',
    '.gyyyyyyg.',
    'gg.gggg.gg',
    'g........g',
  ];
  var TOAD_B = [
    '.ww....ww.',
    '.wk....kw.',
    '.ggrggrgg.',
    'gddddddddg',
    'rgyyyyyygr',
    'gyyyyyyyyg',
    'gg.gggg.gg',
    'g........g',
  ];
  var TOAD_AIR = [
    '.ww....ww.',
    '.wk....kw.',
    '.grgggrgg.',
    'gddddddddg',
    '.gyyyyyyg.',
    '..grrrrg..',
    '.g......g.',
    'g........g',
  ];
  var GIRL_A = [
    '....hhhh....',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '...ssssss...',
    '...skssks...',
    '...ssrrss...',
    '....ssss....',
    '..bbbbbbbb..',
    '.sbbbpbbbbs.',
    '.s.bbpbbb.s.',
    '...bbbbbb...',
    '...bb..bb...',
    '...kk..kk...',
  ];
  var GIRL_B = [
    '....hhhh....',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '...ssssss...',
    '...skssks...',
    '...ssrrss...',
    '....ssss....',
    '..bbbbbbbb..',
    '.sbbbpbbbbs.',
    '.s.bbpbbb.s.',
    '...bbbbbb...',
    '..bb....bb..',
    '..kk....kk..',
  ];
  var GIRL_REACH = [
    '....hhhh....',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '...ssssss...',
    '...skssks...',
    '...ssrrss...',
    's...ssss...s',
    '.sbbbbbbbbs.',
    '..bbbpbbbb..',
    '...bbpbbb...',
    '...bbbbbb...',
    '...bb..bb...',
    '...kk..kk...',
  ];
  var GIRL_SAD = [
    '............',
    '....hhhh....',
    '..hhhhhhhh..',
    '.hhhhhhhhhh.',
    '...ssssss...',
    '...kksskk...',
    '....srrs....',
    '..bbbbbbbb..',
    '.sbbbpbbbbs.',
    '.s.bbpbbb.s.',
    '...bbbbbb...',
    '..bbbbbbbb..',
    '..kk....kk..',
  ];
  var BASKET = [
    'pppppppppppppp',
    '.pbpbpbpbpbpb.',
    '.bpbpbpbpbpbp.',
    '..pbpbpbpbpb..',
    '...pppppppp...',
  ];
  var SHOOT = ['..p..', '.ppp.', '.lpl.', 'lllll'];
  var LEAF = ['.ll', 'll.'];

  var GOLD_PAL = { w: C.cream, k: C.dark, g: C.gold, d: C.mid, y: C.cream };
  var TOAD_PAL = { w: C.cream, k: C.dark, g: C.leaf, d: C.dark, y: C.pale, r: C.red };
  var WHITE_PAL = { w: '#ffffff', k: '#ffffff', g: '#ffffff', d: '#ffffff', y: '#ffffff', r: '#ffffff' };
  var GIRL_PAL = { h: C.cream, s: C.cream, k: C.dark, r: C.red, b: C.leaf, p: C.pale };
  var BASKET_PAL = { p: C.pale, b: C.leaf };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, caught, touches, totalTouches, misses, score, combo, maxCombo, lastTouch;
  var frogs, gold, spawnT, hitStop, hitFrog, badPending, ready, done, endT, won;
  var resultT, endSent, newRec, finalScore, girlX, girlPose, celebT;
  var ripples = [];

  var DROPS = [];
  for (var di = 0; di < 42; di++) DROPS.push({ x: (di * 263) % W, s: (di * 0.137) % 1, v: 820 + (di % 5) * 90 });
  var PUDDLES = [
    { x: W * 0.28, y: H * 0.36, rx: 120, ry: 34 }, { x: W * 0.7, y: H * 0.31, rx: 96, ry: 28 },
    { x: W * 0.52, y: H * 0.5, rx: 150, ry: 40 }, { x: W * 0.22, y: H * 0.62, rx: 110, ry: 30 },
    { x: W * 0.78, y: H * 0.6, rx: 130, ry: 36 },
  ];

  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function lv() { return LEVELS[Math.min(caught, LEVELS.length - 1)]; }

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: C.dark, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  // 大きいドットの楕円(横帯を積む)
  function ellipse(cx, cy, rx, ry, col, a) {
    var n = 6;
    for (var i = 0; i < n; i++) {
      var yy = -ry + (2 * ry) * (i + 0.5) / n;
      var w = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(cx - w, cy + yy - ry / n, w * 2, (2 * ry) / n + 1, col, a);
    }
  }
  function ringLines(cx, cy, rx, ry, col, wdt, spikes) {
    var n = 18;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      game.draw.line(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, col, wdt);
      if (spikes && i % 3 === 0) {
        game.draw.line(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry, cx + Math.cos(a0) * (rx + 22), cy + Math.sin(a0) * (ry + 12), col, wdt);
      }
    }
  }

  function clampSpot(x, y) {
    return { x: Math.max(FX0, Math.min(FX1, x)), y: Math.max(FY0, Math.min(FY1, y)) };
  }
  function farSpot(x, y, d) {
    var p = { x: game.random(FX0, FX1), y: game.random(FY0, FY1) };
    for (var k = 0; k < 14 && dist(p.x, p.y, x, y) < d; k++) p = { x: game.random(FX0, FX1), y: game.random(FY0, FY1) };
    return p;
  }
  function makeFrog(kind, x, y) {
    return { kind: kind, x: x, y: y, st: 'sit', t: 0, dur: 1, fx: x, fy: y, tx: x, ty: y, cd: 0.3, ad: 0.38, flash: 0, face: 1, gone: false };
  }
  function startHop(f, tx, ty, crouch) {
    var p = clampSpot(tx, ty);
    if (dist(p.x, p.y, f.x, f.y) < 140) p = clampSpot(f.x - (tx - f.x), f.y - (ty - f.y));
    f.st = 'crouch'; f.t = 0; f.cd = crouch; f.fx = f.x; f.fy = f.y; f.tx = p.x; f.ty = p.y;
    f.face = p.x >= f.x ? 1 : -1;
  }

  function initGame() {
    clock = TIME_LIMIT; caught = 0; touches = 0; totalTouches = 0; misses = 0; score = 0;
    combo = 0; maxCombo = 0; lastTouch = -9; spawnT = 0;
    hitStop = 0; hitFrog = null; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; girlX = W * 0.4; girlPose = 0; celebT = 0;
    ripples = [];
    frogs = [];
    gold = makeFrog('gold', W * 0.5, H * 0.46);
    gold.dur = LEVELS[0].sit + 0.4;
    frogs.push(gold);
    fillToads();
  }

  function fillToads() {
    var have = 0;
    for (var i = 0; i < frogs.length; i++) if (frogs[i].kind === 'toad' && !frogs[i].gone) have++;
    for (var k = have; k < lv().toads; k++) {
      var p = farSpot(gold ? gold.x : W / 2, gold ? gold.y : H / 2, 240);
      var t = makeFrog('toad', p.x, p.y);
      t.dur = game.random(0.3, 1.4);
      frogs.push(t);
    }
  }

  function nextGold() {
    var p = farSpot(girlX, H * 0.8, 380);
    gold = makeFrog('gold', p.x, p.y);
    gold.dur = lv().sit + 0.35; gold.flash = 0.3;
    frogs.push(gold);
    touches = 0;
    ripples.push({ x: p.x, y: p.y + 30, t: 0, col: C.gold });
    game.fx.burst(p.x, p.y, { color: C.gold, count: 10, speed: 220 });
    fillToads();
  }

  // ── 蛙の動き(実プレイとデモ共通) ─────────────────────────────
  function stepFrogs(dt, real) {
    var L = lv();
    for (var i = 0; i < frogs.length; i++) {
      var f = frogs[i];
      if (f.gone) continue;
      f.t += dt;
      if (f.flash > 0) f.flash -= dt;
      if (f.st === 'sit') {
        if (f.t >= f.dur) {
          if (f.kind === 'gold') {
            var a = game.random(0, Math.PI * 2);
            startHop(f, f.x + Math.cos(a) * L.hop, f.y + Math.sin(a) * L.hop * 0.7, 0.3);
          } else if (gold && !gold.gone && Math.random() < 0.55) {
            var b = game.random(0, Math.PI * 2), r = game.random(140, 220);
            startHop(f, gold.tx + Math.cos(b) * r, gold.ty + Math.sin(b) * r * 0.7, 0.32);
          } else {
            startHop(f, game.random(FX0, FX1), game.random(FY0, FY1), 0.32);
          }
        }
      } else if (f.st === 'crouch') {
        if (f.t >= f.cd) {
          f.st = 'air'; f.t = 0; f.ad = L.air;
          if (f.kind === 'gold') game.audio.play('se_jump', real ? 0.22 : 0.1);
        }
      } else if (f.st === 'air') {
        var p = Math.min(1, f.t / f.ad);
        f.x = f.fx + (f.tx - f.fx) * p; f.y = f.fy + (f.ty - f.fy) * p;
        if (p >= 1) {
          f.st = 'sit'; f.t = 0;
          f.dur = f.kind === 'gold' ? L.sit * game.random(0.85, 1.15) : game.random(0.8, 1.7);
          ripples.push({ x: f.x, y: f.y + 30, t: 0, col: f.kind === 'gold' ? C.gold : C.pale });
        }
      } else if (f.st === 'caught') {
        var q = Math.min(1, f.t / 0.45);
        f.x = f.fx + (BASKET_X - f.fx) * q;
        f.y = f.fy + (BASKET_Y - 40 - f.fy) * q - Math.sin(Math.PI * q) * 220;
        if (q >= 1) f.gone = true;
      }
    }
    for (var j = ripples.length - 1; j >= 0; j--) {
      ripples[j].t += dt;
      if (ripples[j].t > 0.6) ripples.splice(j, 1);
    }
  }

  function touchGold(x, y, real) {
    var now = game.time.elapsed;
    combo = now - lastTouch < 1.4 ? Math.min(4, combo + 1) : 1;
    lastTouch = now;
    touches++;
    gold.flash = 0.16;
    girlPose = 0.22;
    if (real) {
      totalTouches++;
      score += 100 * combo;
      if (combo > maxCombo) maxCombo = combo;
      if (combo === 3) { game.fx.popup('COMBO x3', W / 2, H * 0.22, { color: C.gold, size: 60 }); game.audio.play('se_milestone', 0.3); }
    }
    game.feedback.good(gold.x, gold.y - 50, { text: combo >= 2 ? 'x' + combo : 'NICE', color: C.gold });
    if (touches >= TOUCH_NEED) { catchGold(real); return; }
    var L = lv();
    var ang = Math.atan2(gold.y - y, gold.x - x) + game.random(-0.6, 0.6);
    if (dist(x, y, gold.x, gold.y) < 12) ang = game.random(0, Math.PI * 2);
    startHop(gold, gold.x + Math.cos(ang) * L.hop * 1.15, gold.y + Math.sin(ang) * L.hop * 0.8, 0.1);
  }

  function catchGold(real) {
    gold.st = 'caught'; gold.t = 0; gold.fx = gold.x; gold.fy = gold.y;
    game.audio.play('se_coin', 0.45);
    game.fx.burst(gold.x, gold.y, { color: C.gold, count: 18, speed: 380 });
    if (real) {
      caught++;
      score += 300;
      if (caught === 2) { game.fx.popup('NICE', W / 2, H * 0.3, { color: C.gold, size: 80 }); game.audio.play('se_milestone', 0.45); }
      if (caught >= NEEDED) { finish(true); return; }
    }
    spawnT = 0.55;
  }

  function hitToad(f, real) {
    hitStop = 0.4; hitFrog = f; f.flash = 0.4;
    badPending = { x: f.x, y: f.y - 40, real: real, f: f };
    combo = 0;
    game.audio.tone('C3', 0.14, { wave: 'square', volume: 0.12 });
    game.fx.flash('#ffffff', 0.12);
  }

  function resolveBad() {
    var b = badPending;
    badPending = null; hitFrog = null;
    if (!b) return;
    game.feedback.bad(b.x, b.y, { text: 'MISS' });
    var a = game.random(0, Math.PI * 2);
    startHop(b.f, b.f.x + Math.cos(a) * 320, b.f.y + Math.sin(a) * 220, 0.2);
    if (b.real) {
      misses++;
      if (misses >= MISS_MAX) finish(false);
    }
  }

  function tapAt(x, y, real) {
    if (gold && !gold.gone && gold.st !== 'air' && gold.st !== 'caught' && dist(x, y, gold.x, gold.y - 20) <= GOLD_R) {
      touchGold(x, y, real);
      return;
    }
    for (var i = 0; i < frogs.length; i++) {
      var f = frogs[i];
      if (f.kind === 'toad' && !f.gone && f.st !== 'air' && dist(x, y, f.x, f.y - 20) <= TOAD_R) { hitToad(f, real); return; }
    }
    ripples.push({ x: x, y: y, t: 0, col: C.pale });
    var near = gold && !gold.gone && dist(x, y, gold.x, gold.y) < GOLD_R * 2.2;
    game.audio.tone(near ? 'E5' : 'B4', 0.05, { wave: 'triangle', volume: 0.07 });
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score + (ok ? Math.round(Math.max(0, clock) * 20) : 0);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (!ok && gold && !gold.gone) gold.flash = 0.6;
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { frogs: caught, touches: totalTouches, misses: misses, maxCombo: maxCombo };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 金蛙を輪へ先回りして3回おさえ、最後にイボ蛙を触ってMISS ──
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.8, press: 0, wait: 0.5, plan: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.plan = 0; demo.wait = 0.6; }
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else {
      stepFrogs(dt, false);
      if (spawnT > 0) { spawnT -= dt; if (spawnT <= 0) nextGold(); }
    }
    var target = null;
    if (cyc > 5.8 && demo.plan === 0) {
      for (var i = 0; i < frogs.length; i++) if (frogs[i].kind === 'toad' && frogs[i].st === 'sit') { target = frogs[i]; break; }
    } else if (gold && !gold.gone && gold.st !== 'caught') target = gold;
    if (target) {
      var aimX = target.st === 'sit' ? target.x : target.tx, aimY = (target.st === 'sit' ? target.y : target.ty) - 20;
      demo.gx += (aimX - demo.gx) * Math.min(1, dt * 7);
      demo.gy += (aimY - demo.gy) * Math.min(1, dt * 7);
    } else {
      demo.gx += (W * 0.5 - demo.gx) * Math.min(1, dt * 3);
      demo.gy += (H * 0.78 - demo.gy) * Math.min(1, dt * 3);
    }
    demo.press = Math.max(0, demo.press - dt);
    demo.wait -= dt;
    if (target && target.st === 'sit' && hitStop <= 0 && demo.wait <= 0 && dist(demo.gx, demo.gy, target.x, target.y - 20) < 46) {
      demo.press = 0.18; demo.wait = 0.4;
      if (target.kind === 'toad') { demo.plan = 1; hitToad(target, false); } else touchGold(demo.gx, demo.gy, false);
    }
    girlX += ((gold && !gold.gone ? gold.x : W / 2) * 0.5 + W * 0.2 - girlX) * Math.min(1, dt * 2);
    if (girlPose > 0) girlPose -= dt;
  }

  // ── 描画 ─────────────────────────────────────────────────────
  function drawGrove() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.dark], [0.22, C.mid], [0.75, '#16382a'], [1, C.dark]]);
    for (var i = 0; i < 9; i++) {
      var bx = 60 + i * 120 + Math.sin(t * 0.6 + i) * 3;
      game.draw.rect(bx, 0, 24, H * 0.74, C.mid, 0.9);
      for (var n = 1; n < 9; n++) game.draw.rect(bx - 2, n * 150 + (i % 3) * 30, 28, 8, C.leaf, 0.5);
    }
    var nearX = [20, 150, W - 190, W - 60];
    for (var j = 0; j < nearX.length; j++) {
      var nx = nearX[j] + Math.sin(t * 0.8 + j * 1.7) * 6;
      game.draw.rect(nx, 0, 44, H * 0.8, C.leaf);
      game.draw.rect(nx + 6, 0, 8, H * 0.8, C.pale, 0.35);
      for (var m = 1; m < 8; m++) game.draw.rect(nx - 4, m * 190 + j * 40, 52, 12, C.pale, 0.7);
      game.draw.sprite(LEAF, { l: C.leaf }, nx + 50, 260 + j * 90, 14, { anchor: 'center' });
    }
    game.draw.rect(0, H * 0.24, W, 4, C.leaf, 0.3);
    for (var p = 0; p < PUDDLES.length; p++) {
      var pd = PUDDLES[p];
      ellipse(pd.x, pd.y + 36, pd.rx, pd.ry, C.pale, 0.16 + 0.04 * Math.sin(t * 2 + p));
    }
    game.draw.sprite(SHOOT, { p: C.pale, l: C.leaf }, W * 0.12, H * 0.72, 14, { anchor: 'center' });
    game.draw.sprite(SHOOT, { p: C.pale, l: C.leaf }, W * 0.9, H * 0.7, 12, { anchor: 'center' });
    for (var d = 0; d < DROPS.length; d++) {
      var dr = DROPS[d];
      var yy = ((dr.s * H) + t * dr.v) % H;
      game.draw.line(dr.x, yy, dr.x - 6, yy + 30, C.pale, 3);
    }
  }

  function drawMarkers() {
    for (var i = 0; i < frogs.length; i++) {
      var f = frogs[i];
      if (f.gone || (f.st !== 'crouch' && f.st !== 'air')) continue;
      var blink = Math.floor(game.time.elapsed * 14) % 2 === 0;
      if (f.kind === 'gold') ringLines(f.tx, f.ty + 30, 64, 24, blink ? C.gold : C.cream, 6, false);
      else ringLines(f.tx, f.ty + 30, 58, 22, blink ? C.red : '#802a20', 5, true);
    }
    for (var j = 0; j < ripples.length; j++) {
      var r = ripples[j], k = r.t / 0.6;
      ringLines(r.x, r.y, 30 + k * 90, 10 + k * 30, r.col, 4, false);
    }
  }

  function drawFrog(f) {
    if (f.gone) return;
    var t = game.time.elapsed;
    var isGold = f.kind === 'gold';
    var h = 0;
    if (f.st === 'air') h = Math.sin(Math.PI * Math.min(1, f.t / f.ad)) * 130;
    if (f.st !== 'caught') ellipse(f.x, f.y + 36, 50 - h * 0.15, 15, C.dark, 0.55);
    var spr;
    if (f.st === 'air' || f.st === 'caught') spr = isGold ? FROG_AIR : TOAD_AIR;
    else if (f.st === 'crouch') spr = isGold ? FROG_B : TOAD_B;
    else spr = Math.floor((t + f.x * 0.003) * 3) % 2 === 0 ? (isGold ? FROG_A : TOAD_A) : (isGold ? FROG_B : TOAD_B);
    var pal = isGold ? GOLD_PAL : TOAD_PAL;
    if (f.flash > 0 && Math.floor(t * 20) % 2 === 0) pal = WHITE_PAL;
    var px = f === hitFrog && hitStop > 0 ? 19 : (f.st === 'caught' ? 9 : 14);
    var bob = f.st === 'sit' ? Math.sin(t * 5 + f.x) * 3 : 0;
    var yy = f.y - h + bob + (f.st === 'crouch' ? 6 : 0);
    if (isGold && f.st !== 'caught' && Math.floor(t * 4) % 2 === 0) {
      game.draw.sprite(spr, WHITE_PAL, f.x, yy, 15.8, { anchor: 'center', flipX: f.face < 0, alpha: 0.55 });
    }
    game.draw.sprite(spr, pal, f.x, yy, px, { anchor: 'center', flipX: f.face < 0 });
    if (isGold && f.st !== 'caught') {
      for (var s = 0; s < 3; s++) {
        var a = t * 3 + s * 2.1;
        var sx = f.x + Math.cos(a) * 74, sy = yy + Math.sin(a) * 40;
        game.draw.rect(sx - 3, sy - 9, 6, 18, C.gold, 0.8);
        game.draw.rect(sx - 9, sy - 3, 18, 6, C.gold, 0.8);
      }
      for (var p = 0; p < TOUCH_NEED; p++) {
        var cx = f.x + (p - (TOUCH_NEED - 1) / 2) * 36;
        game.draw.rect(cx - 12, yy - 92, 24, 24, C.dark);
        if (p < touches) game.draw.rect(cx - 8, yy - 88, 16, 16, C.gold);
      }
    }
  }

  function drawGirl(mood) {
    var t = game.time.elapsed;
    var bob = Math.sin(t * 4) * 4;
    var spr = mood === 'sad' ? GIRL_SAD : (girlPose > 0 || mood === 'win') ? GIRL_REACH : (Math.floor(t * 3) % 2 === 0 ? GIRL_A : GIRL_B);
    var jump = mood === 'win' ? Math.abs(Math.sin(t * 7)) * 60 : 0;
    ellipse(girlX, H * 0.9, 80, 18, C.dark, 0.6);
    game.draw.sprite(spr, GIRL_PAL, girlX, H * 0.84 + bob - jump, 13, { anchor: 'center', flipX: (gold && gold.x < girlX) });
    ellipse(BASKET_X, BASKET_Y + 56, 100, 16, C.dark, 0.6);
    game.draw.sprite(BASKET, BASKET_PAL, BASKET_X, BASKET_Y + 20, 13, { anchor: 'center' });
    var n = state === S.ATTRACT ? 1 : caught;
    for (var i = 0; i < n; i++) {
      game.draw.sprite(FROG_A, GOLD_PAL, BASKET_X - 50 + i * 50, BASKET_Y - 12 + Math.sin(t * 6 + i) * 3, 5, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, C.dark, 0.78);
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(FROG_A, i < caught ? GOLD_PAL : { w: C.leaf, k: C.mid, g: C.mid, d: C.dark, y: C.leaf }, 90 + i * 92, 80, 7, { anchor: 'center' });
    }
    for (var m = 0; m < MISS_MAX; m++) {
      game.draw.sprite(LEAF, { l: m < MISS_MAX - misses ? C.pale : C.mid }, W - 90 - m * 80, 80, 22, { anchor: 'center' });
    }
    say(caught + ' / ' + NEEDED, W * 0.5, 72, 60, C.cream);
    say('SCORE ' + score, W * 0.5, 132, 32, C.pale);
    var frac = Math.max(0, clock / TIME_LIMIT);
    var low = clock < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 176, W - 140, 22, C.mid);
    game.draw.rect(70, 176, (W - 140) * frac, 22, low ? C.red : C.gold);
  }

  function scanlines() {
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.12);
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0) { game.audio.tone('G3', 0.04, { wave: 'triangle', volume: 0.05 }); return; }
    tapAt(x, y, true);
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawGrove();
      drawMarkers();
      var order = frogs.slice().sort(function (a, b) { return a.y - b.y; });
      for (var i = 0; i < order.length; i++) drawFrog(order[i]);
      drawGirl('');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.14, C.dark, 0.6);
      say(TITLE, W * 0.5, H * 0.06, 92, C.gold);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.11, 38, C.cream);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.955, 48, C.gold);
      else say('TAP TO START', W * 0.5, H * 0.955, 42, C.cream);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawGrove();
      drawGirl(won ? 'win' : 'sad');
      game.draw.rect(90, H * 0.2, W - 180, 560, C.dark, 0.85);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 104, won ? C.gold : C.red);
      say(caught + ' / ' + NEEDED, W * 0.5, H * 0.32, 70, C.cream);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 50, C.cream);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 40, C.pale);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.gold); }
      else if (!won) say(caught < NEEDED - 1 ? 'あと' + (NEEDED - caught) + '匹!' : 'あと' + Math.max(1, TOUCH_NEED - touches) + '回!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.95, 40, C.cream);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt;
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(150, W - 150), game.random(H * 0.25, H * 0.65), { color: Math.random() < 0.5 ? C.gold : C.cream, count: 14, speed: 420 });
      }
      if (endT <= 0) { state = S.RESULT; resultT = 0; }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.35);
    } else {
      stepFrogs(dt, true);
      if (spawnT > 0) { spawnT -= dt; if (spawnT <= 0) nextGold(); }
      clock -= dt;
      if (clock <= 0) {
        clock = 0;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }
    girlX += ((gold && !gold.gone ? gold.x : W / 2) * 0.5 + W * 0.2 - girlX) * Math.min(1, dt * 2);
    if (girlPose > 0) girlPose -= dt;

    drawGrove();
    drawMarkers();
    var ord = frogs.slice().sort(function (a, b) { return a.y - b.y; });
    for (var k = 0; k < ord.length; k++) drawFrog(ord[k]);
    drawGirl(done ? (won ? 'win' : 'sad') : '');
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.2 + 120, 100, C.gold);
      game.draw.hand(gold.x + 10, gold.y - 10, { press: ready < 0.4, scale: 14 });
    }
    scanlines();
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1], ['A4', 0.5], ['G4', 0.5],
      ['A4', 1], ['R', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 1], ['C5', 1],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true, bass: [['A2', 2], ['F2', 2], ['G2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
