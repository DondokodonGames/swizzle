// 371-tower-defense-solo.js
// タワーディフェンス1人 — 画面下の砲台をタップの方向に撃ち、迫る侵入者を全滅させる
// 操作: 撃ちたい方向をタップして弾を発射（1体につき2発）
// 成功: 6体 倒す  失敗: 3体 通過 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、要塞防衛） ──
  var C = { bg:'#020a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TURRET DEFENSE';
  var HOW_TO_PLAY = 'TAP TO AIM AND FIRE · WIPE OUT THE INVADERS';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_LEAK = 3;          // 修正2: 5 → 3
  var TX = snap(W / 2), TY = snap(H * 0.74);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var enemies, bullets, particles, spawnTimer, killed, leaked, timeLeft, done, cannonA;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() { game.draw.clear(C.bg); for (var gx = 0; gx < W; gx += 96) game.draw.rect(gx, 0, 2, H, C.d, 0.12); for (var gy = 0; gy < H; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.12); }

  function spawnEnemy() { var side = Math.floor(Math.random() * 3), x, y, spd = 90 + Math.random() * 50; if (side === 0) { x = snap(Math.random() * W); y = -50; } else if (side === 1) { x = -50; y = snap(Math.random() * H * 0.5); } else { x = W + 50; y = snap(Math.random() * H * 0.5); } enemies.push({ x: x, y: y, spd: spd, hp: 2, maxHp: 2, r: 30 }); }

  function initGame() { enemies = []; bullets = []; particles = []; spawnTimer = 0.4; killed = 0; leaked = 0; timeLeft = MAX_TIME; done = false; cannonA = -Math.PI / 2; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (killed * 300 + Math.ceil(timeLeft) * 100) : killed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTurret() {
    pc(TX, TY, 48, C.d, 0.9); pc(TX, TY, 32, C.b, 0.85);
    pline(TX, TY, TX + Math.cos(cannonA) * 70, TY + Math.sin(cannonA) * 70, C.g, 0.9, 20);
    pc(TX, TY, 18, C.g, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    cannonA = Math.atan2(y - TY, x - TX);
    bullets.push({ x: TX + Math.cos(cannonA) * 60, y: TY + Math.sin(cannonA) * 60, vx: Math.cos(cannonA) * 900, vy: Math.sin(cannonA) * 900, life: 1.2 });
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawTurret();
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFENDED!' : 'OVERRUN', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0 && enemies.length < 8) { spawnEnemy(); spawnTimer = 0.7 + Math.random() * 0.5; }
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        var e = enemies[ei], dx = TX - e.x, dy = TY - e.y, d = Math.max(1, Math.hypot(dx, dy));
        e.x += dx / d * e.spd * dt; e.y += dy / d * e.spd * dt;
        if (d < 54) { leaked++; game.audio.play('se_failure', 0.4); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.a }); } enemies.splice(ei, 1); if (leaked >= MAX_LEAK) { finish(false); return; } }
      }
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40) { bullets.splice(bi, 1); continue; }
        for (var ej = enemies.length - 1; ej >= 0; ej--) {
          if (Math.hypot(b.x - enemies[ej].x, b.y - enemies[ej].y) < enemies[ej].r) {
            enemies[ej].hp--; bullets.splice(bi, 1);
            for (var k2 = 0; k2 < 4; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: enemies[ej].x, y: enemies[ej].y, vx: Math.cos(a2) * 120, vy: Math.sin(a2) * 120, life: 0.3, col: C.f }); }
            if (enemies[ej].hp <= 0) { killed++; game.audio.play('se_success', 0.3); for (var k3 = 0; k3 < 8; k3++) { var a3 = Math.random() * Math.PI * 2; particles.push({ x: enemies[ej].x, y: enemies[ej].y, vx: Math.cos(a3) * 200, vy: Math.sin(a3) * 200, life: 0.5, col: C.c }); } enemies.splice(ej, 1); if (killed >= NEEDED) { finish(true); return; } }
            break;
          }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ei2 = 0; ei2 < enemies.length; ei2++) { var e2 = enemies[ei2]; pc(e2.x, e2.y, e2.r, C.a, 0.9); pc(e2.x - e2.r * 0.3, e2.y - e2.r * 0.3, e2.r * 0.25, C.f, 0.7); game.draw.rect(snap(e2.x - 24), snap(e2.y - e2.r - 14), 48, 6, '#331', 0.8); game.draw.rect(snap(e2.x - 24), snap(e2.y - e2.r - 14), 48 * (e2.hp / e2.maxHp), 6, C.b, 0.9); }
    drawTurret();
    for (var bi2 = 0; bi2 < bullets.length; bi2++) pc(bullets[bi2].x, bullets[bi2].y, 10, C.c, 0.95);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(killed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < MAX_LEAK; li++) game.draw.rect(snap(W / 2 + (li - (MAX_LEAK - 1) / 2) * 56) - 10, 224, 20, 20, li < leaked ? C.a : '#0a1a0c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
