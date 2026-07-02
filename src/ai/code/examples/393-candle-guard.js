// 393-candle-guard.js
// ろうそく守り — 吹き付ける風で炎が傾く。倒れる向きと逆にスワイプして炎を立て直し、消さずに守る
// 操作: 炎が傾く向きと逆にスワイプ（左に傾いたら右へ）
// 成功: 10秒 守り抜く  失敗: 炎が倒れて消える

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜の窓辺） ──
  var C = { bg:'#0a0608', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CANDLE GUARD';
  var HOW_TO_PLAY = 'SWIPE AGAINST THE TILT TO KEEP THE FLAME ALIVE';
  var GOAL = 10;             // 修正2: 120秒 → 10秒
  var MAX_ANGLE = Math.PI / 2 * 0.9;
  var CX = snap(W / 2), BASE_Y = snap(H * 0.72), CW = 80, CH = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, vel, windDir, windStr, windTimer, windInt, survived, done, particles, flicker, danger;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1810');
  }

  function background() { game.draw.clear(C.bg); if (danger > 0) game.draw.rect(0, 0, W, H, C.a, danger * 0.12); if (state !== S.RESULT) pc(CX, BASE_Y - CH - 60, 200, C.f, 0.06 + Math.sin(flicker) * 0.02); }

  function spawnGust() { windDir = Math.random() < 0.5 ? -1 : 1; windStr = 0.3 + Math.random() * 0.7; windInt = 1.4 + Math.random() * 1.6; windTimer = 0; }

  function initGame() { angle = 0; vel = 0; windDir = 0; windStr = 0; windTimer = 0; windInt = 2; survived = 0; done = false; particles = []; flicker = 0; danger = 0; spawnGust(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 500 + 2000) : Math.round(survived * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCandle(showFlame) {
    game.draw.rect(CX - CW / 2, BASE_Y - CH, CW, CH, C.c, 0.85); game.draw.rect(CX - CW / 2 + 6, BASE_Y - CH + 6, CW / 3, CH - 12, C.g, 0.3);
    game.draw.rect(CX - CW / 2 - 20, BASE_Y, CW + 40, 26, '#8a6a30', 0.7);
    pline(CX, BASE_Y - CH, CX + Math.sin(angle) * 12, BASE_Y - CH - 20, '#555', 0.9, 5);
    if (showFlame) { var fl = Math.sin(flicker * 1.3) * 4, fx = CX + Math.sin(angle) * 80, fy = BASE_Y - CH - 80; pc(fx, fy, 40 + fl, C.f, 0.8); pc(fx, fy - 14, 28 + fl * 0.5, C.c, 0.9); pc(fx, fy - 26, 14, C.g, 0.95); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') vel -= 2.5; else if (d === 'right') vel += 2.5;
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    flicker += dt * 8;
    if (state === S.ATTRACT) {
      background(); drawCandle(true);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STILL LIT!' : 'BLOWN OUT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var activeWind = 0;
    if (!done) {
      survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      if (danger > 0) danger -= dt * 3;
      windTimer += dt; if (windTimer > windInt) spawnGust();
      activeWind = windStr * Math.sin((windTimer / windInt) * Math.PI);
      vel += (windDir * activeWind * 4.0 - angle * 3.0) * dt; vel *= (1 - 3 * dt); angle += vel * dt; angle = Math.max(-MAX_ANGLE * 1.1, Math.min(MAX_ANGLE * 1.1, angle));
      if (Math.abs(angle) >= MAX_ANGLE) { finish(false); return; }
      if (Math.abs(angle) > MAX_ANGLE * 0.65) danger = 0.3;
      if (Math.random() < 0.4) { var fx = CX + Math.sin(angle) * 80; particles.push({ x: fx + (Math.random() - 0.5) * 20, y: BASE_Y - CH - 80, vx: windDir * activeWind * 30 + (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 60, life: 0.5 + Math.random() * 0.3, col: C.f }); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= (1 - 2 * dt); p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCandle(true);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.c, particles[pp2].life * 1.4);
    if (activeWind > 0.15) txt(windDir > 0 ? '>> >> >>' : '<< << <<', W / 2, snap(H * 0.82), 48, C.e);
    // 傾きバー
    var ar = angle / MAX_ANGLE, bw = 400, bx = W / 2 - bw / 2, by = snap(H * 0.88), mid = bx + bw / 2, fw = Math.abs(ar) * bw / 2;
    game.draw.rect(bx, by, bw, 18, '#2a1810', 0.8); game.draw.rect(snap(ar > 0 ? mid : mid - fw), by, snap(fw), 18, Math.abs(ar) > 0.6 ? C.a : C.f, 0.9); game.draw.rect(mid - 3, by - 4, 6, 26, C.g, 0.9);

    survBar();
    txt(survived.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(survived.toFixed(1) + ' / ' + GOAL + 's', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
