// 780-shockwave.js
// ショックウェーブ — タップで衝撃波を発生させ、中心へ迫る敵を撃破せよ
// 操作: タップで衝撃波（拡大する輪）を発生させる（敵に当てろ）
// 成功: 15体 撃破  失敗: 3体 侵入 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、レーダー） ──
  var C = { bg:'#03050a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WAVE = '#00cfff', WAVE_GLOW = '#0a5a8a', ENEMY = '#ff2079', ENEMY_HI = '#ff9ec4', HIT = '#ff6600', GRID = '#0a3a5a';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHOCKWAVE';
  var HOW_TO_PLAY = 'TAP TO EMIT A SHOCKWAVE RING · BLAST THE ENEMIES BEFORE THEY REACH THE CORE';
  var MAX_TIME = 24;
  var NEEDED     = 15;       // 修正2: 60 → 15
  var MAX_ESCAPE = 3;        // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var waves, enemies, spawnTimer, score, escaped, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#060810');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gi = 1; gi <= 5; gi++) ring(W / 2, H / 2, gi * W / 2 / 5, GRID, 0.35);
    game.draw.line(W / 2, H * 0.05, W / 2, H * 0.95, GRID, 2); game.draw.line(W * 0.05, H / 2, W * 0.95, H / 2, GRID, 2);
    ring(W / 2, H / 2, 60, WAVE, 0.3); pc(W / 2, H / 2, 12, WAVE, 0.5);
  }

  function spawnEnemy() {
    var side = Math.floor(Math.random() * 4), x, y, vx, vy, spd = 90 + Math.random() * 60 + score * 3;
    if (side === 0) { x = Math.random() * W; y = -40; }
    else if (side === 1) { x = W + 40; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = H + 40; }
    else { x = -40; y = Math.random() * H; }
    var ang = Math.atan2(H / 2 - y, W / 2 - x); vx = Math.cos(ang) * spd; vy = Math.sin(ang) * spd;
    enemies.push({ x: x, y: y, r: 30 + Math.random() * 18, vx: vx, vy: vy, hp: 1, flash: 0 });
  }

  function initGame() { waves = []; enemies = []; spawnTimer = 0; score = 0; escaped = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnEnemy(); spawnEnemy(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 350 + Math.ceil(timeLeft) * 120) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var wi2 = 0; wi2 < waves.length; wi2++) { var w2 = waves[wi2]; ring(w2.x, w2.y, w2.r, WAVE, w2.life * 0.7); if (w2.r > 20) ring(w2.x, w2.y, w2.r - 20, WAVE_GLOW, w2.life * 0.35); }
    for (var ei3 = 0; ei3 < enemies.length; ei3++) { var e3 = enemies[ei3]; pc(e3.x, e3.y, e3.r, e3.flash > 0 ? ENEMY_HI : ENEMY, 0.9); pc(e3.x - e3.r * 0.3, e3.y - e3.r * 0.3, e3.r * 0.2, C.g, 0.3); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    waves.push({ x: tx, y: ty, r: 0, maxR: 300, life: 1.0 }); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!enemies) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.88, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CORE DEFENDED!' : 'BREACHED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.5, 1.0 - score * 0.02);
      if (spawnTimer <= 0) { spawnTimer = spawnRate; spawnEnemy(); if (score > 8 && Math.random() < 0.4) spawnEnemy(); }
      var WAVE_SPEED = 480;
      for (var wi = waves.length - 1; wi >= 0; wi--) {
        var w = waves[wi]; w.r += WAVE_SPEED * dt; w.life = 1 - w.r / w.maxR;
        if (w.life <= 0 || w.r >= w.maxR) { waves.splice(wi, 1); continue; }
        for (var ei = enemies.length - 1; ei >= 0; ei--) {
          var e = enemies[ei]; if (e.hp <= 0) continue; var dx = e.x - w.x, dy = e.y - w.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(dist - w.r) < e.r + 12) {
            e.hp--; e.flash = 0.3;
            if (e.hp <= 0) {
              score++; for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: e.x, y: e.y, vx: Math.cos(pa) * (100 + Math.random() * 160), vy: Math.sin(pa) * (100 + Math.random() * 160), life: 0.38, col: HIT }); }
              enemies.splice(ei, 1); if (score >= NEEDED) { finish(true); return; }
            }
          }
        }
      }
      for (var ei2 = enemies.length - 1; ei2 >= 0; ei2--) {
        var e2 = enemies[ei2]; e2.x += e2.vx * dt; e2.y += e2.vy * dt; if (e2.flash > 0) e2.flash -= dt * 4;
        var distToCenter = Math.sqrt((e2.x - W / 2) * (e2.x - W / 2) + (e2.y - H / 2) * (e2.y - H / 2));
        if (distToCenter < 60 || e2.x < -60 || e2.x > W + 60 || e2.y < -60 || e2.y > H + 60) {
          if (distToCenter < 60) { escaped++; flash = 0.3; flashCol = C.a; resultText = 'BREACH!'; resultTimer = 0.4; game.audio.play('se_failure', 0.35); if (escaped >= MAX_ESCAPE) { finish(false); return; } }
          enemies.splice(ei2, 1);
        }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.6; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2.6); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.30), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var esi = 0; esi < MAX_ESCAPE; esi++) game.draw.rect(snap(W / 2 + (esi - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, esi < escaped ? C.a : '#060810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
