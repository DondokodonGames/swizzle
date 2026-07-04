// 716-escape-room.js
// エスケープルーム — 光ったパネルの順番を記憶し、同じ順にタップして扉を開ける
// 操作: 点灯順を覚え、同じ順にパネルをタップ。間違えると同じ順が再提示される
// 成功: 5回 扉を開ける  失敗: 3回 ミス or 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、脱出装置） ──
  var C = { bg:'#04080c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ESCAPE ROOM';
  var HOW_TO_PLAY = 'WATCH THE PANELS LIGHT UP · TAP THEM IN ORDER TO UNLOCK THE DOOR';
  var MAX_TIME = 28;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_ERR  = 3;          // 修正2: 5 → 3
  var PANEL_COUNT = 6, PANEL_R = 100, SHOW_DUR = 0.5;
  var PANEL_POSITIONS = [{ x: W * 0.25, y: H * 0.34 }, { x: W * 0.75, y: H * 0.34 }, { x: W * 0.15, y: H * 0.54 }, { x: W * 0.5, y: H * 0.54 }, { x: W * 0.85, y: H * 0.54 }, { x: W * 0.5, y: H * 0.72 }];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, showIdx, showTimer, inputSeq, seqPhase, litPanel, panelFlash, round, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, doorOpen, waitTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 14) * (r - 14)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#060c14');
  }

  function background() { game.draw.clear(C.bg); }

  function newSequence() {
    var len = 3 + Math.min(3, Math.floor(round / 2)); sequence = [];
    for (var i = 0; i < len; i++) sequence.push(Math.floor(Math.random() * PANEL_COUNT));
    showIdx = 0; showTimer = 0.6; litPanel = -1; inputSeq = []; seqPhase = 'show'; doorOpen = 0; waitTimer = 0;
  }

  function initGame() { round = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; doorOpen = 0; waitTimer = 0; panelFlash = []; for (var pi = 0; pi < PANEL_COUNT; pi++) panelFlash.push(0); newSequence(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 700 + Math.ceil(timeLeft) * 100) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var doorW = 280, doorH = 420, doorX = W / 2 - doorW / 2, doorY = H * 0.28;
    game.draw.rect(doorX, doorY, doorW, doorH, '#1e3a5f', 0.7 + doorOpen * 0.3);
    game.draw.rect(doorX, doorY, doorW, 14, C.e, doorOpen > 0 ? 0.8 : 0.2);
    game.draw.rect(doorX + doorW - 36, doorY + doorH / 2 - 16, 28, 32, C.e, 0.8);
    if (doorOpen > 0) game.draw.rect(doorX - doorW * doorOpen, doorY, doorW, doorH, C.e, doorOpen * 0.15);
    for (var pni = 0; pni < PANEL_COUNT; pni++) {
      var pos = PANEL_POSITIONS[pni], glow = panelFlash[pni];
      pc(pos.x, pos.y, PANEL_R, glow > 0.2 ? C.f : '#0a1a28', 0.8 + glow * 0.2);
      if (glow > 0.2) ring(pos.x, pos.y, PANEL_R + 14, C.c, glow * 0.4);
      txt((pni + 1) + '', pos.x, pos.y + 14, 52, glow > 0.2 ? C.g : '#ffffff33');
    }
    var phStr = seqPhase === 'show' ? 'MEMORIZE' : (seqPhase === 'input' ? 'INPUT ' + inputSeq.length + '/' + sequence.length : '...');
    txt(phStr, W / 2, H * 0.88, 44, seqPhase === 'input' ? C.b : '#ffffff55');
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || seqPhase !== 'input') return;
    for (var i = 0; i < PANEL_COUNT; i++) {
      var p = PANEL_POSITIONS[i], dx = tx - p.x, dy = ty - p.y;
      if (dx * dx + dy * dy < (PANEL_R + 20) * (PANEL_R + 20)) {
        panelFlash[i] = 0.3; inputSeq.push(i); var idx = inputSeq.length - 1;
        if (inputSeq[idx] !== sequence[idx]) {
          errors++; flash = 0.4; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.7; game.audio.play('se_failure', 0.4);
          if (errors >= MAX_ERR) { finish(false); return; }
          seqPhase = 'show'; showIdx = 0; showTimer = 0.8; inputSeq = [];
        } else {
          game.audio.play('se_tap', 0.13);
          if (inputSeq.length >= sequence.length) {
            round++; doorOpen = 1.0; flash = 0.35; flashCol = C.b; resultText = 'DOOR OPEN!'; resultTimer = 0.7; game.audio.play('se_success', 0.65);
            for (var p2 = 0; p2 < 8; p2++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.52, vx: Math.cos(pa) * 240, vy: Math.sin(pa) * 240, life: 0.6, col: C.e }); }
            if (round >= NEEDED) { finish(true); return; }
            waitTimer = 1.0; seqPhase = 'wait';
          }
        }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.95, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YOU ESCAPED!' : 'LOCKED IN', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (doorOpen > 0) doorOpen -= dt * 1.5;
      for (var pi2 = 0; pi2 < PANEL_COUNT; pi2++) if (panelFlash[pi2] > 0) panelFlash[pi2] -= dt * 4;
      if (seqPhase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) newSequence(); }
      if (seqPhase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) {
          if (litPanel >= 0) { panelFlash[litPanel] = 0; litPanel = -1; }
          if (showIdx < sequence.length) { litPanel = sequence[showIdx]; panelFlash[litPanel] = 1.0; showIdx++; showTimer = SHOW_DUR; game.audio.play('se_tap', 0.08); }
          else { litPanel = -1; seqPhase = 'input'; }
        } else if (showTimer < 0.15 && litPanel >= 0) panelFlash[litPanel] = Math.max(0, panelFlash[litPanel] - dt * 6);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.92), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#060c14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
