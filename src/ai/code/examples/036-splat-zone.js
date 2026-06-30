// 036-splat-zone.js
// スプラットゾーン — 落ちてくる的にタイミングよく飛びかかる爽快感
// 操作: スワイプ上で飛び上がる、的が頭上を通過する瞬間にタップ
// 成功: 1匹撃墜  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'SPLAT ZONE';
  var HOW_TO_PLAY = 'SWIPE UP TO JUMP, TAP TO HIT';
  var MAX_TIME = 15;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 3;
  var GROUND_Y = H * 0.82, PLAYER_W = 110, PLAYER_H = 150;   // 修正1: プレイヤーは下方
  var ENEMY_W = 130, ENEMY_H = 90, ENEMY_SPEED = 420;
  var ENEMY_Y_RANGE = [H * 0.3, H * 0.6];
  var JUMP_FORCE = -1300, GRAVITY = 2400;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerX, playerY, isJumping, jumpVy, enemies, spawnTimer, score, misses, timeLeft, done, splat;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function spawnEnemy() { enemies.push({ x: -ENEMY_W, y: game.random(ENEMY_Y_RANGE[0], ENEMY_Y_RANGE[1]), alive: true }); }
  function initGame() {
    playerX = W / 2; playerY = GROUND_Y - PLAYER_H; isJumping = false; jumpVy = 0;
    enemies = []; spawnTimer = 1.0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; splat = [];
    spawnEnemy();
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up' && !isJumping) { isJumping = true; jumpVy = JUMP_FORCE; game.audio.play('se_tap', 0.6); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || !isJumping) return;
    var hit = -1;
    for (var i = 0; i < enemies.length; i++) {
      var en = enemies[i]; if (!en.alive) continue;
      if (Math.abs(playerX - en.x) < (PLAYER_W + ENEMY_W) / 2 && Math.abs(playerY - en.y) < (PLAYER_H + ENEMY_H) / 2) { hit = i; break; }
    }
    if (hit >= 0) {
      enemies[hit].alive = false; score++;
      for (var k = 0; k < 10; k++) { var ang = Math.random() * Math.PI * 2; splat.push({ x: enemies[hit].x, y: enemies[hit].y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, r: 12, life: 0.6 }); }
      game.audio.play('se_tap', 1.0);
      if (score >= NEEDED) finish(true);
    } else {
      misses++; game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.f, 0.4);
    game.draw.rect(0, GROUND_Y, W, 10, C.f);
  }

  // ── ドット絵スプライト（8pxブロックの組み合わせ）──
  function drawUFO(x, y) {
    var bx = snap(x), by = snap(y), on = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(bx - 24, by - 48, 48, 24, C.e);     // 上ドーム
    game.draw.rect(bx - 16, by - 56, 32, 8, C.g);      // 天頂ハイライト
    game.draw.rect(bx - 72, by - 24, 144, 24, C.b);    // 円盤
    game.draw.rect(bx - 48, by, 96, 12, C.a);          // 下部
    game.draw.rect(bx - 60, by - 20, 16, 16, on ? C.d : C.f);  // 点滅ライト
    game.draw.rect(bx - 8,  by - 20, 16, 16, on ? C.f : C.d);
    game.draw.rect(bx + 44, by - 20, 16, 16, on ? C.d : C.f);
  }
  function drawFrog(x, y, jumping) {
    var bx = snap(x), by = snap(y), hop = jumping ? -8 : 0;
    game.draw.rect(bx - 48, by - 40 + hop, 96, 72, C.b);       // 胴体
    game.draw.rect(bx - 48, by - 40 + hop, 96, 12, C.g, 0.5);  // ハイライト
    game.draw.rect(bx - 56, by + 24 + hop, 24, 16, C.b);       // 足
    game.draw.rect(bx + 32, by + 24 + hop, 24, 16, C.b);
    game.draw.rect(bx - 44, by - 68 + hop, 36, 36, C.g);       // 目(白)
    game.draw.rect(bx + 8,  by - 68 + hop, 36, 36, C.g);
    game.draw.rect(bx - 36, by - 60 + hop, 16, 16, '#000000'); // 瞳
    game.draw.rect(bx + 16, by - 60 + hop, 16, 16, '#000000');
    game.draw.rect(bx - 24, by + 8 + hop, 48, 8, '#000000');   // 口
  }

  function drawScene() {
    for (var j = 0; j < enemies.length; j++) {
      var en = enemies[j]; if (!en.alive) continue;
      drawUFO(en.x, en.y);
    }
    for (var s = 0; s < splat.length; s++) game.draw.rect(snap(splat[s].x) - 8, snap(splat[s].y) - 8, 16, 16, C.d, splat[s].life / 0.6);
    // プレイヤー（カエル）
    drawFrog(playerX, playerY + PLAYER_H * 0.45, isJumping);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!enemies) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 36, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.58, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.66, 42, '#888888');
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
      if (timeLeft <= 0) { finish(false); return; }
      if (isJumping) { jumpVy += GRAVITY * dt; playerY += jumpVy * dt; if (playerY >= GROUND_Y - PLAYER_H) { playerY = GROUND_Y - PLAYER_H; isJumping = false; jumpVy = 0; } }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnEnemy(); spawnTimer = 0.9 + Math.random() * 0.6; }
      for (var i = enemies.length - 1; i >= 0; i--) { var en = enemies[i]; if (!en.alive) { enemies.splice(i, 1); continue; } en.x += ENEMY_SPEED * dt; if (en.x > W + ENEMY_W) enemies.splice(i, 1); }
      for (var s = splat.length - 1; s >= 0; s--) { var sp = splat[s]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 800 * dt; sp.life -= dt; if (sp.life <= 0) splat.splice(s, 1); }
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#330000');
    txt(isJumping ? 'TAP TO HIT!' : 'SWIPE UP!', W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
