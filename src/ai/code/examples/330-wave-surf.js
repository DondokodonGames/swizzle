// 330-wave-surf.js
// ウェーブサーフ — 押し寄せる波をタップジャンプで飛び越え、次々に波をクリアするサーフィン
// 操作: タップで波を飛び越える（タイミングが命）
// 成功: 5波クリア  失敗: 3回ワイプアウト or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、サンセットビーチ） ──
  var C = { bg:'#020d1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', sea:'#0a4a80' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WAVE SURF';
  var HOW_TO_PLAY = 'TAP TO JUMP OVER THE WAVES · TIMING IS KEY';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 25 → 5
  var MAX_WIPE = 3;          // 修正2: 5 → 3
  var HORIZON = snap(H * 0.56), SURF_X = snap(W * 0.28), JUMP = -740, GRAV = 1500;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var surfY, surfVY, onBoard, waves, cleared, wipeouts, timeLeft, done, spawnTimer, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, W, HORIZON, '#0c2340', 0.9);
    pc(W * 0.78, H * 0.16, 60, C.f, 0.9); pc(W * 0.78, H * 0.16, 46, C.c, 0.8);
    game.draw.rect(0, HORIZON, W, H, C.sea, 0.9);
    for (var ww = 0; ww < W; ww += 80) game.draw.rect(ww, HORIZON + 24, 50, 4, C.e, 0.4);
  }

  function spawnWave() { waves.push({ x: W + 100, w: snap(70 + Math.random() * 40), h: snap(90 + Math.random() * 70), scored: false }); }

  function initGame() { surfY = HORIZON - 20; surfVY = 0; onBoard = true; waves = []; cleared = 0; wipeouts = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.6; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 400 + Math.ceil(timeLeft) * 100) : cleared * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawSurfer() {
    game.draw.rect(snap(SURF_X) - 50, snap(surfY) + 12, 100, 16, C.a, 0.9);
    pc(SURF_X, surfY - 20, 20, C.c, 0.95);
    game.draw.rect(snap(SURF_X) - 6, snap(surfY) - 4, 12, 22, C.c, 0.9);
  }

  function drawWave(w) { var top = HORIZON - w.h; game.draw.rect(snap(w.x), snap(top), w.w, w.h + 4, C.e, 0.9); pc(w.x + w.w / 2, top, w.w * 0.5, C.g, 0.7); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (onBoard) { surfVY = JUMP; onBoard = false; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawSurfer();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
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
      txt(resultSuccess ? 'GNARLY!' : 'WIPEOUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var wspeed = 320 + cleared * 20;
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (!onBoard) { surfVY += GRAV * dt; surfY += surfVY * dt; if (surfY >= HORIZON - 20) { surfY = HORIZON - 20; surfVY = 0; onBoard = true; } }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnWave(); spawnTimer = 1.1 - Math.min(0.4, cleared * 0.06); }
      for (var wi = waves.length - 1; wi >= 0; wi--) {
        var w = waves[wi]; w.x -= wspeed * dt;
        if (!w.scored && w.x + w.w < SURF_X) { w.scored = true; cleared++; fbText = 'NICE!'; fbCol = C.b; fbTimer = 0.5; game.audio.play('se_success', 0.4); for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: SURF_X, y: surfY, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 - 80, life: 0.5, col: C.b }); } if (cleared >= NEEDED) { finish(true); return; } }
        if (!w.scored && onBoard) { var top = HORIZON - w.h; if (SURF_X + 20 >= w.x && SURF_X - 20 <= w.x + w.w && surfY >= top - 20) { wipeouts++; w.scored = true; fbText = 'WIPEOUT!'; fbCol = C.a; fbTimer = 0.7; game.audio.play('se_failure', 0.5); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: SURF_X, y: surfY, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200 - 100, life: 0.6, col: C.g }); } if (wipeouts >= MAX_WIPE) { finish(false); return; } } }
        if (w.x + w.w < -100) waves.splice(wi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var wi2 = 0; wi2 < waves.length; wi2++) drawWave(waves[wi2]);
    drawSurfer();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.42), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wo = 0; wo < MAX_WIPE; wo++) game.draw.rect(snap(W / 2 + (wo - (MAX_WIPE - 1) / 2) * 56) - 10, 224, 20, 20, wo < wipeouts ? C.a : '#0a1a2a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
