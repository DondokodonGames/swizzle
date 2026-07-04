// 685-color-sort.js
// カラーソート — 落ちてくる玉を瞬時に左右のバケツへ仕分ける
// 操作: 玉の色を見て、赤なら画面左をタップ、青なら画面右をタップ
// 成功: 12個 仕分け  失敗: 3個 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、玉色は保持） ──
  var C = { bg:'#04060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL_COLORS = ['#ff2079', '#00cfff']; // red=left, blue=right
  var BALL_NAMES  = ['RED', 'BLUE'];
  var BALL_BUCKET = [0, 1]; // 0=left, 1=right

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR SORT';
  var HOW_TO_PLAY = 'TAP LEFT FOR RED · TAP RIGHT FOR BLUE · SORT THE FALLING BALLS';
  var MAX_TIME = 20;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var BUCKET_Y = snap(H * 0.80), BUCKET_W = 360, BUCKET_H = 100, BUCKET_LX = W * 0.25, BUCKET_RX = W * 0.75;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, answered, waitTimer, correct, missed, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#060810');
  }

  function background() { game.draw.clear(C.bg); }

  function newBall() {
    ball = { x: W / 2 + (Math.random() - 0.5) * 200, y: -50, r: 55, colorIdx: Math.floor(Math.random() * 2), speed: 380 + elapsed * 4 + Math.random() * 120 };
    answered = false;
  }

  function initGame() { correct = 0; missed = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; newBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 400 + Math.ceil(timeLeft) * 100) : correct * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.line(W / 2, H * 0.12, W / 2, BUCKET_Y, '#ffffff0a', 2);
    txt('< RED', W * 0.25, H * 0.15, 44, '#ff207966');
    txt('BLUE >', W * 0.75, H * 0.15, 44, '#00cfff66');
    // Left bucket (red)
    game.draw.rect(BUCKET_LX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, BUCKET_H, BALL_COLORS[0], 0.8);
    game.draw.rect(BUCKET_LX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, 14, C.g, 0.4);
    txt('RED', BUCKET_LX, BUCKET_Y + BUCKET_H * 0.6 + 8, 44, C.g);
    // Right bucket (blue)
    game.draw.rect(BUCKET_RX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, BUCKET_H, BALL_COLORS[1], 0.8);
    game.draw.rect(BUCKET_RX - BUCKET_W / 2, BUCKET_Y, BUCKET_W, 14, C.g, 0.4);
    txt('BLUE', BUCKET_RX, BUCKET_Y + BUCKET_H * 0.6 + 8, 44, C.g);
    // Ball
    if (ball) {
      pc(ball.x, ball.y, ball.r, BALL_COLORS[ball.colorIdx], 0.9);
      pc(ball.x - ball.r * 0.3, ball.y - ball.r * 0.35, ball.r * 0.25, C.g, 0.35);
      txt(BALL_NAMES[ball.colorIdx], ball.x, ball.y + 12, 36, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !ball || answered) return;
    var side = tx < W / 2 ? 0 : 1;
    answered = true;
    if (side === BALL_BUCKET[ball.colorIdx]) {
      correct++; flash = 0.25; flashCol = C.b; resultText = 'CORRECT!'; resultTimer = 0.4; game.audio.play('se_success', 0.5);
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: ball.x, y: ball.y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: BALL_COLORS[ball.colorIdx] }); }
      if (correct >= NEEDED) { finish(true); return; }
      waitTimer = 0.35;
    } else {
      missed++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.45; game.audio.play('se_failure', 0.4);
      if (missed >= MAX_MISS) { finish(false); return; }
      waitTimer = 0.35;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ball) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.62, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'MIXED UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) { ball = null; newBall(); } }
      if (ball && !answered) {
        ball.y += ball.speed * dt;
        if (ball.y > H + ball.r) {
          missed++; flash = 0.3; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.25);
          ball = null; answered = true;
          if (missed >= MAX_MISS) { finish(false); return; }
          waitTimer = 0.25;
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.66), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#060810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
