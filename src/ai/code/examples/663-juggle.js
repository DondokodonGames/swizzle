// 663-juggle.js
// ジャグリング — 頂点に達した球をタップで叩き上げ、落とさずジャグリングを続ける
// 操作: 球が最高点で光ったらタップ。早すぎ/遅すぎは無効。球は徐々に増える
// 成功: 15回 ジャグル  失敗: 3回 落球 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、大道芸） ──
  var C = { bg:'#020208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL_COLORS = [C.f, C.b, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'JUGGLE';
  var HOW_TO_PLAY = 'TAP EACH BALL AT ITS PEAK TO KEEP IT UP · DO NOT DROP · MORE BALLS OVER TIME';
  var MAX_TIME = 18;
  var NEEDED   = 15;         // 修正2: 30 → 15
  var MAX_DROP = 3;          // 修正2: 5 → 3
  var BALL_R = 60, GROUND_Y = snap(H * 0.86), GRAVITY = 1400, LAUNCH_VY = -1200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, numBalls, juggles, drops, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, tapCooldown;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#05050e');
  }

  function background() { game.draw.clear(C.bg); }

  function launchBall(idx, startX, delay) {
    setTimeout(function() { balls.push({ idx: idx, x: startX, y: GROUND_Y - BALL_R, vy: LAUNCH_VY - idx * 50, atApex: false, tapped: false, dropping: false }); }, delay || 0);
  }

  function initGame() { balls = []; numBalls = 1; juggles = 0; drops = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; tapCooldown = 0; launchBall(0, W / 2, 300); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (juggles * 400 + Math.ceil(timeLeft) * 100) : juggles * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function juggleBall(ball) {
    ball.vy = LAUNCH_VY; ball.tapped = false; ball.atApex = false; ball.dropping = false; juggles++; game.audio.play('se_tap', 0.2);
    for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: ball.x, y: ball.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.35, col: BALL_COLORS[ball.idx % 3] }); }
    if (juggles >= NEEDED) { finish(true); return; }
    if (juggles === 6 && numBalls < 2) { numBalls = 2; launchBall(1, W * 0.65, 0); }
    if (juggles === 12 && numBalls < 3) { numBalls = 3; launchBall(2, W * 0.35, 0); }
  }

  function drawScene() {
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#0a0a14', 0.8); game.draw.rect(0, GROUND_Y, W, 6, '#1e293b', 0.8);
    for (var bi = 0; bi < balls.length; bi++) {
      var ball = balls[bi], col = BALL_COLORS[ball.idx % 3], radius = ball.atApex ? BALL_R + 10 : BALL_R;
      if (ball.atApex) { pc(ball.x, ball.y, radius + 24, col, 0.2); txt('TAP', ball.x, ball.y - radius - 36, 36, C.g); }
      pc(ball.x, ball.y, radius, col, 0.9); pc(ball.x - radius * 0.35, ball.y - radius * 0.35, radius * 0.28, C.g, 0.4);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || tapCooldown > 0) return;
    var tapped = false;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i]; if (b.dropping || b.tapped) continue;
      if (b.atApex) { var dx = tx - b.x, dy = ty - b.y; if (dx * dx + dy * dy < (BALL_R + 40) * (BALL_R + 40)) { juggleBall(b); b.tapped = true; tapped = true; tapCooldown = 0.1; flash = 0.25; flashCol = C.b; resultText = 'NICE!'; resultTimer = 0.4; break; } }
    }
    if (!tapped) {
      for (var j = 0; j < balls.length; j++) { var b2 = balls[j]; if (b2.dropping || b2.tapped) continue; var dx2 = tx - b2.x, dy2 = ty - b2.y; if (dx2 * dx2 + dy2 * dy2 < (BALL_R + 40) * (BALL_R + 40)) { flash = 0.25; flashCol = C.a; resultText = 'TOO EARLY!'; resultTimer = 0.4; game.audio.play('se_failure', 0.2); tapCooldown = 0.15; break; } }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.40, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JUGGLE PRO!' : 'DROPPED IT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (tapCooldown > 0) tapCooldown -= dt;
      for (var i = balls.length - 1; i >= 0; i--) {
        var b = balls[i]; b.vy += GRAVITY * dt; b.y += b.vy * dt;
        b.atApex = Math.abs(b.vy) < 180 && !b.tapped && !b.dropping;
        if (b.y >= GROUND_Y - BALL_R) {
          if (!b.tapped) {
            b.dropping = true; drops++; flash = 0.4; flashCol = C.a; resultText = 'DROP!'; resultTimer = 0.55; game.audio.play('se_failure', 0.4);
            for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: GROUND_Y - BALL_R, vx: Math.cos(pa) * 200, vy: -Math.abs(Math.sin(pa)) * 300, life: 0.5, col: BALL_COLORS[b.idx % 3] }); }
            if (drops >= MAX_DROP) { finish(false); return; }
            (function(bidx) { setTimeout(function() { for (var k = 0; k < balls.length; k++) if (balls[k].idx === bidx) { balls[k].y = GROUND_Y - BALL_R; balls[k].vy = LAUNCH_VY; balls[k].tapped = false; balls[k].atApex = false; balls[k].dropping = false; break; } }, 600); })(b.idx);
          }
          b.y = GROUND_Y - BALL_R; if (!b.dropping) b.vy = LAUNCH_VY;
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.76), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(juggles + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, di < drops ? C.a : '#05050e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
