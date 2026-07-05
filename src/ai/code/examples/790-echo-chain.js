// 790-echo-chain.js
// エコーチェーン — 光のパターンを覚えて、同じ順序で再現せよ
// 操作: タップ — 表示されたパネルの光の順序をそのままなぞる
// 成功: 8セット 完走  失敗: 3回 ミス or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パネル色は保持） ──
  var C = { bg:'#03060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PANEL_OFF = '#0a1520';
  var PANEL_COLORS = ['#ff3355', '#00ff41', '#00cfff', '#ffe600'];
  var PANEL_NAMES = ['RED', 'GREEN', 'BLUE', 'YELLOW'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ECHO CHAIN';
  var HOW_TO_PLAY = 'WATCH THE LIGHT PATTERN · THEN TAP THE PANELS IN THE SAME ORDER';
  var MAX_TIME = 26;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 5 → 3
  var PANEL_COUNT = 4, SHOW_ON = 0.5, SHOW_OFF = 0.2, WAIT_DUR = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, sequenceLen, showTimer, echoPhase, inputIdx, panelFlash, litPanel, waitTimer, score, errors, done, timeLeft, elapsed, flash, flashCol, resultText, resultTimer, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050a0f');
  }

  function background() { game.draw.clear(C.bg); }

  function getPanelRect(idx) {
    var col = idx % 2, row = Math.floor(idx / 2), pw = W * 0.42, ph = W * 0.42, gap = W * 0.04, startX = (W - 2 * pw - gap) / 2, startY = H * 0.34;
    return { x: snap(startX + col * (pw + gap)), y: snap(startY + row * (ph + gap)), w: snap(pw), h: snap(ph), cx: startX + col * (pw + gap) + pw / 2, cy: startY + row * (ph + gap) + ph / 2 };
  }

  function newSequence() {
    sequenceLen = Math.min(8, 3 + Math.floor(score / 2)); sequence = [];
    for (var i = 0; i < sequenceLen; i++) sequence.push(Math.floor(Math.random() * PANEL_COUNT));
    showTimer = 0; litPanel = -1; echoPhase = 'show'; inputIdx = 0;
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; waitTimer = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; particles = []; panelFlash = [-1, 0]; newSequence(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 550 + Math.ceil(timeLeft) * 140) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    txt('LENGTH  ' + sequenceLen, W / 2, snap(H * 0.24), 38, C.g);
    for (var pi = 0; pi < PANEL_COUNT; pi++) {
      var r = getPanelRect(pi), isLit = litPanel === pi, isFlash = panelFlash[0] === pi && panelFlash[1] > 0, col2 = PANEL_COLORS[pi], alpha = isLit ? 0.9 : (isFlash ? 0.7 : 0.2);
      game.draw.rect(r.x, r.y, r.w, r.h, isLit || isFlash ? col2 : PANEL_OFF, alpha); game.draw.rect(r.x, r.y, r.w, 6, isLit || isFlash ? C.g : '#1e2d3d', 0.4);
      if (!isLit && !isFlash) txt(PANEL_NAMES[pi], r.cx, r.cy + 14, 40, col2);
      if (isLit) pc(r.cx, r.cy, r.w * 0.6, col2, 0.15);
    }
    if (state === S.PLAYING) {
      if (echoPhase === 'input') { for (var si = 0; si < sequence.length; si++) game.draw.rect(snap(W / 2 - (sequence.length - 1) * 22 + si * 44) - 12, snap(H * 0.77), 24, 24, si < inputIdx ? C.b : '#1e293b', 0.9); txt('REPEAT IT!', W / 2, snap(H * 0.82), 40, C.g); }
      else if (echoPhase === 'show') txt('MEMORIZE...', W / 2, snap(H * 0.82), 44, C.e);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || echoPhase !== 'input' || waitTimer > 0) return;
    var hitIdx = -1;
    for (var i = 0; i < PANEL_COUNT; i++) { var r = getPanelRect(i); if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) { hitIdx = i; break; } }
    if (hitIdx < 0) return;
    panelFlash[0] = hitIdx; panelFlash[1] = 0.25; game.audio.play('se_tap', 0.07);
    if (hitIdx === sequence[inputIdx]) {
      inputIdx++;
      if (inputIdx >= sequence.length) {
        score++; flash = 0.22; flashCol = C.b; resultText = 'ECHO!'; resultTimer = 0.4; game.audio.play('se_success', 0.65);
        var r2 = getPanelRect(hitIdx);
        for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: r2.cx, y: r2.cy, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: PANEL_COLORS[hitIdx] }); }
        if (score >= NEEDED) { finish(true); return; }
        waitTimer = WAIT_DUR; echoPhase = 'wait';
      }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
      waitTimer = WAIT_DUR; echoPhase = 'wait';
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT ECHO!' : 'SIGNAL LOST', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (panelFlash[1] > 0) panelFlash[1] -= dt * 4;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newSequence(); }
      else if (echoPhase === 'show') {
        showTimer += dt; var onOff = SHOW_ON + SHOW_OFF, idx = Math.floor(showTimer / onOff), phaseT = showTimer % onOff;
        litPanel = (phaseT < SHOW_ON && idx < sequenceLen) ? sequence[idx] : -1;
        if (idx >= sequenceLen && phaseT >= SHOW_OFF) { echoPhase = 'input'; litPanel = -1; }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.28), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#050a0f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
