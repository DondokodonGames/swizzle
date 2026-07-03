// 451-steer-ship.js
// 舵取り — うねる海流の中で船を左右に操舵し、ブイを通過して岩礁を避ける
// 操作: 左右スワイプで舵を切る（惰性あり）。オレンジのブイに船を重ねて通過
// 成功: 4個 のブイ通過  失敗: 3回 座礁 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、夜光の海） ──
  var C = { bg:'#001028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STEER SHIP';
  var HOW_TO_PLAY = 'SWIPE LEFT / RIGHT TO STEER · PASS THE BUOYS · DODGE ROCKS';
  var MAX_TIME = 20;
  var NEEDED    = 4;         // 修正2: 10 → 4
  var MAX_CRASH = 3;
  var SHIP_Y = snap(H * 0.8), SCROLL = 260;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ship, rocks, buoys, particles, passed, crashes, timeLeft, done, scrollY, seaAnim, nextObstY, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#04182a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var wl = 0; wl < 18; wl++) { var wy = (wl * 120 + scrollY) % (H + 120) - 60; game.draw.rect(0, snap(wy), W, 6, C.d, 0.12 + Math.sin(seaAnim * 1.5 + wl) * 0.05); }
  }

  function spawnRow() {
    // ブイ（中央付近）か岩礁ペア（両サイド）を交互に
    if (buoys.length + passed < 100 && Math.random() < 0.5) {
      buoys.push({ x: snap(W / 2 + (Math.random() - 0.5) * 360), y: nextObstY, done: false });
    } else {
      var gapX = snap(200 + Math.random() * (W - 400));
      rocks.push({ x: snap(gapX * 0.4), y: nextObstY, r: 48 + Math.random() * 24 });
      rocks.push({ x: snap(W - gapX * 0.4), y: nextObstY, r: 48 + Math.random() * 24 });
    }
    nextObstY -= 300;
  }

  function initGame() { ship = { x: snap(W / 2), vx: 0, rudder: 0 }; rocks = []; buoys = []; particles = []; passed = 0; crashes = 0; timeLeft = MAX_TIME; done = false; scrollY = 0; seaAnim = 0; nextObstY = -200; flash = 0; flashCol = C.b; for (var i = 0; i < 6; i++) spawnRow(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 700 + Math.ceil(timeLeft) * 100) : passed * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawShip() {
    var tilt = ship.vx * 0.06;
    ring(ship.x, SHIP_Y + 50, 14, C.e, 0.3);
    pc(ship.x, SHIP_Y, 36, C.g, 0.9); pc(ship.x, SHIP_Y, 22, C.d, 0.7); pc(ship.x - 8, SHIP_Y - 8, 10, C.e, 0.5);
    game.draw.rect(snap(ship.x + tilt) - 4, SHIP_Y - 80, 8, 56, '#90a0b0', 0.9);
    for (var s = 0; s < 5; s++) game.draw.rect(snap(ship.x + tilt) + 4, SHIP_Y - 78 + s * 8, 8 + s * 6, 8, C.g, 0.8);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') ship.rudder = -1; else if (dir === 'right') ship.rudder = 1;
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ship) initGame(); background(); drawShip();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      seaAnim += dt; scrollY += SCROLL * dt; background(); drawShip();
      txt(resultSuccess ? 'SAFE HARBOR!' : 'RUN AGROUND', W / 2, H * 0.14, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.20, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.26, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      seaAnim += dt; scrollY += SCROLL * dt;
      // 操舵（惰性）
      ship.vx += ship.rudder * 900 * dt; ship.rudder *= (1 - dt * 3); ship.vx *= (1 - dt * 1.4); ship.x += ship.vx * dt;
      if (ship.x < 60) { ship.x = 60; ship.vx = Math.abs(ship.vx) * 0.3; } if (ship.x > W - 60) { ship.x = W - 60; ship.vx = -Math.abs(ship.vx) * 0.3; }
      // 障害物補充
      while (nextObstY + scrollY < H + 200) spawnRow();
      // ブイ判定
      for (var bi = buoys.length - 1; bi >= 0; bi--) {
        var b = buoys[bi]; var wy = b.y + scrollY;
        if (!b.done && wy > SHIP_Y - 30 && wy < SHIP_Y + 60) {
          if (Math.abs(ship.x - b.x) < 80) { b.done = true; passed++; game.audio.play('se_success', 0.5); flash = 0.4; flashCol = C.b; for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ship.x, y: SHIP_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.f }); } if (passed >= NEEDED) { finish(true); return; } }
        }
        if (wy > H + 100) buoys.splice(bi, 1);
      }
      // 岩礁判定
      for (var ri = rocks.length - 1; ri >= 0; ri--) {
        var r = rocks[ri]; var ry = r.y + scrollY;
        if (ry > SHIP_Y - r.r - 30 && ry < SHIP_Y + r.r + 30 && Math.abs(ship.x - r.x) < r.r + 28) {
          rocks.splice(ri, 1); crashes++; ship.vx = -ship.vx * 0.5; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.5);
          for (var k2 = 0; k2 < 10; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: ship.x, y: SHIP_Y, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, life: 0.6, col: C.a }); }
          if (crashes >= MAX_CRASH) { finish(false); return; }
          continue;
        }
        if (ry > H + 100) rocks.splice(ri, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ri2 = 0; ri2 < rocks.length; ri2++) { var r2 = rocks[ri2], ry2 = r2.y + scrollY; if (ry2 < -100 || ry2 > H + 100) continue; pc(r2.x, ry2, r2.r, '#405060', 0.9); pc(r2.x - r2.r * 0.3, ry2 - r2.r * 0.3, r2.r * 0.25, '#708090', 0.5); }
    for (var bi2 = 0; bi2 < buoys.length; bi2++) { var b2 = buoys[bi2]; if (b2.done) continue; var by = b2.y + scrollY; if (by < -80 || by > H + 80) continue; var bob = Math.sin(seaAnim * 3 + bi2) * 6; ring(b2.x, by + bob, 30, C.f, 0.4); pc(b2.x, by + bob, 22, C.f, 0.9); pc(b2.x, by + bob, 10, C.c, 0.8); }
    drawShip();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ci = 0; ci < MAX_CRASH; ci++) game.draw.rect(snap(W / 2 + (ci - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, ci < crashes ? C.a : '#04182a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
