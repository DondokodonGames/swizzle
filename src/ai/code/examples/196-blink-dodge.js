// 196-blink-dodge.js
// ブリンク回避 — 時々消えて現れる壁の隙間を、残像を頼りに通り抜ける
// 操作: タップ/スワイプで左右レーン移動
// 成功: 6秒生き残る  失敗: 壁に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、点滅ゲート） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BLINK DODGE';
  var HOW_TO_PLAY = 'TAP ◄► TO SLIDE · MEMORIZE THE GAP';
  var NEEDED   = 6;              // 修正2: 20 → 6（サバイバル短縮）
  var TOP    = 220;
  var LANES = [snap(W * 0.2), snap(W * 0.4), snap(W * 0.6), snap(W * 0.8)];
  var PLAYER_Y = snap(H * 0.74), PLAYER_R = 40;
  var WALL_H = 40, WALL_SPEED = 400, GAP_W = 240, SPAWN = 1.2;
  var BLINK_PERIOD = 2.2, BLINK_HIDE = 0.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, walls, ghost, spawnTimer, blinkTimer, visible, survived, timeLeft, done;

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
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var li = 0; li < 4; li++) game.draw.rect(LANES[li] - 1, TOP, 2, H - TOP, C.d, 0.15);
  }

  function drawWall(w, color, alpha) {
    game.draw.rect(0, w.y, w.gap - GAP_W / 2, WALL_H, color, alpha);
    game.draw.rect(w.gap + GAP_W / 2, w.y, W - w.gap - GAP_W / 2, WALL_H, color, alpha);
  }

  function drawPlayer() {
    var x = LANES[lane];
    pc(x, PLAYER_Y, PLAYER_R, C.b, 1);
    game.draw.rect(x - 14, PLAYER_Y - 10, 10, 12, C.bg); game.draw.rect(x + 4, PLAYER_Y - 10, 10, 12, C.bg);
  }

  function initGame() {
    lane = 1; walls = []; ghost = []; spawnTimer = 0.5; blinkTimer = 0; visible = true;
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

  function move(d) { lane = Math.max(0, Math.min(3, lane + d)); game.audio.play('se_tap', 0.3); }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    move(x < W / 2 ? -1 : 1);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') move(-1); else if (dir === 'right') move(1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawWall({ y: H * 0.4, gap: W * 0.5 }, C.a, 0.85);
      drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.88, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#886699');
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
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      blinkTimer += dt; if (blinkTimer >= BLINK_PERIOD) blinkTimer -= BLINK_PERIOD;
      visible = (blinkTimer / BLINK_PERIOD) < (1 - BLINK_HIDE);
      if (!visible) ghost = walls.map(function(w) { return { y: w.y, gap: w.gap }; });
      spawnTimer -= dt;
      var mult = 1 + survived / 30;
      if (spawnTimer <= 0) { spawnTimer = SPAWN / mult; walls.push({ y: TOP - WALL_H, gap: LANES[Math.floor(Math.random() * 4)] }); }
      var px = LANES[lane];
      for (var wi = walls.length - 1; wi >= 0; wi--) {
        walls[wi].y += WALL_SPEED * mult * dt;
        if (visible && walls[wi].y > PLAYER_Y - PLAYER_R && walls[wi].y < PLAYER_Y + PLAYER_R) {
          if (px - PLAYER_R < walls[wi].gap - GAP_W / 2 || px + PLAYER_R > walls[wi].gap + GAP_W / 2) { finish(false); return; }
        }
        if (walls[wi].y > H + 20) walls.splice(wi, 1);
      }
    }

    // ---- 描画 ----
    background();
    if (!visible) { for (var gi = 0; gi < ghost.length; gi++) drawWall(ghost[gi], C.d, 0.5); game.draw.rect(0, 0, W, H, C.a, 0.04); }
    else { for (var wi2 = 0; wi2 < walls.length; wi2++) drawWall(walls[wi2], C.a, 0.9); }
    drawPlayer();
    for (var li2 = 0; li2 < 4; li2++) game.draw.rect(LANES[li2] - (li2 === lane ? 16 : 8), PLAYER_Y + 80, li2 === lane ? 32 : 16, 12, li2 === lane ? C.b : '#2a0a3a');

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt('TAP ◄ ►', W / 2, H - 120, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
