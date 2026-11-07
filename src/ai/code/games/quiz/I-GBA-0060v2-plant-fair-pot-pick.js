// I-GBA-0060v2-plant-fair-pot-pick.js
// 苗くらべ — 2鉢ずつ差し出される苗の、背の高い方を瞬時に選んで先に棚へ並べる
// 操作: 左右に並んだ2鉢のうち、苗そのものが大きい方の側(画面の左半分/右半分)をタップ。鉢の大きさや木箱の台にだまされない
// 終わり: 7組を並べ終えた時点でハートが残っていればCLEAR。小さい方を選ぶ/迷って時間切れになるとハートを1つ失い、2つ失う/15秒経過でGAME OVER
// @mechanic: size_judge
// @theme: garden_fair_seedling_compare
// 世界観: 植木市の苗売り場で、園芸店員が荷車から2鉢ずつ降ろされる苗を見比べ、大きい方を先に棚へ並べて大きい順の列をつくっていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく並べた組数・最速の判断時間・スコア
// スタイル: 70s MONO

(function (game) {
  var STYLE = { bg: ['#000000', '#0a0c0a', '#141814'], main: ['#f2f2ea', '#9a9a92', '#4a4a46'], accent: ['#ffb020', '#40ff70'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var BLACK = STYLE.bg[0], NIGHT = STYLE.bg[1], DIM = STYLE.bg[2];
  var WHITE = STYLE.main[0], GRAY = STYLE.main[1], DARK = STYLE.main[2];
  var AMBER = STYLE.accent[0], GREEN = STYLE.accent[1];
  var CYAN = '#40e0ff', MAGENTA = '#ff40c0';

  var TITLE = 'SEEDLINGS';
  var TIME_LIMIT = 15;
  var HEARTS = 2;
  var TABLE_Y = H * 0.62;
  var LX = W * 0.3, RX = W * 0.7;
  // l/r: 苗の大きさ(ドット倍率) pl/pr: 鉢の大きさ cl/cr: 木箱の高さ win: 判断の猶予
  var PAIRS = [
    { l: 24, r: 15, pl: 12, pr: 12, cl: 0, cr: 0, win: 2.0 },
    { l: 15, r: 22, pl: 12, pr: 12, cl: 0, cr: 0, win: 1.9 },
    { l: 18, r: 23, pl: 17, pr: 10, cl: 0, cr: 0, win: 1.8 },
    { l: 22, r: 18, pl: 9, pr: 16, cl: 0, cr: 0, win: 1.65 },
    { l: 20, r: 23, pl: 12, pr: 12, cl: 120, cr: 0, win: 1.5 },
    { l: 22, r: 20, pl: 12, pr: 11, cl: 0, cr: 130, win: 1.35 },
    { l: 23, r: 25, pl: 15, pr: 10, cl: 110, cr: 0, win: 1.2 },
  ];
  var DEMO_PAIRS = [PAIRS[0], PAIRS[4]];

  var SPROUT = ['...w...', '..www..', '.w.w.w.', 'ww.w.ww', '...w...', '.w.w.w.', 'ww.w.ww', '...w...', '...w...'];
  var POT = ['wwwwwwww', '.w....w.', '.w....w.', '..w..w..', '..wwww..'];
  var CLERK = [
    ['..wwww..', '.wwwwww.', '.w.ww.w.', '..wwww..', '...ww...', '.wwwwww.', 'w.wwww.w', 'w.wwww.w', '..wwww..', '..w..w..', '..w..w..', '.ww..ww.'],
    ['..wwww..', '.wwwwww.', '.w.ww.w.', '..wwww..', 'w..ww..w', '.wwwwww.', '..wwww..', '..wwww..', '..wwww..', '..w..w..', '.w....w.', 'ww....ww'],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var pi, phase, winT, picked, flyT, revealT, enterT, correct, misses, hearts, score, fastest, shelf, timeLeft;
  var ready, over, won, endT, resT, sent, prevBest, point;

  function pairs() { return state === S.PLAYING ? PAIRS : DEMO_PAIRS; }
  function cur() { var ps = pairs(); return ps[Math.min(pi, ps.length - 1)]; }

  function initGame() {
    pi = 0; phase = 'show'; winT = PAIRS[0].win; picked = 0; flyT = 0; revealT = 0; enterT = 0.3;
    correct = 0; misses = 0; hearts = HEARTS; score = 0; fastest = 9; shelf = []; timeLeft = TIME_LIMIT;
    ready = 0.8; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0; point = 0;
  }

  function bigSide(p) { return p.l > p.r ? -1 : 1; }

  // ── 選ぶ(プレイ・デモ共通) ──
  function choose(side, vol) {
    var v = vol || 1;
    point = side;
    if (phase !== 'show' || enterT > 0) { game.audio.tone(220, 0.03, { wave: 'square', volume: 0.03 * v }); return; }
    var p = cur();
    picked = side;
    var tookT = p.win - winT;
    if (side === bigSide(p)) {
      correct++;
      if (tookT < fastest) fastest = tookT;
      var fast = tookT < 0.6;
      if (state === S.PLAYING) score += 100 + Math.floor(winT * 120) + (fast ? 100 : 0);
      game.feedback.good(side < 0 ? LX : RX, TABLE_Y - 330, { text: fast ? 'PERFECT' : 'GOOD', color: GREEN, count: 12, volume: 0.5 * v });
      game.audio.tone(988, 0.08, { wave: 'square', volume: 0.06 * v });
      shelf.push({ big: Math.max(p.l, p.r), small: Math.min(p.l, p.r), ok: true });
      if (state === S.PLAYING && correct === 4) { game.fx.popup('4 / ' + PAIRS.length, W / 2, H * 0.3, { color: AMBER, size: 72 }); game.audio.play('se_milestone', 0.4); }
      phase = 'fly'; flyT = 0.45;
    } else {
      game.audio.tone(140, 0.25, { wave: 'square', volume: 0.08 * v });
      game.fx.flash(WHITE, 0.12);
      phase = 'reveal'; revealT = 0.5;
    }
  }

  function afterReveal(vol) {
    var p = cur();
    misses++;
    game.feedback.bad(bigSide(p) < 0 ? LX : RX, TABLE_Y - 330, { text: 'MISS', volume: 0.6 * vol });
    shelf.push({ big: Math.max(p.l, p.r), small: Math.min(p.l, p.r), ok: false });
    if (state === S.PLAYING) {
      hearts--;
      game.audio.play('se_break', 0.3);
      if (hearts <= 0) { finish(false); return; }
    }
    phase = 'fly'; flyT = 0.45;
  }

  function nextPair() {
    pi++;
    if (pi >= pairs().length) {
      if (state === S.PLAYING) finish(true);
      return;
    }
    phase = 'show'; winT = cur().win; picked = 0; enterT = 0.3; point = 0;
    game.audio.tone(660, 0.05, { wave: 'square', volume: 0.04 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 30);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.3 + (i % 2) * 0.1), { color: i % 2 ? GREEN : AMBER, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { correct: correct, misses: misses, fastestMs: fastest < 9 ? Math.round(fastest * 1000) : 0 };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    choose(x < W / 2 ? -1 : 1, 1);
  });

  // ── 描画 ──
  function plantTop(side, p) {
    var px = side < 0 ? p.l : p.r, pp = side < 0 ? p.pl : p.pr, crate = side < 0 ? p.cl : p.cr;
    var base = TABLE_Y - crate;
    var soil = base - pp * 5;
    return { base: base, soil: soil, top: soil - px * 9, px: px, pp: pp, crate: crate };
  }

  function drawStall() {
    game.draw.gradient(0, H, [BLACK, NIGHT, DIM, BLACK]);
    // 遠景: 白い点線のテント
    for (var t = 0; t < 4; t++) {
      var tx = t * 280 - 20;
      for (var k = 0; k < 14; k++) {
        game.draw.rect(tx + k * 10, H * 0.33 - k * 5, 4, 4, GRAY);
        game.draw.rect(tx + 280 - k * 10, H * 0.33 - k * 5, 4, 4, GRAY);
      }
    }
    // 棚(上)と台(中)
    game.draw.rect(W * 0.05, H * 0.235, W * 0.9, 6, WHITE);
    for (var d = 0; d < W; d += 16) game.draw.rect(d, TABLE_Y, 8, 6, WHITE);
    game.draw.rect(0, TABLE_Y + 10, W, 4, GRAY);
  }

  function drawShelf() {
    for (var i = 0; i < 7; i++) {
      var sx = W * 0.1 + i * W * 0.12;
      game.draw.rect(sx - 4, H * 0.235 - 6, 8, 6, GRAY);
      var s = shelf[i];
      if (!s) continue;
      game.draw.sprite(SPROUT, { w: WHITE }, sx - 20, H * 0.235 - s.big * 9 / 6 / 2, Math.max(2, Math.round(s.big / 6)), { anchor: 'center' });
      game.draw.sprite(SPROUT, { w: GRAY }, sx + 22, H * 0.235 - s.small * 9 / 6 / 2, Math.max(2, Math.round(s.small / 6)), { anchor: 'center' });
      if (!s.ok) { game.draw.line(sx - 40, H * 0.2, sx + 40, H * 0.23, MAGENTA, 6); game.draw.line(sx + 40, H * 0.2, sx - 40, H * 0.23, MAGENTA, 6); }
    }
  }

  function drawPlant(side, p, hl, fly) {
    var g = plantTop(side, p);
    var x = side < 0 ? LX : RX;
    var dy = enterT > 0 ? enterT * 900 : 0;
    var alpha = 1;
    if (fly > 0) {
      var k = 1 - fly / 0.45;
      var slot = W * 0.1 + Math.min(6, shelf.length - 1) * W * 0.12 + (side === bigSide(p) ? -20 : 22);
      x += (slot - x) * k;
      dy -= (g.top - H * 0.15) * k;
      alpha = 1 - k * 0.8;
    }
    var sway = Math.sin(game.time.elapsed * 2 + side) * 3;
    if (g.crate) {
      game.draw.rect(x - 110, g.base + dy, 220, 6, WHITE);
      game.draw.rect(x - 110, TABLE_Y - 6 + dy, 220, 6, WHITE);
      game.draw.line(x - 110, g.base + dy, x + 110, TABLE_Y + dy, GRAY, 5);
      game.draw.line(x + 110, g.base + dy, x - 110, TABLE_Y + dy, GRAY, 5);
      game.draw.rect(x - 110, g.base + dy, 6, g.crate, WHITE);
      game.draw.rect(x + 104, g.base + dy, 6, g.crate, WHITE);
    }
    game.draw.sprite(POT, { w: hl ? WHITE : GRAY }, x, g.base - g.pp * 2.5 + dy, g.pp, { anchor: 'center', alpha: alpha });
    var sc = hl ? g.px * (1 + hl * 0.15) : g.px;
    game.draw.sprite(SPROUT, { w: WHITE }, x + sway, g.soil - sc * 4.5 + dy, Math.round(sc), { anchor: 'center', alpha: alpha });
    if (hl) game.draw.circle(x, g.soil - g.px * 4.5 + dy, g.px * 5, WHITE, hl * 0.4);
  }

  function drawMeasure(p, k) {
    // 納得の根拠: 土から先端までの高さを物差しで見せる
    for (var s = -1; s <= 1; s += 2) {
      var g = plantTop(s, p);
      var x = (s < 0 ? LX : RX) + 140;
      var on = s === bigSide(p);
      var blink = on && Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.rect(x - 4, g.top, 8, g.soil - g.top, on ? (blink ? WHITE : GREEN) : GRAY, k);
      game.draw.rect(x - 20, g.top - 3, 40, 6, on ? WHITE : GRAY, k);
      game.draw.rect(x - 20, g.soil - 3, 40, 6, on ? WHITE : GRAY, k);
    }
  }

  function drawClerk() {
    var fr = CLERK[phase === 'fly' ? 1 : Math.floor(game.time.elapsed * 2) % 2];
    var x = W / 2 + point * 60;
    game.draw.sprite(fr, { w: WHITE }, x, H * 0.735 + Math.sin(game.time.elapsed * 3) * 4, 14, { anchor: 'center', flipX: point < 0 });
  }

  function drawPads() {
    for (var s = -1; s <= 1; s += 2) {
      var x = s < 0 ? LX : RX;
      var live = phase === 'show' && enterT <= 0;
      for (var a = 0; a < 24; a++) {
        var ang = a / 24 * Math.PI * 2 + game.time.elapsed * (live ? 1.5 : 0.3);
        game.draw.rect(x + Math.cos(ang) * 120 - 5, H * 0.875 + Math.sin(ang) * 70 - 5, 10, 10, live ? WHITE : DARK);
      }
      game.draw.sprite(SPROUT, { w: live ? WHITE : DARK }, x, H * 0.875, 8, { anchor: 'center' });
    }
  }

  function drawTimer(p) {
    // 判断の残り時間: 縮む点線バー
    var fr = Math.max(0, winT / p.win);
    var w = (W - 240) * fr;
    for (var d = 0; d < w; d += 20) game.draw.rect(120 + d, TABLE_Y + 40, 12, 18, fr < 0.35 ? WHITE : GRAY);
  }

  function bands() {
    // セロハンの帯: 上=琥珀 / 棚=水色 / 台=緑 / 下=桃
    game.draw.rect(0, 0, W, H * 0.13, AMBER, 0.3);
    game.draw.rect(0, H * 0.13, W, H * 0.13, CYAN, 0.22);
    game.draw.rect(0, H * 0.26, W, H * 0.42, GREEN, 0.2);
    game.draw.rect(0, H * 0.68, W, H * 0.32, MAGENTA, 0.16);
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, BLACK, 0.25);
  }

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x, y, { size: sz, color: col || WHITE, bold: true, align: 'center', font: 'monospace' });
  }

  function drawHud() {
    txt(correct + ' / ' + PAIRS.length, W * 0.18, 90, 56);
    txt(String(score), W / 2, 90, 56);
    for (var h = 0; h < HEARTS; h++) game.draw.sprite(SPROUT, { w: h < hearts ? WHITE : DARK }, W - 90 - h * 90, 90, 7, { anchor: 'center' });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    for (var d = 0; d < (W - 120) * fr; d += 16) game.draw.rect(60 + d, 176, 10, 20, WHITE);
  }

  // ── ATTRACT デモ: 1組目は大きい方を即答 → 2組目は木箱の台にだまされて MISS ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: 0, done1: false, done2: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      pi = 0; phase = 'show'; winT = DEMO_PAIRS[0].win; picked = 0; enterT = 0.3; shelf = []; point = 0;
      demo.done1 = false; demo.done2 = false;
    }
    var tx = W / 2, ty = H * 0.8;
    if (pi === 0 && phase === 'show') { tx = LX; ty = TABLE_Y - 200; }
    if (pi === 1 && phase === 'show') { tx = LX; ty = TABLE_Y - 300; }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
    if (!demo.done1 && cyc > 0.9) { demo.done1 = true; demo.press = 0.12; choose(-1, 0.35); }
    if (!demo.done2 && cyc > 2.5 && pi === 1) { demo.done2 = true; demo.press = 0.12; choose(-1, 0.35); }
    if (demo.press > 0) demo.press -= dt;
  }

  function tick(dt, vol) {
    if (enterT > 0) { enterT = Math.max(0, enterT - dt); return; }
    if (phase === 'show') {
      winT -= dt;
      if (winT <= 0.6 && winT + dt > 0.6) game.audio.tone(440, 0.05, { wave: 'square', volume: 0.04 * vol });
      if (winT <= 0) { winT = 0; picked = 0; phase = 'reveal'; revealT = 0.5; game.audio.tone(140, 0.25, { wave: 'square', volume: 0.08 * vol }); }
    } else if (phase === 'reveal') {
      revealT -= dt;
      if (revealT <= 0) afterReveal(vol);
    } else if (phase === 'fly') {
      flyT -= dt;
      if (flyT <= 0) {
        if (state === S.PLAYING) nextPair();
        else if (pi === 0) { pi = 1; phase = 'show'; winT = DEMO_PAIRS[1].win + 1; enterT = 0.3; picked = 0; }
        else phase = 'wait';
      }
    }
  }

  function drawPair() {
    if (phase === 'wait') return;
    var p = cur();
    var hl = phase === 'reveal' ? Math.max(0, revealT / 0.5) : 0;
    var fly = phase === 'fly' ? flyT : 0;
    drawPlant(-1, p, bigSide(p) < 0 ? hl : 0, fly);
    drawPlant(1, p, bigSide(p) > 0 ? hl : 0, fly);
    if (phase === 'reveal') drawMeasure(p, 1);
    if (phase === 'show') drawTimer(p);
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      tick(dt, 0.35);
      drawStall();
      drawShelf();
      drawPair();
      drawClerk();
      drawPads();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, H * 0.07, 96, WHITE);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 40, WHITE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44);
      else txt('INSERT COIN', W / 2, H * 0.965, 38);
      bands();
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      drawStall();
      drawShelf();
      drawClerk();
      game.draw.rect(60, H * 0.28, W - 120, H * 0.26, BLACK, 0.85);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.32, 104);
      txt('SCORE ' + score, W / 2, H * 0.38, 56);
      txt(correct + ' / ' + PAIRS.length + '   ' + (fastest < 9 ? fastest.toFixed(2) : '-') + '秒', W / 2, H * 0.425, 42, GRAY);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.47, 58);
      else txt('BEST ' + Math.max(prevBest, score), W / 2, H * 0.47, 40, GRAY);
      if (!won) txt('あと' + (PAIRS.length - correct) + '組!', W / 2, H * 0.515, 56);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 38);
      bands();
      return;
    }

    // ── PLAYING ──
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      timeLeft -= dt;
      tick(dt, 1);
      if (!over && timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' });
        finish(false);
      }
    }

    drawStall();
    drawShelf();
    if (!over) drawPair();
    drawClerk();
    drawPads();
    drawHud();
    if (pi === 0 && phase === 'show' && ready <= 0 && enterT <= 0) game.draw.hand(LX, TABLE_Y - 200, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 13, alpha: 0.6 });
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, WHITE);
    bands();
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.25], ['R', 0.75], ['G4', 0.25], ['R', 0.75], ['A4', 0.25], ['R', 0.25], ['C5', 0.25], ['R', 1.25],
      ['E5', 0.25], ['R', 0.75], ['D5', 0.25], ['R', 0.75], ['C5', 0.5], ['R', 1.5],
    ], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
