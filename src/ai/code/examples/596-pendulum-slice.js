// 596-pendulum-slice.js
// ペンデュラムスライス — 振り子を左右スワイプで振り、勢いよく通り抜けざまにターゲットを切る
// 操作: 左右スワイプ/タップで振り子を加速。十分な速度でターゲットを通過するとスライス成功
// 成功: 6カット  失敗: 3回 見逃し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、振り子刃） ──
  var C = { bg:'#050208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PENDULUM SLICE';
  var HOW_TO_PLAY = 'SWIPE / TAP LEFT-RIGHT TO SWING · SLICE TARGETS AT FULL SPEED';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var PIVOT_X = W / 2, PIVOT_Y = snap(H * 0.14), ROPE_LEN = snap(H * 0.42);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, angleVel, targets, cuts, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, trail, nextTarget;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2a1a00');
  }

  function bobPos() { return { x: PIVOT_X + Math.sin(angle) * ROPE_LEN, y: PIVOT_Y + Math.cos(angle) * ROPE_LEN }; }

  function background() { game.draw.clear(C.bg); }

  function spawnTarget() { var ta = (Math.random() - 0.5) * 1.4, td = ROPE_LEN * (0.7 + Math.random() * 0.35); targets.push({ x: PIVOT_X + Math.sin(ta) * td, y: PIVOT_Y + Math.cos(ta) * td, r: 36, life: 3.5 + Math.random() * 1.5, maxLife: 3.5, phase: Math.random() * Math.PI * 2, cut: false }); }

  function initGame() { angle = 0.5; angleVel = 0; targets = []; cuts = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; trail = []; nextTarget = 1.2; spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cuts * 700 + Math.ceil(timeLeft) * 100) : cuts * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ti = 0; ti < targets.length; ti++) { var t = targets[ti]; if (t.cut) { var ca = t.life * 2; pc(t.x - 20 * (1 - t.life / 0.3), t.y, t.r * 0.6, C.b, ca * 0.6); pc(t.x + 20 * (1 - t.life / 0.3), t.y, t.r * 0.6, C.b, ca * 0.6); continue; } var la = Math.min(1, t.life / 1.5); pc(t.x, t.y, t.r, C.a, la * 0.85); pc(t.x - 10, t.y - 10, t.r * 0.3, C.g, 0.5); }
    for (var tr = 0; tr < trail.length; tr++) game.draw.rect(snap(trail[tr].x) - 6, snap(trail[tr].y) - 6, 12, 12, C.f, trail[tr].life / 0.4 * 0.5);
    var bob = bobPos();
    game.draw.line(PIVOT_X, PIVOT_Y, bob.x, bob.y, C.f, 6); pc(PIVOT_X, PIVOT_Y, 16, C.g, 0.8);
    pc(bob.x, bob.y, 30, C.f, 0.9); pc(bob.x - 10, bob.y - 10, 12, C.c, 0.5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'right') angleVel += 3.5; else if (dir === 'left') angleVel -= 3.5;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) angleVel -= 2.2; else angleVel += 2.2; game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targets === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.70, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.745, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.85, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.89, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEAN CUTS!' : 'DULL BLADE', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      var acc = -(9.8 / (ROPE_LEN / 100)) * Math.sin(angle); angleVel += acc * dt; angleVel *= 0.998; angle += angleVel * dt;
      if (angle > Math.PI * 0.8) { angle = Math.PI * 0.8; angleVel *= -0.4; } if (angle < -Math.PI * 0.8) { angle = -Math.PI * 0.8; angleVel *= -0.4; }
      var bob = bobPos(); trail.push({ x: bob.x, y: bob.y, life: 0.4 }); for (var tr = trail.length - 1; tr >= 0; tr--) { trail[tr].life -= dt * 2.5; if (trail[tr].life <= 0) trail.splice(tr, 1); }
      for (var tgi = targets.length - 1; tgi >= 0; tgi--) {
        var t = targets[tgi];
        if (t.cut) { t.life -= dt * 3; if (t.life <= 0) targets.splice(tgi, 1); continue; }
        t.phase += dt * 2; t.life -= dt;
        if (t.life <= 0) { targets.splice(tgi, 1); misses++; flash = 0.25; flashCol = C.a; resultText = 'MISSED'; resultTimer = 0.5; game.audio.play('se_failure', 0.2); if (misses >= MAX_MISS) { finish(false); return; } continue; }
        if ((bob.x - t.x) * (bob.x - t.x) + (bob.y - t.y) * (bob.y - t.y) < (t.r + 28) * (t.r + 28) && Math.abs(angleVel) > 0.5) { t.cut = true; t.life = 0.3; cuts++; flash = 0.2; flashCol = C.b; resultText = 'SLICE!'; resultTimer = 0.5; game.audio.play('se_success', 0.6); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); } if (cuts >= NEEDED) { finish(true); return; } }
      }
      nextTarget -= dt; if (nextTarget <= 0) { if (targets.filter(function(t) { return !t.cut; }).length < 3) spawnTarget(); nextTarget = 0.8 + Math.random() * 0.8; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cuts + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#2a1a00');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
