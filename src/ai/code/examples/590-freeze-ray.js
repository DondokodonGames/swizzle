// 590-freeze-ray.js
// フリーズレイ — 動き回る敵をタップで凍らせ、凍っているうちにもう一度タップして処理する
// 操作: 敵をタップで凍結（一定時間で溶ける）→ 凍った敵を再タップで処理。画面外へ逃すと失点
// 成功: 敵 8体 処理  失敗: 3体 逃走 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、冷凍処理場） ──
  var C = { bg:'#020810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FREEZE RAY';
  var HOW_TO_PLAY = 'TAP TO FREEZE ENEMIES · TAP A FROZEN ONE AGAIN TO PROCESS IT';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ESCAPE = 3;        // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var enemies, beamX, beamY, beamTimer, handled, escaped, timeLeft, done, particles, flash, flashCol, nextEnemy;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnEnemy() {
    var edge = Math.floor(Math.random() * 4), sp = 120 + (MAX_TIME - timeLeft) * 8, x, y, vx, vy;
    if (edge === 0) { x = Math.random() * W; y = -60; vx = (Math.random() - 0.5) * sp; vy = sp * 0.6; }
    else if (edge === 1) { x = W + 60; y = 300 + Math.random() * (H - 400); vx = -sp * 0.6; vy = (Math.random() - 0.5) * sp; }
    else if (edge === 2) { x = Math.random() * W; y = H + 60; vx = (Math.random() - 0.5) * sp; vy = -sp * 0.6; }
    else { x = -60; y = 300 + Math.random() * (H - 400); vx = sp * 0.6; vy = (Math.random() - 0.5) * sp; }
    enemies.push({ x: x, y: y, vx: vx, vy: vy, r: 32, frozen: false, frozenTimer: 0, frozenMax: 2.5, wobble: Math.random() * Math.PI * 2 });
  }

  function initGame() { enemies = []; beamX = W / 2; beamY = H / 2; beamTimer = 0; handled = 0; escaped = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; nextEnemy = 1.0; spawnEnemy(); spawnEnemy(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (handled * 500 + Math.ceil(timeLeft) * 100) : handled * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (beamTimer > 0) { pc(beamX, beamY, 56, C.e, 0.15); pc(beamX, beamY, 28, C.e, 0.3); pc(beamX, beamY, 14, C.g, 0.6); }
    for (var ei = 0; ei < enemies.length; ei++) {
      var e = enemies[ei];
      if (e.frozen) { var ia = e.frozenTimer / e.frozenMax; pc(e.x, e.y, e.r + 16, C.e, ia * 0.4); pc(e.x, e.y, e.r + 6, C.d, ia * 0.8); pc(e.x, e.y, e.r, C.g, 0.7); }
      else { var wob = Math.sin(e.wobble); pc(e.x, e.y, e.r + 8 + wob * 6, C.a, 0.2); pc(e.x, e.y, e.r, C.a, 0.9); pc(e.x - 8, e.y - 8, e.r * 0.3, C.g, 0.5); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    beamX = tx; beamY = ty; beamTimer = 0.4; game.audio.play('se_tap', 0.3);
    // 凍った敵を処理
    for (var ei = enemies.length - 1; ei >= 0; ei--) { var e = enemies[ei]; if (!e.frozen) continue; if ((tx - e.x) * (tx - e.x) + (ty - e.y) * (ty - e.y) < (60 + e.r) * (60 + e.r)) { enemies.splice(ei, 1); handled++; flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.e }); } if (handled >= NEEDED) { finish(true); return; } return; } }
    // 動く敵を凍結
    for (var ei2 = 0; ei2 < enemies.length; ei2++) { var e2 = enemies[ei2]; if (e2.frozen) continue; if ((tx - e2.x) * (tx - e2.x) + (ty - e2.y) * (ty - e2.y) < (80 + e2.r) * (80 + e2.r)) { e2.frozen = true; e2.frozenMax = 2.5; e2.frozenTimer = 2.5; e2.vx = 0; e2.vy = 0; game.audio.play('se_success', 0.4); for (var pi2 = 0; pi2 < 6; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: e2.x, y: e2.y, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150, life: 0.5, col: C.g }); } } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!enemies) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL FROZEN!' : 'ESCAPEES', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (beamTimer > 0) beamTimer -= dt;
      nextEnemy -= dt; if (nextEnemy <= 0) { spawnEnemy(); nextEnemy = Math.max(0.5, 1.6 - (MAX_TIME - timeLeft) * 0.06); }
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        var e = enemies[ei]; e.wobble += dt * 3;
        if (e.frozen) { e.frozenTimer -= dt; if (e.frozenTimer <= 0) { e.frozen = false; var sp = 150 + (MAX_TIME - timeLeft) * 10, a = Math.random() * Math.PI * 2; e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; } }
        else { e.x += e.vx * dt; e.y += e.vy * dt; if (e.x < e.r) { e.x = e.r; e.vx = Math.abs(e.vx); } if (e.x > W - e.r) { e.x = W - e.r; e.vx = -Math.abs(e.vx); } if (e.y < 280 + e.r) { e.y = 280 + e.r; e.vy = Math.abs(e.vy); } if (e.y > H - e.r) { e.y = H - e.r; e.vy = -Math.abs(e.vy); } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(handled + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var esc = 0; esc < MAX_ESCAPE; esc++) game.draw.rect(snap(W / 2 + (esc - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, esc < escaped ? C.a : '#0a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
