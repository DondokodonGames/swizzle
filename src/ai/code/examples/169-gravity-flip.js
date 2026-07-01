// 169-gravity-flip.js
// 重力反転 — タップするたびに重力が上下逆転、壁をかわしながら飛び続ける爽快感
// 操作: タップで重力反転
// 成功: 6秒生き延びる  失敗: 壁に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、縦坑） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY · DODGE WALLS';
  var NEEDED   = 6;              // 修正2: 20 → 6（サバイバル短縮）
  var PLAYER_X = snap(W * 0.22), PLAYER_R = 40, GRAVITY = 1700, WALL_W = 64;
  var WALL_SPEED = 380, GAP_H = 460, MIN_GAP_H = 380, WALL_INTERVAL = 1.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var py, pvy, gravDir, walls, wallTimer, trail, survived, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawPlayer() {
    for (var t = 0; t < trail.length; t++) pc(trail[t].x, trail[t].y, PLAYER_R * trail[t].life * 3, C.f, trail[t].life * 0.5);
    pc(PLAYER_X, py, PLAYER_R, C.c, 1);
    game.draw.rect(PLAYER_X - 4, py - 12, 14, 14, C.bg);  // 目
    game.draw.rect(PLAYER_X + 12, py - 4, 16, 8, C.f);    // くちばし
    // 噴射炎
    var fy = py - gravDir * (PLAYER_R + 12);
    game.draw.rect(snap(PLAYER_X) - 8, snap(fy) - 8, 16, 16, C.f, 0.8);
  }

  function drawWall(w) {
    game.draw.rect(w.x, 0, WALL_W, w.gapY, C.d, 0.95); game.draw.rect(w.x, w.gapY - 12, WALL_W, 12, C.e);
    var bot = w.gapY + w.gapH;
    game.draw.rect(w.x, bot, WALL_W, H - bot, C.d, 0.95); game.draw.rect(w.x, bot, WALL_W, 12, C.e);
  }

  function spawnWall() {
    var gapH = GAP_H - (survived / NEEDED) * (GAP_H - MIN_GAP_H);
    var gapY = snap(PLAYER_R * 2 + Math.random() * (H - gapH - PLAYER_R * 4));
    walls.push({ x: W + WALL_W, gapY: gapY, gapH: gapH });
  }

  function initGame() {
    py = H / 2; pvy = 0; gravDir = 1;
    walls = []; wallTimer = 0.6; trail = [];
    survived = 0; timeLeft = NEEDED; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.round(survived) * 100) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    gravDir *= -1; pvy *= 0.3;
    game.audio.play('se_tap', 0.35);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawWall({ x: W * 0.6, gapY: H / 2 - 230, gapH: 460 });
      py = H / 2 + Math.sin(game.time.elapsed * 2) * 100; drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'CRASHED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      pvy += GRAVITY * gravDir * dt;
      pvy = Math.max(-1100, Math.min(1100, pvy));
      py += pvy * dt;
      if (py - PLAYER_R < 0) { finish(false); return; }
      if (py + PLAYER_R > H) { finish(false); return; }
      trail.push({ x: PLAYER_X, y: py, life: 0.25 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      wallTimer -= dt;
      if (wallTimer <= 0) { wallTimer = WALL_INTERVAL * (0.85 + Math.random() * 0.3); spawnWall(); }
      var speed = WALL_SPEED + survived * 12;
      for (var wi = walls.length - 1; wi >= 0; wi--) {
        var w = walls[wi];
        w.x -= speed * dt;
        if (PLAYER_X + PLAYER_R > w.x && PLAYER_X - PLAYER_R < w.x + WALL_W && !(py > w.gapY && py < w.gapY + w.gapH)) { finish(false); return; }
        if (w.x < -WALL_W) walls.splice(wi, 1);
      }
    }

    // ---- 描画 ----
    background();
    txt(gravDir > 0 ? 'v' : '^', 80, gravDir > 0 ? H - 80 : 120, 64, C.e);
    for (var wi2 = 0; wi2 < walls.length; wi2++) drawWall(walls[wi2]);
    drawPlayer();

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt('TAP TO FLIP', W / 2, H - 120, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
