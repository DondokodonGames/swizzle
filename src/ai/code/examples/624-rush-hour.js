// 624-rush-hour.js
// ラッシュアワー — 交差点に進入する車をタップで停止・再開させ、衝突なく通過させる
// 操作: 車をタップで一時停止／もう一度タップで再発進。交差点での衝突を避ける
// 成功: 8台 通過  失敗: 3回 衝突 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜の交差点） ──
  var C = { bg:'#0a0a0a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CAR_COLORS = [C.e, C.a, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RUSH HOUR';
  var HOW_TO_PLAY = 'TAP A CAR TO STOP IT · TAP AGAIN TO GO · GUIDE THEM THROUGH WITHOUT CRASHING';
  var MAX_TIME = 20;
  var NEEDED    = 8;         // 修正2: 20 → 8
  var MAX_CRASH = 3;
  var INTER_X = W / 2, INTER_Y = snap(H * 0.45), ROAD_W = 160;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cars, passed, crashes, timeLeft, done, particles, flash, spawnTimer, nextId;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#1a1a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnCar() {
    var dir = Math.floor(Math.random() * 4), speed = 200 + Math.random() * 90 + (MAX_TIME - timeLeft) * 4, col = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], cx, cy, vx, vy, CW = 100, CH = 60;
    if (dir === 0) { cx = -CW; cy = INTER_Y - ROAD_W / 4; vx = speed; vy = 0; }
    else if (dir === 1) { cx = W + CW; cy = INTER_Y + ROAD_W / 4; vx = -speed; vy = 0; }
    else if (dir === 2) { cx = INTER_X + ROAD_W / 4; cy = -CH; vx = 0; vy = speed; }
    else { cx = INTER_X - ROAD_W / 4; cy = H + CH; vx = 0; vy = -speed; }
    cars.push({ id: nextId++, x: cx, y: cy, vx: vx, vy: vy, svx: vx, svy: vy, w: CW, h: CH, col: col, dir: dir, stopped: false, phase: Math.random() * Math.PI * 2 });
  }

  function carRect(c) { var hw = c.w / 2, hh = c.h / 2; if (c.dir === 2 || c.dir === 3) { hw = c.h / 2; hh = c.w / 2; } return { left: c.x - hw, right: c.x + hw, top: c.y - hh, bot: c.y + hh }; }

  function initGame() { cars = []; passed = 0; crashes = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; spawnTimer = 0; nextId = 0; spawnCar(); spawnCar(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 400 + Math.ceil(timeLeft) * 100) : passed * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, INTER_Y - ROAD_W / 2, W, ROAD_W, '#1a1a1a', 1);
    game.draw.rect(INTER_X - ROAD_W / 2, 0, ROAD_W, H, '#1a1a1a', 1);
    game.draw.rect(0, snap(INTER_Y) - 1, W, 3, C.c, 0.3); game.draw.rect(snap(INTER_X) - 1, 0, 3, H, C.c, 0.3);
    game.draw.rect(INTER_X - ROAD_W / 2, INTER_Y - ROAD_W / 2, ROAD_W, ROAD_W, '#2a2a2a', 1);
    for (var ci = 0; ci < cars.length; ci++) {
      var car = cars[ci], cw = car.w, ch = car.h; if (car.dir === 2 || car.dir === 3) { cw = car.h; ch = car.w; }
      if (car.stopped) game.draw.rect(snap(car.x - cw / 2) - 8, snap(car.y - ch / 2) - 8, cw + 16, ch + 16, C.a, 0.4 + Math.sin(car.phase * 8) * 0.2);
      game.draw.rect(snap(car.x - cw / 2), snap(car.y - ch / 2), cw, ch, car.col, 0.9);
      game.draw.rect(snap(car.x - cw * 0.25), snap(car.y - ch * 0.25), cw * 0.5, ch * 0.5, C.g, 0.4);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ci = 0; ci < cars.length; ci++) {
      var c = cars[ci], r = carRect(c);
      if (tx >= r.left - 20 && tx <= r.right + 20 && ty >= r.top - 20 && ty <= r.bot + 20) {
        c.stopped = !c.stopped;
        if (c.stopped) { c.svx = c.vx; c.svy = c.vy; c.vx = 0; c.vy = 0; } else { c.vx = c.svx; c.vy = c.svy; }
        game.audio.play('se_tap', 0.2); return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!cars) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.84, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CLEAR!' : 'GRIDLOCK', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4;
      spawnTimer += dt; if (spawnTimer > Math.max(0.8, 1.8 - (MAX_TIME - timeLeft) * 0.04) && cars.length < 6) { spawnTimer = 0; spawnCar(); }
      for (var ci = 0; ci < cars.length; ci++) { var c = cars[ci]; c.phase += dt * 3; c.x += c.vx * dt; c.y += c.vy * dt; }
      for (var ci2 = 0; ci2 < cars.length; ci2++) {
        for (var cj = ci2 + 1; cj < cars.length; cj++) {
          var a = cars[ci2], b = cars[cj]; if (a.stopped && b.stopped) continue;
          var ra = carRect(a), rb = carRect(b);
          if (ra.left < rb.right && ra.right > rb.left && ra.top < rb.bot && ra.bot > rb.top) {
            crashes++; flash = 0.4; game.audio.play('se_failure', 0.6);
            var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            for (var p = 0; p < 12; p++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: mx, y: my, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5, col: C.f }); }
            cars.splice(cj, 1); cars.splice(ci2, 1);
            if (crashes >= MAX_CRASH) { finish(false); return; } break;
          }
        }
        if (ci2 >= cars.length) break;
      }
      for (var ci3 = cars.length - 1; ci3 >= 0; ci3--) { var c2 = cars[ci3]; if (c2.x < -200 || c2.x > W + 200 || c2.y < -200 || c2.y > H + 200) { passed++; cars.splice(ci3, 1); if (passed >= NEEDED) { finish(true); return; } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.f, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var cri = 0; cri < MAX_CRASH; cri++) game.draw.rect(snap(W / 2 + (cri - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, cri < crashes ? C.a : '#1a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
