// 572-balloon-pop.js
// バルーンポップ — 上部に指定された色の風船だけをタップで割る。違う色を割るとミス
// 操作: 指定色（バナー表示）の風船をタップで割る（誤った色を割ると指定色が変わる）
// 成功: 指定色を 8個 割る  失敗: 3回 誤爆 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、縁日） ──
  var C = { bg:'#0a0614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALLOONS = [
    { fill: '#ff2079', name: 'PINK' },
    { fill: '#00cfff', name: 'CYAN' },
    { fill: '#00ff9f', name: 'GREEN' },
    { fill: '#ffe600', name: 'YELLOW' },
    { fill: '#7700ff', name: 'PURPLE' }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALLOON POP';
  var HOW_TO_PLAY = 'POP ONLY THE BALLOONS OF THE TARGET COLOR SHOWN ABOVE';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_WRONG = 3;         // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, balloons, popped, wrongPops, timeLeft, done, particles, nextBalloon, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#140a20');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBalloon() { var ci = Math.floor(Math.random() * BALLOONS.length), r = 50 + Math.random() * 26; balloons.push({ x: r + Math.random() * (W - r * 2), y: H + r + 20, r: r, colorIdx: ci, vy: -(140 + Math.random() * 100), vx: (Math.random() - 0.5) * 60, wobble: Math.random() * Math.PI * 2, wobbleSpeed: 2 + Math.random() * 2 }); }

  function initGame() { target = Math.floor(Math.random() * BALLOONS.length); balloons = []; popped = 0; wrongPops = 0; timeLeft = MAX_TIME; done = false; particles = []; nextBalloon = 0.5; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 500 + Math.ceil(timeLeft) * 100) : popped * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < balloons.length; i++) {
      var b = balloons[i], col = BALLOONS[b.colorIdx].fill, wx = Math.sin(b.wobble) * 8, isT = b.colorIdx === target;
      game.draw.rect(snap(b.x + wx) - 1, snap(b.y + b.r), 2, 80, '#8b7355', 0.9);
      pc(b.x + wx, b.y, b.r, col, 0.9); pc(b.x + wx - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.3, C.g, 0.5);
      if (isT) pc(b.x + wx, b.y, b.r + 12, col, 0.2 + Math.sin(game.time.elapsed * 6) * 0.1);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i]; if (Math.hypot(tx - b.x, ty - b.y) < b.r + 10) {
        var col = BALLOONS[b.colorIdx].fill; for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: col }); }
        var isC = b.colorIdx === target; balloons.splice(i, 1);
        if (isC) { popped++; flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.6); if (popped >= NEEDED) { finish(true); return; } }
        else { wrongPops++; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.3); target = Math.floor(Math.random() * BALLOONS.length); if (wrongPops >= MAX_WRONG) { finish(false); return; } }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balloons) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.52, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL POPPED!' : 'TOO MANY MISSES', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      nextBalloon -= dt; if (nextBalloon <= 0) { spawnBalloon(); if (Math.random() < 0.3) spawnBalloon(); nextBalloon = 0.4 + Math.random() * 0.5; }
      for (var i = balloons.length - 1; i >= 0; i--) { var b = balloons[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.wobble += b.wobbleSpeed * dt; if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); } if (b.y + b.r < -20) balloons.splice(i, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    var tc = BALLOONS[target];
    pc(W / 2 - 180, 156, 30, tc.fill, 0.95); txt('POP ' + tc.name, W / 2 + 30, 170, 46, tc.fill);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 232, 44, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 268, 20, 20, wi < wrongPops ? C.a : '#140a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
