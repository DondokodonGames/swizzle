// J-N6434-0024-attic-shutter-pose.js
// 屋根裏写真館のポーズ札 — 写真機が掲げる見本札と同じポーズを3枚の札から選び、シャッターが下りる前に決める
// 操作: 画面下の3枚のポーズ札から見本と同じものを1回タップして決める。決め直しはできない(社内メモ。画面には出さない)
// 終わり: 6枚正しく撮れれば成功。3枚失敗するか時間切れで失敗
// @mechanic: judge
// @theme: attic_photo_studio_pose
// 世界観: 時計屋の屋根裏にある写真館で、モデルを務める木のデッサン人形が、からくり写真機の掲げる見本札を一瞬で読み取り、シャッターが下りる前に同じポーズを決める
// 残るもの: 正誤(CLEAR/GAME OVER) + 撮れた枚数・即決(PERFECT)数・残り秒
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・低色数(8色ベタ)、細線の枠UI
  var STYLE = {
    bg: ['#000033', '#0a1a55', '#1a2a77'],
    main: ['#00ffff', '#ffffff', '#ff00ff'],
    accent: ['#ffff00', '#ff3333'],
  };
  var C = {
    bgTop: STYLE.bg[0], bgMid: STYLE.bg[1], bgLow: STYLE.bg[2],
    cyan: STYLE.main[0], white: STYLE.main[1], mag: STYLE.main[2],
    yellow: STYLE.accent[0], red: STYLE.accent[1],
    green: '#33ff66', wood: '#ffcc66', woodDark: '#aa7733', ink: '#000000', blue: '#3366ff',
  };

  var GAME_TITLE = 'POSE SHOT';
  var TIME_LIMIT = 13;
  var NEEDED = 6;
  var MISS_MAX = 3;
  var DOLL_Y = H * 0.52;
  var BTN_Y = H * 0.83;
  var BTN_X = [W * 0.19, W * 0.5, W * 0.81];
  var CAM_X = W * 0.28, CAM_Y = H * 0.24;
  var CARD_X = W * 0.70, CARD_Y = H * 0.24;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // ── ポーズのスプライト(h=頭, b=体) ────────────────────
  var POSES = [
    ['..b.....b..', '..b.hhh.b..', '..b.hhh.b..', '...bhhhb...', '....bbb....', '....bbb....', '....bbb....', '....bbb....', '....b.b....', '....b.b....', '....b.b....', '...bb.bb...'],
    ['....hhh....', '....hhh....', '....hhh....', '.....b.....', 'bbbbbbbbbbb', '....bbb....', '....bbb....', '....bbb....', '....b.b....', '....b.b....', '....b.b....', '...bb.bb...'],
    ['........b..', '....hhh.b..', '....hhh.b..', '....hhhb...', '...bbbb....', '..b.bbb....', '..b.bbb....', '..b.bbb....', '....b.b....', '....b.b....', '....b.b....', '...bb.bb...'],
    ['...........', '...........', '...........', '....hhh....', '....hhh....', '....hhh....', '.bbbbbbbbb.', '....bbb....', '...bbbbb...', '..b.....b..', '..b.....b..', '.bb.....bb.'],
    ['.b.......b.', '..b.hhh.b..', '...bhhhb...', '....hhh....', '....bbb....', '....bbb....', '....bbb....', '...b...b...', '..b.....b..', '.b.......b.', 'b.........b', '...........'],
  ];
  var NEUTRAL = ['....hhh....', '....hhh....', '....hhh....', '.....b.....', '...bbbbb...', '..b.bbb.b..', '..b.bbb.b..', '..b.bbb.b..', '....b.b....', '....b.b....', '....b.b....', '...bb.bb...'];
  var DOLL_PAL = { h: '#ffcc66', b: '#aa7733' };
  var ICON_PAL = { h: '#00ffff', b: '#00ffff' };
  var CAMERA = [
    '.mmmmmmmm.....',
    'mmmmmmmmmmmm..',
    'mwwmmmmmmmmm..',
    'mmmmmcccmmmmww',
    'mmmmcbbbcmmmww',
    'mmmmcbwbcmmmww',
    'mmmmcbbbcmmmww',
    'mmmmmcccmmmm..',
    'mmmmmmmmmmmm..',
    '.....mm.......',
    '....m..m......',
    '...m....m.....',
  ];
  var CAM_PAL = { m: '#ff00ff', w: '#ffffff', c: '#00ffff', b: '#000033' };
  var BULB = ['.yy.', 'yyyy', 'yyyy', '.ww.'];
  var CLOCK = ['.www.', 'w.w.w', 'w.ww.', 'w...w', '.www.'];

  // ── 状態 ─────────────────────────────────────────
  var shot, shots, goods, misses, perfects, golds, timeLeft, ready, phase, showT, stopT, doneT, ok, endReason;
  var pose, flashT, photoStrip, lastGood;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center', font: 'monospace' });
  }
  function frameBox(x, y, w, h, color, th) {
    game.draw.rect(x, y, w, th, color); game.draw.rect(x, y + h - th, w, th, color);
    game.draw.rect(x, y, th, h, color); game.draw.rect(x + w - th, y, th, h, color);
  }

  function initGame(demoMode) {
    shots = 0; goods = 0; misses = 0; perfects = 0; golds = 0; timeLeft = TIME_LIMIT;
    ready = demoMode ? 0 : 0.8; phase = demoMode ? 'aim' : 'ready';
    showT = 0; stopT = 0; doneT = 0; ok = false; endReason = ''; flashT = 0;
    pose = -1; photoStrip = []; lastGood = false;
    newShot();
  }

  function newShot() {
    var target = Math.floor(Math.random() * POSES.length);
    var pool = [0, 1, 2, 3, 4].filter(function(p) { return p !== target; });
    // 紛らわしい組み合わせを優先(バンザイ↔手振り、T字↔星)
    var near = { 0: 2, 2: 0, 1: 4, 4: 1, 3: 1 }[target];
    var others = [near];
    while (others.length < 2) { var o = pool[Math.floor(Math.random() * pool.length)]; if (others.indexOf(o) < 0) others.push(o); }
    var choices = [target, others[0], others[1]];
    for (var i = 2; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = choices[i]; choices[i] = choices[j]; choices[j] = t; }
    // 加速: 1.7秒 → 0.95秒
    var dur = Math.max(0.95, 1.7 - shots * 0.11);
    shot = { target: target, choices: choices, dur: dur, t: 0, locked: -1, lockT: 0, gold: shots >= 2 && Math.random() < 0.25 };
    pose = -1;
  }

  // 札を選ぶ(プレイヤーもデモAIも共通)
  function choose(idx, live) {
    if (phase !== 'aim' || shot.locked >= 0) {
      if (live) game.audio.play('se_tap', 0.1);
      return;
    }
    shot.locked = idx; shot.lockT = shot.t;
    pose = shot.choices[idx];
    if (live) {
      game.audio.play('se_tap', 0.35);
      game.fx.burst(BTN_X[idx], BTN_Y, { color: C.cyan, count: 8, speed: 200 });
    }
  }

  function fire(live) {
    flashT = 0.15;
    var good = pose === shot.target;
    var fast = shot.locked >= 0 && shot.lockT < shot.dur * 0.45;
    shots++;
    photoStrip.push({ pose: pose, good: good, gold: shot.gold });
    if (photoStrip.length > 8) photoStrip.shift();
    lastGood = good;
    if (live) game.fx.flash('#ffffff', 0.12);
    if (good) {
      goods++; if (fast) perfects++; if (shot.gold) golds++;
      if (live) {
        game.audio.play(shot.gold ? 'se_coin' : 'se_good', 0.4);
        game.feedback.good(W / 2, DOLL_Y - 200, { text: fast ? 'PERFECT' : 'GOOD', color: shot.gold ? C.yellow : C.green, size: 60, count: 12, sound: shot.gold ? 'se_coin' : 'se_good' });
        if (goods === Math.ceil(NEEDED / 2)) { game.audio.play('se_milestone', 0.4); game.fx.popup(goods + ' / ' + NEEDED, W / 2, H * 0.38, { color: C.cyan, size: 64 }); }
      } else {
        game.fx.burst(W / 2, DOLL_Y - 120, { color: C.green, count: 10, speed: 220 });
      }
    } else {
      misses++;
      if (live) game.feedback.bad(W / 2, DOLL_Y - 200, { text: 'MISS', color: C.red, shake: 10 });
      else game.fx.burst(W / 2, DOLL_Y - 120, { color: C.red, count: 10, speed: 220 });
    }
    if (goods >= NEEDED) {
      phase = 'stop'; stopT = 0.6; ok = true; endReason = 'clear';
      if (live) { game.audio.stopBgm(); game.feedback.good(W / 2, H * 0.36, { text: 'CLEAR', color: C.yellow, size: 90, count: 30 }); game.audio.play('se_success', 0.55); }
      return;
    }
    if (misses >= MISS_MAX) {
      phase = 'stop'; stopT = 0.6; ok = false; endReason = 'miss';
      if (live) { game.audio.stopBgm(); game.audio.play('se_failure', 0.5); }
      return;
    }
    phase = 'show'; showT = 0.45;
  }

  function stepWorld(dt, live) {
    if (flashT > 0) flashT -= dt;
    if (phase === 'aim') {
      shot.t += dt;
      var left = shot.dur - shot.t;
      // 最後の0.5秒は秒読みの電子音(シャッターの予告)
      if (live && left < 0.5 && left + dt >= 0.5 && shot.locked < 0) game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.06 });
      if (shot.t >= shot.dur || (shot.locked >= 0 && shot.t >= shot.lockT + 0.22)) fire(live);
    } else if (phase === 'show') {
      showT -= dt;
      if (showT <= 0) { phase = 'aim'; newShot(); }
    }
    if (live && (phase === 'aim' || phase === 'show')) {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0) {
        phase = 'stop'; stopT = 0.6; ok = false; endReason = 'time';
        game.audio.stopBgm();
        game.feedback.bad(W / 2, DOLL_Y - 200, { text: 'TIME UP', color: C.red, shake: 8 });
        game.audio.play('se_failure', 0.5);
      }
    }
  }

  // ── 描画 ─────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bgTop], [0.6, C.bgMid], [1, C.bgLow]]);
    game.draw.rect(0, 0, W, H, C.cyan, 0.025 + 0.025 * Math.sin(t * 1.5));
    // 屋根裏の梁と走査線
    for (var y = 250; y < H; y += 6) game.draw.rect(0, y, W, 1, C.ink, 0.18);
    game.draw.line(0, H * 0.34, W, H * 0.30, C.blue, 3);
    game.draw.line(0, H * 0.30, W, H * 0.34, C.blue, 3);
    game.draw.sprite(CLOCK, { w: C.cyan }, W * 0.9, H * 0.36 + Math.sin(t * 2) * 6, 10, { anchor: 'center' });
    // 床(撮影台)
    game.draw.rect(W * 0.18, H * 0.66, W * 0.64, 14, C.cyan);
    for (var k = 0; k < 6; k++) game.draw.line(W * 0.18 + k * W * 0.128, H * 0.66 + 14, W * 0.10 + k * W * 0.16, H * 0.72, C.blue, 2);
  }

  function drawCamera() {
    var t = game.time.elapsed;
    var bob = Math.sin(t * 2.2) * 5;
    game.draw.sprite(CAMERA, CAM_PAL, CAM_X, CAM_Y + bob, 14, { anchor: 'center' });
    game.draw.sprite(BULB, { y: flashT > 0 ? C.white : C.yellow, w: C.white }, CAM_X - 70, CAM_Y - 110 + bob, 12, { anchor: 'center' });
    // シャッターの縮むリング(残り時間)
    if (phase === 'aim') {
      var k = Math.max(0, 1 - shot.t / shot.dur);
      var hot = k < 0.3 && Math.floor(t * 12) % 2 === 0;
      game.draw.circle(CAM_X + 10, CAM_Y + 8 + bob, 40 + 110 * k, hot ? C.red : C.yellow, 0.25);
      game.draw.circle(CAM_X + 10, CAM_Y + 8 + bob, 34, C.bgTop, 0.9);
    }
  }

  function drawCard() {
    var t = game.time.elapsed;
    var sway = Math.sin(t * 3) * 6;
    var gold = shot && shot.gold;
    var col = gold ? C.yellow : C.white;
    game.draw.rect(CARD_X - 130, CARD_Y - 150 + sway, 260, 300, C.bgTop);
    frameBox(CARD_X - 130, CARD_Y - 150 + sway, 260, 300, col, 6);
    if (gold) frameBox(CARD_X - 116, CARD_Y - 136 + sway, 232, 272, C.yellow, 2);
    if (shot && (phase === 'aim' || phase === 'show' || phase === 'stop' || phase === 'done' || phase === 'ready')) {
      var blink = phase === 'aim' && shot.t < 0.25 && Math.floor(t * 16) % 2 === 0;
      game.draw.sprite(POSES[shot.target], { h: gold ? C.yellow : C.cyan, b: gold ? C.yellow : C.cyan }, CARD_X, CARD_Y + sway, 20, { anchor: 'center', alpha: blink ? 0.4 : 1 });
    }
    game.draw.line(CARD_X - 130, CARD_Y + sway, CAM_X + 100, CAM_Y, C.blue, 2);
  }

  function drawDoll(highlight) {
    var t = game.time.elapsed;
    var art = pose >= 0 ? POSES[pose] : NEUTRAL;
    var bob = pose >= 0 ? 0 : Math.sin(t * 4) * 8;
    var sway = pose >= 0 ? 0 : Math.cos(t * 2.6) * 10;
    game.draw.circle(W / 2, H * 0.66, 150, C.cyan, 0.08);
    if (highlight) game.draw.circle(W / 2, DOLL_Y, 220, C.white, 0.3 + 0.25 * Math.sin(t * 30));
    game.draw.sprite(art, DOLL_PAL, W / 2 + sway, DOLL_Y + bob, 26, { anchor: 'center' });
    if (flashT > 0) game.draw.rect(0, 0, W, H, C.white, flashT * 3);
  }

  function drawButtons() {
    var t = game.time.elapsed;
    for (var i = 0; i < 3; i++) {
      var x = BTN_X[i];
      var picked = shot && shot.locked === i;
      var live = phase === 'aim' && shot.locked < 0;
      var bob = live ? Math.sin(t * 5 + i) * 6 : 0;
      var col = picked ? C.yellow : live ? C.cyan : C.blue;
      game.draw.rect(x - 130, BTN_Y - 150 + bob, 260, 300, C.bgTop, 0.9);
      frameBox(x - 130, BTN_Y - 150 + bob, 260, 300, col, picked ? 8 : 4);
      if (live && Math.floor(t * 4) % 2 === 0) frameBox(x - 140, BTN_Y - 160 + bob, 280, 320, C.white, 2);
      if (shot) game.draw.sprite(POSES[shot.choices[i]], ICON_PAL, x, BTN_Y + bob, 18, { anchor: 'center', alpha: live || picked ? 1 : 0.5 });
    }
  }

  function drawHud() {
    txt(goods + ' / ' + NEEDED, W / 2, 60, 48, C.cyan);
    var low = timeLeft < 3 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 110, W - 160, 16, C.blue);
    game.draw.rect(80, 110, (W - 160) * (timeLeft / TIME_LIMIT), 16, low ? C.red : C.yellow);
    // フィルムの帯(撮れた写真のサムネイル)
    for (var i = 0; i < NEEDED + MISS_MAX - 1; i++) {
      var fx = 90 + i * 112, fy = 150;
      frameBox(fx, fy, 96, 70, C.blue, 3);
      var ph = photoStrip[i];
      if (ph) {
        game.draw.rect(fx + 3, fy + 3, 90, 64, ph.good ? (ph.gold ? '#665500' : '#003311') : '#330000');
        game.draw.sprite(ph.pose >= 0 ? POSES[ph.pose] : NEUTRAL, { h: ph.good ? C.green : C.red, b: ph.good ? C.green : C.red }, fx + 48, fy + 35, 5, { anchor: 'center' });
      }
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 90 - m * 44, 60, 14, m < MISS_MAX - misses ? C.mag : C.blue);
  }

  function drawScene(showHighlight) {
    drawBack();
    drawCamera();
    drawCard();
    drawDoll(showHighlight);
    drawButtons();
  }

  function drawResult() {
    game.draw.rect(0, H * 0.36, W, H * 0.20, C.bgTop, 0.85);
    frameBox(20, H * 0.36, W - 40, H * 0.20, ok ? C.yellow : C.red, 4);
    if (ok) {
      txt('CLEAR', W / 2, H * 0.41, 100, C.yellow);
      txt('PERFECT ' + perfects, W / 2, H * 0.47, 44, C.green);
    } else {
      txt(endReason === 'time' ? 'TIME UP' : 'GAME OVER', W / 2, H * 0.41, 90, C.red);
      txt('あと' + Math.max(1, NEEDED - goods) + '枚!', W / 2, H * 0.47, 44, C.yellow);
    }
    txt('BEST ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.52, 34, C.cyan);
    if (ok && calcScore() > game.best) txt('NEW RECORD', W / 2, H * 0.33, 52, C.mag);
  }

  function calcScore() { return goods * 100 + perfects * 50 + golds * 100 + Math.round(timeLeft * 20); }

  function buttonAt(x, y) {
    for (var i = 0; i < 3; i++) if (Math.abs(x - BTN_X[i]) < 150 && Math.abs(y - BTN_Y) < 170) return i;
    return -1;
  }

  // ── 入力 ─────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin');
      state = S.PLAYING; initGame(false); startMusic();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(true); demo.t = 0; startMusic(); return; }
    var idx = buttonAt(x, y);
    if (idx >= 0) choose(idx, true);
    else { game.audio.play('se_tap', 0.1); game.fx.burst(x, y, { color: C.blue, count: 3, speed: 80 }); }
  });

  // ── ATTRACT デモ(AIが同じ choose/fire で撮影) ───────────────
  var demo = { t: 0, gx: W / 2, gy: BTN_Y + 120, press: false, pressT: 0, delay: 0.5, wrongDone: false, shotRef: null };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.wrongDone = false; demo.shotRef = null; }
    if (phase === 'stop' || phase === 'done') { phase = 'aim'; misses = 0; newShot(); }
    if (phase === 'aim' && shot !== demo.shotRef) { demo.shotRef = shot; demo.delay = 0.35 + Math.random() * 0.45; }
    if (phase === 'aim' && shot.locked < 0) {
      var want = shot.choices.indexOf(shot.target);
      if (!demo.wrongDone && shots === 2) want = (want + 1) % 3;
      demo.gx += (BTN_X[want] - demo.gx) * Math.min(1, dt * 9);
      demo.gy += (BTN_Y + 40 - demo.gy) * Math.min(1, dt * 9);
      if (shot.t >= demo.delay) {
        if (shots === 2) demo.wrongDone = true;
        choose(want, false); demo.pressT = 0.25;
      }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    stepWorld(dt, false);
  }

  function startMusic() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 1], [null, 1],
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: true });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (shot === undefined) initGame(true);
      stepDemo(dt);
      drawScene(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 80, C.yellow);
      txt('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, H * 0.105, 34, C.cyan);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 46, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(false);
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'aim'; shot.t = 0; game.audio.play('se_tap', 0.4); }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (flashT > 0) flashT -= dt;
      if (stopT <= 0) { phase = 'done'; doneT = 1.4; }
    } else if (phase === 'done') {
      doneT -= dt;
      if (doneT <= 0) {
        state = S.RESULT;
        var stats = { shots: goods, needed: NEEDED, misses: misses, perfects: perfects };
        if (ok) game.end.success(calcScore(), stats);
        else game.end.failure(stats);
      }
    } else {
      stepWorld(dt, true);
    }

    drawScene(phase === 'stop' && !ok);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.40, 100, C.yellow);
    if (phase === 'done') drawResult();
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
    demo.t = 0;
    startMusic();
  });
})(game);
