// 756-dodge-spikes.js
// ドッジスパイク — 迫るスパイク壁の隙間を、タップジャンプで通り抜ける
// 操作: タップでジャンプ。上下のトゲの間の隙間を高さを合わせて通過する
// 成功: 10回 通過  失敗: 3回 被弾 or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、トゲの回廊） ──
  var C = { bg:'#080410', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SPIKE = '#7700ff', SPIKE_HI = '#a855f7', PLAYER = '#ff6600', PLAYER_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DODGE SPIKES';
  var HOW_TO_PLAY = 'TAP TO JUMP · LINE UP WITH THE GAP AND SLIP THROUGH THE SPIKE WALLS';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_HITS = 3;          // 修正2: 8 → 3
  var RAIL_Y = snap(H / 2), RAIL_H = 16, GAP_H = 240, GRAVITY = 1600, JUMP_V = -820, GATE_SPEED_BASE = 400;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerX, playerY, playerVy, onRail, gates, gateTimer, score, hits, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, legPhase;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0c0818');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnGate() { gates.push({ x: W + 80, gapY: H * 0.22 + Math.random() * (H * 0.55), scored: false, hit: false }); }

  function initGame() { playerX = W * 0.22; playerY = RAIL_Y; playerVy = 0; onRail = true; gates = []; gateTimer = 1.0; score = 0; hits = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; legPhase = 0; spawnGate(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, RAIL_Y, W, RAIL_H, '#1e1b4b', 0.9); game.draw.rect(0, RAIL_Y, W, 4, '#3730a3', 0.4);
    for (var gi2 = 0; gi2 < gates.length; gi2++) {
      var g2 = gates[gi2], gapTop = g2.gapY - GAP_H / 2, gapBot = g2.gapY + GAP_H / 2;
      if (gapTop > 0) { game.draw.rect(g2.x - 28, 0, 56, gapTop, SPIKE, 0.9); for (var si = 0; si < 3; si++) game.draw.rect(g2.x - 20 + si * 20, gapTop - 24, 12, 26, SPIKE_HI, 0.7); }
      if (gapBot < H) { game.draw.rect(g2.x - 28, gapBot, 56, H - gapBot, SPIKE, 0.9); for (var si2 = 0; si2 < 3; si2++) game.draw.rect(g2.x - 20 + si2 * 20, gapBot, 12, 26, SPIKE_HI, 0.7); }
      game.draw.rect(g2.x - 28, gapTop, 56, GAP_H, C.b, 0.06);
    }
    var shake = flash > 0.3 ? Math.sin(elapsed * 30) * 8 : 0, px = playerX + shake;
    pc(px, playerY, 28, PLAYER, 0.9); pc(px - 8, playerY - 8, 9, PLAYER_HI, 0.45);
    if (onRail) { game.draw.line(px - 12, playerY + 28, px - 12 + Math.sin(legPhase) * 14, playerY + 52, PLAYER, 8); game.draw.line(px + 12, playerY + 28, px + 12 - Math.sin(legPhase) * 14, playerY + 52, PLAYER, 8); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !onRail) return;
    playerVy = JUMP_V; onRail = false; game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 3; p++) { var pa = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5; particles.push({ x: playerX, y: playerY, vx: Math.cos(pa) * 100, vy: Math.sin(pa) * 140, life: 0.28, col: PLAYER }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gates) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'UNSCATHED!' : 'IMPALED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      playerVy += GRAVITY * dt; playerY += playerVy * dt;
      if (playerY >= RAIL_Y) { playerY = RAIL_Y; playerVy = 0; onRail = true; } if (playerY < 0) { playerY = 0; playerVy = 0; }
      if (onRail) legPhase += dt * 7;
      gateTimer -= dt; var rate = Math.max(0.6, 1.0 - score * 0.025); if (gateTimer <= 0) { gateTimer = rate; spawnGate(); }
      var gspd = Math.min(800, GATE_SPEED_BASE + score * 18);
      for (var gi = gates.length - 1; gi >= 0; gi--) {
        var g = gates[gi]; g.x -= gspd * dt;
        if (!g.scored && !g.hit && g.x + 30 < playerX - 28) { g.scored = true; score++; flash = 0.18; flashCol = C.b; resultText = 'PASSED!'; resultTimer = 0.3; game.audio.play('se_tap', 0.07); if (score >= NEEDED) { finish(true); return; } }
        if (!g.hit && !g.scored && g.x - 28 < playerX + 28 && g.x + 28 > playerX - 28) {
          var inGap = playerY > g.gapY - GAP_H / 2 - 24 && playerY < g.gapY + GAP_H / 2 + 24;
          if (!inGap) {
            g.hit = true; g.scored = true; hits++; flash = 0.45; flashCol = C.a; resultText = 'SPIKE!'; resultTimer = 0.5; playerVy = JUMP_V * 0.6; onRail = false; game.audio.play('se_failure', 0.4);
            for (var pe = 0; pe < 6; pe++) { var pea = Math.random() * Math.PI * 2; particles.push({ x: playerX, y: playerY, vx: Math.cos(pea) * 200, vy: Math.sin(pea) * 200, life: 0.4, col: C.a }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
        }
        if (g.x < -120) gates.splice(gi, 1);
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.6; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.18), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0c0818');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
