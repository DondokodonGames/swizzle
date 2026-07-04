// 647-magnet-maze.js
// マグネットメイズ — タップで磁石を動かし、鉄球を引き寄せて穴を避けゴールの星へ導く
// 操作: タップした位置に磁石が移動。磁力で鉄球を引きつつ、黒い穴を回避してゴールへ
// 成功: 5回 ゴール  失敗: 3回 落下 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、磁場迷路） ──
  var C = { bg:'#030406', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET MAZE';
  var HOW_TO_PLAY = 'TAP TO MOVE THE MAGNET · PULL THE BALL PAST THE HOLES TO THE STAR';
  var MAX_TIME = 25;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_FELL = 3;          // 修正2: 10 → 3
  var MAZE_X = 60, MAZE_Y = snap(H * 0.18), MAZE_W = W - 120, MAZE_H = snap(H * 0.60), BALL_R = 28, MAG_R = 50, MAG_STRENGTH = 800;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballX, ballY, ballVX, ballVY, magX, magY, targetMagX, targetMagY, holes, goalX, goalY, scored, fell, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color, alpha) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 - Math.PI / 2; game.draw.rect(cx + Math.cos(a) * r - 4, cy + Math.sin(a) * r - 4, 8, 8, color, alpha); var a2 = a + Math.PI / 5; game.draw.rect(cx + Math.cos(a2) * r * 0.45 - 4, cy + Math.sin(a2) * r * 0.45 - 4, 8, 8, color, alpha); } pc(cx, cy, r * 0.4, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030408');
  }

  function background() { game.draw.clear(C.bg); }

  function genLevel() {
    ballX = MAZE_X + 80 + Math.random() * (MAZE_W - 160); ballY = MAZE_Y + 80; ballVX = (Math.random() - 0.5) * 100; ballVY = 50 + Math.random() * 100;
    goalX = MAZE_X + 80 + Math.random() * (MAZE_W - 160); goalY = MAZE_Y + MAZE_H - 80;
    holes = []; var hCount = 4 + Math.floor((MAX_TIME - timeLeft) / 8);
    for (var h = 0; h < hCount; h++) holes.push({ x: MAZE_X + 60 + Math.random() * (MAZE_W - 120), y: MAZE_Y + 100 + Math.random() * (MAZE_H - 200), r: 28 });
  }

  function initGame() { magX = W / 2; magY = H * 0.9; targetMagX = W / 2; targetMagY = H * 0.9; scored = 0; fell = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; genLevel(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 700 + Math.ceil(timeLeft) * 100) : scored * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(MAZE_X - 4, MAZE_Y - 4, MAZE_W + 8, MAZE_H + 8, '#1e293b', 0.5); game.draw.rect(MAZE_X, MAZE_Y, MAZE_W, MAZE_H, '#0f1117', 0.8);
    for (var hi = 0; hi < holes.length; hi++) { var h = holes[hi]; pc(h.x, h.y, h.r, '#000000', 0.95); }
    star(goalX, goalY, 40, C.b, 0.5 + Math.sin(game.time.elapsed * 4) * 0.1);
    pc(ballX, ballY, BALL_R, '#94a3b8', 0.9); pc(ballX - 8, ballY - 8, BALL_R * 0.35, C.g, 0.5);
    pc(magX, magY, MAG_R, C.a, 0.85); pc(magX, magY, MAG_R * 0.6, C.g, 0.4); txt('N', magX - 14, magY + 8, 30, C.g); txt('S', magX + 14, magY + 8, 30, C.e);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetMagX = tx; targetMagY = ty;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!holes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MAGNETIZED!' : 'FELL IN', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      magX += (targetMagX - magX) * Math.min(1, dt * 9); magY += (targetMagY - magY) * Math.min(1, dt * 9);
      var mdx = magX - ballX, mdy = magY - ballY, mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist > 5) { var force = MAG_STRENGTH / (mDist * mDist) * Math.min(1, mDist / 200); ballVX += (mdx / mDist) * force * dt; ballVY += (mdy / mDist) * force * dt; }
      ballVY += 120 * dt; ballVX *= (1 - dt * 1.5); ballVY *= (1 - dt * 1.5);
      var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY); if (spd > 600) { ballVX = ballVX / spd * 600; ballVY = ballVY / spd * 600; }
      ballX += ballVX * dt; ballY += ballVY * dt;
      if (ballX - BALL_R < MAZE_X) { ballX = MAZE_X + BALL_R; ballVX = Math.abs(ballVX) * 0.7; }
      if (ballX + BALL_R > MAZE_X + MAZE_W) { ballX = MAZE_X + MAZE_W - BALL_R; ballVX = -Math.abs(ballVX) * 0.7; }
      if (ballY - BALL_R < MAZE_Y) { ballY = MAZE_Y + BALL_R; ballVY = Math.abs(ballVY) * 0.7; }
      for (var hi = 0; hi < holes.length; hi++) {
        var h = holes[hi], dx2 = ballX - h.x, dy2 = ballY - h.y;
        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < BALL_R + h.r) {
          fell++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.35);
          for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: ballX, y: ballY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.g }); }
          if (fell >= MAX_FELL) { finish(false); return; } genLevel(); return;
        }
      }
      var gdx = ballX - goalX, gdy = ballY - goalY;
      if (Math.sqrt(gdx * gdx + gdy * gdy) < BALL_R + 36) {
        scored++; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.6);
        for (var p2 = 0; p2 < 8; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: goalX, y: goalY, vx: Math.cos(pa2) * 300, vy: Math.sin(pa2) * 300, life: 0.5, col: C.b }); }
        if (scored >= NEEDED) { finish(true); return; } genLevel(); return;
      }
      if (ballY > MAZE_Y + MAZE_H + 60) { fell++; game.audio.play('se_failure', 0.3); if (fell >= MAX_FELL) { finish(false); return; } genLevel(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2.5; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FELL; fi++) game.draw.rect(snap(W - 120 - fi * 56) - 10, 168, 20, 20, fi < fell ? C.a : '#030408');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
