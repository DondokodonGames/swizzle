// 588-void-collector.js
// ヴォイドコレクター — 広がる虚無の穴に飲まれる前に、漂う光の欠片をタップで回収する
// 操作: 光の欠片の近くをタップして吸収（穴に触れた欠片は失われる）穴は時間で拡大
// 成功: 欠片 8個 回収  失敗: 3個 飲まれる or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、虚無空間） ──
  var C = { bg:'#000005', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PX = 80, PY = snap(H * 0.16), PW = W - 160, PH = snap(H * 0.62);

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOID COLLECTOR';
  var HOW_TO_PLAY = 'TAP NEAR LIGHT SHARDS TO ABSORB THEM · AVOID THE GROWING VOIDS';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 30 → 8
  var MAX_LOST = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shards, voids, collected, lost, timeLeft, done, particles, flash, flashCol, nextShard, nextVoid;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a1a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(PX, PY, PW, PH, '#1a1a2e', 0.2); }

  function spawnShard() { shards.push({ x: PX + Math.random() * PW, y: PY + Math.random() * PH, r: 22 + Math.random() * 14, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 5 + Math.random() * 3, phase: Math.random() * Math.PI * 2 }); }
  function spawnVoid() { var diff = 1 + (MAX_TIME - timeLeft) / 8; voids.push({ x: PX + Math.random() * PW, y: PY + Math.random() * PH, r: 30, growRate: 8 + diff * 4, maxR: 110 + diff * 20, phase: Math.random() * Math.PI * 2 }); }

  function initGame() { shards = []; voids = []; collected = 0; lost = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; nextShard = 0; nextVoid = 2.5; for (var i = 0; i < 3; i++) spawnShard(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 500 + Math.ceil(timeLeft) * 100) : collected * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var vi = 0; vi < voids.length; vi++) { var v = voids[vi]; pc(v.x, v.y, v.r + 16 + Math.sin(v.phase) * 8, C.d, 0.25); pc(v.x, v.y, v.r, '#110022', 0.95); pc(v.x, v.y, v.r * 0.5, C.bg, 0.7); }
    for (var si = 0; si < shards.length; si++) { var s = shards[si], lr = Math.min(1, s.life / 2), pu = 1 + Math.sin(s.phase) * 0.15; pc(s.x, s.y, s.r * pu * 1.4, C.e, lr * 0.15); pc(s.x, s.y, s.r * pu, C.e, lr * 0.85); pc(s.x - s.r * 0.3, s.y - s.r * 0.3, s.r * 0.3, C.g, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var si = shards.length - 1; si >= 0; si--) { var s = shards[si]; if ((tx - s.x) * (tx - s.x) + (ty - s.y) * (ty - s.y) < (s.r + 80) * (s.r + 80)) { collected++; flash = 0.2; flashCol = C.b; game.audio.play('se_tap', 0.3); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: s.x, y: s.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.e }); } shards.splice(si, 1); if (collected >= NEEDED) { finish(true); return; } return; } }
    game.audio.play('se_tap', 0.08);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!shards) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LIGHT SAVED!' : 'CONSUMED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      nextShard -= dt; if (nextShard <= 0) { if (shards.length < 6) spawnShard(); nextShard = 0.7 + Math.random() * 0.5; }
      nextVoid -= dt; if (nextVoid <= 0) { if (voids.length < 5) spawnVoid(); nextVoid = 3 + Math.random() * 2; }
      for (var si = shards.length - 1; si >= 0; si--) {
        var s = shards[si]; s.x += s.vx * dt; s.y += s.vy * dt; s.phase += dt * 3; s.life -= dt;
        if (s.x < PX + s.r) { s.x = PX + s.r; s.vx = Math.abs(s.vx); } if (s.x > PX + PW - s.r) { s.x = PX + PW - s.r; s.vx = -Math.abs(s.vx); }
        if (s.y < PY + s.r) { s.y = PY + s.r; s.vy = Math.abs(s.vy); } if (s.y > PY + PH - s.r) { s.y = PY + PH - s.r; s.vy = -Math.abs(s.vy); }
        if (s.life <= 0) { shards.splice(si, 1); continue; }
        var inVoid = false; for (var vi = 0; vi < voids.length; vi++) { var v = voids[vi]; if ((s.x - v.x) * (s.x - v.x) + (s.y - v.y) * (s.y - v.y) < v.r * v.r) { inVoid = true; break; } }
        if (inVoid) { shards.splice(si, 1); lost++; flash = 0.35; flashCol = C.a; game.audio.play('se_failure', 0.35); if (lost >= MAX_LOST) { finish(false); return; } }
      }
      for (var vi2 = 0; vi2 < voids.length; vi2++) { if (voids[vi2].r < voids[vi2].maxR) voids[vi2].r += voids[vi2].growRate * dt; voids[vi2].phase += dt * 1.5; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < MAX_LOST; li++) game.draw.rect(snap(W / 2 + (li - (MAX_LOST - 1) / 2) * 56) - 10, 224, 20, 20, li < lost ? C.a : '#0a0a1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
