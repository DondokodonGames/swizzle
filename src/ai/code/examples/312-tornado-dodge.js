// 312-tornado-dodge.js
// 竜巻ドッジ — 予測不能に蛇行して迫る竜巻を左右スワイプでレーン移動して避け続けるサバイバル
// 操作: 左右スワイプでレーン移動して竜巻を避ける
// 成功: 10秒生き残る  失敗: 竜巻に3回触れる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、嵐の荒野） ──
  var C = { bg:'#0a0614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', ground:'#1a1008' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TORNADO DODGE';
  var HOW_TO_PLAY = 'SWIPE LEFT / RIGHT TO DODGE THE TWISTERS';
  var NEEDED   = 10;         // 修正2: サバイバル 30s → 10s
  var MAX_HIT  = 3;
  var LANES = 5, LANE_W = snap(W / 5), PLAYER_Y = snap(H * 0.80), GROUND_Y = snap(H * 0.85);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, px, targetX, tornados, survived, hits, timeLeft, done, spawnTimer, particles, hitFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#120828');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, GROUND_Y, W, H, C.ground, 0.9); game.draw.rect(0, GROUND_Y, W, 8, C.f, 0.5); }

  function laneX(l) { return snap(LANE_W * (l + 0.5)); }

  function spawnTornado() {
    var l = Math.floor(Math.random() * LANES), spd = 260 + Math.random() * 140 + (NEEDED - timeLeft) * 20;
    tornados.push({ x: laneX(l), y: -100, vy: spd, r: 62, wob: (Math.random() - 0.5) * 100, ws: 1 + Math.random(), wa: 0, spin: 0 });
  }

  function initGame() { lane = 2; px = laneX(2); targetX = px; tornados = []; survived = 0; hits = 0; timeLeft = NEEDED; done = false; spawnTimer = 0.5; particles = []; hitFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 300 + (MAX_HIT - hits) * 500) : Math.round(survived) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTornado(t) {
    for (var r = 0; r < 5; r++) { var rr = t.r * (0.3 + r * 0.16), col = r < 2 ? C.d : r < 4 ? C.a : '#4c1d95'; pc(t.x + Math.cos(t.spin + r * 1.2) * rr * 0.3, t.y + r * 22, rr, col, 0.55 - r * 0.07); }
    pc(t.x, t.y, 14, C.g, 0.8);
  }

  function drawPlayer() { pc(px, PLAYER_Y, 30, C.b, 0.95); pc(px, PLAYER_Y - 16, 12, C.g, 0.7); game.draw.rect(snap(px) - 30, GROUND_Y, 60, 8, '#000', 0.3); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left' && lane > 0) { lane--; targetX = laneX(lane); game.audio.play('se_tap', 0.2); }
    else if (d === 'right' && lane < LANES - 1) { lane++; targetX = laneX(lane); game.audio.play('se_tap', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawTornado({ x: W * 0.5, y: H * 0.4, r: 62, spin: game.time.elapsed * 4 }); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.67, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVOR!' : 'SWEPT AWAY', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived = NEEDED - Math.max(0, timeLeft);
      if (timeLeft <= 0) { finish(true); return; }
      if (hitFlash > 0) hitFlash -= dt;
      px += (targetX - px) * Math.min(1, 12 * dt);
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnTornado(); spawnTimer = Math.max(0.35, 0.8 - survived * 0.03); }
      for (var ti = tornados.length - 1; ti >= 0; ti--) {
        var t = tornados[ti]; t.wa += dt * t.ws; t.x += Math.sin(t.wa) * t.wob * dt; t.x = Math.max(t.r, Math.min(W - t.r, t.x)); t.y += t.vy * dt; t.spin += dt * 4;
        if (Math.hypot(px - t.x, PLAYER_Y - t.y) < t.r + 24) {
          hits++; hitFlash = 0.5; game.audio.play('se_failure', 0.6);
          lane = Math.floor(Math.random() * LANES); targetX = laneX(lane);
          for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: px, y: PLAYER_Y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.6, col: C.a }); }
          tornados.splice(ti, 1); if (hits >= MAX_HIT) { finish(false); return; } continue;
        }
        if (t.y > H + 120) tornados.splice(ti, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < tornados.length; ti2++) drawTornado(tornados[ti2]);
    drawPlayer();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.a, hitFlash * 0.25);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('SURVIVE ' + Math.floor(survived) + ' / ' + NEEDED + 's', W / 2, 168, 46, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#120828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
