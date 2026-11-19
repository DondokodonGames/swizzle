// K-GBA-0028v3-shipyard-trenail-echo.js
// 船台の木釘打ち — 親方が1小節で見せた大槌の振り上げ(長さと振り下ろす拍)を、次の1小節で同じだけ溜めて同じ拍の頭で離して返す
// 操作: 1回は2小節。1小節目(お手本)は親方が拍の頭から大槌を振り上げ、1〜3拍溜めて拍の頭で木釘を打つ(上の帯に型が残る)。2小節目は自分の番: 画面を押し続けると大槌が上がって溜まり(右のメーターに親方の高さの印)、親方が打ったのと同じ拍の頭で指を離すと振り下ろす。拍のずれでPERFECT/GOOD、溜めが親方の長さから半拍以上ずれる・拍外れ・打ち逃しはMISS。お手本の小節で離しても空振りするだけ
// 終わり: 3回(1振り→2振り→2〜3振り、約13秒)を通してMISS2回以内ならCLEAR(判定の点+溜めの正確さ+木釘ボーナス)。MISS3回でGAME OVER
// @mechanic: hold_charge
// @theme: shipyard_trenail_call_response
// 世界観: 港の造船所の船台で、船大工の見習いが親方と交互に大槌を振り、親方が見せた振り上げと同じだけ溜めて、同じ拍で振り下ろして船底の板に木釘を打ち込む
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・打ち込んだ木釘の数・PERFECT/GOOD/MISS数
// スタイル: 8bit PC MONITOR

