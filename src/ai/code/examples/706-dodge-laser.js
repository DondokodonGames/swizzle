// 706-dodge-laser.js
// ドッジレーザー — 水平に走るレーザーをジャンプでかわし続ける
// 操作: タップでジャンプ。飛んでくるレーザーの高さを見て避ける
// 成功: 15秒 生き延びる  失敗: 3回 被弾 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、レーザー廊下） ──
  var C = { bg:'#060210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CHAR = '#a855f7', CHAR_HI = '#ddd6fe';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DODGE LASER';
  var HOW_TO_PLAY = 'TAP TO JUMP · READ THE HEIGHT OF EACH LASER AND LEAP OVER IT';
  var MAX_TIME = 18;
  var NEEDED_TIME = 15;      // 修正2: 30 → 15
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var FLOOR_Y = snap(H * 0.82), CHAR_X = W * 0.22, CHAR_R = 38, GRAVITY = 1800, JUMP_V = -900, LASER_INTERVAL = 2.0, LASER_W = 14;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var charY, charVY, onGround, lasers, laserTimer, surviveTime, hits, iframes, timeLeft, done, elapsed, particles, flash, trail;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080118');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnLaser() { var heights = [FLOOR_Y - CHAR_R * 2, FLOOR_Y - CHAR_R * 3.5, FLOOR_Y - CHAR_R * 5.5], y = heights[Math.floor(Math.random() * heights.length)], speed = 560 + elapsed * 5; lasers.push({ y: y, x: W + 100, speed: speed, warningTimer: 0.6, active: false, flashTimer: 0 }); }

  function initGame() { charY = FLOOR_Y - CHAR_R; charVY = 0; onGround = true; lasers = []; laserTimer = 0; surviveTime = 0; hits = 0; iframes = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; trail = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(surviveTime * 300) + (MAX_HITS - hits) * 500) : Math.floor(surviveTime * 150);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#1e1b4b', 0.9); game.draw.line(0, FLOOR_Y, W, FLOOR_Y, '#ffffff18', 3);
    for (var li = 0; li < lasers.length; li++) { var la2 = lasers[li]; if (la2.warningTimer > 0) { var alpha = (Math.sin(elapsed * 12) * 0.5 + 0.5) * 0.3; game.draw.rect(W - 50, la2.y - LASER_W * 2, 50, LASER_W * 4, C.a, alpha); } }
    for (var li2 = 0; li2 < lasers.length; li2++) { var la3 = lasers[li2]; if (!la3.active) continue; var glow = la3.flashTimer > 0 ? la3.flashTimer * 0.3 : 0; game.draw.rect(la3.x, la3.y - LASER_W * 2, W, LASER_W * 4, C.a, 0.05 + glow); game.draw.rect(la3.x, la3.y - LASER_W / 2, W, LASER_W, C.a, 0.9); game.draw.rect(la3.x, la3.y - 2, W, 4, C.c, 0.8); }
    for (var tr2 = 0; tr2 < trail.length; tr2++) { var t = trail[tr2]; pc(t.x, t.y, CHAR_R * t.life * 1.4, CHAR, t.life * 0.3); }
    var charAlpha = iframes > 0 ? (Math.sin(elapsed * 25) * 0.5 + 0.5) : 0.9;
    pc(CHAR_X, charY, CHAR_R, CHAR, charAlpha); pc(CHAR_X - CHAR_R * 0.3, charY - CHAR_R * 0.3, CHAR_R * 0.25, CHAR_HI, charAlpha * 0.5);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround || charY > FLOOR_Y - CHAR_R * 4) {
      charVY = JUMP_V; onGround = false; game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 3; p++) particles.push({ x: CHAR_X, y: charY + CHAR_R, vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 80, life: 0.25, col: CHAR_HI });
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lasers) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVOR!' : 'VAPORIZED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(surviveTime >= NEEDED_TIME); return; }
      if (flash > 0) flash -= dt * 3; if (iframes > 0) iframes -= dt;
      charVY += GRAVITY * dt; charY += charVY * dt;
      if (charY >= FLOOR_Y - CHAR_R) { charY = FLOOR_Y - CHAR_R; charVY = 0; onGround = true; } else onGround = false;
      trail.push({ x: CHAR_X, y: charY, life: 0.2 });
      for (var tr = trail.length - 1; tr >= 0; tr--) { trail[tr].life -= dt * 5; if (trail[tr].life <= 0) trail.splice(tr, 1); }
      laserTimer += dt; var interval = Math.max(1.0, LASER_INTERVAL - elapsed * 0.02); if (laserTimer >= interval) { laserTimer = 0; spawnLaser(); }
      for (var i = lasers.length - 1; i >= 0; i--) {
        var la = lasers[i];
        if (la.warningTimer > 0) { la.warningTimer -= dt; continue; }
        la.active = true; la.x -= la.speed * dt; if (la.flashTimer > 0) la.flashTimer -= dt * 4;
        if (la.x < -200) { lasers.splice(i, 1); continue; }
        if (iframes <= 0 && la.x < CHAR_X + CHAR_R && la.x + LASER_W * 40 > CHAR_X - CHAR_R) {
          var charTop = charY - CHAR_R, charBot = charY + CHAR_R, laTop = la.y - LASER_W / 2, laBot = la.y + LASER_W / 2;
          if (charBot > laTop && charTop < laBot) {
            hits++; iframes = 1.0; flash = 0.5; la.flashTimer = 1.0; game.audio.play('se_failure', 0.5);
            for (var p2 = 0; p2 < 6; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: CHAR_X, y: charY, vx: Math.cos(pa2) * 200, vy: Math.sin(pa2) * 200, life: 0.4, col: C.a }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
        }
      }
      surviveTime += dt;
      if (surviveTime >= NEEDED_TIME) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    var progRatio = Math.min(1, surviveTime / NEEDED_TIME);
    game.draw.rect(40, snap(H * 0.90), W - 80, 24, '#1e1b4b', 0.7); game.draw.rect(40, snap(H * 0.90), (W - 80) * progRatio, 24, C.b, 0.85);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('SURVIVE ' + Math.floor(surviveTime) + ' / ' + NEEDED_TIME + 's', W / 2, 168, 44, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#080118');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
