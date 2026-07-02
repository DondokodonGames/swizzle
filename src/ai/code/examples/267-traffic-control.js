// 267-traffic-control.js
// トラフィックコントロール — 十字路の信号をタップで切り替え、車を衝突させず通過させる交通整理
// 操作: タップで縦横の青信号を入れ替える
// 成功: 6台通過  失敗: 衝突3回 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、管制交差点） ──
  var C = { bg:'#030508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CARCOL = [C.e, C.f, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TRAFFIC CONTROL';
  var HOW_TO_PLAY = 'TAP TO SWITCH THE GREEN LIGHT · AVOID CRASHES';
  var MAX_TIME = 15;
  var NEEDED   = 6;           // 修正2: 40 → 6
  var MAX_CRASH = 3;
  var IX = snap(W / 2), IY = snap(H * 0.5), ROAD = 88, SAFE = ROAD / 2 + 40;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hGreen, cooldown, cars, passed, crashes, timeLeft, done, spawnTimer, flash, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a2030');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, IY - ROAD / 2, W, ROAD, C.d, 0.5); game.draw.rect(IX - ROAD / 2, 0, ROAD, H, C.d, 0.5);
    game.draw.rect(IX - ROAD / 2, IY - ROAD / 2, ROAD, ROAD, '#1a2a3a', 0.9);
  }

  function drawLights() {
    var hc = hGreen ? C.b : C.a, vc = hGreen ? C.a : C.b;
    game.draw.rect(snap(IX - 90) - 12, snap(IY - 70) - 12, 24, 24, hc, 0.9); game.draw.rect(snap(IX + 90) - 12, snap(IY + 70) - 12, 24, 24, hc, 0.9);
    game.draw.rect(snap(IX - 70) - 12, snap(IY - 90) - 12, 24, 24, vc, 0.9); game.draw.rect(snap(IX + 70) - 12, snap(IY + 90) - 12, 24, 24, vc, 0.9);
  }

  function drawCar(c) {
    var cw = c.isH ? 56 : 34, ch = c.isH ? 34 : 56;
    game.draw.rect(snap(c.x) - cw / 2, snap(c.y) - ch / 2, cw, ch, c.crashed ? C.a : c.col, 0.9);
    game.draw.rect(snap(c.x) - cw / 2, snap(c.y) - ch / 2, cw, 6, C.g, 0.4);
    if (c.crashed) { game.draw.rect(snap(c.x) - 4, snap(c.y) - 4, 8, 8, C.g); }
  }

  function spawnCar() {
    var side = Math.floor(Math.random() * 4), isH = side < 2, sp = 130 + Math.random() * 50, col = CARCOL[Math.floor(Math.random() * CARCOL.length)], car = { isH: isH, col: col, crashed: false, waiting: false, crashT: 0 };
    if (side === 0) { car.x = -40; car.y = IY; car.vx = sp; car.vy = 0; }
    else if (side === 1) { car.x = W + 40; car.y = IY; car.vx = -sp; car.vy = 0; }
    else if (side === 2) { car.x = IX; car.y = -40; car.vx = 0; car.vy = sp; }
    else { car.x = IX; car.y = H + 40; car.vx = 0; car.vy = -sp; }
    cars.push(car);
  }

  function initGame() { hGreen = true; cooldown = 0; cars = []; passed = 0; crashes = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.5; flash = 0; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 300 + Math.ceil(timeLeft) * 60) : passed * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || cooldown > 0) return;
    hGreen = !hGreen; cooldown = 0.6; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawLights(); drawCar({ x: W * 0.2, y: IY, isH: true, col: C.e, crashed: false }); drawCar({ x: IX, y: H * 0.3, isH: false, col: C.f, crashed: false });
      txt(GAME_TITLE, W / 2, H * 0.14, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#556677');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CLEAR!' : 'PILE-UP', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (cooldown > 0) cooldown -= dt; if (fbTimer > 0) fbTimer -= dt; if (flash > 0) flash -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnCar(); spawnTimer = 1.4 * (0.7 + Math.random() * 0.6); }
      for (var i = 0; i < cars.length; i++) for (var j = i + 1; j < cars.length; j++) { var a = cars[i], b = cars[j]; if (a.crashed || b.crashed || a.isH === b.isH) continue; if ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) < 40 * 40) { crashes++; a.crashed = b.crashed = true; flash = 0.5; fbText = 'CRASH!'; fbCol = C.a; fbTimer = 0.8; game.audio.play('se_failure', 0.7); if (crashes >= MAX_CRASH) { finish(false); return; } } }
      for (var ci = cars.length - 1; ci >= 0; ci--) {
        var car = cars[ci];
        if (car.crashed) { car.crashT += dt; if (car.crashT > 0.8) cars.splice(ci, 1); continue; }
        var green = car.isH ? hGreen : !hGreen, dist = car.isH ? Math.abs(car.x - IX) : Math.abs(car.y - IY);
        if (!green && dist < SAFE + 20 && dist > 20) car.waiting = true; else if (green || dist <= 20) car.waiting = false;
        if (!car.waiting) { car.x += car.vx * dt; car.y += car.vy * dt; }
        if (car.x < -80 || car.x > W + 80 || car.y < -80 || car.y > H + 80) { if (!car.waiting) { passed++; if (passed >= NEEDED) { finish(true); return; } } cars.splice(ci, 1); }
      }
    }

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.3);
    drawLights();
    for (var ci2 = 0; ci2 < cars.length; ci2++) drawCar(cars[ci2]);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.84, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ki = 0; ki < MAX_CRASH; ki++) game.draw.rect(snap(W / 2 + (ki - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ki < crashes ? C.a : '#1a2030');
    txt('TAP TO SWITCH', W / 2, H - 100, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
