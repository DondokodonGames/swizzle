// 394-juggle-act.js
// ジャグリング — 落ちてくる3つのボールをタップで打ち上げ続け、1つも床に落とさない大道芸
// 操作: 空中のボールをタップして上へ打ち返す
// 成功: 8回 打ち返す  失敗: 1個でも床に落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、サーカス） ──
  var C = { bg:'#0d0820', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BCOL = [C.a, C.b, C.e];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'JUGGLE ACT';
  var HOW_TO_PLAY = 'TAP THE BALLS TO KEEP THEM UP · DONT LET ANY DROP';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 50 → 8
  var FLOOR_Y = snap(H * 0.86);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, hits, timeLeft, done, particles, flashBall, flashTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#110820', 0.9); game.draw.rect(0, FLOOR_Y, W, 4, C.d, 0.7); }

  function initGame() {
    balls = [ { x: W * 0.28, y: H * 0.5, vx: 100, vy: -560, col: BCOL[0], r: 50, hits: 0 }, { x: W * 0.5, y: H * 0.6, vx: -90, vy: -480, col: BCOL[1], r: 50, hits: 0 }, { x: W * 0.72, y: H * 0.55, vx: 70, vy: -520, col: BCOL[2], r: 50, hits: 0 } ];
    hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flashBall = -1; flashTimer = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 400 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBalls() {
    for (var i = 0; i < balls.length; i++) { var b = balls[i], fl = i === flashBall && flashTimer > 0; var sw = Math.max(6, b.r * (1 - (FLOOR_Y - b.y) / FLOOR_Y * 0.8)); game.draw.rect(snap(b.x - sw / 2), FLOOR_Y + 6, snap(sw), 8, C.d, 0.3); pc(b.x, b.y, b.r, b.col, 0.9); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, C.g, 0.5); if (fl) ring(b.x, b.y, b.r + 12, b.col, flashTimer * 1.6); txt(b.hits + '', b.x, b.y + 14, 40, C.g); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < balls.length; i++) { var b = balls[i]; if (Math.hypot(x - b.x, y - b.y) < b.r + 30) { b.vy = -(520 + Math.random() * 140); b.vx += (Math.random() - 0.5) * 70; hits++; b.hits++; flashBall = i; flashTimer = 0.3; game.audio.play('se_tap', 0.4); for (var p = 0; p < 6; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: b.col }); } if (hits >= NEEDED) { finish(true); return; } return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawBalls();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHOWTIME!' : 'DROPPED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flashTimer > 0) flashTimer -= dt;
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i]; b.vy += 680 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= (1 - 0.3 * dt);
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.8; } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.8; }
        if (b.y > FLOOR_Y) { for (var p = 0; p < 14; p++) { var a = Math.random() * Math.PI; particles.push({ x: b.x, y: FLOOR_Y, vx: Math.cos(a) * 300, vy: -Math.sin(a) * 300, life: 0.7, col: b.col }); } finish(false); return; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 400 * dt; p2.life -= dt; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBalls();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