(function(game) {
  var STYLE = { bg: ['#000000', '#0000aa'], main: ['#55ffff', '#ffffff', '#aa5500'], accent: ['#ffff55', '#ff5555'] };
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 8色ベタ。黒地に細い線、二重線の枠のUI、市松ディザで中間色を作る
  var C = {
    black: STYLE.bg[0], blue: STYLE.bg[1], cyan: STYLE.main[0], white: STYLE.main[1], brown: STYLE.main[2],
    yellow: STYLE.accent[0], red: STYLE.accent[1],
    green: '#55ff55', gray: '#555555', lgray: '#aaaaaa', dcyan: '#00aaaa', magenta: '#ff55ff', skin: '#ffaa55'
  };

  var GAME_TITLE = 'TRENAIL CALL';
  var BPM = 116, SPB = 60 / BPM;
  var PERFECT_W = 0.06, GOOD_W = 0.12, CHARGE_TOL = 0.5;
  var READY_T = 0.8, LIVES = 3, LEAD = 2, PH_N = 3;
  var END_BEAT = LEAD + PH_N * 8;
  var TIME_LIMIT = 14;
  var PEG_X = 540, PLANK_Y = 1150;
  var MAS_P = { x: 330, y: 1000 }, APP_P = { x: 750, y: 1000 };
  var PAD_Y = Math.round(H * 0.79), PAD_H = 250;

  // お手本の型: a = 振り上げ始めの拍、b = 打つ拍(長さ b-a 拍)
  var POOL = [
    [[{ a: 0, b: 2 }], [{ a: 1, b: 3 }], [{ a: 0, b: 3 }]],
    [[{ a: 0, b: 1 }, { a: 2, b: 3 }], [{ a: 0, b: 2 }, { a: 2, b: 3 }], [{ a: 0, b: 1 }, { a: 1, b: 3 }]],
    [[{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }], [{ a: 0, b: 2 }, { a: 2, b: 3 }], [{ a: 0, b: 1 }, { a: 1, b: 3 }]]
  ];

  // 伴奏(オリジナル): 親方の小節は問いの節、自分の小節は低い答えの節
  var CALL_MEL = [['C5', 1], ['E5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1]];
  var CALL_BASS = [['C3', 2], ['G2', 2]];
  var RESP_MEL = [['R', 1], ['D5', 0.5], ['F5', 0.5], ['R', 1], ['G4', 1]];
  var RESP_BASS = [['F2', 2], ['G2', 2]];

  // ---- スプライト ----
  var MAS_A = ['...yyyy...', '..hhhhhh..', '..ffffff..', '..fkffkf..', '..ffffff..', '..wwwwww..', '...wwww...', '.cccccccc.', 'cccccccccc', 'cccccccccc', '.gggggggg.', '.ggg..ggg.', '.ggg..ggg.', '.kk....kk.'];
  var MAS_B = ['..........', '...yyyy...', '..hhhhhh..', '..ffffff..', '..fkffkf..', '..ffffff..', '..wwwwww..', '.ccwwwwcc.', 'cccccccccc', 'cccccccccc', '.gggggggg.', '.ggg..ggg.', '.ggg..ggg.', '.kk....kk.'];
  var APP_A = ['...rrrr...', '..hhhhhh..', '..ffffff..', '..fkffkf..', '..ffffff..', '...fmmf...', '....ff....', '.mmmmmmmm.', 'mmmmmmmmmm', 'mmmmmmmmmm', '.gggggggg.', '.ggg..ggg.', '.ggg..ggg.', '.kk....kk.'];
  var APP_B = ['..........', '...rrrr...', '..hhhhhh..', '..ffffff..', '..fkffkf..', '..ffffff..', '...fmmf...', '.mmmffmmm.', 'mmmmmmmmmm', 'mmmmmmmmmm', '.gggggggg.', '.ggg..ggg.', '.ggg..ggg.', '.kk....kk.'];
  var APP_OH = ['...rrrr...', '..hhhhhh..', '..ffffff..', '..fwffwf..', '..ffffff..', '...fkkf...', '....ff....', 'fmmmmmmmmf', 'mmmmmmmmmm', 'mmmmmmmmmm', '.gggggggg.', '.ggg..ggg.', '.ggg..ggg.', '.kk....kk.'];
  var PAL_M = { y: C.yellow, h: C.brown, f: C.skin, k: C.black, w: C.white, c: C.dcyan, g: C.gray };
  var PAL_A = { r: C.red, h: C.brown, f: C.skin, k: C.black, w: C.white, m: C.blue, g: C.gray };
  var HEAD_M = ['.yyyy.', 'hhhhhh', 'fkffkf', 'wwwwww'];
  var HEAD_A = ['.rrrr.', 'hhhhhh', 'fkffkf', 'ffffff'];
  var LIFE = ['wwwwww', 'wwwwww', '..bb..', '..bb..', '..bb..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phases, clock, prevClock, lastBeat, cuedBar, lives, score, driven, nP, nG, nM;
  var over, won, outroT, hitStop, demoMode, prevBest, nearText, pressing, pressT, appR, masR, missFlash, appHit, masHit, lastCharge, warnedTurn;
  var beatPulse = 0;

  function pickIdx(n) { var i = Math.floor(game.random(0, n)); return i >= n ? n - 1 : i; }

  function initRun(demo) {
    demoMode = !!demo;
    phases = [];
    for (var p = 0; p < PH_N; p++) {
      var src = POOL[p][pickIdx(POOL[p].length)], sw = [];
      for (var k = 0; k < src.length; k++) sw.push({ a: src[k].a, b: src[k].b, res: 0, held: 0, called: false });
      phases.push({ cs: LEAD + p * 8, rs: LEAD + p * 8 + 4, sw: sw, peg: 0, done: false, warned: false });
    }
    clock = -READY_T; prevClock = clock; lastBeat = -99; cuedBar = -99;
    lives = LIVES; score = 0; driven = 0; nP = 0; nG = 0; nM = 0;
    over = false; won = false; outroT = 0; hitStop = 0; prevBest = game.best; nearText = '';
    pressing = false; pressT = 0; appR = 0; masR = 0; missFlash = 0; appHit = 0; masHit = 0; lastCharge = 0; warnedTurn = -1;
  }

  function sfx(id, v) { if (!demoMode) game.audio.play(id, v); }
  function tone(f, d, o) { if (!demoMode) game.audio.tone(f, d, o); }

  function curPhase() {
    var bt = clock / SPB;
    for (var i = 0; i < phases.length; i++) if (bt < phases[i].rs + 4) return phases[i];
    return phases[phases.length - 1];
  }
  function heldBeats() { return pressing ? (clock - pressT) / SPB : 0; }

  // ---- 判定: 指を離した瞬間 = 振り下ろし ----
  function resolveSwing(ph, sw, g, why, extra) {
    sw.res = g;
    var x = PEG_X + 60, y = PLANK_Y - 260;
    if (g === 3) {
      nM++;
      if (!demoMode) lives--;
      var last = !demoMode && lives <= 0;
      missFlash = 0.4;
      game.feedback.bad(x, y, { text: 'MISS', shake: last ? 16 : (demoMode ? 3 : 8), volume: demoMode ? 0 : 0.5 });
      if (why === 'charge' && extra !== undefined) nearText = 'あと' + Math.abs(extra).toFixed(1) + '拍!';
      else if (why === 'off' && extra !== undefined) nearText = 'あと' + Math.max(0.01, extra).toFixed(2) + '秒!';
      else nearText = '';
      if (last) { hitStop = 0.45; finish(false); }
      return;
    }
    if (g === 1) nP++; else nG++;
    var acc = Math.max(0, 1 - Math.abs(sw.held - (sw.b - sw.a)) / CHARGE_TOL);
    score += (g === 1 ? 300 : 200) + Math.round(acc * 100);
    ph.peg++;
    game.feedback.good(x, y, { text: g === 1 ? 'PERFECT' : 'GOOD', color: g === 1 ? C.yellow : C.green, size: g === 1 ? 60 : 50, count: 14, volume: demoMode ? 0 : 0.35 });
    game.fx.burst(PEG_X, PLANK_Y - 40, { color: C.yellow, count: 10, speed: 300 });
    tone(110, 0.12, { wave: 'sawtooth', volume: 0.16 });
    var all = true;
    for (var i = 0; i < ph.sw.length; i++) if (ph.sw[i].res !== 1 && ph.sw[i].res !== 2) all = false;
    if (all && !ph.done) {
      ph.done = true; driven++; score += 200;
      if (!demoMode) { game.fx.popup(driven + ' / ' + PH_N, 540, 420, { color: C.yellow, size: 72 }); sfx('se_milestone', 0.45); }
    }
  }

  function release() {
    var held = heldBeats();
    pressing = false;
    lastCharge = held;
    appHit = 0.14;
    if (over) return 'none';
    var ph = curPhase(), bt = clock / SPB;
    if (bt < ph.rs - 0.5) { tone(330, 0.04, { wave: 'triangle', volume: 0.07 }); return 'whiff'; }   // お手本の小節: 空振り
    var best = null, bd = 99;
    for (var i = 0; i < ph.sw.length; i++) {
      var sw = ph.sw[i];
      if (sw.res) continue;
      var d = Math.abs(clock - (ph.rs + sw.b) * SPB);
      if (d < bd) { bd = d; best = sw; }
    }
    if (!best) { tone(330, 0.04, { wave: 'triangle', volume: 0.07 }); return 'whiff'; }
    best.held = held;
    if (bd > GOOD_W) { resolveSwing(ph, best, 3, 'off', bd - GOOD_W); return 'miss'; }
    var L = best.b - best.a, dev = held - L;
    if (Math.abs(dev) > CHARGE_TOL) { resolveSwing(ph, best, 3, 'charge', Math.abs(dev) - CHARGE_TOL + 0.1); return 'miss'; }
    resolveSwing(ph, best, bd <= PERFECT_W ? 1 : 2);
    return 'hit';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5;
    if (demoMode) return;
    if (ok) {
      score += lives * 150;
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, 760 + (i % 2) * 160, { color: [C.yellow, C.cyan, C.green][i % 3], count: 18, speed: 420 });
      game.fx.flash(C.white, 0.12);
      sfx('se_success', 0.55);
    } else {
      sfx('se_failure', 0.5);
    }
  }

  function endGame() {
    var stats = { score: score, driven: driven, pegs: PH_N, perfect: nP, good: nG, miss: nM };
    if (won && score > prevBest) {
      game.fx.popup('NEW RECORD', 540, H * 0.24, { color: C.yellow, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ---- 拍クロック ----
  function beatClock() {
    var nb = Math.floor((clock + 0.06 - LEAD * SPB) / (4 * SPB));
    if (!demoMode && nb > cuedBar && nb >= 0 && nb < PH_N * 2) {
      cuedBar = nb;
      if (nb % 2 === 0) game.audio.melody(CALL_MEL, { tempo: BPM, wave: 'square', volume: 0.045, bass: CALL_BASS, bassVolume: 0.08 });
      else game.audio.melody(RESP_MEL, { tempo: BPM, wave: 'square', volume: 0.035, bass: RESP_BASS, bassVolume: 0.08 });
    }
    var b = Math.floor(clock / SPB);
    if (b !== lastBeat) {
      lastBeat = b;
      if (clock >= 0 && b < END_BEAT) {
        beatPulse = 1;
        tone(((b - LEAD) % 4 + 4) % 4 === 0 ? 1200 : 900, 0.015, { wave: 'square', volume: 0.04 });
      }
    }
    for (var p = 0; p < phases.length; p++) {
      var ph = phases[p];
      // 親方の振り下ろし(お手本)
      for (var i = 0; i < ph.sw.length; i++) {
        var sw = ph.sw[i], tA = (ph.cs + sw.a) * SPB, tB = (ph.cs + sw.b) * SPB;
        if (prevClock < tA && clock >= tA) tone(260, 0.12, { wave: 'triangle', volume: 0.07, slide: 200 });
        if (prevClock < tB && clock >= tB) {
          sw.called = true; masHit = 0.14; ph.peg += 0.5;
          tone(98, 0.14, { wave: 'sawtooth', volume: 0.16 });
          tone('C6', 0.04, { wave: 'square', volume: 0.06 });
          game.fx.burst(PEG_X, PLANK_Y - 40, { color: C.cyan, count: 6, speed: 200 });
        }
      }
      // 自分の番の予告: 返しの小節の1拍前に自分の灯が点滅し、2音で知らせる
      var tw = (ph.rs - 1) * SPB;
      if (!ph.warned && prevClock < tw && clock >= tw) { ph.warned = true; warnedTurn = p; tone('G5', 0.05, { wave: 'square', volume: 0.06 }); tone('D6', 0.07, { wave: 'square', volume: 0.05 }); }
    }
    // 溜め: 1拍ごとにきしむ音が上がる
    if (pressing) {
      var h0 = (prevClock - pressT) / SPB, h1 = (clock - pressT) / SPB;
      if (Math.floor(h1) > Math.floor(h0) && h1 < 3.6) tone(['E5', 'G5', 'B5', 'D6'][Math.min(3, Math.floor(h1))], 0.05, { wave: 'square', volume: 0.07 });
    }
  }

  function stepRun(dt) {
    prevClock = clock;
    clock += dt;
    if (missFlash > 0) missFlash -= dt;
    if (appHit > 0) appHit -= dt;
    if (masHit > 0) masHit -= dt;
    beatClock();
    if (over) return;
    for (var p = 0; p < phases.length; p++) {
      var ph = phases[p];
      for (var i = 0; i < ph.sw.length; i++) {
        var sw = ph.sw[i];
        if (!sw.res && clock > (ph.rs + sw.b) * SPB + GOOD_W) { resolveSwing(ph, sw, 3, 'none'); if (over) return; }
      }
    }
    if (clock > END_BEAT * SPB + 0.3 || clock > TIME_LIMIT) finish(lives > 0);
  }

  // ---- 入力 ----
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initRun(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initRun(true); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || hitStop > 0 || clock < 0) return;
    pressing = true; pressT = clock;
    game.audio.tone(196, 0.06, { wave: 'square', volume: 0.08, slide: 120 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    if (over || hitStop > 0) { pressing = false; return; }
    var r = release();
    if (r === 'hit') game.fx.burst(PEG_X + 40, PLANK_Y - 60, { color: C.white, count: 6, speed: 220 });
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.blue, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function frame(x, y, w, h, col, fill) {
    if (fill) game.draw.rect(x, y, w, h, fill);
    game.draw.rect(x, y, w, 3, col); game.draw.rect(x, y + h - 3, w, 3, col);
    game.draw.rect(x, y, 3, h, col); game.draw.rect(x + w - 3, y, 3, h, col);
    game.draw.rect(x + 9, y + 9, w - 18, 2, col); game.draw.rect(x + 9, y + h - 11, w - 18, 2, col);
    game.draw.rect(x + 9, y + 9, 2, h - 18, col); game.draw.rect(x + w - 11, y + 9, 2, h - 18, col);
  }
  function dither(x, y, w, h, col, cell, dot) {
    for (var yy = 0; yy < h; yy += cell) {
      for (var xx = ((yy / cell) % 2) * cell; xx < w; xx += cell * 2) game.draw.rect(x + xx, y + yy, dot, dot, col);
    }
  }

  function drawYard() {
    game.draw.gradient(0, H, [[0, C.black], [0.2, C.blue], [0.45, C.black], [1, C.black]]);
    // 船体の肋材(細線の弧)と外板
    for (var r = 0; r < 7; r++) {
      var rx = 120 + r * 140, prevX = rx, prevY = 300;
      for (var s = 1; s <= 8; s++) {
        var yy = 300 + s * 100, xx = rx + Math.sin(s / 8 * Math.PI * 0.5) * (rx < 540 ? -40 : 40);
        game.draw.line(prevX, prevY, xx, yy, C.dcyan, 2);
        prevX = xx; prevY = yy;
      }
    }
    for (var k = 0; k < 5; k++) game.draw.line(40, 330 + k * 34, W - 40, 330 + k * 34 + (k % 2) * 6, C.cyan, 2);
    // 船底の板(打ち込む面)
    game.draw.rect(60, PLANK_Y, W - 120, 70, C.brown);
    dither(60, PLANK_Y + 34, W - 120, 36, C.black, 8, 4);
    game.draw.line(60, PLANK_Y, W - 60, PLANK_Y, C.white, 2);
    for (var n = 0; n < 9; n++) game.draw.rect(120 + n * 110, PLANK_Y + 12, 14, 14, n === 4 ? C.brown : C.yellow);
    // 船台の足場
    game.draw.rect(60, PLANK_Y + 70, W - 120, 4, C.lgray);
    for (var q = 0; q < 6; q++) game.draw.line(100 + q * 180, PLANK_Y + 74, 100 + q * 180, PLANK_Y + 260, C.lgray, 2);
    dither(60, PLANK_Y + 140, W - 120, 120, C.gray, 10, 5);
  }

  function drawPeg() {
    var ph = curPhase();
    var depthPx = Math.min(1, ph.peg / (ph.sw.length * 1.5)) * 90;
    var top = PLANK_Y - 110 + depthPx;
    var white = missFlash > 0;
    game.draw.rect(PEG_X - 22, top, 44, PLANK_Y - top, white ? C.white : C.brown);
    game.draw.rect(PEG_X - 22, top, 8, PLANK_Y - top, C.yellow, 0.5);
    game.draw.rect(PEG_X - 28, top - 8, 56, 10, white ? C.white : C.yellow);
    if (ph.done) for (var s = 0; s < 4; s++) game.draw.rect(PEG_X - 60 + s * 36, PLANK_Y - 30 - (Math.floor(game.time.elapsed * 8 + s) % 3) * 8, 6, 6, C.yellow);
  }

  // 大槌: r = 振り上げ量(0=木釘の上、1=頭の後ろ)
  function drawMallet(P, side, r, white) {
    var strikeAng = side < 0 ? 0.5 : Math.PI - 0.5, sweep = 2.6;
    var ang = side < 0 ? strikeAng - r * sweep : strikeAng + r * sweep;
    var hx = P.x + Math.cos(ang) * 230, hy = P.y + Math.sin(ang) * 230;
    game.draw.line(P.x, P.y, hx, hy, white ? C.white : C.brown, 10);
    game.draw.line(P.x, P.y, hx, hy, C.yellow, 2);
    game.draw.rect(hx - 40, hy - 30, 80, 60, white ? C.white : C.brown);
    game.draw.rect(hx - 40, hy - 30, 80, 6, C.white);
    game.draw.rect(hx - 40, hy - 30, 6, 60, C.yellow);
  }

  function masterRaise() {
    var bt = clock / SPB, r = 0;
    for (var p = 0; p < phases.length; p++) {
      var ph = phases[p];
      for (var i = 0; i < ph.sw.length; i++) {
        var sw = ph.sw[i], la = ph.cs + sw.a, lb = ph.cs + sw.b;
        if (bt >= la && bt < lb) r = (bt - la) / 3;
      }
    }
    return r;
  }

  function drawPeople(dt) {
    var mr = masterRaise();
    // 構えの位置(少し上げて木釘が見えるように)。打った直後だけ木釘の上まで下ろす
    var restM = masHit > 0 ? 0 : 0.14, restA = appHit > 0 ? 0 : 0.14;
    masR = mr > 0 ? Math.max(restM, mr) : Math.max(restM, masR - dt * 8);
    var ar = pressing ? Math.min(1.15, heldBeats() / 3) : 0;
    appR = pressing ? Math.max(restA, ar) : Math.max(restA, appR - dt * 8);
    var bob = Math.floor(Math.max(0, clock) / SPB) % 2;
    game.draw.sprite(bob ? MAS_A : MAS_B, PAL_M, MAS_P.x - 60, MAS_P.y + 70, 11, { anchor: 'center' });
    drawMallet(MAS_P, -1, masR, false);
    var white = missFlash > 0 && Math.floor(game.time.elapsed * 14) % 2 === 0;
    var art = missFlash > 0 ? APP_OH : (bob ? APP_A : APP_B);
    game.draw.sprite(art, white ? { r: '#fff', h: '#fff', f: '#fff', k: '#fff', w: '#fff', m: '#fff', g: '#fff' } : PAL_A, APP_P.x + 60, APP_P.y + 70, missFlash > 0 ? 12 : 11, { anchor: 'center' });
    drawMallet(APP_P, 1, appR, missFlash > 0);
  }

  // 溜めメーター: 1〜3拍の目盛りと、親方が溜めた長さの印
  function drawMeters() {
    var ph = curPhase(), bt = clock / SPB;
    var target = null;
    if (bt >= ph.rs - 1) for (var i = 0; i < ph.sw.length; i++) if (!ph.sw[i].res) { target = ph.sw[i]; break; }
    var mx = W - 80, top = 620, hgt = 420;
    frame(mx - 40, top - 20, 80, hgt + 40, C.cyan, C.black);
    var fill = pressing ? Math.min(1.15, heldBeats() / 3) : 0;
    game.draw.rect(mx - 22, top + hgt - Math.min(hgt, fill * hgt), 44, Math.min(hgt, fill * hgt), fill > 0 ? C.yellow : C.gray);
    for (var m = 1; m <= 3; m++) game.draw.rect(mx - 34, top + hgt - m / 3 * hgt, 68, 3, C.white);
    if (target) {
      var L = target.b - target.a, ty = top + hgt - L / 3 * hgt;
      dither(mx - 34, ty - CHARGE_TOL / 3 * hgt, 68, CHARGE_TOL * 2 / 3 * hgt, C.green, 8, 4);
      game.draw.rect(mx - 40, ty - 3, 80, 6, C.green);
    }
    // 親方のメーター(お手本の長さがそのまま残る)
    var lx = 80;
    frame(lx - 40, top - 20, 80, hgt + 40, C.dcyan, C.black);
    var mr = masterRaise();
    game.draw.rect(lx - 22, top + hgt - mr * hgt, 44, mr * hgt, C.cyan);
    for (var m2 = 1; m2 <= 3; m2++) game.draw.rect(lx - 34, top + hgt - m2 / 3 * hgt, 68, 3, C.white);
  }

  // 自分の灯と押す台
  function drawPad() {
    var ph = curPhase(), bt = clock / SPB;
    var turn = bt >= ph.rs - 1 && bt < ph.rs + 4 && !over;
    var blink = bt >= ph.rs - 1 && bt < ph.rs && Math.floor(game.time.elapsed * 10) % 2 === 0;
    frame(100, PAD_Y, W - 200, PAD_H, pressing ? C.yellow : (turn ? C.white : C.gray), C.black);
    if (turn) dither(120, PAD_Y + 20, W - 240, PAD_H - 40, blink ? C.yellow : C.blue, 16, 8);
    var fill = pressing ? Math.min(1, heldBeats() / 3) : 0;
    if (fill > 0) game.draw.rect(120, PAD_Y + PAD_H - 20 - fill * (PAD_H - 40), W - 240, fill * (PAD_H - 40), C.yellow, 0.35);
    game.draw.sprite(HEAD_A, PAL_A, 540, PAD_Y + PAD_H / 2, 16, { anchor: 'center' });
  }

  // 上の帯: 親方の小節(上段)と自分の小節(下段)の型
  function drawTimeline(y0) {
    var ph = curPhase(), bt = clock / SPB;
    var x0 = 200, cw = 190, rows = [{ y: y0, start: ph.cs, who: 0 }, { y: y0 + 60, start: ph.rs, who: 1 }];
    game.draw.sprite(HEAD_M, PAL_M, 130, y0, 8, { anchor: 'center' });
    game.draw.sprite(HEAD_A, PAL_A, 130, y0 + 60, 8, { anchor: 'center' });
    for (var r = 0; r < 2; r++) {
      var row = rows[r];
      for (var c = 0; c < 4; c++) { game.draw.rect(x0 + c * cw, row.y - 22, cw - 8, 44, C.blue); game.draw.rect(x0 + c * cw, row.y - 22, 4, 44, c === 0 ? C.white : C.gray); }
      for (var i = 0; i < ph.sw.length; i++) {
        var sw = ph.sw[i];
        var shown = r === 0 ? bt >= ph.cs + sw.a : bt >= ph.cs + sw.b;   // 自分の段は親方が打ったあとに型が出る
        if (!shown) continue;
        var xa = x0 + sw.a * cw, xb = x0 + sw.b * cw;
        var col = r === 0 ? C.cyan : (sw.res === 3 ? C.red : (sw.res ? C.green : C.lgray));
        var prog = r === 0 ? Math.min(1, (bt - ph.cs - sw.a) / (sw.b - sw.a)) : 1;
        game.draw.rect(xa + 4, row.y - 8, (xb - xa) * prog, 16, col);
        var due = r === 1 && !sw.res && bt >= ph.rs + sw.b - 1 && bt < ph.rs + sw.b + 0.3 && Math.floor(game.time.elapsed * 10) % 2 === 0;
        if (prog >= 1) { game.draw.rect(xb - 12, row.y - 20, 24, 40, due ? C.yellow : col); }
      }
      if (bt >= row.start && bt < row.start + 4) game.draw.rect(x0 + (bt - row.start) * cw - 2, row.y - 26, 4, 52, C.white);
    }
  }

  function drawHud() {
    frame(20, 16, W - 40, 210, C.white, C.black);
    label('SCORE ' + score, 60, 50, 32, C.white, 'left');
    label(driven + ' / ' + PH_N, W / 2 + 60, 50, 32, C.yellow);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LIFE, { w: i < lives ? C.lgray : C.gray, b: i < lives ? C.brown : C.gray }, W - 80 - i * 56, 50, 7, { anchor: 'center' });
    drawTimeline(108);
  }

  function drawScene(dt) {
    drawYard();
    drawPeg();
    drawPeople(dt);
    drawMeters();
    drawPad();
  }

  function drawResult(showTap) {
    var top = H * 0.27;
    frame(70, top, W - 140, H * 0.36, won ? C.yellow : C.red, C.black);
    label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.31, 90, won ? C.yellow : C.red);
    label('SCORE ' + score, W / 2, H * 0.365, 56, C.white);
    game.draw.sprite(LIFE, { w: C.lgray, b: C.brown }, W / 2 - 140, H * 0.415, 10, { anchor: 'center' });
    label(driven + ' / ' + PH_N, W / 2 + 10, H * 0.415, 48, C.yellow);
    label('PERFECT ' + nP + '  GOOD ' + nG + '  MISS ' + nM, W / 2, H * 0.46, 32, C.cyan);
    if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.51, 56, C.yellow);
    else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.51, 42, C.white);
    if (!won) label(nearText || 'あと1本!', W / 2, H * 0.555, 46, C.red);
    if (showTap && Math.floor(game.time.elapsed * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.605, 32, C.white);
  }

  // ---- ATTRACT: 実ロジックで親方のお手本を見て、次の小節で同じ拍から溜めて同じ拍で離す。1周おきに1拍早く離してMISS ----
  var demo = { t: 0, n: 0, i: 0, down: false, press: 0 };
  var DEMO_CYC = (LEAD + 8) * SPB + 0.7;
  function demoReset() {
    initRun(true);
    clock = 0; prevClock = 0; lastBeat = 0;
    demo.n++; demo.i = 0; demo.down = false; demo.press = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) demoReset();
    stepRun(dt);
    var ph = phases[0], sw = ph.sw[demo.i];
    if (sw) {
      var early = demo.n % 2 === 0 && demo.i === ph.sw.length - 1 && sw.b - sw.a >= 2 ? 1 : 0;
      if (!demo.down && clock >= (ph.rs + sw.a) * SPB + 0.02) { demo.down = true; pressing = true; pressT = clock; }
      if (demo.down && clock >= (ph.rs + sw.b - early) * SPB + 0.01) { demo.down = false; release(); demo.press = 0.2; demo.i++; }
    }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    beatPulse = Math.max(0, beatPulse - dt * 4);

    if (state === S.ATTRACT) {
      if (!phases) initRun(true);
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(560, PAD_Y + (demo.down ? 150 : 110), { press: demo.down || demo.press > 0, scale: 14 });
      frame(60, 320, W - 120, 150, C.dcyan, C.black);
      drawTimeline(362);
      frame(20, 16, W - 40, 210, C.white, C.black);
      label(GAME_TITLE, W / 2, 88, 80 + Math.sin(t * 3) * 3, C.yellow);
      label('HI-SCORE ' + game.best, W / 2, 176, 34, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.145, 50, C.white);
      else label('TAP TO START', W / 2, H * 0.145, 44, C.yellow);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      drawHud();
      drawResult(true);
      return;
    }

    // ---- PLAYING ----
    if (hitStop > 0) {
      hitStop -= dt;
    } else if (over) {
      outroT -= dt;
      if (outroT <= 0) { state = S.RESULT; endGame(); }
    } else {
      var wasReady = clock < -0.35;
      stepRun(dt);
      if (wasReady && clock >= -0.35) game.audio.play('se_tap', 0.4);
    }

    drawScene(hitStop > 0 ? 0 : dt);
    drawHud();
    if (clock < 0) {
      frame(140, H * 0.4, W - 280, 150, C.yellow, C.black);
      label(clock < -0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4 + 75, 90, C.yellow);
    }
    // 最初の返しの小節だけ、押す台の上に手の誘導を薄く出す(親方と同じ拍から押し、同じ拍で離す)
    var p0 = phases[0], s0 = p0.sw[0], bt0 = clock / SPB;
    if (!over && !s0.res && bt0 > p0.rs + s0.a - 0.6 && bt0 < p0.rs + s0.b + 0.2) {
      var hold = bt0 >= p0.rs + s0.a && bt0 < p0.rs + s0.b;
      game.draw.hand(560, PAD_Y + (hold ? 150 : 110), { press: hold, scale: 13, alpha: 0.5 });
    }
    if (over && hitStop <= 0) drawResult(false);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initRun(true);
    demo.t = 0;
  });
})(game);
