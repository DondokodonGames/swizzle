// 502-balance-scale.js
// バランス天秤 — 落ちてくる重りを左右どちらかの皿に投げ入れ、両皿を釣り合わせる
// 操作: 左右スワイプ（またはタップ位置）で重りを左皿/右皿へ。差が1以内で釣り合い
// 成功: 4回 釣り合わせる  失敗: 3回 傾きすぎ or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、計量所） ──
  var C = { bg:'#050508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE SCALE';
  var HOW_TO_PLAY = 'DROP WEIGHTS LEFT / RIGHT · KEEP BOTH PANS EVEN';
  var MAX_TIME = 25;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_FAIL = 3;          // 修正2: 5 → 3
  var BEAM_W = 640, BEAM_Y = snap(H * 0.46), PIVOT_X = snap(W / 2), PLATE_W = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiltAngle, leftSum, rightSum, falling, balanced, fails, timeLeft, done, particles, nextWeight, maxWeight, resultText, resultCol, resultTimer, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { tiltAngle = 0; leftSum = 0; rightSum = 0; falling = null; balanced = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; maxWeight = 5; nextWeight = 1 + Math.floor(Math.random() * maxWeight); resultText = ''; resultTimer = 0; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (balanced * 700 + Math.ceil(timeLeft) * 100) : balanced * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drop(side) { if (falling) return; falling = { val: nextWeight, x: W / 2, y: 320, vy: 200, side: side }; game.audio.play('se_tap', 0.3); }

  function drawScale() {
    game.draw.rect(PIVOT_X - 10, BEAM_Y, 20, H * 0.34, '#90a0b0', 0.9); pc(PIVOT_X, BEAM_Y, 20, '#90a0b0', 0.9);
    var cosT = Math.cos(tiltAngle), sinT = Math.sin(tiltAngle);
    var lx = PIVOT_X - BEAM_W / 2 * cosT, ly = BEAM_Y - BEAM_W / 2 * sinT, rx = PIVOT_X + BEAM_W / 2 * cosT, ry = BEAM_Y + BEAM_W / 2 * sinT;
    pline(lx, ly, rx, ry, C.f, 0.9, 16);
    game.draw.rect(snap(lx - PLATE_W / 2), snap(ly + 30), PLATE_W, 16, C.d, 0.9); game.draw.rect(snap(rx - PLATE_W / 2), snap(ry + 30), PLATE_W, 16, C.d, 0.9);
    if (leftSum > 0) txt(leftSum + '', lx, ly + 90, 48, C.c);
    if (rightSum > 0) txt(rightSum + '', rx, ry + 90, 48, C.c);
    if (falling) { var fx = falling.x + (falling.side === 'left' ? -60 : 60); pc(fx, falling.y, 32, C.c, 0.9); txt(falling.val + '', fx, falling.y + 14, 40, C.bg); }
    else { pc(W / 2, 320, 40, C.c, 0.85); txt(nextWeight + '', W / 2, 336, 48, C.bg); }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || falling) return;
    drop(tx < W / 2 ? 'left' : 'right');
  });

  game.onSwipe(function(dir) { if (state === S.PLAYING && !done && !falling && (dir === 'left' || dir === 'right')) drop(dir); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (leftSum === undefined) initGame(); background(); drawScale();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN BALANCE!' : 'TIPPED OVER', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      var target = Math.max(-0.5, Math.min(0.5, (leftSum - rightSum) * 0.05)); tiltAngle += (target - tiltAngle) * dt * 4;
      if (falling) {
        falling.vy += 500 * dt; falling.y += falling.vy * dt;
        var plateY = BEAM_Y + Math.sin(tiltAngle) * (falling.side === 'left' ? -BEAM_W / 2 : BEAM_W / 2) + 30;
        if (falling.y >= plateY) {
          if (falling.side === 'left') leftSum += falling.val; else rightSum += falling.val;
          for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PIVOT_X + (falling.side === 'left' ? -200 : 200), y: plateY, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100 - 80, life: 0.4, col: C.c }); }
          falling = null;
          if (Math.abs(leftSum - rightSum) <= 1 && (leftSum > 0 || rightSum > 0)) {
            balanced++; resultText = 'BALANCED!'; resultCol = C.b; resultTimer = 0.8; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.7); leftSum = 0; rightSum = 0;
            if (balanced >= NEEDED) { finish(true); return; }
            if (maxWeight < 8) maxWeight++; nextWeight = 1 + Math.floor(Math.random() * maxWeight);
          } else if (Math.abs(tiltAngle) > 0.42) {
            fails++; resultText = 'TOO TILTED!'; resultCol = C.a; resultTimer = 0.8; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.5); leftSum = 0; rightSum = 0; tiltAngle = 0;
            if (fails >= MAX_FAIL) { finish(false); return; } nextWeight = 1 + Math.floor(Math.random() * maxWeight);
          } else nextWeight = 1 + Math.floor(Math.random() * maxWeight);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScale();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.82), 60, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(balanced + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#1a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
