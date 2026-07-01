// 048-tower-defense.js
// タワーディフェンス — 迫りくる敵をタップで撃退するシンプルな防衛戦
// 操作: 画面をタップして敵を撃つ
// 成功: 5秒生き残る  失敗: 5体の敵がゴールに到達

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'TOWER DEFENSE';
  var HOW_TO_PLAY = 'TAP TO SHOOT INVADERS';
  var MAX_TIME = 5;          // 修正2: 生存系 20s → 5s
  var TOWER_X = W / 2, TOWER_Y = H * 0.84;   // 修正1: 砲台は最下部
  var ENEMY_R = 48, BULLET_R = 14, BULLET_SPEED = 900;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var enemies, bullets, spawnTimer, lives, timeLeft, done, kills, muzzleFlash, explosions;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function spawnEnemy() { enemies.push({ x: game.random(80, W - 80), y: -ENEMY_R, speed: 160 + Math.random() * 100 + (MAX_TIME - timeLeft) * 30, hit: false }); }
  function initGame() { enemies = []; bullets = []; spawnTimer = 0.6; lives = 5; timeLeft = MAX_TIME; done = false; kills = 0; muzzleFlash = 0; explosions = []; spawnEnemy(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + kills * 50 + lives * 40) : kills * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - TOWER_X, dy = y - TOWER_Y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    bullets.push({ x: TOWER_X, y: TOWER_Y, vx: dx / dist * BULLET_SPEED, vy: dy / dist * BULLET_SPEED });
    muzzleFlash = 0.08; game.audio.play('se_tap', 0.5);
  });

  // 世界観: 宇宙基地の防衛砲。上空から降るインベーダーを迎撃する。
  function background() {
    game.draw.clear('#000011');
    for (var i = 0; i < 40; i++) { var sx = (i * 137) % W, sy = (i * 219 + game.time.elapsed * 40) % H; game.draw.rect(snap(sx), snap(sy), 8, 8, C.c, 0.3); }
    game.draw.rect(0, TOWER_Y + 40, W, H, '#0a0a22');  // 地表
    txt('DEFENSE BASE', W / 2, H * 0.08, 36, C.b);
  }

  function drawEnemy(x, y) {
    var bx = snap(x), by = snap(y);
    game.draw.rect(bx - 40, by - 16, 80, 40, C.e);        // 胴
    game.draw.rect(bx - 24, by - 32, 48, 16, C.e);        // 頭
    game.draw.rect(bx - 16, by - 8, 12, 12, C.g);         // 目
    game.draw.rect(bx + 4,  by - 8, 12, 12, C.g);
    game.draw.rect(bx - 40, by + 24, 16, 16, C.e);        // 脚
    game.draw.rect(bx + 24, by + 24, 16, 16, C.e);
  }
  function drawTower() {
    var bx = snap(TOWER_X), by = snap(TOWER_Y);
    game.draw.rect(bx - 60, by - 8, 120, 80, '#333366');  // 基部
    game.draw.rect(bx - 20, by - 72, 40, 72, '#5555aa');  // 砲身
    drawPixelCircle(bx, by - 8, 40, C.a, 1);              // ドーム
    drawPixelCircle(bx, by - 8, 16, C.b, 1);
    if (muzzleFlash > 0) drawPixelCircle(bx, by - 72, 40, C.c, muzzleFlash / 0.08);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!enemies) initGame();
      background();
      drawEnemy(W / 2, H * 0.35); drawTower();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.62, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.7, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnEnemy(); spawnTimer = Math.max(0.4, 0.9 - (MAX_TIME - timeLeft) * 0.08); }
      for (var b = bullets.length - 1; b >= 0; b--) {
        var bul = bullets[b]; bul.x += bul.vx * dt; bul.y += bul.vy * dt;
        if (bul.x < 0 || bul.x > W || bul.y < 0 || bul.y > H) { bullets.splice(b, 1); continue; }
        for (var e = 0; e < enemies.length; e++) {
          var en = enemies[e];
          if (!en.hit && Math.abs(bul.x - en.x) < ENEMY_R + BULLET_R && Math.abs(bul.y - en.y) < ENEMY_R + BULLET_R) {
            en.hit = true; kills++; explosions.push({ x: en.x, y: en.y, r: 0, life: 0.35 }); game.audio.play('se_tap', 0.7); bullets.splice(b, 1); break;
          }
        }
      }
      for (var i = enemies.length - 1; i >= 0; i--) {
        var en2 = enemies[i]; if (en2.hit) { enemies.splice(i, 1); continue; }
        var dx = TOWER_X - en2.x, dy = TOWER_Y - en2.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
        en2.x += dx / dist * en2.speed * dt; en2.y += dy / dist * en2.speed * dt;
        if (dist < ENEMY_R + 60) { enemies.splice(i, 1); lives--; game.audio.play('se_failure', 0.5); if (lives <= 0) { finish(false); return; } }
      }
      for (var ex = explosions.length - 1; ex >= 0; ex--) { explosions[ex].r += 140 * dt; explosions[ex].life -= dt; if (explosions[ex].life <= 0) explosions.splice(ex, 1); }
      if (muzzleFlash > 0) muzzleFlash -= dt;
    }

    // ---- draw ----
    background();
    for (var j = 0; j < enemies.length; j++) drawEnemy(enemies[j].x, enemies[j].y);
    for (var bu = 0; bu < bullets.length; bu++) game.draw.rect(snap(bullets[bu].x) - BULLET_R, snap(bullets[bu].y) - BULLET_R, BULLET_R * 2, BULLET_R * 2, C.d);
    for (var e2 = 0; e2 < explosions.length; e2++) drawPixelCircle(explosions[e2].x, explosions[e2].y, explosions[e2].r, C.f, explosions[e2].life / 0.35 * 0.7);
    drawTower();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    for (var lv = 0; lv < 5; lv++)
      game.draw.rect(W / 2 + (lv - 2) * 56 - 18, 150, 36, 36, lv < lives ? C.f : '#330000');
    txt('TAP TO SHOOT!', W / 2, H - 60, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
