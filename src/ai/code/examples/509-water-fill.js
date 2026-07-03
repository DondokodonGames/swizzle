// 509-water-fill.js
// ウォーターフィル — 上部タップで注ぎ、スワイプで傾けて排水し、水位を目標ラインに合わせる
// 操作: 画面上部タップで注水、左右スワイプで傾けて減らす、グラスをタップで確定
// 成功: 4回 ピタリと合わせる  失敗: 3回 あふれる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、給水塔） ──
  var C = { bg:'#020a10', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WATER FILL';
  var HOW_TO_PLAY = 'TAP TOP TO POUR · SWIPE TO TILT & DRAIN · TAP GLASS TO LOCK';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_OVERFLOW = 3;      // 修正2: 5 → 3
  var GW = 320, GH = 640, GX = snap(W / 2), GY = snap(H * 0.55);
  var FILL_RATE = 0.22, TILT_DRAIN = 0.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tilt, waterLevel, targetLevel, hits, overflows, timeLeft, done, particles, resultText, resultCol, resultTimer, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1a28');
  }

  function background() { game.draw.clear(C.bg); }

  function newTarget() { targetLevel = 0.3 + Math.random() * 0.5; waterLevel = Math.max(0.05, waterLevel - 0.1); tilt = 0; }

  function initGame() { tilt = 0; waterLevel = 0.4; hits = 0; overflows = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; flash = 0; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 700 + Math.ceil(timeLeft) * 100) : hits * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGlass() {
    var gl = GX - GW / 2, gt = GY - GH / 2;
    game.draw.rect(gl, gt, GW, GH, '#000000', 0.9);
    var wh = GH * waterLevel, wt = GY + GH / 2 - wh, slosh = wt + Math.sin(game.time.elapsed * 6) * 8 * Math.abs(tilt / 0.5);
    game.draw.rect(gl + 4, slosh, GW - 8, wh - (slosh - wt), C.e, 0.75); game.draw.rect(gl + 4, slosh, GW - 8, 8, C.g, 0.4);
    var ty = GY + GH / 2 - GH * targetLevel; game.draw.rect(gl - 20, snap(ty) - 2, GW + 40, 6, C.c, 0.9); txt(Math.floor(targetLevel * 100) + '%', gl + GW + 60, ty + 12, 34, C.c);
    txt(Math.floor(waterLevel * 100) + '%', gl - 70, GY + GH / 2 - wh + 16, 34, C.e);
    game.draw.rect(gl, gt, 12, GH, C.d, 0.7); game.draw.rect(gl + GW - 12, gt, 12, GH, C.d, 0.7); game.draw.rect(gl, gt + GH - 12, GW, 12, C.d, 0.7);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (ty < GY - GH / 2 - 40) { waterLevel = Math.min(1.0, waterLevel + FILL_RATE); game.audio.play('se_tap', 0.3); }
    else {
      var diff = Math.abs(waterLevel - targetLevel);
      if (diff <= 0.07) { hits++; resultText = 'PERFECT!'; resultCol = C.b; resultTimer = 0.8; flash = 0.4; game.audio.play('se_success', 0.8); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: GX, y: GY + GH / 2 - GH * waterLevel, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.e }); } if (hits >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) newTarget(); }, 600); }
      else { resultText = diff < 0.15 ? 'CLOSE!' : 'WAY OFF!'; resultCol = C.a; resultTimer = 0.6; game.audio.play('se_failure', 0.3); }
    }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') tilt = Math.max(-0.5, tilt - 0.2); else if (dir === 'right') tilt = Math.min(0.5, tilt + 0.2);
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (waterLevel === undefined) initGame(); background(); drawGlass();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.96, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WELL POURED!' : 'SPILLED OUT', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) resultTimer -= dt; if (flash > 0) flash -= dt * 3;
      if (Math.abs(tilt) > 0.05) waterLevel = Math.max(0, waterLevel - Math.abs(tilt) * TILT_DRAIN * dt);
      tilt *= Math.pow(0.92, dt * 60);
      if (waterLevel >= 1.0) { overflows++; resultText = 'OVERFLOW!'; resultCol = C.a; resultTimer = 0.8; flash = 0.5; game.audio.play('se_failure', 0.5); waterLevel = 0.8; if (overflows >= MAX_OVERFLOW) { finish(false); return; } }
      if (Math.abs(tilt) > 0.15 && waterLevel > 0.05 && Math.random() < dt * 8) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: GX + (tilt > 0 ? 60 : -60), y: GY - GH * (waterLevel - 0.5) - 20, vx: Math.cos(a2) * 60, vy: Math.sin(a2) * 60 - 40, life: 0.3, col: C.e }); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGlass();
    txt('TAP TOP TO POUR', W / 2, snap(H * 0.14), 34, C.d);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, resultCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var oi = 0; oi < MAX_OVERFLOW; oi++) game.draw.rect(snap(W / 2 + (oi - (MAX_OVERFLOW - 1) / 2) * 56) - 10, 224, 20, 20, oi < overflows ? C.a : '#0a1a28');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
