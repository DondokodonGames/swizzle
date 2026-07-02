// 305-cargo-crane.js
// 荷下ろしクレーン — 左右に揺れるクレーンのフックを、タップで真下のターゲットへ正確に降ろす
// 操作: タップで荷物を落とす（揺れの角度を読んで）
// 成功: 3個をターゲットに降ろす  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、工事現場） ──
  var C = { bg:'#0a1020', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CARGO CRANE';
  var HOW_TO_PLAY = 'TAP TO DROP THE CARGO ONTO THE TARGET';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_MISS = 3;
  var CRANE_X = snap(W / 2), CRANE_Y = snap(H * 0.16), ARM = snap(W * 0.32), FLOOR_Y = snap(H * 0.80), TARGET_W = 200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var swing, swingSpeed, phase, dropX, dropY, targetX, delivered, misses, timeLeft, done, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, FLOOR_Y, W, H, '#0c1830', 0.9); game.draw.rect(0, FLOOR_Y, W, 8, C.d, 0.6); }

  function armEnd() { return { x: CRANE_X + Math.sin(swing) * ARM, y: CRANE_Y + 40 }; }

  function drawCargo(x, y) { game.draw.rect(snap(x) - 34, snap(y), 68, 60, C.f, 0.95); game.draw.rect(snap(x) - 34, snap(y), 68, 10, C.c, 0.5); game.draw.rect(snap(x) - 34, snap(y + 26), 68, 6, C.g, 0.3); }

  function initGame() { swing = 0; swingSpeed = 1.4; phase = 'swing'; delivered = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; targetX = snap(W * 0.2 + Math.random() * W * 0.6); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (delivered * 500 + Math.ceil(timeLeft) * 100) : delivered * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCrane() {
    game.draw.rect(CRANE_X - 20, CRANE_Y - 40, 40, 200, C.f, 0.8); game.draw.rect(CRANE_X - 14, CRANE_Y - 36, 12, 200, C.c, 0.3);
    if (phase === 'swing' || phase === 'result') {
      var e = armEnd();
      pline(CRANE_X, CRANE_Y, e.x, e.y, C.f, 0.9, 16);
      pline(e.x, e.y, e.x, e.y + 100, C.g, 0.6, 6);
      pc(e.x, e.y + 100, 18, C.g, 0.9);
      drawCargo(e.x, e.y + 100);
    } else if (phase === 'drop') {
      pline(dropX, CRANE_Y, dropX, dropY, C.g, 0.5, 6);
      pc(dropX, dropY, 18, C.g, 0.9);
      drawCargo(dropX, dropY);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'swing') return;
    var e = armEnd(); dropX = e.x; dropY = e.y + 100; phase = 'drop'; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      swing = Math.sin(game.time.elapsed * 1.4) * 0.7; background();
      game.draw.rect(targetX - TARGET_W / 2, FLOOR_Y - 20, TARGET_W, 20, C.b, 0.5); txt('v', targetX, FLOOR_Y - 40, 44, C.b);
      drawCrane();
      txt(GAME_TITLE, W / 2, H * 0.42, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.48, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.67, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CARGO DOWN!' : 'DROPPED IT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (phase === 'swing') { swing = Math.sin(game.time.elapsed * swingSpeed) * 0.7; }
      else if (phase === 'drop') {
        dropY += 900 * dt;
        if (dropY >= FLOOR_Y) {
          dropY = FLOOR_Y;
          if (Math.abs(dropX - targetX) < TARGET_W / 2 + 20) { delivered++; fbText = 'PERFECT!'; fbCol = C.b; fbTimer = 0.8; game.audio.play('se_success', 0.6); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: dropX, y: dropY, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250 - 100, life: 0.6, col: C.b }); } if (delivered >= NEEDED) { finish(true); return; } targetX = snap(W * 0.2 + Math.random() * W * 0.6); }
          else { misses++; fbText = 'MISS!'; fbCol = C.a; fbTimer = 0.7; game.audio.play('se_failure', 0.5); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: dropX, y: dropY, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.5, col: C.a }); } if (misses >= MAX_MISS) { finish(false); return; } }
          phase = 'result';
          setTimeout(function() { if (!done) { phase = 'swing'; swingSpeed = 1.4 + delivered * 0.15; } }, 700);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    game.draw.rect(targetX - TARGET_W / 2, FLOOR_Y - 20, TARGET_W, 20, C.b, 0.5 + 0.3 * (Math.floor(game.time.elapsed * 4) % 2)); txt('v', targetX, FLOOR_Y - 40, 44, C.b);
    drawCrane();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.62), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(delivered + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1424');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
