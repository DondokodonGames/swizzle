// J-N6434-0022-crystal-sway-rail.js
// 水晶坑の揺れレール — 傾いて迫るレール区間ごとに高い側へ体を振り、トロッコを加速させて出口の門へ急ぐ
// 操作: 迫る区間の光る高い側へ左右スワイプで体重を振る。赤い梁は下スワイプでかがむ(社内メモ。画面には出さない)
// 終わり: 200m先の出口門に制限時間内に着けば成功。ぐらつき3回で脱線、または時間切れで失敗
// @mechanic: swipe_direction
// @theme: crystal_mine_sway_rail
// 世界観: 水晶坑で蛍石を運ぶモグラの鉱夫が、揺れる吊りレールの傾きに合わせて体を振り、閉坑の合図より先にトロッコを出口門まで走らせる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達距離・決めた体重移動の数・残り秒
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ + 発光4色、疑似グロー(太い暗線+細い明線)、点滅が命
  var STYLE = {
    bg: ['#05061c', '#150a3c', '#2a0d58'],
    main: ['#27f3ff', '#ff3df2', '#b6ff3d'],
    accent: ['#ffe14d', '#ff3355'],
  };
  var C = {
    top: STYLE.bg[0], mid: STYLE.bg[1], low: STYLE.bg[2],
    cyan: STYLE.main[0], pink: STYLE.main[1], lime: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1],
    cyanDim: '#0d4a66', pinkDim: '#4a1150', ink: '#05061c', white: '#ffffff',
  };

  var GAME_TITLE = 'SWAY RAIL';
  var TIME_LIMIT = 14;
  var GOAL = 200;          // m
  var MISS_MAX = 3;
  var PX = 50;             // 1m あたりのpx
  var CART_Y = H * 0.70;
  var RAIL_X = 118;
  var BASE_SPEED = 10;     // m/s
  var WIN_FAR = 7, WIN_NEAR = -2;   // 判定窓(区間までの距離 m)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── スプライト ──────────────────────────────────────
  // モグラの鉱夫 + トロッコ(通常/かがみ)
  var MOLE_UP = [
    '...yy...',
    '..yyyy..',
    '.bbbbbb.',
    '.bwbbwb.',
    '.bbppbb.',
    '..bbbb..',
    'cccccccc',
    'c.cccc.c',
    'cccccccc',
    '.o....o.',
  ];
  var MOLE_UP2 = [
    '..y..y..',
    '..yyyy..',
    '.bbbbbb.',
    '.bkbbkb.',
    '.bbppbb.',
    '..bbbb..',
    'cccccccc',
    'c.cccc.c',
    'cccccccc',
    '..o..o..',
  ];
  var MOLE_DUCK = [
    '........',
    '........',
    '........',
    '...yy...',
    '.bbbbbb.',
    '.bkbbkb.',
    'cccccccc',
    'c.cccc.c',
    'cccccccc',
    '.o....o.',
  ];
  var MOLE_PAL = { y: STYLE.accent[0], b: '#9a6bff', w: '#ffffff', k: '#05061c', p: '#ff9ad8', c: STYLE.main[0], o: STYLE.main[1] };
  var CRYSTAL = ['..c..', '.ccc.', '.cwc.', 'ccccc', '.ccc.', '..c..'];
  var CHEV_L = ['...ww', '..ww.', '.ww..', 'ww...', '.ww..', '..ww.', '...ww'];
  var CHEV_R = ['ww...', '.ww..', '..ww.', '...ww', '..ww.', '.ww..', 'ww...'];
  var SPIKES = ['r.r.r.r.r.r.r.r.', 'rrrrrrrrrrrrrrrr'];
  var BANG = ['.yy.', '.yy.', '.yy.', '.yy.', '....', '.yy.'];
  var GATE = ['gggggggggg', 'g........g', 'g.gggggg.g', 'g.g....g.g'];

  // ── 状態 ─────────────────────────────────────────
  var dist, boost, hazards, nextD, timeLeft, runT, misses, combo, bestCombo, hits;
  var ready, phase, stopT, doneT, ok, lean, duckT, wobbleT, focus, halfShown, endReason;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function glowLine(x1, y1, x2, y2, dim, bright, w) {
    game.draw.line(x1, y1, x2, y2, dim, w * 3);
    game.draw.line(x1, y1, x2, y2, bright, w);
  }

  function initGame(demoMode) {
    dist = 0; boost = 0; hazards = []; nextD = 24; timeLeft = TIME_LIMIT; runT = 0;
    misses = 0; combo = 0; bestCombo = 0; hits = 0;
    ready = demoMode ? 0 : 0.8; phase = demoMode ? 'play' : 'ready';
    stopT = 0; doneT = 0; ok = false; lean = 0; duckT = 0; wobbleT = 0; focus = null;
    halfShown = false; endReason = '';
    spawnAhead();
  }

  function spawnAhead() {
    while (nextD < dist + 45 && nextD < GOAL - 8) {
      var early = nextD < 40;
      var r = Math.random();
      var type = early ? (r < 0.5 ? 'L' : 'R') : (r < 0.38 ? 'L' : r < 0.76 ? 'R' : 'D');
      var feint = !early && type !== 'D' && nextD > 90 && Math.random() < 0.35;
      hazards.push({ d: nextD, type: type, done: false, res: 0, seen: false, feint: feint, flipT: 0 });
      nextD += 11 + Math.random() * 6;
    }
  }

  function needDir(h) { return h.type === 'L' ? 'left' : h.type === 'R' ? 'right' : 'down'; }

  function activeHazard() {
    var best = null;
    for (var i = 0; i < hazards.length; i++) {
      var h = hazards[i];
      if (h.done) continue;
      var rel = h.d - dist;
      if (rel <= WIN_FAR && rel >= WIN_NEAR && (!best || h.d < best.d)) best = h;
    }
    return best;
  }

  function hazY(h) { return CART_Y - (h.d - dist) * PX; }

  // プレイヤーもデモAIも同じ関数で体重を振る
  function doSwipe(dir, live) {
    if (phase !== 'play') return;
    if (dir === 'left') lean = -1;
    else if (dir === 'right') lean = 1;
    else if (dir === 'down') duckT = 0.45;
    var cx = W / 2 + lean * 40;
    var h = activeHazard();
    if (!h) {
      if (live) {
        game.audio.play('se_tap', 0.25);
        game.fx.burst(cx, CART_Y + 40, { color: C.cyan, count: 5, speed: 160 });
      }
      return;
    }
    var rel = h.d - dist;
    if (dir === needDir(h)) {
      h.done = true; h.res = 1; hits++; combo++;
      if (combo > bestCombo) bestCombo = combo;
      boost = Math.min(15, boost + 3.4 + (combo >= 5 ? 1.6 : 0));
      if (live) {
        var perfect = rel < 3 && rel > -1;
        game.audio.play('se_jump', 0.3);
        game.feedback.good(cx, CART_Y - 120, {
          text: combo >= 5 ? 'x' + combo : perfect ? 'PERFECT' : 'GOOD',
          color: combo >= 5 ? C.gold : C.lime, size: 54, count: 10,
        });
        if (combo === 5) game.fx.popup('FEVER', W / 2, H * 0.40, { color: C.pink, size: 70 });
      } else {
        game.fx.burst(cx, CART_Y - 80, { color: C.lime, count: 8, speed: 220 });
      }
    } else {
      h.done = true; h.res = -1;
      wobble(h, live);
    }
  }

  function wobble(h, live) {
    misses++; combo = 0; boost *= 0.3; wobbleT = 0.5;
    if (live) {
      game.feedback.bad(W / 2, CART_Y - 100, { text: 'MISS', color: C.red, shake: 10 });
    } else {
      game.fx.burst(W / 2, CART_Y - 60, { color: C.red, count: 8, speed: 200 });
    }
    if (misses >= MISS_MAX) {
      phase = 'stop'; stopT = 0.5; ok = false; focus = h; endReason = 'derail';
      if (live) { game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
    }
  }

  function clearRun(live) {
    phase = 'stop'; stopT = 0.5; ok = true; focus = null; endReason = 'clear';
    if (live) {
      game.audio.stopBgm();
      game.feedback.good(W / 2, CART_Y - 200, { text: 'CLEAR', color: C.gold, size: 80, count: 30 });
      game.audio.play('se_success', 0.55);
    }
  }

  function stepWorld(dt, live) {
    lean -= lean * Math.min(1, dt * 3.5);
    if (Math.abs(lean) < 0.02) lean = 0;
    if (duckT > 0) duckT -= dt;
    if (wobbleT > 0) wobbleT -= dt;
    if (phase !== 'play') return;

    runT += dt;
    if (live) timeLeft = Math.max(0, TIME_LIMIT - runT);
    boost *= Math.pow(0.6, dt);
    dist += (BASE_SPEED + boost) * dt;
    spawnAhead();

    for (var i = hazards.length - 1; i >= 0; i--) {
      var h = hazards[i];
      var rel = h.d - dist;
      if (!h.seen && rel < 27) {
        h.seen = true;
        if (live) game.audio.tone(h.type === 'D' ? 'C4' : 'G5', 0.08, { wave: 'square', volume: 0.05 });
      }
      // フェイント: 手前11mで高い側が反転(二重点滅+高音で予告)
      if (h.feint && !h.done && rel < 11) {
        h.feint = false; h.flipT = 0.5;
        h.type = h.type === 'L' ? 'R' : 'L';
        if (live) game.audio.tone('B5', 0.1, { wave: 'square', volume: 0.07, slide: 300 });
      }
      if (h.flipT > 0) h.flipT -= dt;
      if (!h.done && rel < WIN_NEAR) {
        h.done = true; h.res = -1;
        wobble(h, live);
        if (phase !== 'play') return;
      }
      if (rel < -30) hazards.splice(i, 1);
    }

    if (live && !halfShown && dist >= GOAL / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('100m', W / 2, H * 0.30, { color: C.cyan, size: 64 });
    }
    if (dist >= GOAL) { dist = GOAL; if (live) clearRun(live); else phase = 'stop'; return; }
    if (live && timeLeft <= 0) {
      phase = 'stop'; stopT = 0.5; ok = false; focus = null; endReason = 'time';
      game.audio.stopBgm();
      game.feedback.bad(W / 2, CART_Y - 100, { text: 'TIME UP', color: C.red, shake: 8 });
      game.audio.play('se_failure', 0.5);
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.top], [0.55, C.mid], [1, C.low]]);
    game.draw.rect(0, 0, W, H, C.pink, 0.03 + 0.03 * Math.sin(t * 1.4));
    // 坑道の壁の水晶(パララックス 2層)
    for (var k = 0; k < 2; k++) {
      var par = k === 0 ? 0.35 : 0.8;
      var gap = k === 0 ? 420 : 300;
      var off = (dist * PX * par) % gap;
      for (var y = -gap; y < H + gap; y += gap) {
        var yy = y + off;
        var bob = Math.sin(t * 2 + y * 0.01) * 6;
        var xL = k === 0 ? 150 : 60;
        game.draw.sprite(CRYSTAL, { c: k === 0 ? C.pinkDim : C.pink, w: C.white }, xL + bob, yy, k === 0 ? 10 : 14, { anchor: 'center', alpha: k === 0 ? 0.6 : 0.9 });
        game.draw.sprite(CRYSTAL, { c: k === 0 ? C.cyanDim : C.cyan, w: C.white }, W - xL - bob, yy + gap * 0.5, k === 0 ? 10 : 14, { anchor: 'center', alpha: k === 0 ? 0.6 : 0.9 });
      }
    }
  }

  function drawRail() {
    var cx = W / 2;
    glowLine(cx - RAIL_X, 240, cx - RAIL_X, H * 0.76, C.cyanDim, C.cyan, 6);
    glowLine(cx + RAIL_X, 240, cx + RAIL_X, H * 0.76, C.cyanDim, C.cyan, 6);
    var off = (dist * PX) % 150;
    for (var y = 240 + off - 150; y < H * 0.76; y += 150) {
      if (y < 240) continue;
      game.draw.line(cx - RAIL_X - 30, y, cx + RAIL_X + 30, y, C.cyanDim, 8);
    }
    // 出口門
    var gy = CART_Y - (GOAL - dist) * PX;
    if (gy > 150 && gy < H) {
      var pulse = 0.6 + 0.4 * Math.sin(game.time.elapsed * 8);
      game.draw.sprite(GATE, { g: C.lime }, cx, gy - 60, 30, { anchor: 'center', alpha: pulse });
    }
  }

  function drawHazard(h, highlight) {
    var y = hazY(h);
    if (y < 200 || y > H * 0.8) return;
    var cx = W / 2;
    var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
    var dim = h.res === 1 ? 0.35 : 1;
    if (h.type === 'D') {
      game.draw.rect(cx - RAIL_X - 90, y - 16, 20, 60, C.red, dim);
      game.draw.rect(cx + RAIL_X + 70, y - 16, 20, 60, C.red, dim);
      game.draw.rect(cx - RAIL_X - 80, y - 20, RAIL_X * 2 + 160, 22, C.red, dim);
      game.draw.sprite(SPIKES, { r: C.red }, cx, y + 10, 16, { anchor: 'center', alpha: dim });
    } else {
      var hi = h.type === 'L' ? -1 : 1;
      // 傾いた枕木(高い側が上にずれる)
      for (var s = -2; s <= 2; s++) {
        var sy = y + s * 50;
        game.draw.line(cx - RAIL_X - 40, sy + hi * 26, cx + RAIL_X + 40, sy - hi * 26, h.res === -1 ? C.red : C.pink, 10);
      }
      var hx = cx + hi * RAIL_X;
      var glowOn = h.res === 1 || blink || h.flipT > 0;
      if (glowOn) glowLine(hx, y - 140, hx, y + 140, '#6b5a10', C.gold, 10);
      game.draw.sprite(hi < 0 ? CHEV_L : CHEV_R, { w: h.flipT > 0 && blink ? C.white : C.gold }, cx + hi * (RAIL_X + 150), y, 14, { anchor: 'center', alpha: dim });
    }
    if (!h.done && y < 420) game.draw.sprite(BANG, { y: C.gold }, cx, y - 110, 10, { anchor: 'center', alpha: blink ? 1 : 0.3 });
    if (highlight) {
      game.draw.circle(cx, y, 230, C.white, 0.25 + 0.2 * Math.sin(game.time.elapsed * 30));
    }
  }

  function drawCart() {
    var t = game.time.elapsed;
    var wob = wobbleT > 0 ? Math.sin(t * 60) * 18 : 0;
    var bob = Math.sin(t * 9) * 5;
    var x = W / 2 + lean * 40 + wob;
    var frame = duckT > 0 ? MOLE_DUCK : (Math.floor(t * 6) % 2 === 0 ? MOLE_UP : MOLE_UP2);
    game.draw.circle(x, CART_Y + 70, 90, C.cyan, 0.12);
    game.draw.sprite(frame, MOLE_PAL, x, CART_Y + bob, 18, { anchor: 'center' });
    // 前照灯の光
    game.draw.rect(x - 16, CART_Y - 360, 32, 260, C.gold, 0.08);
  }

  function drawPad() {
    // 親指ゾーン: スワイプ台(←・→・↓の3方向マーク)
    var py = H * 0.86;
    var t = game.time.elapsed;
    game.draw.circle(W / 2, py, 150, C.pinkDim, 0.5);
    game.draw.circle(W / 2, py, 120, C.mid, 0.9);
    game.draw.sprite(CHEV_L, { w: lean < 0 ? C.gold : C.cyan }, W / 2 - 80, py, 9, { anchor: 'center' });
    game.draw.sprite(CHEV_R, { w: lean > 0 ? C.gold : C.cyan }, W / 2 + 80, py, 9, { anchor: 'center' });
    game.draw.sprite(SPIKES, { r: duckT > 0 ? C.gold : C.red }, W / 2, py + 70, 6, { anchor: 'center' });
    game.draw.circle(W / 2, py, 16 + 4 * Math.sin(t * 5), C.white, 0.7);
  }

  function drawHud() {
    // 進捗(出口門までの距離)
    var bx = 80, bw = W - 160;
    game.draw.rect(bx, 120, bw, 20, C.cyanDim);
    game.draw.rect(bx, 120, bw * Math.min(1, dist / GOAL), 20, C.lime);
    game.draw.sprite(GATE, { g: C.lime }, bx + bw, 130, 5, { anchor: 'center' });
    // 残り時間バー
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(bx, 160, bw, 12, C.pinkDim);
    game.draw.rect(bx, 160, bw * (timeLeft / TIME_LIMIT), 12, low ? C.red : C.gold);
    txt(Math.floor(dist) + ' / ' + GOAL + 'm', W / 2, 70, 44, C.cyan);
    // ぐらつき残り(ランプ)
    for (var i = 0; i < MISS_MAX; i++) {
      game.draw.circle(W - 110 + (i - 1) * 50, 210, 16, i < MISS_MAX - misses ? C.gold : C.pinkDim);
    }
    if (combo >= 2) txt('x' + combo, 110, 210, 36, combo >= 5 ? C.pink : C.lime);
  }

  function drawScene() {
    drawBack();
    drawRail();
    for (var i = 0; i < hazards.length; i++) drawHazard(hazards[i], hazards[i] === focus && phase !== 'play');
    drawCart();
    drawPad();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.30, W, H * 0.26, C.ink, 0.75);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.36, 110, C.gold);
      txt(timeLeft.toFixed(1) + '秒', W / 2, H * 0.44, 50, C.lime);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.36, 96, C.red);
      txt('あと' + Math.max(1, Math.ceil(GOAL - dist)) + 'm!', W / 2, H * 0.44, 50, C.gold);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.51, 36, C.cyan);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.27, 54, C.pink);
  }

  function calcScore() { return hits * 100 + Math.round(timeLeft * 50); }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
    if (state === S.PLAYING && phase === 'play') {
      // タップだけでは体重は振れない: 小さな火花で受理を返す
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.cyanDim, count: 3, speed: 90 });
    }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING) return;
    if (phase === 'play') doSwipe(dir, true);
    else game.audio.play('se_tap', 0.1);
  });

  // ── ATTRACT デモ(同じ stepWorld / doSwipe を AI が操作) ─────────────
  var demo = { t: 0, gx: W / 2, gy: H * 0.86, press: false, swT: 0, sx: 0, sy: 0, wrongDone: false, react: 3 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 7.5;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.wrongDone = false; demo.react = 2 + Math.random() * 3; }
    var h = activeHazard();
    if (h && phase === 'play') {
      var rel = h.d - dist;
      if (rel < demo.react) {
        var dir = needDir(h);
        if (!demo.wrongDone && cyc > 3.5 && h.type !== 'D') { dir = dir === 'left' ? 'right' : 'left'; demo.wrongDone = true; }
        doSwipe(dir, false);
        demo.swT = 0.35;
        demo.sx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
        demo.sy = dir === 'down' ? 1 : 0;
        demo.react = 1 + Math.random() * 4;
      }
    }
    stepWorld(dt, false);
    if (demo.swT > 0) {
      demo.swT -= dt;
      var p = 1 - demo.swT / 0.35;
      demo.gx = W / 2 + demo.sx * 220 * p;
      demo.gy = H * 0.86 + demo.sy * 140 * p;
      demo.press = true;
    } else {
      demo.gx = W / 2; demo.gy = H * 0.86; demo.press = false;
    }
  }

  function startMusic() {
    game.audio.melody([
      ['E4', 0.5], ['B4', 0.5], ['E5', 0.5], ['B4', 0.5],
      ['D4', 0.5], ['A4', 0.5], ['D5', 0.5], ['F#5', 0.5],
      ['C4', 0.5], ['G4', 0.5], ['C5', 0.5], ['G4', 0.5],
      ['B3', 0.5], ['F#4', 0.5], ['B4', 0.5], ['D#5', 0.5],
    ], { tempo: 168, wave: 'sawtooth', volume: 0.04, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame(true);
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 80, C.pink);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.13, 36, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.cyan);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { distance: Math.floor(dist), hits: hits, misses: misses, bestCombo: bestCombo };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    }
    stepWorld(dt, true);

    drawScene();
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.gold);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);
