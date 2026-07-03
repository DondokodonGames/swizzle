// 544-domino-push.js
// ドミノプッシュ — 先頭のドミノを倒し、連鎖が最後まで走るのを見届ける。隙間はタップで橋渡し
// 操作: タップで連鎖開始。倒れていく途中、紫の隙間ドミノをタップして連鎖を繋ぐ
// 成功: 2ラウンド 完全連鎖  失敗: 3ラウンド 連鎖断絶 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドミノ台） ──
  var C = { bg:'#1a0a02', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DOMINO PUSH';
  var HOW_TO_PLAY = 'TAP TO START THE CHAIN · TAP PURPLE GAPS TO BRIDGE THEM';
  var MAX_TIME = 18;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var MAX_FAIL = 3;
  var DOMINO_W = 40, DOMINO_H = 100, FLOOR_Y = snap(H * 0.66), DOMINO_COUNT = 12, SPACING = 80, START_X = snap(W * 0.09);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var dominos, round, roundsWon, roundsFailed, timeLeft, done, phase, fallTimer, chainBroken, particles, roundResult, roundTimer, tapReady;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2d1a08');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#2d1a08', 0.9); game.draw.rect(0, FLOOR_Y - 4, W, 4, C.f, 0.5); }

  function initRound() {
    dominos = []; var gapCount = Math.min(round, 3), gapPos = [];
    for (var gi = 0; gi < gapCount; gi++) { var pos; do { pos = 2 + Math.floor(Math.random() * (DOMINO_COUNT - 4)); } while (gapPos.indexOf(pos) !== -1 || gapPos.indexOf(pos - 1) !== -1); gapPos.push(pos); }
    for (var i = 0; i < DOMINO_COUNT; i++) dominos.push({ x: START_X + i * SPACING, fallen: false, tipping: 0, hasGap: gapPos.indexOf(i) !== -1, gapBridged: false });
    phase = 'ready'; fallTimer = 0; chainBroken = false; tapReady = true;
  }

  function initGame() { round = 0; roundsWon = 0; roundsFailed = 0; timeLeft = MAX_TIME; done = false; particles = []; roundResult = ''; roundTimer = 0; initRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (roundsWon * 1000 + Math.ceil(timeLeft) * 100) : roundsWon * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < dominos.length; i++) {
      var d = dominos[i], angle = d.tipping * Math.PI / 2, dx = d.x;
      if (d.hasGap && !d.gapBridged) game.draw.rect(dx - 12, FLOOR_Y - 20, 24, 20, C.d, 0.6);
      if (d.fallen) game.draw.rect(dx - DOMINO_H / 2, FLOOR_Y - DOMINO_W, DOMINO_H, DOMINO_W, d.hasGap ? '#6b4f0e' : '#8b6914', 0.9);
      else if (d.tipping > 0) { var tipX = dx + Math.sin(angle) * DOMINO_H, tipY = FLOOR_Y - Math.cos(angle) * DOMINO_H; game.draw.line(dx, FLOOR_Y, tipX, tipY, '#c4b07a', DOMINO_W + 4); game.draw.line(dx, FLOOR_Y, tipX, tipY, '#e8d5a3', DOMINO_W); }
      else { var col = d.hasGap ? (d.gapBridged ? C.b : C.d) : '#e8d5a3', sh = d.hasGap ? (d.gapBridged ? '#0a8844' : '#6b4f0e') : '#c4b07a'; game.draw.rect(dx - DOMINO_W / 2 + 4, FLOOR_Y - DOMINO_H + 4, DOMINO_W, DOMINO_H, sh, 0.7); game.draw.rect(dx - DOMINO_W / 2, FLOOR_Y - DOMINO_H, DOMINO_W, DOMINO_H, col, 0.95); game.draw.rect(dx - 6, FLOOR_Y - DOMINO_H + 20, 12, 12, '#1a1008', 0.7); game.draw.rect(dx - 6, FLOOR_Y - 32, 12, 12, '#1a1008', 0.7); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'ready' && tapReady) { phase = 'falling'; fallTimer = 0; game.audio.play('se_tap', 0.5); tapReady = false; return; }
    if (phase === 'falling') {
      for (var i = 0; i < dominos.length; i++) { var d = dominos[i]; if (!d.hasGap || d.gapBridged) continue; if (Math.abs(tx - d.x) < 60 && ty > FLOOR_Y - 220 && ty < FLOOR_Y + 80) { d.gapBridged = true; game.audio.play('se_tap', 0.4); break; } }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!dominos) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.205, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.85, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN MASTER!' : 'BROKEN CHAIN', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (roundTimer > 0) roundTimer -= dt;
      if (phase === 'falling') {
        fallTimer += dt; var target = Math.floor(fallTimer / 0.16);
        for (var i = 0; i < dominos.length; i++) {
          var d = dominos[i];
          if (i <= target && !chainBroken) {
            var blocked = false; for (var gi = 0; gi < i; gi++) if (dominos[gi].hasGap && !dominos[gi].gapBridged) { blocked = true; break; }
            if (!blocked) { d.tipping = Math.min(1, (fallTimer - i * 0.16) / 0.16); if (d.tipping > 0.5 && !d.fallen && d.hasGap && !d.gapBridged) chainBroken = true; if (d.tipping >= 1) { d.fallen = true; d.tipping = 1; } }
          }
        }
        if (chainBroken || target >= DOMINO_COUNT) {
          var allFallen = dominos.every(function(x) { return x.fallen; }); phase = 'done';
          if (allFallen && !chainBroken) { roundsWon++; roundResult = 'PERFECT!'; game.audio.play('se_success', 0.9); for (var pi = 0; pi < 20; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: FLOOR_Y - 60, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280 - 100, life: 0.5, col: C.b }); } }
          else { roundsFailed++; roundResult = 'CHAIN BREAK!'; game.audio.play('se_failure', 0.5); }
          roundTimer = 1.3;
          if (roundsWon >= NEEDED) { finish(true); return; }
          if (roundsFailed >= MAX_FAIL) { finish(false); return; }
          setTimeout(function() { if (!done) { round++; initRound(); } }, 1300);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (roundTimer > 0) txt(roundResult, W / 2, FLOOR_Y - 220, 60, chainBroken ? C.a : C.b);
    else if (phase === 'ready' && tapReady && Math.floor(game.time.elapsed * 4) % 2 === 0) txt('TAP TO PUSH!', W / 2, FLOOR_Y - 220, 48, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(roundsWon + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < roundsFailed ? C.a : '#2d1a08');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
