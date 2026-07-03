// 547-paper-fold.js
// ペーパーフォールド — 上部に示された折り順を覚え、その方向へ順番にスワイプして折り上げる
// 操作: 指示された矢印の方向へスワイプ（順番通りに折る、間違えるとエラー）
// 成功: 2ラウンド 完成  失敗: 3回 誤り or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、折り紙） ──
  var C = { bg:'#1a1a2e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PAPER FOLD';
  var HOW_TO_PLAY = 'MEMORIZE THE FOLD ORDER · SWIPE EACH ARROW DIRECTION IN TURN';
  var MAX_TIME = 18;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var MAX_ERRORS = 3;        // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.44), PAPER = 420;
  var FOLD_DIRS = ['up', 'down', 'left', 'right'];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, currentIdx, round, roundsWon, errors, timeLeft, done, foldAnim, foldDir, foldResult, foldTimer, particles, flash, flashCol, folds;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function arrow(cx, cy, size, dir, color, alpha) {
    cx = snap(cx); cy = snap(cy); var s = 8;
    for (var i = 0; i < size / s; i++) {
      var w = (size / s - i) * s;
      if (dir === 'up') game.draw.rect(cx - w / 2, cy - size / 2 + i * s, w, s, color, alpha);
      else if (dir === 'down') game.draw.rect(cx - w / 2, cy + size / 2 - i * s - s, w, s, color, alpha);
      else if (dir === 'left') game.draw.rect(cx - size / 2 + i * s, cy - w / 2, s, w, color, alpha);
      else game.draw.rect(cx + size / 2 - i * s - s, cy - w / 2, s, w, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0e0e1e');
  }

  function background() { game.draw.clear(C.bg); }

  function genSequence() { sequence = []; var len = Math.min(3 + round, 6); for (var i = 0; i < len; i++) sequence.push(FOLD_DIRS[Math.floor(Math.random() * FOLD_DIRS.length)]); currentIdx = 0; folds = []; }

  function initGame() { round = 0; roundsWon = 0; errors = 0; timeLeft = MAX_TIME; done = false; foldAnim = 0; foldDir = null; foldResult = ''; foldTimer = 0; particles = []; flash = 0; flashCol = C.b; genSequence(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (roundsWon * 1000 + Math.ceil(timeLeft) * 100) : roundsWon * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // 折り順表示
    var seqY = snap(H * 0.16);
    txt('FOLD ORDER', W / 2, seqY - 44, 30, C.c);
    for (var si = 0; si < sequence.length; si++) {
      var sx = W / 2 - (sequence.length - 1) * 68 + si * 136, isC = si < currentIdx, isCur = si === currentIdx, col = isC ? C.b : isCur ? C.c : '#445566';
      game.draw.rect(sx - 44, seqY - 34, 88, 88, isCur ? '#3a3a10' : '#1c1c2e', 0.8);
      arrow(sx, seqY + 10, isCur ? 56 : 44, sequence[si], col, 0.95);
    }
    // 紙
    var px = CX - PAPER / 2, py = CY - PAPER / 2, w = PAPER, h = PAPER, offX = 0, offY = 0;
    for (var fi = 0; fi < folds.length; fi++) { if (folds[fi] === 'right') { w *= 0.5; offX += w; } if (folds[fi] === 'left') w *= 0.5; if (folds[fi] === 'down') { h *= 0.5; offY += h; } if (folds[fi] === 'up') h *= 0.5; }
    game.draw.rect(px + 12, py + 12, PAPER, PAPER, '#0a0a18', 0.5);
    game.draw.rect(px + offX, py + offY, w, h, '#e8e0f0', 0.95);
    for (var li = 1; li < 4; li++) { game.draw.rect(px + offX, py + offY + h * li / 4, w, 2, C.d, 0.3); game.draw.rect(px + offX + w * li / 4, py + offY, 2, h, C.d, 0.3); }
    game.draw.rect(px + offX, py + offY, w * 0.3, h * 0.3, C.g, 0.4);
    if (foldAnim > 0 && foldDir) { var fx = px + offX, fy = py + offY; if (foldDir === 'left' || foldDir === 'right') game.draw.rect(fx + w / 2 - 3, fy, 6, h, C.a, 0.8); else game.draw.rect(fx, fy + h / 2 - 3, w, 6, C.a, 0.8); }
    // スワイプ操作ヒント
    txt('SWIPE TO FOLD', W / 2, snap(CY + PAPER / 2 + 110), 40, C.e);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || foldAnim > 0) return;
    if (dir === sequence[currentIdx]) {
      folds.push(dir); currentIdx++; foldAnim = 0.35; foldDir = dir; foldResult = 'OK'; foldTimer = 0.5; flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.5);
      if (currentIdx >= sequence.length) {
        roundsWon++; foldResult = 'COMPLETE!'; foldTimer = 1.2; game.audio.play('se_success', 0.9);
        for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.b }); }
        if (roundsWon >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) { round++; genSequence(); } }, 1100);
      }
    } else { errors++; foldResult = 'NG'; foldTimer = 0.5; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.4); if (errors >= MAX_ERRORS) { finish(false); return; } }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.075, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.11, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORIGAMI MASTER!' : 'CREASED WRONG', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (foldAnim > 0) foldAnim -= dt * 3; if (foldTimer > 0) foldTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (foldTimer > 0) txt(foldResult, W / 2, snap(CY - PAPER / 2 - 60), foldResult === 'NG' ? 56 : 64, foldResult === 'NG' ? C.a : C.b);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(roundsWon + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERRORS; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERRORS - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0e0e1e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
