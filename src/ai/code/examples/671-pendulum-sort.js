// 671-pendulum-sort.js
// ペンデュラムソート — 振り子で揺れる球が同じ色のバケツ上に来た瞬間タップで落として仕分ける
// 操作: タップで糸を切って球を落とす。球の色と同じ色のバケツ上ならピッタリ、外すとミス
// 成功: 10個 仕分け  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、仕分け工場／球色は保持） ──
  var C = { bg:'#020810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL_COLORS = ['#ff2079', '#00cfff', '#ffe600'];
  var BUCKET_COLS = ['#5a0f2a', '#0f2a4a', '#4a3a0f'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PENDULUM SORT';
  var HOW_TO_PLAY = 'TAP TO DROP THE SWINGING BALL WHEN IT IS OVER THE MATCHING BUCKET';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 20 → 10
  var MAX_MISS = 3;          // 修正2: 6 → 3
  var PIVOT_X = W / 2, PIVOT_Y = snap(H * 0.16), ROPE_LEN = 420, BALL_R = 64, BUCKET_W = 260, BUCKET_H = 170, BUCKET_Y = snap(H * 0.74);
  var BUCKET_X = [W * 0.2, W * 0.5, W * 0.8], PENDULUM_G = 4.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pendAngle, pendVel, ballColorIdx, releasing, releaseX, releaseY, releaseVX, releaseVY, sorted, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, lock;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030610');
  }

  function background() { game.draw.clear(C.bg); }

  function newBall() { ballColorIdx = Math.floor(Math.random() * 3); pendAngle = (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.3); pendVel = 0; releasing = false; lock = false; }

  function initGame() { sorted = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newBall(); }

  function ballPos() { return { x: PIVOT_X + Math.sin(pendAngle) * ROPE_LEN, y: PIVOT_Y + Math.cos(pendAngle) * ROPE_LEN }; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sorted * 500 + Math.ceil(timeLeft) * 100) : sorted * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < 3; bi++) { var bx = BUCKET_X[bi] - BUCKET_W / 2; game.draw.rect(snap(bx), BUCKET_Y, BUCKET_W, BUCKET_H, BUCKET_COLS[bi], 0.85); game.draw.rect(snap(bx), BUCKET_Y, BUCKET_W, 14, BALL_COLORS[bi], 0.7); pc(BUCKET_X[bi], BUCKET_Y + BUCKET_H / 2, 36, BALL_COLORS[bi], 0.7); }
    pc(PIVOT_X, PIVOT_Y, 16, '#64748b', 0.9);
    if (!releasing) {
      var pos = ballPos();
      game.draw.line(PIVOT_X, PIVOT_Y, pos.x, pos.y - BALL_R, '#94a3b8', 3);
      pc(pos.x, pos.y, BALL_R, BALL_COLORS[ballColorIdx], 0.9); pc(pos.x - BALL_R * 0.3, pos.y - BALL_R * 0.3, BALL_R * 0.25, C.g, 0.35);
      if (pos.x >= BUCKET_X[ballColorIdx] - BUCKET_W / 2 && pos.x <= BUCKET_X[ballColorIdx] + BUCKET_W / 2) txt('TAP!', pos.x, pos.y - BALL_R - 40, 44, C.b);
    } else pc(releaseX, releaseY, BALL_R, BALL_COLORS[ballColorIdx], 0.9);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || releasing || lock) return;
    var pos = ballPos(), overBucket = -1;
    for (var i = 0; i < 3; i++) if (pos.x >= BUCKET_X[i] - BUCKET_W / 2 - 20 && pos.x <= BUCKET_X[i] + BUCKET_W / 2 + 20) { overBucket = i; break; }
    releasing = true; lock = true; releaseX = pos.x; releaseY = pos.y; var spd = pendVel * ROPE_LEN; releaseVX = Math.cos(pendAngle) * spd; releaseVY = Math.sin(pendAngle) * spd * 0.2 + 200;
    if (overBucket >= 0 && overBucket === ballColorIdx) {
      sorted++; flash = 0.3; flashCol = C.b; resultText = 'MATCH!'; resultTimer = 0.5; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: pos.x, y: pos.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: BALL_COLORS[ballColorIdx] }); }
      if (sorted >= NEEDED) { finish(true); return; }
    } else { misses++; flash = 0.35; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
    setTimeout(newBall, 700);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (ballColorIdx === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SORTED!' : 'SPILLED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (!releasing) { pendVel += (-PENDULUM_G * Math.sin(pendAngle) - pendVel * 0.3) * dt; pendAngle += pendVel * dt; }
      else { releaseVY += 900 * dt; releaseX += releaseVX * dt; releaseY += releaseVY * dt; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.63), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sorted + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#030610');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
