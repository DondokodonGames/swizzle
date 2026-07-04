// 758-gravity-flip.js
// グラビティフリップ — タップで重力の向きを反転させ、パイプの隙間を抜け続ける
// 操作: タップで重力が上下反転。ボールの高さを合わせて隙間を通過する
// 成功: 10回 通過  失敗: 3回 衝突 or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、重力ダンジョン） ──
  var C = { bg:'#04080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PIPE = '#00cc66', PIPE_HI = '#00ff9f', PLAYER = '#ff6600', PLAYER_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY UP OR DOWN · WEAVE THROUGH THE PIPE GAPS';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_HITS = 3;          // 修正2: 7 → 3
  var PLAYER_X = W * 0.22, GRAVITY = 1800, PLAYER_R = 32, GAP_H = 300, PIPE_SPEED_BASE = 420;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerY, playerVy, gravDir, pipes, pipeTimer, score, hits, timeLeft, done, elapsed, trail, particles, flash, flashCol, resultText, resultTimer, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 8; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'down') game.draw.rect(cx - w / 2, cy + i - size / 2, w, st, color, 0.9); else game.draw.rect(cx - w / 2, cy - i + size / 2 - st, w, st, color, 0.9); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080c14');
  }

  function background() { game.draw.clear(C.bg); for (var sti = 0; sti < stars.length; sti++) { var st = stars[sti]; game.draw.rect(snap(st.x), snap(st.y), st.r, st.r, '#94a3b8', 0.5); } }

  function spawnPipe() { pipes.push({ x: W + 60, gapY: GAP_H / 2 + 80 + Math.random() * (H - GAP_H - 160), scored: false, hit: false }); }

  function initGame() { playerY = H / 2; playerVy = 0; gravDir = 1; pipes = []; pipeTimer = 1.1; score = 0; hits = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; trail = []; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; stars = []; for (var si = 0; si < 40; si++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.7 ? 8 : 16, sp: 0.3 + Math.random() * 0.4 }); spawnPipe(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    arrow(W * 0.06, gravDir === 1 ? H - 60 : 60, 44, gravDir === 1 ? 'down' : 'up', PLAYER);
    for (var pi2 = 0; pi2 < pipes.length; pi2++) {
      var g = pipes[pi2], gapTop = g.gapY - GAP_H / 2, gapBot = g.gapY + GAP_H / 2;
      if (gapTop > 0) { game.draw.rect(g.x - 40, 0, 80, gapTop, PIPE, 0.9); game.draw.rect(g.x - 48, gapTop - 40, 96, 44, PIPE, 0.95); game.draw.rect(g.x - 48, gapTop - 40, 96, 8, PIPE_HI, 0.5); }
      if (gapBot < H) { game.draw.rect(g.x - 40, gapBot, 80, H - gapBot, PIPE, 0.9); game.draw.rect(g.x - 48, gapBot, 96, 44, PIPE, 0.95); game.draw.rect(g.x - 48, gapBot + 36, 96, 8, PIPE_HI, 0.5); }
      game.draw.rect(g.x - 40, gapTop, 80, GAP_H, C.b, 0.05);
    }
    for (var tri = 0; tri < trail.length; tri++) { var tr = trail[tri]; pc(tr.x, tr.y, PLAYER_R * 0.5 * tr.life, PLAYER, tr.life * 0.3); }
    var shake = flash > 0.3 ? Math.sin(elapsed * 32) * 6 : 0;
    pc(PLAYER_X + shake, playerY, PLAYER_R, PLAYER, 0.92); pc(PLAYER_X + shake - 10, playerY - 10, 11, PLAYER_HI, 0.45);
    arrow(PLAYER_X + shake, playerY + gravDir * 10, 22, gravDir === 1 ? 'down' : 'up', C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    gravDir *= -1; game.audio.play('se_tap', 0.08);
    for (var p = 0; p < 3; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(pa) * 80, vy: Math.sin(pa) * 120, life: 0.25, col: PLAYER_HI }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!pipes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRAVITY MASTER!' : 'CRASHED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      playerVy += GRAVITY * gravDir * dt; playerVy = Math.max(-1400, Math.min(1400, playerVy)); playerY += playerVy * dt;
      if (playerY - PLAYER_R < 0) { playerY = PLAYER_R; playerVy = 0; gravDir = 1; }
      if (playerY + PLAYER_R > H) { playerY = H - PLAYER_R; playerVy = 0; gravDir = -1; }
      trail.push({ x: PLAYER_X, y: playerY, life: 0.4 }); for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 3; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      pipeTimer -= dt; var rate = Math.max(0.7, 1.1 - score * 0.025); if (pipeTimer <= 0) { pipeTimer = rate; spawnPipe(); }
      var pspd = Math.min(780, PIPE_SPEED_BASE + score * 18);
      for (var pi = pipes.length - 1; pi >= 0; pi--) {
        var pp = pipes[pi]; pp.x -= pspd * dt;
        if (!pp.scored && !pp.hit && pp.x + 40 < PLAYER_X - PLAYER_R) { pp.scored = true; score++; flash = 0.18; flashCol = C.b; resultText = 'PASSED!'; resultTimer = 0.3; game.audio.play('se_tap', 0.07); if (score >= NEEDED) { finish(true); return; } }
        if (!pp.hit && !pp.scored && pp.x - 40 < PLAYER_X + PLAYER_R && pp.x + 40 > PLAYER_X - PLAYER_R) {
          var inGap = playerY > pp.gapY - GAP_H / 2 - PLAYER_R && playerY < pp.gapY + GAP_H / 2 + PLAYER_R;
          if (!inGap) {
            pp.hit = true; pp.scored = true; hits++; flash = 0.45; flashCol = C.a; resultText = 'CRASH!'; resultTimer = 0.5; playerVy = -playerVy * 0.5; gravDir *= -1; game.audio.play('se_failure', 0.4);
            for (var pe = 0; pe < 6; pe++) { var pea = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(pea) * 220, vy: Math.sin(pea) * 220, life: 0.38, col: C.a }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
        }
        if (pp.x < -120) pipes.splice(pi, 1);
      }
      for (var sti = 0; sti < stars.length; sti++) { stars[sti].x -= stars[sti].sp * pspd * dt * 0.05; if (stars[sti].x < 0) stars[sti].x = W; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp2 = particles.length - 1; pp2 >= 0; pp2--) { var p = particles[pp2]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.6; if (p.life <= 0) particles.splice(pp2, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp3 = 0; pp3 < particles.length; pp3++) game.draw.rect(snap(particles[pp3].x) - 4, snap(particles[pp3].y) - 4, 8, 8, particles[pp3].col, particles[pp3].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.18), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#080c14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
