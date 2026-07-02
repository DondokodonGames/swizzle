// 328-traffic-flow.js
// トラフィックフロー — 交差点の信号をタップで切り替え、車をぶつけずに通過させる交通整理
// 操作: 交差点をタップして縦横の信号を切り替える
// 成功: 6台通過させる  失敗: 3台衝突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ナイトシティ） ──
  var C = { bg:'#050508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', road:'#161620' };
  var CAR_COLS = [C.a, C.e, C.c, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TRAFFIC FLOW';
  var HOW_TO_PLAY = 'TAP JUNCTIONS TO SWITCH LIGHTS · AVOID CRASHES';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 40 → 6
  var MAX_CRASH = 3;         // 修正2: 5 → 3
  var HY1 = snap(H * 0.40), HY2 = snap(H * 0.60), VX1 = snap(W * 0.35), VX2 = snap(W * 0.65), RW = 80;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var junctions, cars, carId, passed, crashes, timeLeft, done, spawnTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#161620');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, HY1 - RW / 2, W, RW, C.road, 0.95); game.draw.rect(0, HY2 - RW / 2, W, RW, C.road, 0.95);
    game.draw.rect(VX1 - RW / 2, 0, RW, H, C.road, 0.95); game.draw.rect(VX2 - RW / 2, 0, RW, H, C.road, 0.95);
    game.draw.rect(0, HY1 - 1, W, 2, C.d, 0.4); game.draw.rect(0, HY2 - 1, W, 2, C.d, 0.4);
    game.draw.rect(VX1 - 1, 0, 2, H, C.d, 0.4); game.draw.rect(VX2 - 1, 0, 2, H, C.d, 0.4);
  }

  function spawnCar() {
    var dir = Math.floor(Math.random() * 4), col = CAR_COLS[Math.floor(Math.random() * 4)], car;
    if (dir === 0) car = { x: -60, y: HY1 + (Math.random() < 0.5 ? -18 : 18), vx: 170, vy: 0, dir: 0, w: 64, h: 32, col: col };
    else if (dir === 1) car = { x: W + 60, y: HY2 + (Math.random() < 0.5 ? -18 : 18), vx: -170, vy: 0, dir: 1, w: 64, h: 32, col: col };
    else if (dir === 2) car = { x: VX1 + (Math.random() < 0.5 ? -18 : 18), y: -60, vx: 0, vy: 170, dir: 2, w: 32, h: 64, col: col };
    else car = { x: VX2 + (Math.random() < 0.5 ? -18 : 18), y: H + 60, vx: 0, vy: -170, dir: 3, w: 32, h: 64, col: col };
    cars.push(car);
  }

  function initGame() {
    junctions = [{ x: VX1, y: HY1, gH: true }, { x: VX2, y: HY1, gH: false }, { x: VX1, y: HY2, gH: false }, { x: VX2, y: HY2, gH: true }];
    cars = []; carId = 0; passed = 0; crashes = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 300 + Math.ceil(timeLeft) * 100) : passed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ii = 0; ii < junctions.length; ii++) { var j = junctions[ii]; pc(j.x - 50, j.y, 16, j.gH ? C.b : C.a, 0.9); pc(j.x, j.y - 50, 16, j.gH ? C.a : C.b, 0.9); }
    for (var ci = 0; ci < cars.length; ci++) { var c = cars[ci]; game.draw.rect(snap(c.x - c.w / 2), snap(c.y - c.h / 2), c.w, c.h, c.col, 0.95); game.draw.rect(snap(c.x - c.w / 2) + 4, snap(c.y - c.h / 2) + 4, c.w - 8, c.h - 8, C.g, 0.25); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bd = 1e9; for (var ii = 0; ii < junctions.length; ii++) { var d = Math.hypot(x - junctions[ii].x, y - junctions[ii].y); if (d < bd) { bd = d; best = ii; } }
    if (best >= 0 && bd < 120) { junctions[best].gH = !junctions[best].gH; game.audio.play('se_tap', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!junctions) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEAR ROADS!' : 'GRIDLOCK', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0 && cars.length < 8) { spawnCar(); spawnTimer = 0.8 - Math.min(0.4, passed * 0.04); }
      for (var ci = 0; ci < cars.length; ci++) {
        var car = cars[ci], canMove = true, isH = car.dir <= 1, isV = car.dir >= 2;
        for (var ii = 0; ii < junctions.length; ii++) {
          var j = junctions[ii], green = (isH && j.gH) || (isV && !j.gH);
          if (!green) {
            var stop = false;
            if (isH && Math.abs(car.y - j.y) < RW / 2) { if (car.dir === 0 && car.x < j.x - 40 && car.x > j.x - 200) stop = true; if (car.dir === 1 && car.x > j.x + 40 && car.x < j.x + 200) stop = true; }
            if (isV && Math.abs(car.x - j.x) < RW / 2) { if (car.dir === 2 && car.y < j.y - 40 && car.y > j.y - 200) stop = true; if (car.dir === 3 && car.y > j.y + 40 && car.y < j.y + 200) stop = true; }
            if (stop) { canMove = false; break; }
          }
        }
        if (canMove) { car.x += car.vx * dt; car.y += car.vy * dt; }
      }
      for (var i2 = 0; i2 < cars.length; i2++) for (var j2 = i2 + 1; j2 < cars.length; j2++) {
        var a = cars[i2], b = cars[j2];
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) {
          crashes++; game.audio.play('se_failure', 0.6);
          for (var k = 0; k < 10; k++) { var an = Math.random() * Math.PI * 2; particles.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: Math.cos(an) * 200, vy: Math.sin(an) * 200, life: 0.7, col: C.c }); }
          cars.splice(j2, 1); cars.splice(i2, 1);
          if (crashes >= MAX_CRASH) { finish(false); return; }
          i2 = -1; break;
        }
      }
      for (var ci3 = cars.length - 1; ci3 >= 0; ci3--) { var c = cars[ci3]; if (c.x < -120 || c.x > W + 120 || c.y < -120 || c.y > H + 120) { passed++; cars.splice(ci3, 1); if (passed >= NEEDED) { finish(true); return; } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.4);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var cr = 0; cr < MAX_CRASH; cr++) game.draw.rect(snap(W / 2 + (cr - (MAX_CRASH - 1) / 2) * 56) - 10, 224, 20, 20, cr < crashes ? C.a : '#161620');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
