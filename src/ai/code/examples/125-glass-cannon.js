// 125-glass-cannon.js
// ガラス砲 — 一発で割れる大砲で正確に敵を撃ち抜くハイリスクな一撃必殺感
// 操作: タップで照準位置を指定、もう一度タップで発射
// 成功: 1体撃破  失敗: 5回外して自壊 or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、硝子兵器） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GLASS CANNON';
  var HOW_TO_PLAY = 'TAP TO AIM · TAP AGAIN TO FIRE';
  var MAX_TIME = 12;             // 修正2: 30 → 12
  var NEEDED   = 1;              // 修正2: 5 → 1
  var GLASS_MAX = 5;             // 外し許容
  var TOP    = 220;
  var BOTTOM = H - 180;

  var CANNON_X = snap(W / 2);
  var CANNON_Y = snap(H * 0.78);
  var CANNON_R = 44;
  var ENEMY_R = 52;
  var BULLET_R = 20;
  var BULLET_SPEED = 900;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var enemies, bullet, aimX, aimY, phase, score, glassHP, timeLeft, done, flash, flashOk, shards;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) {
          game.draw.rect(cx + px, cy + py, step, step, color, alpha);
        }
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gy = TOP; gy < BOTTOM; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.15);
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawEnemy(e) {
    // エイリアン風：本体＋目＋触角
    drawPixelCircle(e.x, e.y, ENEMY_R, C.a, 0.9);
    game.draw.rect(e.x - 24, e.y - 8, 16, 16, C.g);   // 目
    game.draw.rect(e.x + 8,  e.y - 8, 16, 16, C.g);
    game.draw.rect(e.x - 20, e.y - 4, 8, 8, C.bg);    // 瞳
    game.draw.rect(e.x + 12, e.y - 4, 8, 8, C.bg);
    game.draw.rect(e.x - 8, e.y + 20, 16, 8, C.bg);   // 口
    game.draw.rect(e.x - 28, e.y - ENEMY_R - 8, 8, 16, C.c); // 触角
    game.draw.rect(e.x + 20, e.y - ENEMY_R - 8, 8, 16, C.c);
  }

  function drawCannon() {
    var alpha = glassHP / GLASS_MAX;
    // 台座
    game.draw.rect(CANNON_X - 48, CANNON_Y + 8, 96, 40, C.d);
    // 砲身（照準方向）
    var dx = aimX - CANNON_X, dy = aimY - CANNON_Y;
    var dl = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    for (var t = 0; t < 6; t++) {
      game.draw.rect(snap(CANNON_X + dx / dl * t * 12) - 8, snap(CANNON_Y + dy / dl * t * 12) - 8, 16, 16, C.g);
    }
    // ガラスドーム（残HPで透明度）
    drawPixelCircle(CANNON_X, CANNON_Y, CANNON_R, C.e, 0.4 + alpha * 0.5);
    drawPixelCircle(CANNON_X, CANNON_Y, CANNON_R - 16, C.b, alpha * 0.6);
    game.draw.rect(CANNON_X - 12, CANNON_Y - 20, 12, 12, C.g, 0.7); // ハイライト
  }

  // ── 初期化 ──
  function initGame() {
    score = 0;
    glassHP = GLASS_MAX;
    timeLeft = MAX_TIME;
    done = false;
    flash = 0;
    shards = [];
    bullet = null;
    phase = 'aim';
    aimX = snap(W / 2);
    aimY = snap(TOP + 120);
    spawnEnemies();
  }

  function spawnEnemies() {
    enemies = [];
    for (var i = 0; i < 3; i++) {
      enemies.push({
        x: snap(120 + Math.random() * (W - 240)),
        y: snap(TOP + 40 + Math.random() * (H * 0.35)),
        alive: true,
        vx: (Math.random() - 0.5) * 90
      });
    }
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + glassHP * 40 + Math.ceil(timeLeft) * 20) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done) return;
    if (phase === 'aim') {
      aimX = x; aimY = y;
      phase = 'fire';
      game.audio.play('se_tap', 0.4);
    } else if (phase === 'fire') {
      var dx = aimX - CANNON_X, dy = aimY - CANNON_Y;
      var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      bullet = { x: CANNON_X, y: CANNON_Y, vx: dx / dist * BULLET_SPEED, vy: dy / dist * BULLET_SPEED };
      game.audio.play('se_tap', 0.8);
      phase = 'moving';
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawEnemy({ x: W * 0.35, y: H * 0.4 });
      drawEnemy({ x: W * 0.65, y: H * 0.5 });
      aimX = CANNON_X + Math.cos(game.time.elapsed) * 200; aimY = TOP + 120;
      drawCannon();
      txt(GAME_TITLE,  W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DIRECT HIT!' : 'SHATTERED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }

      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive) continue;
        e.x += e.vx * dt;
        if (e.x - ENEMY_R < 60) { e.x = 60 + ENEMY_R; e.vx = Math.abs(e.vx); }
        if (e.x + ENEMY_R > W - 60) { e.x = W - 60 - ENEMY_R; e.vx = -Math.abs(e.vx); }
      }

      if (bullet && phase === 'moving') {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        var hit = false;
        for (var j = 0; j < enemies.length; j++) {
          var e2 = enemies[j];
          if (!e2.alive) continue;
          var bx = bullet.x - e2.x, by = bullet.y - e2.y;
          if (Math.sqrt(bx * bx + by * by) < BULLET_R + ENEMY_R) {
            e2.alive = false; hit = true; score++;
            flash = 0.4; flashOk = true;
            for (var pi = 0; pi < 12; pi++) {
              var ang = Math.random() * Math.PI * 2;
              shards.push({ x: e2.x, y: e2.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, color: C.a });
            }
            bullet = null; phase = 'aim';
            game.audio.play('se_success');
            if (score >= NEEDED) { finish(true); return; }
            break;
          }
        }
        if (!hit && bullet && (bullet.y < -50 || bullet.x < -50 || bullet.x > W + 50 || bullet.y > H + 50)) {
          bullet = null; glassHP--;
          flash = 0.4; flashOk = false;
          for (var p2 = 0; p2 < 8; p2++) {
            var a2 = Math.random() * Math.PI * 2;
            shards.push({ x: CANNON_X, y: CANNON_Y, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150, life: 0.4, color: C.e });
          }
          phase = 'aim';
          game.audio.play('se_failure', 0.5);
          if (glassHP <= 0) { finish(false); return; }
        }
      }
    }

    for (var si = 0; si < shards.length; si++) {
      shards[si].x += shards[si].vx * dt; shards[si].y += shards[si].vy * dt;
      shards[si].vy += 400 * dt; shards[si].life -= dt;
    }
    shards = shards.filter(function(s) { return s.life > 0; });
    if (flash > 0) flash -= dt;

    // ---- 描画 ----
    background();
    for (var ei = 0; ei < enemies.length; ei++) if (enemies[ei].alive) drawEnemy(enemies[ei]);

    if (phase === 'aim' || phase === 'fire') {
      var dx3 = aimX - CANNON_X, dy3 = aimY - CANNON_Y;
      var dl3 = Math.max(1, Math.sqrt(dx3 * dx3 + dy3 * dy3));
      game.draw.line(CANNON_X, CANNON_Y, CANNON_X + dx3 / dl3 * 900, CANNON_Y + dy3 / dl3 * 900, C.g, 2);
      drawPixelCircle(aimX, aimY, 24, phase === 'fire' ? C.c : C.g, 0.8);
      drawPixelCircle(aimX, aimY, 8, C.f, 1);
    }
    if (bullet) drawPixelCircle(bullet.x, bullet.y, BULLET_R, C.c, 1);
    for (var shi = 0; shi < shards.length; shi++) {
      var sh = shards[shi];
      game.draw.rect(snap(sh.x) - 4, snap(sh.y) - 4, 8, 8, sh.color, sh.life * 2);
    }
    drawCannon();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashOk ? C.b : C.a, flash * 0.2);

    // ガラスHP
    for (var gi = 0; gi < GLASS_MAX; gi++) {
      var gx = snap(W / 2 + (gi - (GLASS_MAX - 1) / 2) * 56);
      game.draw.rect(gx - 12, H - 96, 24, 24, gi < glassHP ? C.e : '#2a0a3a');
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt(phase === 'aim' ? 'TAP TO AIM' : (phase === 'fire' ? 'TAP TO FIRE!' : ''), W / 2, H - 150, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
