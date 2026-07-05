// 786-mirror-dance.js
// ミラーダンス — 鏡に映る動きを見て、反転した「正しい」方向をタップせよ
// 操作: 左半分/右半分タップ（または左右スワイプ）で鏡の反転方向を選ぶ
// 成功: 10問 正解  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#03030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var MIRROR = '#0f1a2e', MIRROR_HI = '#1e3a5f', FIGURE = '#00cfff', FIGURE_R = '#ff2fa0', ARROW = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR DANCE';
  var HOW_TO_PLAY = 'THE MIRROR MOVES ONE WAY · TAP OR SWIPE THE OPPOSITE, TRUE DIRECTION';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var WAIT_DUR = 0.38;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mirPhase, mirrorDir, realDir, showTimer, showDur, figureX, waitTimer, answered, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 12; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.95); else game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#060612');
  }

  function background() { game.draw.clear(C.bg); }

  function drawFigure(cx, cy, r, col, flipped) {
    cx = snap(cx); cy = snap(cy);
    pc(cx, cy - r * 0.7, r * 0.22, col, 0.9);
    game.draw.line(cx, cy - r * 0.48, cx, cy + r * 0.2, col, 8);
    var armX = flipped ? -1 : 1;
    game.draw.line(cx, cy - r * 0.2, cx + armX * r * 0.4, cy, col, 7); game.draw.line(cx, cy - r * 0.2, cx - armX * r * 0.4, cy + r * 0.25, col, 7);
    game.draw.line(cx, cy + r * 0.2, cx + armX * r * 0.3, cy + r * 0.7, col, 8); game.draw.line(cx, cy + r * 0.2, cx - armX * r * 0.3, cy + r * 0.7, col, 8);
  }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function newRound() {
    mirrorDir = Math.random() < 0.5 ? 'left' : 'right'; realDir = mirrorDir === 'left' ? 'right' : 'left';
    showTimer = 0; figureX = 0; mirPhase = 'show'; answered = false; showDur = Math.max(0.5, 0.9 - score * 0.02);
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; waitTimer = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function evaluate(tappedLeft) {
    answered = true;
    if ((tappedLeft && realDir === 'left') || (!tappedLeft && realDir === 'right')) {
      score++; flash = 0.22; flashCol = C.b; resultText = 'CORRECT!'; resultTimer = 0.4; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.35, col: C.b }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'FLIP IT!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    waitTimer = WAIT_DUR;
  }

  function drawScene() {
    var mirrorX = snap(W * 0.15), mirrorY = snap(H * 0.18), mirrorW = snap(W * 0.7), mirrorH = snap(H * 0.45);
    game.draw.rect(mirrorX - 12, mirrorY - 12, mirrorW + 24, mirrorH + 24, '#2a3545', 0.9); game.draw.rect(mirrorX, mirrorY, mirrorW, mirrorH, MIRROR, 0.9); game.draw.rect(mirrorX, mirrorY, mirrorW, 4, MIRROR_HI, 0.5);
    txt('IN THE MIRROR', W / 2, mirrorY + 34, 30, MIRROR_HI);
    var figCX = W / 2 + figureX * mirrorW * 0.3, figCY = mirrorY + mirrorH * 0.55;
    drawFigure(figCX, figCY, 90, FIGURE_R, mirrorDir === 'left');
    if (mirPhase === 'show') arrow(mirrorDir === 'left' ? figCX - 70 : figCX + 70, figCY - 60, 40, mirrorDir === 'left' ? 'left' : 'right', ARROW);
    var playerY = snap(H * 0.72);
    drawFigure(W / 2, playerY, 80, FIGURE, false); txt('YOU', W / 2, playerY + 90, 30, FIGURE);
    if (state === S.PLAYING) {
      if (mirPhase === 'answer' && !answered) { arrow(W * 0.22, snap(H * 0.88), 36, 'left', C.g); arrow(W * 0.78, snap(H * 0.88), 36, 'right', C.g); }
      else if (mirPhase === 'show') txt('WATCH THE MIRROR...', W / 2, snap(H * 0.88), 40, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0 || mirPhase !== 'answer') return;
    evaluate(tx < W / 2);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || answered || waitTimer > 0 || mirPhase !== 'answer') return;
    if (dir === 'left' || dir === 'right') evaluate(dir === 'left');
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrorDir) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.055, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.095, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 38, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MIRROR MASTER!' : 'REFLECTION LOST', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
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
      else if (mirPhase === 'show') { showTimer += dt; var t = showTimer / showDur; figureX = mirrorDir === 'left' ? t : -t; if (showTimer >= showDur) { mirPhase = 'answer'; figureX = mirrorDir === 'left' ? 1 : -1; } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.955), 46, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#060612');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
