// 690-tug.js
// つなひき — 連打で綱を引き、相手より先にゴールラインまで引き込む
// 操作: タップ連打で綱を引く。CPUに勝てば1勝
// 成功: 5勝  失敗: 3敗 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、綱／勝敗色は保持） ──
  var C = { bg:'#06030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ROPE = '#d97706', ROPE_HI = '#ffe600', WIN_C = '#00ff9f', LOSE_C = '#ff2079';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TUG OF WAR';
  var HOW_TO_PLAY = 'TAP RAPIDLY TO PULL THE ROPE PAST YOUR LINE BEFORE THE CPU DOES';
  var MAX_TIME = 20;
  var NEEDED_WINS = 5;       // 修正2: 10 → 5
  var MAX_LOSSES  = 3;       // 修正2: 10 → 3
  var ROPE_Y = snap(H * 0.5), ROPE_MID = W / 2, MARKER_R = 36, WIN_DIST = W * 0.3;
  var CPU_RATE = 3.8, PLAYER_PULL = 80, CPU_PULL = 70, DAMPING = 4.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var markerX, targetX, playerForce, cpuForce, cpuTimer, wins, losses, roundDone, waitTimer, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, tapFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0510');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() { markerX = ROPE_MID; targetX = ROPE_MID; playerForce = 0; cpuForce = 0; cpuTimer = 0; roundDone = false; waitTimer = 0; }

  function initGame() { wins = 0; losses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapFlash = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (wins * 700 + Math.ceil(timeLeft) * 100) : wins * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.line(ROPE_MID - WIN_DIST, ROPE_Y - 160, ROPE_MID - WIN_DIST, ROPE_Y + 160, WIN_C, 5);
    game.draw.line(ROPE_MID + WIN_DIST, ROPE_Y - 160, ROPE_MID + WIN_DIST, ROPE_Y + 160, LOSE_C, 5);
    txt('YOU', ROPE_MID - WIN_DIST - 70, ROPE_Y - 184, 36, WIN_C);
    txt('CPU', ROPE_MID + WIN_DIST + 70, ROPE_Y - 184, 36, LOSE_C);
    game.draw.line(ROPE_MID, ROPE_Y - 80, ROPE_MID, ROPE_Y + 80, '#ffffff18', 2);
    game.draw.line(0, ROPE_Y, W, ROPE_Y, ROPE, 22); game.draw.line(0, ROPE_Y, W, ROPE_Y, ROPE_HI, 6);
    for (var ri = 0; ri < 10; ri++) { var rx = W * ri / 10 + (elapsed * 60) % (W / 10); game.draw.line(rx, ROPE_Y - 9, rx + 20, ROPE_Y + 9, ROPE, 3); }
    pc(markerX, ROPE_Y, MARKER_R, C.g, 0.95); pc(markerX - MARKER_R * 0.3, ROPE_Y - MARKER_R * 0.3, MARKER_R * 0.2, C.c, 0.6);
    // Tension bar
    var barW = W * 0.7, barX = W * 0.15, barY = snap(ROPE_Y + 160), tCol = markerX < ROPE_MID ? WIN_C : LOSE_C;
    game.draw.rect(barX, barY, barW, 28, '#1e293b', 0.7);
    game.draw.rect(barX + barW / 2, barY, (markerX - ROPE_MID) / WIN_DIST * barW / 2, 28, tCol, 0.8);
    game.draw.line(barX + barW / 2, barY - 6, barX + barW / 2, barY + 34, '#ffffff44', 2);
    // Player force gauge
    var pfRatio = Math.min(1, playerForce / (PLAYER_PULL * 5));
    game.draw.rect(40, ROPE_Y - 60, 28, 120, '#1e293b', 0.6); game.draw.rect(40, ROPE_Y - 60 + (1 - pfRatio) * 120, 28, pfRatio * 120, WIN_C, 0.8);
    txt('MASH!', 54, ROPE_Y + 116, 28, C.c);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || roundDone) return;
    playerForce += PLAYER_PULL; tapFlash = 0.2; game.audio.play('se_tap', 0.08);
    for (var p = 0; p < 3; p++) particles.push({ x: tx, y: ty, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.8) * 120, life: 0.3, col: WIN_C });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (markerX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAMPION!' : 'OUTPULLED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (tapFlash > 0) tapFlash -= dt * 5;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      if (!roundDone) {
        cpuTimer += dt; var cpuInterval = 1.0 / (CPU_RATE + wins * 0.15);
        if (cpuTimer >= cpuInterval) { cpuTimer -= cpuInterval; cpuForce += CPU_PULL; }
        var netForce = cpuForce - playerForce; targetX += netForce * dt;
        targetX = Math.max(ROPE_MID - WIN_DIST - 50, Math.min(ROPE_MID + WIN_DIST + 50, targetX));
        playerForce *= Math.max(0, 1 - DAMPING * dt); cpuForce *= Math.max(0, 1 - DAMPING * dt);
        markerX += (targetX - markerX) * Math.min(1, dt * 8);
        if (markerX <= ROPE_MID - WIN_DIST) {
          roundDone = true; wins++; flash = 0.4; flashCol = C.b; resultText = 'WIN!'; resultTimer = 0.7; game.audio.play('se_success', 0.75);
          for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W * 0.2, y: ROPE_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.b }); }
          if (wins >= NEEDED_WINS) { finish(true); return; }
          waitTimer = 0.9;
        } else if (markerX >= ROPE_MID + WIN_DIST) {
          roundDone = true; losses++; flash = 0.4; flashCol = C.a; resultText = 'LOSE...'; resultTimer = 0.7; game.audio.play('se_failure', 0.5);
          if (losses >= MAX_LOSSES) { finish(false); return; }
          waitTimer = 0.9;
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (tapFlash > 0) game.draw.rect(0, 0, W, H, WIN_C, tapFlash * 0.06);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(ROPE_Y + 280), 72, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(wins + ' W  -  ' + losses + ' L', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
