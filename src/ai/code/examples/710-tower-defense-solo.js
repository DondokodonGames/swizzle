// 710-tower-defense-solo.js
// タワーディフェンス — 右から迫る敵をタップで撃破して塔を守る
// 操作: 敵をタップして撃破。タップでタレットも同時に発射。塔まで通すとダメージ
// 成功: 12体 撃破  失敗: 3体 通す or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、敵色は保持） ──
  var C = { bg:'#030810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TOWER = '#1e3a5f', TOWER_HI = '#00cfff', BULLET = '#ffe600';
  var ENEMY_TYPES = [
    { r: 36, speed: 180, hp: 1, pts: 1, col: '#ff2079' },
    { r: 50, speed: 110, hp: 2, pts: 2, col: '#ff6600' },
    { r: 60, speed: 80,  hp: 3, pts: 3, col: '#a855f7' }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER DEFENSE';
  var HOW_TO_PLAY = 'TAP THE ADVANCING ENEMIES TO DESTROY THEM · DO NOT LET THEM REACH THE TOWER';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_LEAK = 3;          // 修正2: 8 → 3
  var TOWER_X = 120, GROUND_Y = snap(H * 0.76), TOWER_W = 100, TOWER_H = 280, SPAWN_RATE = 1.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var enemies, bullets, spawnTimer, killed, leaked, timeLeft, done, elapsed, particles, flash, flashCol, autoShootTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#05080f');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnEnemy() {
    var typeIdx = Math.min(2, Math.floor(elapsed / 8)); if (Math.random() < 0.3) typeIdx = Math.max(0, typeIdx - 1);
    var t = ENEMY_TYPES[typeIdx];
    enemies.push({ x: W + t.r, y: GROUND_Y - t.r, r: t.r, speed: t.speed + elapsed * 2, hp: t.hp, maxHp: t.hp, pts: t.pts, col: t.col, hitFlash: 0 });
  }

  function shootBullet(targetX, targetY) {
    var dx = targetX - TOWER_X, dy = targetY - (GROUND_Y - TOWER_H / 2), dist = Math.sqrt(dx * dx + dy * dy), speed = 900;
    bullets.push({ x: TOWER_X + TOWER_W / 2, y: GROUND_Y - TOWER_H / 2, vx: dx / dist * speed, vy: dy / dist * speed, life: 1.0 });
  }

  function initGame() { enemies = []; bullets = []; spawnTimer = 0; killed = 0; leaked = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; autoShootTimer = 0; spawnEnemy(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (killed * 400 + Math.ceil(timeLeft) * 100) : killed * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#0f172a', 0.9); game.draw.line(0, GROUND_Y, W, GROUND_Y, '#ffffff14', 2);
    game.draw.rect(TOWER_X - TOWER_W / 2, GROUND_Y - TOWER_H, TOWER_W, TOWER_H, TOWER, 0.9);
    for (var bi2 = 0; bi2 < 3; bi2++) game.draw.rect(TOWER_X - TOWER_W / 2 + bi2 * 38, GROUND_Y - TOWER_H - 36, 28, 36, TOWER, 0.9);
    game.draw.rect(TOWER_X - TOWER_W / 2, GROUND_Y - TOWER_H, TOWER_W, 12, TOWER_HI, 0.5);
    game.draw.rect(TOWER_X, GROUND_Y - TOWER_H / 2 - 8, 40, 16, TOWER_HI, 0.9);
    for (var bi3 = 0; bi3 < bullets.length; bi3++) { var bu = bullets[bi3]; pc(bu.x, bu.y, 10 * bu.life, BULLET, bu.life * 0.9); }
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      var en2 = enemies[ei2];
      pc(en2.x, en2.y, en2.r, en2.hitFlash > 0 ? C.g : en2.col, 0.85 + en2.hitFlash * 0.15);
      if (en2.maxHp > 1) { var hpRatio = en2.hp / en2.maxHp; game.draw.rect(en2.x - en2.r, en2.y + en2.r + 5, en2.r * 2, 10, '#333', 0.8); game.draw.rect(en2.x - en2.r, en2.y + en2.r + 5, en2.r * 2 * hpRatio, 10, C.b, 0.85); }
    }
  }

  function killEnemy(idx, e) {
    killed += e.pts;
    for (var p2 = 0; p2 < 5; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: e.x, y: e.y, vx: Math.cos(pa2) * 220, vy: Math.sin(pa2) * 220, life: 0.45, col: e.col }); }
    game.audio.play('se_success', 0.35); enemies.splice(idx, 1);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = false;
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i], dx = tx - e.x, dy = ty - e.y;
      if (dx * dx + dy * dy < (e.r + 20) * (e.r + 20)) {
        e.hp--; e.hitFlash = 0.25; game.audio.play('se_tap', 0.12);
        for (var p = 0; p < 3; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: e.x, y: e.y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.3, col: e.col }); }
        if (e.hp <= 0) { killEnemy(i, e); if (killed >= NEEDED) { finish(true); return; } }
        hit = true; shootBullet(tx, ty); break;
      }
    }
    if (!hit) shootBullet(tx, ty);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!enemies) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOWER HELD!' : 'OVERRUN', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(killed >= NEEDED); return; }
      if (flash > 0) flash -= dt * 3;
      spawnTimer += dt; var rate = Math.max(0.5, SPAWN_RATE - elapsed * 0.01); if (spawnTimer >= rate) { spawnTimer = 0; spawnEnemy(); }
      autoShootTimer -= dt;
      if (autoShootTimer <= 0) { autoShootTimer = 0.8; if (enemies.length > 0) { var closest = enemies[0]; for (var ec = 1; ec < enemies.length; ec++) if (enemies[ec].x < closest.x) closest = enemies[ec]; shootBullet(closest.x, closest.y); game.audio.play('se_tap', 0.04); } }
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt * 2;
        if (b.life <= 0 || b.x > W + 50 || b.x < -50) { bullets.splice(bi, 1); continue; }
        for (var ei = enemies.length - 1; ei >= 0; ei--) {
          var e2 = enemies[ei], bdx = b.x - e2.x, bdy = b.y - e2.y;
          if (bdx * bdx + bdy * bdy < e2.r * e2.r) {
            e2.hp--; e2.hitFlash = 0.2; bullets.splice(bi, 1);
            if (e2.hp <= 0) { killEnemy(ei, e2); if (killed >= NEEDED) { finish(true); return; } }
            break;
          }
        }
      }
      for (var i2 = enemies.length - 1; i2 >= 0; i2--) {
        var en = enemies[i2]; en.x -= en.speed * dt; if (en.hitFlash > 0) en.hitFlash -= dt * 4;
        if (en.x < TOWER_X + TOWER_W / 2 + en.r) {
          leaked++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.4); enemies.splice(i2, 1);
          if (leaked >= MAX_LEAK) { finish(false); return; }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2.5; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(killed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < MAX_LEAK; li++) game.draw.rect(snap(W / 2 + (li - (MAX_LEAK - 1) / 2) * 56) - 10, 224, 20, 20, li < leaked ? C.a : '#05080f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
