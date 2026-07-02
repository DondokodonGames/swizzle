// 414-meteor-dodge.js
// 隕石回避 — タップした方向へ宇宙船を動かし、降り注ぐ隕石の雨をかわして生き延びる
// 操作: タップした位置へ移動／スワイプでその方向へダッシュ
// 成功: 10秒 生き延びる  失敗: 隕石に衝突

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宇宙） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var METEOR = ['#8a7060', '#6a5040', '#7a6555', '#5a4535'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR DODGE';
  var HOW_TO_PLAY = 'TAP OR SWIPE TO STEER THE SHIP · AVOID THE METEORS';
  var GOAL = 10;             // 修正2: 40秒 → 10秒
  var SHIP_SPEED = 700;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shipX, shipY, svx, svy, meteors, stars, spawnTimer, survived, done, particles, trail, engine;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < stars.length; si++) { var s = stars[si]; game.draw.rect(s.x, snap(s.y), s.r, s.r, C.g, 0.5); }
  }

  function initStars() { stars = []; for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: Math.random() * H, r: Math.random() < 0.5 ? 4 : 8, speed: 40 + Math.random() * 80 }); }

  function initGame() { shipX = W / 2; shipY = H * 0.72; svx = 0; svy = 0; meteors = []; spawnTimer = 0.5; survived = 0; done = false; particles = []; trail = []; engine = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 500 + 2000) : Math.round(survived * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawShip() {
    for (var ti = 0; ti < trail.length; ti++) if (trail[ti].life > 0) pc(trail[ti].x, trail[ti].y, 14 * trail[ti].life, C.f, trail[ti].life * 0.6);
    pc(shipX, shipY - 12, 22, C.e, 0.9); pc(shipX - 16, shipY + 10, 16, C.e, 0.85); pc(shipX + 16, shipY + 10, 16, C.e, 0.85); pc(shipX, shipY - 22, 12, C.g, 0.8);
    pc(shipX, shipY + 24, 10 + Math.sin(engine) * 6, C.f, 0.85);
  }

  function drawMeteor(m) { pc(m.x, m.y, m.r, m.col, 0.95); pc(m.x + Math.cos(m.rot) * m.r * 0.4, m.y + Math.sin(m.rot) * m.r * 0.4, m.r * 0.25, '#443', 0.4); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; var dx = x - shipX, dy = y - shipY, len = Math.max(1, Math.hypot(dx, dy)); svx = dx / len * SHIP_SPEED; svy = dy / len * SHIP_SPEED;
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return; var sp = SHIP_SPEED * 1.2;
    if (d === 'left') svx = -sp; else if (d === 'right') svx = sp; else if (d === 'up') svy = -sp; else if (d === 'down') svy = sp;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    engine += dt * 15;
    for (var si = 0; si < (stars ? stars.length : 0); si++) { stars[si].y += stars[si].speed * dt; if (stars[si].y > H) stars[si].y = -4; }
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); drawShip();
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'BOOM!', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      shipX += svx * dt; shipY += svy * dt; svx *= (1 - 3 * dt); svy *= (1 - 3 * dt);
      shipX = Math.max(50, Math.min(W - 50, shipX)); shipY = Math.max(50, Math.min(H - 100, shipY));
      trail.push({ x: shipX, y: shipY + 20, life: 0.6 }); if (trail.length > 12) trail.shift(); for (var ti = trail.length - 1; ti >= 0; ti--) trail[ti].life -= dt * 2;
      spawnTimer -= dt; if (spawnTimer <= 0) { var mx = Math.random() * W, aim = Math.random() < 0.4, ang = aim ? Math.atan2(shipY + 80, shipX - mx) : Math.PI / 2 + (Math.random() - 0.5) * 0.8, sp = 260 + Math.random() * 260 + survived * 10; meteors.push({ x: mx, y: -80, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 22 + Math.random() * 40, col: METEOR[Math.floor(Math.random() * 4)], rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 4 }); spawnTimer = Math.max(0.25, 0.55 - survived * 0.02); }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.rotSpeed * dt;
        if (Math.hypot(m.x - shipX, m.y - shipY) < m.r + 28) { for (var k = 0; k < 20; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: shipX, y: shipY, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.8, col: Math.random() < 0.5 ? C.e : C.f }); } finish(false); return; }
        if (m.y > H + 100 || m.x < -200 || m.x > W + 200) meteors.splice(mi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var mi2 = 0; mi2 < meteors.length; mi2++) drawMeteor(meteors[mi2]);
    drawShip();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    survBar();
    txt(survived.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(survived.toFixed(1) + ' / ' + GOAL + 's', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
