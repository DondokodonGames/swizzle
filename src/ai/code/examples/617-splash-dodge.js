// 617-splash-dodge.js
// スプラッシュドッジ — 予告円が弾ける瞬間に飛び散る水しぶきを、移動して避ける
// 操作: タップした位置へ移動（上下左右スワイプでも緊急回避）。予告円の外へ逃げる
// 成功: 15秒 生き残る  失敗: 3回 被弾 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、水景） ──
  var C = { bg:'#000814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPLASH DODGE';
  var HOW_TO_PLAY = 'TAP TO MOVE OR SWIPE TO DASH · ESCAPE THE MARKED CIRCLES BEFORE THEY BURST';
  var MAX_TIME = 15;         // 修正2: 20 → 15
  var MAX_HITS = 3;
  var PLAYER_R = 38;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerX, playerY, targetX, targetY, splashes, warnings, ripples, hits, timeLeft, done, particles, flash, invincible, spawnTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnWarning() { var x = 100 + Math.random() * (W - 200), y = 200 + Math.random() * (H * 0.7), delay = 1.2 + Math.random() * 0.5; warnings.push({ x: x, y: y, delay: delay, timer: delay }); }

  function triggerSplash(x, y) {
    var count = 12 + Math.floor(Math.random() * 6);
    for (var i = 0; i < count; i++) { var ang = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.3, sp = 200 + Math.random() * 260; splashes.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 10 + Math.random() * 10, life: 0.6 + Math.random() * 0.3 }); }
    ripples.push({ x: x, y: y, r: 20, maxR: 120, life: 0.6, maxLife: 0.6 }); game.audio.play('se_tap', 0.2);
  }

  function initGame() { playerX = W / 2; playerY = H * 0.6; targetX = W / 2; targetY = H * 0.6; splashes = []; warnings = []; ripples = []; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; invincible = 0; spawnTimer = 0; spawnWarning(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (MAX_TIME * 200 + (MAX_HITS - hits) * 600) : Math.round((MAX_TIME - timeLeft) * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, snap(H * 0.9), W, H * 0.1, C.d, 0.15);
    for (var ri = 0; ri < ripples.length; ri++) { var rp = ripples[ri], al = rp.life / rp.maxLife; ring(rp.x, rp.y, rp.r, C.e, al * 0.3); }
    for (var wi = 0; wi < warnings.length; wi++) {
      var w = warnings[wi], urg = 1 - w.timer / w.delay, wc = urg > 0.7 ? C.a : C.e;
      ring(w.x, w.y, urg * 90, wc, 0.5 * urg + 0.2); pc(w.x, w.y, 8, wc, 0.8);
    }
    for (var si = 0; si < splashes.length; si++) { var s = splashes[si]; pc(s.x, s.y, s.r, C.e, s.life * 0.9); }
    var pa = (invincible > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    pc(playerX, playerY, PLAYER_R, C.f, pa); pc(playerX - 10, playerY - 10, PLAYER_R * 0.3, C.c, pa * 0.7);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') targetX -= 220; else if (dir === 'right') targetX += 220; else if (dir === 'up') targetY -= 220; else if (dir === 'down') targetY += 220;
    targetX = Math.max(PLAYER_R, Math.min(W - PLAYER_R, targetX)); targetY = Math.max(PLAYER_R, Math.min(H * 0.9, targetY)); game.audio.play('se_tap', 0.15);
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = Math.max(PLAYER_R, Math.min(W - PLAYER_R, tx)); targetY = Math.max(PLAYER_R, Math.min(H * 0.9, ty)); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!splashes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STAYED DRY!' : 'SOAKED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4; if (invincible > 0) invincible -= dt;
      playerX += (targetX - playerX) * Math.min(1, dt * 8); playerY += (targetY - playerY) * Math.min(1, dt * 8);
      spawnTimer += dt; var rate = Math.max(0.8, 2.2 - (MAX_TIME - timeLeft) * 0.08);
      if (spawnTimer > rate) { spawnTimer = 0; spawnWarning(); if (timeLeft < MAX_TIME - 6) spawnWarning(); }
      for (var wi = warnings.length - 1; wi >= 0; wi--) { warnings[wi].timer -= dt; if (warnings[wi].timer <= 0) { triggerSplash(warnings[wi].x, warnings[wi].y); warnings.splice(wi, 1); } }
      for (var ri = ripples.length - 1; ri >= 0; ri--) { var rp = ripples[ri]; rp.r += (rp.maxR - rp.r) * dt * 4; rp.life -= dt; if (rp.life <= 0) ripples.splice(ri, 1); }
      for (var si = splashes.length - 1; si >= 0; si--) {
        var s = splashes[si]; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 600 * dt; s.life -= dt * 1.5;
        if (invincible <= 0) { var dx = s.x - playerX, dy = s.y - playerY; if (dx * dx + dy * dy < (PLAYER_R + s.r) * (PLAYER_R + s.r)) {
          hits++; invincible = 0.8; flash = 0.4; game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: playerY, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.f }); }
          splashes.splice(si, 1); if (hits >= MAX_HITS) { finish(false); return; } continue;
        } }
        if (s.life <= 0 || s.y > H + 50) splashes.splice(si, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 168, 20, 20, hi < hits ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
