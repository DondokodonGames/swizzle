// 489-dodge-thunder.js
// 雷避け — 空から落ちる雷を、左右スワイプ（またはタップ位置移動）で避け続ける
// 操作: 左右スワイプ or タップした位置へ移動。落雷の予兆線を見て逃げる
// 成功: 10秒 生き延びる  失敗: 3回 被雷 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、嵐の夜） ──
  var C = { bg:'#050008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DODGE THUNDER';
  var HOW_TO_PLAY = 'SWIPE OR TAP TO MOVE · DODGE THE LIGHTNING';
  var MAX_TIME = 15;
  var GOAL     = 10;         // 修正2: 30秒 → 10秒
  var MAX_HITS = 3;
  var PLAYER_Y = snap(H * 0.80);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, bolts, particles, hits, survived, timeLeft, done, nextBolt, flash, invincible, clouds;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0018');
  }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#0a0018');
  }

  function background() { game.draw.clear(C.bg); for (var ci = 0; ci < clouds.length; ci++) { var cl = clouds[ci]; pc(cl.x, cl.y, cl.r, '#1a1830', 0.9); pc(cl.x - cl.r * 0.4, cl.y - cl.r * 0.2, cl.r * 0.6, '#2d2a50', 0.7); } }

  function makeSegs(x, fromY, toY) { var segs = [], px = x, py = fromY, steps = 8; for (var i = 1; i <= steps; i++) { var ny = fromY + (toY - fromY) * (i / steps), nx = x + (Math.random() - 0.5) * 70 * (1 - i / steps); segs.push({ x1: px, y1: py, x2: nx, y2: ny }); px = nx; py = ny; } return segs; }

  function spawnBolt() { var x = 120 + Math.random() * (W - 240); bolts.push({ x: x, warnY: 300 + Math.random() * 200, warnTimer: 0.6 + Math.random() * 0.3, striking: false, strikeTimer: 0, segments: [] }); }

  function initGame() { player = { x: W / 2, targetX: W / 2, r: 36 }; bolts = []; particles = []; hits = 0; survived = 0; timeLeft = MAX_TIME; done = false; nextBolt = 1.0; flash = 0; invincible = 0; clouds = []; for (var ci = 0; ci < 5; ci++) clouds.push({ x: snap(Math.random() * W), y: 200 + Math.random() * 120, r: 80 + Math.random() * 50, vx: (Math.random() - 0.5) * 30 }); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(survived) * 400 + (MAX_HITS - hits) * 500 + Math.ceil(timeLeft) * 100) : Math.ceil(survived) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPlayer() { var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 12) % 2) : 1; if (blink) { pc(player.x, PLAYER_Y, player.r, C.e, 0.9); pc(player.x - player.r * 0.25, PLAYER_Y - player.r * 0.25, player.r * 0.3, C.g, 0.4); } }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    player.targetX = Math.max(player.r + 40, Math.min(W - player.r - 40, tx)); game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') player.targetX = Math.max(player.r + 40, player.targetX - W * 0.28);
    else if (dir === 'right') player.targetX = Math.min(W - player.r - 40, player.targetX + W * 0.28);
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!clouds) initGame(); background(); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.40, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.46, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.58, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'STRUCK DOWN', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      player.x += (player.targetX - player.x) * 8 * dt;
      for (var ci = 0; ci < clouds.length; ci++) { clouds[ci].x += clouds[ci].vx * dt; if (clouds[ci].x < -100) clouds[ci].x = W + 100; if (clouds[ci].x > W + 100) clouds[ci].x = -100; }
      nextBolt -= dt; if (nextBolt <= 0) { spawnBolt(); if (survived > 4 && Math.random() < 0.4) spawnBolt(); nextBolt = 0.6 + Math.random() * 0.8; }
      for (var ti = bolts.length - 1; ti >= 0; ti--) {
        var bolt = bolts[ti];
        if (!bolt.striking) {
          bolt.warnTimer -= dt;
          if (bolt.warnTimer <= 0) {
            bolt.striking = true; bolt.strikeTimer = 0.25; bolt.segments = makeSegs(bolt.x, bolt.warnY, PLAYER_Y); game.audio.play('se_failure', 0.4);
            if (invincible <= 0 && Math.abs(bolt.x - player.x) < player.r + 28) {
              hits++; flash = 0.8; invincible = 1.5; game.audio.play('se_failure', 0.7);
              for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: PLAYER_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); }
              if (hits >= MAX_HITS) { finish(false); return; }
            }
          }
        } else { bolt.strikeTimer -= dt; if (bolt.strikeTimer <= 0) bolts.splice(ti, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < bolts.length; ti2++) {
      var bolt2 = bolts[ti2];
      if (!bolt2.striking) { var wp = Math.floor(game.time.elapsed * 20) % 2 === 0 ? 0.9 : 0.4; pline(bolt2.x, bolt2.warnY, bolt2.x, PLAYER_Y, C.d, 0.3, 6); pc(bolt2.x, bolt2.warnY, 18, C.c, wp * 0.8); }
      else for (var si = 0; si < bolt2.segments.length; si++) { var sg = bolt2.segments[si]; pline(sg.x1, sg.y1, sg.x2, sg.y2, C.c, 0.9, 10); pline(sg.x1, sg.y1, sg.x2, sg.y2, C.g, 0.8, 4); }
    }
    drawPlayer();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.15);

    survBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + GOAL + 's', W / 2, 168, 44, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a0018');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
