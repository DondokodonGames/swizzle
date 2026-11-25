// J-Switch-0001-tin-mouse-corner.js
// ぜんまいネズミはさみ取り — 店じゅうを逃げ回るぜんまい仕掛けのブリキネズミを、2本の指で両側から挟んで捕まえる
// 操作: 1本指を近づけるとネズミは逃げる。2本の指を同時にネズミの両側に置き、指と指の間に挟めば捕まえる(社内メモ。画面には出さない)
// 終わり: 4匹捕まえればCLEAR。空振りの挟み3回/時間切れでGAME OVER
// @mechanic: pinch_zone
// @theme: toyshop_tin_mouse_pinch
// 世界観: 閉店後のおもちゃ屋、ぜんまいを巻きすぎたブリキのネズミたちが床を走り回る。店番の少女は両手で左右から挟み込み、一匹ずつ棚のおもちゃ箱へ戻していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 捕まえた数・空振り数・最速の捕獲秒
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 高解像度・8色ベタ。細い線とテキスト枠のUI
  var STYLE = { bg: ['#000022', '#0000aa', '#000055'], main: ['#55ffff', '#ffffff', '#aaaaaa'], accent: ['#ffff55', '#ff5555'] };
  var C = {
    bg1: '#000022', bg2: '#0000aa', floor: '#000066', grid: '#0000cc', cyan: '#55ffff', white: '#ffffff',
    gray: '#aaaaaa', yellow: '#ffff55', red: '#ff5555', mag: '#ff55ff', green: '#55ff55', black: '#000000'
  };

  var GAME_TITLE = 'TIN MOUSE';
  var TIME_LIMIT = 15;
  var NEEDED = 4;
  var MAX_MISS = 3;
  var X0 = 70, X1 = W - 70, Y0 = H * 0.27, Y1 = H * 0.72;
  var MR = 52;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, caught, misses, mouse, hitStop, outro, ok, halfShown, catchT, fastest, pinchFx, focusBad;

  // ── sprites ───────────────────────────────────────────────────────
  var MOUSE = [
    ['......kk....', '...gggggk...', '..gggggggg.e', '.gwgggggggge', 'ggggggggggg.', '.rr.gggg.rr.', '...........t'],
    ['......kk....', '...gggggk...', '..gggggggg.e', '.gwgggggggge', 'ggggggggggg.', 'rr..gggg..rr', '..........t.']
  ];
  var KEY = [['y.y', 'yyy', '.y.'], ['.y.', 'yyy', 'y.y']];
  var MITT = ['.ww.ww.', 'wwwwwww', 'wwwwwww', '.wwwww.', '..www..'];
  var GIRL = [
    ['..mmm..', '.mmmmm.', '.mfffm.', '..fkf..', '.ccccc.', 'c.ccc.c', '..c.c..', '.w...w.'],
    ['..mmm..', '.mmmmm.', '.mfffm.', '..fkf..', 'ccccccc', '..ccc..', '..c.c..', '..w.w..']
  ];
  var BOX = ['yyyyyyyyyy', 'y........y', 'y.rrrrrr.y', 'y........y', 'yyyyyyyyyy'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 2, y + 2, { size: sz, color: C.black, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  function newMouse() {
    var ang = game.random(0, Math.PI * 2);
    mouse = { x: game.random(X0 + 150, X1 - 150), y: Y0 + 60, vx: Math.cos(ang) * 300, vy: Math.abs(Math.sin(ang)) * 300 + 80,
      turn: 0.6, wind: game.random(2.5, 3.5), stall: 0, dash: 0, age: 0, hue: [C.gray, C.cyan, C.mag, C.green][caught % 4] };
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; caught = 0; misses = 0;
    hitStop = 0; outro = 0; ok = false; halfShown = false; catchT = 0; fastest = 99; pinchFx = null; focusBad = false;
    newMouse();
  }

  // ネズミの走り(実プレイ・デモ共用)。pts は近くにある指
  function stepMouse(dt, pts, spd) {
    var m = mouse;
    m.age += dt;
    if (m.stall > 0) {
      m.stall -= dt;
      if (m.stall <= 0) { m.dash = 0.9; var a = game.random(0, Math.PI * 2); m.vx = Math.cos(a) * 700; m.vy = Math.sin(a) * 700; }
      return;
    }
    m.wind -= dt;
    if (m.wind <= 0) { m.stall = 0.7; m.wind = game.random(3, 4.2); return; }
    m.turn -= dt;
    if (m.turn <= 0) {
      m.turn = game.random(0.4, 0.9);
      var ang = Math.atan2(m.vy, m.vx) + game.random(-1.1, 1.1);
      var sp = Math.hypot(m.vx, m.vy);
      m.vx = Math.cos(ang) * sp; m.vy = Math.sin(ang) * sp;
    }
    for (var i = 0; i < pts.length; i++) {
      var dx = m.x - pts[i].x, dy = m.y - pts[i].y, d = Math.hypot(dx, dy);
      if (d < 280 && d > 1) { m.vx += dx / d * 2400 / pts.length * dt; m.vy += dy / d * 2400 / pts.length * dt; }
    }
    var base = (340 + caught * 40) * spd * (m.dash > 0 ? 1.6 : 1);
    if (m.dash > 0) m.dash -= dt;
    var s = Math.hypot(m.vx, m.vy);
    if (s > 1) { var want = s + (base - s) * Math.min(1, dt * 1.5); m.vx = m.vx / s * want; m.vy = m.vy / s * want; }
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (m.x < X0 + MR) { m.x = X0 + MR; m.vx = Math.abs(m.vx); }
    if (m.x > X1 - MR) { m.x = X1 - MR; m.vx = -Math.abs(m.vx); }
    if (m.y < Y0 + MR) { m.y = Y0 + MR; m.vy = Math.abs(m.vy); }
    if (m.y > Y1 - MR) { m.y = Y1 - MR; m.vy = -Math.abs(m.vy); }
  }

  // 2点の間にネズミが挟まっているか
  function trapped(a, b) {
    var ex = b.x - a.x, ey = b.y - a.y, L2 = ex * ex + ey * ey;
    var L = Math.sqrt(L2);
    if (L < 110 || L > 720) return false;
    var t = ((mouse.x - a.x) * ex + (mouse.y - a.y) * ey) / L2;
    if (t < 0.12 || t > 0.88) return false;
    var px = a.x + ex * t, py = a.y + ey * t;
    return Math.hypot(mouse.x - px, mouse.y - py) < MR + 34;
  }

  // 挟む判定(実プレイ・デモ共用)
  function tryPinch(a, b, isDemo) {
    var hit = trapped(a, b);
    pinchFx = { ax: a.x, ay: a.y, bx: b.x, by: b.y, t: 0.35, hit: hit };
    if (hit) {
      if (isDemo) { game.fx.burst(mouse.x, mouse.y, { color: C.yellow, count: 10, speed: 240 }); newMouse(); return true; }
      caught++;
      if (mouse.age < fastest) fastest = mouse.age;
      hitStop = 0.25; focusBad = false;
      game.feedback.good(mouse.x, mouse.y - 90, { text: mouse.stall > 0 ? 'GOOD' : 'NICE', color: C.yellow, count: 14 });
      game.audio.play('se_coin', 0.35);
      if (!halfShown && caught >= NEEDED / 2) {
        halfShown = true;
        game.audio.play('se_milestone', 0.5);
        game.fx.popup(caught + ' / ' + NEEDED, W / 2, H * 0.2, { color: C.cyan, size: 64 });
      }
      if (caught >= NEEDED) { finish(true); return true; }
      newMouse();
      return true;
    }
    if (isDemo) { game.fx.burst((a.x + b.x) / 2, (a.y + b.y) / 2, { color: C.red, count: 6, speed: 160 }); return false; }
    misses++;
    focusBad = true;
    if (misses >= MAX_MISS) { finish(false); return false; }
    hitStop = 0.3;
    game.feedback.bad((a.x + b.x) / 2, (a.y + b.y) / 2 - 80, { text: 'MISS', color: C.red });
    return false;
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) { game.fx.flash(C.cyan, 0.25); game.audio.play('se_success', 0.6); }
    else {
      game.feedback.bad(mouse.x, mouse.y - 90, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS', color: C.red });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play' && Math.hypot(x - mouse.x, y - mouse.y) < 160) game.audio.tone('A5', 0.05, { wave: 'square', volume: 0.04 });
  });

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || phase !== 'play' || hitStop > 0) return;
    var ts = game.touches;
    if (ts.length >= 2) {
      var other = null, bd = 1e9;
      for (var i = 0; i < ts.length; i++) {
        if (ts[i].id === id) continue;
        var d = Math.hypot(ts[i].x - x, ts[i].y - y);
        if (d < bd) { bd = d; other = ts[i]; }
      }
      if (other) { game.audio.play('se_tap', 0.35); tryPinch(other, { x: x, y: y }, false); }
    } else {
      game.audio.play('se_tap', 0.15);
      game.fx.burst(x, y, { color: C.gray, count: 4, speed: 100 });
    }
  });

  // ── demo(両手で左右から寄せて挟む。3回に1回は早く閉じて逃げられる)──
  var demo = { t: 0, ax: W * 0.2, ay: H * 0.85, bx: W * 0.8, by: H * 0.85, press: false, n: 0, phaseT: 0, done: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { caught = 0; demo.n = 0; demo.phaseT = 0; demo.done = false; newMouse(); }
    demo.phaseT += dt;
    var early = demo.n % 3 === 2;
    var closeAt = early ? 0.35 : 1.0;
    var k = Math.min(1, dt * 7);
    var gap = demo.phaseT < closeAt ? 190 : 120;
    demo.ax += (mouse.x - gap - demo.ax) * k; demo.ay += (mouse.y + 10 - demo.ay) * k;
    demo.bx += (mouse.x + gap - demo.bx) * k; demo.by += (mouse.y - 10 - demo.by) * k;
    stepMouse(dt, [], 0.55);
    demo.press = demo.phaseT >= closeAt && demo.phaseT < closeAt + 0.3;
    if (demo.phaseT >= closeAt && !demo.done) {
      demo.done = true;
      tryPinch({ x: demo.ax, y: demo.ay }, { x: demo.bx, y: demo.by }, true);
      demo.n++;
    }
    if (demo.phaseT > closeAt + 0.6) { demo.phaseT = 0; demo.done = false; demo.ax = W * 0.2; demo.ay = H * 0.85; demo.bx = W * 0.8; demo.by = H * 0.85; }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawShop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.5, C.bg2], [1, C.bg1]]);
    // 棚(遠景)
    for (var s = 0; s < 3; s++) {
      var sy = H * 0.14 + s * 70;
      game.draw.line(40, sy, W - 40, sy, C.gray, 3);
      for (var b = 0; b < 9; b++) game.draw.rect(70 + b * 110, sy - 40 + Math.sin(t * 2 + b + s) * 2, 60, 38, [C.red, C.cyan, C.mag, C.green, C.yellow][(b + s) % 5], 0.5);
    }
    // 床(細い格子)とテキスト枠風の囲み
    game.draw.rect(X0, Y0, X1 - X0, Y1 - Y0, C.floor);
    for (var gx = X0; gx <= X1; gx += 94) game.draw.line(gx, Y0, gx, Y1, C.grid, 2);
    for (var gy = Y0; gy <= Y1; gy += 94) game.draw.line(X0, gy, X1, gy, C.grid, 2);
    game.draw.line(X0 - 6, Y0 - 6, X1 + 6, Y0 - 6, C.white, 3);
    game.draw.line(X0 - 6, Y1 + 6, X1 + 6, Y1 + 6, C.white, 3);
    game.draw.line(X0 - 6, Y0 - 6, X0 - 6, Y1 + 6, C.white, 3);
    game.draw.line(X1 + 6, Y0 - 6, X1 + 6, Y1 + 6, C.white, 3);
    game.draw.rect(0, 0, W, H, C.cyan, 0.02 + 0.02 * Math.sin(t * 1.5));
  }

  function drawMouse() {
    var t = game.time.elapsed;
    var m = mouse;
    var right = m.vx >= 0;
    var shake = m.stall > 0 ? Math.sin(t * 60) * 5 : 0;
    game.draw.rect(m.x - 60, m.y + 40, 120, 12, C.black, 0.4);
    var frame = m.stall > 0 ? 0 : Math.floor(t * 12) % 2;
    game.draw.sprite(MOUSE[frame], { g: m.hue, k: C.gray, w: C.black, e: C.mag, r: C.white, t: C.gray }, m.x + shake, m.y + Math.sin(t * 20) * 3, 11, { anchor: 'center', flipX: !right });
    // ぜんまい(止まる前は速く回って光る=予告)
    var fast = m.stall > 0 || m.wind < 0.6;
    game.draw.sprite(KEY[Math.floor(t * (fast ? 20 : 5)) % 2], { y: fast ? C.yellow : C.gray }, m.x + (right ? -20 : 20), m.y - 60, 10, { anchor: 'center' });
    if (fast && Math.floor(t * 12) % 2 === 0) game.draw.circle(m.x, m.y - 60, 30, C.yellow, 0.3);
  }

  function drawPinch(dt) {
    if (pinchFx) {
      pinchFx.t -= dt;
      var col = pinchFx.hit ? C.yellow : C.red;
      game.draw.line(pinchFx.ax, pinchFx.ay, pinchFx.bx, pinchFx.by, col, 8);
      if (pinchFx.t <= 0) pinchFx = null;
    }
    if (state !== S.PLAYING) return;
    var ts = game.touches;
    for (var i = 0; i < ts.length; i++) game.draw.sprite(MITT, { w: C.white }, ts[i].x, ts[i].y, 14, { anchor: 'center', alpha: 0.8 });
    if (ts.length >= 2) {
      var live = trapped(ts[0], ts[1]);
      game.draw.line(ts[0].x, ts[0].y, ts[1].x, ts[1].y, live ? C.yellow : C.gray, live ? 8 : 3);
    }
  }

  function drawBottom() {
    var t = game.time.elapsed;
    game.draw.rect(0, H * 0.76, W, H * 0.24, C.bg1);
    game.draw.line(0, H * 0.76, W, H * 0.76, C.white, 3);
    game.draw.sprite(BOX, { y: C.yellow, r: C.red }, W * 0.62, H * 0.86, 22, { anchor: 'center' });
    for (var i = 0; i < NEEDED; i++) {
      game.draw.sprite(MOUSE[0], { g: i < caught ? [C.gray, C.cyan, C.mag, C.green][i] : C.floor, k: C.gray, w: C.black, e: C.mag, r: C.white, t: C.gray }, W * 0.5 + i * 80, H * 0.8 + Math.sin(t * 3 + i) * 3, 5, { anchor: 'center' });
    }
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W * 0.52 + m * 70, H * 0.93, 44, 20, m < misses ? C.red : C.gray);
    game.draw.sprite(GIRL[Math.floor(t * 2) % 2], { m: C.mag, f: C.white, k: C.black, c: C.cyan, w: C.gray }, W * 0.16, H * 0.88 + Math.sin(t * 2.4) * 5, 15, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.bg1, 0.85);
    game.draw.line(0, 225, W, 225, C.white, 2);
    txt(caught + ' / ' + NEEDED, W / 2, 90, 66, C.cyan);
    txt(String(Math.ceil(timeLeft)), 70, 90, 52, C.white, 'left');
    game.draw.rect(60, 170, W - 120, 18, C.floor);
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.red : C.yellow);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawShop(); drawMouse(); drawPinch(dt); drawBottom();
      game.draw.hand(demo.ax, demo.ay, { press: demo.press, scale: 13 });
      game.draw.hand(demo.bx, demo.by, { press: demo.press, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.bg1, 0.85);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 80, C.cyan);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.yellow);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawShop(); drawBottom();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.45, 90, ok ? C.yellow : C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt;
        var ts = game.touches;
        if (mouse.stall > 0 && mouse.stall - dt <= 0) game.audio.play('se_jump', 0.3);
        stepMouse(dt, ts, 1);
        // 2本の指を寄せて挟み込んだ場合も捕まえる
        if (ts.length >= 2 && trapped(ts[0], ts[1])) tryPinch(ts[0], ts[1], false);
        if (timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = caught * 150 + Math.max(0, MAX_MISS - misses) * 40 + Math.round(timeLeft * 10);
        var stats = { caught: caught, misses: misses, fastest: fastest < 99 ? Math.round(fastest * 10) / 10 : 0 };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawShop(); drawMouse(); drawPinch(dt); drawBottom(); drawHud();
    if ((phase === 'stop' || hitStop > 0) && Math.floor(t * 14) % 2 === 0) {
      game.draw.circle(mouse.x, mouse.y, 110, focusBad ? C.red : C.white, 0.35);
    }
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.45, 96, C.yellow);
    if (phase === 'outro') {
      var sc = caught * 150 + Math.max(0, MAX_MISS - misses) * 40 + Math.round(timeLeft * 10);
      game.draw.rect(0, H * 0.36, W, H * 0.16, C.bg1, 0.9);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.yellow : C.red);
      txt('SCORE ' + sc, W / 2, H * 0.45, 44, C.white);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.49, 40, C.yellow);
      else if (!ok) txt('あと' + Math.max(1, NEEDED - caught) + '匹!', W / 2, H * 0.49, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.49, 36, C.cyan);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['E5', 0.25], ['F5', 0.5], ['D5', 0.5],
      ['B4', 0.25], ['D5', 0.25], ['F5', 0.25], ['D5', 0.25], ['E5', 0.5], ['C5', 0.5]
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['C3', 1], ['G2', 1], ['G2', 1], ['C3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
