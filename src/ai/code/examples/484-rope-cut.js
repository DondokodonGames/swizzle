// 484-rope-cut.js
// ロープカット — 吊り下がった星のロープをスワイプで切り、左右に動く籠へ落とし込む
// 操作: スワイプでロープを切断（星が落ちる）。籠で受け止める
// 成功: 5個 の星をキャッチ  失敗: 3個 落とす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、星降る夜店） ──
  var C = { bg:'#060012', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ROPE CUT';
  var HOW_TO_PLAY = 'SWIPE TO CUT THE ROPES · CATCH THE STARS IN THE BASKET';
  var MAX_TIME = 15;
  var NEEDED     = 5;        // 修正2: 10 → 5
  var MAX_ESCAPE = 3;        // 修正2: 5 → 3
  var BASKET_W = 240, BASKET_H = 100, BASKET_Y = snap(H * 0.84);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ropes, particles, basketX, basketVX, caught, escaped, timeLeft, done, nextSpawn, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function star(cx, cy, r, color, alpha) { pc(cx, cy, r, color, alpha); game.draw.rect(snap(cx) - 2, snap(cy - r - 6), 4, 12, color, alpha); game.draw.rect(snap(cx) - 2, snap(cy + r - 6), 4, 12, color, alpha); game.draw.rect(snap(cx - r - 6), snap(cy) - 2, 12, 4, color, alpha); game.draw.rect(snap(cx + r - 6), snap(cy) - 2, 12, 4, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#0a0020');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnRope() { var x = snap(140 + Math.random() * (W - 280)), top = 300 + Math.random() * 80, len = 240 + Math.random() * 260; ropes.push({ x: x, topY: top, len: len, falling: false, sx: x, sy: top + len, svx: 0, svy: 0, life: 6 + Math.random() * 3, sway: 0, swaySp: 0.5 + Math.random() * 0.5 }); }

  function initGame() { ropes = []; particles = []; basketX = W / 2; basketVX = 200; caught = 0; escaped = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 0.7; flash = 0; spawnRope(); spawnRope(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ri = 0; ri < ropes.length; ri++) {
      var r = ropes[ri];
      if (!r.falling) { var x2 = r.x + r.sway, y2 = r.topY + r.len; pline(r.x, r.topY, x2, y2, C.f, 0.9, 6); pc(r.x, r.topY, 12, '#90a0b0', 0.9); star(x2, y2, 20, C.c, 0.9); }
      else { pline(r.x, r.topY, r.sx, r.sy - 10, C.f, 0.6, 5); star(r.sx, r.sy, 20, C.c, 0.9); }
    }
    var bx = snap(basketX - BASKET_W / 2);
    game.draw.rect(bx, BASKET_Y - BASKET_H / 2, BASKET_W, BASKET_H, C.b, 0.9); game.draw.rect(bx, BASKET_Y - BASKET_H / 2, BASKET_W, 10, C.g, 0.4);
    game.draw.rect(bx, BASKET_Y - BASKET_H / 2, 10, BASKET_H, C.g, 0.3); game.draw.rect(bx + BASKET_W - 10, BASKET_Y - BASKET_H / 2, 10, BASKET_H, C.g, 0.3);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    for (var ri = ropes.length - 1; ri >= 0; ri--) {
      var r = ropes[ri]; if (r.falling) continue;
      var rx1 = r.x, ry1 = r.topY, rx2 = r.x + r.sway, ry2 = r.topY + r.len;
      var denom = (x1 - x2) * (ry1 - ry2) - (y1 - y2) * (rx1 - rx2); if (Math.abs(denom) < 0.001) continue;
      var t = ((x1 - rx1) * (ry1 - ry2) - (y1 - ry1) * (rx1 - rx2)) / denom, u = -((x1 - x2) * (y1 - ry1) - (y1 - y2) * (x1 - rx1)) / denom;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { r.falling = true; r.sx = rx1 + (rx2 - rx1) * u; r.sy = ry1 + (ry2 - ry1) * u; r.svx = (Math.random() - 0.5) * 100; r.svy = 0; game.audio.play('se_tap', 0.5); }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ropes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.68, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STARFALL!' : 'DROPPED IT', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
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
      basketX += basketVX * dt;
      if (basketX > W - BASKET_W / 2 - 40) { basketX = W - BASKET_W / 2 - 40; basketVX = -Math.abs(basketVX); }
      if (basketX < BASKET_W / 2 + 40) { basketX = BASKET_W / 2 + 40; basketVX = Math.abs(basketVX); }
      nextSpawn -= dt; if (nextSpawn <= 0 && ropes.length < 5) { spawnRope(); nextSpawn = 0.5 + Math.random() * 0.7; }
      for (var ri = ropes.length - 1; ri >= 0; ri--) {
        var r = ropes[ri]; r.life -= dt; r.sway = Math.sin(game.time.elapsed * r.swaySp + ri) * 28;
        if (r.falling) {
          r.svy += 700 * dt; r.sx += r.svx * dt; r.sy += r.svy * dt;
          if (r.sy > BASKET_Y - BASKET_H / 2 && r.sy < BASKET_Y + BASKET_H / 2 && Math.abs(r.sx - basketX) < BASKET_W / 2 + 20) {
            caught++; flash = 0.35; game.audio.play('se_success', 0.6);
            for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: r.sx, y: r.sy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 100, life: 0.5, col: C.c }); }
            ropes.splice(ri, 1); if (caught >= NEEDED) { finish(true); return; } continue;
          }
          if (r.sy > H + 80) { ropes.splice(ri, 1); escaped++; game.audio.play('se_failure', 0.3); if (escaped >= MAX_ESCAPE) { finish(false); return; } continue; }
        } else if (r.life <= 0) { ropes.splice(ri, 1); escaped++; game.audio.play('se_failure', 0.2); if (escaped >= MAX_ESCAPE) { finish(false); return; } continue; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#0a0020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
