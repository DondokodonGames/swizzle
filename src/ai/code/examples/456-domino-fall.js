// 456-domino-fall.js
// ドミノ倒し — 並んだドミノの先頭をタップして押し倒し、最後まで連鎖させる
// 操作: タップで先頭のドミノを倒す（間隔が空きすぎると連鎖が止まる）
// 成功: 2列 完全連鎖  失敗: 3回 連鎖ストップ or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、玩具工房） ──
  var C = { bg:'#0a0600', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DOMINO FALL';
  var HOW_TO_PLAY = 'TAP TO TOPPLE THE FIRST DOMINO · KEEP THE CHAIN GOING';
  var MAX_TIME = 20;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_MISS = 3;
  var FLOOR_Y = snap(H * 0.60), DW = 32, DH = 72, FALL_R = 88, COUNT = 12;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var dominos, iphase, chains, misses, timeLeft, done, particles, flash, flashCol, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0a00');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#1a0a00', 0.9); game.draw.rect(0, FLOOR_Y, W, 6, C.f, 0.5); }

  function resetDominos() {
    dominos = [];
    var startX = 130;
    // 間隔を FALL_R 以内に収めつつ、たまに広めにして緊張感を出す
    var x = startX;
    for (var i = 0; i < COUNT; i++) { dominos.push({ x: snap(x), angle: 0, fallen: false, falling: false }); x += FALL_R * 0.72 + Math.random() * (FALL_R * 0.24); }
    iphase = 'place';
  }

  function initGame() { chains = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resetDominos(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (chains * 1200 + Math.ceil(timeLeft) * 100) : chains * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawDominos() {
    for (var di = 0; di < dominos.length; di++) {
      var d = dominos[di], ang = d.angle * Math.PI / 180;
      var col = d.falling ? C.f : (d.fallen ? '#a0b0c0' : C.e);
      var tx = d.x + Math.sin(ang) * DH, ty = FLOOR_Y - Math.cos(ang) * DH;
      pline(d.x, FLOOR_Y, tx, ty, col, 0.9, DW);
      if (!d.fallen) { var mx = (d.x + tx) / 2, my = (FLOOR_Y + ty) / 2; game.draw.rect(snap(mx) - 4, snap(my) - 16, 8, 8, C.bg, 0.9); game.draw.rect(snap(mx) - 4, snap(my) + 8, 8, 8, C.bg, 0.9); }
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'place') return;
    dominos[0].falling = true; iphase = 'falling'; game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!dominos) initGame(); background(); drawDominos();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL DOWN!' : 'CHAIN BROKE', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (iphase === 'falling') {
        var anyFalling = false;
        for (var di = 0; di < dominos.length; di++) {
          var d = dominos[di]; if (!d.falling) continue; anyFalling = true;
          d.angle += 260 * dt;
          if (d.angle >= 90) {
            d.angle = 90; d.fallen = true; d.falling = false; game.audio.play('se_tap', 0.2);
            for (var pi = 0; pi < 4; pi++) { var a = Math.random() * Math.PI - Math.PI * 0.8; particles.push({ x: d.x, y: FLOOR_Y - DH, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.5, col: C.c }); }
            for (var di2 = di + 1; di2 < dominos.length; di2++) { var d2 = dominos[di2]; if (d2.fallen || d2.falling) continue; if (d2.x - d.x > 0 && d2.x - d.x < FALL_R) { d2.falling = true; } break; }
          }
        }
        if (!anyFalling) {
          if (dominos.every(function(dd) { return dd.fallen; })) {
            chains++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7);
            for (var pi2 = 0; pi2 < 16; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: FLOOR_Y - 30, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.7, col: C.b }); }
            if (chains >= NEEDED) { finish(true); return; }
            iphase = 'result'; resultTimer = 0;
          } else {
            misses++; game.audio.play('se_failure', 0.4); flash = 0.5; flashCol = C.a;
            if (misses >= MAX_MISS) { finish(false); return; }
            iphase = 'result'; resultTimer = 0;
          }
        }
      }
      if (iphase === 'result') { resultTimer += dt; if (resultTimer > 1.1) resetDominos(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawDominos();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'place') txt('TAP TO TOPPLE', W / 2, snap(H * 0.78), 46, C.f);
    var fallen = dominos.filter(function(dd) { return dd.fallen; }).length;
    txt(fallen + ' / ' + COUNT, W / 2, snap(H * 0.86), 40, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(chains + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a0a00');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
