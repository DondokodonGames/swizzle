// 511-arrow-dodge.js
// アロードッジ — 四方から飛んでくる矢を、スワイプ/タップで移動してかわし続ける
// 操作: スワイプで素早く移動、またはタップした位置へ瞬間移動して回避
// 成功: 10秒 生き延びる  失敗: 3回 被弾 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、矢の弾幕） ──
  var C = { bg:'#0a0300', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ARROW DODGE';
  var HOW_TO_PLAY = 'SWIPE OR TAP TO MOVE · DODGE THE INCOMING ARROWS';
  var MAX_TIME = 15;
  var GOAL     = 10;         // 修正2: 20秒 → 10秒
  var MAX_HITS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, arrows, particles, survived, hits, timeLeft, done, nextArrow, invincible, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0800');
  }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#1a0800');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnArrow() {
    var side = Math.floor(Math.random() * 4), x, y, vx, vy, sp = 560 + survived * 30;
    if (side === 0) { x = Math.random() * W; y = 300; vx = (player.x - x) * 0.3; vy = sp; }
    else if (side === 1) { x = W + 50; y = 300 + Math.random() * (H - 500); vx = -sp; vy = (player.y - y) * 0.3; }
    else if (side === 2) { x = Math.random() * W; y = H + 50; vx = (player.x - x) * 0.3; vy = -sp; }
    else { x = -50; y = 300 + Math.random() * (H - 500); vx = sp; vy = (player.y - y) * 0.3; }
    var spd = Math.max(1, Math.hypot(vx, vy)); vx = vx / spd * sp; vy = vy / spd * sp;
    arrows.push({ x: x, y: y, vx: vx, vy: vy, r: 18 });
  }

  function initGame() { player = { x: W / 2, y: H / 2, r: 40 }; arrows = []; particles = []; survived = 0; hits = 0; timeLeft = MAX_TIME; done = false; nextArrow = 1.0; invincible = 0; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(survived) * 400 + (MAX_HITS - hits) * 500 + Math.ceil(timeLeft) * 100) : Math.ceil(survived) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ai = 0; ai < arrows.length; ai++) { var a = arrows[ai], sp = Math.max(1, Math.hypot(a.vx, a.vy)), nx = a.vx / sp, ny = a.vy / sp; pline(a.x - nx * 60, a.y - ny * 60, a.x, a.y, C.a, 0.9, 8); pc(a.x, a.y, 14, C.c, 0.9); }
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 12) % 2) : 1;
    if (blink) { pc(player.x, player.y, player.r, C.e, 0.9); pc(player.x - 12, player.y - 12, 10, C.g, 0.4); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    player.x = Math.max(player.r + 40, Math.min(W - player.r - 40, tx)); player.y = Math.max(340, Math.min(H - 120, ty)); game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var step = W * 0.22;
    if (dir === 'left') player.x = Math.max(player.r + 40, player.x - step); else if (dir === 'right') player.x = Math.min(W - player.r - 40, player.x + step);
    else if (dir === 'up') player.y = Math.max(340, player.y - step); else player.y = Math.min(H - 120, player.y + step);
    game.audio.play('se_tap', 0.25);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.68, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DODGED IT ALL!' : 'PIERCED', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      nextArrow -= dt; if (nextArrow <= 0) { spawnArrow(); if (survived > 4 && Math.random() < 0.4) spawnArrow(); nextArrow = Math.max(0.4, 1.0 - survived * 0.04); }
      for (var ai = arrows.length - 1; ai >= 0; ai--) {
        var a = arrows[ai]; a.x += a.vx * dt; a.y += a.vy * dt;
        if (invincible <= 0 && Math.hypot(a.x - player.x, a.y - player.y) < player.r + a.r) {
          hits++; flash = 0.7; invincible = 1.5; game.audio.play('se_failure', 0.6);
          for (var pi = 0; pi < 10; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5, col: C.a }); }
          arrows.splice(ai, 1); if (hits >= MAX_HITS) { finish(false); return; } continue;
        }
        if (a.x < -100 || a.x > W + 100 || a.y < 200 || a.y > H + 100) arrows.splice(ai, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    survBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + GOAL + 's', W / 2, 168, 44, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#1a0800');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
