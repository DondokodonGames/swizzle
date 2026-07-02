// 282-magnet-pull.js
// マグネットプル — 中央磁石の引力・斥力をタップで切り替え、金属球を下のゴールへ導く
// 操作: タップで引力(ATT)と斥力(REP)を切り替え
// 成功: 3球ゴール  失敗: 3球こぼす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、磁力場） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET PULL';
  var HOW_TO_PLAY = 'TAP TO SWITCH ATTRACT / REPEL · REACH GOAL';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_HIT = 3;           // 修正2: 5 → 3
  var MX = snap(W / 2), MY = snap(H * 0.44), MR = 60, TOP = 220;
  var goal = { x: snap(W / 2), y: snap(H * 0.82), r: 52 };

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var polarity, balls, scored, wallHits, timeLeft, done, spawnTimer, particles, fieldPulse;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.3) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() { var side = Math.floor(Math.random() * 3), x = side === 0 ? game.random(100, W - 100) : side === 1 ? W - 60 : 60; balls.push({ x: snap(x), y: TOP + 40, vx: game.random(-60, 60), vy: 60, r: 22 }); }

  function drawMagnet() { var col = polarity > 0 ? C.a : C.e; for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2, len = 90 + 20 * Math.sin(game.time.elapsed * 3 + i); game.draw.rect(snap(MX + Math.cos(a) * len) - 4, snap(MY + Math.sin(a) * len) - 4, 8, 8, col, 0.4); } pc(MX, MY, MR + (fieldPulse > 0 ? 16 * fieldPulse : 0), col, 0.9); txt(polarity > 0 ? 'ATT' : 'REP', MX, MY + 14, 40, '#000'); }

  function initGame() { polarity = 1; balls = []; scored = 0; wallHits = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = []; fieldPulse = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 400 + Math.ceil(timeLeft) * 60) : scored * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    polarity *= -1; fieldPulse = 0.4; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawMagnet(); ring(goal.x, goal.y, goal.r, C.b, 0.6); txt('G', goal.x, goal.y + 14, 44, C.b);
      txt(GAME_TITLE, W / 2, H * 0.13, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GUIDED!' : 'LOST BALLS', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fieldPulse > 0) fieldPulse -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0 && balls.length < 4) { spawnBall(); spawnTimer = 1.2 + Math.random() * 0.6; }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi], dx = MX - b.x, dy = MY - b.y, dist = Math.max(1, Math.hypot(dx, dy)), force = polarity * 18000 / (dist * dist + 100);
        b.vx += dx / dist * force * dt; b.vy += dy / dist * force * dt; b.vy += 120 * dt; b.vx *= (1 - dt * 0.5); b.vy *= (1 - dt * 0.5);
        var spd = Math.hypot(b.vx, b.vy); if (spd > 500) { b.vx *= 500 / spd; b.vy *= 500 / spd; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if ((b.x - goal.x) * (b.x - goal.x) + (b.y - goal.y) * (b.y - goal.y) < (goal.r + b.r) * (goal.r + b.r) * 0.6) { scored++; balls.splice(bi, 1); game.audio.play('se_success', 0.5); for (var pk = 0; pk < 6; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: goal.x, y: goal.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5 }); } if (scored >= NEEDED) { finish(true); return; } continue; }
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); } if (b.y - b.r < TOP) { b.y = TOP + b.r; b.vy = Math.abs(b.vy); }
        if (b.y + b.r > H - 120) { wallHits++; balls.splice(bi, 1); game.audio.play('se_failure', 0.5); if (wallHits >= MAX_HIT) { finish(false); return; } continue; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawMagnet();
    ring(goal.x, goal.y, goal.r, C.b, 0.6 + 0.2 * (Math.floor(game.time.elapsed * 4) % 2)); txt('G', goal.x, goal.y + 14, 44, C.b);
    for (var bi2 = 0; bi2 < balls.length; bi2++) { pc(balls[bi2].x, balls[bi2].y, balls[bi2].r, C.g, 0.9); pc(balls[bi2].x - 6, balls[bi2].y - 6, 6, C.e, 0.7); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.b, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < wallHits ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
