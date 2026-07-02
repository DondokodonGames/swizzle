// 179-snap-combo.js
// スナップコンボ — 次々と出現するターゲットをテンポよく叩きコンボを繋げる快感
// 操作: タップで出現したターゲットを叩く
// 成功: コンボ2を達成  失敗: コンボが3回途切れる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、モグラ叩き） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SNAP COMBO';
  var HOW_TO_PLAY = 'TAP TARGETS FAST · BUILD YOUR COMBO';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 2;              // 修正2: 20 → 2
  var MAX_BREAK = 3;
  var TOP    = 220;
  var SPOT_R = 80, APPEAR_TIME = 0.9, SPAWN_INTERVAL = 0.7;

  var SPOTS_X = [], SPOTS_Y = [];
  for (var i = 0; i < 9; i++) { SPOTS_X.push(snap(W * (0.22 + (i % 3) * 0.28))); SPOTS_Y.push(snap(TOP + 160 + Math.floor(i / 3) * 300)); }

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var spots, particles, spawnTimer, combo, maxCombo, breakCount, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < 9; i++) pc(SPOTS_X[i], SPOTS_Y[i], SPOT_R, C.d, 0.4);
  }

  function drawSpot(s) {
    var prog = s.life / APPEAR_TIME;
    if (s.hit) { pc(s.x, s.y, SPOT_R, C.b, 0.7); txt('!', s.x, s.y - 8, 60, C.g); return; }
    var urg = 1 - prog, col = urg > 0.6 ? C.a : C.f;
    // カウントダウンリング
    var steps = Math.floor(prog * 16);
    for (var rs = 0; rs < steps; rs++) { var ra = -Math.PI / 2 + (rs / 16) * Math.PI * 2; game.draw.rect(snap(s.x + Math.cos(ra) * (SPOT_R - 12)) - 5, snap(s.y + Math.sin(ra) * (SPOT_R - 12)) - 5, 10, 10, C.c, 0.7); }
    pc(s.x, s.y, SPOT_R - 20, col, 0.9);
    pc(s.x, s.y, SPOT_R - 44, C.g, 0.5);
  }

  function spawnSpot() {
    var avail = [];
    for (var si = 0; si < 9; si++) { var taken = false; for (var sj = 0; sj < spots.length; sj++) if (spots[sj].idx === si) { taken = true; break; } if (!taken) avail.push(si); }
    if (avail.length === 0) return;
    var idx = avail[Math.floor(Math.random() * avail.length)];
    spots.push({ idx: idx, x: SPOTS_X[idx], y: SPOTS_Y[idx], life: APPEAR_TIME, hit: false });
  }

  function initGame() {
    spots = []; particles = []; spawnTimer = 0.3; combo = 0; maxCombo = 0; breakCount = 0;
    timeLeft = MAX_TIME; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (maxCombo * 300 + Math.ceil(timeLeft) * 30) : maxCombo * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function registerBreak() {
    combo = 0; breakCount++;
    game.audio.play('se_failure', 0.4);
    if (breakCount >= MAX_BREAK) finish(false);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var si = 0; si < spots.length; si++) {
      var s = spots[si];
      if (s.hit) continue;
      if (Math.hypot(x - s.x, y - s.y) < SPOT_R) {
        s.hit = true; s.life = 0.15; combo++; if (combo > maxCombo) maxCombo = combo;
        game.audio.play('se_success', Math.min(1, 0.4 + combo * 0.1));
        for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: s.x, y: s.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4 }); }
        if (combo >= NEEDED) { finish(true); return; }
        return;
      }
    }
    registerBreak();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawSpot({ x: SPOTS_X[4], y: SPOTS_Y[4], life: APPEAR_TIME * (0.5 + 0.5 * Math.sin(game.time.elapsed * 3)), hit: false });
      txt(GAME_TITLE, W / 2, H * 0.12, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄  TAP TO START', W / 2, H * 0.92, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COMBO!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL; spawnSpot(); }
      for (var si = spots.length - 1; si >= 0; si--) {
        var s = spots[si];
        s.life -= dt;
        if (s.hit && s.life <= 0) spots.splice(si, 1);
        else if (!s.hit && s.life <= 0) { spots.splice(si, 1); registerBreak(); if (done) return; }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 300 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });

    // ---- 描画 ----
    background();
    for (var si2 = 0; si2 < spots.length; si2++) drawSpot(spots[si2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2.5);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('COMBO ' + combo + ' / ' + NEEDED, W / 2, 168, 48, combo > 0 ? C.c : C.b);
    for (var bd = 0; bd < MAX_BREAK; bd++) {
      var bx = snap(W / 2 + (bd - (MAX_BREAK - 1) / 2) * 56);
      game.draw.rect(bx - 12, H - 96, 24, 24, bd < breakCount ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
