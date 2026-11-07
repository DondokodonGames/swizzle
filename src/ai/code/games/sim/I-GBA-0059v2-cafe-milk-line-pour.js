// I-GBA-0059v2-cafe-milk-line-pour.js
// ひと押しミルク — 1回押すごとに同じ量のミルクが注がれる。カップの線ちょうどの回数で止めてベルで出す
// 操作: 画面(ベル以外)をタップするとピッチャーが一度傾き、少し遅れて一定量のミルクが落ちる。線ぴったりになったと思ったら右下のベルをタップして出す
// 終わり: 4杯を出し終えた時点でハートが残っていればCLEAR。線を越える/足りないまま出すとハートを1つ失い、2つ失う/20秒経過でGAME OVER
// @mechanic: count_exact
// @theme: cafe_counter_milk_line
// 世界観: 喫茶店のカウンターで、見習いバリスタがピッチャーのミルクをひと押しずつ注ぎ、カップに引かれた線ぴったりで止めてお客へ出す
// 残るもの: 正誤(CLEAR/GAME OVER) + ぴったり出せた杯数・注いだ回数・スコア
// スタイル: HYPERCASUAL 3D

(function (game) {
  var STYLE = { bg: ['#fbf7f1', '#efe6da', '#e2d6c6'], main: ['#ff7a6a', '#3ab0a8', '#ffc84a'], accent: ['#c8935e', '#fff4e2'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var CREAM = STYLE.bg[0], LATTE = STYLE.bg[1], SAND = STYLE.bg[2];
  var CORAL = STYLE.main[0], TEAL = STYLE.main[1], SUN = STYLE.main[2];
  var COFFEE = STYLE.accent[0], MILK = STYLE.accent[1];
  var INK = '#3a2e28', SOFT = '#00000022', WHITE = '#ffffff', RED = '#ff4a5a', MINT = '#7ad8a8';

  var TITLE = 'MILK LINE';
  var TIME_LIMIT = 20;
  var HEARTS = 2;
  var FALL = 0.45;
  var CUPS = [
    { line: 3, step: 64, ticks: true, col: CORAL, half: 110 },
    { line: 5, step: 50, ticks: true, col: TEAL, half: 130 },
    { line: 4, step: 62, ticks: false, col: SUN, half: 150 },
    { line: 6, step: 48, ticks: false, col: MINT, half: 105 },
  ];
  var CUP_X = W * 0.56, CUP_BASE = H * 0.66;
  var BELL_X = W * 0.8, BELL_Y = H * 0.86;
  var POT_X = W * 0.56 + 110, POT_Y = H * 0.27;

  var BARISTA = [
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '..ssmmss..', '...ssss...', '.aaaaaaaa.', 'saaggggaas', 's.agggga.s', '..agggga..', '..gggggg..', '..gg..gg..', '..pp..pp..', '.bbb..bbb.'],
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '..ssmmss..', '...ssss..s', '.aaaaaaaas', 'saaggggaa.', 's.agggga..', '..agggga..', '..gggggg..', '..gg..gg..', '..pp..pp..', '.bbb..bbb.'],
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..sesses..', '..smttms..', 's..ssss..s', '.aaaaaaaa.', '.aaggggaa.', '..agggga..', '..agggga..', '..gggggg..', '..gg..gg..', '..pp..pp..', '.bbb..bbb.'],
    ['...hhhh...', '..hhhhhh..', '..hssssh..', '..skssks..', '..ssmmss..', '...ssss...', '.aaaaaaaa.', 'saaggggaas', 's.agggga.s', '..agggga..', '..gggggg..', '..gg..gg..', '..pp..pp..', '.bbb..bbb.'],
  ];
  var B_PAL = { h: '#5a3a2a', s: '#f2c9a0', e: INK, k: INK, m: '#c0504a', t: '#8a2a2a', a: WHITE, g: TEAL, p: '#5a5a6a', b: '#3a2a2a' };
  var BELL = ['...k...', '..yyy..', '.yyyyy.', '.yyyyy.', 'yyyyyyy', 'kkkkkkk'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var cupI, level, shown, pending, presses, totalPress, exact, hearts, score, timeLeft, cupT, phase, slide, tilt, ripple, mood, moodT;
  var ready, halt, over, won, endT, resT, sent, prevBest, bellFlash, lastShort;

  function cup() { return CUPS[Math.min(cupI, CUPS.length - 1)]; }

  function initGame() {
    cupI = 0; level = 0; shown = 0; pending = []; presses = 0; totalPress = 0; exact = 0; hearts = HEARTS; score = 0;
    timeLeft = TIME_LIMIT; cupT = 0; phase = 'pour'; slide = 0; tilt = 0; ripple = 0; mood = 0; moodT = 0;
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
    bellFlash = 0; lastShort = 0;
  }

  function nextCup() {
    cupI++; level = 0; shown = 0; pending = []; presses = 0; cupT = 0; phase = 'pour'; slide = 1; lastShort = 0;
  }

  // ── ひと押し / ベル(プレイ・デモ共通) ──
  function pour(vol) {
    var v = vol || 1;
    if (phase !== 'pour') { game.audio.tone(200, 0.04, { wave: 'sine', volume: 0.03 * v }); return; }
    pending.push(FALL);
    presses++; totalPress++;
    tilt = 0.3;
    game.audio.tone(392 + presses * 40, 0.06, { wave: 'triangle', volume: 0.08 * v });
  }

  function land(vol) {
    level++;
    ripple = 0.35;
    game.audio.tone(523 + level * 60, 0.05, { wave: 'sine', volume: 0.07 * vol });
    game.fx.burst(CUP_X, surfaceY(), { color: MILK, count: 5, speed: 140 });
    if (level > cup().line) {
      phase = 'fail'; lastShort = 0;
      if (state === S.PLAYING) halt = { t: 0.5, max: 0.5, kind: 'over' };
      else game.feedback.bad(CUP_X, surfaceY() - 80, { text: 'MISS', volume: 0.25 });
      pending = [];
    }
  }

  function serve(vol) {
    var v = vol || 1;
    bellFlash = 0.25;
    game.audio.tone(1568, 0.18, { wave: 'sine', volume: 0.1 * v });
    if (phase !== 'pour') return;
    phase = 'serving';
  }

  function judge(vol) {
    var c = cup();
    if (level === c.line) {
      exact++;
      var bonus = Math.max(0, Math.floor((5 - cupT) * 40));
      if (state === S.PLAYING) score += 300 + bonus;
      game.feedback.good(CUP_X, surfaceY() - 90, { text: 'PERFECT', color: TEAL, count: 16, volume: 0.6 * vol });
      if (state === S.PLAYING && exact === 2) { game.fx.popup('2 / ' + CUPS.length, W / 2, H * 0.22, { color: CORAL, size: 72 }); game.audio.play('se_milestone', 0.4); }
      else game.audio.play('se_coin', 0.3 * vol);
      mood = 2; moodT = 0.8; phase = 'done';
    } else {
      lastShort = c.line - level;
      phase = 'fail';
      if (state === S.PLAYING) halt = { t: 0.45, max: 0.45, kind: 'short' };
      else game.feedback.bad(CUP_X, surfaceY() - 80, { text: 'MISS', volume: 0.25 });
    }
  }

  function afterFail() {
    hearts--; mood = 3; moodT = 0.8;
    game.feedback.bad(CUP_X, surfaceY() - 90, { text: lastShort > 0 ? 'あと' + lastShort + '回' : 'MISS' });
    game.audio.play('se_break', 0.3);
    if (hearts <= 0) finish(false);
    else { phase = 'done'; }
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 25);
    mood = ok ? 2 : 3; moodT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.3 + (i % 2) * 0.1), { color: [CORAL, TEAL, SUN][i % 3], count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { exact: exact, presses: totalPress, hearts: hearts };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  function isBell(x, y) { return Math.hypot(x - BELL_X, y - BELL_Y) < 150; }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0 || slide > 0) { game.audio.play('se_tap', 0.05); return; }
    if (isBell(x, y)) serve(1); else pour(1);
  });

  // ── 描画 ──
  function surfaceY() { return CUP_BASE - 20 - shown * cup().step; }

  function shadow(x, y, rx) {
    // 柔らかい楕円の接地影(横ストリップ)
    var hh = Math.max(8, rx * 0.09);
    for (var dy = -hh; dy <= hh; dy += 4) {
      var w = rx * 0.5 * Math.sqrt(Math.max(0, 1 - (dy / hh) * (dy / hh)));
      game.draw.rect(x - w, y + dy, w * 2, 4, '#000000', 0.08);
    }
  }

  function drawCafe() {
    game.draw.gradient(0, H, [[0, CREAM], [0.55, LATTE], [0.7, SAND], [0.7, '#e8c8a0'], [0.78, '#d8b48a'], [1, '#f0e2cc']]);
    // 遠景: 丸いペンダント照明と棚
    for (var l = 0; l < 3; l++) {
      var lx = W * (0.2 + l * 0.3);
      game.draw.line(lx, 0, lx, H * 0.11, '#cbbca8', 4);
      game.draw.circle(lx, H * 0.12, 44, [CORAL, SUN, TEAL][l]);
      game.draw.circle(lx, H * 0.15, 70, SUN, 0.1);
    }
    game.draw.rect(W * 0.06, H * 0.36, W * 0.3, 14, '#dccab2');
    for (var j = 0; j < 4; j++) game.draw.circle(W * 0.1 + j * 75, H * 0.34, 26, [TEAL, CORAL, SUN, MINT][j]);
    // カウンター
    game.draw.rect(0, H * 0.69, W, 18, '#c99a6a');
  }

  function drawBarista() {
    var fr = moodT > 0 ? mood : tilt > 0 ? 1 : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 5 + (fr === 2 ? -Math.abs(Math.sin(game.time.elapsed * 12)) * 20 : 0);
    shadow(W * 0.17, H * 0.69, 160);
    game.draw.sprite(BARISTA[fr], B_PAL, W * 0.17, H * 0.56 + bob, 22, { anchor: 'center' });
  }

  function drawCup(hl) {
    var c = cup();
    var x = CUP_X + slide * W * 0.6;
    var innerH = (c.line + 1.4) * c.step + 20;
    var top = CUP_BASE - innerH;
    shadow(x, CUP_BASE + 16, c.half * 2.2);
    // ガラスの器
    game.draw.rect(x - c.half - 14, top, c.half * 2 + 28, innerH + 14, c.col, 0.18);
    // ミルク(落ちた分)と泡
    var sy = CUP_BASE - 20 - shown * c.step;
    if (shown > 0.01) {
      game.draw.rect(x - c.half, sy, c.half * 2, CUP_BASE - sy, MILK);
      game.draw.rect(x - c.half, CUP_BASE - 30, c.half * 2, 30, COFFEE, 0.5);
      var wave = Math.sin(game.time.elapsed * 20) * ripple * 30;
      game.draw.circle(x - c.half * 0.4, sy + 2 - wave, 16 + ripple * 30, WHITE, 0.8);
      game.draw.circle(x + c.half * 0.4, sy + 2 + wave, 16 + ripple * 30, WHITE, 0.8);
    }
    // 器の縁と取っ手
    game.draw.rect(x - c.half - 14, top, 14, innerH + 14, c.col);
    game.draw.rect(x + c.half, top, 14, innerH + 14, c.col);
    game.draw.rect(x - c.half - 14, CUP_BASE - 6, c.half * 2 + 28, 20, c.col);
    game.draw.circle(x + c.half + 50, top + innerH * 0.45, 46, c.col);
    game.draw.circle(x + c.half + 50, top + innerH * 0.45, 26, CREAM);
    game.draw.rect(x - c.half - 6, top + 6, 8, innerH * 0.7, WHITE, 0.6);
    // 目盛り(前半の杯だけ)
    if (c.ticks) for (var k = 1; k <= c.line; k++) game.draw.rect(x - c.half - 34, CUP_BASE - 20 - k * c.step - 2, 22, 5, INK, 0.45);
    // ゴールの線: 白く明滅する線と両端の旗
    var ly = CUP_BASE - 20 - c.line * c.step;
    var blink = Math.floor(game.time.elapsed * 4) % 2 === 0;
    game.draw.rect(x - c.half - 20, ly - 4, c.half * 2 + 40, 8, hl ? WHITE : blink ? WHITE : CORAL, hl ? 1 : 0.9);
    if (hl) game.draw.rect(x - c.half - 40, ly - 14, c.half * 2 + 80, 28, RED, hl * 0.6);
    game.draw.rect(x - c.half - 40, ly - 30, 8, 34, INK);
    game.draw.rect(x - c.half - 32, ly - 30, 26, 16, CORAL);
  }

  function drawPitcher() {
    var t = Math.min(1, tilt / 0.3);
    var sx = POT_X - t * 40, sy = POT_Y + t * 30;
    shadow(POT_X, POT_Y + 140, 120);
    game.draw.circle(sx + 20, sy + 40, 80, '#d8dde2');
    game.draw.circle(sx + 20, sy + 40, 66, '#eef2f5');
    game.draw.rect(sx - 70, sy - 10 + t * 20, 70, 26, '#d8dde2');
    game.draw.circle(sx - 70, sy + 3 + t * 30, 14, '#d8dde2');
    game.draw.circle(sx + 100, sy + 40, 30, '#c8cdd2');
    game.draw.circle(sx + 100, sy + 40, 16, CREAM);
    // 落下中のミルク
    var c = cup();
    for (var i = 0; i < pending.length; i++) {
      var k = 1 - pending[i] / FALL;
      var y0 = sy + 10 + k * (surfaceY() - sy - 10);
      game.draw.rect(CUP_X - 10 + slide * W * 0.6, sy + 10, 20, Math.max(0, y0 - sy - 10), MILK);
      game.draw.circle(CUP_X + slide * W * 0.6, y0, 18, WHITE);
    }
    if (c && pending.length > 0) game.draw.circle(sx - 70, sy + 10, 20, WHITE, 0.8);
  }

  function drawButtons() {
    // 親指ゾーン: 注ぐ(広い面) と ベル
    var pressGlow = phase === 'pour' && !over;
    game.draw.circle(W * 0.32, H * 0.86, 150, pressGlow ? TEAL : SAND, pressGlow ? 0.3 : 0.4);
    game.draw.circle(W * 0.32, H * 0.86 + 8, 120, '#000000', 0.06);
    game.draw.circle(W * 0.32, H * 0.86, 120, pressGlow ? TEAL : '#c8bcae');
    game.draw.circle(W * 0.32 + 10, H * 0.86 - 10, 54, WHITE);
    game.draw.rect(W * 0.32 - 70, H * 0.86 - 22, 40, 20, WHITE);
    for (var d = 0; d < 3; d++) game.draw.circle(W * 0.32 - 60, H * 0.86 + 20 + d * 26 + (game.time.elapsed * 60) % 26, 8, WHITE, 0.9 - d * 0.25);
    var ready2 = phase === 'pour' && level > 0;
    var bb = Math.sin(game.time.elapsed * 6) * (ready2 ? 8 : 2);
    game.draw.circle(BELL_X, BELL_Y + 8, 120, '#000000', 0.06);
    game.draw.circle(BELL_X, BELL_Y, 120, ready2 ? CORAL : '#d8ccbc');
    if (bellFlash > 0) game.draw.circle(BELL_X, BELL_Y, 140, WHITE, bellFlash * 3);
    game.draw.sprite(BELL, { y: SUN, k: INK }, BELL_X, BELL_Y + bb, 22, { anchor: 'center' });
  }

  function big(s, x, y, sz, col) {
    game.draw.text(s, x + 3, y + 5, { size: sz, color: '#00000030', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center' });
  }

  function drawHud() {
    for (var i = 0; i < CUPS.length; i++) {
      var done = i < cupI || (i === cupI && phase === 'done');
      game.draw.circle(80 + i * 76, 92, 28, done ? CUPS[i].col : '#e0d6c8');
    }
    big(String(score), W / 2, 92, 64, INK);
    for (var h = 0; h < HEARTS; h++) {
      var hx = W - 90 - h * 90;
      game.draw.circle(hx - 16, 84, 22, h < hearts ? RED : '#e0d6c8');
      game.draw.circle(hx + 16, 84, 22, h < hearts ? RED : '#e0d6c8');
      game.draw.circle(hx, 106, 20, h < hearts ? RED : '#e0d6c8');
    }
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    game.draw.rect(60, 176, W - 120, 22, '#e0d6c8');
    game.draw.rect(60, 176, (W - 120) * fr, 22, timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : TEAL);
    // 押した回数のしるし(数字は出さず粒で)
    for (var p = 0; p < presses; p++) game.draw.circle(CUP_X - (presses - 1) * 18 + p * 36, H * 0.255, 12, MILK);
  }

  // ── ATTRACT デモ: 落ちきるのを待って3回 → ベルでPERFECT / 次は焦って4回 → 線を越えてMISS ──
  var demo = { t: 0, gx: W * 0.32, gy: H * 0.86, press: 0, i: 0, r2: false };
  var SCRIPT = [
    { at: 0.4, a: 'pour' }, { at: 1.0, a: 'pour' }, { at: 1.6, a: 'pour' }, { at: 2.3, a: 'bell' },
    { at: 3.0, a: 'pour' }, { at: 3.15, a: 'pour' }, { at: 3.3, a: 'pour' }, { at: 3.45, a: 'pour' },
  ];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.8;
    if (cyc < dt || demo.t <= dt) { cupI = 0; level = 0; shown = 0; pending = []; presses = 0; phase = 'pour'; slide = 0; demo.i = 0; moodT = 0; demo.r2 = false; }
    if (!demo.r2 && cyc > 2.75) { demo.r2 = true; level = 0; shown = 0; pending = []; presses = 0; phase = 'pour'; slide = 0.6; }
    while (demo.i < SCRIPT.length && cyc >= SCRIPT[demo.i].at) {
      var a = SCRIPT[demo.i].a;
      demo.gx = a === 'bell' ? BELL_X : W * 0.32; demo.gy = a === 'bell' ? BELL_Y : H * 0.86;
      demo.press = 0.1;
      if (a === 'bell') serve(0.35); else pour(0.35);
      demo.i++;
    }
    if (demo.press > 0) demo.press -= dt;
  }

  function tick(dt, vol) {
    for (var i = pending.length - 1; i >= 0; i--) {
      pending[i] -= dt;
      if (pending[i] <= 0) { pending.splice(i, 1); land(vol); if (phase === 'fail') break; }
    }
    shown += (level - shown) * Math.min(1, dt * 10);
    if (phase === 'serving' && pending.length === 0) judge(vol);
    if (tilt > 0) tilt -= dt;
    if (ripple > 0) ripple -= dt;
    if (slide > 0) slide = Math.max(0, slide - dt * 2.4);
    if (moodT > 0) moodT -= dt;
    if (bellFlash > 0) bellFlash -= dt;
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      tick(dt, 0.35);
      drawCafe();
      drawBarista();
      drawCup(0);
      drawPitcher();
      drawButtons();
      game.draw.hand(demo.gx, demo.gy - 20, { press: demo.press > 0, scale: 15 });
      big(TITLE, W / 2, H * 0.085, 100, CORAL);
      big('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.125, 40, TEAL);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) big('► 100円 投入 ◄', W / 2, H * 0.97, 44, CORAL);
      else big('INSERT COIN', W / 2, H * 0.97, 38, INK);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      if (moodT > 0) moodT -= dt;
      drawCafe();
      drawBarista();
      drawCup(0);
      game.draw.rect(60, H * 0.12, W - 120, H * 0.24, WHITE, 0.85);
      big(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.165, 104, won ? TEAL : RED);
      big('SCORE ' + score, W / 2, H * 0.22, 56, INK);
      big(exact + ' / ' + CUPS.length + '   PERFECT', W / 2, H * 0.265, 42, CORAL);
      if (won && score > prevBest) big('NEW RECORD', W / 2, H * 0.31, 58, SUN);
      else big('BEST ' + Math.max(prevBest, score), W / 2, H * 0.31, 40, COFFEE);
      if (!won) big(lastShort > 0 ? 'あと' + lastShort + '回!' : 'あと' + (CUPS.length - exact) + '杯!', W / 2, H * 0.4, 60, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) big('TAP TO CONTINUE', W / 2, H * 0.97, 38, INK);
      return;
    }

    // ── PLAYING ──
    var hl = 0;
    if (over) {
      endT -= dt;
      if (moodT > 0) moodT -= dt;
      if (endT <= 0) { state = S.RESULT; resT = 0; }
    } else if (halt) {
      halt.t -= dt;
      hl = Math.max(0, halt.t / halt.max);
      if (halt.t <= 0) {
        var kind = halt.kind;
        halt = null;
        if (kind === 'time') { game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); finish(false); }
        else afterFail();
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else {
      timeLeft -= dt;
      cupT += dt;
      tick(dt, 1);
      if (phase === 'done' && moodT <= 0.2 && !halt && !over) {
        if (cupI >= CUPS.length - 1) finish(true);
        else nextCup();
      }
      if (!over && !halt && timeLeft <= 0) { timeLeft = 0; halt = { t: 0.4, max: 0.4, kind: 'time' }; }
    }

    drawCafe();
    drawBarista();
    drawCup(hl);
    drawPitcher();
    drawButtons();
    drawHud();
    if (cupI === 0 && presses === 0 && ready <= 0 && !over) game.draw.hand(W * 0.32, H * 0.86 - 20, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 13, alpha: 0.6 });
    if (cupI === 0 && level === CUPS[0].line && phase === 'pour') game.draw.hand(BELL_X, BELL_Y - 20, { press: true, scale: 13, alpha: 0.6 });
    if (ready > 0) big(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 120, CORAL);
  });

  game.onStart(function () {
    game.audio.melody([
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['G4', 0.5], ['C5', 1], ['E5', 0.5], ['G5', 0.5],
      ['F5', 0.5], ['D5', 0.5], ['B4', 0.5], ['D5', 0.5], ['C5', 1.5], ['R', 0.5],
    ], { tempo: 104, wave: 'sine', volume: 0.07, loop: true, bass: [['C3', 2], ['G2', 2], ['F2', 2], ['C3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
