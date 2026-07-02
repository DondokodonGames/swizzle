// 268-pixel-runner.js
// ピクセルランナー — 8ビット風の横スクロールを走り、タップの2段ジャンプで障害物を跳び越える
// 操作: タップでジャンプ（空中でもう一度で2段ジャンプ）
// 成功: 20m走破  失敗: 障害物に激突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、8ビット荒野） ──
  var C = { bg:'#05030e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL RUNNER';
  var HOW_TO_PLAY = 'TAP TO JUMP · TAP AGAIN TO DOUBLE JUMP';
  var MAX_TIME = 15;
  var NEEDED   = 20;          // 修正2: 100 → 20
  var GROUND_Y = snap(H * 0.72), PX = snap(W * 0.2), PW = 48, PH = 60, TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var py, vy, jumps, onGround, obstacles, distance, scrollSpeed, timeLeft, done, spawnTimer, stars, dust, runFrame, runTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, 4, 4, C.g, 0.3 + 0.15 * (Math.floor(game.time.elapsed * 2 + si) % 2));
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.d, 0.5); game.draw.rect(0, GROUND_Y, W, 8, C.b, 0.5);
    var off = snap(game.time.elapsed * scrollSpeed) % 40;
    for (var ti = 0; ti < W / 40 + 1; ti++) game.draw.rect(ti * 40 - off, GROUND_Y + 12, 32, 10, C.d, 0.3);
  }

  function drawPlayer() {
    game.draw.rect(PX + 4, snap(py), PW - 8, PH, C.b, 0.9);
    game.draw.rect(PX + 8, snap(py) - 24, PW - 16, 24, C.g, 0.9);
    game.draw.rect(PX + PW - 18, snap(py) - 18, 8, 8, C.bg);
    var leg = onGround ? (Math.floor(runFrame) % 2 ? 12 : -4) : 0;
    game.draw.rect(PX + 4, snap(py + PH), 14, 16 + leg, C.g, 0.8); game.draw.rect(PX + PW - 18, snap(py + PH), 14, 16 - leg, C.g, 0.8);
  }

  function drawObstacle(o) { game.draw.rect(snap(o.x), snap(o.y), o.w, o.h, C.a, 0.9); game.draw.rect(snap(o.x), snap(o.y), o.w, 8, C.f, 0.7); }

  function initGame() {
    py = GROUND_Y - PH; vy = 0; jumps = 0; onGround = true; obstacles = []; distance = 0; scrollSpeed = 260; timeLeft = MAX_TIME; done = false; spawnTimer = 1.2; dust = []; runFrame = 0; runTimer = 0;
    stars = []; for (var i = 0; i < 40; i++) stars.push({ x: snap(Math.random() * W), y: snap(TOP + Math.random() * (GROUND_Y - TOP)) });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 100) : Math.floor(distance) * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (jumps < 2) { vy = -720; jumps++; onGround = false; game.audio.play('se_tap', 0.35); for (var di = 0; di < 4; di++) { var a = Math.PI + game.random(-0.5, 0.5); dust.push({ x: PX + PW / 2, y: py + PH, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 30, life: 0.3 }); } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) initGame(); background(); drawObstacle({ x: W * 0.7, y: GROUND_Y - 80, w: 40, h: 80 }); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOAL!' : 'CRASHED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      vy += 1900 * dt; py += vy * dt;
      if (py >= GROUND_Y - PH) { py = GROUND_Y - PH; vy = 0; jumps = 0; onGround = true; }
      runTimer += dt; if (runTimer > 0.12) { runTimer = 0; runFrame++; }
      scrollSpeed = 260 + distance * 3; distance += scrollSpeed * dt / 100;
      if (distance >= NEEDED) { finish(true); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { var h = 60 + Math.floor(Math.random() * 3) * 30; obstacles.push({ x: W + 40, y: GROUND_Y - h, w: 36, h: h }); spawnTimer = 0.9 + Math.random() * 1.2; }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) { var o = obstacles[oi]; o.x -= scrollSpeed * dt; if (o.x + o.w < 0) { obstacles.splice(oi, 1); continue; } if (PX + PW - 8 > o.x + 6 && PX + 8 < o.x + o.w - 6 && py + PH - 8 > o.y + 6) { finish(false); return; } }
      for (var di = dust.length - 1; di >= 0; di--) { var d = dust[di]; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 300 * dt; d.life -= dt; if (d.life <= 0) dust.splice(di, 1); }
    }

    // ---- 描画 ----
    background();
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) drawObstacle(obstacles[oi2]);
    for (var di2 = 0; di2 < dust.length; di2++) game.draw.rect(snap(dust[di2].x) - 4, snap(dust[di2].y) - 4, 8, 8, C.e, dust[di2].life * 2);
    drawPlayer();

    game.draw.rect(0, H - 60, W * Math.min(1, distance / NEEDED), 14, C.b, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(distance) + ' / ' + NEEDED + 'm', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
