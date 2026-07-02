// 181-clone-dodge.js
// クローン回避 — 0.5秒遅れのゴーストが追ってくる、自分の軌跡を避ける不思議なゲーム
// 操作: タップで移動先を指定
// 成功: 6秒クローンに当たらず逃げ続ける  失敗: クローンに追いつかれる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ミラー空間） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CLONE DODGE';
  var HOW_TO_PLAY = 'TAP TO FLEE · YOUR 0.5s GHOST CHASES YOU';
  var NEEDED   = 6;              // 修正2: 25 → 6（サバイバル短縮）
  var TOP    = 220, BOTTOM = H - 180;
  var PLAYER_R = 34, CLONE_R = 32, MOVE_SPEED = 480, DELAY = 0.5, FRICTION = 0.82;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, history, elapsed, cloneX, cloneY, survived, timeLeft, done, trail;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gy = TOP; gy < BOTTOM; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.15);
  }

  function drawPlayer(x, y) {
    pc(x, y, PLAYER_R, C.b, 1);
    game.draw.rect(x - 14, y - 10, 10, 12, C.bg); game.draw.rect(x + 4, y - 10, 10, 12, C.bg);
    game.draw.rect(x - 10, y + 12, 20, 6, C.bg);
  }

  function drawClone(x, y) {
    pc(x, y, CLONE_R, C.a, 0.7);
    game.draw.rect(x - 14, y - 10, 10, 12, C.g); game.draw.rect(x + 4, y - 10, 10, 12, C.g);
  }

  function initGame() {
    px = W / 2; py = H * 0.6; pvx = 0; pvy = 0; history = []; elapsed = 0;
    cloneX = W / 2; cloneY = H * 0.4; survived = 0; timeLeft = NEEDED; done = false; trail = [];
    for (var i = 0; i < 50; i++) history.push({ x: px, y: py, t: -DELAY + i * 0.01 });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.round(survived) * 100) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - px, dy = y - py, len = Math.hypot(dx, dy);
    if (len < 10) return;
    pvx = (dx / len) * MOVE_SPEED; pvy = (dy / len) * MOVE_SPEED;
    game.audio.play('se_tap', 0.15);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    pvx = 0; pvy = 0;
    if (dir === 'up') pvy = -MOVE_SPEED; else if (dir === 'down') pvy = MOVE_SPEED;
    else if (dir === 'left') pvx = -MOVE_SPEED; else if (dir === 'right') pvx = MOVE_SPEED;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawClone(W / 2, H * 0.42); drawPlayer(W / 2, H * 0.56);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'CAUGHT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var dx = px - cloneX, dy = py - cloneY, dist = Math.hypot(dx, dy);
    if (!done) {
      timeLeft -= dt; survived += dt; elapsed += dt;
      if (timeLeft <= 0) { finish(true); return; }
      pvx *= Math.pow(FRICTION, dt * 60); pvy *= Math.pow(FRICTION, dt * 60);
      px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px + pvx * dt));
      py = Math.max(TOP + PLAYER_R, Math.min(BOTTOM - PLAYER_R, py + pvy * dt));
      history.push({ x: px, y: py, t: elapsed });
      if (history.length > 200) history.shift();
      var tt = elapsed - DELAY;
      for (var hi = 0; hi < history.length; hi++) if (history[hi].t >= tt) { cloneX = history[Math.max(0, hi - 1)].x; cloneY = history[Math.max(0, hi - 1)].y; break; }
      trail.push({ x: cloneX, y: cloneY, life: 0.4 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      dx = px - cloneX; dy = py - cloneY; dist = Math.hypot(dx, dy);
      if (dist < PLAYER_R + CLONE_R - 8 && elapsed > DELAY + 0.5) { finish(false); return; }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < trail.length; ti2++) pc(trail[ti2].x, trail[ti2].y, CLONE_R * trail[ti2].life * 1.5, C.a, trail[ti2].life * 0.3);
    drawClone(cloneX, cloneY);
    drawPlayer(px, py);
    if (dist < 200 && elapsed > DELAY + 0.5) game.draw.rect(0, 0, W, H, C.a, (1 - dist / 200) * 0.2);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt('RUN AWAY!', W / 2, H - 120, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
