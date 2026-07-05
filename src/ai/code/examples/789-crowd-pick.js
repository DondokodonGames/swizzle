// 789-crowd-pick.js
// クラウドピック — 群衆の中から「指定された特徴」を持つ1体だけをタップせよ
// 操作: タップ — 指定された特徴（色 or 形）に一致する図形だけを選ぶ
// 成功: 10問 正解  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、色は保持） ──
  var C = { bg:'#050508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = ['#ff3355', '#00cfff', '#ffe600', '#a066ff', '#00ff41'];
  var COLOR_NAMES = ['RED', 'BLUE', 'YELLOW', 'PURPLE', 'GREEN'];
  var SHAPES = ['circle', 'square', 'triangle'];
  var SHAPE_NAMES = ['CIRCLE', 'SQUARE', 'TRIANGLE'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CROWD PICK';
  var HOW_TO_PLAY = 'FIND AND TAP THE ONE FIGURE THAT MATCHES THE REQUESTED COLOR OR SHAPE';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var CROWD_SIZE = 8, WAIT_DUR = 0.42;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var figures, targetColor, targetShape, useColor, waitTimer, answered, correctIdx, score, errors, done, timeLeft, elapsed, flash, flashCol, resultText, resultTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080810');
  }

  function background() { game.draw.clear(C.bg); }

  function drawShape(cx, cy, r, shape, col, alpha) {
    if (shape === 'circle') pc(cx, cy, r, col, alpha);
    else if (shape === 'square') game.draw.rect(snap(cx - r), snap(cy - r), snap(r * 2), snap(r * 2), col, alpha);
    else { for (var t = 0; t < 10; t++) { var w = r * 1.7 * (t / 10), yy = cy - r * 0.9 + t * r * 0.18; game.draw.rect(snap(cx - w / 2), snap(yy), snap(w), snap(r * 0.2), col, alpha); } }
  }

  function getFigureLayout(idx) { var col = idx % 4, row = Math.floor(idx / 4); return { cx: W * 0.12 + col * W * 0.22, cy: H * 0.30 + row * H * 0.22 }; }

  function newRound() {
    useColor = (score % 2 === 0); targetColor = Math.floor(Math.random() * COLORS.length); targetShape = Math.floor(Math.random() * SHAPES.length);
    figures = []; correctIdx = Math.floor(Math.random() * CROWD_SIZE);
    for (var i = 0; i < CROWD_SIZE; i++) {
      var col, shapeIdx;
      if (i === correctIdx) { col = targetColor; shapeIdx = targetShape; }
      else { do { col = Math.floor(Math.random() * COLORS.length); shapeIdx = Math.floor(Math.random() * SHAPES.length); } while ((useColor && col === targetColor) || (!useColor && shapeIdx === targetShape)); }
      figures.push({ colorIdx: col, shapeIdx: shapeIdx, bounce: 0 });
    }
    answered = false;
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; waitTimer = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; particles = []; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(40, snap(H * 0.10), W - 80, snap(H * 0.13), '#0a0a14', 0.9); game.draw.rect(40, snap(H * 0.10), W - 80, 4, '#1e293b', 0.6);
    var ruleLabel = useColor ? ('FIND ' + COLOR_NAMES[targetColor]) : ('FIND ' + SHAPE_NAMES[targetShape]), ruleColor = useColor ? COLORS[targetColor] : C.g;
    txt(ruleLabel, W / 2, snap(H * 0.155), 52, ruleColor);
    var exX = W * 0.82, exY = snap(H * 0.16);
    if (useColor) pc(exX, exY, 28, COLORS[targetColor], 0.9); else drawShape(exX, exY, 26, SHAPES[targetShape], C.g, 0.85);
    for (var ci = 0; ci < figures.length; ci++) {
      var fig = figures[ci], pos = getFigureLayout(ci), r = 58 * (1 + fig.bounce * 0.3);
      drawShape(pos.cx, pos.cy, r, SHAPES[fig.shapeIdx], COLORS[fig.colorIdx], 0.9);
      if (answered && ci === correctIdx) ring(pos.cx, pos.cy, r + 18, C.b, 0.6);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0) return;
    var hitIdx = -1;
    for (var i = 0; i < figures.length; i++) { var pos = getFigureLayout(i), dx = tx - pos.cx, dy = ty - pos.cy; if (Math.sqrt(dx * dx + dy * dy) < 80) { hitIdx = i; break; } }
    if (hitIdx < 0) return;
    answered = true;
    if (hitIdx === correctIdx) {
      score++; flash = 0.22; flashCol = C.b; resultText = 'CORRECT!'; resultTimer = 0.38; game.audio.play('se_success', 0.6); figures[hitIdx].bounce = 0.5;
      var pos2 = getFigureLayout(hitIdx);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: pos2.cx, y: pos2.cy, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.38, col: COLORS[figures[hitIdx].colorIdx] }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    waitTimer = WAIT_DUR;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!figures) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.055, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.09, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'EAGLE EYE!' : 'LOST IN CROWD', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      for (var i = 0; i < figures.length; i++) if (figures[i].bounce > 0) figures[i].bounce -= dt * 4;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.85), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#080810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
