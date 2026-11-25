// I-DS-0028v3-tanzaku-crease-pinch-tear.js
// 色紙の短冊さき — 折り筋の両脇を2本指で同時につまみ、引き離す速さを加減して色紙を筋どおりに奥までまっすぐ裂く
// 操作: 色紙の手前の縁、星印の折り筋の両脇に光る2つの点へ2本の指を同時に置いてつまむ(片方だけ先に置いて待つと紙が滑ってやり直し)。そのまま指を左右へ引き離すと筋に沿って奥へ裂けていく。速く引きすぎると筋が赤く光り、裂け目が強く引いた側へそれていく(社内メモ。画面には出さない)
// 終わり: 色紙5枚を筋どおりに裂けばCLEAR。裂け目が筋からそれて色紙を2枚だめにする、または15秒を超えるとGAME OVER
// @mechanic: pinch_zone
// @theme: tanabata_kids_club_paper_strips
// 世界観: 七夕前の公民館の子ども会で、手伝いの子が色紙の折り筋の両脇をつまんで引き分け、向かいで筆を構えて待つ年下の子へ短冊を次々と渡して笹に吊るしていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 裂けた色紙の枚数・まっすぐ裂けた数・スコア
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色・影なし・丸角・大きい余白。判定は色の変化で示す
  var STYLE = { bg: ['#f6efe2', '#efe4cf'], main: ['#e8c89a', '#4a9a6a', '#2e3a4a'], accent: ['#ff5a5f', '#ffffff'] };
  var C = {
    wood: STYLE.main[0], woodDk: '#d6b07c', bamboo: STYLE.main[1], bambooDk: '#2f7a4c', ink: STYLE.main[2],
    red: STYLE.accent[0], white: STYLE.accent[1], gold: '#ffc23a', wall: '#f6efe2', wall2: '#ebdcc2', mute: '#c9b894', skin: '#ffd2a8',
  };

  var GAME_TITLE = 'TANZAKU';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var MISS_MAX = 2;
  var PINCH_WIN = 0.28;
  var ROWS = 60;
  var BOT = Math.round(H * 0.69);
  var DOT_DX = 62;
  // 1枚ごとに: 紙が大きく・薄く(和紙)なり、許される引き速度(vmax)が下がる。星印の筋は真ん中とは限らない
  var SHEETS = [
    { w: 520, h: 600, col: '#ff8a7a', creases: [0], t: 0, need: 340, vmax: 980, tol: 56 },
    { w: 560, h: 630, col: '#ffd84a', creases: [-140, 0, 140], t: 1, need: 360, vmax: 840, tol: 52 },
    { w: 580, h: 650, col: '#7ac8ff', creases: [-150, 0, 150], t: 2, need: 380, vmax: 700, tol: 48, washi: true },
    { w: 600, h: 670, col: '#8ad89a', creases: [-200, -60, 80, 200], t: 1, need: 390, vmax: 630, tol: 46 },
    { w: 600, h: 690, col: '#c8a0ff', creases: [-150, 0, 150], t: 0, need: 400, vmax: 570, tol: 44, washi: true },
    { w: 620, h: 700, col: '#ffc23a', creases: [-140, 0, 140], t: 2, need: 410, vmax: 530, tol: 42, gold: true },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var cfg, attempt, cx, top, fL, fR, pinched, slip, slipT, firstT, spread0, lastS, prog, drift, rows, strain, rateS, veer, maxDrift, phase, phaseT, creakT;
  var done, misses, score, finalScore, perfects, timeLeft, readyT, stopT, stopKind, fin, cleared, postT, joyT, sadT, warnT, playT, hung;

  // 向かいで筆を構えて待つ年下の子(おかっぱ・浴衣)
  var KID_A = ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.hssssssh.', '.hskssksh.', '..ssssss..', '..ssmmss..', '...ssss...', '.yyyyyyyy.', 'yyyywwyyyy', 'sy.yyyy.ys', '...yyyy...'];
  var KID_B = ['...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.hssssssh.', '.hskssksh.', '..ssssss..', '..sssmss..', '...ssss...', '.yyyyyyyy.', 'yyyywwyyyy', 'y.yyyyyy.s', '...yyyy...'];
  var KID_JOY = ['s..hhhh..s', 's.hhhhhh.s', 'shhhhhhhhs', '.hssssssh.', '.hs.ss.sh.', '..ssssss..', '..smmmms..', '...ssss...', '.yyyyyyyy.', '.yyywwyyy.', '..yyyyyy..', '...yyyy...'];
  var KID_SAD = ['..........', '...hhhh...', '..hhhhhh..', '.hhhhhhhh.', '.hssssssh.', '.hskssksh.', '..skkkks..', '...ssss...', '.yyyyyyyy.', 'syyywwyyys', '..yyyyyy..', '...yyyy...'];
  var KID_PAL = { h: '#2e3a4a', s: '#ffd2a8', k: '#2e3a4a', m: '#ff5a5f', y: '#5ab0e8', w: '#ffffff' };
  var STAR = ['...g...', '..ggg..', 'ggggggg', '.ggggg.', '.gg.gg.', 'g.....g'];
  var BRUSH = ['.b', 'b.', 'w.', 'w.'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x, y + 4, { size: sz, color: '#00000022', bold: true, align: 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center' });
  }
  function rrect(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - r * 2, h, col, a);
    game.draw.rect(x, y + r, w, h - r * 2, col, a);
    game.draw.circle(x + r, y + r, r, col, a); game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a); game.draw.circle(x + w - r, y + h - r, r, col, a);
  }

  function openGap() { return Math.min(170, prog * cfg.need * 0.36); }
  function dotPos(side) { return { x: cx + side * (DOT_DX + openGap() / 2), y: BOT - 44 }; }

  function setupSheet(k) {
    attempt = k; cfg = SHEETS[Math.min(k, SHEETS.length - 1)];
    cx = W / 2 + cfg.creases[cfg.t]; top = BOT - cfg.h;
    fL = null; fR = null; pinched = false; slip = false; slipT = 0; firstT = 0;
    spread0 = 0; lastS = 0; prog = 0; drift = 0; rows = []; strain = 0; rateS = 0; veer = 1; maxDrift = 0;
    phase = 'wait'; phaseT = 0; creakT = 0;
  }

  function initGame() {
    done = 0; misses = 0; score = 0; finalScore = 0; perfects = 0; hung = [];
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; playT = 0;
    setupSheet(0);
  }

  // 紙が滑る: 2本目が遅れた/1本だけで待った
  function slipNow() {
    slip = true; slipT = 0.35; pinched = false;
    game.audio.tone('D4', 0.12, { wave: 'triangle', volume: 0.08, slide: -80 });
  }

  function fingerDown(x, y, id) {
    if (phase !== 'wait' && phase !== 'tear') return false;
    var side = 0;
    for (var s = -1; s <= 1; s += 2) {
      var d = dotPos(s);
      if (Math.abs(x - d.x) < 96 && Math.abs(y - d.y) < 120) side = s;
    }
    if (!side || (side < 0 && fL) || (side > 0 && fR)) return false;
    var f = { id: id, x: x, y: y };
    if (side < 0) fL = f; else fR = f;
    var other = side < 0 ? fR : fL;
    if (!other) {
      firstT = game.time.elapsed;
      game.audio.tone(side < 0 ? 'E5' : 'G5', 0.05, { wave: 'triangle', volume: 0.07 });
      return true;
    }
    if (slip) return true;
    if (game.time.elapsed - firstT <= PINCH_WIN) {
      pinched = true; phase = 'tear';
      spread0 = fR.x - fL.x; lastS = spread0; rateS = 0;
      game.audio.play('se_tap', 0.4);
      game.audio.tone('C6', 0.07, { wave: 'square', volume: 0.06 });
      game.fx.burst(fL.x, fL.y, { color: C.white, count: 6, speed: 180 });
      game.fx.burst(fR.x, fR.y, { color: C.white, count: 6, speed: 180 });
    } else slipNow();
    return true;
  }
  function fingerMove(x, y, id) {
    if (fL && fL.id === id) { fL.x = x; fL.y = y; }
    if (fR && fR.id === id) { fR.x = x; fR.y = y; }
  }
  function fingerUp(id) {
    var had = false;
    if (fL && fL.id === id) { fL = null; had = true; }
    if (fR && fR.id === id) { fR = null; had = true; }
    if (had && pinched) { pinched = false; game.audio.tone('A4', 0.04, { wave: 'triangle', volume: 0.05 }); }
    if (!fL && !fR) slip = false;
  }

  function sheetDone() {
    phase = 'done'; phaseT = 0; pinched = false; fL = null; fR = null;
    done++; joyT = 0.8;
    var straight = maxDrift < cfg.tol * 0.4;
    if (straight) perfects++;
    var pts = (straight ? 300 : 150) + (cfg.gold ? 100 : 0);
    score += pts;
    hung.push(cfg.col);
    game.feedback.good(cx, top + 70, { text: straight ? 'PERFECT' : 'GOOD', color: C.gold, size: 64 });
    game.fx.popup('+' + pts, cx + 220, top + 170, { color: C.ink, size: 44 });
    game.audio.play('se_jump', 0.3);
    if (mode === S.PLAYING && done === 3) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, H * 0.2, { color: C.bamboo, size: 84 });
    }
  }

  function ruin() {
    phase = 'ruin'; phaseT = 0; pinched = false; fL = null; fR = null;
    misses++; sadT = 1;
    game.audio.play('se_break', 0.35);
    if (mode === S.PLAYING && misses >= MISS_MAX) {
      stopT = 0.5; stopKind = 'miss';
      game.fx.flash('#ffffff', 0.18);
      return;
    }
    game.feedback.bad(cx + drift, BOT - prog * cfg.h, { text: 'MISS', color: C.red, size: 60 });
  }

  function stepSheet(dt) {
    phaseT += dt;
    if (slipT > 0) slipT -= dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (phase !== 'wait' && phase !== 'tear') return;
    if (!pinched && !slip && (fL ? !fR : !!fR) && game.time.elapsed - firstT > PINCH_WIN) slipNow();
    if (pinched && fL && fR) {
      var sp = fR.x - fL.x, dS = sp - lastS;
      lastS = sp;
      var rate = Math.max(0, dS) / Math.max(dt, 1 / 120);
      rateS += (rate - rateS) * Math.min(1, dt * 14);
      // 速すぎると筋に負担がかかる(strain)。負担が残ったまま引くと、強く引いた側へ裂け目がそれる
      var target = Math.max(0, rateS / cfg.vmax - 1);
      strain += (target - strain) * Math.min(1, dt * 10);
      if (dS > 0) {
        veer = (fR.x - cx) >= (cx - fL.x) ? 1 : -1;
        if (strain > 0.15) drift += veer * (strain - 0.15) * dS * 0.35;
        maxDrift = Math.max(maxDrift, Math.abs(drift));
        prog += dS / cfg.need;
        var r1 = Math.min(ROWS, Math.floor(prog * ROWS));
        for (var r = rows.length; r < r1; r++) rows.push(drift);
        if (Math.random() < 0.35) game.audio.tone(900 + prog * 500 + Math.random() * 120, 0.02, { wave: 'triangle', volume: 0.03 });
      }
      if (Math.abs(drift) > cfg.tol) { ruin(); return; }
      if (prog >= 1) { sheetDone(); return; }
    } else {
      strain = Math.max(0, strain - dt * 2);
      rateS *= 0.8;
    }
    if (strain > 0.15) {
      creakT -= dt;
      if (creakT <= 0) { creakT = 0.09; game.audio.tone(strain > 0.5 ? 'B3' : 'E4', 0.05, { wave: 'sawtooth', volume: 0.05 }); }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = score + (win ? Math.ceil(timeLeft) * 40 + (misses === 0 ? 300 : 0) : 0);
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 7; i++) game.fx.burst(120 + i * 140, H * 0.4 + (i % 2) * 180, { color: SHEETS[i % SHEETS.length].col, count: 18, speed: 520 });
      game.fx.flash(C.white, 0.25);
    }
  }

  function canPlay() { return mode === S.PLAYING && !fin && stopT <= 0 && readyT <= 0; }

  // ---- 入力 ----
  game.onPress(function(x, y, id) {
    if (!canPlay()) return;
    if (!fingerDown(x, y, id)) {
      game.audio.play('se_tap', 0.08);
      game.fx.burst(x, y, { color: C.mute, count: 4, speed: 120 });
    }
  });
  game.onMove(function(x, y, id) { if (canPlay()) fingerMove(x, y, id); });
  game.onRelease(function(x, y, id) { fingerUp(id); });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function room(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.2, STYLE.bg[1]], [0.2, C.wood], [1, '#e2bf8c']]);
    // 壁の輪飾り(遠景)
    for (var i = 0; i < 14; i++) {
      var col = SHEETS[i % SHEETS.length].col;
      game.draw.circle(40 + i * 76, 270 + Math.sin(i * 0.9) * 14 + Math.sin(t * 1.5 + i) * 3, 22, col);
      game.draw.circle(40 + i * 76, 270 + Math.sin(i * 0.9) * 14 + Math.sin(t * 1.5 + i) * 3, 11, STYLE.bg[1]);
    }
    // 机の木目(ベタの帯)
    for (var k = 0; k < 9; k++) game.draw.rect(0, H * 0.2 + 40 + k * 170, W, 6, C.woodDk, 0.5);
  }

  function bambooBranch(t) {
    var bx = W - 78;
    game.draw.rect(bx - 12, 380, 24, H * 0.72, C.bamboo);
    for (var n = 0; n < 6; n++) game.draw.rect(bx - 16, 440 + n * 190, 32, 10, C.bambooDk);
    for (var i = 0; i < NEEDED; i++) {
      var y = 470 + i * 200, sw = Math.sin(t * 2 + i) * 6;
      game.draw.rect(bx - 100, y - 30, 88, 10, C.bambooDk);
      game.draw.circle(bx - 130 + sw * 0.3, y - 34, 26, C.bamboo);
      if (i < hung.length) {
        rrect(bx - 92 + sw, y - 16, 44, 150, 8, hung[i]);
        game.draw.rect(bx - 74 + sw, y + 20, 8, 70, C.ink, 0.5);
      } else {
        rrect(bx - 92 + sw, y - 16, 44, 150, 8, '#00000014');
      }
    }
  }

  function drawKid(t) {
    var fr = sadT > 0 || (fin && !cleared) ? KID_SAD : (joyT > 0 || (fin && cleared)) ? KID_JOY : (Math.floor(t * 2.2) % 2 ? KID_A : KID_B);
    var hop = fin && cleared ? -Math.abs(Math.sin(t * 11)) * 22 : Math.sin(t * 2.6) * 4;
    var kx = W * 0.4, ky = 420 + hop;
    game.draw.sprite(fr, KID_PAL, kx, ky, 13, { anchor: 'center' });
    game.draw.sprite(BRUSH, { b: C.ink, w: '#d8c8a8' }, kx + 82, ky + 30 + Math.sin(t * 5) * 6, 12, { anchor: 'center' });
    // 硯
    rrect(kx + 130, 470, 90, 50, 12, C.ink);
  }

  function drawSheet(t) {
    var big = stopT > 0 && stopKind === 'miss';
    var hot = big && Math.floor(t * 16) % 2 === 0;
    var x0 = W / 2 - cfg.w / 2, x1 = W / 2 + cfg.w / 2, rh = cfg.h / ROWS;
    var open = openGap(), torn = rows.length;
    var sx = slipT > 0 ? Math.sin(slipT * 40) * 14 : 0;
    var fly = phase === 'done' ? Math.min(1, phaseT / 0.45) : 0;
    var col = cfg.col;
    for (var r = 0; r < ROWS; r++) {
      var y = BOT - (r + 1) * rh + fly * -60;
      if (r < torn) {
        var g = open * (1 - r / Math.max(1, torn)) + fly * 260;
        var mid = cx + rows[r] + sx;
        game.draw.rect(x0 + sx - g / 2, y, mid - x0 - sx, rh + 1, col);
        game.draw.rect(mid + g / 2, y, x1 + sx - mid, rh + 1, col);
        game.draw.rect(mid - g / 2 - 5, y, 5, rh + 1, C.white);
        game.draw.rect(mid + g / 2, y, 5, rh + 1, C.white);
      } else {
        game.draw.rect(x0 + sx, y, cfg.w, rh + 1, col);
      }
    }
    if (cfg.washi) for (var d = 0; d < 26; d++) game.draw.rect(x0 + ((d * 97) % cfg.w), top + ((d * 151) % cfg.h), 22, 3, C.white, 0.45);
    if (cfg.gold) for (var g2 = 0; g2 < 6; g2++) game.draw.circle(x0 + 60 + g2 * 95, top + 80 + ((g2 * 131) % (cfg.h - 160)), 5 + Math.sin(t * 6 + g2) * 3, C.white, 0.8);
    if (phase === 'done') return;
    // 折り筋(星印の筋だけが裂ける筋)
    var frontY = BOT - prog * cfg.h;
    for (var c = 0; c < cfg.creases.length; c++) {
      var lx = W / 2 + cfg.creases[c] + sx;
      if (c === cfg.t) continue;
      game.draw.line(lx, top + 6, lx, BOT - 6, '#00000022', 3);
    }
    var warn = strain > 0.15 && Math.floor(t * 14) % 2 === 0;
    var lineCol = hot ? C.white : warn ? C.red : C.white;
    var tipX = cx + drift + sx;
    for (var yy = top + 8; yy < frontY - 4; yy += 28) game.draw.line(cx + sx, yy, cx + sx, Math.min(frontY - 4, yy + 16), lineCol, warn ? 8 : 5);
    game.draw.sprite(STAR, { g: C.gold }, cx + sx, top - 34 + Math.sin(t * 3) * 4, 8, { anchor: 'center' });
    if (phase === 'ruin') {
      var ex = veer > 0 ? x1 : x0;
      game.draw.line(tipX, frontY, ex + sx, frontY - 220, hot ? C.white : C.red, big ? 16 : 9);
      if (big) game.draw.circle(tipX, frontY, 70 + (0.5 - stopT) * 160, C.red, 0.25);
      return;
    }
    if (torn > 0) game.draw.circle(tipX, frontY, 10, warn ? C.red : C.ink);
    // つまむ点(2点同時で光の線がつながる)
    var pl = dotPos(-1), pr = dotPos(1);
    var pulse = 30 + Math.sin(t * 8) * 6;
    if (pinched) {
      game.draw.line(pl.x, pl.y, pr.x, pr.y, C.gold, 8);
      game.draw.circle(pl.x, pl.y, 40, C.gold); game.draw.circle(pr.x, pr.y, 40, C.gold);
    } else {
      var c1 = slip ? '#ff9a3a' : C.white;
      game.draw.circle(pl.x, pl.y, pulse + 8, c1, fL ? 0.9 : 0.5); game.draw.circle(pl.x, pl.y, 14, fL ? C.gold : C.ink);
      game.draw.circle(pr.x, pr.y, pulse + 8, c1, fR ? 0.9 : 0.5); game.draw.circle(pr.x, pr.y, 14, fR ? C.gold : C.ink);
    }
  }

  function drawFingers() {
    if (fL) { game.draw.circle(fL.x, fL.y + 30, 34, C.skin); game.draw.circle(fL.x, fL.y + 18, 16, '#ffe8d4'); }
    if (fR) { game.draw.circle(fR.x, fR.y + 30, 34, C.skin); game.draw.circle(fR.x, fR.y + 18, 16, '#ffe8d4'); }
  }

  function drawStack() {
    // 手前: 残りの色紙の束
    for (var i = 0; i < 4; i++) rrect(70 + i * 10, H * 0.83 - i * 12, 200, 150, 10, SHEETS[(attempt + 1 + i) % SHEETS.length].col);
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    rrect(70, 40, W - 140, 34, 17, '#00000018');
    rrect(76, 46, Math.max(24, (W - 152) * Math.max(0, timeLeft / TIME_LIMIT)), 22, 11, low ? C.red : C.bamboo);
    out(done + ' / ' + NEEDED, W / 2, 150, 60, C.ink);
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 110 - m * 64, 140, 22, m < misses ? C.red : '#00000020');
    out('' + score, 150, 150, 40, C.bambooDk);
  }

  function drawScene(t) {
    room(t);
    drawKid(t);
    bambooBranch(t);
    drawStack();
    drawSheet(t);
    drawFingers();
    for (var sl = 0; sl < H; sl += 8) game.draw.rect(0, sl, W, 2, '#000000', 0.03);
  }

  // ---- ATTRACT: 本物の fingerDown/Move で 1枚目はほどよい速さで真っすぐ、2枚目は一気に引いて裂け目がそれる ----
  var demo = { t: 0, lx: 300, rx: 780, y: BOT - 44, pl: false, pr: false, step: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.4;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.step = 0; demo.pl = false; demo.pr = false; }
    stepSheet(dt);
    var a = dotPos(-1), b = dotPos(1);
    if (cyc < 0.6) {
      demo.lx += (a.x - demo.lx) * Math.min(1, dt * 8); demo.rx += (b.x - demo.rx) * Math.min(1, dt * 8); demo.y = a.y;
    } else if (cyc < 1.9) {
      if (demo.step === 0) { demo.step = 1; demo.lx = a.x; demo.rx = b.x; fingerDown(demo.lx, demo.y, 'gl'); fingerDown(demo.rx, demo.y, 'gr'); demo.pl = demo.pr = true; }
      if (pinched) { demo.lx -= 300 * dt; demo.rx += 300 * dt; fingerMove(demo.lx, demo.y, 'gl'); fingerMove(demo.rx, demo.y, 'gr'); }
      else { demo.pl = demo.pr = false; }
    } else if (cyc < 2.6) {
      demo.pl = demo.pr = false;
      if (demo.step === 1 && cyc > 2.4) { demo.step = 2; setupSheet(1); }
      demo.lx += (W / 2 - 200 - demo.lx) * Math.min(1, dt * 5); demo.rx += (W / 2 + 200 - demo.rx) * Math.min(1, dt * 5);
    } else if (cyc < 3.1) {
      if (demo.step === 1) { demo.step = 2; setupSheet(1); }
      demo.lx += (a.x - demo.lx) * Math.min(1, dt * 9); demo.rx += (b.x - demo.rx) * Math.min(1, dt * 9); demo.y = a.y;
    } else if (cyc < 3.9) {
      if (demo.step === 2) { demo.step = 3; demo.lx = a.x; demo.rx = b.x; fingerDown(demo.lx, demo.y, 'gl'); fingerDown(demo.rx, demo.y, 'gr'); demo.pl = demo.pr = true; }
      if (pinched) { demo.lx -= 500 * dt; demo.rx += 1100 * dt; fingerMove(demo.lx, demo.y, 'gl'); fingerMove(demo.rx, demo.y, 'gr'); }
      else { demo.pl = demo.pr = false; }
    } else { demo.pl = demo.pr = false; }
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.lx, demo.y, { press: demo.pl, scale: 12 });
      game.draw.hand(demo.rx, demo.y, { press: demo.pr, scale: 12 });
      rrect(W / 2 - 300, 60, 600, 170, 40, C.white, 0.9);
      out(GAME_TITLE, W / 2, 150 + Math.sin(t * 2) * 5, 100, C.red);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 212, 38, C.ink);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.red);
      else out('TAP TO START', W / 2, H * 0.965, 42, C.bambooDk);
      return;
    }

    if (mode === S.RESULT) {
      stepSheet(dt);
      drawScene(t);
      rrect(90, H * 0.3, W - 180, 480, 40, C.white, 0.95);
      out(cleared ? 'CLEAR' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, cleared ? C.bamboo : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.42, 60, C.ink);
      out(done + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.47, 42, C.bambooDk);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.52, 56, C.red);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.52, 42, C.ink);
      if (!cleared) out('あと' + (NEEDED - done) + '枚!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepSheet(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { sheets: done, straight: perfects, misses: misses };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (stopT > 0) {
      stopT -= dt;
      if (stopT <= 0) {
        if (stopKind === 'win') ending(true);
        else { game.feedback.bad(cx + drift, BOT - prog * cfg.h, { text: stopKind === 'time' ? 'TIME UP' : 'MISS', color: C.red, size: 62 }); ending(false); }
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt; playT += dt;
      stepSheet(dt);
      if (phase === 'done' && phaseT > 0.55) {
        if (done >= NEEDED) { stopT = 0.4; stopKind = 'win'; phase = 'over'; game.audio.play('se_powerup', 0.45); }
        else setupSheet(attempt + 1);
      } else if (phase === 'ruin' && phaseT > 0.7 && stopT <= 0) setupSheet(attempt + 1);
      if (timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.06, { wave: 'square', volume: 0.07 }); }
      }
      if (timeLeft <= 0 && stopT <= 0 && !fin) { timeLeft = 0; pinched = false; stopT = 0.45; stopKind = 'time'; game.audio.tone('C4', 0.3, { wave: 'square', volume: 0.1, slide: -120 }); }
    }

    drawScene(t);
    if (stopT > 0 && stopKind === 'win') game.draw.circle(W / 2, H * 0.45, 120 + (0.4 - stopT) * 1600, C.white, 0.3);
    // 開始直後のお手本: 2つの点に手を置いて左右へ開く
    if (!fin && readyT <= 0 && attempt === 0 && !pinched && prog === 0 && playT < 1.8) {
      var u = (playT * 1.2) % 1, a = dotPos(-1), b = dotPos(1);
      game.draw.hand(a.x - u * 160, a.y, { press: true, scale: 10, alpha: 0.5 });
      game.draw.hand(b.x + u * 160, b.y, { press: true, scale: 10, alpha: 0.5 });
    }
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.24, 120, C.red);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G5', 0.5], ['A5', 0.5], ['C6', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1],
      ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['E5', 0.5], ['G5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['D5', 0.5], ['C5', 1.5],
    ], { tempo: 124, wave: 'triangle', volume: 0.06, loop: true, bass: [['C3', 2], ['A2', 2], ['G2', 2], ['C3', 2], ['F2', 2], ['G2', 2]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
