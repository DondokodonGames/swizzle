// 646-sand-pour.js
// サンドポア — タップで砂を注ぎ、緑の目標ラインぴったりでもう一度タップして止める
// 操作: タップで注ぎ開始 → 目標%に達したらタップで停止。誤差5%以内で成功
// 成功: 5回 ぴったり  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、砂時計工房） ──
  var C = { bg:'#0a0604', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND POUR';
  var HOW_TO_PLAY = 'TAP TO POUR SAND · TAP AGAIN TO STOP AT THE GREEN LINE · WITHIN 5%';
  var MAX_TIME = 18;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var GLASS_X = W / 2, GLASS_W = 300, GLASS_H = 620, GLASS_Y = snap(H * 0.32), POUR_RATE = 24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sandLevel, targetLevel, pouring, score, misses, timeLeft, done, flash, flashCol, resultText, resultTimer, checkPending, sandParticles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#120a04');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() { sandLevel = 0; pouring = false; targetLevel = 30 + Math.floor(Math.random() * 50); }

  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; checkPending = false; sandParticles = []; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function checkResult() {
    var diff = Math.abs(sandLevel - targetLevel);
    if (diff <= 5) {
      score++; flash = 0.3; flashCol = C.b; resultText = diff <= 2 ? 'BULLSEYE!' : 'OK!'; resultTimer = 0.7; game.audio.play('se_success', diff <= 2 ? 0.7 : 0.5);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; flash = 0.3; flashCol = C.a; resultText = Math.round(diff) + '% OFF'; resultTimer = 0.7; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    setTimeout(newRound, 900);
  }

  function drawScene() {
    var gl = GLASS_X - GLASS_W / 2;
    game.draw.rect(gl, GLASS_Y, GLASS_W, GLASS_H, '#0c2a40', 0.7);
    var sandH = (sandLevel / 100) * (GLASS_H - 20);
    if (sandH > 0) { var sandY = GLASS_Y + GLASS_H - 10 - sandH; game.draw.rect(gl + 10, snap(sandY), GLASS_W - 20, snap(sandH), '#92400e', 0.9); game.draw.rect(gl + 10, snap(sandY), GLASS_W - 20, 12, C.f, 0.8); }
    var tY = GLASS_Y + GLASS_H - 10 - (targetLevel / 100) * (GLASS_H - 20);
    game.draw.rect(gl - 10, snap(tY) - 4, GLASS_W + 20, 8, C.b, 0.85); txt(targetLevel + '%', gl - 56, snap(tY) + 8, 30, C.b);
    game.draw.rect(gl, GLASS_Y, 12, GLASS_H, C.e, 0.4); game.draw.rect(gl + GLASS_W - 12, GLASS_Y, 12, GLASS_H, C.e, 0.4); game.draw.rect(gl, GLASS_Y + GLASS_H - 12, GLASS_W, 12, C.e, 0.6);
    if (pouring) for (var sy = GLASS_Y - 80; sy < GLASS_Y; sy += 20) game.draw.rect(GLASS_X - 12, sy, 24, 16, C.f, 0.6 + Math.random() * 0.2);
    for (var sp = 0; sp < sandParticles.length; sp++) { var s = sandParticles[sp]; game.draw.rect(snap(s.x) - s.r, snap(s.y) - s.r, s.r * 2, s.r * 2, C.c, s.life); }
    txt(Math.round(sandLevel) + '%', GLASS_X + GLASS_W / 2 + 40, GLASS_Y + GLASS_H / 2, 44, C.f);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || checkPending) return;
    if (!pouring && sandLevel < 100) { pouring = true; game.audio.play('se_tap', 0.1); }
    else if (pouring) { pouring = false; checkPending = true; setTimeout(function() { checkPending = false; checkResult(); }, 100); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sandLevel === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTER POURER!' : 'SPILLED', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
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
      if (pouring && sandLevel < 100) {
        sandLevel = Math.min(100, sandLevel + POUR_RATE * dt);
        if (Math.random() < 0.4) sandParticles.push({ x: GLASS_X + (Math.random() - 0.5) * 40, y: GLASS_Y - 80, vy: 200 + Math.random() * 100, life: 0.4, r: 4 + Math.random() * 6 });
        if (sandLevel >= 100) { pouring = false; game.audio.play('se_failure', 0.3); checkPending = true; setTimeout(function() { checkPending = false; checkResult(); }, 300); }
      }
      for (var sp = sandParticles.length - 1; sp >= 0; sp--) { sandParticles[sp].y += sandParticles[sp].vy * dt; sandParticles[sp].life -= dt * 2.5; if (sandParticles[sp].life <= 0) sandParticles.splice(sp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(GLASS_Y - 120), 60, flashCol);
    else if (!pouring && !checkPending) txt('TAP TO POUR', W / 2, snap(GLASS_Y - 120), 42, '#ffffff88');
    else if (pouring) txt('TAP TO STOP!', W / 2, snap(GLASS_Y - 120), 42, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#120a04');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
