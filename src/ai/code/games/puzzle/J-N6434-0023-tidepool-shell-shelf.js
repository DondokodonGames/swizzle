// J-N6434-0023-tidepool-shell-shelf.js
// 潮だまりの貝細工屋台 — 並んだ貝の位置を覚え、波にさらわれた後で元の並びどおりにドラッグで戻す
// 操作: 波が引いたら足元の貝を指でつまみ、覚えた位置の布の枠までドラッグして離す(社内メモ。画面には出さない)
// 終わり: 2回の波(4個→5個)を全て元どおりに戻せば成功。置き間違い3回か時間切れで失敗
// @mechanic: drag_sort
// @theme: tidepool_shell_stall
// 世界観: 磯の貝細工屋台で店番をするヤドカリの見習いが、大波にさらわれて砂浜に散った売り物の貝を、波の前と同じ並びで敷き布の上に戻していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 正しく戻した貝の数・置き間違い数・残り秒
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形、上下に情報を分ける
  var STYLE = {
    bg: ['#bfe9ff', '#fff4d6', '#f7d9a8'],
    main: ['#ff9ec7', '#8fd6c9', '#b9a4ff'],
    accent: ['#ffcf5a', '#ff6b7a'],
  };
  var C = {
    sky: STYLE.bg[0], sand: STYLE.bg[1], sand2: STYLE.bg[2],
    pink: STYLE.main[0], mint: STYLE.main[1], lilac: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1],
    sea: '#7cc7f0', sea2: '#4fa3db', cloth: '#fff8ef', clothLine: '#f3c7da',
    ink: '#4b3a5a', white: '#ffffff',
  };

  var GAME_TITLE = 'SHELL SHELF';
  var TIME_LIMIT = 18;
  var ROUNDS = [4, 5];
  var NEEDED = 9;           // 戻す貝の総数
  var MISS_MAX = 3;
  var SLOT_Y = H * 0.42;
  var TRAY_Y = H * 0.80;
  var GRAB_R = 95, DROP_R = 120;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── 貝のスプライト(6種・形と色で見分ける) ─────────────────
  var KINDS = [
    { art: ['..pp..', '.pppp.', 'pwpwpp', 'pppppp', '.pwpw.', '..pp..'], pal: { p: '#ff9ec7', w: '#ffffff' } },          // 桜貝
    { art: ['...m..', '..mmm.', '.mmwmm', 'mmmmmm', '.mmmm.', '..mm..'], pal: { m: '#5cc4b0', w: '#ffffff' } },          // 巻貝
    { art: ['..y...', '..yy..', 'yyyyyy', '.yyyy.', '.y..y.', 'y....y'], pal: { y: '#ffc23a' } },                         // 星
    { art: ['l.l.l.', '.llll.', 'llwlll', 'llllll', '.llll.', 'l.l.l.'], pal: { l: '#9d85ff', w: '#ffffff' } },          // うに
    { art: ['.oooo.', 'o.oo.o', 'oooooo', 'o.oo.o', '.oooo.', '......'], pal: { o: '#ff7f50' } },                         // 帆立
    { art: ['.bbbb.', 'bbwwbb', 'bwwwwb', 'bbwwbb', '.bbbb.', '......'], pal: { b: '#6fa8ff', w: '#e8f4ff' } },          // 真珠貝
  ];
  var CRAB = [
    ['r.r..r.r', 'rr.rr.rr', '.rwrrwr.', '.rkrrkr.', 'rrrrrrrr', '.ssssss.', 'r.r..r.r'],
    ['.r.rr.r.', 'rr.rr.rr', '.rwrrwr.', '.rkrrkr.', 'rrrrrrrr', '.ssssss.', '.r.rr.r.'],
  ];
  var CRAB_PAL = { r: '#ff8a7a', w: '#ffffff', k: '#4b3a5a', s: '#b9a4ff' };
  var GULL = ['w...w', '.w.w.', '..w..'];
  var FOAM = ['.ww.ww.ww.', 'wwwwwwwwww'];

  // ── 状態 ─────────────────────────────────────────
  var round, order, slots, items, held, phase, phaseT, timeLeft, placed, misses;
  var ready, stopT, doneT, ok, endReason, focusItem, waveX, clearPerfect, roundMiss;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function initGame(demoMode) {
    round = 0; placed = 0; misses = 0; timeLeft = TIME_LIMIT;
    ready = demoMode ? 0 : 0.8; stopT = 0; doneT = 0; ok = false; endReason = ''; focusItem = null;
    held = null; clearPerfect = 0;
    startRound(demoMode);
    if (!demoMode) phase = 'ready';
  }

  function startRound(demoMode) {
    var n = ROUNDS[round];
    order = shuffle([0, 1, 2, 3, 4, 5]).slice(0, n);
    slots = [];
    var margin = 150, span = W - margin * 2;
    for (var i = 0; i < n; i++) slots.push({ x: margin + (n === 1 ? span / 2 : span * i / (n - 1)), y: SLOT_Y, kind: order[i], filled: false });
    items = [];
    var trayXs = shuffle(slots.map(function(s) { return s.x; }));
    for (var k = 0; k < n; k++) {
      items.push({ kind: order[k], x: slots[k].x, y: SLOT_Y, hx: trayXs[k], hy: TRAY_Y + (k % 2 === 0 ? -50 : 60), placed: false, bump: 0 });
    }
    phase = 'show'; phaseT = round === 0 ? 1.7 : 1.4; waveX = -300; roundMiss = 0;
  }

  function itemAt(x, y) {
    var best = null, bd = GRAB_R;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.placed) continue;
      var d = Math.hypot(it.x - x, it.y - y);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  // つまむ / 動かす / 離す(プレイヤーとデモAIで共通)
  function grab(x, y, live) {
    if (phase !== 'sort' || held) return;
    var it = itemAt(x, y);
    if (!it) {
      if (live) { game.audio.play('se_tap', 0.15); game.fx.burst(x, y, { color: C.sand2, count: 4, speed: 100 }); }
      return;
    }
    held = it; it.bump = 0.15;
    if (live) game.audio.tone('E5', 0.05, { wave: 'triangle', volume: 0.08 });
  }
  function moveHeld(x, y) {
    if (!held) return;
    held.x = x; held.y = y;
  }
  function drop(x, y, live) {
    if (!held) return;
    var it = held; held = null;
    var target = null, bd = DROP_R;
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].filled) continue;
      var d = Math.hypot(slots[i].x - x, slots[i].y - y);
      if (d < bd) { bd = d; target = slots[i]; }
    }
    if (!target) {
      it.x = it.hx; it.y = it.hy;
      if (live) { game.audio.play('se_tap', 0.2); game.fx.burst(it.x, it.y, { color: C.sand2, count: 5, speed: 120 }); }
      return;
    }
    if (target.kind === it.kind) {
      target.filled = true; it.placed = true; it.x = target.x; it.y = target.y; it.bump = 0.3;
      placed++;
      if (live) game.feedback.good(target.x, target.y - 40, { text: roundMiss === 0 ? 'PERFECT' : 'GOOD', color: C.mint, size: 50, count: 10 });
      else game.fx.burst(target.x, target.y, { color: C.mint, count: 8, speed: 200 });
      var left = 0;
      for (var k = 0; k < slots.length; k++) if (!slots[k].filled) left++;
      if (left === 0) roundDone(live);
    } else {
      misses++; roundMiss++;
      it.x = it.hx; it.y = it.hy; it.bump = 0.4;
      focusItem = { it: it, slot: target };
      if (live) game.feedback.bad(target.x, target.y - 40, { text: 'MISS', color: C.red, shake: 8 });
      else game.fx.burst(target.x, target.y, { color: C.red, count: 8, speed: 200 });
      if (misses >= MISS_MAX) failRun('miss', live);
    }
  }

  function roundDone(live) {
    if (roundMiss === 0) clearPerfect++;
    if (round + 1 >= ROUNDS.length) {
      phase = 'stop'; stopT = 0.6; ok = true; endReason = 'clear';
      if (live) {
        game.audio.stopBgm();
        game.feedback.good(W / 2, SLOT_Y - 160, { text: 'CLEAR', color: C.gold, size: 90, count: 30 });
        game.audio.play('se_success', 0.55);
      }
      return;
    }
    if (live) {
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(placed + ' / ' + NEEDED, W / 2, SLOT_Y - 170, { color: C.gold, size: 64 });
    }
    round++;
    phase = 'next'; phaseT = 0.7;
  }

  function failRun(reason, live) {
    phase = 'stop'; stopT = 0.6; ok = false; endReason = reason;
    held = null;
    if (live) { game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
  }

  function stepWorld(dt, live) {
    for (var i = 0; i < items.length; i++) if (items[i].bump > 0) items[i].bump -= dt;
    if (phase === 'show') {
      phaseT -= dt;
      // 大波の予告: 0.7秒前から沖に白波が立ち、低い音
      if (phaseT < 0.7 && waveX < -200) { waveX = -199; if (live) game.audio.tone('C3', 0.3, { wave: 'triangle', volume: 0.1, slide: -40 }); }
      if (phaseT <= 0) { phase = 'wave'; phaseT = 0.6; if (live) game.audio.play('se_break', 0.4); }
    } else if (phase === 'wave') {
      phaseT -= dt;
      var p = 1 - phaseT / 0.6;
      waveX = -300 + p * (W + 600);
      for (var k = 0; k < items.length; k++) {
        var it = items[k];
        if (waveX > it.x - 100) { it.x += (it.hx - it.x) * Math.min(1, dt * 12); it.y += (it.hy - it.y) * Math.min(1, dt * 12); }
      }
      if (phaseT <= 0) {
        for (var q = 0; q < items.length; q++) { items[q].x = items[q].hx; items[q].y = items[q].hy; }
        phase = 'sort'; waveX = -300;
      }
    } else if (phase === 'next') {
      phaseT -= dt;
      if (phaseT <= 0) startRound(!live);
    }
    if (live && (phase === 'sort' || phase === 'show' || phase === 'wave' || phase === 'next')) {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        failRun('time', true);
        game.feedback.bad(W / 2, SLOT_Y, { text: 'TIME UP', color: C.red, shake: 8 });
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.22, '#e6f7ff'], [0.26, C.sea], [0.30, C.sand], [1, C.sand2]]);
    game.draw.rect(0, 0, W, H, C.pink, 0.03 + 0.03 * Math.sin(t * 1.3));
    // 沖の波とカモメ
    for (var i = 0; i < 6; i++) {
      var fx = ((i * 220 + t * 40) % (W + 200)) - 100;
      game.draw.sprite(FOAM, { w: C.white }, fx, H * 0.265 + Math.sin(t * 2 + i) * 6, 6, { anchor: 'center', alpha: 0.8 });
    }
    game.draw.sprite(GULL, { w: C.white }, (t * 70) % (W + 100) - 50, H * 0.16 + Math.sin(t * 3) * 14, 10, { anchor: 'center' });
    // 敷き布
    game.draw.rect(80, SLOT_Y - 120, W - 160, 240, C.clothLine);
    game.draw.rect(92, SLOT_Y - 108, W - 184, 216, C.cloth);
    for (var s = 0; s < 5; s++) game.draw.rect(92, SLOT_Y - 108 + s * 54, W - 184, 4, C.clothLine, 0.5);
    // 砂浜のトレイ(親指ゾーン)
    game.draw.rect(60, TRAY_Y - 140, W - 120, 300, C.white, 0.25);
    game.draw.rect(60, TRAY_Y - 140, W - 120, 6, C.white, 0.6);
  }

  function drawSlots() {
    var t = game.time.elapsed;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (s.filled) continue;
      var pulse = phase === 'sort' ? 0.5 + 0.3 * Math.sin(t * 5 + i) : 0.35;
      game.draw.circle(s.x, s.y, 78, C.white, pulse);
      game.draw.circle(s.x, s.y, 66, C.cloth, 1);
      game.draw.text(String(i + 1), s.x, s.y + 100, { size: 30, color: C.clothLine, bold: true, align: 'center' });
    }
  }

  function drawItems(reveal) {
    var t = game.time.elapsed;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var k = KINDS[it.kind];
      var sc = 18 + (it.bump > 0 ? 5 : 0) + (it === held ? 4 : 0);
      var bob = it.placed || it === held ? 0 : Math.sin(t * 3 + i) * 6;
      if (it === held) game.draw.circle(it.x, it.y + 60, 50, C.ink, 0.15);
      if (phase === 'sort' && !it.placed && it !== held) game.draw.circle(it.x, it.y + bob, 70, C.white, 0.35 + 0.2 * Math.sin(t * 6 + i));
      game.draw.sprite(k.art, k.pal, it.x, it.y + bob, sc, { anchor: 'center' });
    }
    if (reveal) {
      // 失敗の因果: 正しい並びを布の上に薄く出す
      for (var s = 0; s < slots.length; s++) {
        if (slots[s].filled) continue;
        var kk = KINDS[slots[s].kind];
        game.draw.sprite(kk.art, kk.pal, slots[s].x, slots[s].y, 16, { anchor: 'center', alpha: 0.55 + 0.35 * Math.sin(t * 10) });
      }
    }
    if (focusItem && phase === 'stop') {
      game.draw.circle(focusItem.slot.x, focusItem.slot.y, 100, C.white, 0.4 + 0.3 * Math.sin(t * 30));
    }
  }

  function drawWave() {
    if (waveX <= -250) return;
    if (phase === 'show') {
      // 予告の白波(沖で盛り上がる)
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      game.draw.rect(0, H * 0.25, W, 30, C.white, blink ? 0.9 : 0.4);
      return;
    }
    for (var y = SLOT_Y - 200; y < TRAY_Y + 160; y += 8) {
      var edge = waveX + Math.sin(y * 0.02) * 60;
      game.draw.rect(edge - 260, y, 260, 8, C.sea2, 0.55);
      game.draw.rect(edge - 20, y, 30, 8, C.white, 0.9);
    }
  }

  function drawCrab() {
    var t = game.time.elapsed;
    var f = Math.floor(t * 5) % 2;
    var cx = W * 0.14 + Math.sin(t * 1.5) * 20;
    var joy = phase === 'stop' && ok ? Math.abs(Math.sin(t * 12)) * 40 : 0;
    game.draw.sprite(CRAB[f], CRAB_PAL, cx, H * 0.64 - joy + Math.sin(t * 4) * 4, 14, { anchor: 'center' });
  }

  function drawHud() {
    // 戻した貝の数(アイコン列の消し込み)
    txt(placed + ' / ' + NEEDED, W / 2, 70, 50, C.ink);
    var bx = 80, bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(bx, 130, bw, 18, C.white, 0.7);
    game.draw.rect(bx, 130, bw * (timeLeft / TIME_LIMIT), 18, low ? C.red : C.mint);
    for (var i = 0; i < MISS_MAX; i++) {
      game.draw.circle(W / 2 - 60 + i * 60, 195, 18, i < MISS_MAX - misses ? C.pink : '#d8c8d8');
    }
    for (var r = 0; r < ROUNDS.length; r++) {
      game.draw.circle(110 + r * 50, 195, 14, r < round || (r === round && phase === 'stop' && ok) ? C.gold : C.white);
    }
  }

  function drawScene() {
    drawBack();
    drawSlots();
    drawItems(phase === 'stop' && !ok);
    drawWave();
    drawCrab();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.54, W, H * 0.16, C.white, 0.8);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.58, 100, C.gold);
      txt(timeLeft.toFixed(1) + '秒', W / 2, H * 0.65, 46, C.mint);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.58, 90, C.red);
      txt('あと' + Math.max(1, NEEDED - placed) + '個!', W / 2, H * 0.65, 46, C.ink);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.52, 34, C.ink);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.49, 50, C.pink);
  }

  function calcScore() { return placed * 100 + clearPerfect * 200 + Math.round(timeLeft * 30); }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    if (phase === 'sort') grab(x, y, true);
    else game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !held) return;
    moveHeld(x, y);
    if (Math.random() < 0.12) game.fx.burst(x, y + 40, { color: C.white, count: 2, speed: 60 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    if (held) drop(x, y, true);
    else if (phase === 'sort') game.audio.play('se_tap', 0.05);
  });

  // ── ATTRACT デモ: AIが同じ grab/moveHeld/drop で並べ直す ─────────────
  var demo = { t: 0, gx: W / 2, gy: TRAY_Y, press: false, step: 0, st: 0, wrongDone: false, tx: 0, ty: 0, from: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.step = 0; demo.st = 0; demo.wrongDone = false; demo.from = null; }
    stepWorld(dt, false);
    if (phase !== 'sort') { demo.press = false; demo.gx += (W / 2 - demo.gx) * dt * 3; demo.gy += (TRAY_Y - demo.gy) * dt * 3; return; }
    demo.st += dt;
    if (!demo.from) {
      // 次に置く貝を選ぶ(1回だけわざと隣の枠へ置いて間違いを見せる)
      var pick = null, slot = null;
      for (var i = 0; i < slots.length && !pick; i++) {
        if (slots[i].filled) continue;
        for (var k = 0; k < items.length; k++) if (!items[k].placed && items[k].kind === slots[i].kind) { pick = items[k]; slot = slots[i]; break; }
      }
      if (!pick) return;
      if (!demo.wrongDone && placed >= 1) {
        for (var j = 0; j < slots.length; j++) if (!slots[j].filled && slots[j] !== slot) { slot = slots[j]; break; }
        demo.wrongDone = true;
      }
      demo.from = pick; demo.tx = slot.x; demo.ty = slot.y; demo.st = 0;
    }
    var it = demo.from;
    if (demo.st < 0.25) {
      demo.gx += (it.x - demo.gx) * Math.min(1, dt * 14); demo.gy += (it.y - demo.gy) * Math.min(1, dt * 14);
      demo.press = false;
    } else if (demo.st < 0.3) {
      if (!held) grab(it.x, it.y, false);
      demo.press = true;
    } else if (demo.st < 0.85) {
      var p = (demo.st - 0.3) / 0.55;
      demo.gx = it.hx + (demo.tx - it.hx) * p; demo.gy = it.hy + (demo.ty - it.hy) * p;
      moveHeld(demo.gx, demo.gy); demo.press = true;
    } else {
      drop(demo.tx, demo.ty, false);
      demo.press = false; demo.from = null;
    }
  }

  function startMusic() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['B4', 1],
      ['E5', 0.5], ['D5', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 1.5], [null, 0.5],
    ], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.07, 84, C.pink);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.12, 36, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.red);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'show'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { placed: placed, needed: NEEDED, misses: misses, perfectRounds: clearPerfect };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    } else {
      stepWorld(dt, true);
    }
    if (phase === 'stop' || phase === 'done') for (var i = 0; i < items.length; i++) if (items[i].bump > 0) items[i].bump -= dt;

    drawScene();
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 100, C.gold);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);
