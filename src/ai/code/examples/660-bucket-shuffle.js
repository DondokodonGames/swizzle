// 660-bucket-shuffle.js
// バケツシャッフル — 落ちてくる玉と同じ色のバケツを、画面左右タップで選んで仕分ける
// 操作: 玉の色を見て、その色のバケツがある側（左/右）をタップ。数回ごとに色が入れ替わる
// 成功: 10個 仕分け  失敗: 3回 間違い or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、仕分け場／玉色は保持） ──
  var C = { bg:'#040a0c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = ['#ff2079', '#00cfff', '#ffe600'];
  var BUCKET_COLS = ['#5a0f2a', '#0f2a4a', '#4a3a0f'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUCKET SHUFFLE';
  var HOW_TO_PLAY = 'TAP THE SIDE WITH THE BUCKET MATCHING THE FALLING BALL · COLORS SWAP OFTEN';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var BUCKET_Y = snap(H * 0.78), BUCKET_W = 280, BUCKET_H = 200, SWAP_EVERY = 4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var leftColorIdx, rightColorIdx, ballColorIdx, ballY, ballX, ballFalling, sorted, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, nextSwap, swapAnim, lock;
  var BALL_SPEED = 700;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#08121a');
  }

  function background() { game.draw.clear(C.bg); }

  function newBall() { ballColorIdx = Math.floor(Math.random() * COLORS.length); ballY = H * 0.24; ballX = W / 2; ballFalling = true; lock = false; }

  function shuffleBuckets() {
    if (Math.random() < 0.5) { var t = leftColorIdx; leftColorIdx = rightColorIdx; rightColorIdx = t; }
    else { var ni = Math.floor(Math.random() * COLORS.length); if (Math.random() < 0.5) leftColorIdx = ni; else rightColorIdx = ni; }
    swapAnim = 0.5; game.audio.play('se_tap', 0.2);
  }

  function initGame() { leftColorIdx = 0; rightColorIdx = 1; sorted = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; nextSwap = SWAP_EVERY; swapAnim = 0; newBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sorted * 500 + Math.ceil(timeLeft) * 100) : sorted * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(snap(W / 2) - 1, H * 0.4, 2, H * 0.36, C.g, 0.1); txt('OR', W / 2, snap(H * 0.56), 40, '#ffffff44');
    var ls = swapAnim > 0 ? swapAnim * 20 : 0;
    game.draw.rect(snap(W / 4 - BUCKET_W / 2 + ls), BUCKET_Y, BUCKET_W, BUCKET_H, BUCKET_COLS[leftColorIdx], 0.9); game.draw.rect(snap(W / 4 - BUCKET_W / 2 + ls), BUCKET_Y, BUCKET_W, 16, COLORS[leftColorIdx], 0.7); pc(W / 4 + ls, BUCKET_Y + BUCKET_H / 2, 44, COLORS[leftColorIdx], 0.85);
    var rs = swapAnim > 0 ? -swapAnim * 20 : 0;
    game.draw.rect(snap(W * 3 / 4 - BUCKET_W / 2 + rs), BUCKET_Y, BUCKET_W, BUCKET_H, BUCKET_COLS[rightColorIdx], 0.9); game.draw.rect(snap(W * 3 / 4 - BUCKET_W / 2 + rs), BUCKET_Y, BUCKET_W, 16, COLORS[rightColorIdx], 0.7); pc(W * 3 / 4 + rs, BUCKET_Y + BUCKET_H / 2, 44, COLORS[rightColorIdx], 0.85);
    if (swapAnim > 0) txt('SHUFFLE!', W / 2, snap(BUCKET_Y - 40), 44, C.g);
    if (ballY < BUCKET_Y + 40) { pc(ballX, ballY, 68, COLORS[ballColorIdx], 0.92); pc(ballX - 22, ballY - 22, 24, C.g, 0.35); }
    if (ballFalling) txt('WHICH SIDE?', W / 2, snap(H * 0.42), 40, '#ffffff55');
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !ballFalling || lock) return;
    var choseLeft = tx < W / 2, chosen = choseLeft ? leftColorIdx : rightColorIdx;
    ballFalling = false; ballX = choseLeft ? W / 4 : W * 3 / 4; ballY = BUCKET_Y - 30; lock = true;
    if (chosen === ballColorIdx) {
      sorted++; flash = 0.3; flashCol = C.b; resultText = 'MATCH!'; resultTimer = 0.5; game.audio.play('se_success', 0.55);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: ballX, y: BUCKET_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: COLORS[ballColorIdx] }); }
      if (sorted >= nextSwap) { nextSwap += SWAP_EVERY; shuffleBuckets(); }
      if (sorted >= NEEDED) { finish(true); return; }
    } else { misses++; flash = 0.35; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
    setTimeout(newBall, 500);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (leftColorIdx === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.60, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SORTED!' : 'MIXED UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (swapAnim > 0) swapAnim -= dt * 3;
      if (ballFalling) ballY += BALL_SPEED * dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.70), 68, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sorted + ' / ' + NEEDED + '   NEXT SWAP ' + (nextSwap - sorted), W / 2, 168, 38, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#08121a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
