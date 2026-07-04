// 605-shadow-puppet.js
// シャドーパペット — スクリーンに映る影絵の輪郭をスワイプでなぞって再現する
// 操作: 影の形をスワイプでなぞる → タップで判定。一致率70%以上で合格
// 成功: 3形 合格  失敗: 3回 不合格 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵劇場） ──
  var C = { bg:'#080510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW PUPPET';
  var HOW_TO_PLAY = 'TRACE THE SHADOW OUTLINE BY SWIPING · TAP TO JUDGE · 70% TO PASS';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_FAIL = 3;          // 修正2: 6 → 3

  var SHAPES = [
    [[0.3,0.5],[0.5,0.3],[0.7,0.5],[0.5,0.7],[0.3,0.5],[0.1,0.4],[0.3,0.5]],
    [[0.2,0.7],[0.5,0.3],[0.8,0.7],[0.7,0.7],[0.7,0.9],[0.3,0.9],[0.3,0.7],[0.2,0.7]],
    [[0.5,0.8],[0.2,0.55],[0.2,0.35],[0.35,0.2],[0.5,0.35],[0.65,0.2],[0.8,0.35],[0.8,0.55],[0.5,0.8]],
    [[0.5,0.15],[0.25,0.5],[0.38,0.5],[0.38,0.85],[0.62,0.85],[0.62,0.5],[0.75,0.5],[0.5,0.15]],
    [[0.5,0.2],[0.8,0.5],[0.65,0.5],[0.65,0.8],[0.35,0.8],[0.35,0.5],[0.2,0.5],[0.5,0.2]]
  ];
  var SHAPE_NAMES = ['BIRD', 'HOUSE', 'HEART', 'TREE', 'ARROW'];
  var PLAY_W = W * 0.78, PLAY_H = snap(H * 0.40), PLAY_OX = snap((W - PLAY_W) / 2), PLAY_OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentShape, targetPoints, tracePoints, isTracing, traceComplete, matchScore, successes, fails, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function loadShape() {
    var shape = SHAPES[currentShape % SHAPES.length];
    targetPoints = shape.map(function(p) { return { x: PLAY_OX + p[0] * PLAY_W, y: PLAY_OY + p[1] * PLAY_H }; });
    tracePoints = []; traceComplete = false; matchScore = 0; isTracing = false;
  }

  function calcMatchScore() {
    if (tracePoints.length < 5) return 0;
    var total = 0, threshold = 70;
    for (var ti = 0; ti < targetPoints.length; ti++) {
      var tp = targetPoints[ti], minD = 1e9;
      for (var tri = 0; tri < tracePoints.length; tri++) { var dx = tracePoints[tri].x - tp.x, dy = tracePoints[tri].y - tp.y, d = Math.sqrt(dx * dx + dy * dy); if (d < minD) minD = d; }
      total += Math.max(0, 1 - minD / threshold);
    }
    return total / targetPoints.length;
  }

  function initGame() { currentShape = 0; successes = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; loadShape(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 800 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function evaluate() {
    traceComplete = true; matchScore = calcMatchScore();
    var ok = matchScore >= 0.70;
    if (ok) {
      successes++; flash = 0.4; flashCol = C.b; resultText = Math.round(matchScore * 100) + '%  PASS'; resultTimer = 1.0; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PLAY_OX + PLAY_W / 2, y: PLAY_OY + PLAY_H / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.c }); }
      if (successes >= NEEDED) { finish(true); return; }
      currentShape++; setTimeout(function() { if (!done) loadShape(); }, 1300);
    } else {
      fails++; flash = 0.4; flashCol = C.a; resultText = Math.round(matchScore * 100) + '%  FAIL'; resultTimer = 1.0; game.audio.play('se_failure', 0.3);
      if (fails >= MAX_FAIL) { finish(false); return; }
      currentShape++; setTimeout(function() { if (!done) loadShape(); }, 1300);
    }
  }

  function drawScene() {
    game.draw.rect(PLAY_OX - 12, PLAY_OY - 12, PLAY_W + 24, PLAY_H + 24, C.d, 0.15);
    game.draw.rect(PLAY_OX, PLAY_OY, PLAY_W, PLAY_H, '#000005', 0.9);
    pc(PLAY_OX + PLAY_W / 2, PLAY_OY + PLAY_H * 0.45, PLAY_W * 0.3, C.g, 0.03);
    for (var ti = 0; ti < targetPoints.length - 1; ti++) game.draw.line(targetPoints[ti].x, targetPoints[ti].y, targetPoints[ti + 1].x, targetPoints[ti + 1].y, '#2a1a40', 10);
    for (var ti2 = 0; ti2 < targetPoints.length - 1; ti2++) game.draw.line(targetPoints[ti2].x, targetPoints[ti2].y, targetPoints[ti2 + 1].x, targetPoints[ti2 + 1].y, C.d, 3);
    for (var tri = 0; tri < tracePoints.length - 1; tri++) {
      var col = traceComplete ? (matchScore >= 0.70 ? C.b : C.a) : C.c;
      game.draw.line(tracePoints[tri].x, tracePoints[tri].y, tracePoints[tri + 1].x, tracePoints[tri + 1].y, col, 6);
    }
    txt(SHAPE_NAMES[currentShape % SHAPE_NAMES.length], W / 2, PLAY_OY - 30, 40, C.e);
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || traceComplete) return;
    isTracing = true; var steps = 10;
    for (var i = 0; i <= steps; i++) { var t = i / steps; tracePoints.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }); }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || traceComplete) return;
    if (isTracing && tracePoints.length > 5) evaluate();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targetPoints) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PUPPET MASTER!' : 'CURTAIN DOWN', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(PLAY_OY + PLAY_H + 60), 52, flashCol);
    else if (!isTracing) txt('SWIPE TO TRACE', W / 2, snap(PLAY_OY + PLAY_H + 60), 34, C.e);
    else txt('TAP TO JUDGE', W / 2, snap(PLAY_OY + PLAY_H + 60), 34, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
