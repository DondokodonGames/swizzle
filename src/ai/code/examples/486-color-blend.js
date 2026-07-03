// 486-color-blend.js
// 色調合 — 2色の絵の具の配合をスワイプで調整し、お手本の色を作り出す
// 操作: 左右スワイプで配合比を調整、上スワイプ or 下部タップで確定
// 成功: 4色 一致  失敗: 3ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、絵の具ラボ） ──
  var C = { bg:'#0c0810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // 配合パズル（実際の色は遊びの中身なので保持）
  var MIXES = [
    { a: [255, 50, 50], b: [50, 50, 255], target: 0.5 },
    { a: [255, 200, 0], b: [255, 0, 0], target: 0.3 },
    { a: [0, 200, 100], b: [0, 100, 255], target: 0.4 },
    { a: [255, 100, 0], b: [255, 255, 0], target: 0.6 },
    { a: [150, 0, 255], b: [255, 0, 120], target: 0.5 },
    { a: [50, 200, 255], b: [120, 50, 255], target: 0.55 }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR BLEND';
  var HOW_TO_PLAY = 'SWIPE L/R TO BLEND · SWIPE UP OR TAP LOW TO LOCK';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 8 → 4
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var TOLERANCE = 0.12;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var mixIdx, ratio, successes, misses, timeLeft, done, particles, flash, flashCol, resultText, resultCol, resultTimer, confirming;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function rgb(col) { return 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')'; }
  function lerp3(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1028');
  }

  function background() { game.draw.clear(C.bg); }

  function curMix() { return MIXES[mixIdx % MIXES.length]; }

  function initGame() { mixIdx = 0; ratio = 0.5; successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; confirming = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function confirmMix() {
    if (done || confirming) return;
    confirming = true;
    var m = curMix(), diff = Math.abs(ratio - m.target);
    if (diff <= TOLERANCE) {
      successes++; resultText = 'MATCH!'; resultCol = C.b; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.7);
      var tc = lerp3(m.a, m.b, m.target); for (var pi = 0; pi < 12; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.6, col: rgb(tc) }); }
      if (successes >= NEEDED) { finish(true); return; }
    } else {
      misses++; resultText = diff < 0.25 ? 'CLOSE!' : 'WAY OFF'; resultCol = C.a; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    resultTimer = 0.9; setTimeout(function() { if (!done) { mixIdx++; ratio = 0.5; confirming = false; } }, 800);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || confirming) return;
    if (ty > H * 0.78) confirmMix();
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || confirming) return;
    if (dir === 'left') { ratio = Math.max(0, ratio - 0.1); game.audio.play('se_tap', 0.3); }
    else if (dir === 'right') { ratio = Math.min(1, ratio + 0.1); game.audio.play('se_tap', 0.3); }
    else if (dir === 'up') confirmMix();
  });

  // ── 更新 & 描画 ──
  function drawPanel() {
    var m = curMix(), tc = lerp3(m.a, m.b, m.target), cc = lerp3(m.a, m.b, ratio);
    txt('TARGET', W / 2, H * 0.20, 40, C.c);
    game.draw.rect(W / 2 - 170, H * 0.22, 340, 160, rgb(tc), 1.0); game.draw.rect(W / 2 - 170, H * 0.22, 340, 12, C.g, 0.2);
    game.draw.rect(120, H * 0.46, 200, 100, rgb(m.a), 0.9); txt('A', 220, H * 0.51, 48, C.g);
    game.draw.rect(W - 320, H * 0.46, 200, 100, rgb(m.b), 0.9); txt('B', W - 220, H * 0.51, 48, C.g);
    var barX = 100, barW = W - 200, barY = H * 0.60;
    game.draw.rect(barX, barY, barW, 40, rgb(m.a), 0.7); game.draw.rect(barX + barW * ratio, barY, barW * (1 - ratio), 40, rgb(m.b), 0.7);
    game.draw.rect(snap(barX + barW * ratio) - 24, barY - 12, 48, 64, C.g, 0.9); game.draw.rect(snap(barX + barW * ratio) - 16, barY - 4, 32, 48, rgb(cc), 1.0);
    var tx = barX + barW * m.target; game.draw.rect(snap(tx) - 3, barY - 18, 6, 76, C.g, 0.8);
    txt('YOURS', W / 2, H * 0.70, 36, C.b);
    game.draw.rect(W / 2 - 170, H * 0.72, 340, 110, rgb(cc), 1.0);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (mixIdx === undefined) initGame(); background(); drawPanel();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT MIX!' : 'MUDDY BATCH', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawPanel();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, H * 0.5, 80, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1028');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
