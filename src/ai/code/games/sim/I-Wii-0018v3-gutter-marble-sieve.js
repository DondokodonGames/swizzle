// I-Wii-0018v3-gutter-marble-sieve.js
// 側溝のビー玉すくい — 指に付いてくるざるを雨上がりの側溝の流れに沈め、きらっと光るビー玉だけを受け止める。小石や泥は受けない
// 操作: 押している間、ざるは指の少し上で水に沈み、指を動かすと遅れて付いてくる。離すとざるが水から上がり、流れてくる物はその下を素通りする。ビー玉はときどききらっと光る。後半は色の付いたぬれ石(光らない)も流れてくるので、光るかどうかで見分ける
// 終わり: 20秒以内にビー玉を10個受け止めればCLEAR。小石・泥・ぬれ石を3回受けてしまうか、時間切れでGAME OVER
// @mechanic: drag_follow
// @theme: after_rain_gutter_marbles
// 世界観: 雨上がりの田舎道で、少年が道ばたの側溝にしゃがみ、指に付いてくるざるを流れに沈めたり上げたりして、流れてくるビー玉だけを受け止めて集める
// 残るもの: 正誤(CLEAR/GAME OVER) + 受けたビー玉の数・最大コンボ・ざるを上げて見送った石の数・スコア
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い黒縁、大きいアイコン、飛ぶ数字
  var STYLE = { bg: ['#7fe0ff', '#2a8f5a'], main: ['#2bd4ff', '#ffde2b', '#ff4fa3'], accent: ['#111111', '#ffffff'] };
  var C = {
    cyan: STYLE.main[0], yellow: STYLE.main[1], pink: STYLE.main[2], ink: STYLE.accent[0], white: STYLE.accent[1],
    grass: '#3cc85a', grassDk: '#2a8f5a', concrete: '#c9ccd2', concreteDk: '#8e939c', water: '#4fb6ff', waterDk: '#2a7fd0',
    pebble: '#8a8a8a', mud: '#7a4a24', green: '#3cff7a', red: '#ff3b3b',
  };
  var MARBLE_COLS = ['#2bd4ff', '#3cff7a', '#ff4fa3', '#ffde2b'];
  var WET_COLS = ['#3a8fb0', '#3a9a5a', '#a04a70'];

  var GAME_TITLE = 'MARBLE SIEVE';
  var TIME_LIMIT = 20;
  var NEEDED = 10;
  var MAX_BAD = 3;
  var GX0 = 230, GX1 = 850;
  var ZR = 88;
  var OFFSET = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var items, zaru, finger, spawnT, spawnN, playT, flow, got, bad, passed, combo, bestCombo, score, finalScore, ripples;
  var timeLeft, readyT, stopT, stopItem, fin, cleared, postT, joyT, sadT, warnT, endWhy;

  // 少年(野球帽)。しゃがんでざるの柄を持つ
  var BOY_A = ['...cccccc...', '..cccccccc..', '.cccccccccc.', '...ssssss...', '...sksskss..', '...ssssss...', '....ssmms...', '..tttttttt..', '.tttttttttt.', 's.tttttttt.s', '..bbbbbbbb..', '.bbb....bbb.'];
  var BOY_B = ['...cccccc...', '..cccccccc..', '.cccccccccc.', '...ssssss...', '...sksskss..', '...ssssss...', '....ssss....', '..tttttttt..', '.tttttttttt.', 's.tttttttt.s', '..bbbbbbbb..', '.bbb....bbb.'];
  var BOY_JOY = ['...cccccc...', '..cccccccc..', '.cccccccccc.', '...ssssss...', '...s.ss.s...', '...ssssss...', '...smmmms...', 's.tttttttt.s', '.tttttttttt.', '..tttttttt..', '..bbbbbbbb..', '.bbb....bbb.'];
  var BOY_SAD = ['............', '...cccccc...', '..cccccccc..', '.cccccccccc.', '...ssssss...', '...kssssk...', '...smmmms...', '..tttttttt..', '.tttttttttt.', 's.tttttttt.s', '..bbbbbbbb..', '.bbb....bbb.'];
  var BOY_PAL = { c: '#ff4fa3', s: '#ffc89a', k: '#111111', m: '#c0392b', t: '#ffde2b', b: '#2a5fd0' };
  var STAR = ['..w..', '..w..', 'wwwww', '..w..', '..w..'];

  function out(str, x, y, sz, color) {
    game.draw.text(str, x + 5, y + 5, { size: sz, color: C.ink, bold: true });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true });
  }
  function ringed(x, y, r, col, edge) {
    game.draw.circle(x, y, r + (edge || 7), C.ink);
    game.draw.circle(x, y, r, col);
  }

  function initGame() {
    items = []; ripples = [];
    zaru = { x: W / 2, y: H * 0.62, down: false };
    finger = { on: false, x: W / 2, y: H * 0.62 + OFFSET };
    spawnT = 0.4; spawnN = 0; playT = 0; flow = 300;
    got = 0; bad = 0; passed = 0; combo = 0; bestCombo = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopItem = null; fin = false; cleared = false; postT = 0;
    joyT = 0; sadT = 0; warnT = 0; endWhy = '';
  }

  // 流れてくる物の並び: ビー玉は光る。6秒を過ぎると光らない色付きのぬれ石が混じる
  function spawnItem(forceType) {
    var r = Math.random(), type;
    if (forceType) type = forceType;
    else if (spawnN < 3) type = spawnN === 1 ? 'pebble' : 'marble';
    else if (playT > 6 && r < 0.25) type = 'wet';
    else type = r < 0.58 ? 'marble' : (r < 0.8 ? 'pebble' : 'mud');
    var it = { type: type, x: game.random(GX0 + 60, GX1 - 60), y: 200, r: type === 'mud' ? 30 : 34, ph: Math.random() * 6.28, sway: game.random(0.6, 1.4), done: false };
    if (type === 'marble') it.col = MARBLE_COLS[spawnN % MARBLE_COLS.length];
    else if (type === 'wet') it.col = WET_COLS[spawnN % WET_COLS.length];
    it.glint = Math.random() * 0.7;
    items.push(it);
    spawnN++;
    if (type !== 'marble') game.audio.tone('C3', 0.06, { wave: 'triangle', volume: 0.04 });
  }

  // ざるの移動と受け止め(本番もデモも同じ処理)
  function stepZaru(dt) {
    var tx = Math.max(GX0 + ZR * 0.6, Math.min(GX1 - ZR * 0.6, finger.x));
    var ty = Math.max(H * 0.34, Math.min(H * 0.78, finger.y - OFFSET));
    var k = Math.min(1, dt * (finger.on ? 11 : 6));
    zaru.x += (tx - zaru.x) * k; zaru.y += (ty - zaru.y) * k;
    if (finger.on && !zaru.down) { ripples.push({ x: zaru.x, y: zaru.y, t: 0 }); game.audio.tone('E4', 0.05, { wave: 'sine', volume: 0.06, slide: -80 }); }
    zaru.down = finger.on;
  }

  function catchItem(it) {
    it.done = true;
    if (it.type === 'marble') {
      got++; combo++; if (combo > bestCombo) bestCombo = combo;
      var pts = 100 + combo * 20;
      score += pts; joyT = 0.5;
      game.feedback.good(zaru.x, zaru.y - 110, { text: combo >= 3 ? 'NICE' : 'GOOD', color: it.col, size: 60 });
      game.fx.popup('+' + pts, zaru.x + 80, zaru.y - 170, { color: C.yellow, size: 52 });
      if (combo >= 3) game.fx.popup('COMBO x' + combo, zaru.x - 60, zaru.y - 230, { color: C.white, size: 44 });
      game.audio.tone(880 + got * 40, 0.06, { wave: 'square', volume: 0.07 });
      if (got === 5 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('5 / ' + NEEDED, W / 2, H * 0.28, { color: C.yellow, size: 90 });
      }
      if (mode === S.PLAYING && got >= NEEDED) { stopT = 0.4; stopItem = null; game.audio.play('se_powerup', 0.4); }
    } else {
      // 受けてはいけない物: 止めて白く大きく見せてから
      combo = 0; stopT = 0.42; stopItem = it; it.done = false; it.hit = true;
      game.fx.flash(C.white, 0.15);
      game.audio.tone('C3', 0.3, { wave: 'square', volume: 0.1, slide: -80 });
    }
  }

  function resolveStop() {
    if (!stopItem) { ending(true); return; }
    bad++; sadT = 0.8;
    game.feedback.bad(stopItem.x, stopItem.y - 100, { text: 'MISS', color: C.red, size: 64 });
    stopItem.done = true; stopItem.thrown = 0.001;
    stopItem = null;
    if (mode === S.PLAYING && bad >= MAX_BAD) { endWhy = 'bad'; ending(false); }
  }

  function stepFlow(dt, spawning) {
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    for (var q = ripples.length - 1; q >= 0; q--) { ripples[q].t += dt; if (ripples[q].t > 0.5) ripples.splice(q, 1); }
    stepZaru(dt);
    if (spawning) {
      spawnT -= dt;
      if (spawnT <= 0) { spawnItem(); spawnT = Math.max(0.36, 0.6 - playT * 0.012); }
    }
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.thrown) { it.thrown += dt; it.x += 900 * dt * (it.x < W / 2 ? -1 : 1); it.y -= 400 * dt; if (it.thrown > 0.6) items.splice(i, 1); continue; }
      if (it.done) { items.splice(i, 1); continue; }
      it.y += flow * dt;
      it.x += Math.sin(game.time.elapsed * it.sway + it.ph) * 40 * dt;
      it.x = Math.max(GX0 + it.r, Math.min(GX1 - it.r, it.x));
      it.glint -= dt;
      if (it.glint <= -0.15) { it.glint = 0.55 + Math.random() * 0.3; if (it.type === 'marble' && it.y > 220 && Math.random() < 0.4) game.audio.tone(2600, 0.02, { wave: 'sine', volume: 0.02 }); }
      if (zaru.down && Math.hypot(it.x - zaru.x, it.y - zaru.y) < ZR - it.r * 0.3) { catchItem(it); if (stopT > 0) return; continue; }
      if (it.y > H * 0.82) {
        if (it.type !== 'marble' && !it.counted) { it.counted = true; passed++; }
        if (it.type === 'marble') combo = 0;
        items.splice(i, 1);
      }
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 50) + bestCombo * 40 + (MAX_BAD - bad) * 150 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(140 + i * 160, H * 0.4 + (i % 2) * 140, { color: MARBLE_COLS[i % 4], count: 18, speed: 520 });
      game.fx.flash(C.white, 0.2);
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    finger.on = true; finger.x = x; finger.y = y;
    game.audio.play('se_tap', 0.2);
  });
  game.onMove(function(x, y) {
    if (!finger.on) return;
    var far = Math.hypot(x - finger.x, y - finger.y) > 120;
    finger.x = x; finger.y = y;
    if (far) game.audio.tone('G4', 0.03, { wave: 'sine', volume: 0.04 });
  });
  game.onRelease(function(x, y) {
    if (!finger.on) return;
    finger.on = false;
    if (mode === S.PLAYING) { game.audio.tone('A5', 0.05, { wave: 'sine', volume: 0.06, slide: 200 }); game.fx.burst(zaru.x, zaru.y, { color: C.white, count: 6, speed: 220 }); }
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  // ---- 描画 ----
  function drawGutter(t) {
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.12, C.grass], [1, STYLE.bg[1]]]);
    // 土手の草(大きい丸)
    for (var g = 0; g < 9; g++) {
      ringed(70 + (g % 2) * 60, 300 + g * 170, 50, g % 2 ? C.grass : C.grassDk, 5);
      ringed(W - 70 - (g % 2) * 60, 360 + g * 170, 50, g % 2 ? C.grassDk : C.grass, 5);
    }
    // 側溝の壁と水
    game.draw.rect(GX0 - 30, 180, 30, H * 0.72, C.ink);
    game.draw.rect(GX1, 180, 30, H * 0.72, C.ink);
    game.draw.rect(GX0 - 24, 180, 18, H * 0.72, C.concrete);
    game.draw.rect(GX1 + 6, 180, 18, H * 0.72, C.concreteDk);
    game.draw.rect(GX0, 180, GX1 - GX0, H * 0.72, C.water);
    var off = (t * flow) % 120;
    for (var y = 120; y < H * 0.82; y += 120) for (var x = 0; x < 4; x++) game.draw.rect(GX0 + 40 + x * 150, y + off, 70, 10, C.white, 0.35);
    for (var d = 0; d < 6; d++) game.draw.rect(GX0 + 10 + d * 100, 180 + ((t * flow * 0.8 + d * 211) % (H * 0.7)), 8, 50, C.waterDk, 0.5);
    // 水たまりと道(手前)
    game.draw.rect(0, H * 0.82, W, H * 0.18, '#d8b878');
    ringed(W * 0.8, H * 0.92, 70, C.water, 5);
    game.draw.circle(W * 0.8 - 20, H * 0.92 - 20, 18, C.white, 0.6);
  }

  function drawItem(it, t) {
    var big = it.hit && stopT > 0 ? 1.5 : 1;
    var white = it.hit && stopT > 0 && Math.floor(t * 16) % 2 === 0;
    var r = it.r * big;
    if (it.type === 'marble') {
      ringed(it.x, it.y, r, white ? C.white : it.col, 6);
      game.draw.circle(it.x + r * 0.15, it.y + r * 0.1, r * 0.55, C.white, 0.35);
      game.draw.circle(it.x - r * 0.35, it.y - r * 0.35, r * 0.25, C.white);
      // きらっ(ビー玉だけが周期的に光る)
      if (it.glint < 0) game.draw.sprite(STAR, { w: C.white }, it.x + r * 0.5, it.y - r * 0.6, 12, { anchor: 'center' });
    } else if (it.type === 'wet') {
      ringed(it.x, it.y, r, white ? C.white : it.col, 6);
      game.draw.circle(it.x + r * 0.2, it.y + r * 0.25, r * 0.5, C.ink, 0.25);
      game.draw.rect(it.x - r * 0.4, it.y - r * 0.2, r * 0.5, 6, C.ink, 0.3);
    } else if (it.type === 'pebble') {
      ringed(it.x, it.y, r, white ? C.white : C.pebble, 6);
      game.draw.circle(it.x - r * 0.3, it.y - r * 0.3, r * 0.3, '#b0b0b0');
    } else {
      ringed(it.x, it.y, r, white ? C.white : C.mud, 6);
      game.draw.circle(it.x + 10, it.y - 8, r * 0.45, '#5a3418');
      game.draw.circle(it.x - 14, it.y + 10, r * 0.3, '#5a3418');
    }
  }

  function drawZaru(t) {
    for (var q = 0; q < ripples.length; q++) game.draw.circle(ripples[q].x, ripples[q].y, ZR + ripples[q].t * 160, C.white, 0.4 * (1 - ripples[q].t / 0.5));
    var lift = zaru.down ? 0 : 1;
    var x = zaru.x, y = zaru.y - lift * 40, r = ZR * (1 + lift * 0.12);
    if (lift) game.draw.circle(x + 20, zaru.y + 30, ZR, C.ink, 0.18);
    game.draw.circle(x, y, r + 8, C.ink, lift ? 0.6 : 1);
    game.draw.circle(x, y, r, C.yellow, lift ? 0.5 : 0.9);
    // 編み目
    for (var k = -2; k <= 2; k++) {
      game.draw.line(x - r * 0.8, y + k * r * 0.3, x + r * 0.8, y + k * r * 0.3, '#b8941a', 4);
      game.draw.line(x + k * r * 0.3, y - r * 0.8, x + k * r * 0.3, y + r * 0.8, '#b8941a', 4);
    }
    if (zaru.down) game.draw.rect(x - r, y - 6, r * 2, 12, C.water, 0.5);
    // 柄: 少年の手から
    game.draw.line(W / 2 - 40, H * 0.86, x, y + r * 0.7, C.ink, 18);
    game.draw.line(W / 2 - 40, H * 0.86, x, y + r * 0.7, '#c08a3a', 10);
  }

  function drawBoy(t) {
    var f = sadT > 0 || (fin && !cleared) ? BOY_SAD : joyT > 0 || (fin && cleared) ? BOY_JOY : (Math.floor(t * 2) % 2 ? BOY_A : BOY_B);
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 14)) * 20 : 0;
    game.draw.sprite(f, BOY_PAL, W / 2 - 160, H * 0.9 + hop, 15, { anchor: 'center' });
    // 集めたビー玉のびん
    var bx = W / 2 + 200, by = H * 0.9;
    game.draw.rect(bx - 66, by - 96, 132, 172, C.ink);
    game.draw.rect(bx - 58, by - 88, 116, 156, '#e8f8ff');
    for (var i = 0; i < Math.min(got, NEEDED + 4); i++) game.draw.circle(bx - 36 + (i % 4) * 24, by + 50 - Math.floor(i / 4) * 26, 12, MARBLE_COLS[i % 4]);
  }

  function drawHud(t) {
    var low = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(0, 0, W, 180, C.ink, 0.25);
    game.draw.rect(56, 28, W - 112, 30, C.ink);
    game.draw.rect(62, 34, (W - 124) * Math.max(0, timeLeft / TIME_LIMIT), 18, low ? C.red : C.yellow);
    out(got + ' / ' + NEEDED, W / 2, 125, 72, C.white);
    for (var b = 0; b < MAX_BAD; b++) ringed(90 + b * 64, 125, 20, b < bad ? C.red : C.pebble, 4);
    out('' + score, W - 140, 125, 46, C.yellow);
  }

  function drawScene(t) {
    drawGutter(t);
    for (var i = 0; i < items.length; i++) drawItem(items[i], t);
    drawZaru(t);
    drawBoy(t);
  }

  // ---- ATTRACT: 本物の stepFlow()/catchItem() で実演。ビー玉の下へざるを沈め、小石の前では上げて見送り、終わりぎわに光らないぬれ石を受けてMISS ----
  var demo = { t: 0 };
  var DEMO_SEQ = ['marble', 'pebble', 'marble', 'marble', 'wet', 'marble'];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 9;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.k = 0; demo.sp = 0.2; playT = 7; }
    demo.sp -= dt;
    if (demo.sp <= 0 && demo.k < DEMO_SEQ.length && stopT <= 0) { spawnItem(DEMO_SEQ[demo.k]); demo.k++; demo.sp = 0.75; }
    // ねらい: 一番下の物。ビー玉(とデモの失敗役のぬれ石)なら沈めて待ち、他は上げて見送る
    var target = null;
    for (var i = 0; i < items.length; i++) if (!items[i].done && !items[i].thrown && items[i].y < H * 0.7 && (!target || items[i].y > target.y)) target = items[i];
    if (target) {
      var want = target.type === 'marble' || target.type === 'wet';
      finger.x = target.x;
      finger.y = Math.min(H * 0.66, target.y + 160) + OFFSET;
      finger.on = want && target.y > H * 0.36;
    } else finger.on = false;
    stepFlow(dt, false);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(finger.x, finger.y, { press: finger.on, scale: 13 });
      out(GAME_TITLE, W / 2, H * 0.06 + Math.sin(t * 2) * 5, 90, C.yellow);
      out('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.105, 38, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, C.yellow);
      else out('TAP TO START', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 520, C.ink, 0.9);
      game.draw.rect(90, H * 0.3, W - 180, 14, cleared ? C.yellow : C.red);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? C.yellow : C.red);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, C.white);
      out(got + ' / ' + NEEDED + '   COMBO x' + bestCombo, W / 2, H * 0.46, 44, C.white);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, C.yellow);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, C.yellow);
      if (!cleared) out('あと' + (NEEDED - got) + '個!', W / 2, H * 0.27, 64, C.red);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { marbles: got, bad: bad, passedStones: passed, bestCombo: bestCombo };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) { timeLeft -= dt; playT += dt; flow = 300 + playT * 8; }
      stepFlow(dt, true);
      if (!fin && timeLeft < 4) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.fx.flash(C.white, 0.15);
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: C.red, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.48, 120, C.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 2],
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 0.5], ['B5', 0.5], ['G5', 0.5], ['A5', 1],
      ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 2],
    ], { tempo: 136, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['F2', 1], ['G2', 1], ['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1]] });
    mode = S.ATTRACT;
    initGame();
  });
})(game);
