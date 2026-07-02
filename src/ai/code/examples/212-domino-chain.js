// 212-domino-chain.js
// ドミノ連鎖 — 並んだドミノの端をタップで倒し、連鎖が最後まで走り切るのを見届ける
// 操作: 端のドミノをタップして倒し始める
// 成功: 6本以上連鎖  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、連鎖装置） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DOMINO CHAIN';
  var HOW_TO_PLAY = 'TAP A DOMINO TO TOPPLE THE CHAIN';
  var MAX_TIME = 15;
  var NEEDED   = 6;            // 修正2: 20 → 6
  var NUM = 12;               // 修正2: 40 → 12
  var TOP = 260, DW = 40, DH = 96, FALL_R = 150, CHAIN_SPEED = 0.14;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var dominos, started, fallingIdx, chainCount, maxChain, chainTimer, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function initDominos() {
    dominos = [];
    var spacing = (W * 0.78) / (NUM + 1);
    for (var i = 0; i < NUM; i++) {
      dominos.push({ x: snap(W * 0.11 + (i + 1) * spacing), y: snap(H * 0.45 + Math.sin(i * 0.5) * H * 0.22), fallen: false, falling: false, fallAngle: 0 });
    }
  }

  function drawDomino(dm) {
    if (dm.fallen) game.draw.rect(snap(dm.x) - DH / 2, snap(dm.y), DH, DW, C.d, 0.6);
    else if (dm.falling) {
      var steps = Math.max(1, Math.round(dm.fallAngle / (Math.PI / 2) * 6));
      for (var s = 0; s <= steps; s++) { var a = dm.fallAngle * s / steps; game.draw.rect(snap(dm.x + Math.sin(a) * DH * s / steps) - 6, snap(dm.y - Math.cos(a) * DH * s / steps) - 6, 12, 12, C.f); }
    } else {
      game.draw.rect(snap(dm.x) - DW / 2, snap(dm.y) - DH, DW, DH, C.e, 0.9);
      game.draw.rect(snap(dm.x) - DW / 2, snap(dm.y) - DH, DW, 8, C.g, 0.4);
      game.draw.rect(snap(dm.x) - 6, snap(dm.y) - DH / 2 - 6, 12, 12, C.d, 0.6);
    }
  }

  function initGame() { initDominos(); started = false; fallingIdx = -1; chainCount = 0; maxChain = 0; chainTimer = 0; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (maxChain * 300 + Math.ceil(timeLeft) * 40) : maxChain * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || started) return;
    var best = -1, bestD = 120;
    for (var di = 0; di < dominos.length; di++) { if (dominos[di].fallen) continue; var d = Math.hypot(x - dominos[di].x, y - dominos[di].y); if (d < bestD) { best = di; bestD = d; } }
    if (best >= 0) { started = true; dominos[best].falling = true; fallingIdx = best; chainCount = 0; chainTimer = 0; game.audio.play('se_tap', 0.6); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); initGameAttract();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN ' + maxChain + '!' : 'TOO SHORT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (started && fallingIdx >= 0) {
        var d = dominos[fallingIdx];
        if (d.falling && !d.fallen) {
          d.fallAngle += 7 * dt;
          if (d.fallAngle >= Math.PI / 2) {
            d.fallAngle = Math.PI / 2; d.fallen = true; d.falling = false; chainCount++; if (chainCount > maxChain) maxChain = chainCount;
            for (var pi = 0; pi < 5; pi++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: d.x, y: d.y, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.4 }); }
            var nextI = -1, nextD = FALL_R;
            for (var di2 = 0; di2 < dominos.length; di2++) { if (dominos[di2].fallen || dominos[di2].falling) continue; var dd = Math.hypot(dominos[di2].x - d.x, dominos[di2].y - d.y); if (dd < nextD) { nextI = di2; nextD = dd; } }
            if (nextI >= 0) { dominos[nextI].falling = true; fallingIdx = nextI; game.audio.play('se_tap', Math.min(1, 0.2 + chainCount * 0.06)); }
            else { fallingIdx = -1; if (maxChain >= NEEDED) finish(true); else finish(false); }
          }
        }
      }
      for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) { var p = particles[pi2]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi2, 1); }
    }

    // ---- 描画 ----
    background();
    for (var di3 = 0; di3 < dominos.length; di3++) drawDomino(dominos[di3]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.c, particles[pp].life * 2.5);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('CHAIN ' + chainCount + ' / ' + NEEDED, W / 2, 168, 48, C.c);
    if (!started) txt('TAP A DOMINO', W / 2, H - 100, 40, C.b);
    scanlines();
  });

  function initGameAttract() {
    if (!dominos) initDominos();
    for (var di = 0; di < dominos.length; di++) drawDomino(dominos[di]);
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
