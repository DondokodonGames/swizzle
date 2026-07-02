// 347-balance-beam.js
// バランスビーム — 左右タップで細い棒を傾け、転がる玉を落とさず一定時間バランスを保つ
// 操作: 画面左タップで左に、右タップで右に棒を傾ける
// 成功: 8秒間 玉を落とさない  失敗: 玉を3回落とす

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、平衡感覚） ──
  var C = { bg:'#0f0a1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE BEAM';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO TILT · KEEP THE BALL ON';
  var NEEDED   = 8;          // 修正2: サバイバル 20s → 8s
  var MAX_FALL = 3;
  var BEAM_W = 720, BEAM_H = 24, BEAM_Y = snap(H * 0.50), BALL_R = 34, MAX_ANG = Math.PI / 5, STEP = Math.PI / 12, GRAV = 640;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beamAng, ballX, ballVX, survived, falls, timeLeft, done, particles;

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
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function resetBall() { ballX = (Math.random() - 0.5) * 200; ballVX = (Math.random() - 0.5) * 100; beamAng = 0; }

  function initGame() { survived = 0; falls = 0; timeLeft = NEEDED; done = false; particles = []; resetBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 300 + (MAX_FALL - falls) * 500) : Math.round(survived) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBeam() {
    var cos = Math.cos(beamAng), sin = Math.sin(beamAng);
    game.draw.rect(snap(W / 2) - 16, BEAM_Y, 32, snap(H * 0.24), C.d, 0.4); pc(W / 2, BEAM_Y, 18, C.d, 0.7);
    var x1 = W / 2 - BEAM_W / 2 * cos, y1 = BEAM_Y - BEAM_W / 2 * sin, x2 = W / 2 + BEAM_W / 2 * cos, y2 = BEAM_Y + BEAM_W / 2 * sin;
    pline(x1, y1, x2, y2, C.d, 0.9, BEAM_H);
    var bx = W / 2 + ballX * cos, by = BEAM_Y + ballX * sin - BALL_R;
    pc(bx, by, BALL_R, C.c, 0.95); pc(bx - BALL_R * 0.3, by - BALL_R * 0.3, BALL_R * 0.25, C.g, 0.6);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) beamAng = Math.max(-MAX_ANG, beamAng - STEP); else beamAng = Math.min(MAX_ANG, beamAng + STEP);
    game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballX === undefined) initGame(); background(); drawBeam();
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY!' : 'DROPPED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived = NEEDED - Math.max(0, timeLeft);
      if (timeLeft <= 0) { finish(true); return; }
      ballVX += GRAV * Math.sin(beamAng) * dt; ballVX *= (1 - 0.5 * dt); ballX += ballVX * dt;
      var half = BEAM_W / 2 - BALL_R;
      if (ballX < -half) { ballX = -half; ballVX = Math.abs(ballVX) * 0.5; }
      if (ballX > half) { ballX = half; ballVX = -Math.abs(ballVX) * 0.5; }
      if (Math.abs(ballX) > BEAM_W / 2 + BALL_R) { falls++; game.audio.play('se_failure', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2 + ballX, y: BEAM_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.6, col: C.c }); } if (falls >= MAX_FALL) { finish(false); return; } resetBall(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBeam();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('< TILT', W * 0.2, snap(H * 0.72), 40, C.e); txt('TILT >', W * 0.8, snap(H * 0.72), 40, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('BALANCE ' + Math.floor(survived) + ' / ' + NEEDED + 's', W / 2, 168, 46, C.b);
    for (var fi = 0; fi < MAX_FALL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALL - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
