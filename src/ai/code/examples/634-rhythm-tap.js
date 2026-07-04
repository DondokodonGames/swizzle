// 634-rhythm-tap.js
// リズムタップ — 4レーンを流れ落ちるビートがヒットラインに重なる瞬間をタップで叩く
// 操作: 落ちてくるビートがラインに来た所（その真下）をタップ。PERFECT/GOODで加点
// 成功: 15ヒット  失敗: 3ミス or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズムステージ） ──
  var C = { bg:'#0a0010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RHYTHM TAP';
  var HOW_TO_PLAY = 'TAP THE LANE WHEN ITS BEAT REACHES THE HIT LINE · PERFECT SCORES MORE';
  var MAX_TIME = 18;
  var NEEDED     = 15;       // 修正2: 25 → 15
  var MAX_MISSES = 3;        // 修正2: 10 → 3
  var HIT_Y = snap(H * 0.76), PERFECT_RANGE = 60, GOOD_RANGE = 120, BEAT_SPEED = 460;
  var lanes = [W * 0.2, W * 0.4, W * 0.6, W * 0.8];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beats, score, hits, misses, timeLeft, done, beatTimer, beatInterval, particles, resultText, resultTimer, resultCol, combo;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#1a0030');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBeat() { var lane = Math.floor(Math.random() * lanes.length); beats.push({ x: lanes[lane], y: -40, lane: lane, hit: false }); }

  function initGame() { beats = []; score = 0; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; beatTimer = 0; beatInterval = 0.55; particles = []; resultText = ''; resultTimer = 0; resultCol = C.a; combo = 0; spawnBeat(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 80) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var li = 0; li < lanes.length; li++) { game.draw.rect(snap(lanes[li] - 60), 0, 120, H, '#120020', 0.5); game.draw.rect(snap(lanes[li]) - 1, 0, 2, H, '#1a0030', 0.8); }
    game.draw.rect(0, HIT_Y - 4, W, 8, C.g, 0.5);
    for (var li2 = 0; li2 < lanes.length; li2++) ring(lanes[li2], HIT_Y, 44, '#1a0030', 0.9);
    for (var bi = 0; bi < beats.length; bi++) { var b = beats[bi]; if (b.hit) continue; var prox = 1 - Math.min(1, Math.abs(b.y - HIT_Y) / GOOD_RANGE); pc(b.x, b.y, 42, C.d, 0.9); pc(b.x, b.y, 24, C.a, 0.7 + prox * 0.3); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var bestDist = GOOD_RANGE, bestIdx = -1;
    for (var i = 0; i < beats.length; i++) { var b = beats[i]; if (b.hit) continue; var dy = Math.abs(b.y - HIT_Y), dx = Math.abs(b.x - tx); if (dx < 100 && dy < bestDist) { bestDist = dy; bestIdx = i; } }
    if (bestIdx >= 0) {
      var b2 = beats[bestIdx]; b2.hit = true; hits++; combo++;
      var perfect = bestDist < PERFECT_RANGE, pts = Math.floor((perfect ? 100 : 50) * (1 + combo * 0.1)); score += pts;
      resultText = perfect ? 'PERFECT!' : 'GOOD!'; resultCol = perfect ? C.a : C.b; resultTimer = 0.5; game.audio.play('se_success', perfect ? 0.6 : 0.4);
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b2.x, y: HIT_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.5, col: perfect ? C.a : C.b }); }
      if (hits >= NEEDED) { finish(true); return; }
    } else combo = 0;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!beats) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.44, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.48, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ON BEAT!' : 'OFF RHYTHM', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) resultTimer -= dt;
      beatTimer += dt; beatInterval = Math.max(0.32, 0.55 - (MAX_TIME - timeLeft) * 0.008);
      if (beatTimer >= beatInterval) { beatTimer = 0; spawnBeat(); if (Math.random() < 0.3) spawnBeat(); }
      for (var bi = beats.length - 1; bi >= 0; bi--) {
        var b = beats[bi]; b.y += BEAT_SPEED * dt;
        if (!b.hit && b.y > HIT_Y + GOOD_RANGE) { misses++; combo = 0; beats.splice(bi, 1); game.audio.play('se_failure', 0.2); if (misses >= MAX_MISSES) { finish(false); return; } continue; }
        if (b.y > H + 60) beats.splice(bi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) { txt(resultText, W / 2, snap(H * 0.58), 72, resultCol); if (combo > 1) txt(combo + 'x COMBO!', W / 2, snap(H * 0.65), 44, C.c); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISSES; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISSES - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a0030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
