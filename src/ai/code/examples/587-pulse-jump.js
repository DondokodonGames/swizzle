// 587-pulse-jump.js
// パルスジャンプ — 一定リズムで刻まれるビートに合わせ、判定バーが中央を通る瞬間にタップで跳ぶ
// 操作: タップ（またはスワイプ）でジャンプ。ビートぴったりでPERFECT、少しズレてGOOD、外すとMISS
// 成功: ビート 8回 成功  失敗: 3回 ミス or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズムフロア） ──
  var C = { bg:'#05020a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PULSE JUMP';
  var HOW_TO_PLAY = 'TAP WHEN THE MARKER CROSSES THE CENTER · HIT THE BEAT';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var BEAT_INTERVAL = 0.6, BEAT_WINDOW = 0.14, FLOOR_Y = snap(H * 0.68), PLAYER_R = 44;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, beatPulse, playerY, playerVY, onGround, score, misses, timeLeft, done, particles, resultText, resultTimer, resultCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#1a0a2e');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, FLOOR_Y + PLAYER_R, W, H - FLOOR_Y - PLAYER_R, '#1a0a2e', 0.9); game.draw.rect(0, FLOOR_Y + PLAYER_R - 6, W, 6, C.d, 0.3 + beatPulse * 0.5); }

  function initGame() { beatTimer = 0; beatPulse = 0; playerY = FLOOR_Y; playerVY = 0; onGround = true; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; resultCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 700 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tryJump() {
    if (!onGround) return;
    var dist = Math.abs(beatTimer - BEAT_INTERVAL / 2); if (dist > BEAT_INTERVAL / 2) dist = BEAT_INTERVAL - dist;
    playerVY = -1200; onGround = false;
    if (dist < BEAT_WINDOW * 0.5) { score++; resultText = 'PERFECT!'; resultCol = C.c; resultTimer = 0.6; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: playerY, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 200, life: 0.5, col: C.c }); } if (score >= NEEDED) { finish(true); return; } }
    else if (dist < BEAT_WINDOW) { score++; resultText = 'GOOD'; resultCol = C.b; resultTimer = 0.5; game.audio.play('se_tap', 0.5); if (score >= NEEDED) { finish(true); return; } }
    else { misses++; resultText = 'MISS'; resultCol = C.a; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  }

  function drawScene() {
    var by = FLOOR_Y + PLAYER_R + 24;
    game.draw.rect(0, by, W, 12, '#334466', 0.4); game.draw.rect(W * 0.5 - W * BEAT_WINDOW / BEAT_INTERVAL, by - 4, W * BEAT_WINDOW * 2 / BEAT_INTERVAL, 20, C.c, 0.2);
    game.draw.rect(W * (beatTimer / BEAT_INTERVAL) - 4, by - 4, 8, 20, C.c, 0.9);
    var squish = onGround ? 1.15 : 0.85;
    pc(W / 2, playerY, PLAYER_R * squish, C.e, 0.9); pc(W / 2 - 12, playerY - 12, PLAYER_R * 0.3, C.g, 0.5);
    if (beatPulse > 0) pc(W / 2, playerY, PLAYER_R * 2.2, C.d, beatPulse * 0.2);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    tryJump();
  });

  game.onSwipe(function() { if (state === S.PLAYING && !done) tryJump(); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (beatTimer === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.20, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.245, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.44, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON BEAT!' : 'OFF RHYTHM', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      beatTimer += dt; if (beatTimer >= BEAT_INTERVAL) { beatTimer -= BEAT_INTERVAL; beatPulse = 1.0; }
      if (beatPulse > 0) beatPulse -= dt * 6; if (resultTimer > 0) resultTimer -= dt;
      if (!onGround) { playerVY += 3000 * dt; playerY += playerVY * dt; if (playerY >= FLOOR_Y) { playerY = FLOOR_Y; playerVY = 0; onGround = true; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 800 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.52), 72, resultCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a0a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
