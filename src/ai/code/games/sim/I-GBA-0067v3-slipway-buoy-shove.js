// I-GBA-0067v3-slipway-buoy-shove.js
// 船揚げ場の浮標もどし — 倒れて転がった浮標を、押す向きと強さを加減して坂の上の台座のくぼみまで押し上げ、立て直す
// 操作: 指を押したまま横へ引いて離すと、作業員が浮標をその向きへ押す。引いた長さ=押す強さ(作業員の構えと足元の線が伸びる)。弱いと坂を転がり戻り、強すぎると台座を越えて川へ落ちる。勢い余って縁へ向かうと縁が赤く点滅してブザーが鳴るので、逆向きに引いて止める。台座のくぼみで止まると作業員が立て起こす
// 終わり: 22秒以内に3本の浮標(坂が段々高く、3本目は濡れて滑る台座)を立てればCLEAR。川へ2回落とすか時間切れでGAME OVER
// @mechanic: push_out
// @theme: rivermouth_slipway_buoy_shove
// 世界観: 嵐が去った朝の河口の船揚げ場で、ゴム長の港湾作業員が、坂の下まで転がり落ちた紅白の浮標を押し転がして坂の上の台座へ戻し、1本ずつ立て直していく
// 残るもの: 正誤(CLEAR/GAME OVER・TIME UP) + 立てた浮標の数・押した回数・一押しで決めた数・川に落とした数・スコア
// スタイル: 90s BIG SPRITE

