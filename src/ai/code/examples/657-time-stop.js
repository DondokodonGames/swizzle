// 657-time-stop.js
// タイムストップ — 往復する光点が緑のSTOPゾーンに入った瞬間、タップで時を止める
// 操作: タップで停止。光点がゾーン内なら成功。速度は徐々に上がる
// 成功: 8回 ピタリ  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、時計塔） ──
  var C = { bg:'#030306', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TIME STOP';
  var HOW_TO_PLAY = 'TAP TO FREEZE TIME WHEN THE MARKER IS INSIDE THE GREEN STOP ZONE';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var TRACK_Y = snap(H * 0.50), ZONE_X = W * 0.70, ZONE_W = 90, FREEZE_DUR = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var markerX, markerDir, frozen, frozenTimer, correct, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, gameElapsed;
  var markerSpeed = 350;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#06060d');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { markerX = W * 0.1; markerDir = 1; frozen = false; frozenTimer = 0; correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; gameElapsed = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(40, TRACK_Y - 20, W - 80, 40, '#0a0a14', 0.8);
    game.draw.rect(ZONE_X - ZONE_W / 2, TRACK_Y - 52, ZONE_W, 104, C.b, 0.15);
    game.draw.rect(ZONE_X - ZONE_W / 2, TRACK_Y - 52, 4, 104, C.b, 0.6); game.draw.rect(ZONE_X + ZONE_W / 2 - 4, TRACK_Y - 52, 4, 104, C.b, 0.6);
    txt('STOP', ZONE_X, TRACK_Y + 90, 36, C.b);
    // clock
    var clockY = snap(H * 0.30); ring(W / 2, clockY, 100, C.d, 0.8);
    var ha = gameElapsed * (frozen ? 0 : 2) - Math.PI / 2;
    game.draw.line(W / 2, clockY, W / 2 + Math.cos(ha) * 70, clockY + Math.sin(ha) * 70, C.f, 6);
    game.draw.line(W / 2, clockY, W / 2 + Math.cos(ha * 12) * 50, clockY + Math.sin(ha * 12) * 50, C.d, 4);
    pc(W / 2, clockY, 8, C.g, 0.9);
    if (frozen) txt('STOP', W / 2, clockY + 8, 28, C.e);
    // marker
    pc(markerX, TRACK_Y, 44, frozen ? C.e : C.f, 0.9); pc(markerX - 14, TRACK_Y - 14, 16, C.g, 0.5);
    if (frozen) { var fr = frozenTimer / FREEZE_DUR; ring(markerX, TRACK_Y, 56 + (1 - fr) * 30, C.e, fr * 0.4); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || frozen) return;
    frozen = true; frozenTimer = FREEZE_DUR;
    var inZone = markerX >= ZONE_X - ZONE_W / 2 && markerX <= ZONE_X + ZONE_W / 2;
    if (inZone) {
      correct++; flash = 0.3; flashCol = C.b; resultText = 'FROZEN!'; resultTimer = 0.6; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: markerX, y: TRACK_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.e }); }
      if (correct >= NEEDED) { finish(true); return; }
    } else { misses++; flash = 0.3; flashCol = C.a; resultText = 'MISSED'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (markerX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(gameElapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.80, 40, C.a);
      gameElapsed += dt;
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TIME LORD!' : 'OUT OF SYNC', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(gameElapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      gameElapsed += dt;
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (frozen) { frozenTimer -= dt; if (frozenTimer <= 0) frozen = false; }
      else { var spd = markerSpeed * (1 + (MAX_TIME - timeLeft) * 0.02); markerX += markerDir * spd * dt; if (markerX > W - 60) { markerX = W - 60; markerDir = -1; } if (markerX < 60) { markerX = 60; markerDir = 1; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.72), 72, flashCol);
    else if (!frozen) txt('TAP!', W / 2, snap(H * 0.72), 44, '#ffffff44');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#06060d');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
