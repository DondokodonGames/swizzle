// 707-balance-beam.js
// バランスビーム — シーソーを左右に傾けて、落ちてくる玉をビームで受け止める
// 操作: 画面左タップで左が下がり、右タップで右が下がる。玉を落とさないよう調整
// 成功: 10個 キャッチ  失敗: 3個 落とす or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、玉色は保持） ──
  var C = { bg:'#040a10', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BEAM = '#00cc99', BEAM_HI = '#00ff9f', BALL_L = '#ff6600', BALL_R = '#a855f7';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE BEAM';
  var HOW_TO_PLAY = 'TAP LEFT OR RIGHT TO TILT THE BEAM · CATCH THE FALLING BALLS';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_DROP = 3;          // 修正2: 10 → 3
  var CX = W / 2, PIVOT_Y = snap(H * 0.65), BEAM_LEN = 460, BEAM_H = 24, MAX_ANGLE = Math.PI / 5;
  var BALL_RAD = 32, SPAWN_RATE = 1.3, ANGLE_DAMPING = 1.8, TILT_FORCE = 3.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, angleVel, balls, spawnTimer, caught, dropped, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#060c12');
  }

  function background() { game.draw.clear(C.bg); }

  function getBeamY(x) { return PIVOT_Y + Math.sin(angle) * (x - CX); }

  function spawnBall() {
    var side = Math.random() > 0.5 ? 'L' : 'R', col = side === 'L' ? BALL_L : BALL_R;
    var x = side === 'L' ? CX - BEAM_LEN / 2 + Math.random() * BEAM_LEN * 0.3 : CX + BEAM_LEN * 0.2 + Math.random() * BEAM_LEN * 0.3;
    balls.push({ x: x, y: H * 0.2, vy: 180 + Math.random() * 100, r: BALL_RAD, col: col, side: side, onBeam: false });
  }

  function initGame() { angle = 0; angleVel = 0; balls = []; spawnTimer = 0; caught = 0; dropped = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(CX - 16, PIVOT_Y, 32, 80, '#374151', 0.9); pc(CX, PIVOT_Y, 20, '#374151', 0.9);
    var sin = Math.sin(angle), bx1 = CX - BEAM_LEN / 2, by1 = PIVOT_Y - sin * BEAM_LEN / 2, bx2 = CX + BEAM_LEN / 2, by2 = PIVOT_Y + sin * BEAM_LEN / 2;
    game.draw.line(bx1, by1, bx2, by2, BEAM, BEAM_H); game.draw.line(bx1, by1 - BEAM_H * 0.4, bx2, by2 - BEAM_H * 0.4, BEAM_HI, 6);
    for (var bi = 0; bi < balls.length; bi++) { var b2 = balls[bi]; pc(b2.x, b2.y, b2.r, b2.col, 0.9); pc(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.25, C.g, 0.4); }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) angleVel -= TILT_FORCE; else angleVel += TILT_FORCE;
    game.audio.play('se_tap', 0.07);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY HANDS!' : 'TIPPED OVER', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      angleVel -= angle * 4; angleVel -= angleVel * ANGLE_DAMPING * dt; angle += angleVel * dt;
      if (angle > MAX_ANGLE) { angle = MAX_ANGLE; angleVel *= -0.3; }
      if (angle < -MAX_ANGLE) { angle = -MAX_ANGLE; angleVel *= -0.3; }
      spawnTimer += dt; var rate = Math.max(0.7, SPAWN_RATE - elapsed * 0.01); if (spawnTimer >= rate) { spawnTimer = 0; spawnBall(); }
      for (var i = balls.length - 1; i >= 0; i--) {
        var b = balls[i], beamY = getBeamY(b.x);
        if (!b.onBeam) {
          b.vy += 700 * dt; b.y += b.vy * dt;
          if (b.y + b.r >= beamY && b.vy > 0) {
            if (b.x > CX - BEAM_LEN / 2 && b.x < CX + BEAM_LEN / 2) {
              b.y = beamY - b.r; b.vy = 0; b.onBeam = true; caught++; game.audio.play('se_tap', 0.12);
              for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: beamY, vx: Math.cos(pa) * 130, vy: Math.sin(pa) * 130, life: 0.35, col: b.col }); }
              if (caught >= NEEDED) { finish(true); return; }
            }
          }
          if (b.y > H + 50) { dropped++; game.audio.play('se_failure', 0.2); balls.splice(i, 1); if (dropped >= MAX_DROP) { flash = 0.5; flashCol = C.a; finish(false); return; } continue; }
        } else {
          b.y = getBeamY(b.x) - b.r; b.x += Math.sin(angle) * 800 * dt;
          if (b.x < CX - BEAM_LEN / 2 - b.r || b.x > CX + BEAM_LEN / 2 + b.r) { b.onBeam = false; b.vy = 100; }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 60, flashCol);
    txt('< L', W * 0.2, snap(H * 0.93), 38, '#ff660088'); txt('R >', W * 0.8, snap(H * 0.93), 38, '#a855f788');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_DROP; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, mi < dropped ? C.a : '#060c12');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
