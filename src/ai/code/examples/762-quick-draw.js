// 762-quick-draw.js
// クイックドロウ — 「DRAW!」が出た瞬間に最速でタップする早撃ち勝負
// 操作: DRAW! が出たらタップ。出る前にタップ(フライング)、遅すぎもミス
// 成功: 8回 成功  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、荒野の決闘） ──
  var C = { bg:'#0e0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GUN = '#a16207', GUN_HI = '#ffe600', MUZZLE = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'QUICK DRAW';
  var HOW_TO_PLAY = 'WAIT FOR DRAW! THEN TAP AS FAST AS YOU CAN · TAP EARLY OR TOO LATE MISSES';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var RESULT_DUR = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var drawPhase, waitTimer, waitDur, drawWindow, drawTimer, reactionStart, resultTimer, score, errors, timeLeft, done, elapsed, muzzleFlash, flash, flashCol, resultText, dust;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#140800');
  }

  function background(bgCol) { game.draw.clear(bgCol || C.bg); }

  function startRound() { waitDur = 1.0 + Math.random() * 2.0; waitTimer = waitDur; muzzleFlash = 0; drawPhase = 'wait'; drawWindow = Math.max(0.30, 0.45 - score * 0.01); }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; muzzleFlash = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; dust = []; startRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 150) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function fail(label) { errors++; flash = 0.4; flashCol = C.a; resultText = label; resultTimer = RESULT_DUR; game.audio.play('se_failure', 0.4); drawPhase = 'result'; if (errors >= MAX_ERR) { finish(false); return true; } return false; }

  function drawScene(bgCol) {
    background(bgCol);
    pc(W / 2, snap(H * 0.15), 60, C.c, 0.15);
    game.draw.rect(0, H * 0.72, W, H * 0.28, '#1c0d00', 0.9); game.draw.rect(0, H * 0.72, W, 12, GUN, 0.5);
    var gunX = W / 2, gunY = snap(H * 0.55);
    game.draw.rect(gunX - 22, gunY - 10, 44, 22, GUN, 0.9); game.draw.rect(gunX + 32, gunY - 4, 32, 6, GUN_HI, 0.85);
    if (muzzleFlash > 0) { pc(gunX + 68, gunY - 1, 22 * muzzleFlash, MUZZLE, muzzleFlash * 0.9); pc(gunX + 68, gunY - 1, 12 * muzzleFlash, C.g, muzzleFlash * 0.8); }
    if (drawPhase === 'wait') { txt('...', W / 2, snap(H * 0.36), 72, '#ffe60066'); txt('WAIT...', W / 2, snap(H * 0.45), 52, '#ffffff55'); }
    else if (drawPhase === 'draw') { var pulse = 1.0 + 0.04 * Math.sin(elapsed * 40); txt('DRAW!', W / 2, snap(H * 0.36), Math.floor(140 * pulse), MUZZLE); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || drawPhase === 'result') return;
    if (drawPhase === 'wait') { fail('EARLY!'); return; }
    if (drawPhase === 'draw') {
      var ms = Math.round(Date.now() - reactionStart); score++; muzzleFlash = 0.5; flash = 0.22; flashCol = C.b;
      resultText = ms < 200 ? 'BLAZING  ' + ms + 'ms' : ms < 300 ? 'FAST  ' + ms + 'ms' : ms + 'ms'; resultTimer = RESULT_DUR; drawPhase = 'result'; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 6; p++) { var pa = -Math.PI * 0.7 + Math.random() * Math.PI * 0.5; dust.push({ x: W * 0.5 + Math.cos(pa) * 40, y: H * 0.55, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: MUZZLE }); }
      if (score >= NEEDED) { finish(true); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (drawPhase === undefined) initGame(); drawScene(C.bg);
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.86, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(C.bg);
      txt(resultSuccess ? 'FASTEST GUN!' : 'OUTDRAWN', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (drawPhase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) { drawPhase = 'draw'; drawTimer = drawWindow; reactionStart = Date.now(); } }
      else if (drawPhase === 'draw') { drawTimer -= dt; if (drawTimer <= 0) { if (fail('TOO SLOW!')) return; } }
      else if (drawPhase === 'result') { resultTimer -= dt; if (resultTimer <= 0) startRound(); }
      if (muzzleFlash > 0) muzzleFlash -= dt * 4; if (flash > 0) flash -= dt * 3;
      for (var pp = dust.length - 1; pp >= 0; pp--) { var p = dust[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2.8; if (p.life <= 0) dust.splice(pp, 1); }
    }

    // ---- 描画 ----
    var bgCol = drawPhase === 'draw' ? '#3d1a00' : C.bg;
    drawScene(bgCol);
    for (var pp2 = 0; pp2 < dust.length; pp2++) game.draw.rect(snap(dust[pp2].x) - 5, snap(dust[pp2].y) - 5, 10, 10, dust[pp2].col, dust[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.22), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#140800');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
