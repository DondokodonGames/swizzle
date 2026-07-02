// 302-mirror-tap.js
// ミラータップ — 鏡の中に光る的の「左右反転した本当の位置」を読み取ってタップする反射神経ゲーム
// 操作: 鏡像の的を見て、実際の（左右反転した）位置をタップ
// 成功: 3回正確にタップ  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鏡の間） ──
  var C = { bg:'#050210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', glass:'#100c28' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR TAP';
  var HOW_TO_PLAY = 'TAP THE MIRRORED TARGET\'S REAL POSITION';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var MX = snap(W * 0.08), MY = snap(H * 0.24), MW = snap(W * 0.84), MH = snap(H * 0.50);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, scored, misses, timeLeft, done, spawnTimer, particles, marks;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.22) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(MX - 16, MY - 16, MW + 32, MH + 32, C.d, 0.9);
    game.draw.rect(MX, MY, MW, MH, C.glass, 0.95);
    game.draw.rect(MX + 12, MY + 12, 32, MH - 24, C.e, 0.1); game.draw.rect(MX + 60, MY + 12, 12, MH - 24, C.e, 0.06);
    game.draw.rect(W / 2 - 1, MY, 2, MH, C.d, 0.6);
  }

  function realPos(t) { return { x: MX + (MW - (t.mx - MX)), y: t.my }; }

  function spawnTarget() { if (targets.length >= 2) return; targets.push({ mx: snap(MX + 80 + Math.random() * (MW - 160)), my: snap(MY + 80 + Math.random() * (MH - 160)), life: 4 }); }

  function initGame() { targets = []; scored = 0; misses = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = []; marks = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 500 + Math.ceil(timeLeft) * 100) : scored * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTarget(t) {
    var lr = Math.min(1, t.life / 4), p = 4 * (Math.floor(game.time.elapsed * 6) % 2);
    // 鏡像（ピンク）
    ring(t.mx, t.my, 40 + p, C.a, lr * 0.6); pc(t.mx, t.my, 30, C.a, lr * 0.9); pc(t.mx, t.my, 12, C.g, lr * 0.7);
    // 実際の位置ヒント（緑・薄）
    var rp = realPos(t); ring(rp.x, rp.y, 30, C.b, 0.2);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var rp = realPos(targets[ti]), dx = x - rp.x, dy = y - rp.y;
      if (dx * dx + dy * dy < 72 * 72) {
        scored++; marks.push({ x: rp.x, y: rp.y, ok: true, life: 0.6 });
        for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: rp.x, y: rp.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
        targets.splice(ti, 1); game.audio.play('se_success', 0.4);
        if (scored >= NEEDED) { finish(true); return; }
        return;
      }
    }
    if (x > MX && x < MX + MW && y > MY && y < MY + MH) { misses++; marks.push({ x: x, y: y, ok: false, life: 0.5 }); game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) finish(false); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawTarget({ mx: MX + MW * 0.3, my: MY + MH * 0.5, life: 4 });
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'REFLEXES!' : 'CONFUSED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnTarget(); spawnTimer = 1.2 + Math.random() * 0.8; }
      for (var ti = targets.length - 1; ti >= 0; ti--) { targets[ti].life -= dt; if (targets[ti].life <= 0) { targets.splice(ti, 1); misses++; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } } }
      for (var mi = marks.length - 1; mi >= 0; mi--) { marks[mi].life -= dt * 2; if (marks[mi].life <= 0) marks.splice(mi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    txt('MIRROR', MX + MW * 0.25, MY - 24, 26, C.d);
    txt('REAL', MX + MW * 0.75, MY - 24, 26, C.b);
    for (var ti2 = 0; ti2 < targets.length; ti2++) drawTarget(targets[ti2]);
    for (var mi2 = 0; mi2 < marks.length; mi2++) { var m = marks[mi2], col = m.ok ? C.c : C.a; ring(m.x, m.y, 40 * (1 - m.life) + 10, col, m.life); txt(m.ok ? 'OK' : 'X', m.x, m.y + 12, 40, col); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
