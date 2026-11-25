// I-GBA-0061v2-terrace-sluice-notch.js
// 水門ひと締め — 軋む水門の輪を1回ずつ締める。軋みが収まりトンボが輪に止まった時だけ、次の1回を締めて水を止める
// 操作: 画面をタップすると輪が一段締まる。締めた後は輪が軋んで揺れ、トンボが飛び回る。トンボが輪に止まるまで待ってから次をタップ。軋み中に押すと輪が滑って一段戻る(いったん静まってまた軋むこともある)
// 終わり: 上・中・下の3つの水門を締め切ればCLEAR。下の田んぼが畔からあふれるたびに笠を1つ失い、2つ失う/14秒経過でGAME OVER
// @mechanic: cooldown_tap
// @theme: terrace_paddy_sluice_wheel
// 世界観: 山あいの棚田の水門で、笠をかぶった水番の老人が、軋む水門の輪を一段ずつ締め、下の田があふれる前に上から順に水を止めていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 締めた段数・滑らせた回数・PERFECT数・スコア
// スタイル: 8bit HOME

(function (game) {
  var STYLE = { bg: ['#5cb8ff', '#3a8a3a', '#1c3a1c'], main: ['#8ad84a', '#2a6ad8', '#b86a2a'], accent: ['#f8f8f8', '#e83a3a'] };
  var W = game.canvas.width;
  var H = game.canvas.height;
  var SKY = STYLE.bg[0], HILL = STYLE.bg[1], DEEP = STYLE.bg[2];
  var RICE = STYLE.main[0], WATER = STYLE.main[1], MUD = STYLE.main[2];
  var WHITE = STYLE.accent[0], RED = STYLE.accent[1];
  var BLACK = '#000000', STONE = '#8a8a8a';
  var PX = 12;

  var TITLE = 'SLUICE KEEPER';
  var TIME_LIMIT = 14;
  var HATS = 2;
  var GATES = [
    { n: 3, rate: 0.2, start: 0.4, creak: [0.6, 0.9, 0.7], feint: [false, false, true] },
    { n: 4, rate: 0.22, start: 0.35, creak: [0.8, 0.5, 1.0, 0.7], feint: [false, true, false, true] },
    { n: 4, rate: 0.25, start: 0.3, creak: [0.7, 1.1, 0.5, 0.9], feint: [true, false, true, false] },
  ];
  var WX = W * 0.46, WY = H * 0.26, WR = 110;
  var PADDY_TOP = H * 0.53, PADDY_BOT = H * 0.7;

  var KEEPER = [
    ['...yyyy...', '.yyyyyyyy.', 'yyyyyyyyyy', '..ssssss..', '..sesses..', '..swwwws..', '...wwww...', '.kkkkkkkk.', 'skkkkkkkks', '..kkkkkk..', '..kkkkkk..', '..k....k..', '.bb....bb.'],
    ['...yyyy...', '.yyyyyyyy.', 'yyyyyyyyyy', '..ssssss..', '..sesses..', '..swwwws..', 'ss.wwww...', '.skkkkkkk.', '..kkkkkkk.', '..kkkkkk..', '..kkkkkk..', '..k....k..', '.bb....bb.'],
    ['...yyyy...', '.yyyyyyyy.', 'yyyyyyyyyy', '..ssssss..', '..sossos..', '..swwwws..', 's..wwww..s', '.kkkkkkkk.', '..kkkkkk..', '..kkkkkk..', '..kkkkkk..', '.k......k.', 'bb......bb'],
  ];
  var K_PAL = { y: '#d8b860', s: '#e8b088', e: BLACK, o: WHITE, w: WHITE, k: '#3a4ab0', b: '#5a3a1a' };
  var DRAGONFLY = [['ww.ww..', '.rrrrrr', 'ww.ww..'], ['.w..w..', '.rrrrrr', '.w..w..']];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var gi, notches, phase, phT, feint, sinceLand, level, slips, perfects, totalNotch, hats, score, timeLeft;
  var walkT, wheelA, wheelTo, fly, ready, halt, over, won, endT, resT, sent, prevBest, mood, moodT, creakTick, warnTick, pulse;

  function gate() { return GATES[Math.min(gi, GATES.length - 1)]; }
  function doneNotches() { var d = notches; for (var i = 0; i < gi && i < GATES.length; i++) d += GATES[i].n; return d; }

  function setupGate(i) {
    gi = i; notches = 0; phase = 'ready'; phT = 0; feint = false; sinceLand = 0; level = GATES[i].start;
    wheelA = 0; wheelTo = 0;
  }

  function initGame() {
    setupGate(0);
    slips = 0; perfects = 0; totalNotch = 0; hats = HATS; score = 0; timeLeft = TIME_LIMIT; walkT = 0;
    fly = { x: WX, y: WY - WR - 20 };
    ready = 0.8; halt = null; over = false; won = false; endT = 0; resT = 0; sent = false; prevBest = game.best || 0;
    mood = 0; moodT = 0; creakTick = 0; warnTick = 0; pulse = 0;
  }

  // ── 一段締める(プレイ・デモ共通) ──
  function tighten(vol) {
    var v = vol || 1;
    if (walkT > 0 || phase === 'closed') { game.audio.tone(240, 0.03, { wave: 'square', volume: 0.03 * v }); return; }
    pulse = 0.15;
    if (phase !== 'ready') {
      // 軋み中に締めた: 輪が滑って一段戻る
      slips++;
      notches = Math.max(0, notches - 1);
      wheelTo -= Math.PI / 4;
      phase = 'creak'; phT = 0.8; feint = false;
      mood = 2; moodT = 0.5;
      game.feedback.bad(WX, WY - 40, { text: 'MISS', shake: 10, volume: 0.6 * v });
      game.audio.tone(110, 0.2, { wave: 'sawtooth', volume: 0.08 * v, slide: -40 });
      return;
    }
    notches++; totalNotch++;
    wheelTo += Math.PI / 4;
    var perfect = sinceLand < 0.3;
    if (perfect) perfects++;
    if (state === S.PLAYING) score += perfect ? 150 : 100;
    mood = 1; moodT = 0.3;
    game.feedback.good(WX, WY - WR - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: RICE, count: 10, volume: 0.5 * v });
    game.audio.tone(330 + notches * 80, 0.08, { wave: 'square', volume: 0.08 * v });
    if (notches >= gate().n) {
      phase = 'closed';
      if (state === S.PLAYING) {
        score += 200 + Math.floor((1 - level) * 200);
        game.fx.popup((gi + 1) + ' / ' + GATES.length, W / 2, H * 0.2, { color: WHITE, size: 80 });
        game.audio.play('se_milestone', 0.45);
        if (gi >= GATES.length - 1) finish(true);
        else walkT = 0.8;
      }
      return;
    }
    phase = 'creak'; phT = gate().creak[notches - 1]; feint = gate().feint[notches - 1];
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; endT = 1.3;
    if (ok) score += Math.floor(timeLeft * 30) + hats * 100;
    mood = ok ? 1 : 2; moodT = 9;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.55);
    if (ok) for (var i = 0; i < 6; i++) game.fx.burst(W * (0.1 + i * 0.16), H * (0.35 + (i % 2) * 0.1), { color: i % 2 ? RICE : WATER, count: 16, speed: 420 });
  }

  function sendEnd() {
    if (sent) return;
    sent = true;
    var stats = { notches: totalNotch, slips: slips, perfect: perfects, hats: hats };
    if (won) game.end.success(score, stats); else game.end.failure(stats);
  }

  // ── 入力 ──
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.2); sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over || halt || ready > 0) { game.audio.play('se_tap', 0.05); return; }
    tighten(1);
  });

  // ── 軋み・トンボ・水(プレイ・デモ共通) ──
  function tick(dt, vol) {
    if (phase === 'creak') {
      phT -= dt;
      creakTick -= dt;
      if (creakTick <= 0) { creakTick = 0.13; game.audio.tone(140 + Math.random() * 40, 0.06, { wave: 'sawtooth', volume: 0.05 * vol }); }
      if (phT <= 0) {
        if (feint) { phase = 'lull'; phT = 0.3; }
        else { phase = 'ready'; sinceLand = 0; game.audio.tone(1320, 0.08, { wave: 'square', volume: 0.06 * vol }); }
      }
    } else if (phase === 'lull') {
      // 一度静まるが、まだ止まっていない(フェイント)
      phT -= dt;
      if (phT <= 0) { phase = 'creak'; phT = 0.35; feint = false; game.audio.tone(120, 0.12, { wave: 'sawtooth', volume: 0.06 * vol }); }
    } else if (phase === 'ready') sinceLand += dt;
    // トンボ: 軋み中は輪のまわりを飛び回り、静まると輪のてっぺんに止まる
    var tx, ty;
    if (phase === 'ready' || phase === 'closed') { tx = WX; ty = WY - WR - 22; }
    else if (phase === 'lull') { tx = WX + 30; ty = WY - WR - 60; }
    else { var a = game.time.elapsed * 5; tx = WX + Math.cos(a) * 190; ty = WY - 60 + Math.sin(a * 1.7) * 90; }
    fly.x += (tx - fly.x) * Math.min(1, dt * 7);
    fly.y += (ty - fly.y) * Math.min(1, dt * 7);
    wheelA += (wheelTo - wheelA) * Math.min(1, dt * 12);
    if (moodT > 0) moodT -= dt;
    if (pulse > 0) pulse -= dt;
  }

  // ── 描画(8×8 の粗いドットとタイル反復) ──
  function blocky(x, y, w, h, c) { game.draw.rect(Math.round(x / PX) * PX, Math.round(y / PX) * PX, Math.round(w / PX) * PX, Math.round(h / PX) * PX, c); }

  function drawHills(scrollY) {
    game.draw.gradient(0, H, [[0, SKY], [0.2, '#8ad0ff'], [0.2, HILL], [1, DEEP]]);
    // 遠景の山と段々の棚田(タイル反復)
    for (var m = 0; m < 10; m++) blocky(m * 120, H * 0.14 - (m % 3) * 36, 132, 80 + (m % 3) * 36, '#2a6a3a');
    for (var r = 0; r < 9; r++) {
      var ty = H * 0.2 + r * 96 - scrollY;
      if (ty < H * 0.18 || ty > H) continue;
      var off = (r % 2) * 48;
      blocky(0, ty, W, 72, r % 2 ? HILL : '#4a9a3a');
      blocky(0, ty + 72, W, 24, MUD);
      for (var c = -1; c < 12; c++) blocky(c * 96 + off + 24, ty + 24, 24, 24, RICE);
    }
  }

  function drawChannelAndGate(hl) {
    var open = 1 - notches / gate().n;
    // 上の水路
    blocky(0, H * 0.31, WX - 140, 72, WATER);
    for (var w = 0; w < 6; w++) blocky(((w * 180 + game.time.elapsed * 160) % (WX - 160)), H * 0.31 + 24, 48, 12, WHITE);
    // 石の柱と板
    blocky(WX - 168, WY + WR * 0.2, 60, H * 0.53 - WY - WR * 0.2, STONE);
    blocky(WX + 108, WY + WR * 0.2, 60, H * 0.53 - WY - WR * 0.2, STONE);
    var boardBot = H * 0.33 + (1 - open) * (H * 0.13);
    blocky(WX - 108, WY + WR * 0.2, 216, boardBot - WY - WR * 0.2, MUD);
    for (var k = 0; k < 4; k++) blocky(WX - 108, WY + WR * 0.2 + k * 60, 216, 12, '#7a4a1a');
    // 板の下から落ちる水(開き具合で太さが変わる)
    if (open > 0) {
      var sw = 24 + open * 168;
      blocky(WX - sw / 2, boardBot, sw, PADDY_BOT - boardBot - (PADDY_BOT - PADDY_TOP) * level, WATER);
      for (var d = 0; d < 4; d++) blocky(WX - sw / 2 + d * sw / 4, boardBot + ((game.time.elapsed * 600 + d * 70) % 200), 12, 36, WHITE);
    }
    // 輪: 軋み中は揺れ、静まると縁が白く明滅(押せる合図)
    var shake = phase === 'creak' ? Math.sin(game.time.elapsed * 70) * 8 : 0;
    var cx = WX + shake, cy = WY;
    var readyGlow = phase === 'ready' && Math.floor(game.time.elapsed * 4) % 2 === 0;
    game.draw.circle(cx, cy, WR + 16, readyGlow ? WHITE : BLACK);
    game.draw.circle(cx, cy, WR, MUD);
    game.draw.circle(cx, cy, WR - 24, phase === 'creak' ? '#5a2a10' : DEEP);
    for (var s = 0; s < 4; s++) {
      var a = wheelA + s * Math.PI / 4;
      game.draw.line(cx - Math.cos(a) * WR, cy - Math.sin(a) * WR, cx + Math.cos(a) * WR, cy + Math.sin(a) * WR, MUD, 16);
    }
    game.draw.circle(cx, cy, 24, BLACK);
    if (pulse > 0) game.draw.circle(cx, cy, WR + 30, WHITE, pulse * 3);
    // 段数のしるし
    for (var n = 0; n < gate().n; n++) blocky(WX - gate().n * 30 + n * 60 + 12, WY + WR + 30, 36, 24, n < notches ? RICE : BLACK);
    // トンボ
    var fr = DRAGONFLY[phase === 'ready' || phase === 'closed' ? 1 : Math.floor(game.time.elapsed * 20) % 2];
    game.draw.sprite(fr, { w: WHITE, r: RED }, fly.x, fly.y, PX, { anchor: 'center' });
  }

  function drawPaddy(hl) {
    // 下の田: 水位が畔(上端)に届くとあふれる
    blocky(W * 0.06, PADDY_TOP - 24, W * 0.88, 24, hl ? WHITE : MUD);
    blocky(W * 0.06, PADDY_TOP, 36, PADDY_BOT - PADDY_TOP, MUD);
    blocky(W * 0.94 - 36, PADDY_TOP, 36, PADDY_BOT - PADDY_TOP, MUD);
    blocky(W * 0.06, PADDY_BOT, W * 0.88, 36, MUD);
    var depth = PADDY_BOT - PADDY_TOP;
    var wy = PADDY_BOT - depth * Math.min(1, level);
    blocky(W * 0.06 + 36, wy, W * 0.88 - 72, PADDY_BOT - wy, WATER);
    for (var c = 0; c < 9; c++) {
      var rx = W * 0.12 + c * 96;
      blocky(rx, PADDY_BOT - 96, 12, 84, RICE);
      blocky(rx - 12, PADDY_BOT - 108, 36, 24, RICE);
    }
    var danger = level > 0.85;
    if (danger && Math.floor(game.time.elapsed * 8) % 2 === 0) {
      blocky(W * 0.06, PADDY_TOP - 36, W * 0.88, 12, RED);
      blocky(W * 0.06, PADDY_TOP - 120, 48, 72, RED);
      blocky(W * 0.06 + 12, PADDY_TOP - 108, 24, 36, WHITE);
      blocky(W * 0.06 + 12, PADDY_TOP - 60, 24, 12, WHITE);
    }
    if (hl) game.draw.rect(W * 0.04, PADDY_TOP - 50, W * 0.92, depth + 100, WHITE, hl * 0.4);
  }

  function drawKeeper() {
    var fr = moodT > 0 ? (mood === 2 ? 2 : 1) : 0;
    var bob = Math.sin(game.time.elapsed * 3) * 4;
    game.draw.sprite(KEEPER[fr], K_PAL, W * 0.8, H * 0.37 + bob, PX * 1.5, { anchor: 'center', flipX: true });
  }

  function drawPad() {
    // 親指ゾーン: 輪のアイコン。押せる時だけ明るく光る
    var on = phase === 'ready' && walkT <= 0;
    blocky(W / 2 - 216, H * 0.8, 432, 216, on ? MUD : '#3a2a1a');
    blocky(W / 2 - 192, H * 0.8 + 24, 384, 168, on ? '#d88a4a' : '#2a1a0a');
    game.draw.circle(W / 2, H * 0.8 + 108, 60, on ? WHITE : '#5a4a3a');
    game.draw.circle(W / 2, H * 0.8 + 108, 40, on ? MUD : '#2a1a0a');
    if (on) game.draw.sprite(DRAGONFLY[1], { w: WHITE, r: RED }, W / 2 + 120, H * 0.8 + 60, 10, { anchor: 'center' });
  }

  function txt(s, x, y, sz, col) {
    game.draw.text(s, x + 6, y + 6, { size: sz, color: BLACK, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: 'center', font: 'monospace' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 214, BLACK, 0.55);
    for (var g = 0; g < GATES.length; g++) blocky(48 + g * 84, 64, 60, 60, g < gi || (g === gi && phase === 'closed') ? WATER : '#2a2a2a');
    txt(String(score), W / 2, 94, 60, WHITE);
    for (var h = 0; h < HATS; h++) game.draw.sprite(KEEPER[0].slice(0, 3), K_PAL, W - 96 - h * 120, 94, PX, { anchor: 'center', alpha: h < hats ? 1 : 0.25 });
    var fr = Math.max(0, timeLeft / TIME_LIMIT);
    blocky(48, 168, W - 96, 24, '#2a2a2a');
    blocky(48, 168, (W - 96) * fr, 24, timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0 ? RED : RICE);
  }

  // ── ATTRACT デモ: トンボが止まるのを待って2回締める → 軋み中に押して滑らせる → 待って締める ──
  var demo = { t: 0, press: 0, step: 0, waitT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { setupGate(0); level = 0.5; demo.step = 0; demo.waitT = 0; }
    level = Math.min(0.95, level + (1 - notches / gate().n) * 0.05 * dt);
    if (phase === 'ready') demo.waitT += dt; else demo.waitT = 0;
    if (demo.step === 2 && phase === 'creak' && cyc > 2.0) { demo.press = 0.12; tighten(0.35); demo.step++; }
    else if (demo.step !== 2 && phase === 'ready' && demo.waitT > 0.18 && cyc > 0.4) { demo.press = 0.12; tighten(0.35); demo.step++; }
    if (demo.press > 0) demo.press -= dt;
  }

  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      tick(dt, 0.35);
      drawHills(0);
      drawPaddy(0);
      drawChannelAndGate(0);
      drawKeeper();
      drawPad();
      game.draw.hand(W / 2, H * 0.8 + 100, { press: demo.press > 0, scale: 15 });
      txt(TITLE, W / 2, H * 0.06, 84, WHITE);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 40, RICE);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, WHITE);
      else txt('INSERT COIN', W / 2, H * 0.97, 38, RICE);
      return;
    }

    if (state === S.RESULT) {
      resT += dt;
      if (resT > 1.1) sendEnd();
      if (moodT > 0) moodT -= dt;
      drawHills(0);
      drawPaddy(0);
      drawChannelAndGate(0);
      drawKeeper();
      game.draw.rect(48, H * 0.12, W - 96, H * 0.25, BLACK, 0.8);
      txt(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.165, 96, won ? RICE : RED);
      txt('SCORE ' + score, W / 2, H * 0.22, 54, WHITE);
      txt(doneNotches() + ' / 11   MISS x' + slips, W / 2, H * 0.265, 40, WHITE);
      if (won && score > prevBest) txt('NEW RECORD', W / 2, H * 0.31, 56, RICE);
      else txt('BEST ' + Math.max(prevBest, score), W / 2, H * 0.31, 40, RICE);
      if (!won) txt('あと' + Math.max(1, 11 - doneNotches()) + '段!', W / 2, H * 0.35, 54, RED);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 38, WHITE);
      return;
    }

    // ── PLAYING ──
    var hl = 0, scrollY = 0;
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
        if (kind === 'flood') {
          hats--; mood = 2; moodT = 0.6;
          game.feedback.bad(W / 2, PADDY_TOP - 60, { text: 'MISS' });
          game.audio.play('se_break', 0.35);
          if (hats <= 0) finish(false); else level = 0.55;
        } else { game.feedback.bad(W / 2, H * 0.4, { text: 'TIME UP' }); finish(false); }
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
    } else if (walkT > 0) {
      // 次の水門へ下りる
      walkT -= dt;
      timeLeft -= dt;
      scrollY = (1 - walkT / 0.8) * 96;
      if (walkT <= 0) { walkT = 0; setupGate(gi + 1); game.audio.tone(520, 0.08, { wave: 'square', volume: 0.06 }); }
    } else {
      timeLeft -= dt;
      tick(dt, 1);
      if (phase !== 'closed') level += (1 - notches / gate().n) * gate().rate * dt;
      if (level > 0.85) { warnTick -= dt; if (warnTick <= 0) { warnTick = 0.25; game.audio.tone(880, 0.05, { wave: 'square', volume: 0.05 }); } }
      if (!over && level >= 1) { level = 1; halt = { t: 0.5, max: 0.5, kind: 'flood' }; game.fx.flash(WHITE, 0.12); }
      else if (!over && timeLeft <= 0) { timeLeft = 0; halt = { t: 0.35, max: 0.35, kind: 'time' }; }
    }

    drawHills(scrollY);
    drawPaddy(halt && halt.kind === 'flood' ? hl : 0);
    drawChannelAndGate(hl);
    drawKeeper();
    drawPad();
    drawHud();
    if (gi === 0 && totalNotch === 0 && ready <= 0 && !over) game.draw.hand(W / 2, H * 0.8 + 100, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 13, alpha: 0.6 });
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 120, WHITE);
  });

  game.onStart(function () {
    game.audio.melody([
      ['D5', 0.5], ['E5', 0.5], ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['B4', 1],
      ['A4', 0.5], ['B4', 0.5], ['D5', 0.5], ['E5', 0.5], ['D5', 1.5], ['R', 0.5],
    ], { tempo: 116, wave: 'square', volume: 0.05, loop: true, bass: [['G2', 1], ['D3', 1], ['G2', 1], ['D3', 1], ['E2', 1], ['B2', 1], ['G2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
