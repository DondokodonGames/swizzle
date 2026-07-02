// 315-color-wave.js
// カラーウェーブ — サイクルする色が上部の目標色と一致した瞬間にタップして捉える反射ゲーム
// 操作: 中央の色が目標色と同じになった瞬間にタップ
// 成功: 3回一致キャッチ  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、カラースペクトル） ──
  var C = { bg:'#030208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CYCLE = [C.a, C.f, C.c, C.b, C.e, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR WAVE';
  var HOW_TO_PLAY = 'TAP WHEN THE CENTER MATCHES THE TARGET COLOR';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var STEP = 0.42;           // 色が変わる間隔（秒）

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var idx, stepTimer, targetIdx, caught, misses, timeLeft, done, particles, fbText, fbCol, fbTimer, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101018');
  }

  function background() { game.draw.clear(C.bg); }

  function newTarget() { targetIdx = (idx + 1 + Math.floor(Math.random() * (CYCLE.length - 1))) % CYCLE.length; }

  function initGame() { idx = 0; stepTimer = STEP; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; flash = 0; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (idx === targetIdx) {
      caught++; flash = 0.4; fbText = 'MATCH!'; fbCol = C.b; fbTimer = 0.5; game.audio.play('se_success', 0.5);
      for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.6, col: CYCLE[idx] }); }
      if (caught >= NEEDED) { finish(true); return; }
      newTarget();
    } else {
      misses++; fbText = 'MISS'; fbCol = C.a; fbTimer = 0.4; game.audio.play('se_failure', 0.35);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); pc(W / 2, H * 0.5, 150, CYCLE[Math.floor(game.time.elapsed * 2) % CYCLE.length], 0.9);
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN SYNC!' : 'OFF COLOR', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt; if (flash > 0) flash -= dt;
      stepTimer -= dt; if (stepTimer <= 0) { stepTimer = STEP; idx = (idx + 1) % CYCLE.length; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, CYCLE[idx], flash * 0.3);
    // 目標色
    txt('TARGET', W / 2, snap(H * 0.24), 40, C.g);
    pc(W / 2, snap(H * 0.30), 60, CYCLE[targetIdx], 0.95);
    // 中央の現在色
    var match = idx === targetIdx;
    if (match) ring(W / 2, snap(H * 0.54), 168 + 8 * (Math.floor(game.time.elapsed * 8) % 2), C.g, 0.6);
    pc(W / 2, snap(H * 0.54), 150, CYCLE[idx], 0.95);
    if (match) txt('NOW!', W / 2, snap(H * 0.54) + 14, 52, '#000');
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.78), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#101018');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
