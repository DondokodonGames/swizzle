// 175-spiral-dodge.js
// スパイラル回避 — 迫ってくる弾を軌道上でくるりとかわす集中力ゲーム
// 操作: タップで自機を時計回り/反時計回りに切り替え
// 成功: 6秒生き延びる  失敗: 弾に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、弾幕） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPIRAL DODGE';
  var HOW_TO_PLAY = 'TAP TO REVERSE · DODGE THE BULLETS';
  var NEEDED   = 6;              // 修正2: 30 → 6（サバイバル短縮）
  var CX = snap(W / 2), CY = snap(H * 0.46), ORBIT_R = 200, PLAYER_R = 30, BULLET_R = 20;
  var PLAYER_SPEED = 2.4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pAngle, pDir, bullets, spawnTimer, bulletSpeed, survived, timeLeft, done, trail;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
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

  function playerPos() { return { x: CX + Math.cos(pAngle) * ORBIT_R, y: CY + Math.sin(pAngle) * ORBIT_R }; }

  function spawnBullet() {
    var ang = Math.random() * Math.PI * 2, dist = Math.hypot(W, H) / 2 + 50;
    var bx = CX + Math.cos(ang) * dist, by = CY + Math.sin(ang) * dist;
    var p = playerPos(), dx = p.x - bx, dy = p.y - by, len = Math.hypot(dx, dy);
    bullets.push({ x: bx, y: by, vx: (dx / len + (Math.random() - 0.5) * 0.25) * bulletSpeed, vy: (dy / len + (Math.random() - 0.5) * 0.25) * bulletSpeed });
  }

  function initGame() {
    pAngle = 0; pDir = 1; bullets = []; spawnTimer = 0.5; bulletSpeed = 200;
    survived = 0; timeLeft = NEEDED; done = false; trail = [];
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
    pDir *= -1; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      ring(CX, CY, ORBIT_R, C.d, 0.5);
      pAngle = game.time.elapsed * 2;
      var p0 = playerPos(); pc(p0.x, p0.y, PLAYER_R, C.b, 1);
      pc(W * 0.3, H * 0.3, BULLET_R, C.a, 0.9);
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
      txt(resultSuccess ? 'SURVIVED!' : 'HIT!', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var p = playerPos();
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      pAngle += PLAYER_SPEED * pDir * dt;
      p = playerPos();
      trail.push({ x: p.x, y: p.y, life: 0.5 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      spawnTimer -= dt;
      var prog = survived / NEEDED;
      if (spawnTimer <= 0) { spawnTimer = 1.4 * Math.max(0.6, 1 - prog * 0.4); spawnBullet(); }   // 修正2: 弾を控えめに
      bulletSpeed = 200 + prog * 100;
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi];
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (Math.hypot(b.x - p.x, b.y - p.y) < BULLET_R + PLAYER_R) { finish(false); return; }
        if (b.x < -100 || b.x > W + 100 || b.y < -100 || b.y > H + 100) bullets.splice(bi, 1);
      }
    }

    // ---- 描画 ----
    background();
    ring(CX, CY, ORBIT_R, C.d, 0.5);
    pc(CX, CY, 44, C.d, 0.9); pc(CX, CY, 20, C.b, 0.4);
    var aa = pAngle + pDir * Math.PI / 2;
    game.draw.rect(snap(CX + Math.cos(aa) * 44) - 6, snap(CY + Math.sin(aa) * 44) - 6, 12, 12, C.c);
    for (var ti2 = 0; ti2 < trail.length; ti2++) pc(trail[ti2].x, trail[ti2].y, PLAYER_R * trail[ti2].life, C.b, trail[ti2].life * 0.4);
    for (var bi2 = 0; bi2 < bullets.length; bi2++) pc(bullets[bi2].x, bullets[bi2].y, BULLET_R, C.a, 0.95);
    pc(p.x, p.y, PLAYER_R, C.b, 1); pc(p.x - 10, p.y - 10, 8, C.g, 0.7);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(pDir > 0 ? 'CW >>' : '<< CCW', W / 2, H - 120, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