(function (game) {
  var STYLE = { bg: ['#8ec8e8', '#cfe8f0', '#4a7a9a'], main: ['#e8402a', '#f4f0e8', '#3a3a48'], accent: ['#ffcc22', '#2a8a4a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SKY = STYLE.bg[0], MIST = STYLE.bg[1], RIVER = STYLE.bg[2];
  var RED = STYLE.main[0], WHITE = STYLE.main[1], STEEL = STYLE.main[2];
  var YEL = STYLE.accent[0], BOOT = STYLE.accent[1];
  var INK = '#14141c', CONC = '#a8a49a', CONC2 = '#8a867c', CONC3 = '#c8c4b8';

  var TITLE = 'BUOY SHOVE';
  var TIME_LIMIT = 22;
  var LIVES = 2;
  var FLOOR = H * 0.68, WATER_Y = H * 0.72;
  var RAMP0 = W * 0.36, RAMP1 = W * 0.6, SOCK = W * 0.7, SW = 60, EDGE = W * 0.84;
  var BR = 66;
  var START_X = W * 0.2;
  var G = 1400, F_FLOOR = 180;
  var ROUNDS = [
    { rise: 110, fTop: 900, depth: 26 },
    { rise: 140, fTop: 900, depth: 24 },
    { rise: 170, fTop: 520, depth: 22 },
  ];
  var PUSH_K = 3.4, PUSH_MAX = 1400;

  var WORKER = [
    ['....yyyyy.....', '...yyyyyyy....', '....sssss.....', '....sksks.....', '....sssss.....', '...bbbbbbb....', '..bbbbbbbbb...', '..bb.bbb.bb...', '..ss.bbb.ss...', '.....bbb......', '....nn.nn.....', '....nn.nn.....', '....gg.gg.....', '...ggg.ggg....'],
    ['....yyyyy.....', '...yyyyyyy....', '....sssss.....', '....sksks.....', '....sssss.....', '...bbbbbbbss..', '..bbbbbbbbbs..', '..bbbbbbb.....', '.....bbb......', '.....bbb......', '...nn..nn.....', '..nn....nn....', '..gg.....gg...', '.ggg.....ggg..'],
    ['....yyyyy.....', '...yyyyyyy....', '....sssss.....', '....sksks.....', '....sssss.....', '...bbbbbbbbsss', '..bbbbbbbbb...', '..bbbbbbb.....', '.....bbb......', '.....bbb......', '..nn....nn....', '.nn......nn...', '.gg.......gg..', 'ggg.......ggg.'],
    ['s...yyyyy...s.', '.s.yyyyyyy.s..', '..s.sssss.s...', '...ssksks.....', '....swwws.....', '...bbbbbbb....', '..bbbbbbbbb...', '..bb.bbb.bb...', '.....bbb......', '.....bbb......', '....nn.nn.....', '....nn.nn.....', '....gg.gg.....', '...ggg.ggg....'],
  ];
  var W_PAL = { y: YEL, s: '#e8b088', k: INK, w: WHITE, b: '#2a5a9a', n: STEEL, g: BOOT };
  var GULL = [['w.....w', '.w...w.', '..w.w..', '...w...'], ['.......', 'ww...ww', '..w.w..', '...w...']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var ri, bx, bv, spin, restT, phase, phT, pushes, roundPushes, stood, lives, score, perfects, splashes, timeLeft;
  var wx, wFrame, wT, side, warnEdge, drag, splash;
  var ready, halt, over, won, timeUp, endT, resT, sent, prevBest;

  function cfg() { return ROUNDS[Math.min(ri, ROUNDS.length - 1)]; }
  function topY() { return FLOOR - cfg().rise; }

  function ground(x) {
    if (x < RAMP0) return FLOOR;
    if (x < RAMP1) return FLOOR - cfg().rise * (x - RAMP0) / (RAMP1 - RAMP0);
    if (x <= EDGE) {
      var d = x - SOCK, dip = 0;
      if (Math.abs(d) < SW) dip = cfg().depth * (1 + Math.cos(Math.PI * d / SW)) / 2;
      return topY() + dip;
    }
    return WATER_Y;
  }

  function setupRound(i) {
    ri = i; bx = START_X; bv = 0; spin = 0; restT = 0; phase = 'push'; phT = 0; roundPushes = 0;
    wx = bx - BR - 60; side = 1; warnEdge = false; splash = null;
  }

  function initGame() {
    setupRound(0);
    pushes = 0; stood = 0; lives = LIVES; score = 0; perfects = 0; splashes = 0; timeLeft = TIME_LIMIT;
    wFrame = 0; wT = 0; drag = null;
    ready = 0.8; halt = null; over = false; won = false; timeUp = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
  }

  // ── 押す(プレイ・デモ共通)。len は引いた長さ(右が正) ──
  function shove(len, vol) {
    if (Math.abs(len) < 30) { game.audio.tone(260, 0.04, { wave: 'triangle', volume: 0.03 * vol }); return false; }
    var dir = len > 0 ? 1 : -1;
    var imp = Math.min(PUSH_MAX, Math.abs(len) * PUSH_K);
    if (Math.abs(wx - bx) > 240) { game.audio.tone(200, 0.05, { wave: 'square', volume: 0.03 * vol }); return false; }
    side = dir; bv += dir * imp; roundPushes++;
    wFrame = 2; wT = 0.35;
    game.audio.play('se_jump', 0.3 * vol);
    game.audio.tone(140 + imp * 0.25, 0.1, { wave: 'square', volume: 0.07 * vol });
    game.fx.burst(bx - dir * BR, ground(bx) - BR, { color: CONC3, count: 6, speed: 220 });
    return true;
  }

  // ── 転がりの1フレーム(プレイ・デモ共通) ──
  function stepBuoy(dt, vol) {
    var n = 4, h = dt / n;
    for (var k = 0; k < n; k++) {
      var slope = (ground(bx + 2) - ground(bx - 2)) / 4;
      bv += G * slope * h;
      var f = (bx > RAMP1 && bx <= EDGE ? cfg().fTop : F_FLOOR) * h;
      if (Math.abs(bv) <= f) bv = 0; else bv -= (bv > 0 ? f : -f);
      bx += bv * h;
      if (bx < BR + 20) { bx = BR + 20; bv = Math.abs(bv) * 0.3; }
      if (bx > EDGE + 8) return 'splash';
    }
    spin += bv * dt / BR;
    // 縁へ向かう予告
    var onTop = bx > RAMP1;
    var stopAt = bx + (bv > 0 ? bv * bv / (2 * cfg().fTop) : 0);
    var danger = onTop && bv > 0 && stopAt > EDGE - 10 && !(Math.abs(bx - SOCK) < SW && bv < 200);
    if (danger && !warnEdge) { warnEdge = true; game.audio.tone(1100, 0.4, { wave: 'square', volume: 0.05 * vol, slide: 300 }); }
    if (!danger) warnEdge = false;
    // くぼみで静止
    if (Math.abs(bx - SOCK) < 22 && Math.abs(bv) < 30) { restT += dt; if (restT >= 0.45) return 'stand'; } else restT = 0;
    return null;
  }

  function stepWorker(dt) {
    var want = side > 0 ? bx - BR - 60 : bx + BR + 60;
    want = Math.max(60, Math.min(EDGE - 40, want));
    var d = want - wx, sp = 900 * dt;
    wx += Math.abs(d) <= sp ? d : (d > 0 ? sp : -sp);
    if (wT > 0) wT -= dt;
  }

  function standUp(vol) {
    phase = 'stand'; phT = 0.9; wFrame = 3; wT = 0.9;
    bx = SOCK; bv = 0;
    var one = roundPushes <= 1;
    game.feedback.good(SOCK, topY() - 260, { text: one ? 'PERFECT' : 'GOOD', color: one ? YEL : WHITE, count: one ? 18 : 10, volume: 0.5 * vol });
    return one;
  }

  function nextRound() {
    if (ri >= ROUNDS.length - 1) { finish(true); return; }
    setupRound(ri + 1);
    game.audio.tone(392, 0.1, { wave: 'triangle', volume: 0.06, slide: 200 });
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 40) + lives * 200;
    wFrame = ok ? 3 : 0; wT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.3 + (i % 2) * 0.08), { color: i % 2 ? RED : YEL, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { stood: stood, pushes: pushes, onePush: perfects, splashes: splashes };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) game.audio.tone(300, 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || over || halt || ready > 0 || phase !== 'push') return;
    drag = { x0: x, x: x };
    game.audio.tone(440, 0.03, { wave: 'triangle', volume: 0.04 });
  });
  game.onMove(function (x, y) {
    if (!drag || state !== S.PLAYING) return;
    var before = Math.floor(Math.abs(drag.x - drag.x0) / 80);
    drag.x = x;
    var after = Math.floor(Math.abs(drag.x - drag.x0) / 80);
    if (after !== before) game.audio.tone(300 + after * 80, 0.03, { wave: 'square', volume: 0.04 });
    wFrame = 1; wT = 0.1;
  });
  game.onRelease(function (x, y) {
    if (!drag || state !== S.PLAYING) { drag = null; return; }
    var len = x - drag.x0;
    drag = null;
    if (over || halt || phase !== 'push') return;
    if (shove(len, 1)) pushes++;
    else game.audio.play('se_tap', 0.1);
  });

  // ── 描画 ──
  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: INK, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, SKY], [0.4, MIST], [0.5, RIVER], [1, '#2a4a62']]);
    // 背景1層: 河口の防波堤と灯台、漂う雲
    game.draw.rect(0, H * 0.46, W, 18, STEEL, 0.6);
    game.draw.rect(W * 0.12, H * 0.38, 40, H * 0.08, WHITE);
    game.draw.rect(W * 0.12 - 6, H * 0.37, 52, 16, RED);
    for (var c = 0; c < 3; c++) { var cx = ((c * 420 + t * 18) % (W + 300)) - 150; game.draw.circle(cx, H * (0.12 + c * 0.05), 60, WHITE, 0.8); game.draw.circle(cx + 60, H * (0.12 + c * 0.05) + 10, 46, WHITE, 0.8); }
    for (var g = 0; g < 2; g++) game.draw.sprite(GULL[Math.floor(t * 4 + g) % 2], { w: WHITE }, ((g * 560 + t * 50) % (W + 200)) - 100, H * (0.24 + g * 0.05), 7, { anchor: 'center' });
    // 川面(縁の外)
    game.draw.rect(EDGE, WATER_Y - 10, W - EDGE, H - WATER_Y, RIVER);
    for (var w = 0; w < 5; w++) game.draw.rect(EDGE + 20 + ((w * 60 + t * 40) % (W - EDGE)), WATER_Y + w * 26, 50, 6, MIST, 0.6);
    // 床・坂・台座(縦の帯で塗る)
    var wet = ri === 2;
    for (var x = 0; x < EDGE; x += 10) {
      var gy = ground(x + 5);
      var col = x + 5 > RAMP1 ? (wet ? '#8a96a0' : CONC2) : CONC;
      game.draw.rect(x, gy, 10, H - gy, col);
      game.draw.rect(x, gy, 10, 6, CONC3);
    }
    if (wet) for (var s = 0; s < 4; s++) game.draw.rect(RAMP1 + 20 + s * 50 + Math.sin(t * 2 + s) * 6, topY() + 10, 30, 4, WHITE, 0.7);
    // 縁(勢い余りの予告で赤く点滅)
    var flash = warnEdge && Math.floor(t * 12) % 2 === 0;
    game.draw.rect(EDGE - 14, topY() - 8, 18, H - topY(), flash ? RED : YEL);
    // くぼみの目印
    game.draw.circle(SOCK, topY() + cfg().depth + 6, 12, phase === 'push' && Math.floor(t * 3) % 2 === 0 ? YEL : CONC3);
    // 立て終えた浮標(左の棚に並ぶ)
    for (var k = 0; k < stood; k++) drawStanding(W * 0.06 + k * 70, FLOOR, 0.55);
  }

  function drawStanding(x, y, sc) {
    var h = 230 * sc, wdt = 90 * sc;
    for (var i = 0; i < 4; i++) game.draw.rect(x - wdt / 2, y - h + i * h / 4, wdt, h / 4, i % 2 ? WHITE : RED);
    game.draw.rect(x - wdt * 0.15, y - h - 30 * sc, wdt * 0.3, 30 * sc, STEEL);
    game.draw.circle(x, y - h - 40 * sc, 16 * sc, YEL);
  }

  function drawBuoy(hl) {
    if (splash) {
      var k = 1 - splash.t / 0.9;
      game.draw.circle(splash.x, WATER_Y + k * 40, BR * (1 - k * 0.5), RED, 1 - k);
      return;
    }
    if (phase === 'stand') { drawStanding(SOCK, topY() + cfg().depth, 1); return; }
    var gy = ground(bx);
    var cy = gy - BR;
    var sc = hl > 0 ? 1 + hl * 0.4 : 1;
    game.draw.rect(bx - BR * 0.9, gy - 4, BR * 1.8, 10, INK, 0.3);
    if (hl > 0) game.draw.circle(bx, cy, (BR + 40) * sc, WHITE, 0.5 * hl);
    game.draw.circle(bx, cy, BR * sc + 6, INK);
    game.draw.circle(bx, cy, BR * sc, hl > 0 ? WHITE : RED);
    game.draw.circle(bx, cy, BR * 0.62 * sc, hl > 0 ? WHITE : WHITE);
    game.draw.circle(bx, cy, BR * 0.3 * sc, hl > 0 ? WHITE : RED);
    var mx = bx + Math.cos(spin) * BR * 0.8, my = cy + Math.sin(spin) * BR * 0.8;
    game.draw.circle(mx, my, 10, STEEL);
  }

  function drawWorker() {
    var gy = ground(wx);
    var fr = wT > 0 ? wFrame : (Math.abs(stepWx) > 1 ? Math.floor(game.time.elapsed * 8) % 2 : 0);
    if (drag) fr = 1;
    game.draw.rect(wx - 90, gy - 6, 180, 14, INK, 0.3);
    game.draw.sprite(WORKER[fr], W_PAL, wx, gy - 154 + Math.sin(game.time.elapsed * 2) * 3, 22, { anchor: 'center', flipX: side < 0 });
    if (drag) {
      var len = drag.x - drag.x0;
      var p = Math.min(1, Math.abs(len) / (PUSH_MAX / PUSH_K));
      var col = p > 0.75 ? RED : p > 0.45 ? YEL : WHITE;
      game.draw.line(bx, gy + 20, bx + (len > 0 ? 1 : -1) * p * 320, gy + 20, col, 16);
      game.draw.circle(bx + (len > 0 ? 1 : -1) * p * 320, gy + 20, 14, col);
    }
  }
  var stepWx = 0;

  function drawHud() {
    for (var i = 0; i < ROUNDS.length; i++) drawStanding(70 + i * 70, 120, 0.4 * (i < stood ? 1 : 0.6));
    big(String(score), W / 2, 112, 68, WHITE);
    for (var l = 0; l < LIVES; l++) { game.draw.circle(W - 80 - l * 80, 92, 30, l < lives ? RED : '#7a8a9a'); game.draw.circle(W - 80 - l * 80, 92, 16, SKY); }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 180, W - 120, 22, INK, 0.5);
    game.draw.rect(60, 180, (W - 120) * fr, 22, timeLeft < 5 && Math.floor(game.time.elapsed * 8) % 2 === 0 ? RED : YEL);
    big(stood + ' / ' + ROUNDS.length, W / 2, H * 0.14, 44, INK);
    // 親指ゾーン: 引く長さの目盛り
    var y = H * 0.88;
    game.draw.rect(90, y - 10, W - 180, 20, INK, 0.4);
    for (var m = 1; m <= 4; m++) game.draw.rect(W / 2 + m * 100 - 4, y - 24, 8, 48, m >= 3 ? RED : WHITE, 0.8);
    for (var n = 1; n <= 4; n++) game.draw.rect(W / 2 - n * 100 - 4, y - 24, 8, 48, n >= 3 ? RED : WHITE, 0.8);
    if (drag) game.draw.rect(Math.min(W / 2, W / 2 + (drag.x - drag.x0)), y - 10, Math.abs(drag.x - drag.x0), 20, YEL);
  }

  // ── ATTRACT デモ: 弱く押して転がり戻る → 加減して台座で止める → 次は強すぎて川へ(実ロジック) ──
  var DEMO_PUSHES = [{ r: 0, len: 180 }, { r: 0, len: 240 }, { r: 1, len: 360 }];
  var demo = { t: 0, k: 0, wait: 0, press: false, gx: W / 2, gy: H * 0.88, haltT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) { setupRound(0); stood = 0; demo.k = 0; demo.wait = 0.8; demo.haltT = 0; halt = null; }
    var ox = wx;
    stepWorker(dt);
    stepWx = wx - ox;
    if (demo.haltT > 0) {
      demo.haltT -= dt;
      if (demo.haltT <= 0) { halt = null; splash = { x: bx, t: 0.9 }; game.feedback.bad(bx, WATER_Y - 60, { text: 'MISS', volume: 0.3, shake: 4 }); }
      return;
    }
    if (splash) { splash.t -= dt; if (splash.t <= 0) splash = null; return; }
    if (phase === 'stand') { phT -= dt; if (phT <= 0 && demo.k < DEMO_PUSHES.length) { stood = 1; setupRound(1); demo.wait = 0.8; } return; }
    var settled = Math.abs(bv) < 5;
    if (demo.k < DEMO_PUSHES.length && settled && DEMO_PUSHES[demo.k].r === ri) {
      demo.wait -= dt;
      var sh = DEMO_PUSHES[demo.k];
      var p = Math.max(0, Math.min(1, 1 - demo.wait / 0.6));
      demo.gx = W / 2 + sh.len * p * 0.8; demo.gy = H * 0.88; demo.press = demo.wait < 0.6;
      drag = demo.press ? { x0: W / 2, x: W / 2 + sh.len * p } : null;
      if (demo.wait <= 0) { drag = null; shove(sh.len, 0.3); demo.k++; demo.wait = 0.9; demo.press = false; }
    }
    var r = stepBuoy(dt, 0.3);
    if (r === 'stand') standUp(0.3);
    else if (r === 'splash') { halt = { t: 0.4, max: 0.4 }; demo.haltT = 0.4; }
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      var hlA = halt ? Math.max(0, demo.haltT / 0.4) : 0;
      drawScene();
      drawBuoy(hlA);
      drawWorker();
      game.draw.hand(demo.gx, demo.gy + Math.sin(game.time.elapsed * 3) * 6, { press: demo.press, scale: 15 });
      big(TITLE, W / 2, H * 0.07, 104, RED);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 42, INK);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.97, 46, YEL);
      else big('INSERT COIN', W / 2, H * 0.97, 40, WHITE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.2) sendEnd();
      drawScene();
      drawBuoy(0);
      drawWorker();
      game.draw.rect(60, H * 0.12, W - 120, H * 0.25, INK, 0.8);
      big(won ? 'CLEAR' : timeUp ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.17, 104, won ? YEL : RED);
      big('SCORE ' + score, W / 2, H * 0.22, 56, WHITE);
      big(stood + ' / ' + ROUNDS.length + '   ' + pushes + '   ★' + perfects, W / 2, H * 0.265, 44, MIST);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 60, YEL);
      else big('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.31, 42, MIST);
      if (!won) big('あと' + Math.max(1, ROUNDS.length - stood) + '本!', W / 2, H * 0.355, 58, YEL);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.97, 40, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    var ox = wx;
    if (over) {
      endT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        halt = null; lives--; splashes++;
        splash = { x: bx, t: 0.9 };
        game.feedback.bad(bx, WATER_Y - 60, { text: 'MISS' });
        game.audio.play('se_break', 0.35);
        if (lives <= 0) finish(false);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      timeLeft -= dt;
      if (timeLeft <= 4 && Math.floor((timeLeft + dt) * 2) !== Math.floor(timeLeft * 2)) game.audio.tone(990, 0.05, { wave: 'square', volume: 0.05 });
      if (splash) {
        splash.t -= dt;
        if (splash.t <= 0) { splash = null; bx = START_X; bv = 0; restT = 0; wx = bx - BR - 60; side = 1; game.audio.tone(330, 0.1, { wave: 'triangle', volume: 0.05 }); }
      } else if (phase === 'stand') {
        phT -= dt;
        if (phT <= 0) nextRound();
      } else {
        var r = stepBuoy(dt, 1);
        if (r === 'stand') {
          stood++;
          var one = standUp(1);
          if (one) perfects++;
          var bonus = (one ? 700 : 400) * (ri + 1);
          score += bonus;
          game.fx.popup('+' + bonus, SOCK, topY() - 330, { color: YEL, size: 64 });
          game.audio.play('se_milestone', 0.5);
        } else if (r === 'splash') {
          drag = null;
          halt = { t: 0.45, max: 0.45 };
          game.fx.flash(WHITE, 0.12);
        }
      }
      if (!over && timeLeft <= 0) {
        timeLeft = 0; timeUp = true;
        game.fx.flash(WHITE, 0.15);
        game.feedback.bad(bx, ground(bx) - BR * 2, { text: 'TIME UP' });
        finish(false);
      }
    }
    if (!halt) stepWorker(dt);
    stepWx = wx - ox;

    drawScene();
    drawBuoy(hl);
    drawWorker();
    drawHud();
    if (pushes === 0 && ready <= 0 && !over && !drag) {
      var k = (game.time.elapsed % 1.4) / 1.4;
      game.draw.hand(W / 2 + k * 220, H * 0.88, { press: k < 0.85, scale: 12, alpha: 0.5 });
    }
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, RED);
  });

  game.onStart(function () {
    game.audio.melody([
      ['C5', 0.5], ['C5', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 1], ['D5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['A4', 0.5], ['G4', 1.5], ['R', 0.5],
      ['A4', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 2],
    ], { tempo: 112, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
