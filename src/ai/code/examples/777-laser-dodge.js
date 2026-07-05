// 777-laser-dodge.js
// レーザードッジ — 回転するレーザーが来る瞬間にジャンプして跳び越えろ
// 操作: タップでジャンプ（レーザーが足元を通過する前に）
// 成功: 12回 回避  失敗: 3回 被弾 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#040108', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LASER = '#ff2079', LASER_HI = '#ff9ec4', LASER_GLOW = '#5a0c28', PLAYER = '#00cfff', PLAYER_HI = '#c0f0ff', GROUND = '#1e2b45', GROUND_HI = '#3a4a6a';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER DODGE';
  var HOW_TO_PLAY = 'TAP TO JUMP OVER THE SWEEPING LASER AS IT PASSES YOUR FEET';
  var MAX_TIME = 24;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_HITS = 3;          // 修正2: 6 → 3
  var GROUND_Y = snap(H * 0.72), PLAYER_X = snap(W * 0.3), PLAYER_R = 38, GRAVITY = 1800, JUMP_V = -900;
  var LASER_CX = snap(W * 0.6), LASER_CY = GROUND_Y, LASER_LEN = W;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerY, playerVy, onGround, laserAngle, laserSpeed, score, hits, done, timeLeft, elapsed, trail, particles, flash, flashCol, resultText, resultTimer, hitCooldown, lastCross, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 12; for (var i = 0; i < size; i += st) { var w = size - i; game.draw.rect(cx - w / 2, cy - i + size / 2 - st, w, st, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.a : '#060110');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var sti = 0; sti < stars.length; sti++) game.draw.rect(snap(stars[sti].x), snap(stars[sti].y), 6, 6, C.g, 0.25 + 0.15 * Math.sin(elapsed * 2 + sti));
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, GROUND, 1.0); game.draw.rect(0, GROUND_Y, W, 10, GROUND_HI, 0.5);
  }

  function initGame() {
    playerY = GROUND_Y; playerVy = 0; onGround = true; laserAngle = Math.PI; laserSpeed = 1.2; score = 0; hits = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; trail = []; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; hitCooldown = 0; lastCross = false;
    stars = []; for (var si = 0; si < 30; si++) stars.push({ x: Math.random() * W, y: Math.random() * GROUND_Y * 0.9 });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 130) : score * 130;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var lx2 = LASER_CX + Math.cos(laserAngle) * LASER_LEN, ly2 = LASER_CY + Math.sin(laserAngle) * LASER_LEN;
    game.draw.line(LASER_CX, LASER_CY, lx2, ly2, LASER_GLOW, 28); game.draw.line(LASER_CX, LASER_CY, lx2, ly2, LASER_HI, 6); game.draw.line(LASER_CX, LASER_CY, lx2, ly2, C.g, 2);
    pc(LASER_CX, LASER_CY, 18, LASER, 0.9); pc(LASER_CX, LASER_CY, 10, C.g, 0.7);
    for (var tri = 0; tri < trail.length; tri++) { var tr2 = trail[tri]; pc(tr2.x, tr2.y, PLAYER_R * 0.5 * tr2.life, PLAYER, tr2.life * 0.3); }
    var shake = (hitCooldown > 0.7) ? Math.sin(elapsed * 35) * 8 : 0;
    pc(PLAYER_X + shake, playerY, PLAYER_R, PLAYER, 0.92); pc(PLAYER_X + shake - 10, playerY - 12, 12, PLAYER_HI, 0.45);
    if (!onGround) arrow(PLAYER_X + shake, playerY - PLAYER_R - 30, 32, 'up', PLAYER_HI);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onGround) {
      playerVy = JUMP_V; onGround = false; game.audio.play('se_tap', 0.09);
      for (var p = 0; p < 3; p++) { var pa = -Math.PI * 0.6 + Math.random() * Math.PI * 0.2; particles.push({ x: PLAYER_X, y: GROUND_Y, vx: Math.cos(pa) * 80, vy: Math.sin(pa) * 80 - 60, life: 0.28, col: PLAYER_HI }); }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (playerY === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.85, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'UNTOUCHABLE!' : 'VAPORIZED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      if (!onGround) { playerVy += GRAVITY * dt; playerY += playerVy * dt; if (playerY >= GROUND_Y) { playerY = GROUND_Y; playerVy = 0; onGround = true; } }
      trail.push({ x: PLAYER_X, y: playerY, life: 0.3 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 4; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      laserSpeed = Math.min(3.2, 1.2 + score * 0.06); laserAngle += laserSpeed * dt; if (laserAngle > Math.PI * 2) laserAngle -= Math.PI * 2;
      var laserAtPlayerX = false;
      if (Math.abs(Math.cos(laserAngle)) > 0.01) { var t = (PLAYER_X - LASER_CX) / (Math.cos(laserAngle) * LASER_LEN); if (t >= 0 && t <= 1) { var laserYAtPlayer = LASER_CY + Math.sin(laserAngle) * LASER_LEN * t; if (Math.abs(laserYAtPlayer - GROUND_Y) < 20) laserAtPlayerX = true; } }
      if (hitCooldown > 0) hitCooldown -= dt;
      if (laserAtPlayerX && hitCooldown <= 0) {
        var playerAboveGround = playerY < GROUND_Y - PLAYER_R * 1.5;
        if (!playerAboveGround) {
          hits++; hitCooldown = 1.0; flash = 0.45; flashCol = C.a; resultText = 'HIT!'; resultTimer = 0.5; game.audio.play('se_failure', 0.4);
          for (var pe = 0; pe < 6; pe++) { var pea = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(pea) * 200, vy: Math.sin(pea) * 200, life: 0.4, col: LASER }); }
          if (hits >= MAX_HITS) { finish(false); return; }
        } else if (!lastCross) {
          score++; flash = 0.15; flashCol = C.b; resultText = 'DODGE!'; resultTimer = 0.28; game.audio.play('se_tap', 0.07);
          if (score >= NEEDED) { finish(true); return; }
        }
      }
      lastCross = laserAtPlayerX;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 500 * dt; p2.life -= dt * 2.8; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.20), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#060110');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
