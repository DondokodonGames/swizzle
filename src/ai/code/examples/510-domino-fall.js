// 510-domino-fall.js
// ドミノ倒し — 並んだドミノの先頭をタップで倒し、連鎖で最後まで倒しきる
// 操作: タップで先頭ドミノを倒す（間隔が空きすぎると連鎖が途切れる）
// 成功: 2列 完全連鎖  失敗: 3回 連鎖ストップ or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、玩具ドミノ） ──
  var C = { bg:'#060310', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DOMINO FALL';
  var HOW_TO_PLAY = 'TAP TO TOPPLE THE FIRST DOMINO · CHAIN THEM ALL DOWN';
  var MAX_TIME = 20;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_FAIL = 3;
  var FLOOR_Y = snap(H * 0.66), DW = 28, DH = 88, SPACING = 76, COUNT = 10;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var dominos, iphase, toppledIdx, toppleTimer, rounds, fails, timeLeft, done, particles, flash, flashCol, resultTimer;
  var TOPPLE_SPEED = 0.1;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0f0c1e');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#0f0c1e', 0.9); }

  function initDominos() {
    dominos = []; var x = 120;
    for (var i = 0; i < COUNT; i++) { dominos.push({ x: snap(x), fallen: false, angle: 0 }); x += SPACING + (Math.random() < 0.2 && i > 0 && i < COUNT - 1 ? SPACING * 0.6 : Math.random() * SPACING * 0.15); }
    if (x > W - 100) { var sc = (W - 220) / (x - 120); for (var di = 0; di < dominos.length; di++) dominos[di].x = snap(120 + (dominos[di].x - 120) * sc); }
    iphase = 'place'; toppledIdx = -1; toppleTimer = 0;
  }

  function initGame() { rounds = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultTimer = 0; initDominos(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 1200 + Math.ceil(timeLeft) * 100) : rounds * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function endRound(allFell) {
    iphase = 'result'; resultTimer = 0;
    if (allFell) { rounds++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.9); for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: FLOOR_Y - 60, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.6, col: C.b }); } if (rounds >= NEEDED) { finish(true); return; } }
    else { fails++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.5); if (fails >= MAX_FAIL) { finish(false); return; } }
  }

  function drawDominos() {
    for (var di = 0; di < dominos.length; di++) {
      var d = dominos[di];
      if (d.fallen) pline(d.x - DH / 2, FLOOR_Y - DW / 2, d.x + DH / 2, FLOOR_Y - DW / 2, C.b, 0.85, DW);
      else if (di === toppledIdx && iphase === 'topple') { var ang = d.angle, tx = d.x + Math.sin(ang) * DH, ty = FLOOR_Y - Math.cos(ang) * DH; pline(d.x, FLOOR_Y, tx, ty, C.d, 0.85, DW); }
      else { pline(d.x, FLOOR_Y, d.x, FLOOR_Y - DH, C.d, 0.85, DW); game.draw.rect(snap(d.x) - 4, snap(FLOOR_Y - DH / 2) - 16, 8, 8, C.g, 0.6); game.draw.rect(snap(d.x) - 4, snap(FLOOR_Y - DH / 2) + 8, 8, 8, C.g, 0.6); }
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'place') return;
    iphase = 'topple'; toppledIdx = 0; toppleTimer = 0; game.audio.play('se_tap', 0.5);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!dominos) initGame(); background(); drawDominos();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 46, C.g);
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
      if (flash > 0) flash -= dt * 3;
      if (iphase === 'topple' && toppledIdx < dominos.length) {
        dominos[toppledIdx].angle = Math.min(Math.PI / 2, dominos[toppledIdx].angle + dt * 8);
        toppleTimer += dt;
        if (toppleTimer >= TOPPLE_SPEED) {
          toppleTimer -= TOPPLE_SPEED; var cur = dominos[toppledIdx]; cur.fallen = true; game.audio.play('se_tap', 0.1 + toppledIdx * 0.01);
          for (var pi = 0; pi < 3; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cur.x, y: FLOOR_Y - DH / 2, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80 - 60, life: 0.3, col: C.c }); }
          var nextIdx = toppledIdx + 1;
          if (nextIdx < dominos.length) { if (dominos[nextIdx].x - cur.x <= DH + DW / 2) toppledIdx++; else { endRound(false); } }
          else endRound(true);
        }
      }
      if (iphase === 'result') { resultTimer += dt; if (resultTimer > 1.0) initDominos(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawDominos();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (iphase === 'place') txt('TAP TO TOPPLE', W / 2, snap(H * 0.82), 46, C.f);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_FAIL; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, mi < fails ? C.a : '#0f0c1e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
