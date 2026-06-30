// 009-gravity-flip.js
// 重力反転 — タップで上下を逆転させて壁をすり抜ける驚き
// 操作: タップで重力を反転
// 成功: 1つのゲートをくぐり抜ける  失敗: 壁に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#008f11', c:'#003b00', d:'#00ff41', e:'#ffffff', f:'#ff0000', g:'#ffff00' };

  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY';
  var NEEDED = 1;            // 修正2: 3 → ceil(3/10) = 1
  var WALL_H = 160;
  var ACCEL = 1800;
  var SCROLL_SPD = 380;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var gravity, vy, playerX, playerY, playerR, gatesPassed, done, obstacles, trailPoints, obTimer;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step)
      for (var px = -r; px <= r; px += step)
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function initGame() {
    // 修正1: プレイヤー初期位置を縦下3分の1に。重力は上向き(-1)始動で低位置から浮上させ可動域を確保
    gravity = -1; vy = 0; playerX = 240; playerY = H * 0.72; playerR = 40;
    gatesPassed = 0; done = false; obstacles = []; trailPoints = []; obTimer = 0.8;
    spawnObstacle();
  }

  function spawnObstacle() {
    var gapCenter = game.random(WALL_H + 200, H - WALL_H - 200);
    var gapH = game.random(320, 440);
    obstacles.push({ x: W + 120, topH: snap(gapCenter - gapH / 2), botY: snap(gapCenter + gapH / 2), passed: false });
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? gatesPassed * 500 : gatesPassed * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1500);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    gravity = -gravity; vy = 0;
    game.audio.play('se_tap', 0.6);
  });

  function background() {
    game.draw.clear(C.bg);
    for (var gy = WALL_H; gy < H - WALL_H; gy += 80) game.draw.rect(0, gy, W, 2, C.c, 0.6);
    game.draw.rect(0, 0, W, WALL_H, C.b);
    game.draw.rect(0, WALL_H - 8, W, 8, C.a);
    game.draw.rect(0, H - WALL_H, W, WALL_H, C.b);
    game.draw.rect(0, H - WALL_H, W, 8, C.a);
  }

  function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
      var ob = obstacles[i];
      game.draw.rect(snap(ob.x), WALL_H, 72, ob.topH - WALL_H, C.b);
      game.draw.rect(snap(ob.x), ob.topH - 16, 72, 16, C.a);
      game.draw.rect(snap(ob.x), ob.botY, 72, H - WALL_H - ob.botY, C.b);
      game.draw.rect(snap(ob.x), ob.botY, 72, 16, C.a);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      var demoY = snap(H / 2 + Math.sin(game.time.elapsed * 2) * 300);
      drawPixelCircle(W / 2, demoY, 40, C.a, 1);
      txt(GAME_TITLE,  W / 2, H * 0.3, 84, C.g);
      txt(HOW_TO_PLAY, W / 2, H * 0.4, 44, C.a);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 72, C.e);
        txt('TAP TO START', W / 2, H * 0.72, 52, C.e);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#446644');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.g : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.e);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.a);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      vy += gravity * ACCEL * dt;
      vy = Math.max(-900, Math.min(900, vy));
      playerY += vy * dt;

      trailPoints.unshift({ x: playerX, y: playerY });
      if (trailPoints.length > 8) trailPoints.pop();

      if (playerY - playerR < WALL_H || playerY + playerR > H - WALL_H) { finish(false); return; }

      obTimer -= dt;
      if (obTimer <= 0) { spawnObstacle(); obTimer = 1.8; }

      for (var i = obstacles.length - 1; i >= 0; i--) {
        var ob = obstacles[i];
        ob.x -= SCROLL_SPD * dt;
        if (playerX + playerR > ob.x && playerX - playerR < ob.x + 72) {
          if (playerY - playerR < ob.topH || playerY + playerR > ob.botY) { finish(false); return; }
          if (!ob.passed && playerX > ob.x + 36) {
            ob.passed = true; gatesPassed++;
            game.audio.play('se_tap', 1.0);
            if (gatesPassed >= NEEDED) { finish(true); return; }
          }
        }
        if (ob.x + 100 < 0) obstacles.splice(i, 1);
      }
    }

    // ---- draw ----
    background();
    drawObstacles();
    for (var tI = 0; tI < trailPoints.length; tI++) {
      var tp = trailPoints[tI];
      var ta = 1 - tI / trailPoints.length;
      game.draw.rect(snap(tp.x) - 12, snap(tp.y) - 12, 24, 24, C.a, ta * 0.4);
    }
    drawPixelCircle(playerX, playerY, playerR, C.a, 1);
    txt(gravity > 0 ? '▼' : '▲', playerX, playerY + (gravity > 0 ? 1 : -1) * (playerR + 28), 36, C.g);

    txt('GATE ' + gatesPassed + ' / ' + NEEDED, W / 2, 96, 48, C.g);
    txt('TAP TO FLIP', W / 2, H - 80, 44, C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
