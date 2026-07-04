// 643-spark-catcher.js
// スパークキャッチャー — 発生源から飛び散る火花を、下段の導線バーで受け止める
// 操作: タップした位置へ導線バーが移動。落ちてくる火花をバーで受ける
// 成功: 12個 キャッチ  失敗: 5個 逃走 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、放電室） ──
  var C = { bg:'#020105', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPARK CATCHER';
  var HOW_TO_PLAY = 'TAP TO MOVE THE WIRE BAR · CATCH THE FLYING SPARKS BEFORE THEY DROP';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_MISS = 5;          // 修正2: 20 → 5
  var SOURCE_X = W / 2, SOURCE_Y = snap(H * 0.40), WIRE_Y = snap(H * 0.78), WIRE_W = 420;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var wireX, targetWireX, sparks, caught, missed, timeLeft, done, spawnTimer, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#08050f');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnSpark() { var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2, speed = 380 + Math.random() * 180 + (MAX_TIME - timeLeft) * 6; sparks.push({ x: SOURCE_X, y: SOURCE_Y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 14 + Math.random() * 8, life: 1, trail: [] }); }

  function initGame() { wireX = W / 2; targetWireX = W / 2; sparks = []; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0; particles = []; flash = 0; flashCol = C.b; for (var i = 0; i < 3; i++) spawnSpark(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(SOURCE_X, SOURCE_Y, 200, C.f, 0.06 + Math.sin(game.time.elapsed * 4) * 0.03);
    pc(SOURCE_X, SOURCE_Y, 48, C.f, 0.9); pc(SOURCE_X, SOURCE_Y, 34, C.c, 0.7); pc(SOURCE_X - 14, SOURCE_Y - 14, 16, C.g, 0.4);
    for (var si = 0; si < sparks.length; si++) {
      var s = sparks[si];
      for (var ti = 0; ti < s.trail.length; ti++) { var t = s.trail[ti]; pc(t.x, t.y, s.r * (ti / s.trail.length) * 0.6, C.c, (ti / s.trail.length) * 0.4 * s.life); }
      pc(s.x, s.y, s.r, C.c, s.life * 0.9); pc(s.x, s.y, s.r * 0.5, C.g, s.life * 0.7);
    }
    var wx = wireX - WIRE_W / 2;
    game.draw.rect(snap(wx) - 8, WIRE_Y - 8, WIRE_W + 16, 32, C.e, 0.08);
    game.draw.rect(snap(wx), WIRE_Y, WIRE_W, 14, C.d, 0.9); game.draw.rect(snap(wx), WIRE_Y, WIRE_W, 6, C.e, 0.5);
    pc(wx, WIRE_Y + 7, 16, C.e, 0.7); pc(wx + WIRE_W, WIRE_Y + 7, 16, C.e, 0.7);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetWireX = Math.max(WIRE_W / 2 + 20, Math.min(W - WIRE_W / 2 - 20, tx)); game.audio.play('se_tap', 0.08);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sparks) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULLY CHARGED!' : 'SHORT CIRCUIT', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      wireX += (targetWireX - wireX) * Math.min(1, dt * 11);
      spawnTimer += dt; var rate = Math.max(0.1, 0.24 - (MAX_TIME - timeLeft) * 0.005);
      if (spawnTimer >= rate) { spawnTimer = 0; spawnSpark(); }
      for (var si = sparks.length - 1; si >= 0; si--) {
        var s = sparks[si]; s.trail.push({ x: s.x, y: s.y }); if (s.trail.length > 6) s.trail.shift();
        s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.2;
        if (s.y + s.r >= WIRE_Y - 10 && s.y - s.r <= WIRE_Y + 20 && s.x >= wireX - WIRE_W / 2 && s.x <= wireX + WIRE_W / 2) {
          caught++; flash = 0.1; flashCol = C.b; game.audio.play('se_success', 0.35);
          for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI; particles.push({ x: s.x, y: WIRE_Y, vx: Math.cos(pa) * 120, vy: -Math.abs(Math.sin(pa)) * 150, life: 0.35, col: C.c }); }
          sparks.splice(si, 1); if (caught >= NEEDED) { finish(true); return; } continue;
        }
        if (s.y > H + 60 || s.x < -100 || s.x > W + 100 || s.life <= 0) { missed++; sparks.splice(si, 1); flash = 0.15; flashCol = C.a; if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 3; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#08050f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
