// 333-sushi-roll.js
// 寿司ロール — 3本のベルトを流れる寿司を、皿を正しいレーンに動かしてキャッチする回転寿司
// 操作: 上下スワイプ（またはレーンをタップ）で皿を移動して寿司を受ける
// 成功: 6貫キャッチ  失敗: 3貫逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、回転寿司） ──
  var C = { bg:'#0a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', belt:'#241408' };
  var TOP_COL = [C.a, C.f, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SUSHI ROLL';
  var HOW_TO_PLAY = 'SWIPE UP/DOWN TO MOVE THE PLATE · CATCH THE SUSHI';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var LANES = 3, LANE_Y = [snap(H * 0.40), snap(H * 0.55), snap(H * 0.70)], PLATE_X = snap(W * 0.80);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, sushi, caught, missed, timeLeft, done, spawnTimer, particles, beltOff, catchAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#221400');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var l = 0; l < LANES; l++) { var ly = LANE_Y[l], on = l === lane; game.draw.rect(0, ly - 44, W, 88, C.belt, on ? 0.95 : 0.6); for (var bx = -beltOff; bx < W; bx += 80) game.draw.rect(bx, ly - 44, 40, 88, '#3a2010', 0.4); game.draw.rect(0, ly - 44, W, 6, on ? C.f : '#3a2010', on ? 0.8 : 0.4); game.draw.rect(0, ly + 38, W, 6, on ? C.f : '#3a2010', on ? 0.8 : 0.4); }
  }

  function spawnSushi() { var l = Math.floor(Math.random() * LANES), t = Math.floor(Math.random() * 4); sushi.push({ x: -60, y: LANE_Y[l], lane: l, type: t, r: 36, speed: 240 + caught * 15 }); }

  function initGame() { lane = 1; sushi = []; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = []; beltOff = 0; catchAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawSushi(s) { pc(s.x, s.y, s.r, C.g, 0.9); game.draw.rect(snap(s.x - s.r * 0.8), snap(s.y - s.r * 0.5), snap(s.r * 1.6), snap(s.r * 0.7), TOP_COL[s.type], 0.9); game.draw.rect(snap(s.x - s.r * 0.6), snap(s.y - s.r * 0.5), snap(s.r * 1.2), 6, '#000', 0.3); }

  function drawPlate() { var sc = 1 + (catchAnim > 0 ? catchAnim * 0.3 : 0); ring(PLATE_X, LANE_Y[lane], 56 * sc, C.e, 0.7); pc(PLATE_X, LANE_Y[lane], 44 * sc, C.e, 0.4); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var l = 0; l < LANES; l++) if (Math.abs(y - LANE_Y[l]) < 80 && l !== lane) { lane = l; game.audio.play('se_tap', 0.2); return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'up' && lane > 0) { lane--; game.audio.play('se_tap', 0.2); }
    else if (d === 'down' && lane < LANES - 1) { lane++; game.audio.play('se_tap', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    beltOff = (beltOff + dt * 120) % 80;
    if (state === S.ATTRACT) {
      if (!sushi) initGame(); background(); drawPlate();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
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
      txt(resultSuccess ? 'OISHII!' : 'GONE COLD', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (catchAnim > 0) catchAnim -= dt * 3;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnSushi(); spawnTimer = 0.7 - Math.min(0.3, caught * 0.04); }
      for (var si = sushi.length - 1; si >= 0; si--) {
        var s = sushi[si]; s.x += s.speed * dt;
        if (Math.abs(s.x - PLATE_X) < 60 && s.lane === lane) { caught++; catchAnim = 0.5; game.audio.play('se_success', 0.4); for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: s.x, y: s.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: TOP_COL[s.type] }); } sushi.splice(si, 1); if (caught >= NEEDED) { finish(true); return; } continue; }
        if (s.x > W + 80) { missed++; game.audio.play('se_failure', 0.2); sushi.splice(si, 1); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var si2 = 0; si2 < sushi.length; si2++) drawSushi(sushi[si2]);
    drawPlate();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#221400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
